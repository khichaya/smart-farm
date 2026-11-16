"""خدمة الذكاء الاصطناعي - معزولة تماماً عن منصة المزرعة.
© جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية

- عملية مستقلة (منفذ 8100) وقاعدة بيانات خاصة بها (data/ai.db).
- إن توقفت هذه الخدمة تستمر المنصة بالعمل عادياً.
- تُجمع فيها بيانات التدريب: عيّنات الحساسات والمحصول، وأحداث السقي، وتقييمات الفلاح للتوصيات.
- النموذج نفسه في model.py.

التشغيل:  python ai_service.py [المنفذ]
"""
import csv, io, json, os, secrets, sqlite3, sys, threading, time, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("AI_DATA", os.path.join(HERE, "data"))
MODELS = os.path.join(DATA, "models")
os.makedirs(MODELS, exist_ok=True)
CONF_PATH = os.path.join(DATA, "ai_config.json")
DB_PATH = os.path.join(DATA, "ai.db")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8100
VERSION = "0.1"
TARGET_ROWS = 5000      # عدد العيّنات المقترح قبل أول تدريب جاد

try:
    import model            # model.py - يبرمجه المستخدم لاحقاً
except Exception as e:      # لا نتوقف إن كان فيه خطأ
    model = None
    print("تعذّر تحميل model.py:", e)

CONF = {"token": "", "collecting": True, "active_model": None}
if os.path.exists(CONF_PATH):
    CONF.update(json.load(open(CONF_PATH, encoding="utf-8")))
if not CONF["token"]:
    CONF["token"] = secrets.token_hex(12)
json.dump(CONF, open(CONF_PATH, "w", encoding="utf-8"), indent=2)

DB = sqlite3.connect(DB_PATH, check_same_thread=False)
DB.row_factory = sqlite3.Row
LOCK = threading.RLock()
DB.executescript("""
CREATE TABLE IF NOT EXISTS samples(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INT, zone_id INT, crop TEXT, stage TEXT, crop_day INT,
    soil_pct REAL, wind REAL, level INT, pump INT, hour INT, dow INT);
CREATE INDEX IF NOT EXISTS ix_samples_ts ON samples(ts);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INT, zone_id INT, source TEXT, minutes INT, result TEXT);
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INT, rec_key TEXT, title TEXT, level TEXT, zone_id INT, vote INT);
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INT, kind TEXT, status TEXT, note TEXT);
""")
DB.commit()
JOB_LOG = []


def q(sql, args=(), one=False):
    with LOCK:
        rows = DB.execute(sql, args).fetchall()
        DB.commit()
    rows = [dict(r) for r in rows]
    return (rows[0] if rows else None) if one else rows


def stats():
    s = q("SELECT COUNT(*) n, MIN(ts) a, MAX(ts) b FROM samples", one=True)
    zones = q("SELECT zone_id, crop, COUNT(*) n FROM samples GROUP BY zone_id, crop")
    fb = q("SELECT COALESCE(SUM(vote>0),0) up, COALESCE(SUM(vote<0),0) down FROM feedback", one=True)
    size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    models = sorted(f for f in os.listdir(MODELS) if not f.startswith("."))
    last_job = q("SELECT * FROM jobs ORDER BY id DESC LIMIT 1", one=True)
    return {"ok": True, "version": VERSION, "collecting": CONF["collecting"], "samples": s["n"], "first_ts": s["a"], "last_ts": s["b"],
            "events": q("SELECT COUNT(*) n FROM events", one=True)["n"], "feedback_up": fb["up"], "feedback_down": fb["down"],
            "zones": zones, "target_rows": TARGET_ROWS, "db_kb": round(size / 1024), "models": models,
            "active_model": CONF["active_model"], "model_ready": bool(CONF["active_model"]), "last_job": last_job,
            "model_code": bool(model)}


def csv_of(table):
    cur = DB.execute(f"SELECT * FROM {table} ORDER BY id")
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow([c[0] for c in cur.description])
    w.writerows(cur.fetchall())
    return out.getvalue().encode("utf-8-sig")


def run_train():
    jid = q("INSERT INTO jobs(ts,kind,status,note) VALUES(?,?,?,?) RETURNING id", (int(time.time()), "train", "running", ""), one=True)["id"]
    try:
        JOB_LOG.clear()
        res = model.train(DB_PATH, lambda m: JOB_LOG.append(str(m)))
        q("UPDATE jobs SET status='done', note=? WHERE id=?", (str(res), jid))
    except NotImplementedError as e:
        q("UPDATE jobs SET status='not_implemented', note=? WHERE id=?", (str(e), jid))
    except Exception as e:
        q("UPDATE jobs SET status='failed', note=? WHERE id=?", (str(e), jid))


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _go(self, method):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/health" and self.headers.get("X-AI-Token") != CONF["token"]:
            return self._send(401, {"error": "unauthorized"})
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n).decode()) if n else {}
        qs = urllib.parse.parse_qs(u.query)
        p = u.path
        try:
            if p == "/health":
                return self._send(200, {"ok": True, "version": VERSION, "collecting": CONF["collecting"]})
            if p == "/stats":
                return self._send(200, stats())
            if p == "/ingest" and method == "POST":
                if not CONF["collecting"]:
                    return self._send(200, {"ok": True, "skipped": "collecting off"})
                t = int(body.get("ts") or time.time())
                lt = time.localtime(t)
                q("INSERT INTO samples(ts,zone_id,crop,stage,crop_day,soil_pct,wind,level,pump,hour,dow) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                  (t, body.get("zone_id"), body.get("crop"), body.get("stage"), body.get("crop_day"), body.get("soil_pct"),
                   body.get("wind"), body.get("level"), body.get("pump"), lt.tm_hour, lt.tm_wday))
                return self._send(200, {"ok": True})
            if p == "/event" and method == "POST":
                if CONF["collecting"]:
                    q("INSERT INTO events(ts,zone_id,source,minutes,result) VALUES(?,?,?,?,?)",
                      (int(body.get("ts") or time.time()), body.get("zone_id"), body.get("source"), body.get("minutes"), body.get("result")))
                return self._send(200, {"ok": True})
            if p == "/feedback" and method == "POST":
                q("INSERT INTO feedback(ts,rec_key,title,level,zone_id,vote) VALUES(?,?,?,?,?,?)",
                  (int(time.time()), body.get("key"), body.get("title"), body.get("level"), body.get("zone_id"), int(body.get("vote", 0))))
                return self._send(200, {"ok": True})
            if p == "/collect" and method == "POST":
                CONF["collecting"] = bool(body.get("enabled"))
                json.dump(CONF, open(CONF_PATH, "w", encoding="utf-8"), indent=2)
                return self._send(200, {"ok": True, "collecting": CONF["collecting"]})
            if p == "/recommend":
                items = []
                if CONF["active_model"] and model:
                    items = model.predict(body or {}) or []
                return self._send(200, {"model": CONF["active_model"], "items": items})
            if p == "/models":
                return self._send(200, {"active": CONF["active_model"], "models": sorted(os.listdir(MODELS))})
            if p == "/train" and method == "POST":
                if not model:
                    return self._send(501, {"ok": False, "message": "ملف model.py غير متاح"})
                run_train()
                j = q("SELECT * FROM jobs ORDER BY id DESC LIMIT 1", one=True)
                return self._send(200 if j["status"] == "done" else 501, {"ok": j["status"] == "done", "status": j["status"], "message": j["note"], "log": JOB_LOG})
            if p == "/export.csv":
                t = (qs.get("table") or ["samples"])[0]
                if t not in ("samples", "events", "feedback"):
                    return self._send(400, {"error": "table"})
                return self._send(200, csv_of(t), "text/csv; charset=utf-8", {"Content-Disposition": f"attachment; filename={t}.csv"})
        except Exception as e:
            return self._send(500, {"error": str(e)})
        self._send(404, {"error": "not found"})

    def do_GET(self): self._go("GET")
    def do_POST(self): self._go("POST")


if __name__ == "__main__":
    print(f"خدمة الذكاء الاصطناعي على المنفذ {PORT} | قاعدة البيانات: {DB_PATH}")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

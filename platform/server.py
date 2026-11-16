"""منصة المزرعة الذكية - الخادم (Python بدون مكتبات خارجية).
© جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية

التشغيل:   python server.py [عنوان_اللوحة] [المنفذ]
            python server.py http://smartfarm.local 8000
ثم افتح http://localhost:8000  (ومن الهاتف: http://<عنوان الحاسوب>:8000)
أول تشغيل ينشئ رمز دخول (PIN) من 6 أرقام ويكتبه في config.json ويطبعه هنا.
"""
import json, os, re, secrets, sqlite3, sys, threading, time, urllib.parse, urllib.request, zlib
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(HERE, "static")
DATA = os.environ.get("FARM_DATA", HERE)       # مجلد البيانات (للاختبار: مجلد مؤقت)
os.makedirs(DATA, exist_ok=True)
CONFIG_PATH = os.path.join(DATA, "config.json")
DB_PATH = os.path.join(DATA, "farm.db")
SECRETS_H = os.path.join(HERE, "..", "firmware", "farm_sensors", "secrets.h")

# ------------------------------------------------------------------ الإعدادات
DEFAULTS = {
    "device_url": "http://smartfarm.local",
    "api_key": "",
    "pin": "",
    "wind_limit_kmh": 35.0,        # لا سقي بالرش مع رياح أقوى
    "soil_zone": 1,                # المنطقة التي فيها حساس الرطوبة
    "max_manual_minutes": 60,
    "ai_url": "http://127.0.0.1:8100",   # خدمة الذكاء الاصطناعي المعزولة (اختيارية)
    "ai_push_minutes": 5,                # كل كم دقيقة تُرسَل عيّنة للتدريب
}


def load_config():
    cfg = dict(DEFAULTS)
    if os.path.exists(CONFIG_PATH):
        cfg.update(json.load(open(CONFIG_PATH, encoding="utf-8")))
    if not cfg["api_key"]:
        try:
            cfg["api_key"] = re.search(r'API_KEY\s+"([^"]+)"', open(SECRETS_H, encoding="utf-8").read()).group(1)
        except Exception:
            pass
    if not cfg["pin"]:
        cfg["pin"] = "".join(secrets.choice("0123456789") for _ in range(6))
        print(f"\n*** رمز الدخول إلى المنصة (PIN): {cfg['pin']} ***\n")
    save_config(cfg)
    return cfg


def save_config(cfg):
    json.dump(cfg, open(CONFIG_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


CFG = load_config()
if len(sys.argv) > 1:
    CFG["device_url"] = sys.argv[1].rstrip("/")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
CFG["ai_url"] = os.environ.get("FARM_AI_URL", CFG["ai_url"])

# ------------------------------------------------------------------ المحاصيل
# المراحل: (الاسم، الأيام، أدنى رطوبة %، أعلى رطوبة %). النسب إرشادية وتُعاير مع الحساس.
CROPS = {
    "tomato":    ("طماطم", "🍅", [("نمو خضري", 25, 55, 75), ("إزهار", 30, 60, 80), ("عقد وثمار", 45, 65, 85), ("نضج وحصاد", 25, 50, 70)], "تهوية البيت البلاستيكي ضرورية؛ تجنّب بلل الأوراق مساءً."),
    "potato":    ("بطاطا", "🥔", [("إنبات", 20, 60, 75), ("نمو خضري", 30, 65, 80), ("تكوّن الدرنات", 35, 65, 80), ("نضج", 25, 40, 60)], "أوقف السقي قبل الحصاد بـ 10 أيام لتقوية القشرة."),
    "pepper":    ("فلفل", "🌶️", [("نمو خضري", 25, 55, 75), ("إزهار", 25, 60, 80), ("عقد وثمار", 50, 60, 80), ("حصاد", 30, 50, 70)], "يحتاج رطوبة منتظمة؛ التذبذب يسبّب تعفّن الطرف الزهري."),
    "cucumber":  ("خيار", "🥒", [("نمو خضري", 20, 60, 80), ("إزهار وثمار", 40, 65, 85), ("حصاد", 30, 60, 80)], "حساس للجفاف؛ اسقِ باستمرار وبكميات قليلة."),
    "onion":     ("بصل", "🧅", [("إنبات ونمو", 40, 55, 75), ("تكوّن الأبصال", 60, 55, 70), ("نضج", 30, 30, 50)], "أوقف الري عند اصفرار القمم."),
    "wheat":     ("قمح", "🌾", [("إنبات وتفريع", 40, 50, 70), ("استطالة وسنبلة", 40, 55, 75), ("امتلاء الحبوب", 35, 50, 70), ("نضج", 25, 25, 45)], "أهم فترات الري: الاستطالة وبداية امتلاء الحبوب."),
    "barley":    ("شعير", "🌾", [("إنبات وتفريع", 35, 45, 65), ("استطالة", 35, 50, 70), ("امتلاء", 30, 45, 65), ("نضج", 20, 25, 40)], "أقل احتياجاً للماء من القمح."),
    "date":      ("نخيل التمر", "🌴", [("نمو خضري", 150, 40, 65), ("إزهار وتلقيح", 45, 45, 65), ("عقد وتمر", 120, 50, 70), ("نضج وجني", 50, 40, 60)], "يتحمل الجفاف لكن الثمار تحتاج ماء منتظماً بعد العقد."),
    "watermelon": ("بطيخ", "🍉", [("نمو خضري", 30, 55, 75), ("إزهار", 20, 60, 75), ("نمو الثمار", 35, 60, 80), ("نضج", 15, 40, 55)], "قلّل الماء قبل القطف لزيادة السكر."),
    "lettuce":   ("خس", "🥬", [("إنبات", 12, 65, 85), ("نمو", 30, 65, 85), ("حصاد", 18, 60, 80)], "جذور سطحية؛ سقي خفيف ومتكرر."),
    "carrot":    ("جزر", "🥕", [("إنبات", 15, 65, 80), ("نمو الجذور", 55, 60, 75), ("نضج", 30, 45, 60)], "رطوبة منتظمة تمنع تشقق الجذور."),
    "corn":      ("ذرة", "🌽", [("إنبات ونمو", 30, 55, 75), ("إزهار وتلقيح", 25, 65, 80), ("امتلاء الحبوب", 35, 60, 75), ("نضج", 20, 35, 55)], "لا تُعطِّش الذرة وقت التلقيح."),
    "alfalfa":   ("برسيم/ألفا", "🌿", [("نمو بين الحشّات", 30, 50, 70)], "اسقِ بعد كل حشّة."),
    "zucchini":  ("كوسة", "🥒", [("نمو خضري", 20, 55, 75), ("إزهار وثمار", 50, 60, 80)], "احذر البلل على الأوراق لتجنّب البياض الدقيقي."),
    "eggplant":  ("باذنجان", "🍆", [("نمو خضري", 30, 55, 75), ("إزهار", 25, 60, 80), ("ثمار", 60, 60, 80)], "حساس للتذبذب في الري."),
    "peanut":    ("فول سوداني", "🥜", [("إنبات", 15, 55, 70), ("إزهار وتثبيت", 35, 60, 75), ("امتلاء القرون", 50, 55, 70), ("نضج", 20, 30, 50)], "تربة رملية خفيفة؛ لا تُغرقها."),
}


def stage_for(crop_key, planted_on):
    """المرحلة الحالية للمحصول بحسب تاريخ الزراعة."""
    c = CROPS.get(crop_key)
    if not c or not planted_on:
        return None
    try:
        days = (datetime.now().date() - datetime.strptime(planted_on, "%Y-%m-%d").date()).days
    except ValueError:
        return None
    total = sum(s[1] for s in c[2])
    acc = 0
    for i, (name, d, lo, hi) in enumerate(c[2]):
        if days < acc + d:
            return {"index": i, "name": name, "min": lo, "max": hi, "day": days, "days_left_in_stage": acc + d - days,
                    "total_days": total, "days_to_harvest": max(0, total - days), "done": False}
        acc += d
    lo, hi = c[2][-1][2], c[2][-1][3]
    return {"index": len(c[2]) - 1, "name": c[2][-1][0], "min": lo, "max": hi, "day": days, "days_left_in_stage": 0,
            "total_days": total, "days_to_harvest": 0, "done": True}


# ------------------------------------------------------------------ قاعدة البيانات
DB = sqlite3.connect(DB_PATH, check_same_thread=False)
DB.row_factory = sqlite3.Row
DBLOCK = threading.RLock()


def q(sql, args=(), one=False):
    with DBLOCK:
        cur = DB.execute(sql, args)
        rows = cur.fetchall()
        DB.commit()
        if one:
            return dict(rows[0]) if rows else None
        return [dict(r) for r in rows]


def init_db():
    with DBLOCK:
        DB.executescript("""
        CREATE TABLE IF NOT EXISTS readings(ts INTEGER, soil_raw INT, soil_pct INT, wind REAL, level INT, pump INT, zone INT);
        CREATE INDEX IF NOT EXISTS ix_readings ON readings(ts);
        CREATE TABLE IF NOT EXISTS zones(id INTEGER PRIMARY KEY, name TEXT, kind TEXT, image TEXT, crop TEXT, planted_on TEXT,
            area_m2 REAL DEFAULT 0, expected_yield REAL DEFAULT 0, unit TEXT DEFAULT 'كغ', auto_mode INT DEFAULT 0, auto_minutes INT DEFAULT 5, comment TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT, zone_id INT, ts INTEGER, category TEXT, text TEXT);
        CREATE TABLE IF NOT EXISTS yields(id INTEGER PRIMARY KEY AUTOINCREMENT, zone_id INT, ts INTEGER, qty REAL, unit TEXT, note TEXT);
        CREATE TABLE IF NOT EXISTS schedules(id INTEGER PRIMARY KEY AUTOINCREMENT, zone_id INT, time TEXT, days TEXT, minutes INT, enabled INT DEFAULT 1, last_run TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS irrigation_log(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, zone_id INT, source TEXT, minutes INT, result TEXT);
        CREATE TABLE IF NOT EXISTS cameras(id INTEGER PRIMARY KEY, name TEXT, url TEXT DEFAULT '');
        """)
        if not DB.execute("SELECT 1 FROM zones").fetchone():
            DB.executemany("INSERT INTO zones(id,name,kind,image) VALUES(?,?,?,?)", [
                (1, "الأرض المفتوحة", "open", "img3.jpg"),
                (2, "البيت البلاستيكي", "greenhouse", "img6.jpg"),
                (3, "البيفو (Pivot)", "pivot", "img4.jpg")])
        if not DB.execute("SELECT 1 FROM cameras").fetchone():
            DB.executemany("INSERT INTO cameras(id,name) VALUES(?,?)", [(1, "كاميرا 1 - الأرض المفتوحة"), (2, "كاميرا 2 - البيت البلاستيكي"),
                                                                          (3, "كاميرا 3 - البيفو"), (4, "كاميرا 4 - الخزان والمضخة")])
        DB.commit()


init_db()

# ------------------------------------------------------------------ الاتصال باللوحة
LIVE = {"online": False, "ts": 0, "data": {}, "error": "نفس اللوحة غير متصلة بعد"}
LIVE_LOCK = threading.Lock()


def device_get(path, timeout=5):
    with urllib.request.urlopen(CFG["device_url"] + path, timeout=timeout) as r:
        return r.read().decode()


def poller():
    last_save = 0
    wind_max = 0.0
    while True:
        try:
            d = json.loads(device_get("/status", 4))
            with LIVE_LOCK:
                LIVE.update(online=True, ts=time.time(), data=d, error="")
            wind_max = max(wind_max, d.get("kmh", 0))
            if time.time() - last_save >= 60:
                last_save = time.time()
                q("INSERT INTO readings VALUES(?,?,?,?,?,?,?)",
                  (int(time.time()), d.get("raw"), d.get("pct"), wind_max, d.get("level"), d.get("pump"), d.get("zone", 0)))
                wind_max = 0.0
        except Exception as e:
            with LIVE_LOCK:
                LIVE.update(online=False, error=str(e))
        time.sleep(2)


def live_snapshot():
    with LIVE_LOCK:
        s = dict(LIVE)
    s["age"] = round(time.time() - s["ts"], 1) if s["ts"] else None
    if s["ts"] and time.time() - s["ts"] > 15:
        s["online"] = False
    return s


# ------------------------------------------------------------------ السقي
IRR_LOCK = threading.Lock()


def log_irrigation(zone_id, source, minutes, result):
    q("INSERT INTO irrigation_log(ts,zone_id,source,minutes,result) VALUES(?,?,?,?,?)",
      (int(time.time()), zone_id, source, minutes, result))
    ai_call("POST", "/event", {"zone_id": zone_id, "source": source, "minutes": minutes, "result": result}, timeout=2)


# ------------------------------------------------------------------ خدمة الذكاء الاصطناعي (معزولة وغير إلزامية)
AI_CONF = os.path.join(os.environ.get("AI_DATA", os.path.join(HERE, "ai", "data")), "ai_config.json")


def ai_token():
    try:
        return json.load(open(AI_CONF, encoding="utf-8")).get("token", "")
    except Exception:
        return ""


def ai_call(method, path, body=None, timeout=4, raw=False):
    """استدعاء خدمة الذكاء. لا يرمي أخطاء أبداً: إن كانت متوقفة يُرجع None."""
    try:
        req = urllib.request.Request(CFG["ai_url"] + path, method=method, headers={"X-AI-Token": ai_token(), "Content-Type": "application/json"},
                                     data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return data if raw else json.loads(data.decode())
    except Exception:
        return None


def ai_pusher():
    """يرسل كل بضع دقائق عيّنة لكل منطقة إلى خدمة الذكاء (إن كانت تعمل وكان الجمع مفعّلاً)."""
    while True:
        time.sleep(max(1, CFG["ai_push_minutes"]) * 60)
        try:
            snap = live_snapshot()
            if not snap["online"]:
                continue
            d = snap["data"]
            for z in q("SELECT * FROM zones"):
                stg = stage_for(z["crop"], z["planted_on"])
                ai_call("POST", "/ingest", {"ts": int(time.time()), "zone_id": z["id"], "crop": z["crop"], "stage": stg["name"] if stg else None,
                                            "crop_day": stg["day"] if stg else None, "soil_pct": d.get("pct") if z["id"] == CFG["soil_zone"] else None,
                                            "wind": d.get("kmh"), "level": d.get("level"),
                                            "pump": 1 if d.get("pump") and d.get("zone") in (0, z["id"]) else 0}, timeout=3)
        except Exception as e:
            print("ai_pusher:", e)


def start_irrigation(zone_id, minutes, source="manual", force=False):
    """يبدأ السقي. يُرجع (نجح؟، رسالة)."""
    minutes = max(1, min(int(minutes), CFG["max_manual_minutes"] if source == "manual" else 60))
    # force = تشغيل يدوي: يتجاوز حماية الرياح والخزان (يبقى حد الزمن ساري)
    z = q("SELECT * FROM zones WHERE id=?", (zone_id,), one=True)
    if not z:
        return False, "منطقة غير معروفة"
    snap = live_snapshot()
    d = snap["data"]
    if not snap["online"]:
        log_irrigation(zone_id, source, minutes, "failed: offline")
        return False, "المتحكم غير متصل"
    if d.get("pump") and d.get("zone") not in (0, zone_id):
        return False, "المضخة تسقي منطقة أخرى الآن"
    if z["kind"] in ("pivot", "open") and d.get("kmh", 0) > CFG["wind_limit_kmh"] and not force:
        log_irrigation(zone_id, source, minutes, "skipped: wind")
        return False, f"الرياح قوية ({d.get('kmh')} كم/س) - السقي بالرش يضيع الماء"
    if d.get("level") != 1 and not force:
        log_irrigation(zone_id, source, minutes, "blocked: tank")
        return False, "الخزان ليس ممتلئاً (حماية المضخة) - يمكنك استخدام التشغيل اليدوي لتجاوزها"
    try:
        r = json.loads(device_get(f"/pump?cmd=on&sec={minutes * 60}&zone={zone_id}&key={CFG['api_key']}" + ("&force=1" if force else "")))
    except Exception as e:
        log_irrigation(zone_id, source, minutes, f"failed: {e}")
        return False, f"فشل الاتصال بالمتحكم: {e}"
    ok = bool(r.get("pump"))
    log_irrigation(zone_id, source, minutes, ("started (يدوي)" if force else "started") if ok else f"refused: {r.get('pmsg')}")
    return ok, "بدأ السقي" if ok else f"رفض المتحكم: {r.get('pmsg')}"


def stop_pump(source="manual"):
    try:
        json.loads(device_get(f"/pump?cmd=off&key={CFG['api_key']}"))
        log_irrigation((live_snapshot()["data"] or {}).get("zone", 0), source, 0, "stopped")
        return True, "تم إيقاف المضخة"
    except Exception as e:
        return False, f"فشل الإيقاف: {e}"


def scheduler():
    """جدول السقي + الوضع التلقائي حسب الرطوبة."""
    last_auto = {}
    while True:
        try:
            now = datetime.now()
            hhmm = now.strftime("%H:%M")
            today = now.strftime("%Y-%m-%d")
            for s in q("SELECT * FROM schedules WHERE enabled=1"):
                if str(now.weekday()) not in s["days"] or s["last_run"] == today:
                    continue
                sched = datetime.strptime(s["time"], "%H:%M").replace(year=now.year, month=now.month, day=now.day)
                if 0 <= (now - sched).total_seconds() <= 600:      # نافذة 10 دقائق للتنفيذ
                    d = live_snapshot()["data"]
                    z = q("SELECT * FROM zones WHERE id=?", (s["zone_id"],), one=True)
                    stg = stage_for(z["crop"], z["planted_on"]) if z else None
                    if z and stg and CFG["soil_zone"] == z["id"] and d.get("pct", 0) > stg["max"]:
                        log_irrigation(z["id"], "schedule", s["minutes"], "skipped: already wet")
                        q("UPDATE schedules SET last_run=? WHERE id=?", (today, s["id"]))
                        continue
                    if not live_snapshot()["online"]:
                        continue                                   # نعيد المحاولة داخل النافذة
                    ok, msg = start_irrigation(s["zone_id"], s["minutes"], "schedule")
                    if ok or "الخزان" in msg or "الرياح" in msg:
                        q("UPDATE schedules SET last_run=? WHERE id=?", (today, s["id"]))
            # الوضع التلقائي حسب رطوبة التربة
            snap = live_snapshot()
            if snap["online"] and not snap["data"].get("pump"):
                z = q("SELECT * FROM zones WHERE id=?", (CFG["soil_zone"],), one=True)
                stg = stage_for(z["crop"], z["planted_on"]) if z else None
                good_hours = 5 <= now.hour < 10 or 17 <= now.hour < 21        # صباحاً باكراً أو مساءً فقط
                dry = bool(z and z["auto_mode"] and stg and snap["data"].get("pct", 100) < stg["min"])
                if dry and good_hours:
                    if time.time() - last_auto.get(z["id"], 0) > 1800:
                        last_auto[z["id"]] = time.time()
                        start_irrigation(z["id"], z["auto_minutes"], "auto")
        except Exception as e:
            print("scheduler error:", e)
        time.sleep(20)


# ------------------------------------------------------------------ التوصيات الزراعية (قواعد الآن، ونموذج ذكي لاحقاً)
def ai_recommendations(context):
    """مكان ربط النموذج الذكي لاحقاً: يستقبل السياق ويُرجع قائمة توصيات إضافية."""
    return []


def recommendations():
    recs = []
    snap = live_snapshot()
    d = snap["data"]
    now = datetime.now()

    def add(level, title, text, zone=None):
        recs.append({"level": level, "title": title, "text": text, "zone": zone,
                     "key": str(zlib.crc32(f"{level}|{title}".encode()))})

    if not snap["online"]:
        add("critical", "المتحكم غير متصل", "تحقّق من التغذية والواي فاي. السقي التلقائي متوقف حتى يعود الاتصال.")
    else:
        if d.get("level") == 0:
            add("critical", "الخزان فارغ", "أضف ماءً للخزان؛ المضخة محمية ولن تعمل بلا ماء.")
        if d.get("kmh", 0) > CFG["wind_limit_kmh"]:
            add("warn", "رياح قوية", f"سرعة الرياح {d['kmh']} كم/س. أجّل السقي بالرش (الأرض المفتوحة والبيفو) لتقليل الضياع، وثبّت أغطية البيت البلاستيكي.")
    zones = q("SELECT * FROM zones")
    for z in zones:
        stg = stage_for(z["crop"], z["planted_on"])
        if not z["crop"]:
            add("info", f"اختر محصولاً لـ {z['name']}", "بتحديد المحصول وتاريخ الزراعة تُحسب الرطوبة المستهدفة لكل مرحلة.", z["id"])
            continue
        cname = CROPS[z["crop"]][0]
        if stg:
            if stg["days_left_in_stage"] <= 5 and not stg["done"]:
                add("info", f"{z['name']}: اقتراب مرحلة جديدة", f"مرحلة «{stg['name']}» تنتهي خلال {stg['days_left_in_stage']} أيام. راجع التسميد والرطوبة المستهدفة.", z["id"])
            if stg["days_to_harvest"] <= 10:
                add("info", f"{z['name']}: اقتراب الحصاد", f"تبقّى نحو {stg['days_to_harvest']} يوماً لحصاد {cname}. جهّز العمالة وسجّل الكمية عند الحصاد.", z["id"])
            if snap["online"] and CFG["soil_zone"] == z["id"] and d.get("pct") is not None:
                p = d["pct"]
                if p < stg["min"]:
                    add("warn", f"{z['name']}: التربة جافة", f"الرطوبة {p}% والمطلوب {stg['min']}–{stg['max']}% لمرحلة «{stg['name']}». اسقِ {z['auto_minutes']} دقائق (يفضّل الصباح الباكر أو المساء).", z["id"])
                elif p > stg["max"] + 10:
                    add("warn", f"{z['name']}: رطوبة زائدة", f"الرطوبة {p}% أعلى من المطلوب ({stg['max']}%). أوقف السقي لتجنّب اختناق الجذور والأمراض الفطرية.", z["id"])
        tip = CROPS[z["crop"]][3]
        add("tip", f"{z['name']} ({cname})", tip, z["id"])
        if not q("SELECT 1 FROM schedules WHERE zone_id=? AND enabled=1", (z["id"],)):
            add("info", f"{z['name']}: لا جدول سقي", "أضف جدولاً للسقي (مثلاً 06:00 صباحاً و18:30 مساءً) لتوفير الماء وتجنّب الحرارة.", z["id"])
        last_note = q("SELECT MAX(ts) m FROM notes WHERE zone_id=?", (z["id"],), one=True)["m"]
        if not last_note or time.time() - last_note > 7 * 86400:
            add("info", f"{z['name']}: لا ملاحظات منذ أسبوع", "دوّن حالة النبات (آفات، لون الأوراق، تسميد) لتتبّع تطور المحصول.", z["id"])
    if 11 <= now.hour < 16:
        add("tip", "وقت الظهيرة", "تجنّب الري بين 11:00 و16:00؛ التبخّر يضيّع جزءاً كبيراً من الماء.")
    add_ctx = {"live": d, "zones": zones, "time": now.isoformat()}
    recs += ai_recommendations(add_ctx)
    order = {"critical": 0, "warn": 1, "info": 2, "tip": 3}
    return sorted(recs, key=lambda r: order.get(r["level"], 9))


# ------------------------------------------------------------------ واجهة API
def zone_view(z):
    z = dict(z)
    c = CROPS.get(z["crop"]) if z["crop"] else None
    z["crop_name"] = c[0] if c else ""
    z["crop_icon"] = c[1] if c else ""
    z["stage"] = stage_for(z["crop"], z["planted_on"])
    z["total_yield"] = q("SELECT COALESCE(SUM(qty),0) s FROM yields WHERE zone_id=?", (z["id"],), one=True)["s"]
    z["notes_count"] = q("SELECT COUNT(*) n FROM notes WHERE zone_id=?", (z["id"],), one=True)["n"]
    z["has_soil_sensor"] = (CFG["soil_zone"] == z["id"])
    return z


def history(hours=24):
    since = int(time.time()) - int(hours * 3600)
    bucket = max(60, int(hours * 3600 / 120))
    return q("""SELECT (ts/?)*? AS t, ROUND(AVG(soil_pct),1) soil, ROUND(AVG(wind),1) wind, ROUND(MAX(wind),1) wind_max,
                MIN(level) level, MAX(pump) pump FROM readings WHERE ts>=? GROUP BY t ORDER BY t""", (bucket, bucket, since))


def api(method, path, query, body, headers):
    P = lambda k, default=None: (query.get(k) or [default])[0]
    if path == "/api/login":
        return {"ok": body.get("pin") == CFG["pin"]}
    if path == "/api/live":
        s = live_snapshot()
        return {"online": s["online"], "age": s["age"], "error": s["error"], "data": s["data"], "wind_limit": CFG["wind_limit_kmh"],
                "soil_zone": CFG["soil_zone"], "now": datetime.now().strftime("%H:%M:%S")}
    if path == "/api/history":
        return history(float(P("hours", 24)))
    if path == "/api/crops":
        return [{"key": k, "name": v[0], "icon": v[1], "stages": [{"name": s[0], "days": s[1], "min": s[2], "max": s[3]} for s in v[2]],
                 "total_days": sum(s[1] for s in v[2]), "tip": v[3]} for k, v in CROPS.items()]
    if path == "/api/zones":
        if method == "POST":
            zid = int(body["id"])
            allowed = ["name", "crop", "planted_on", "area_m2", "expected_yield", "unit", "auto_mode", "auto_minutes", "comment"]
            sets = {k: body[k] for k in allowed if k in body}
            if "crop" in sets and sets["crop"] and sets["crop"] not in CROPS:
                return {"error": "محصول غير معروف"}
            if sets:
                q(f"UPDATE zones SET {','.join(k + '=?' for k in sets)} WHERE id=?", (*sets.values(), zid))
        return [zone_view(z) for z in q("SELECT * FROM zones ORDER BY id")]
    if path == "/api/notes":
        if method == "POST":
            if not str(body.get("text", "")).strip():
                return {"error": "الملاحظة فارغة"}
            q("INSERT INTO notes(zone_id,ts,category,text) VALUES(?,?,?,?)",
              (int(body["zone_id"]), int(time.time()), body.get("category", "عام"), body["text"].strip()))
        if method == "DELETE":
            q("DELETE FROM notes WHERE id=?", (int(P("id")),))
        z = P("zone")
        return q("SELECT * FROM notes " + ("WHERE zone_id=? " if z else "") + "ORDER BY ts DESC LIMIT 200", (int(z),) if z else ())
    if path == "/api/yields":
        if method == "POST":
            q("INSERT INTO yields(zone_id,ts,qty,unit,note) VALUES(?,?,?,?,?)",
              (int(body["zone_id"]), int(time.time()), float(body["qty"]), body.get("unit", "كغ"), body.get("note", "")))
        if method == "DELETE":
            q("DELETE FROM yields WHERE id=?", (int(P("id")),))
        return q("SELECT * FROM yields ORDER BY ts DESC LIMIT 200")
    if path == "/api/schedules":
        if method == "POST":
            if not re.fullmatch(r"\d{2}:\d{2}", str(body.get("time", ""))):
                return {"error": "وقت غير صحيح"}
            q("INSERT INTO schedules(zone_id,time,days,minutes) VALUES(?,?,?,?)",
              (int(body["zone_id"]), body["time"], body.get("days", "0123456"), max(1, min(60, int(body["minutes"])))))
        if method == "DELETE":
            q("DELETE FROM schedules WHERE id=?", (int(P("id")),))
        if method == "PATCH":
            q("UPDATE schedules SET enabled=? WHERE id=?", (1 if body.get("enabled") else 0, int(body["id"])))
        return q("SELECT * FROM schedules ORDER BY time")
    if path == "/api/irrigation_log":
        return q("SELECT * FROM irrigation_log ORDER BY ts DESC LIMIT 60")
    if path == "/api/irrigate":
        if body.get("stop"):
            ok, msg = stop_pump()
        else:
            ok, msg = start_irrigation(int(body["zone_id"]), int(body.get("minutes", 5)), "manual", bool(body.get("force")))
        return {"ok": ok, "message": msg}
    if path == "/api/aux":                       # زر تحكم إضافي (مثل تشغيل البيفو عن بعد) - يحتاج توصيل في المتحكم
        try:
            r = device_get(f"/aux?ch={urllib.parse.quote(str(body.get('ch', 'pivot')))}&state={'on' if body.get('state') else 'off'}&key={CFG['api_key']}")
            return {"ok": True, "message": r}
        except Exception:
            return {"ok": False, "message": "هذا الزر غير موصول بالمتحكم بعد (سيُفعَّل عند إضافة الريلاي الخاص به)."}
    if path == "/api/cameras":
        if method == "POST":
            q("UPDATE cameras SET name=?, url=? WHERE id=?", (body.get("name", ""), body.get("url", "").strip(), int(body["id"])))
        return q("SELECT * FROM cameras ORDER BY id")
    if path == "/api/recommendations":
        return recommendations()
    if path == "/api/settings":
        if method == "POST":
            for k in ("wind_limit_kmh", "soil_zone", "max_manual_minutes"):
                if k in body:
                    CFG[k] = type(DEFAULTS[k])(body[k])
            if body.get("device_url"):
                CFG["device_url"] = body["device_url"].rstrip("/")
            if body.get("new_pin") and re.fullmatch(r"\d{4,12}", str(body["new_pin"])):
                CFG["pin"] = str(body["new_pin"])
            save_config(CFG)
        return {k: CFG[k] for k in ("device_url", "wind_limit_kmh", "soil_zone", "max_manual_minutes")}
    if path == "/api/wifi/scan":
        try:
            return json.loads(device_get(f"/wifi/scan?key={CFG['api_key']}", 15))
        except Exception as e:
            return {"error": f"تعذّر البحث: {e}"}
    if path == "/api/wifi/save":
        try:
            r = device_get(f"/wifi/save?ssid={urllib.parse.quote(body['ssid'])}&pass={urllib.parse.quote(body.get('pass', ''))}&key={CFG['api_key']}", 8)
            return {"ok": True, "message": r}
        except Exception as e:
            return {"ok": False, "message": f"تعذّر الحفظ: {e}"}
    # ---- خدمة الذكاء الاصطناعي (معزولة): كل ما يلي يعمل بلا أخطاء حتى لو كانت الخدمة متوقفة ----
    if path == "/api/ai/status":
        r = ai_call("GET", "/stats", timeout=3)
        return {"online": r is not None, **(r or {})}
    if path == "/api/ai/collect":
        r = ai_call("POST", "/collect", {"enabled": bool(body.get("enabled"))})
        return r or {"ok": False, "message": "خدمة الذكاء الاصطناعي متوقفة"}
    if path == "/api/ai/feedback":
        r = ai_call("POST", "/feedback", {"key": body.get("key"), "title": body.get("title"), "level": body.get("level"),
                                           "zone_id": body.get("zone"), "vote": int(body.get("vote", 0))})
        return r or {"ok": False}
    if path == "/api/ai/train":
        r = ai_call("POST", "/train", {}, timeout=600)
        if r is None:
            try:   # الخدمة تُرجع 501 حين لا يوجد تدريب مبرمج
                req = urllib.request.Request(CFG["ai_url"] + "/train", method="POST", data=b"{}", headers={"X-AI-Token": ai_token()})
                urllib.request.urlopen(req, timeout=600)
            except urllib.error.HTTPError as e:
                return json.loads(e.read().decode())
            except Exception:
                pass
            return {"ok": False, "message": "خدمة الذكاء الاصطناعي متوقفة"}
        return r
    if path == "/api/ai/recommend":
        zones = [zone_view(z) for z in q("SELECT * FROM zones")]
        ctx = {"live": live_snapshot()["data"], "zones": zones, "hour": datetime.now().hour}
        r = ai_call("POST", "/recommend", ctx, timeout=6)
        return r or {"model": None, "items": [], "offline": True}
    if path == "/api/ai/export":
        raw = ai_call("GET", "/export.csv?table=" + urllib.parse.quote(P("table", "samples")), raw=True, timeout=20)
        if raw is None:
            return {"error": "خدمة الذكاء الاصطناعي متوقفة"}
        return ("raw", raw, "text/csv; charset=utf-8", {"Content-Disposition": f"attachment; filename={P('table', 'samples')}.csv"})
    if path == "/api/summary":
        today = int(datetime.now().replace(hour=0, minute=0, second=0).timestamp())
        r = q("SELECT MAX(wind) w, MIN(soil_pct) smin, MAX(soil_pct) smax, ROUND(AVG(soil_pct),1) savg FROM readings WHERE ts>=?", (today,), one=True)
        runs = q("SELECT COUNT(*) n, COALESCE(SUM(minutes),0) m FROM irrigation_log WHERE ts>=? AND result='started'", (today,), one=True)
        return {"wind_max_today": r["w"], "soil_min": r["smin"], "soil_max": r["smax"], "soil_avg": r["savg"],
                "irrigations_today": runs["n"], "minutes_today": runs["m"]}
    return None


# ------------------------------------------------------------------ خادم HTTP
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json"}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        static_code = ctype.startswith(("text/html", "text/css", "text/javascript"))
        self.send_header("Cache-Control", "no-store" if ctype.startswith("application/json") else "no-cache" if static_code else "max-age=86400")
        self.end_headers()
        self.wfile.write(body)

    def _handle(self, method):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        if path.startswith("/api/"):
            if path != "/api/login" and self.headers.get("X-Pin") != CFG["pin"]:
                return self._send(401, {"error": "unauthorized"})
            n = int(self.headers.get("Content-Length") or 0)
            body = {}
            if n:
                try:
                    body = json.loads(self.rfile.read(n).decode())
                except ValueError:
                    return self._send(400, {"error": "bad json"})
            try:
                res = api(method, path, urllib.parse.parse_qs(u.query), body, self.headers)
            except Exception as e:
                return self._send(500, {"error": str(e)})
            if isinstance(res, tuple) and res and res[0] == "raw":
                self.send_response(200)
                self.send_header("Content-Type", res[2])
                self.send_header("Content-Length", str(len(res[1])))
                for k, v in res[3].items():
                    self.send_header(k, v)
                self.end_headers()
                return self.wfile.write(res[1])
            return self._send(404 if res is None else 200, res if res is not None else {"error": "not found"})
        if method != "GET":
            return self._send(405, {"error": "method"})
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        f = os.path.normpath(os.path.join(STATIC, rel))
        if not f.startswith(STATIC) or not os.path.isfile(f):
            return self._send(404, b"not found", "text/plain")
        self._send(200, open(f, "rb").read(), MIME.get(os.path.splitext(f)[1].lower(), "application/octet-stream"))

    def do_GET(self): self._handle("GET")
    def do_POST(self): self._handle("POST")
    def do_DELETE(self): self._handle("DELETE")
    def do_PATCH(self): self._handle("PATCH")


if __name__ == "__main__":
    threading.Thread(target=poller, daemon=True).start()
    threading.Thread(target=scheduler, daemon=True).start()
    threading.Thread(target=ai_pusher, daemon=True).start()
    print(f"المنصة تعمل على http://localhost:{PORT}   (اللوحة: {CFG['device_url']})")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()

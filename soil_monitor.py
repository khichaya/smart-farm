"""عرض حي لحساس رطوبة التربة (القراءة التناظرية A والرقمية D).
التشغيل:  python soil_monitor.py [COM16]   ثم افتح  http://localhost:8080
(أغلق أي Serial Monitor آخر - المنفذ لا يفتحه إلا برنامج واحد)
"""
import json, re, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import serial

PORT = sys.argv[1] if len(sys.argv) > 1 else "COM16"
LINE = re.compile(r"raw=(\d+) pct=(\d+) dig=(\d) min=(\d+) max=(\d+)")
state = {"connected": False, "history": []}
lock = threading.Lock()


def reader():
    while True:
        try:
            ser = serial.Serial()
            ser.port, ser.baudrate, ser.timeout = PORT, 115200, 1
            ser.dtr = ser.rts = False  # وإلا تبقى اللوحة في حالة reset
            ser.open()
            with ser:
                state["connected"] = True
                state["error"] = ""
                while True:
                    m = LINE.search(ser.readline().decode(errors="ignore"))
                    if not m:
                        continue
                    raw, pct, dig, mn, mx = map(int, m.groups())
                    with lock:
                        state.update(raw=raw, pct=pct, dig=dig, min=mn, max=mx)
                        state["history"].append(raw)
                        del state["history"][:-40]
        except Exception as e:
            state["connected"] = False
            state["error"] = str(e)
            time.sleep(2)


PAGE = """<!doctype html><html lang=ar dir=rtl><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>رطوبة التربة</title>
<style>
body{font-family:Tahoma,sans-serif;background:#0f1b14;color:#e6f2e6;margin:0;padding:20px}
h1{margin:0 0 4px}#st{font-size:13px;opacity:.7}
.row{display:flex;gap:20px;flex-wrap:wrap;margin-top:18px}
.box{background:#16271c;border-radius:14px;padding:16px}
.tube{width:110px;height:300px;position:relative;background:#0c1510;border-radius:8px;overflow:hidden}
.fill{position:absolute;bottom:0;left:0;right:0;height:0;transition:height .35s}
#a{background:linear-gradient(#f0b35a,#c07a1d)}
#p{background:linear-gradient(#6ec3f0,#1f78b4)}
#dg{height:300px;width:110px;border-radius:8px;display:flex;align-items:center;justify-content:center;
 font-size:26px;font-weight:bold;background:#3a2a1a;transition:background .3s}
#hist{display:flex;align-items:flex-end;gap:3px;height:300px;width:min(520px,86vw);direction:ltr;background:#0c1510;border-radius:8px;padding:6px}
.h{flex:1;background:#6ec3f0;border-radius:2px 2px 0 0;min-height:2px;transition:height .3s}
.big{font-size:34px;font-weight:bold}.lbl{opacity:.7;font-size:13px;margin-bottom:6px}
</style>
<h1>🌱 رطوبة التربة</h1><div id=st>جارٍ الاتصال...</div>
<div class=row>
 <div class=box><div class=lbl>A (تناظري خام 0-1024)</div><div class=tube><div class=fill id=a></div></div><div class=big id=rv>-</div></div>
 <div class=box><div class=lbl>الرطوبة %</div><div class=tube><div class=fill id=p></div></div><div class=big id=pv>-</div></div>
 <div class=box><div class=lbl>D (رقمي)</div><div id=dg>-</div></div>
 <div class=box><div class=lbl>آخر 40 ثانية (raw، الأقل = الأرطب)</div><div id=hist></div>
  <div class=lbl style="margin-top:10px">أقل قراءة: <b id=mn>-</b> — أعلى قراءة: <b id=mx>-</b></div></div>
</div>
<script>
async function tick(){
 try{
  const d=await (await fetch('/state')).json();
  st.textContent=d.connected?'متصل بـ COM16':'غير متصل: '+(d.error||'');
  if(d.raw===undefined)return;
  a.style.height=d.raw/1024*100+'%'; p.style.height=d.pct+'%';
  rv.textContent=d.raw; pv.textContent=d.pct+'%';
  dg.textContent=d.dig? 'جاف (1)':'رطب (0)'; dg.style.background=d.dig?'#7a4a1a':'#1f6f9f';
  mn.textContent=d.min; mx.textContent=d.max;
  hist.innerHTML=d.history.map(v=>`<div class=h style="height:${v/1024*100}%" title="${v}"></div>`).join('');
 }catch(e){}
}
setInterval(tick,500);tick();
</script></html>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/state"):
            with lock:
                body = json.dumps(state).encode()
            ct = "application/json"
        else:
            body, ct = PAGE.encode(), "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ct)
        self.end_headers()
        self.wfile.write(body)


threading.Thread(target=reader, daemon=True).start()
print(f"افتح http://localhost:8080  (المنفذ {PORT})")
ThreadingHTTPServer(("127.0.0.1", 8080), H).serve_forever()

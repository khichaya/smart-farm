"""لوحة تحكم المزرعة الذكية: تقرأ ESP8266 من COM16 وتعرضها على http://localhost:8080
التشغيل:  pip install pyserial   ثم   python dashboard.py [COM16]
"""
import json, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import serial

PORT = sys.argv[1] if len(sys.argv) > 1 else "COM16"
state = {"connected": False}
history = []
ser = None
lock = threading.Lock()


def reader():
    global ser
    while True:
        try:
            ser = serial.Serial(PORT, 115200, timeout=1)
            state["connected"] = True
            while True:
                line = ser.readline().decode(errors="ignore").strip()
                if line.startswith("{"):
                    d = json.loads(line)
                    d["t"] = time.strftime("%H:%M:%S")
                    with lock:
                        state.update(d, connected=True)
                        history.append(d)
                        del history[:-60]
        except Exception as e:
            state["connected"] = False
            state["error"] = str(e)
            time.sleep(2)


def send(cmd):
    if ser and ser.is_open:
        ser.write((cmd + "\n").encode())


PAGE = """<!doctype html><html lang=ar dir=rtl><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>المزرعة الذكية</title>
<style>body{font-family:Tahoma,sans-serif;background:#f1f5ee;margin:0;padding:16px;color:#1f3a1f}
h1{margin:0 0 12px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.c{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px #0002}.c b{font-size:28px;display:block}
button{font-size:16px;padding:10px 16px;margin:8px 4px 0 0;border:0;border-radius:8px;background:#2f7d32;color:#fff;cursor:pointer}
button.o{background:#b23b3b}.ok{color:#2f7d32}.bad{color:#b23b3b}</style>
<h1>🌱 المزرعة الذكية</h1><div class=g id=g></div>
<p><button onclick="c('PUMP ON')">تشغيل المضخة</button><button class=o onclick="c('PUMP OFF')">إيقاف المضخة</button>
<button onclick="c('AUTO ON')">وضع تلقائي</button></p><small id=s></small>
<script>
const c=x=>fetch('/cmd?c='+encodeURIComponent(x));
async function u(){try{const d=await (await fetch('/state')).json();
const card=(t,v,cl='')=>`<div class=c>${t}<b class=${cl}>${v}</b></div>`;
g.innerHTML=card('رطوبة التربة',(d.soil??'--')+'%')+card('الرياح',(d.wind??'--')+' كم/س')+
card('مستوى الماء',d.water?'كافٍ':'منخفض',d.water?'ok':'bad')+card('المضخة',d.pump?'تعمل':'متوقفة',d.pump?'ok':'')+
card('الوضع',d.auto?'تلقائي':'يدوي')+card('السبب',d.reason??'-');
s.textContent=(d.connected?'متصل':'غير متصل: '+(d.error||''))+' — '+(d.t||'')}catch(e){}}
setInterval(u,1500);u();</script></html>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        if self.path.startswith("/state"):
            with lock: body = json.dumps(state).encode(); ct = "application/json"
        elif self.path.startswith("/cmd"):
            c = self.path.split("c=", 1)[-1]
            from urllib.parse import unquote
            c = unquote(c)
            if c in ("PUMP ON", "PUMP OFF", "AUTO ON", "AUTO OFF"): send(c)
            body = b"ok"; ct = "text/plain"
        else:
            body = PAGE.encode(); ct = "text/html; charset=utf-8"
        self.send_response(200); self.send_header("Content-Type", ct); self.end_headers()
        self.wfile.write(body)


threading.Thread(target=reader, daemon=True).start()
print(f"http://localhost:8080  (serial {PORT})")
ThreadingHTTPServer(("127.0.0.1", 8080), H).serve_forever()

"""عرض حي لحساس الرياح كأعمدة بيانية.
التشغيل:  python wind_monitor.py [COM16]   ثم افتح  http://localhost:8080
(أغلق Serial Monitor في Arduino IDE قبل التشغيل - المنفذ لا يفتحه إلا برنامج واحد)
"""
import json, re, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import serial

PORT = sys.argv[1] if len(sys.argv) > 1 else "COM16"
LINE = re.compile(r"pin=(\d) pulses/s=(\d+) total=(\d+) hz=([\d.]+) wind=([\d.]+)")
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
                    pin, p, total, hz, kmh = m.groups()
                    with lock:
                        state.update(pin=int(pin), pulses=int(p), total=int(total),
                                     hz=float(hz), kmh=float(kmh))
                        state["history"].append(int(p))
                        del state["history"][:-40]
        except Exception as e:
            state["connected"] = False
            state["error"] = str(e)
            time.sleep(2)


PAGE = """<!doctype html><html lang=ar dir=rtl><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>حساس الرياح</title>
<style>
body{font-family:Tahoma,sans-serif;background:#0f1b14;color:#e6f2e6;margin:0;padding:20px}
h1{margin:0 0 4px}#st{font-size:13px;opacity:.7}
.row{display:flex;gap:24px;flex-wrap:wrap;margin-top:18px}
.box{background:#16271c;border-radius:14px;padding:16px}
#live{width:130px;height:300px;position:relative;background:#0c1510;border-radius:8px;overflow:hidden}
#bar{position:absolute;bottom:0;left:0;right:0;height:0;background:linear-gradient(#7be07b,#2e9e4a);transition:height .35s}
#hist{display:flex;align-items:flex-end;gap:3px;height:300px;width:min(640px,86vw);direction:ltr;background:#0c1510;border-radius:8px;padding:6px}
.h{flex:1;background:#4fbf6a;border-radius:2px 2px 0 0;min-height:2px;transition:height .3s}
.big{font-size:40px;font-weight:bold}.lbl{opacity:.7;font-size:13px}
.dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#444;margin-left:6px}
</style>
<h1>🌬️ حساس الرياح</h1><div id=st>جارٍ الاتصال...</div>
<div class=row>
 <div class=box><div class=lbl>نبضات/ثانية (الآن)</div><div id=live><div id=bar></div></div></div>
 <div class=box><div class=lbl>آخر 40 ثانية</div><div id=hist></div></div>
 <div class=box>
  <div class=lbl>السرعة التقريبية</div><div class=big><span id=k>0</span> كم/س</div>
  <div class=lbl>التردد</div><div class=big style="font-size:28px"><span id=hz>0</span> Hz</div>
  <div class=lbl>إجمالي النبضات</div><div class=big style="font-size:28px" id=t>0</div>
  <div class=lbl>حالة المفتاح <span class=dot id=pin></span></div>
 </div>
</div>
<script>
const MAX=12;
async function tick(){
 try{
  const d=await (await fetch('/state')).json();
  st.textContent=d.connected?'متصل بـ COM16':'غير متصل: '+(d.error||'');
  if(d.pulses===undefined)return;
  bar.style.height=Math.min(100,d.pulses/MAX*100)+'%';
  k.textContent=d.kmh.toFixed(1);hz.textContent=d.hz.toFixed(2);t.textContent=d.total;
  pin.style.background=d.pin===0?'#7be07b':'#444';
  const mx=Math.max(MAX,...d.history);
  hist.innerHTML=d.history.map(v=>`<div class=h style="height:${v/mx*100}%" title="${v}"></div>`).join('');
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

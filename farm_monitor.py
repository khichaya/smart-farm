"""عرض حي لحساسات المزرعة (الرياح + رطوبة التربة).
التشغيل:  python farm_monitor.py [COM16]   ثم افتح  http://localhost:8080
(أغلق أي Serial Monitor آخر - المنفذ لا يفتحه إلا برنامج واحد)
"""
import json, re, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import serial

# الوسيط: COM5  (كابل USB)   أو   http://smartfarm.local  (واي فاي)
PORT = sys.argv[1] if len(sys.argv) > 1 else "COM16"
HTTP_MODE = PORT.lower().startswith("http")
BASE = PORT.rstrip("/")
try:  # مفتاح التحكم من الملف المحلي secrets.h
    API_KEY = re.search(r'API_KEY\s+"([^"]+)"',
                        open(__file__.rsplit("\\", 1)[0] + r"\firmware\farm_sensors\secrets.h", encoding="utf-8").read()).group(1)
except Exception:
    API_KEY = ""
state = {"connected": False, "wh": [], "sh": [], "lh": [], "port": PORT}
lock = threading.Lock()
ser_ref = None


def ingest(d):
    with lock:
        state.update(d)
        state["wh"].append(d["pulses"])
        state["sh"].append(d["raw"])
        state["lh"].append(d.get("water", 0))
        del state["wh"][:-40], state["sh"][:-40], state["lh"][:-40]


def reader_http():
    while True:
        try:
            with urllib.request.urlopen(BASE + "/status", timeout=4) as r:
                ingest(json.loads(r.read().decode()))
            state["connected"] = True
            state["error"] = ""
        except Exception as e:
            state["connected"] = False
            state["error"] = str(e)
            state.setdefault("events", []).append(f"{time.strftime('%H:%M:%S')} انقطاع الشبكة: {e}")
            del state["events"][:-8]
        time.sleep(1)


def send(cmd):
    if HTTP_MODE:
        m = {"PUMP ON": "on", "PUMP OFF": "off", "PUMP TEST": "test"}.get(cmd)
        if m:
            try:
                urllib.request.urlopen(f"{BASE}/pump?cmd={m}&key={API_KEY}", timeout=4).read()
            except Exception as e:
                state["error"] = str(e)
        return
    if ser_ref is not None and ser_ref.is_open:
        ser_ref.write((cmd + "\n").encode())


def reader():
    while True:
        try:
            ser = serial.Serial()
            ser.port, ser.baudrate, ser.timeout = PORT, 115200, 1
            ser.dtr = ser.rts = False  # وإلا تبقى اللوحة في حالة reset
            ser.open()
            global ser_ref
            ser_ref = ser
            with ser:
                state["connected"] = True
                state["error"] = ""
                while True:
                    line = ser.readline().decode(errors="ignore").strip()
                    if not line.startswith("{"):
                        continue
                    try:
                        d = json.loads(line)
                    except ValueError:
                        continue
                    with lock:
                        state.update(d)
                        state["wh"].append(d["pulses"])
                        state["sh"].append(d["raw"])
                        state["lh"].append(d.get("water", 0))
                        del state["wh"][:-40], state["sh"][:-40], state["lh"][:-40]
        except Exception as e:
            state["connected"] = False
            state["error"] = str(e)
            state.setdefault("events", []).append(
                f"{time.strftime('%H:%M:%S')} انقطاع: {e} (آخر uptime={state.get('up')}ث، المضخة={state.get('pump')})")
            del state["events"][:-8]
            time.sleep(2)


PAGE = """<!doctype html><html lang=ar dir=rtl><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>المزرعة الذكية</title>
<style>
body{font-family:Tahoma,sans-serif;background:#0f1b14;color:#e6f2e6;margin:0;padding:20px}
h1{margin:0 0 4px}h2{margin:22px 0 0;font-size:20px}#st{font-size:13px;opacity:.7}
.row{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px}
.box{background:#16271c;border-radius:14px;padding:14px}
.tube{width:100px;height:260px;position:relative;background:#0c1510;border-radius:8px;overflow:hidden}
.fill{position:absolute;bottom:0;left:0;right:0;height:0;transition:height .35s}
#wb{background:linear-gradient(#7be07b,#2e9e4a)}#ab{background:linear-gradient(#f0b35a,#c07a1d)}
#pb{background:linear-gradient(#6ec3f0,#1f78b4)}
.hist{display:flex;align-items:flex-end;gap:3px;height:260px;width:min(460px,86vw);direction:ltr;background:#0c1510;border-radius:8px;padding:6px}
.h{flex:1;border-radius:2px 2px 0 0;min-height:2px;transition:height .3s}
.big{font-size:30px;font-weight:bold}.lbl{opacity:.7;font-size:13px;margin-bottom:6px}
#dg{height:260px;width:100px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;transition:background .3s}
</style>
<h1>🌾 المزرعة الذكية</h1><div id=st>جارٍ الاتصال...</div>
<h2>🌬️ الرياح</h2>
<div class=row>
 <div class=box><div class=lbl>نبضات/ثانية</div><div class=tube><div class=fill id=wb></div></div><div class=big id=wp>-</div></div>
 <div class=box><div class=lbl>آخر 40 ثانية</div><div class=hist id=wh></div></div>
 <div class=box><div class=lbl>السرعة التقريبية</div><div class=big><span id=k>0</span> كم/س</div>
  <div class=lbl style="margin-top:12px">التردد</div><div class=big style="font-size:24px"><span id=hz>0</span> Hz</div>
  <div class=lbl style="margin-top:12px">إجمالي النبضات</div><div class=big style="font-size:24px" id=t>0</div></div>
</div>
<h2>🌱 رطوبة التربة</h2>
<div class=row>
 <div class=box><div class=lbl>A خام (0-1024)</div><div class=tube><div class=fill id=ab></div></div><div class=big id=rv>-</div></div>
 <div class=box><div class=lbl>الرطوبة %</div><div class=tube><div class=fill id=pb></div></div><div class=big id=pv>-</div></div>
 <div class=box><div class=lbl>D رقمي</div><div id=dg>-</div></div>
 <div class=box><div class=lbl>آخر 40 ثانية (raw)</div><div class=hist id=sh></div></div>
</div>
<h2>💧 مستوى الماء</h2>
<div class=row>
 <div class=box><div class=lbl>الحالة (S)</div><div id=wl style="height:150px;width:200px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:bold;transition:background .3s">-</div></div>
 <div class=box><div class=lbl>آخر 40 ثانية (1 = ماء)</div><div class=hist id=wlh style="height:150px"></div></div>
</div>
<h2>🚰 المضخة</h2>
<div class=row>
 <div class=box><div class=lbl>الحالة</div><div id=pm style="height:110px;width:200px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:26px;font-weight:bold;transition:background .3s">-</div></div>
 <div class=box><div class=lbl>تحكم</div>
  <button onclick="cmd('PUMP ON')" style="font-size:18px;padding:14px 22px;border:0;border-radius:10px;background:#2f7d32;color:#fff;cursor:pointer;margin:4px">▶ تشغيل (بحماية الماء)</button>
  <button onclick="if(confirm('تشغيل يدوي يتجاوز حساس الماء. تأكد أن المضخة داخل الماء. متابعة؟'))cmd('PUMP FORCE')" style="font-size:18px;padding:14px 22px;border:0;border-radius:10px;background:#c77d12;color:#fff;cursor:pointer;margin:4px">🖐 تشغيل يدوي</button>
  <button onclick="cmd('PUMP TEST')" style="font-size:18px;padding:14px 22px;border:0;border-radius:10px;background:#3b6ea5;color:#fff;cursor:pointer;margin:4px">⏱ اختبار 3 ث</button>
  <button onclick="cmd('PUMP OFF')" style="font-size:18px;padding:14px 22px;border:0;border-radius:10px;background:#b23b3b;color:#fff;cursor:pointer;margin:4px">■ إيقاف</button>
  <div class=lbl style="margin-top:10px">"تشغيل" يمنعه حساس الماء إن كان الخزان فارغاً، و"يدوي" يتجاوزه. وفي كل الحالات إيقاف تلقائي بعد 60 ثانية.</div></div>
</div>
<div class=box style="margin-top:18px"><div class=lbl>🔧 تشخيص</div><div id=dx style="font-size:13px;direction:ltr;text-align:left;white-space:pre-line"></div></div>
<script>
const cmd=c=>fetch('/cmd?c='+encodeURIComponent(c));
const MAXP=12;
const bars=(v,max,c)=>v.map(x=>`<div class=h style="background:${c};height:${x/max*100}%" title="${x}"></div>`).join('');
async function tick(){
 try{
  const d=await (await fetch('/state')).json();
  st.textContent=d.connected?'متصل بـ '+d.port:'غير متصل: '+(d.error||'');
  if(d.raw===undefined)return;
  wb.style.height=Math.min(100,d.pulses/MAXP*100)+'%'; wp.textContent=d.pulses;
  k.textContent=d.kmh.toFixed(1);hz.textContent=d.hz.toFixed(2);t.textContent=d.total;
  wh.innerHTML=bars(d.wh,Math.max(MAXP,...d.wh),'#4fbf6a');
  ab.style.height=d.raw/1024*100+'%'; pb.style.height=d.pct+'%';
  rv.textContent=d.raw; pv.textContent=d.pct+'%';
  dg.textContent=d.dig?'جاف (1)':'رطب (0)'; dg.style.background=d.dig?'#7a4a1a':'#1f6f9f';
  sh.innerHTML=bars(d.sh,1024,'#6ec3f0');
  const lv=d.level, pend=(d.water!==lv&&lv!==2);
  wl.innerHTML=(lv===1?'💧 ممتلئ':lv===0?'⚠️ فارغ':'⏳ جارٍ التأكد...')
    +(pend||lv===2?`<div style="font-size:14px;font-weight:normal;margin-top:6px">${d.water?'يحس بماء':'لا يحس بماء'}: ${Math.min(d.wcount,d.wconfirm)}/${d.wconfirm} ث</div>`:'');
  wl.style.background=lv===1?'#1f6f9f':lv===0?'#9f3a1f':'#555';
  dx.textContent='uptime: '+(d.up??'-')+' s | last reset: '+(d.rst??'-')+(d.events&&d.events.length?'\\n'+d.events.join('\\n'):'');
  const msgs={off:'',manual_on:'',manual_off:'',manual_force:'تشغيل يدوي',test_3s:'اختبار 3 ثوانٍ',test_done:'انتهى الاختبار','blocked_no_water':'ممنوعة: لا ماء','stopped_empty':'أُوقفت: الخزان فارغ','stopped_max_time':'أُوقفت: انتهى الوقت الأقصى'};
  pm.innerHTML=(d.pump?'🟢 تعمل':'⚪ متوقفة')+`<div style="font-size:14px;font-weight:normal;margin-top:6px">${msgs[d.pmsg]||''}</div>`;
  pm.style.background=d.pump?'#2f7d32':(d.pmsg&&d.pmsg.startsWith('blocked')||d.pmsg&&d.pmsg.startsWith('stopped'))?'#9f3a1f':'#333';
  wlh.innerHTML=bars(d.lh.map(x=>x?1:0.05),1,'#6ec3f0');
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
        elif self.path.startswith("/cmd"):
            from urllib.parse import unquote
            c = unquote(self.path.split("c=", 1)[-1])
            if c in ("PUMP ON", "PUMP OFF", "PUMP TEST", "PUMP FORCE"):
                send(c)
            body, ct = b"ok", "text/plain"
        else:
            body, ct = PAGE.encode(), "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ct)
        self.end_headers()
        self.wfile.write(body)


threading.Thread(target=reader_http if HTTP_MODE else reader, daemon=True).start()
print(f"افتح http://localhost:8080  (المنفذ {PORT})")
ThreadingHTTPServer(("127.0.0.1", 8080), H).serve_forever()

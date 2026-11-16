/*
 * المزرعة الذكية - ESP8266 مع واي فاي وإعداد الشبكة من الصفحة
 * © جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية
 *
 * الرياح (سلكان):        سلك -> IO14 (D5)   سلك -> GND
 * رطوبة التربة (4 أسلاك): VCC -> 3V3  GND -> GND  A -> ADC(A0)  D -> IO12 (D6)
 * مستوى الماء (3 أسلاك):  - -> GND   + -> IO13   S -> IO4
 * الريلاي (3 أسلاك):      GND -> GND  VCC -> 3V3/VIN  IN -> IO5
 *
 * HTTP (نفس الشبكة):
 *   GET /status
 *   GET /pump?cmd=on|off|test&sec=N&zone=Z&key=KEY   (sec حتى 3600 ثانية)
 *   GET /wifi/scan?key=KEY      GET /wifi/save?ssid=..&pass=..&key=KEY
 * إذا فشل الاتصال بالشبكة 30 ثانية: تفتح اللوحة شبكة "SmartFarm-Setup" (كلمتها smartfarm)
 * وعنوانها 192.168.4.1 لاختيار الشبكة وإدخال كلمة المرور.
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <EEPROM.h>
#include "secrets.h"   // WIFI_SSID / WIFI_PASS (قيم افتراضية أولى) و API_KEY

const uint8_t PIN_WIND = 14;
const uint8_t PIN_SOIL_D = 12;
const uint8_t PIN_WATER_S = 4;
const uint8_t PIN_WATER_PWR = 13;
const float KMH_PER_HZ = 2.4;            // تقريبي - يحتاج معايرة
const unsigned long DEBOUNCE_US = 5000;
const int RAW_DRY = 1024;
const int RAW_WET = 50;

// ---- المضخة (ريلاي IN -> IO5) ----
const uint8_t PIN_RELAY = 5;
const bool RELAY_ACTIVE_LOW = true;
const bool REQUIRE_WATER = true;
const unsigned long PUMP_DEFAULT_MS = 60000UL;
const unsigned long PUMP_ABS_MAX_MS = 3600000UL;  // سقف مطلق: ساعة
const unsigned long PUMP_TEST_MS = 3000UL;
bool pumpOn = false;
bool pumpTest = false;
bool pumpForce = false;          // تشغيل يدوي يتجاوز حماية الماء
unsigned long pumpStart = 0;
unsigned long pumpLimitMs = PUMP_DEFAULT_MS;
int pumpZone = 0;
String pumpMsg = "off";
String cmdBuf = "";

const int WATER_CONFIRM_S = 7;
int waterLevel = 2;              // 0 فارغ، 1 ممتلئ، 2 جارٍ التأكد
int waterCount = 0;
int waterLast = -1;

volatile unsigned long pulses = 0;
volatile unsigned long lastPulseUs = 0;
unsigned long totalPulses = 0, lastReport = 0;

// ---- الواي فاي المحفوظ ----
struct WifiCfg { uint32_t magic; char ssid[33]; char pass[65]; };
WifiCfg cfg;
const uint32_t CFG_MAGIC = 0x53464D31;
unsigned long wifiStart = 0, apStarted = 0, rebootAt = 0;
bool apActive = false;

ESP8266WebServer server(80);
String statusJson = "{}";
bool mdnsStarted = false;
bool ipPrinted = false;

void IRAM_ATTR onPulse() {
  unsigned long now = micros();
  if (now - lastPulseUs >= DEBOUNCE_US) { pulses++; lastPulseUs = now; }
}

void loadCfg() {
  EEPROM.begin(128);
  EEPROM.get(0, cfg);
  if (cfg.magic != CFG_MAGIC) {            // أول تشغيل: استخدم القيم الافتراضية من secrets.h
    memset(&cfg, 0, sizeof(cfg));
    cfg.magic = CFG_MAGIC;
    strncpy(cfg.ssid, WIFI_SSID, 32);
    strncpy(cfg.pass, WIFI_PASS, 64);
  }
}

void saveCfg() { EEPROM.put(0, cfg); EEPROM.commit(); }

void startWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(cfg.ssid, cfg.pass);
  wifiStart = millis();
}

void startAp() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("SmartFarm-Setup", "smartfarm");
  apActive = true;
  apStarted = millis();
  Serial.println("# setup AP on: SmartFarm-Setup / 192.168.4.1");
}

void setPump(bool on, const char* why) {
  pumpOn = on;
  pumpMsg = why;
  digitalWrite(PIN_RELAY, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
  if (on) pumpStart = millis();
}

// أمر المضخة: sec = مدة التشغيل بالثواني
void pumpCommand(const String& c, unsigned long sec, int zone, bool force = false) {
  if (c == "on") {
    // force = تشغيل يدوي يتجاوز حساس الماء (يبقى حد الزمن ساري)
    if (!force && REQUIRE_WATER && waterLevel != 1) { setPump(false, "blocked_no_water"); return; }
    if (sec == 0) sec = PUMP_DEFAULT_MS / 1000;
    pumpLimitMs = min(sec * 1000UL, PUMP_ABS_MAX_MS);
    pumpTest = false; pumpZone = zone; pumpForce = force;
    setPump(true, force ? "manual_force" : "manual_on");
  } else if (c == "off") { pumpTest = false; pumpForce = false; setPump(false, "manual_off"); }
  else if (c == "test") { pumpTest = true; pumpLimitMs = PUMP_TEST_MS; pumpZone = zone; setPump(true, "test_3s"); }
}

void handleSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n') { if (c != '\r' && cmdBuf.length() < 20) cmdBuf += c; continue; }
    cmdBuf.trim(); cmdBuf.toLowerCase();
    if (cmdBuf == "pump on") pumpCommand("on", 0, 0);
    else if (cmdBuf == "pump off") pumpCommand("off", 0, 0);
    else if (cmdBuf == "pump test") pumpCommand("test", 0, 0);
    cmdBuf = "";
  }
}

bool authOk() { return apActive || server.arg("key") == API_KEY; }

String jsonEscape(String s) { s.replace("\\", "\\\\"); s.replace("\"", "\\\""); return s; }

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", statusJson);
}

void handlePump() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (!authOk()) { server.send(403, "text/plain", "forbidden"); return; }
  String c = server.arg("cmd");
  if (c != "on" && c != "off" && c != "test") { server.send(400, "text/plain", "bad cmd"); return; }
  pumpCommand(c, server.arg("sec").toInt(), server.arg("zone").toInt(), server.arg("force") == "1");
  server.send(200, "application/json", String("{\"pump\":") + (pumpOn ? 1 : 0) + ",\"pmsg\":\"" + pumpMsg + "\"}");
}

void handleScan() {
  if (!authOk()) { server.send(403, "text/plain", "forbidden"); return; }
  int n = WiFi.scanNetworks();
  String out = "[";
  for (int i = 0; i < n; i++) {
    if (i) out += ",";
    out += "{\"ssid\":\"" + jsonEscape(WiFi.SSID(i)) + "\",\"rssi\":" + WiFi.RSSI(i) +
           ",\"open\":" + (WiFi.encryptionType(i) == ENC_TYPE_NONE ? "true" : "false") + "}";
  }
  out += "]";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", out);
}

void handleSave() {
  if (!authOk()) { server.send(403, "text/plain", "forbidden"); return; }
  String s = server.arg("ssid"), p = server.arg("pass");
  if (s.length() == 0 || s.length() > 32 || p.length() > 64) { server.send(400, "text/plain", "bad"); return; }
  memset(cfg.ssid, 0, sizeof(cfg.ssid)); memset(cfg.pass, 0, sizeof(cfg.pass));
  s.toCharArray(cfg.ssid, 33); p.toCharArray(cfg.pass, 65);
  saveCfg();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "saved, rebooting");
  rebootAt = millis() + 1500;
}

const char SETUP_PAGE[] PROGMEM = R"HTML(<!doctype html><html lang=ar dir=rtl><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>إعداد المزرعة</title>
<style>body{font-family:Tahoma,sans-serif;max-width:420px;margin:20px auto;padding:0 14px}
li{list-style:none;padding:10px;border:1px solid #ccc;border-radius:8px;margin:6px 0;cursor:pointer}
input,button{font-size:16px;padding:10px;width:100%;box-sizing:border-box;margin:6px 0}button{background:#2f7d32;color:#fff;border:0;border-radius:8px}</style>
<h2>🌱 اختيار شبكة الواي فاي</h2><div id=m>جارٍ البحث عن الشبكات...</div><ul id=l></ul>
<input id=s placeholder="اسم الشبكة"><input id=p type=password placeholder="كلمة المرور">
<button onclick=save()>حفظ وإعادة التشغيل</button>
<script>
async function scan(){try{const r=await (await fetch('/wifi/scan')).json();m.textContent=r.length?'اضغط على شبكتك:':'لا توجد شبكات';
l.innerHTML=r.sort((a,b)=>b.rssi-a.rssi).map(x=>`<li onclick="s.value=this.dataset.n" data-n="${x.ssid.replace(/"/g,'&quot;')}">${x.open?'🔓':'🔒'} ${x.ssid} <small>(${x.rssi})</small></li>`).join('')}catch(e){m.textContent='تعذّر البحث'}}
async function save(){const r=await fetch('/wifi/save?ssid='+encodeURIComponent(s.value)+'&pass='+encodeURIComponent(p.value));
m.textContent=r.ok?'تم الحفظ. ستعيد اللوحة الاتصال بالشبكة خلال ثوانٍ.':'فشل الحفظ'}
scan();</script></html>)HTML";

void handleSetup() { server.send_P(200, "text/html; charset=utf-8", SETUP_PAGE); }

void setup() {
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);   // المضخة مطفأة فوراً
  Serial.begin(115200);
  pinMode(PIN_WIND, INPUT_PULLUP);
  pinMode(PIN_SOIL_D, INPUT);
  pinMode(PIN_WATER_S, INPUT);
  pinMode(PIN_WATER_PWR, OUTPUT);
  digitalWrite(PIN_WATER_PWR, LOW);
  attachInterrupt(digitalPinToInterrupt(PIN_WIND), onPulse, FALLING);

  loadCfg();
  startWifi();
  server.on("/status", handleStatus);
  server.on("/pump", handlePump);
  server.on("/wifi/scan", handleScan);
  server.on("/wifi/save", handleSave);
  server.on("/setup", handleSetup);
  server.on("/", handleSetup);
  server.begin();

  lastReport = millis();
  Serial.println("\n# farm ready");
}

void loop() {
  handleSerial();
  server.handleClient();
  unsigned long now = millis();   // بعد معالجة الأوامر (وإلا يصبح الفرق سالباً)

  if (rebootAt && now > rebootAt) ESP.restart();

  if (WiFi.status() == WL_CONNECTED) {
    if (!mdnsStarted) { mdnsStarted = MDNS.begin("smartfarm"); }
    MDNS.update();
    if (!ipPrinted) { Serial.print("# ip "); Serial.println(WiFi.localIP()); ipPrinted = true; }
    if (apActive && now - apStarted > 120000UL) { WiFi.softAPdisconnect(true); WiFi.mode(WIFI_STA); apActive = false; }
  } else {
    ipPrinted = false;
    if (!apActive && now - wifiStart > 30000UL) startAp();   // لا شبكة: افتح بوابة الإعداد
  }

  // حمايات المضخة
  if (pumpOn && pumpTest && now - pumpStart >= PUMP_TEST_MS) { pumpTest = false; setPump(false, "test_done"); }
  if (pumpOn && !pumpTest && !pumpForce && REQUIRE_WATER && waterLevel == 0) setPump(false, "stopped_empty");
  if (pumpOn && !pumpTest && now - pumpStart >= pumpLimitMs) setPump(false, "timer_done");
  if (now - lastReport < 1000) return;

  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(A0); delay(3); }
  int raw = sum / 10;
  int pct = constrain(map(raw, RAW_DRY, RAW_WET, 0, 100), 0, 100);

  digitalWrite(PIN_WATER_PWR, HIGH);
  delay(30);
  int water = digitalRead(PIN_WATER_S);
  digitalWrite(PIN_WATER_PWR, LOW);

  if (water == waterLast) { if (waterCount < 1000) waterCount++; }
  else { waterLast = water; waterCount = 1; }
  if (waterCount >= WATER_CONFIRM_S) waterLevel = water;

  now = millis();
  noInterrupts(); unsigned long p = pulses; pulses = 0; interrupts();
  float hz = p * 1000.0 / (now - lastReport);
  lastReport = now;
  totalPulses += p;

  unsigned long remain = (pumpOn && !pumpTest && pumpLimitMs > now - pumpStart) ? (pumpLimitMs - (now - pumpStart)) / 1000 : 0;
  char buf[620];
  snprintf(buf, sizeof(buf),
    "{\"pulses\":%lu,\"total\":%lu,\"hz\":%.2f,\"kmh\":%.1f,\"wpin\":%d,"
    "\"raw\":%d,\"pct\":%d,\"dig\":%d,\"water\":%d,\"level\":%d,\"wcount\":%d,\"wconfirm\":%d,"
    "\"pump\":%d,\"pmsg\":\"%s\",\"force\":%d,\"zone\":%d,\"remain\":%lu,\"up\":%lu,\"rssi\":%d,\"wifi\":%d,\"ap\":%d,"
    "\"ssid\":\"%s\",\"rst\":\"%s\"}",
    p, totalPulses, hz, hz * KMH_PER_HZ, digitalRead(PIN_WIND),
    raw, pct, digitalRead(PIN_SOIL_D), water, waterLevel, waterCount, WATER_CONFIRM_S,
    pumpOn ? 1 : 0, pumpMsg.c_str(), pumpForce ? 1 : 0, pumpZone, remain, millis() / 1000,
    WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0, WiFi.status() == WL_CONNECTED ? 1 : 0, apActive ? 1 : 0,
    jsonEscape(String(cfg.ssid)).c_str(), ESP.getResetReason().c_str());
  statusJson = buf;
  Serial.println(statusJson);
}

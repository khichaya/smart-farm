/*
 * المزرعة الذكية - ESP8266 (NodeMCU / Wemos D1 mini)
 *
 * الحساسات والمخرجات (عدّل الأرقام حسب توصيلك):
 *   حساس رطوبة التربة (تناظري)  -> A0
 *   حساس مستوى الماء (عوامة)    -> D6 (GPIO12)  [LOW = الماء موجود عند التوصيل بين D6 و GND]
 *   حساس الرياح (أنيموميتر نبضي) -> D5 (GPIO14)
 *   ريلاي المضخة                 -> D1 (GPIO5)
 *
 * ملاحظة: ESP8266 فيه مدخل تناظري واحد فقط (A0) لذلك مستوى الماء والرياح رقميان.
 *
 * الاتصال التسلسلي 115200:
 *   يرسل كل ثانيتين سطر JSON.
 *   أوامر الاستقبال (سطر نصي):  PUMP ON | PUMP OFF | AUTO ON | AUTO OFF | STATUS
 */

#include <Arduino.h>

// ---------------- الإعدادات ----------------
const uint8_t PIN_SOIL   = A0;
const uint8_t PIN_WATER  = 12;   // D6
const uint8_t PIN_WIND   = 14;   // D5
const uint8_t PIN_RELAY  = 5;    // D1

const bool RELAY_ACTIVE_LOW = true;   // معظم وحدات الريلاي تعمل عند LOW

// معايرة رطوبة التربة (اقرأ القيمة في الهواء ثم في الماء وعدّلها)
const int SOIL_RAW_DRY = 1024;   // قراءة التربة الجافة/الهواء
const int SOIL_RAW_WET = 400;    // قراءة التربة المبللة/الماء

const bool WATER_PRESENT_IS_LOW = true;  // العوامة تغلق على GND عند وجود الماء

// الأنيموميتر: كم كم/س لكل نبضة في الثانية (راجع مواصفات حساسك)
const float WIND_KMH_PER_HZ = 2.4;

// منطق الري التلقائي
const int   SOIL_ON_BELOW_PCT   = 35;     // شغّل المضخة إذا الرطوبة أقل
const int   SOIL_OFF_ABOVE_PCT  = 55;     // أوقفها إذا الرطوبة أعلى
const float WIND_MAX_KMH        = 30.0;   // لا تسقِ مع رياح أقوى
const unsigned long PUMP_MAX_MS = 30000UL;   // أقصى تشغيل متواصل
const unsigned long PUMP_COOLDOWN_MS = 60000UL; // راحة بعد الحد الأقصى
const unsigned long REPORT_MS   = 2000UL;
// --------------------------------------------

volatile unsigned long windPulses = 0;
bool pumpOn = false;
bool autoMode = true;
unsigned long pumpStart = 0, pumpStopped = 0, lastReport = 0, lastWindCalc = 0;
float windKmh = 0;
int soilPct = 0;
bool waterOk = false;
String reason = "boot";

void IRAM_ATTR onWindPulse() { windPulses++; }

void setPump(bool on, const char* why) {
  if (on == pumpOn) return;
  pumpOn = on;
  reason = why;
  digitalWrite(PIN_RELAY, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
  if (on) pumpStart = millis(); else pumpStopped = millis();
}

void readSensors() {
  long sum = 0;
  for (int i = 0; i < 8; i++) { sum += analogRead(PIN_SOIL); delay(2); }
  int raw = sum / 8;
  soilPct = constrain(map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100), 0, 100);

  bool lvl = digitalRead(PIN_WATER);
  waterOk = WATER_PRESENT_IS_LOW ? (lvl == LOW) : (lvl == HIGH);

  unsigned long now = millis();
  if (now - lastWindCalc >= 1000) {
    noInterrupts(); unsigned long p = windPulses; windPulses = 0; interrupts();
    float hz = p * 1000.0 / (now - lastWindCalc);
    windKmh = hz * WIND_KMH_PER_HZ;
    lastWindCalc = now;
  }
}

void autoControl() {
  unsigned long now = millis();
  // حماية: لا مضخة بدون ماء (حتى في اليدوي)
  if (pumpOn && !waterOk) { setPump(false, "no_water"); return; }
  if (pumpOn && now - pumpStart >= PUMP_MAX_MS) { setPump(false, "max_run"); return; }
  if (!autoMode) return;

  if (pumpOn) {
    if (soilPct >= SOIL_OFF_ABOVE_PCT) setPump(false, "soil_ok");
    else if (windKmh > WIND_MAX_KMH)   setPump(false, "wind");
  } else {
    bool cooled = (pumpStopped == 0) || (now - pumpStopped >= PUMP_COOLDOWN_MS);
    if (soilPct <= SOIL_ON_BELOW_PCT && waterOk && windKmh <= WIND_MAX_KMH && cooled)
      setPump(true, "soil_dry");
  }
}

void report() {
  Serial.printf("{\"soil\":%d,\"water\":%s,\"wind\":%.1f,\"pump\":%s,\"auto\":%s,\"reason\":\"%s\"}\n",
                soilPct, waterOk ? "true" : "false", windKmh,
                pumpOn ? "true" : "false", autoMode ? "true" : "false", reason.c_str());
}

void handleSerial() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim(); cmd.toUpperCase();
  if (cmd == "PUMP ON") {
    if (waterOk) { autoMode = false; setPump(true, "manual"); } else reason = "no_water";
  } else if (cmd == "PUMP OFF") { autoMode = false; setPump(false, "manual"); }
  else if (cmd == "AUTO ON")  autoMode = true;
  else if (cmd == "AUTO OFF") autoMode = false;
  report();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);  // المضخة مطفأة
  pinMode(PIN_WATER, INPUT_PULLUP);
  pinMode(PIN_WIND, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_WIND), onWindPulse, FALLING);
  lastWindCalc = millis();
  Serial.println("\n# smart farm ready");
}

void loop() {
  handleSerial();
  readSensors();
  autoControl();
  if (millis() - lastReport >= REPORT_MS) { lastReport = millis(); report(); }
  delay(20);
}

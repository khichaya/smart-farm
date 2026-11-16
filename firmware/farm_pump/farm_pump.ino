/*
 * حساسات المزرعة (الرياح + رطوبة التربة) - ESP8266
 *
 * الرياح (سلكان):        سلك -> IO14 (D5)   سلك -> GND
 * رطوبة التربة (4 أسلاك): VCC -> 3V3  GND -> GND  A -> ADC(A0)  D -> IO12 (D6)
 *
 * Serial 115200: سطر JSON كل ثانية
 */

const uint8_t PIN_WIND = 14;
const uint8_t PIN_SOIL_D = 12;
const uint8_t PIN_WATER_S = 4;     // مستوى الماء: S -> IO4
const uint8_t PIN_WATER_PWR = 13;  // مستوى الماء: + -> IO13 (يعمل أثناء القراءة فقط)
const float KMH_PER_HZ = 2.4;            // تقريبي - يحتاج معايرة
const unsigned long DEBOUNCE_US = 5000;
const int RAW_DRY = 1024;                // جاف (الهواء)
const int RAW_WET = 50;                  // مبلل (الماء)

// ---- المضخة (ريلاي IN -> IO5) ----
const uint8_t PIN_RELAY = 5;
const bool RELAY_ACTIVE_LOW = true;        // معظم الموديولات تعمل عند LOW
const bool REQUIRE_WATER = true;           // لا تشغيل للمضخة إذا الخزان ليس "ممتلئ"
const unsigned long PUMP_MAX_MS = 60000UL; // أقصى تشغيل متواصل (60 ثانية)
bool pumpOn = false;
bool pumpForce = false;                    // تشغيل يدوي يتجاوز حساس الماء (يبقى الحد الأقصى للوقت)
bool pumpTest = false;                    // اختبار قصير: يتجاوز حماية الماء لمدة 3 ثوانٍ فقط
const unsigned long PUMP_TEST_MS = 3000UL;
unsigned long pumpStart = 0;
String pumpMsg = "off";
String cmdBuf = "";

void setPump(bool on, const char* why) {
  pumpOn = on;
  pumpMsg = why;
  digitalWrite(PIN_RELAY, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
  if (on) pumpStart = millis();
}

const int WATER_CONFIRM_S = 7; // ثوانٍ متواصلة لتأكيد "ممتلئ" أو "فارغ"
int waterLevel = 2;               // 0 = فارغ، 1 = ممتلئ، 2 = جارٍ التأكد (لم يُحسم بعد)
int waterCount = 0;               // عدد الثواني المتواصلة على القراءة الحالية
int waterLast = -1;               // آخر قراءة خام

volatile unsigned long pulses = 0;
volatile unsigned long lastPulseUs = 0;
unsigned long totalPulses = 0, lastReport = 0;

void IRAM_ATTR onPulse() {
  unsigned long now = micros();
  if (now - lastPulseUs >= DEBOUNCE_US) { pulses++; lastPulseUs = now; }
}

void handleCommands() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c != '\n') { if (c != '\r' && cmdBuf.length() < 20) cmdBuf += c; continue; }
    cmdBuf.trim(); cmdBuf.toUpperCase();
    if (cmdBuf == "PUMP ON") {
      if (REQUIRE_WATER && waterLevel != 1) setPump(false, "blocked_no_water");
      else setPump(true, "manual_on");
    } else if (cmdBuf == "PUMP OFF") { pumpTest = false; pumpForce = false; setPump(false, "manual_off"); }
    else if (cmdBuf == "PUMP FORCE") { pumpForce = true; setPump(true, "manual_force"); }  // يدوي: يتجاوز حساس الماء
    else if (cmdBuf == "PUMP TEST") { pumpTest = true; setPump(true, "test_3s"); }  // اختبار 3 ثوانٍ فقط
    cmdBuf = "";
  }
}

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
  lastReport = millis();
  Serial.println("\n# farm sensors ready");
}

void loop() {
  unsigned long now = millis();
  handleCommands();
  // حمايات المضخة
  if (pumpOn && pumpTest && now - pumpStart >= PUMP_TEST_MS) { pumpTest = false; setPump(false, "test_done"); }
  if (pumpOn && !pumpTest && !pumpForce && REQUIRE_WATER && waterLevel == 0) setPump(false, "stopped_empty");
  if (pumpOn && now - pumpStart >= PUMP_MAX_MS) { pumpForce = false; setPump(false, "stopped_max_time"); }
  if (now - lastReport < 1000) return;

  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(A0); delay(3); }
  int raw = sum / 10;
  int pct = constrain(map(raw, RAW_DRY, RAW_WET, 0, 100), 0, 100);

  digitalWrite(PIN_WATER_PWR, HIGH);   // تغذية حساس الماء لحظة القراءة
  delay(30);
  int water = digitalRead(PIN_WATER_S);
  digitalWrite(PIN_WATER_PWR, LOW);

  // تأكيد الحالة: لا تتغير إلا بعد WATER_CONFIRM_S ثوانٍ متواصلة على نفس القراءة
  if (water == waterLast) { if (waterCount < 1000) waterCount++; }
  else { waterLast = water; waterCount = 1; }
  if (waterCount >= WATER_CONFIRM_S) waterLevel = water;   // 1 ممتلئ / 0 فارغ

  now = millis();
  noInterrupts(); unsigned long p = pulses; pulses = 0; interrupts();
  float hz = p * 1000.0 / (now - lastReport);
  lastReport = now;
  totalPulses += p;

  Serial.printf("{\"pulses\":%lu,\"total\":%lu,\"hz\":%.2f,\"kmh\":%.1f,\"wpin\":%d,"
                "\"raw\":%d,\"pct\":%d,\"dig\":%d,\"water\":%d,\"level\":%d,\"wcount\":%d,\"wconfirm\":%d,\"pump\":%d,\"pmsg\":\"%s\",\"up\":%lu,\"rst\":\"%s\"}\n",
                p, totalPulses, hz, hz * KMH_PER_HZ, digitalRead(PIN_WIND),
                raw, pct, digitalRead(PIN_SOIL_D), water, waterLevel, waterCount, WATER_CONFIRM_S, pumpOn ? 1 : 0, pumpMsg.c_str(),
                millis() / 1000, ESP.getResetReason().c_str());
}

/*
 * اختبار حساس رطوبة التربة (4 أسلاك) - ESP8266
 *
 * التوصيل:  VCC -> 3V3   GND -> GND   A -> A0   D -> D6 (GPIO12، اختياري)
 *
 * Serial 115200. يطبع كل ثانية:  raw=<0-1023> pct=<0-100> dig=<0/1> min=.. max=..
 * المعايرة: ضع الحساس في الهواء (جاف) وسجّل raw، ثم في الماء (مبلل) وسجّل raw،
 * ثم ضع القيمتين في RAW_DRY و RAW_WET.
 */

const uint8_t PIN_DIG = 12;   // D6
const int RAW_DRY = 1024;     // قراءة الجفاف (قيمة مبدئية)
const int RAW_WET = 350;      // قراءة التبلل (قيمة مبدئية)

int rawMin = 1024, rawMax = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_DIG, INPUT);
  Serial.println();
  Serial.println("# soil test ready (A0, D6)");
}

void loop() {
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(A0); delay(5); }
  int raw = sum / 10;
  if (raw < rawMin) rawMin = raw;
  if (raw > rawMax) rawMax = raw;
  int pct = constrain(map(raw, RAW_DRY, RAW_WET, 0, 100), 0, 100);

  Serial.printf("raw=%d pct=%d dig=%d min=%d max=%d\n",
                raw, pct, digitalRead(PIN_DIG), rawMin, rawMax);
  delay(950);
}

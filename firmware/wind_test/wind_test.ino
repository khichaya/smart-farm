/*
 * اختبار حساس الرياح (نبضي بسلكين) - ESP8266
 *
 * التوصيل:  سلك الحساس 1 -> D5 (GPIO14)
 *           سلك الحساس 2 -> GND
 *
 * افتح Serial Monitor على سرعة 115200.
 * حرّك الأكواب بيدك: يجب أن يزيد عدّاد النبضات.
 */

const uint8_t PIN_WIND = 14;            // D5
const float KMH_PER_HZ = 2.4;           // تقريبي - يحتاج معايرة حسب حساسك
const unsigned long DEBOUNCE_US = 5000; // تجاهل الارتداد الميكانيكي (5 ms)

volatile unsigned long pulses = 0;
volatile unsigned long lastPulseUs = 0;
unsigned long totalPulses = 0;
unsigned long lastReport = 0;

void IRAM_ATTR onPulse() {
  unsigned long now = micros();
  if (now - lastPulseUs >= DEBOUNCE_US) {
    pulses++;
    lastPulseUs = now;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_WIND, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_WIND), onPulse, FALLING);
  lastReport = millis();
  Serial.println();
  Serial.println("# wind test ready (D5 / GPIO14)");
}

void loop() {
  unsigned long now = millis();
  if (now - lastReport >= 1000) {
    noInterrupts();
    unsigned long p = pulses;
    pulses = 0;
    interrupts();

    float hz = p * 1000.0 / (now - lastReport);
    totalPulses += p;
    lastReport = now;

    Serial.printf("pin=%d pulses/s=%lu total=%lu hz=%.2f wind=%.1f km/h\n",
                  digitalRead(PIN_WIND), p, totalPulses, hz, hz * KMH_PER_HZ);
  }
}

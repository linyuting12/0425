const int potPin = A0;  // 可調電阻接在 A0 腳位

void setup() {
  Serial.begin(9600);  // 初始化序列通訊
}

void loop() {
  int potValue = analogRead(potPin);
  int ampPercent = map(potValue, 0, 1023, 0, 100);
  Serial.println(ampPercent);
  delay(50);
}
/*
  Smart Pill Dispenser — ESP32-S3 Firmware v3.0
  Architecture: Dashboard Mastermind
  Hardware: 5-compartment wheel (1 dispense slot, 4 medicine slots)
  
  Slot Map:
    Position 0 = Dispense opening (empty, always aligned at start)
    Position 1-4 = Medicine slots (each 45° apart)
  
  Commands received via MQTT (dispenser/command):
    "start_cycle"   — Begin operation, show clock
    "dispense:N"    — Rotate to slot N and dispense
    "lcd:L1|L2"     — Display custom text on LCD

  Messages published via MQTT (dispenser/status):
    "online"        — Heartbeat every 5s
    "offline"       — LWT on disconnect
    "taken:N"       — Patient pressed button for slot N
    "missed:N"      — No button press after 5 minutes for slot N
    "ack_wait:N"    — Waiting for button confirmation for slot N
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>
#include "time.h"

// ─── WiFi & MQTT ─────────────────────────────────────────────────────
const char* ssid          = "Jaydon";
const char* password      = "jaydonjp";
const char* mqtt_server   = "10.109.92.177";

// ─── Hardware Pins ───────────────────────────────────────────────────
LiquidCrystal lcd(4, 5, 6, 7, 15, 16);
Servo servo;
const int servoPin   = 17;
const int buttonPin  = 18;
const int ledPin     = 19;
const int buzzerPin  = 21;

// ─── Slot / Servo Config ─────────────────────────────────────────────
// 5 compartments = 45° per step
// Slot 0 is the dispense opening. Slots 1-4 hold medicines.
// To dispense slot N, we rotate N * 45° from home position.
const int TOTAL_SLOTS     = 5;
const int DEG_PER_SLOT    = 45;
int currentPosition       = 0; // Which physical slot is at dispense opening (0 = empty)

// ─── Acknowledgment State ─────────────────────────────────────────────
bool waitingForAck        = false;
int  ackSlot              = -1;
int  ackDosage            = 1;
unsigned long dispenseTime = 0;
const unsigned long MISSED_TIMEOUT = 300000UL; // 5 minutes
const unsigned long ALERT_INTERVAL = 10000UL;  // 10 seconds
unsigned long lastAlertTime = 0;

// ─── System State ─────────────────────────────────────────────────────
bool cycleStarted         = false;
bool showingCustomMessage = false;
bool startDemoTriggered   = false;
unsigned long customMsgTime = 0;
String nextDoseStr = "--:--";

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// ─── Helpers ──────────────────────────────────────────────────────────
void buzz(int times, int ms = 100) {
  for (int i = 0; i < times; i++) {
    digitalWrite(buzzerPin, HIGH);
    digitalWrite(ledPin, HIGH);
    delay(ms);
    digitalWrite(buzzerPin, LOW);
    digitalWrite(ledPin, LOW);
    delay(ms);
  }
}

void moveServoToSlot(int targetSlot) {
  int targetAngle = targetSlot * DEG_PER_SLOT;
  int currentAngle = currentPosition * DEG_PER_SLOT;
  
  // MG90S is mechanically limited to 180 degrees. 
  // Sending values > 200 causes the servo library to send microsecond pulses, causing violent jitter.
  if (targetAngle > 180) {
    Serial.println("Warning: Target angle exceeds MG90S 180-degree physical limit! Stopping at 180.");
    targetAngle = 180;
  }
  if (currentAngle > 180) currentAngle = 180;

  // Since a standard servo cannot spin infinitely clockwise, it must sweep backwards to return to lower slots
  if (targetAngle > currentAngle) {
    for (int a = currentAngle; a <= targetAngle; a++) {
      servo.write(a);
      delay(15); // Slightly slower, smoother sweep
      yield();
    }
  } else {
    for (int a = currentAngle; a >= targetAngle; a--) {
      servo.write(a);
      delay(15);
      yield();
    }
  }
  
  currentPosition = targetSlot;
}

// ─── WiFi Setup ───────────────────────────────────────────────────────
void setup_wifi() {
  lcd.clear();
  lcd.print("Connecting WiFi");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  lcd.clear();
  lcd.print("WiFi Connected!");
  delay(1000);
}

// ─── MQTT Callback ────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT RX] " + String(topic) + ": " + msg);

  if (String(topic) != "dispenser/command") return;

  // start_cycle — wake up the system
  if (msg == "start_cycle") {
    cycleStarted = true;
    lcd.clear();
    Serial.println("Cycle started by Dashboard.");
    mqttClient.publish("dispenser/status", "Cycle Started");
  }

  // start_demo — trigger demo mode
  else if (msg == "start_demo") {
    startDemoTriggered = true;
  }

  // dispense:N:D — rotate to slot N and trigger dispense with dosage D
  else if (msg.startsWith("dispense:")) {
    int firstColon = msg.indexOf(':');
    int secondColon = msg.indexOf(':', firstColon + 1);
    
    int slot = -1;
    int dosage = 1;
    if (secondColon != -1) {
      slot = msg.substring(firstColon + 1, secondColon).toInt();
      dosage = msg.substring(secondColon + 1).toInt();
    } else {
      slot = msg.substring(firstColon + 1).toInt();
    }

    if (slot < 1 || slot > 4) return;

    Serial.println("Dispensing slot " + String(slot) + " dosage " + String(dosage));
    moveServoToSlot(slot);
    
    // Alert the patient
    buzz(3);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Take " + String(dosage) + " Pill(s)!");
    lcd.setCursor(0, 1);
    lcd.print("Slot " + String(slot) + " - Press btn");
    
    // Start acknowledgment tracking
    waitingForAck = true;
    ackSlot = slot;
    ackDosage = dosage;
    dispenseTime = millis();
    lastAlertTime = millis();
    
    // Notify dashboard we are waiting
    String ackMsg = "ack_wait:" + String(slot);
    mqttClient.publish("dispenser/status", ackMsg.c_str());
  }

  // lcd:Line1|Line2 — show custom message
  else if (msg.startsWith("lcd:")) {
    String content = msg.substring(4);
    int sep = content.indexOf('|');
    lcd.clear();
    lcd.setCursor(0, 0); lcd.print(sep != -1 ? content.substring(0, sep) : content);
    lcd.setCursor(0, 1); if (sep != -1) lcd.print(content.substring(sep + 1));
    showingCustomMessage = true;
    customMsgTime = millis();
  }

  // next_dose:HH:MM — update the next dose string
  else if (msg.startsWith("next_dose:")) {
    nextDoseStr = msg.substring(10);
  }
}

// ─── MQTT Reconnect ───────────────────────────────────────────────────
void mqttReconnect() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = "Dispenser-" + String(random(0xffff), HEX);
    // LWT: publish "offline" if we disconnect unexpectedly
    if (mqttClient.connect(clientId.c_str(), "dispenser/status", 0, true, "offline")) {
      Serial.println("connected!");
      mqttClient.publish("dispenser/status", "online");
      mqttClient.subscribe("dispenser/command");
    } else {
      Serial.println("failed, rc=" + String(mqttClient.state()) + " retrying in 5s");
      delay(5000);
    }
  }
}

// ─── Setup ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin,    OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(ledPin,    LOW);
  digitalWrite(buzzerPin, LOW);

  // Initializing with specific min/max pulse widths often eliminates MG90S jitter natively
  servo.attach(servoPin, 500, 2400);
  servo.write(0); // Home position
  delay(500);     // Allow it to reach home

  lcd.begin(16, 2);
  setup_wifi();
  
  // Configure Time (IST is UTC+5:30)
  // POSIX TZ format: IST-5:30 means +5:30 from UTC
  lcd.clear();
  lcd.print("Syncing Time...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov"); 
  setenv("TZ", "IST-5:30", 1);
  tzset();

  // Wait for time to sync (max 10s)
  struct tm timeinfo;
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  lcd.clear();
  if (retry < 20) lcd.print("Time Synced!");
  else lcd.print("Time Sync Fail");
  delay(1000);

  mqttClient.setServer(mqtt_server, 1883);
  mqttClient.setCallback(mqttCallback);
  
  Serial.println("System Ready. Waiting for Dashboard start_cycle command.");
}

// ─── Loop ─────────────────────────────────────────────────────────────
void loop() {
  if (!mqttClient.connected()) mqttReconnect();
  mqttClient.loop();

  // Heartbeat every 5 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
    mqttClient.publish("dispenser/status", "online");
  }

  // ── Acknowledgment mode ─────────────────────────────────────────────
  if (waitingForAck) {
    // Button pressed → dose confirmed!
    if (digitalRead(buttonPin) == LOW) {
      waitingForAck = false;
      String takenMsg = "taken:" + String(ackSlot);
      mqttClient.publish("dispenser/status", takenMsg.c_str());
      Serial.println("Dose confirmed for slot " + String(ackSlot));
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("  Dose Taken!  ");
      buzz(1, 50); // One short happy beep
      delay(2000);
      lcd.clear();
      moveServoToSlot(0);
      return;
    }
    
    // 5 minutes elapsed → missed dose
    if (millis() - dispenseTime >= MISSED_TIMEOUT) {
      waitingForAck = false;
      String missedMsg = "missed:" + String(ackSlot);
      mqttClient.publish("dispenser/status", missedMsg.c_str());
      Serial.println("Dose MISSED for slot " + String(ackSlot));
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("  Dose Missed  ");
      delay(2000);
      lcd.clear();
      moveServoToSlot(0);
      return;
    }

    // Progressive alarm interval logic
    unsigned long elapsed = millis() - dispenseTime;
    unsigned long interval = 10000; // 0-2 mins: every 10s
    if (elapsed > 240000) interval = 2000;      // 4-5 mins: every 2s
    else if (elapsed > 120000) interval = 5000; // 2-4 mins: every 5s

    // Alert every interval while waiting
    if (millis() - lastAlertTime >= interval) {
      lastAlertTime = millis();
      buzz(interval == 2000 ? 5 : (interval == 5000 ? 3 : 2), 100); // Faster = more beeps
      // Refresh the LCD reminder
      lcd.setCursor(0, 0);
      lcd.print("Take " + String(ackDosage) + " Pill(s)!   ");
      lcd.setCursor(0, 1);
      lcd.print("Press button!   ");
    }
    
    return; // Don't do anything else while awaiting ack
  }

  // ── Demo Mode Execution ─────────────────────────────────────────────
  if (startDemoTriggered) {
    startDemoTriggered = false; // Reset flag
    Serial.println("Demo Mode Triggered!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("   DEMO MODE    ");
    buzz(2, 100);

    // Reset to 0
    moveServoToSlot(0);
    delay(1000);

    for (int i = 1; i <= 4; i++) {
      // Wait 5 seconds before turning
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(" Demo: Waiting  ");
      lcd.setCursor(0, 1);
      lcd.print("   5 Seconds    ");
      
      unsigned long startWait = millis();
      while (millis() - startWait < 5000) {
        if (!mqttClient.connected()) mqttReconnect();
        mqttClient.loop();
        delay(10);
      }
      
      // Turn and wait for button
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Demo: Slot " + String(i));
      lcd.setCursor(0, 1);
      lcd.print(" Press Button!  ");
      
      moveServoToSlot(i);
      buzz(3, 100); // 3 beeps to signal taking medicine
      
      // Wait for button press, simulate emergency timeout
      unsigned long demoWaitStart = millis();
      unsigned long lastDemoBeep = millis();
      int beepCount = 0;
      bool alertSent = false;
      
      while (digitalRead(buttonPin) == HIGH) {
        if (!mqttClient.connected()) mqttReconnect();
        mqttClient.loop();
        
        // Every 3 seconds, fire a beep
        if (millis() - lastDemoBeep >= 3000 && beepCount < 2) {
          lastDemoBeep = millis();
          buzz(1, 100);
          beepCount++;
        }
        
        // If we fired 2 beeps and they still didn't press, send the emergency notification
        if (beepCount == 2 && !alertSent) {
          String missedMsg = "missed:" + String(i);
          mqttClient.publish("dispenser/status", missedMsg.c_str());
          Serial.println("Demo timeout: Sent emergency missed alert for slot " + String(i));
          
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print(" Emergency Sent ");
          delay(1000);
          
          alertSent = true;
          // We can break here to move onto the next demo slot immediately
          break;
        }
        
        delay(10);
      }
      
      if (!alertSent) {
        // Button pressed on time
        buzz(1, 50);
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("  Dose Taken!  ");
        delay(2000);
      }
    }
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" Demo Complete! ");
    delay(2000);
    lcd.clear();
    moveServoToSlot(0); // Return home
  }

  // ── Custom LCD message timeout ──────────────────────────────────────
  if (showingCustomMessage && (millis() - customMsgTime > 8000)) {
    showingCustomMessage = false;
    lcd.clear();
  }

  // ── Standard LCD display ────────────────────────────────────────────
  if (!showingCustomMessage) {
    struct tm timeinfo;
    if (!cycleStarted) {
      lcd.setCursor(0, 0);
      lcd.print("Waiting for Dash");
      if (getLocalTime(&timeinfo, 10)) {
        lcd.setCursor(0, 1);
        lcd.printf("%02d:%02d:%02d        ", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
      }
    } else {
      if (getLocalTime(&timeinfo, 10)) {
        lcd.setCursor(0, 0);
        lcd.print("Next Dose: " + nextDoseStr + "  ");
        lcd.setCursor(0, 1);
        lcd.printf("%02d:%02d:%02d        ", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
      } else {
        lcd.setCursor(0, 0);
        lcd.print("Syncing Time... ");
      }
    }
  }
}

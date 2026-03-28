// ═══════════════════════════════════════════════════════════════════════
//  MediSync — Smart Pill Dispenser Firmware
//  ESP32-S3-WROOM-1 + DS3231 RTC + 16x2 LCD + SG90 Servo
//  Communication: MQTT (JSON payloads via ArduinoJson)
// ═══════════════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>
#include "time.h"

// ─── Configuration ──────────────────────────────────────────────────
const char* ssid       = "danu";
const char* password   = "1234b4321";
const char* mqttServer = "broker.hivemq.com";   // Public broker for dev
const int   mqttPort   = 1883;
const char* mqttClientId = "medisync-esp32";

// MQTT Topics (must match web dashboard)
const char* TOPIC_COMMAND   = "medisync/command";
const char* TOPIC_STATUS    = "medisync/status";
const char* TOPIC_LOG       = "medisync/log";
const char* TOPIC_HEARTBEAT = "medisync/heartbeat";

// ─── Pin Configuration ──────────────────────────────────────────────
LiquidCrystal lcd(4, 5, 6, 7, 15, 16);

Servo servo;
int servoPin   = 17;
int buttonPin  = 18;
int ledPin     = 19;
int buzzerPin  = 21;

// ─── State ──────────────────────────────────────────────────────────
int    angle          = 0;
int    angleIncrement = 45;
int    slotCount      = 0;
bool   refillMode     = false;
bool   safetyLocked   = true;

// Schedule storage (4 slots max)
struct PillSchedule {
  char  name[20];
  char  time[6];       // HH:MM
  char  frequency[15];
  bool  enabled;
  int   pillsRemaining;
  int   pillsTotal;
};

PillSchedule schedules[4];
int scheduleCount = 0;

unsigned long lastHeartbeat = 0;
unsigned long lastMove      = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;   // 5 seconds
const unsigned long DISPENSE_INTERVAL  = 20000;  // 20 seconds (demo)

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// ─── Forward Declarations ───────────────────────────────────────────
void alertUser();
void moveServo(int targetAngle);
void handleMqttMessage(char* topic, byte* payload, unsigned int length);
void publishStatus();
void publishLog(int slotIndex, const char* status);
void handleDispenseCommand(JsonDocument& doc);
void handleScheduleSync(JsonDocument& doc);
void handleLcdMessage(JsonDocument& doc);
void handleSafetyLock(JsonDocument& doc);
void reconnectMqtt();

// ═══════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);

  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin,    OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  digitalWrite(ledPin,    LOW);
  digitalWrite(buzzerPin, LOW);

  servo.attach(servoPin);
  servo.write(angle);

  lcd.begin(16, 2);
  lcd.print("Connecting WiFi");

  // ─── WiFi ──────────────
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  // ─── NTP Time ──────────
  configTime(19800, 0, "pool.ntp.org");   // IST offset

  // ─── MQTT ──────────────
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(handleMqttMessage);
  mqttClient.setBufferSize(1024);

  lcd.clear();
  lcd.print("MediSync Ready");

  // Initialize default schedules
  for (int i = 0; i < 4; i++) {
    strcpy(schedules[i].name, "Empty");
    strcpy(schedules[i].time, "00:00");
    strcpy(schedules[i].frequency, "daily");
    schedules[i].enabled        = false;
    schedules[i].pillsRemaining = 0;
    schedules[i].pillsTotal     = 30;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════
void loop() {
  // Ensure MQTT connection
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  // ─── Heartbeat ─────────
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    publishStatus();
  }

  // ─── Refill Mode ───────
  if (refillMode) {
    lcd.setCursor(0, 0);
    lcd.print("REFILL BOX      ");
    lcd.setCursor(0, 1);
    lcd.print("Press Button    ");

    if (digitalRead(buttonPin) == LOW) {
      slotCount  = 0;
      refillMode = false;
      moveServo(0);
      lcd.clear();
      delay(1000);
    }
    return;
  }

  // ─── Display Time ──────
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    lcd.setCursor(0, 0);
    lcd.printf("%02d/%02d/%04d    ",
               timeinfo.tm_mday,
               timeinfo.tm_mon + 1,
               timeinfo.tm_year + 1900);
    lcd.setCursor(0, 1);
    lcd.printf("%02d:%02d:%02d  ",
               timeinfo.tm_hour,
               timeinfo.tm_min,
               timeinfo.tm_sec);
  }

  // ─── Scheduled Dispense (Demo: time-based) ──────
  if (millis() - lastMove > DISPENSE_INTERVAL) {
    lastMove = millis();

    if (slotCount < 4) {
      int newAngle = angle + angleIncrement;
      moveServo(newAngle);
      alertUser();
      publishLog(slotCount, "success");
      slotCount++;
    }

    if (slotCount == 4) {
      refillMode = true;
    }
  }

  // ─── Button Manual Override ──────
  if (digitalRead(buttonPin) == LOW) {
    delay(200);   // Debounce
    if (digitalRead(buttonPin) == LOW && slotCount < 4) {
      int newAngle = angle + angleIncrement;
      moveServo(newAngle);
      publishLog(slotCount, "manual");
      slotCount++;

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Manual Dispense");
      delay(1500);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  MQTT CALLBACK — Handles incoming commands from the web dashboard
// ═══════════════════════════════════════════════════════════════════════
void handleMqttMessage(char* topic, byte* payload, unsigned int length) {
  // Parse JSON
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  const char* action = doc["action"];
  if (!action) return;

  Serial.printf("[MQTT RX] action=%s\n", action);

  if (strcmp(action, "dispense") == 0) {
    handleDispenseCommand(doc);
  }
  else if (strcmp(action, "schedule_sync") == 0) {
    handleScheduleSync(doc);
  }
  else if (strcmp(action, "lcd_message") == 0) {
    handleLcdMessage(doc);
  }
  else if (strcmp(action, "safety_lock") == 0) {
    handleSafetyLock(doc);
  }
  else if (strcmp(action, "status_request") == 0) {
    publishStatus();
  }
}

// ─── Command Handlers ───────────────────────────────────────────────
void handleDispenseCommand(JsonDocument& doc) {
  int slot = doc["slot"] | 0;
  const char* priority = doc["priority"] | "normal";

  if (strcmp(priority, "emergency") == 0) {
    // Emergency: bypass safety, immediate dispense
    Serial.printf("[EMERGENCY] Dispensing slot %d\n", slot);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("!! EMERGENCY !!");
    lcd.setCursor(0, 1);
    lcd.printf("Slot %d Ejected", slot + 1);

    int targetAngle = (slot + 1) * angleIncrement;
    moveServo(targetAngle);
    alertUser();
    publishLog(slot, "emergency");
  }
  else {
    // Normal scheduled dispense
    if (slot < 4 && schedules[slot].enabled) {
      int targetAngle = (slot + 1) * angleIncrement;
      moveServo(targetAngle);
      alertUser();
      publishLog(slot, "success");
    }
  }
}

void handleScheduleSync(JsonDocument& doc) {
  JsonArray slots = doc["slots"].as<JsonArray>();
  scheduleCount = 0;

  for (JsonObject slotObj : slots) {
    int idx = slotObj["index"] | 0;
    if (idx >= 0 && idx < 4) {
      strlcpy(schedules[idx].name,      slotObj["name"] | "Empty",  sizeof(schedules[idx].name));
      strlcpy(schedules[idx].time,      slotObj["time"] | "00:00",  sizeof(schedules[idx].time));
      strlcpy(schedules[idx].frequency, slotObj["frequency"] | "daily", sizeof(schedules[idx].frequency));
      schedules[idx].enabled = slotObj["enabled"] | false;
      scheduleCount++;
    }
  }

  Serial.printf("[SYNC] Received %d schedules\n", scheduleCount);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Schedule Synced");
  lcd.setCursor(0, 1);
  lcd.printf("%d slots loaded", scheduleCount);
  delay(1500);
}

void handleLcdMessage(JsonDocument& doc) {
  const char* line1 = doc["line1"] | "";
  const char* line2 = doc["line2"] | "";

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);

  Serial.printf("[LCD] L1='%s' L2='%s'\n", line1, line2);
}

void handleSafetyLock(JsonDocument& doc) {
  safetyLocked = doc["locked"] | true;
  Serial.printf("[SAFETY] Lock = %s\n", safetyLocked ? "ON" : "OFF");
}

// ─── Publish Functions ──────────────────────────────────────────────
void publishStatus() {
  JsonDocument doc;
  doc["online"]          = true;
  doc["lastHeartbeat"]   = millis();
  doc["refillMode"]      = refillMode;
  doc["wifiRssi"]        = WiFi.RSSI();
  doc["firmwareVersion"] = "2.1.3";
  doc["slotCount"]       = slotCount;
  doc["safetyLocked"]    = safetyLocked;

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeBuf[25];
    strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
    doc["currentTime"] = timeBuf;
  }

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer);
}

void publishLog(int slotIndex, const char* status) {
  JsonDocument doc;
  doc["slotIndex"] = slotIndex;
  doc["slotName"]  = schedules[slotIndex].name;
  doc["status"]    = status;

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeBuf[25];
    strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
    doc["timestamp"] = timeBuf;
  }

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_LOG, buffer);
}

// ═══════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════
void alertUser() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Take Medicine!");

  for (int i = 0; i < 4; i++) {
    digitalWrite(ledPin,    HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(200);
    digitalWrite(ledPin,    LOW);
    digitalWrite(buzzerPin, LOW);
    delay(200);
  }
}

void moveServo(int targetAngle) {
  while (angle < targetAngle) {
    angle++;
    servo.write(angle);
    delay(20);
  }
  while (angle > targetAngle) {
    angle--;
    servo.write(angle);
    delay(20);
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT connecting...");
    if (mqttClient.connect(mqttClientId)) {
      Serial.println("connected!");
      mqttClient.subscribe(TOPIC_COMMAND);
      publishStatus();
    } else {
      Serial.printf("failed, rc=%d  retrying in 3s\n", mqttClient.state());
      delay(3000);
    }
  }
}

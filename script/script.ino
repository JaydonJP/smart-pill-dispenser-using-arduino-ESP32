#include <WiFi.h>
#include <PubSubClient.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>
#include "time.h"

// --- WiFi & MQTT Configuration ---
const char* ssid = "Jaydon";          // Your Wi-Fi network name
const char* password = "jaydonjp";  // Your Wi-Fi password
const char* mqtt_server = "10.91.140.177";   // Your laptop IP

WiFiClient espClient;
PubSubClient client(espClient);

// --- Hardware Pins ---
LiquidCrystal lcd(4, 5, 6, 7, 15, 16);
Servo servo;
int servoPin = 17;
int buttonPin = 18;
int ledPin = 19;
int buzzerPin = 21;

// --- Dispenser State ---
int angle = 0;
int angleIncrement = 45;
int slotCount = 0;
unsigned long lastMove = 0;
bool refillMode = false;
unsigned long rotationInterval = 20000; // 20 seconds for testing

void alertUser() {
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Take Medicine!");

  for(int i=0; i<4; i++) {
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(200);
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
    delay(200);
  }
}

void moveServo(int targetAngle) {
  while(angle < targetAngle) {
    angle++;
    servo.write(angle);
    delay(20);
  }
  while(angle > targetAngle) {
    angle--;
    servo.write(angle);
    delay(20);
  }
}

void setup_wifi() {
  lcd.clear();
  lcd.print("Connecting WiFi");
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  lcd.clear();
  lcd.print("WiFi Connected!");
  delay(1000);
}

// Triggers when the ESP32 receives an MQTT message from the laptop/dashboard
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("MQTT Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(message);

  // If the dashboard sends a "dispense" command
  if (String(topic) == "dispenser/command") {
    if (message == "dispense" && !refillMode) {
      Serial.println("Manual dispense triggered via MQTT!");
      lastMove = millis() - rotationInterval; // Force immediate dispense
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "SmartDispenser-";
    clientId += String(random(0, 0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected to MQTT broker!");
      client.publish("dispenser/status", "Dispenser Online");
      
      // Subscribe to listen for commands from the dashboard
      client.subscribe("dispenser/command");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  digitalWrite(ledPin, LOW);
  digitalWrite(buzzerPin, LOW);

  servo.attach(servoPin);
  servo.write(angle);

  lcd.begin(16,2);

  setup_wifi();
  
  // Set time zone (19800 seconds = +5:30 IST)
  configTime(19800, 0, "pool.ntp.org"); 

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); // Keeps MQTT connection alive and checks for new messages

  // --- Handling Refill state ---
  if(refillMode) {
    lcd.setCursor(0,0);
    lcd.print("REFILL BOX      ");
    lcd.setCursor(0,1);
    lcd.print("Press Button    ");

    if(digitalRead(buttonPin) == LOW) {
      slotCount = 0;
      refillMode = false;
      moveServo(0);
      lcd.clear();
      
      // Notify the dashboard we just refilled!
      client.publish("dispenser/status", "Refilled securely");
      Serial.println("Box refilled! Resetting count.");
      delay(1000);
    }
    return;
  }

  // --- Display Time ---
  struct tm timeinfo;
  if(getLocalTime(&timeinfo)) {
    lcd.setCursor(0,0);
    lcd.printf("%02d/%02d/%04d    ", timeinfo.tm_mday, timeinfo.tm_mon+1, timeinfo.tm_year+1900);
    lcd.setCursor(0,1);
    lcd.printf("%02d:%02d:%02d  ", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  }

  // --- Interval Dispensing Logic ---
  if(millis() - lastMove > rotationInterval) {
    lastMove = millis();

    if(slotCount < 4) {
      int newAngle = angle + angleIncrement;
      moveServo(newAngle);
      alertUser();
      slotCount++;
      
      String statusMsg = "Dose " + String(slotCount) + " dispensed.";
      Serial.println(statusMsg);
      
      // Notify the dashboard a pill was taken
      client.publish("dispenser/status", statusMsg.c_str());
    }

    if(slotCount == 4) {
      refillMode = true;
      Serial.println("All 4 doses done. Please refill.");
      
      // Notify dashboard it's empty
      client.publish("dispenser/status", "Empty - Needs Refill");
    }
  }
}

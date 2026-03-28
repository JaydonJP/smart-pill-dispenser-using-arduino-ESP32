#include <WiFi.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>
#include "time.h"

const char* ssid = "danu";
const char* password = "1234b4321";

LiquidCrystal lcd(4,5,6,7,15,16);

Servo servo;

int servoPin = 17;
int buttonPin = 18;
int ledPin = 19;
int buzzerPin = 21;

int angle = 0;
int angleIncrement = 45;

int slotCount = 0;
unsigned long lastMove = 0;

bool refillMode = false;

// User-defined rotation interval in milliseconds
// Default is 20 seconds; change via Serial Monitor at runtime
unsigned long rotationInterval = 20000;

// Flag to track if interval has been set by user
bool intervalSet = false;

void alertUser()
{
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Take Medicine!");

  for(int i=0;i<4;i++)
  {
    digitalWrite(ledPin,HIGH);
    digitalWrite(buzzerPin,HIGH);
    delay(200);

    digitalWrite(ledPin,LOW);
    digitalWrite(buzzerPin,LOW);
    delay(200);
  }
}

void moveServo(int targetAngle)
{
  while(angle < targetAngle)
  {
    angle++;
    servo.write(angle);
    delay(20);
  }

  while(angle > targetAngle)
  {
    angle--;
    servo.write(angle);
    delay(20);
  }
}

void setup()
{
  Serial.begin(115200);
  
  // Wait up to 3 seconds for Serial Monitor to connect (useful for ESP32-S3/C3)
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 3000);
  
  Serial.println("\n\n========================================");
  Serial.println("  Smart Pill Dispenser - Interval Mode");
  Serial.println("========================================");
  Serial.println("Enter rotation interval in seconds");
  Serial.println("(e.g. type 20 and press Enter):");
  Serial.println("Current Default: 20 seconds");
  Serial.println("========================================");

  // Set a shorter timeout for Serial.readStringUntil()
  Serial.setTimeout(50);

  pinMode(buttonPin,INPUT_PULLUP);
  pinMode(ledPin,OUTPUT);
  pinMode(buzzerPin,OUTPUT);

  digitalWrite(ledPin,LOW);
  digitalWrite(buzzerPin,LOW);

  servo.attach(servoPin);
  servo.write(angle);

  lcd.begin(16,2);
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid,password);
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  while(WiFi.status()!=WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  configTime(19800,0,"pool.ntp.org");
  lcd.clear();
}

unsigned long lastSerialHeartbeat = 0;

void loop()
{
  // Periodic "Alive" check every 5 seconds so user knows it's running
  if (millis() - lastSerialHeartbeat > 5000) {
    lastSerialHeartbeat = millis();
    Serial.print("[System Alive] Current Interval: ");
    Serial.print(rotationInterval / 1000);
    Serial.println("s");
  }

  // Check if user sent a new interval via Serial Monitor
  if(Serial.available() > 0)
  {
    String input = Serial.readString(); // Read whatever is available
    input.trim();

    if (input.length() > 0) {
      int newInterval = input.toInt();

      if(newInterval > 0)
      {
        rotationInterval = (unsigned long)newInterval * 1000;
        intervalSet = true;

        Serial.println("----------------------------------------");
        Serial.print(">>> UPDATED: Interval is now ");
        Serial.print(newInterval);
        Serial.println(" seconds.");
        Serial.println("----------------------------------------");

        lcd.clear();
        lcd.setCursor(0,0);
        lcd.print("Interval Set:");
        lcd.setCursor(0,1);
        lcd.print(String(newInterval) + " seconds");
        delay(2000);
        lcd.clear();

        // Reset dispensing state for fresh start
        slotCount = 0;
        refillMode = false;
        angle = 0;
        servo.write(angle);
        lastMove = millis();
      }
      else if (input != "")
      {
        Serial.println("Error: Please enter a valid number (e.g. 10)");
      }
    }
  }

  // Refill mode handling
  if(refillMode)
  {
    lcd.setCursor(0,0);
    lcd.print("REFILL BOX      ");

    lcd.setCursor(0,1);
    lcd.print("Press Button    ");

    if(digitalRead(buttonPin)==LOW)
    {
      slotCount = 0;
      refillMode = false;

      moveServo(0);

      lcd.clear();
      delay(1000);
    }

    return;
  }

  // Display current date and time on LCD
  struct tm timeinfo;

  if(getLocalTime(&timeinfo))
  {
    lcd.setCursor(0,0);
    lcd.printf("%02d/%02d/%04d    ",
    timeinfo.tm_mday,
    timeinfo.tm_mon+1,
    timeinfo.tm_year+1900);

    lcd.setCursor(0,1);
    lcd.printf("%02d:%02d:%02d  ",
    timeinfo.tm_hour,
    timeinfo.tm_min,
    timeinfo.tm_sec);
  }

  // Rotate servo at the user-defined interval
  if(millis() - lastMove > rotationInterval)
  {
    lastMove = millis();

    if(slotCount < 4)
    {
      int newAngle = angle + angleIncrement;

      moveServo(newAngle);

      alertUser();

      slotCount++;

      Serial.print("Dose ");
      Serial.print(slotCount);
      Serial.println(" dispensed.");
    }

    if(slotCount == 4)
    {
      refillMode = true;
      Serial.println("All 4 doses done. Please refill.");
    }
  }
}

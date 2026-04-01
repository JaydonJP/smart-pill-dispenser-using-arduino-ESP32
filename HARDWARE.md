# Smart Pill Dispenser Hardware Setup

This document outlines the hardware components, connections, and pin mappings for the Smart Pill Dispenser project based on the ESP32-S3 architecture.

## Microcontroller
- **Board:** ESP32-S3

## Peripherals & Pin Mappings

| Component | ESP32-S3 Pin | Notes |
| :--- | :--- | :--- |
| **Liquid Crystal Display (LCD)** | 4, 5, 6, 7, 15, 16 | 16x2 LCD display. Maps to: RS(4), EN(5), D4(6), D5(7), D6(15), D7(16). |
| **Servo Motor (MG90S)** | 17 | 180-degree physical limit. Controls the 5-compartment wheel. |
| **Confirmation Button** | 18 | Uses internal pull-up resistor (`INPUT_PULLUP`). Connects to GND. |
| **Status LED** | 19 | For visual notifications alongside the buzzer. |
| **Buzzer** | 21 | For audible alerts and alarms. |

## Mechanical Architecture
- **Compartments:** 5 total.
  - **Position 0:** Dispense opening (empty, always aligned at start).
  - **Positions 1-4:** Medicine slots.
- **Servo Actuation:** Each compartment is 45° apart. The motor uses standard 180° sweeping logic to rotate back and forth between positions instead of continuous rotation.
- **Power Considerations:** The MG90S servo requires stable power. To avoid brownouts on the ESP32, wire the servo's power (VCC) directly to an appropriate 5V source and share a common GND with the ESP32.

## Wiring Instructions
1. Connect the components to the ESP32-S3 following the pin mapping table above.
2. Ensure the **Push Button** bridges **Pin 18 and GND**. No external pull-up resistor is needed as the firmware uses `INPUT_PULLUP`.
3. Connect the **Buzzer** (Pin 21) and **LED** (Pin 19) to their respective pins and ground. Make sure to use an appropriate current-limiting resistor for the LED.
4. Hook up the **16x2 LCD**. The firmware uses a standard parallel 4-bit connection, not an I2C relay, so wire the data and control lines accordingly.
5. Connect the **Servo Motor's** signal pin to **Pin 17**.

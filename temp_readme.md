# Smart Pill Dispenser

## Project Overview
This project is a comprehensive smart pill dispenser system designed to help patients adhere to their medication schedules. It combines a physical Arduino-based dispensing unit with a web-based dashboard for remote monitoring and management.

## Features
- **Web Dashboard**: A modern, responsive interface for managing medications and schedules.
- **AI-Powered Prescription Parsing**: Utilizes Google Gemini Vision API to automatically extract medicine details from prescription images.
- **Real-time Sync**: Real-time updates between the physical device and the web dashboard via Supabase.
- **User Authentication**: Secure login system for patients and caregivers.
- **Schedule Management**: Create, edit, and delete medication schedules with custom timings and frequencies.
- **Device Monitoring**: Track the status of the physical dispenser, including battery level and connectivity.

## Tech Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **API Client**: Supabase JS Client

### Backend & Services
- **Database & Auth**: Supabase
- **AI Service**: Google Gemini Vision API
- **Hardware**: Arduino (ESP32)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm
- Arduino IDE (for hardware setup)
- Supabase Account
- Google AI Studio API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd smart-pill-dispenser-using-arduino-ESP32
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd web-dashboard
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the `web-dashboard` directory with the following variables:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GEMINI_API_KEY=your_gemini_api_key
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    The dashboard will be accessible at `http://localhost:5173`.

5. **Upload the /script/script.ino to the ESP32**
    ```bash
    arduino-cli upload -b esp32:esp32:esp32dev -p <port> <script_path>
    ```
    Or upload using the Arduino IDE.

## Usage

### Adding Medications
1.  Navigate to the **Medicines** tab.
2.  Click **Add Medicine**.
3.  You can either:
    - **Upload a Prescription**: Click the upload area, select a prescription image, and let the AI parse it.
    - **Manual Entry**: Fill in the medicine name, dosage, and frequency manually.
4.  Once added, the medicine will appear in your list.

### Managing Schedules
1.  Go to the **Schedules** tab.
2.  Click **Add Schedule**.
3.  Select the medicine, set the desired time(s), and choose the frequency (Daily, Twice Daily, Weekly).
4.  Click **Save**.

### Monitoring the Device
1.  Check the **Dashboard** tab for the real-time status of the physical dispenser.
2.  View battery level, connectivity status, and last sync time.

## Project Structure
```
web-dashboard/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── MedicineCard.tsx
│   │   ├── ScheduleCard.tsx
│   │   ├── PrescriptionUpload.tsx
│   │   └── ...
│   ├── lib/                # API clients and helpers
│   │   ├── supabase.ts
│   │   └── helpers.ts
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
└── .env                    # Environment variables (not in git)
```

## Hardware Setup
(Detailed hardware setup instructions would be in a separate `HARDWARE.md` or `docs/` folder)

## License
MIT

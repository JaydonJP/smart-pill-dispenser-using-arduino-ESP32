// ─── Core Domain Types ───────────────────────────────────────────────
export interface PillSlot {
    id: string;
    name: string;
    dosageTime: string;        // HH:MM format
    frequency: 'daily' | 'twice_daily' | 'weekly' | 'custom';
    pillsRemaining: number;
    pillsTotal: number;
    enabled: boolean;
    slotIndex: number;         // Physical slot on the dispenser (0-3)
}

export interface DispenseLog {
    id: string;
    slotId: string;
    slotName: string;
    timestamp: string;         // ISO 8601
    status: 'success' | 'missed' | 'manual' | 'emergency';
    pillsDispensed: number;
}

export interface MachineStatus {
    online: boolean;
    lastHeartbeat: string;     // ISO 8601
    lastDispensed: string;     // ISO 8601
    nextScheduledDose: string; // ISO 8601
    currentTime: string;       // From DS3231 RTC
    wifiRssi: number;
    firmwareVersion: string;
    refillMode: boolean;
}

// ─── MQTT JSON Payloads ─────────────────────────────────────────────
export type ActionType = 'dispense' | 'schedule_sync' | 'status_request' | 'lcd_message' | 'safety_lock';
export type Priority = 'normal' | 'emergency';

export interface MqttDispensePayload {
    action: 'dispense';
    slot: number;
    priority: Priority;
    timestamp: string;
}

export interface MqttScheduleSyncPayload {
    action: 'schedule_sync';
    slots: Array<{
        index: number;
        name: string;
        time: string;
        frequency: string;
        enabled: boolean;
    }>;
    rtcSync: string;           // Current browser time for RTC offset
}

export interface MqttStatusRequestPayload {
    action: 'status_request';
    timestamp: string;
}

export interface MqttLcdMessagePayload {
    action: 'lcd_message';
    line1: string;             // Max 16 chars
    line2: string;             // Max 16 chars
}

export interface MqttSafetyLockPayload {
    action: 'safety_lock';
    locked: boolean;
}

export type MqttPayload =
    | MqttDispensePayload
    | MqttScheduleSyncPayload
    | MqttStatusRequestPayload
    | MqttLcdMessagePayload
    | MqttSafetyLockPayload;

// ─── MQTT Topics ────────────────────────────────────────────────────
export const MQTT_TOPICS = {
    COMMAND: 'medisync/command',
    STATUS: 'medisync/status',
    LOG: 'medisync/log',
    HEARTBEAT: 'medisync/heartbeat',
} as const;

// ─── App State ──────────────────────────────────────────────────────
export interface AppState {
    machineStatus: MachineStatus;
    pillSlots: PillSlot[];
    dispenseLogs: DispenseLog[];
    mqttConnected: boolean;
    safetyLocked: boolean;
}

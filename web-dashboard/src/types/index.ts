// ─── Core Domain Types ───────────────────────────────────────────────

/** One of the 4 physical medicine compartments on the dispenser wheel */
export interface Medicine {
    id: string;
    slotIndex: number;       // 1–4 (physical slot on the wheel)
    name: string;
    colorLabel: string;      // Color of the compartment e.g. "Red"
    pillsTotal: number;
    pillsRemaining: number;
    pillsPerDose: number;    // How many pills per dispense
    enabled: boolean;
}

/** A scheduled dose time for a specific medicine */
export interface Schedule {
    id: string;
    medicineId: string;
    doseTime: string;        // HH:MM format
    frequency: 'daily' | 'twice_daily' | 'weekly' | 'every_other_day' | 'custom';
    daysOfWeek: number[];    // 1=Mon ... 7=Sun
    enabled: boolean;
}

export interface DispenseLog {
    id: string;
    medicineId: string;
    medicineName: string;
    slotIndex: number;
    scheduledAt: string;     // ISO 8601
    dispensedAt: string;     // ISO 8601
    status: 'success' | 'missed' | 'manual' | 'emergency';
    pillsDispensed: number;
}

export interface CaregiverContact {
    id: string;
    name: string;
    email: string;
    phone: string;           // E.164 e.g. +919876543210
    notifyEmail: boolean;
    notifyWhatsapp: boolean;
}

export interface MachineStatus {
    online: boolean;
    lastHeartbeat: string;
    lastDispensed: string;
    nextScheduledAt: string;
    currentSlot: number;     // Where the servo currently points
    cycleStarted: boolean;
}

// ─── MQTT Topics ─────────────────────────────────────────────────────
export const MQTT = {
    CMD:    'dispenser/command',
    STATUS: 'dispenser/status',
} as const;

// ─── Wizard Step ─────────────────────────────────────────────────────
export type WizardStep = 'slots' | 'schedule' | 'caregiver' | 'done';

// ─── Slot Color Options ───────────────────────────────────────────────
export const SLOT_COLORS = [
    'Red', 'Blue', 'Green', 'Yellow'
] as const;
export type SlotColor = typeof SLOT_COLORS[number];

export const COLOR_MAP: Record<SlotColor, string> = {
    Red:    '#ef4444',
    Blue:   '#3b82f6',
    Green:  '#22c55e',
    Yellow: '#eab308',
};

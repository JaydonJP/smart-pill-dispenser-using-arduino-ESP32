import { Medicine, Schedule, DispenseLog, CaregiverContact, MachineStatus } from '../types';

export const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const formatTime = (hhmm: string): string => {
    if (!hhmm) return '—';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${((h % 12) || 12)}:${String(m).padStart(2,'0')} ${ampm}`;
};

export const formatDateTime = (iso: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (iso: string): string => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export const pillPct = (m: Medicine): number =>
    m.pillsTotal === 0 ? 0 : Math.round((m.pillsRemaining / m.pillsTotal) * 100);

export const pillBarColor = (pct: number): string => {
    if (pct > 50) return 'bg-teal-500';
    if (pct > 20) return 'bg-amber-500';
    return 'bg-red-500';
};

export const statusIcon = (s: DispenseLog['status']): string => ({
    success: '✅', missed: '❌', manual: '🖐️', emergency: '🚨'
}[s]);

/** Weekly pill count per schedule (simplified for daily / twice_daily) */
export const weeklyPillCount = (s: Schedule): number => {
    switch (s.frequency) {
        case 'daily':       return 7;
        case 'twice_daily': return 14;
        case 'weekly':      return 1;
        default:            return s.daysOfWeek.length;
    }
};

/** Compute next due dose time string HH:MM from list of schedules */
export const getNextDoseTime = (schedules: Schedule[]): string => {
    const now = new Date();
    const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const enabled = schedules.filter(s => s.enabled).sort((a, b) => a.doseTime.localeCompare(b.doseTime));
    return enabled.find(s => s.doseTime >= hhMM)?.doseTime ?? enabled[0]?.doseTime ?? '—';
};

// ─── Initial State ────────────────────────────────────────────────────

export const EMPTY_MEDICINES: Medicine[] = Array.from({ length: 7 }, (_, i) => ({
    id: generateId(),
    slotIndex: i + 1,
    name: '',
    colorLabel: ['Red','Blue','Green','Yellow','Orange','Purple','White'][i],
    pillsTotal: 0,
    pillsRemaining: 0,
    pillsPerDose: 1,
    enabled: false,
}));

export const INITIAL_STATUS: MachineStatus = {
    online: false,
    lastHeartbeat: '',
    lastDispensed: '',
    nextScheduledAt: '',
    currentSlot: 0,
    cycleStarted: false,
};

export const SLOT_COLORS_LIST = ['Red','Blue','Green','Yellow','Orange','Purple','White'];

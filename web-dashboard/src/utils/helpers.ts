import { PillSlot, DispenseLog, MachineStatus } from '../types';

export const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const formatTime = (iso: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (iso: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
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
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

export const pillPercentage = (slot: PillSlot): number =>
    slot.pillsTotal === 0 ? 0 : Math.round((slot.pillsRemaining / slot.pillsTotal) * 100);

export const pillBarColor = (pct: number): string => {
    if (pct > 50) return 'bg-teal-500';
    if (pct > 20) return 'bg-amber-500';
    return 'bg-red-500';
};

export const pillBarGlow = (pct: number): string => {
    if (pct > 50) return 'shadow-[0_0_6px_rgba(0,230,217,0.3)]';
    if (pct > 20) return 'shadow-[0_0_6px_rgba(245,158,11,0.3)]';
    return 'shadow-[0_0_6px_rgba(239,68,68,0.3)]';
};

export const frequencyLabel = (f: PillSlot['frequency']): string => {
    switch (f) {
        case 'daily': return 'Daily';
        case 'twice_daily': return '2× Daily';
        case 'weekly': return 'Weekly';
        case 'custom': return 'Custom';
    }
};

export const statusIcon = (s: DispenseLog['status']): string => {
    switch (s) {
        case 'success': return '✅';
        case 'missed': return '❌';
        case 'manual': return '🖐️';
        case 'emergency': return '🚨';
    }
};

export const INITIAL_SLOTS: PillSlot[] = [
    { id: generateId(), name: 'Aspirin', dosageTime: '08:00', frequency: 'daily', pillsRemaining: 28, pillsTotal: 30, enabled: true, slotIndex: 0 },
    { id: generateId(), name: 'Metformin', dosageTime: '09:00', frequency: 'twice_daily', pillsRemaining: 15, pillsTotal: 30, enabled: true, slotIndex: 1 },
    { id: generateId(), name: 'Vitamin D', dosageTime: '12:00', frequency: 'daily', pillsRemaining: 5, pillsTotal: 30, enabled: true, slotIndex: 2 },
    { id: generateId(), name: 'Omega-3', dosageTime: '19:00', frequency: 'daily', pillsRemaining: 22, pillsTotal: 30, enabled: false, slotIndex: 3 },
];

export const INITIAL_LOGS: DispenseLog[] = [
    { id: generateId(), slotId: '1', slotName: 'Aspirin', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success', pillsDispensed: 1 },
    { id: generateId(), slotId: '2', slotName: 'Metformin', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success', pillsDispensed: 1 },
    { id: generateId(), slotId: '3', slotName: 'Vitamin D', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'missed', pillsDispensed: 0 },
    { id: generateId(), slotId: '1', slotName: 'Aspirin', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'success', pillsDispensed: 1 },
    { id: generateId(), slotId: '2', slotName: 'Metformin', timestamp: new Date(Date.now() - 90000000).toISOString(), status: 'manual', pillsDispensed: 1 },
    { id: generateId(), slotId: '4', slotName: 'Omega-3', timestamp: new Date(Date.now() - 100000000).toISOString(), status: 'emergency', pillsDispensed: 1 },
];

export const INITIAL_STATUS: MachineStatus = {
    online: true,
    lastHeartbeat: new Date().toISOString(),
    lastDispensed: new Date(Date.now() - 3600000).toISOString(),
    nextScheduledDose: new Date(Date.now() + 7200000).toISOString(),
    currentTime: new Date().toISOString(),
    wifiRssi: -42,
    firmwareVersion: '2.1.3',
    refillMode: false,
};

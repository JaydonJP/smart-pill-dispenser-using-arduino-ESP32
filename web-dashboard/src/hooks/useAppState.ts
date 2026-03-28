import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import {
    Medicine, Schedule, DispenseLog, CaregiverContact,
    MachineStatus, MQTT,
} from '../types';
import {
    generateId, EMPTY_MEDICINES, INITIAL_STATUS,
} from '../utils/helpers';

// ─── MQTT Hook ────────────────────────────────────────────────────────
export function useMqtt() {
    const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<string | null>(null);

    useEffect(() => {
        const url = `ws://${window.location.hostname}:9001`;
        const client = mqtt.connect(url);
        client.on('connect', () => {
            setConnected(true);
            setMqttClient(client);
            client.subscribe(MQTT.STATUS);
        });
        client.on('message', (_, msg) => setLastMessage(msg.toString()));
        client.on('error', console.error);
        client.on('close', () => setConnected(false));
        return () => { client.end(); };
    }, []);

    const publish = useCallback((msg: string) => {
        mqttClient?.publish(MQTT.CMD, msg);
        console.log('[MQTT TX]', msg);
    }, [mqttClient]);

    return {
        connected,
        lastMessage,
        publish,
        startCycle:      () => publish('start_cycle'),
        startDemo:       () => publish('start_demo'),
        dispenseSlot:    (n: number) => publish(`dispense:${n}`),
        sendLcd:         (l1: string, l2: string) => publish(`lcd:${l1}|${l2}`),
    };
}

// ─── App State Hook ───────────────────────────────────────────────────
export function useAppState(lastMessage: string | null, publish: (m: string) => void) {

    const [medicines,   setMedicines]   = useState<Medicine[]>(() => {
        const saved = localStorage.getItem('medisync_meds');
        return saved ? JSON.parse(saved) : EMPTY_MEDICINES;
    });
    const [schedules,   setSchedules]   = useState<Schedule[]>(() => {
        const saved = localStorage.getItem('medisync_schedules');
        return saved ? JSON.parse(saved) : [];
    });
    const [logs,        setLogs]        = useState<DispenseLog[]>(() => {
        const saved = localStorage.getItem('medisync_logs');
        return saved ? JSON.parse(saved) : [];
    });
    const [caregiver,   setCaregiver]   = useState<CaregiverContact>(() => {
        const saved = localStorage.getItem('medisync_caregiver');
        return saved ? JSON.parse(saved) : {
            id: generateId(), name: '', email: '', phone: '', notifyEmail: true, notifySms: true,
        };
    });
    const [status, setStatus]           = useState<MachineStatus>(INITIAL_STATUS);
    const [safetyLocked, setSafetyLocked] = useState(true);
    const [cycleStarted, setCycleStarted] = useState(() => localStorage.getItem('medisync_cycle') === 'true');
    const [wizardDone, setWizardDone]   = useState(() => localStorage.getItem('medisync_wizard') === 'true');

    // ── Persist to LocalStorage ──────────────────────────────────────────
    useEffect(() => { localStorage.setItem('medisync_meds', JSON.stringify(medicines)); }, [medicines]);
    useEffect(() => { localStorage.setItem('medisync_schedules', JSON.stringify(schedules)); }, [schedules]);
    useEffect(() => { localStorage.setItem('medisync_logs', JSON.stringify(logs)); }, [logs]);
    useEffect(() => { localStorage.setItem('medisync_caregiver', JSON.stringify(caregiver)); }, [caregiver]);
    useEffect(() => { localStorage.setItem('medisync_cycle', String(cycleStarted)); }, [cycleStarted]);
    useEffect(() => { localStorage.setItem('medisync_wizard', String(wizardDone)); }, [wizardDone]);

    const lastDispatchedRef = useRef<Record<string, string>>({}); // scheduleId → date

    // ── MQTT message ingestion ─────────────────────────────────────────
    useEffect(() => {
        if (!lastMessage) return;
        const now = new Date().toISOString();

        if (lastMessage === 'online') {
            setStatus(prev => ({ ...prev, online: true, lastHeartbeat: now }));
        } else if (lastMessage === 'offline') {
            setStatus(prev => ({ ...prev, online: false }));
        } else if (lastMessage === 'Cycle Started') {
            setCycleStarted(true);
            setStatus(prev => ({ ...prev, cycleStarted: true }));
        } else if (lastMessage.startsWith('taken:')) {
            const slot = parseInt(lastMessage.split(':')[1]);
            const med = medicines.find(m => m.slotIndex === slot);
            if (med) {
                setMedicines(prev => prev.map(m =>
                    m.slotIndex === slot
                        ? { ...m, pillsRemaining: Math.max(0, m.pillsRemaining - m.pillsPerDose) }
                        : m
                ));
                setLogs(prev => [{
                    id: generateId(), medicineId: med.id,
                    medicineName: med.name, slotIndex: slot,
                    scheduledAt: now, dispensedAt: now,
                    status: 'success', pillsDispensed: med.pillsPerDose,
                }, ...prev]);
                setStatus(prev => ({ ...prev, lastDispensed: now }));
            }
        } else if (lastMessage.startsWith('missed:')) {
            const slot = parseInt(lastMessage.split(':')[1]);
            const med = medicines.find(m => m.slotIndex === slot);
            if (med) {
                // Log the missed event
                setLogs(prev => [{
                    id: generateId(), medicineId: med.id,
                    medicineName: med.name, slotIndex: slot,
                    scheduledAt: now, dispensedAt: now,
                    status: 'missed', pillsDispensed: 0,
                }, ...prev]);

                // Fire caregiver alert via Supabase Edge Function
                if (caregiver.email || caregiver.phone) {
                    const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL ?? '';
                    const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
                    fetch(`${SUPABASE_URL}/functions/v1/notify-caregiver`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_ANON}`,
                        },
                        body: JSON.stringify({
                            medicineName: med.name,
                            slotIndex: slot,
                            scheduledAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                            caregiverName: caregiver.name || 'Caregiver',
                            caregiverEmail: caregiver.email,
                            caregiverPhone: caregiver.phone,
                            notifyEmail: caregiver.notifyEmail,
                            notifyWhatsapp: caregiver.notifySms, // notifySms field now controls WhatsApp
                        }),
                    }).catch(console.error);
                }
            }
        }
    }, [lastMessage]);

    // ── Offline watcher (12s no heartbeat) ────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => {
            setStatus(prev => {
                if (!prev.online || !prev.lastHeartbeat) return prev;
                if (Date.now() - new Date(prev.lastHeartbeat).getTime() > 12000)
                    return { ...prev, online: false };
                return prev;
            });
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    // ── Background Scheduler ──────────────────────────────────────────
    useEffect(() => {
        if (!cycleStarted) return;
        const timer = setInterval(() => {
            const now = new Date();
            const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
            const today = now.toISOString().split('T')[0];

            const enabled = schedules.filter(s => s.enabled).sort((a, b) => a.doseTime.localeCompare(b.doseTime));
            
            // 1. Sync next dose to LCD
            const availableToday = enabled.filter(s => !lastDispatchedRef.current[`${s.id}-${today}`]);
            const nextTime = availableToday.find(s => s.doseTime >= hhMM)?.doseTime ?? availableToday[0]?.doseTime ?? '--:--';
            publish(`next_dose:${nextTime}`);

            // 2. Dispatch due doses
            schedules.forEach(s => {
                if (!s.enabled || s.doseTime !== hhMM) return;
                const key = `${s.id}-${today}`;
                if (lastDispatchedRef.current[key]) return;
                const med = medicines.find(m => m.id === s.medicineId && m.enabled && m.pillsRemaining > 0);
                if (!med) return;
                lastDispatchedRef.current[key] = today;
                publish(`dispense:${med.slotIndex}`);
            });
        }, 10000); // Check every 10s
        return () => clearInterval(timer);
    }, [cycleStarted, schedules, medicines, publish]);

    // ── Emergency/Quick Eject ─────────────────────────────────────────
    const quickEject = useCallback(() => {
        const now = new Date();
        const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        const today = now.toISOString().split('T')[0];
        const enabled = schedules.filter(s => s.enabled)
            .sort((a, b) => a.doseTime.localeCompare(b.doseTime));
        
        // Find the first schedule that HAS NOT been dispatched today and is chronologically next
        const availableToday = enabled.filter(s => !lastDispatchedRef.current[`${s.id}-${today}`]);
        const next = availableToday.find(s => s.doseTime >= hhMM) ?? availableToday[0];
        
        if (!next) return;
        const med = medicines.find(m => m.id === next.medicineId && m.pillsRemaining > 0);
        if (!med) return;
        
        // Mark as taken so next eject picks the next one
        lastDispatchedRef.current[`${next.id}-${today}`] = today; 
        publish(`dispense:${med.slotIndex}`);
        
        // Push updated next dose immediately
        const newAvailable = availableToday.filter(s => s.id !== next.id);
        const nextTime = newAvailable.find(s => s.doseTime >= hhMM)?.doseTime ?? newAvailable[0]?.doseTime ?? '--:--';
        publish(`next_dose:${nextTime}`);
    }, [schedules, medicines, publish]);

    return {
        medicines, setMedicines,
        schedules, setSchedules,
        logs, setLogs,
        caregiver, setCaregiver,
        status, setStatus,
        safetyLocked, setSafetyLocked,
        cycleStarted, setCycleStarted,
        wizardDone, setWizardDone,
        quickEject,
    };
}

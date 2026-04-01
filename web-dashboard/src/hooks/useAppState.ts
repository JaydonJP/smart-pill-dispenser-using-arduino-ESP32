import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import {
    Medicine, Schedule, DispenseLog, CaregiverContact,
    MachineStatus, MQTT,
} from '../types';
import {
    generateId, EMPTY_MEDICINES, INITIAL_STATUS,
} from '../utils/helpers';
import { supabase } from '../lib/supabase';

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
        dispenseSlot:    (n: number, d: number = 1) => publish(`dispense:${n}:${d}`),
        sendLcd:         (l1: string, l2: string) => publish(`lcd:${l1}|${l2}`),
    };
}

// ─── App State Hook ───────────────────────────────────────────────────
export function useAppState(connected: boolean, lastMessage: string | null, publish: (m: string) => void) {

    const [medicines,   setMedicines]   = useState<Medicine[]>(EMPTY_MEDICINES);
    const [schedules,   setSchedules]   = useState<Schedule[]>([]);
    const [logs,        setLogs]        = useState<DispenseLog[]>([]);
    const [caregiver,   setCaregiver]   = useState<CaregiverContact>({
        id: generateId(), name: '', email: '', phone: '', notifyEmail: true, notifyWhatsapp: true,
    });
    const [status, setStatus]           = useState<MachineStatus>(INITIAL_STATUS);
    const [safetyLocked, setSafetyLocked] = useState(true);
    const [cycleStarted, setCycleStarted] = useState(() => localStorage.getItem('medisync_cycle') === 'true');
    const [wizardDone, setWizardDone]   = useState(() => localStorage.getItem('medisync_wizard') === 'true');
    const [dispatched, setDispatched]   = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('medisync_dispatched');
        return saved ? JSON.parse(saved) : {};
    });
    const [syncing, setSyncing]         = useState(false);

    const sendNotification = useCallback((medName: string, slot: number, notificationType: 'dispensing' | 'taken' | 'missed', scheduledAt?: string) => {
        if (!caregiver.email && !caregiver.phone) return;
        const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL ?? '';
        const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
        fetch(`${SUPABASE_URL}/functions/v1/notify-caregiver`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({
                medicineName: medName,
                slotIndex: slot,
                scheduledAt: scheduledAt || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                caregiverName: caregiver.name || 'Caregiver',
                caregiverEmail: caregiver.email,
                caregiverPhone: caregiver.phone,
                notifyEmail: caregiver.notifyEmail,
                notifyWhatsapp: caregiver.notifyWhatsapp,
                notificationType: notificationType,
            }),
        }).catch(console.error);
    }, [caregiver]);

    // ── Initial Fetch from Supabase ──────────────────────────────────────
    useEffect(() => {
        async function fetchInitialData() {
            setSyncing(true);
            try {
                // 1. Medicines
                const { data: meds } = await supabase.from('medicines').select('*').order('slot_index', { ascending: true });
                if (meds && meds.length > 0) {
                    setMedicines(meds.slice(0, 4).map(m => ({
                        id: m.id, slotIndex: m.slot_index, name: m.name, colorLabel: m.color_label,
                        pillsTotal: m.pills_total, pillsRemaining: m.pills_remaining,
                        pillsPerDose: m.pills_per_dose, enabled: m.enabled
                    })));
                } else {
                    // Seed if empty (exactly 4 slots)
                    await supabase.from('medicines').upsert(EMPTY_MEDICINES.slice(0, 4).map(m => ({
                        id: m.id, slot_index: m.slotIndex, name: m.name, color_label: m.colorLabel,
                        pills_total: m.pillsTotal, pills_remaining: m.pillsRemaining,
                        pills_per_dose: m.pillsPerDose, enabled: m.enabled
                    })));
                }

                // 2. Schedules
                const { data: scheds } = await supabase.from('schedules').select('*');
                if (scheds) {
                    setSchedules(scheds.map(s => ({
                        id: s.id, medicineId: s.medicine_id, doseTime: s.dose_time,
                        frequency: s.frequency as any, enabled: s.enabled, daysOfWeek: [1,2,3,4,5,6,7]
                    })));
                }

                // 3. Caregiver
                const { data: contact } = await supabase.from('caregiver_contacts').select('*').limit(1).single();
                if (contact) {
                    setCaregiver({
                        id: contact.id, name: contact.name, email: contact.email, phone: contact.phone,
                        notifyEmail: contact.notify_email, notifyWhatsapp: contact.notify_whatsapp
                    });
                }
                
                // 4. Logs (last 50)
                const { data: dbLogs } = await supabase.from('dispense_logs').select('*').order('dispensed_at', { ascending: false }).limit(50);
                if (dbLogs) {
                    setLogs(dbLogs.map(l => ({
                        id: l.id, medicineId: l.medicine_id, medicineName: l.medicine_name,
                        slotIndex: l.slot_index, scheduledAt: l.scheduled_at, dispensedAt: l.dispensed_at,
                        status: l.status as any, pillsDispensed: l.pills_dispensed
                    })));
                }
            } catch (err) {
                console.error('Supabase fetch error:', err);
            } finally {
                setSyncing(false);
            }
        }
        fetchInitialData();
    }, []);

    // ── Debounced Autosave to Supabase ───────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (wizardDone) {
                setSyncing(true);
                // Medicines
                await supabase.from('medicines').upsert(medicines.map(m => ({
                    id: m.id, slot_index: m.slotIndex, name: m.name, color_label: m.colorLabel,
                    pills_total: m.pillsTotal, pills_remaining: m.pillsRemaining,
                    pills_per_dose: m.pillsPerDose, enabled: m.enabled
                })));
                // Schedules (clear and replace or upsert)
                // For simplicity, we just delete all and re-insert for this user (or use upsert if they have IDs)
                if (schedules.length > 0) {
                    await supabase.from('schedules').upsert(schedules.map(s => ({
                        id: s.id, medicine_id: s.medicineId, dose_time: s.doseTime,
                        frequency: s.frequency, enabled: s.enabled
                    })));
                }
                // Caregiver
                if (caregiver.name) {
                    await supabase.from('caregiver_contacts').upsert({
                        id: caregiver.id, name: caregiver.name, email: caregiver.email, phone: caregiver.phone,
                        notify_email: caregiver.notifyEmail, notify_whatsapp: caregiver.notifyWhatsapp
                    });
                }
                setSyncing(false);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [medicines, schedules, caregiver, wizardDone]);

    // ── Local Persistence (for UI state) ─────────────────────────────────
    useEffect(() => { localStorage.setItem('medisync_cycle', String(cycleStarted)); }, [cycleStarted]);
    useEffect(() => { localStorage.setItem('medisync_wizard', String(wizardDone)); }, [wizardDone]);
    useEffect(() => { localStorage.setItem('medisync_dispatched', JSON.stringify(dispatched)); }, [dispatched]);

    const isConnectedRef = useRef(false);

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
                const updatedMeds = medicines.map(m =>
                    m.slotIndex === slot
                        ? { ...m, pillsRemaining: Math.max(0, m.pillsRemaining - m.pillsPerDose) }
                        : m
                );
                setMedicines(updatedMeds);

                const newLog = {
                    id: generateId(), medicineId: med.id,
                    medicineName: med.name, slotIndex: slot,
                    scheduledAt: now, dispensedAt: now,
                    status: 'success' as const, pillsDispensed: med.pillsPerDose,
                };
                setLogs(prev => [newLog, ...prev]);
                setStatus(prev => ({ ...prev, lastDispensed: now }));

                // Insert into Supabase
                void supabase.from('dispense_logs').insert({
                    id: newLog.id, medicine_id: newLog.medicineId, medicine_name: newLog.medicineName,
                    slot_index: newLog.slotIndex, scheduled_at: newLog.scheduledAt, dispensed_at: newLog.dispensedAt,
                    status: newLog.status, pills_dispensed: newLog.pillsDispensed
                });

                sendNotification(med.name, slot, 'taken');
            }
        } else if (lastMessage.startsWith('missed:')) {
            const slot = parseInt(lastMessage.split(':')[1]);
            const med = medicines.find(m => m.slotIndex === slot);
            if (med) {
                const newLog = {
                    id: generateId(), medicineId: med.id,
                    medicineName: med.name, slotIndex: slot,
                    scheduledAt: now, dispensedAt: now,
                    status: 'missed' as const, pillsDispensed: 0,
                };
                setLogs(prev => [newLog, ...prev]);

                // Insert into Supabase
                void supabase.from('dispense_logs').insert({
                    id: newLog.id, medicine_id: newLog.medicineId, medicine_name: newLog.medicineName,
                    slot_index: newLog.slotIndex, scheduled_at: newLog.scheduledAt, dispensed_at: newLog.dispensedAt,
                    status: newLog.status, pills_dispensed: newLog.pillsDispensed
                });

                // Fire caregiver alert via Supabase Edge Function
                sendNotification(med.name, slot, 'missed');
            }
        }
    }, [lastMessage, sendNotification]);

    // ── MQTT Auto-Resync on Connect ───────────────────────────────────
    useEffect(() => {
        // When we connect (or reconnect), if the cycle is started, tell the ESP32.
        // This handles cases where the ESP32 reboots while the dashboard is open.
        if (connected && cycleStarted) {
            console.log('[RE-SYNC] Sending start_cycle to ESP32');
            publish('start_cycle');
            // Immediate sync of next dose
            const now = new Date();
            const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
            const today = now.toISOString().split('T')[0];
            const enabled = schedules.filter(s => s.enabled).sort((a,b) => a.doseTime.localeCompare(b.doseTime));
            const availableToday = enabled.filter(s => dispatched[`${s.id}-${today}`] !== today);
            const nextTime = availableToday.find(s => s.doseTime >= hhMM)?.doseTime ?? availableToday[0]?.doseTime ?? '--:--';
            publish(`next_dose:${nextTime}`);
        }
    }, [connected, cycleStarted]); // Only trigger on connect/start events

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
            
            const dayCount = Math.floor(Date.now() / 86400000);
            const dayOfWeek = now.getDay() || 7; // Sunday=7

            const dueToday = enabled.filter(s => {
                if (s.frequency === 'every_other_day' && dayCount % 2 !== 0) return false;
                if (s.frequency === 'weekly' && !s.daysOfWeek.includes(dayOfWeek)) return false;
                return true;
            });

            // 1. Sync next dose to LCD
            const availableToday = dueToday.filter(s => dispatched[`${s.id}-${today}`] !== today);
            const nextTime = availableToday.find(s => s.doseTime >= hhMM)?.doseTime ?? availableToday[0]?.doseTime ?? '--:--';
            publish(`next_dose:${nextTime}`);

            // 2. Dispatch due doses
            schedules.forEach(s => {
                if (!s.enabled || s.doseTime !== hhMM) return;
                
                // Frequency check
                if (s.frequency === 'every_other_day' && dayCount % 2 !== 0) return;
                if (s.frequency === 'weekly' && !s.daysOfWeek.includes(dayOfWeek)) return;

                const key = `${s.id}-${today}`;
                if (dispatched[key] === today) return;
                const med = medicines.find(m => m.id === s.medicineId && m.enabled && m.pillsRemaining > 0);
                if (!med) return;
                
                console.log(`[SCHEDULER] Triggering dispense for ${med.name} at ${hhMM} (Freq: ${s.frequency})`);
                setDispatched(prev => ({ ...prev, [key]: today }));
                sendNotification(med.name, med.slotIndex, 'dispensing', hhMM);
                publish(`dispense:${med.slotIndex}:${med.pillsPerDose}`);
            });
        }, 10000); // Check every 10s
        return () => clearInterval(timer);
    }, [cycleStarted, schedules, medicines, publish, dispatched, sendNotification]);

    // ── Emergency/Quick Eject ─────────────────────────────────────────
    const quickEject = useCallback(() => {
        const now = new Date();
        const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        const today = now.toISOString().split('T')[0];
        const enabled = schedules.filter(s => s.enabled)
            .sort((a, b) => a.doseTime.localeCompare(b.doseTime));
        
        // Find the first schedule that HAS NOT been dispatched today and is chronologically next
        const availableToday = enabled.filter(s => dispatched[`${s.id}-${today}`] !== today);
        const next = availableToday.find(s => s.doseTime >= hhMM) ?? availableToday[0];
        
        if (!next) return;
        const med = medicines.find(m => m.id === next.medicineId && m.pillsRemaining > 0);
        if (!med) return;
        
        // Mark as taken so next eject picks the next one
        setDispatched(prev => ({ ...prev, [`${next.id}-${today}`]: today }));
        sendNotification(med.name, med.slotIndex, 'dispensing', next.doseTime);
        publish(`dispense:${med.slotIndex}:${med.pillsPerDose}`);
        
        // Push updated next dose immediately
        const newAvailable = availableToday.filter(s => s.id !== next.id);
        const nextTime = newAvailable.find(s => s.doseTime >= hhMM)?.doseTime ?? newAvailable[0]?.doseTime ?? '--:--';
        publish(`next_dose:${nextTime}`);
    }, [schedules, medicines, publish, dispatched, sendNotification]);

    return {
        medicines, setMedicines,
        schedules, setSchedules,
        logs, setLogs,
        caregiver, setCaregiver,
        status, setStatus,
        safetyLocked, setSafetyLocked,
        cycleStarted, setCycleStarted,
        wizardDone, setWizardDone,
        syncing,
        quickEject,
        sendNotification,
    };
}

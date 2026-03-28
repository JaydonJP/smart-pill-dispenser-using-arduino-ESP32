import { useState, useEffect, useCallback, useRef } from 'react';
import {
    PillSlot, DispenseLog, MachineStatus, AppState,
    MqttDispensePayload, MqttScheduleSyncPayload,
    MqttStatusRequestPayload, MqttLcdMessagePayload,
    MQTT_TOPICS,
} from '../types';
import {
    generateId, INITIAL_SLOTS, INITIAL_LOGS, INITIAL_STATUS,
} from '../utils/helpers';

// ─── MQTT Hook ──────────────────────────────────────────────────────
// NOTE: In production, replace this with actual MQTT.js client connection.
// This mock simulates the bi-directional channel for demo purposes.

export function useMqtt() {
    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<string | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        // Simulate connection handshake
        const timer = setTimeout(() => setConnected(true), 1200);
        return () => {
            clearTimeout(timer);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, []);

    const publish = useCallback((topic: string, payload: object) => {
        const msg = JSON.stringify(payload);
        console.log(`[MQTT TX] ${topic}:`, msg);
        setLastMessage(msg);
        // In production: client.publish(topic, msg)
    }, []);

    const sendDispense = useCallback((slot: number, priority: 'normal' | 'emergency') => {
        const payload: MqttDispensePayload = {
            action: 'dispense',
            slot,
            priority,
            timestamp: new Date().toISOString(),
        };
        publish(MQTT_TOPICS.COMMAND, payload);
    }, [publish]);

    const sendScheduleSync = useCallback((slots: PillSlot[]) => {
        const payload: MqttScheduleSyncPayload = {
            action: 'schedule_sync',
            slots: slots.map(s => ({
                index: s.slotIndex,
                name: s.name,
                time: s.dosageTime,
                frequency: s.frequency,
                enabled: s.enabled,
            })),
            rtcSync: new Date().toISOString(),
        };
        publish(MQTT_TOPICS.COMMAND, payload);
    }, [publish]);

    const sendStatusRequest = useCallback(() => {
        const payload: MqttStatusRequestPayload = {
            action: 'status_request',
            timestamp: new Date().toISOString(),
        };
        publish(MQTT_TOPICS.COMMAND, payload);
    }, [publish]);

    const sendLcdMessage = useCallback((line1: string, line2: string) => {
        const payload: MqttLcdMessagePayload = {
            action: 'lcd_message',
            line1: line1.slice(0, 16),
            line2: line2.slice(0, 16),
        };
        publish(MQTT_TOPICS.COMMAND, payload);
    }, [publish]);

    return {
        connected,
        lastMessage,
        sendDispense,
        sendScheduleSync,
        sendStatusRequest,
        sendLcdMessage,
    };
}

// ─── App State Hook ─────────────────────────────────────────────────
export function useAppState() {
    const [machineStatus, setMachineStatus] = useState<MachineStatus>(INITIAL_STATUS);
    const [pillSlots, setPillSlots] = useState<PillSlot[]>(INITIAL_SLOTS);
    const [dispenseLogs, setDispenseLogs] = useState<DispenseLog[]>(INITIAL_LOGS);
    const [safetyLocked, setSafetyLocked] = useState(true);

    // Simulate heartbeat every 5s
    useEffect(() => {
        const interval = setInterval(() => {
            setMachineStatus(prev => ({
                ...prev,
                lastHeartbeat: new Date().toISOString(),
                currentTime: new Date().toISOString(),
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const addSlot = useCallback((slot: Omit<PillSlot, 'id'>) => {
        setPillSlots(prev => [...prev, { ...slot, id: generateId() }]);
    }, []);

    const updateSlot = useCallback((id: string, updates: Partial<PillSlot>) => {
        setPillSlots(prev =>
            prev.map(s => (s.id === id ? { ...s, ...updates } : s))
        );
    }, []);

    const removeSlot = useCallback((id: string) => {
        setPillSlots(prev => prev.filter(s => s.id !== id));
    }, []);

    const dispense = useCallback((slotId: string, status: DispenseLog['status'] = 'success') => {
        setPillSlots(prev =>
            prev.map(s =>
                s.id === slotId && s.pillsRemaining > 0
                    ? { ...s, pillsRemaining: s.pillsRemaining - 1 }
                    : s
            )
        );
        const slot = pillSlots.find(s => s.id === slotId);
        const log: DispenseLog = {
            id: generateId(),
            slotId,
            slotName: slot?.name ?? 'Unknown',
            timestamp: new Date().toISOString(),
            status,
            pillsDispensed: status === 'missed' ? 0 : 1,
        };
        setDispenseLogs(prev => [log, ...prev]);
        setMachineStatus(prev => ({
            ...prev,
            lastDispensed: new Date().toISOString(),
        }));
    }, [pillSlots]);

    const emergencyDispense = useCallback((slotIndex: number) => {
        const slot = pillSlots.find(s => s.slotIndex === slotIndex);
        if (slot) dispense(slot.id, 'emergency');
    }, [pillSlots, dispense]);

    return {
        machineStatus, setMachineStatus,
        pillSlots, setPillSlots,
        dispenseLogs, setDispenseLogs,
        safetyLocked, setSafetyLocked,
        addSlot, updateSlot, removeSlot,
        dispense, emergencyDispense,
    };
}

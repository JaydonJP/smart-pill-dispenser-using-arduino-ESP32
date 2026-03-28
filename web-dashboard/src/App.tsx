import React from 'react';
import { Pill, Radio, Heart, Settings } from 'lucide-react';
import { StatusPanel } from './components/StatusPanel';
import { SchedulePanel } from './components/SchedulePanel';
import { EmergencyEject } from './components/EmergencyEject';
import { LogsPanel } from './components/LogsPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { LcdMirror } from './components/LcdMirror';
import { useMqtt, useAppState } from './hooks/useAppState';

const App: React.FC = () => {
    const mqtt = useMqtt();
    const state = useAppState();

    const handleScheduleSync = () => {
        mqtt.sendScheduleSync(state.pillSlots);
    };

    const handleRefill = (id: string) => {
        const slot = state.pillSlots.find(s => s.id === id);
        if (slot) {
            state.updateSlot(id, { pillsRemaining: slot.pillsTotal });
        }
    };

    return (
        <div className="min-h-screen bg-navy-950 bg-grid relative">
            {/* Ambient background glow effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-teal-500/[0.03] rounded-full blur-3xl" />
                <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] bg-teal-600/[0.02] rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-teal-500/[0.015] rounded-full blur-3xl" />
            </div>

            {/* ─── Top Bar ────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 backdrop-blur-2xl bg-navy-950/80 border-b border-navy-700/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-glow-sm">
                                <Pill className="w-5 h-5 text-navy-950" />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold tracking-tight text-white">
                                    Medi<span className="text-gradient-teal">Sync</span>
                                </h1>
                                <p className="text-[9px] text-surface-500 -mt-0.5 tracking-[0.15em] uppercase font-semibold">
                                    Smart Pill Dispenser
                                </p>
                            </div>
                        </div>

                        {/* Right Nav */}
                        <div className="flex items-center gap-4">
                            {/* MQTT Status */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800/50 border border-navy-600/25">
                                <Radio className={`w-3 h-3 ${mqtt.connected ? 'text-teal-400 animate-pulse-soft' : 'text-red-400'}`} />
                                <span className={`text-[11px] font-bold tracking-wide ${mqtt.connected ? 'text-teal-400' : 'text-red-400'}`}>
                                    {mqtt.connected ? 'MQTT CONNECTED' : 'DISCONNECTED'}
                                </span>
                            </div>

                            <div className="w-px h-6 bg-navy-600/30 hidden sm:block" />

                            {/* Settings */}
                            <button className="w-9 h-9 rounded-xl bg-navy-800/40 border border-navy-600/25 flex items-center justify-center text-surface-400 hover:text-teal-400 hover:border-teal-500/20 transition-all">
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ─── Main Content ───────────────────────────────────────── */}
            <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Row 1: Status + Emergency */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <StatusPanel
                            status={state.machineStatus}
                            mqttConnected={mqtt.connected}
                            onRefresh={mqtt.sendStatusRequest}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <EmergencyEject
                            slots={state.pillSlots}
                            safetyLocked={state.safetyLocked}
                            onToggleLock={() => state.setSafetyLocked(!state.safetyLocked)}
                            onEmergencyDispense={state.emergencyDispense}
                            mqttSendDispense={mqtt.sendDispense}
                        />
                    </div>
                </div>

                {/* Row 2: Schedule + Inventory */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SchedulePanel
                        slots={state.pillSlots}
                        onAdd={state.addSlot}
                        onUpdate={state.updateSlot}
                        onRemove={state.removeSlot}
                        onSync={handleScheduleSync}
                    />
                    <InventoryPanel
                        slots={state.pillSlots}
                        onRefill={handleRefill}
                    />
                </div>

                {/* Row 3: Logs + LCD */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <LogsPanel logs={state.dispenseLogs} />
                    </div>
                    <div className="lg:col-span-1">
                        <LcdMirror onSend={mqtt.sendLcdMessage} />
                    </div>
                </div>
            </main>

            {/* ─── Footer ─────────────────────────────────────────────── */}
            <footer className="relative z-10 border-t border-navy-700/25 mt-8">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-surface-500 text-xs">
                        <Heart className="w-3 h-3 text-teal-500/50" />
                        <span>© 2026 <strong className="text-surface-400">MediSync</strong> — ESP32-S3 Smart Pill Dispenser</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-surface-600 tracking-wider font-mono">
                        <span>DS3231 RTC</span>
                        <span className="w-1 h-1 rounded-full bg-surface-700" />
                        <span>PCF8574 LCD</span>
                        <span className="w-1 h-1 rounded-full bg-surface-700" />
                        <span>SG90 Servo</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;

import React from 'react';
import { Pill, Radio, Heart, Cloud, Loader2 } from 'lucide-react';
import { useMqtt, useAppState } from './hooks/useAppState';
import { SetupWizard } from './components/SetupWizard';
import { StatusPanel } from './components/StatusPanel';
import { QuickEject } from './components/QuickEject';
import { InventoryPanel } from './components/InventoryPanel';
import { CompliancePanel } from './components/CompliancePanel';
import { LcdMirror } from './components/LcdMirror';
import { PrescriptionUpload } from './components/PrescriptionUpload';

const App: React.FC = () => {
    const mqtt = useMqtt();
    const state = useAppState(mqtt.connected, mqtt.lastMessage, mqtt.publish);

    // ── Refill handler ────────────────────────────────────────────────
    const handleRefill = (id: string, total: number) => {
        state.setMedicines(state.medicines.map(m =>
            m.id === id ? { ...m, pillsRemaining: total } : m
        ));
    };

    // ── Start Cycle ───────────────────────────────────────────────────
    const handleStartCycle = () => {
        state.setCycleStarted(true);
        state.setWizardDone(true);
        mqtt.startCycle();
    };

    // ── Show Setup Wizard if not done ─────────────────────────────────
    if (!state.wizardDone) {
        return (
            <SetupWizard
                medicines={state.medicines}
                setMedicines={state.setMedicines}
                schedules={state.schedules}
                setSchedules={state.setSchedules}
                caregiver={state.caregiver}
                setCaregiver={state.setCaregiver}
                onFinish={handleStartCycle}
            />
        );
    }

    return (
        <div className="min-h-screen bg-navy-950 bg-grid relative">
            {/* Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-teal-500/[0.03] rounded-full blur-3xl" />
                <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] bg-teal-600/[0.02] rounded-full blur-3xl" />
            </div>

            {/* ── Header ────────────────────────────────────────────── */}
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

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            {/* Cycle State */}
                            {state.cycleStarted ? (
                                <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold">
                                    ● CYCLE RUNNING
                                </div>
                            ) : (
                                <button onClick={handleStartCycle}
                                    className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-bold hover:bg-teal-500/30 transition-all animate-pulse-soft">
                                    ▶ START CYCLE
                                </button>
                            )}

                            {/* Demo Mode Button */}
                            <button onClick={mqtt.startDemo}
                                className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold hover:bg-indigo-500/30 transition-all">
                                🚀 DEMO MODE
                            </button>

                            {/* Supabase Sync Indicator */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${state.syncing ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-navy-800/50 border-navy-600/25 text-surface-600'}`}>
                                {state.syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {state.syncing ? 'Syncing...' : 'Cloud'}
                                </span>
                            </div>

                            {/* MQTT Indicator */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800/50 border border-navy-600/25">
                                <Radio className={`w-3 h-3 ${mqtt.connected ? 'text-teal-400 animate-pulse-soft' : 'text-red-400'}`} />
                                <span className={`text-[11px] font-bold ${mqtt.connected ? 'text-teal-400' : 'text-red-400'}`}>
                                    {mqtt.connected ? 'MQTT' : 'OFFLINE'}
                                </span>
                            </div>

                            {/* Back to Setup */}
                            <button onClick={() => { state.setWizardDone(false); state.setCycleStarted(false); }}
                                className="text-xs text-surface-500 hover:text-surface-300 transition-colors">
                                ⚙ Setup
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Grid ─────────────────────────────────────────── */}
            <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Row 1: Status + Quick Eject */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatusPanel
                        status={state.status}
                        connected={mqtt.connected}
                        medicines={state.medicines}
                        schedules={state.schedules}
                        onRefresh={() => mqtt.publish('status')}
                    />
                    <div className="lg:col-span-2">
                        <QuickEject
                            medicines={state.medicines}
                            schedules={state.schedules}
                            safetyLocked={state.safetyLocked}
                            onToggleLock={() => state.setSafetyLocked(!state.safetyLocked)}
                            onQuickEject={state.quickEject}
                        />
                    </div>
                </div>

                {/* Row 2: Inventory + Compliance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InventoryPanel
                        medicines={state.medicines}
                        schedules={state.schedules}
                        onRefill={handleRefill}
                    />
                    <CompliancePanel logs={state.logs} />
                </div>

                {/* Row 3: AI Prescription + LCD Mirror */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PrescriptionUpload
                        medicines={state.medicines}
                        setMedicines={state.setMedicines}
                        schedules={state.schedules}
                        setSchedules={state.setSchedules}
                    />
                    <LcdMirror onSend={mqtt.sendLcd} />
                </div>

            </main>

            {/* ── Footer ────────────────────────────────────────────── */}
            <footer className="relative z-10 border-t border-navy-700/25 mt-8">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-surface-500 text-xs">
                        <Heart className="w-3 h-3 text-teal-500/50" />
                        <span>© 2026 <strong className="text-surface-400">MediSync</strong> — ESP32-S3 Smart Pill Dispenser</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-surface-600 tracking-wider font-mono">
                        <span>7 Slots</span>
                        <span className="w-1 h-1 rounded-full bg-surface-700" />
                        <span>SG90 Servo</span>
                        <span className="w-1 h-1 rounded-full bg-surface-700" />
                        <span>ESP32-S3</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Pill, Clock, UserRound, Play, Sparkles } from 'lucide-react';
import { Medicine, Schedule, CaregiverContact, SLOT_COLORS, COLOR_MAP } from '../types';
import { generateId, formatTime, weeklyPillCount } from '../utils/helpers';
import { PrescriptionUpload } from './PrescriptionUpload';

interface Props {
    medicines: Medicine[];
    setMedicines: (m: Medicine[]) => void;
    schedules: Schedule[];
    setSchedules: (s: Schedule[]) => void;
    caregiver: CaregiverContact;
    setCaregiver: (c: CaregiverContact) => void;
    onFinish: () => void;
}

const STEPS = ['slots', 'schedule', 'caregiver'] as const;
type Step = typeof STEPS[number];
const STEP_LABELS = ['Assign Slots', 'Set Schedule', 'Caregiver'];
const FREQ_OPTIONS = [
    { value: 'daily', label: 'Once Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'weekly', label: 'Weekly' },
];

export const SetupWizard: React.FC<Props> = ({
    medicines, setMedicines, schedules, setSchedules, caregiver, setCaregiver, onFinish,
}) => {
    const [step, setStep] = useState<Step>('slots');
    const stepIdx = STEPS.indexOf(step);

    // ── Slot helpers ─────────────────────────────────────────────────
    const updateMed = (idx: number, patch: Partial<Medicine>) => {
        setMedicines(medicines.map((m, i) => i === idx ? { ...m, ...patch } : m));
    };
    const toggleMed = (idx: number) => updateMed(idx, { enabled: !medicines[idx].enabled });

    // ── Schedule helpers ─────────────────────────────────────────────
    const addSchedule = (med: Medicine) => {
        setSchedules([...schedules, {
            id: generateId(), medicineId: med.id,
            doseTime: '08:00', frequency: 'daily',
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7], enabled: true,
        }]);
    };
    const updateSched = (id: string, patch: Partial<Schedule>) => {
        setSchedules(schedules.map(s => s.id === id ? { ...s, ...patch } : s));
    };
    const removeSched = (id: string) => setSchedules(schedules.filter(s => s.id !== id));

    const activeMeds = medicines.filter(m => m.enabled);

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
                        <Pill className="w-7 h-7 text-navy-950" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">MediSync Setup</h1>
                    <p className="text-surface-400 text-sm mt-1">Configure your smart dispenser</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s}>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                i < stepIdx ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                                i === stepIdx ? 'bg-teal-500 text-navy-950' :
                                'bg-navy-800/50 text-surface-500 border border-navy-600/25'
                            }`}>
                                {i < stepIdx ? <CheckCircle2 className="w-3 h-3" /> : <span>{i+1}</span>}
                                {STEP_LABELS[i]}
                            </div>
                            {i < STEPS.length - 1 && <div className="w-6 h-px bg-navy-600/40" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Card */}
                <div className="card p-6">

                    {/* ── Step 1: Assign Slots ───────────────────────────── */}
                    {step === 'slots' && (
                        <>
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-teal-400" />
                                    <h2 className="text-lg font-bold text-white">Quick Start: AI Prescription</h2>
                                </div>
                                <PrescriptionUpload 
                                    medicines={medicines} setMedicines={setMedicines} 
                                    schedules={schedules} setSchedules={setSchedules} 
                                />
                            </div>
                            
                            <h2 className="heading-section mb-1 font-bold text-white"><Pill className="w-4 h-4 text-teal-400" /> Manual Slot Entry (Optional)</h2>
                            <p className="text-xs text-surface-400 mb-5 italic">Or refine the medicines extracted by AI below...</p>
                            <div className="space-y-3">
                                {medicines.map((med, i) => (
                                    <div key={med.id} className={`rounded-xl border p-4 transition-all ${med.enabled ? 'border-teal-500/30 bg-teal-500/5' : 'border-navy-600/25 bg-navy-800/30'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            {/* Color dot */}
                                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: COLOR_MAP[med.colorLabel as keyof typeof COLOR_MAP] ?? '#fff' }} />
                                            <span className="text-surface-400 text-xs font-bold w-12">SLOT {med.slotIndex}</span>
                                            <button
                                                onClick={() => toggleMed(i)}
                                                className={`ml-auto px-3 py-1 rounded-lg text-xs font-bold transition-all ${med.enabled ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-navy-700/50 text-surface-500 border border-navy-600/25'}`}
                                            >{med.enabled ? 'Enabled' : 'Disabled'}</button>
                                        </div>
                                        {med.enabled && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-label block mb-1">Medicine Name</label>
                                                    <input value={med.name} onChange={e => updateMed(i, { name: e.target.value })}
                                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500/50" placeholder="e.g. Metformin" />
                                                </div>
                                                <div>
                                                    <label className="text-label block mb-1">Quantity Loaded</label>
                                                    <input type="number" min={0} value={med.pillsTotal || ''} onChange={e => { const n = parseInt(e.target.value)||0; updateMed(i, { pillsTotal: n, pillsRemaining: n }); }}
                                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500/50" placeholder="e.g. 30" />
                                                </div>
                                                <div>
                                                    <label className="text-label block mb-1">Pills per Dose</label>
                                                    <input type="number" min={1} max={5} value={med.pillsPerDose} onChange={e => updateMed(i, { pillsPerDose: parseInt(e.target.value)||1 })}
                                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500/50" />
                                                </div>
                                                <div>
                                                    <label className="text-label block mb-1">Compartment Color</label>
                                                    <select value={med.colorLabel} onChange={e => updateMed(i, { colorLabel: e.target.value })}
                                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500/50">
                                                        {SLOT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Step 2: Set Schedule ───────────────────────────── */}
                    {step === 'schedule' && (
                        <>
                            <h2 className="heading-section mb-1"><Clock className="w-4 h-4 text-teal-400" /> Dose Schedule</h2>
                            <p className="text-xs text-surface-400 mb-5">Add when each medicine should be dispensed. The dashboard will automatically trigger the servo at those times.</p>
                            {activeMeds.length === 0 && (
                                <p className="text-amber-400 text-sm text-center py-4">No medicines enabled. Go back and enable at least one slot.</p>
                            )}
                            <div className="space-y-4">
                                {activeMeds.map(med => {
                                    const medScheds = schedules.filter(s => s.medicineId === med.id);
                                    const weekly = medScheds.reduce((acc, s) => acc + weeklyPillCount(s) * med.pillsPerDose, 0);
                                    return (
                                        <div key={med.id} className="rounded-xl border border-navy-600/25 bg-navy-800/30 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-3 h-3 rounded-full" style={{ background: COLOR_MAP[med.colorLabel as keyof typeof COLOR_MAP] ?? '#fff' }} />
                                                <span className="text-white font-bold text-sm">{med.name || `Slot ${med.slotIndex}`}</span>
                                                <span className="ml-auto text-xs text-teal-400 font-mono">{weekly} pills/week</span>
                                            </div>
                                            {medScheds.map(s => (
                                                <div key={s.id} className="flex items-center gap-2 mb-2">
                                                    <input type="time" value={s.doseTime} onChange={e => updateSched(s.id, { doseTime: e.target.value })}
                                                        className="bg-navy-900/60 border border-navy-600/30 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-teal-500/50" />
                                                    <select value={s.frequency} onChange={e => updateSched(s.id, { frequency: e.target.value as Schedule['frequency'] })}
                                                        className="flex-1 bg-navy-900/60 border border-navy-600/30 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-teal-500/50">
                                                        {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>
                                                    <button onClick={() => removeSched(s.id)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
                                                </div>
                                            ))}
                                            <button onClick={() => addSchedule(med)} className="text-xs text-teal-400 hover:text-teal-300 mt-1">+ Add time</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Step 3: Caregiver ─────────────────────────────── */}
                    {step === 'caregiver' && (
                        <>
                            <h2 className="heading-section mb-1"><UserRound className="w-4 h-4 text-teal-400" /> Caregiver Alerts</h2>
                            <p className="text-xs text-surface-400 mb-5">If a dose is missed for 5+ minutes, we'll notify your caregiver automatically via Email and SMS.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-label block mb-1">Caregiver Name</label>
                                    <input value={caregiver.name} onChange={e => setCaregiver({ ...caregiver, name: e.target.value })}
                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50" placeholder="e.g. Mom / Dr. Sharma" />
                                </div>
                                <div>
                                    <label className="text-label block mb-1">Email Address</label>
                                    <input type="email" value={caregiver.email} onChange={e => setCaregiver({ ...caregiver, email: e.target.value })}
                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50" placeholder="caregiver@example.com" />
                                </div>
                                <div>
                                    <label className="text-label block mb-1">Phone Number (for SMS)</label>
                                    <input type="tel" value={caregiver.phone} onChange={e => setCaregiver({ ...caregiver, phone: e.target.value })}
                                        className="w-full bg-navy-900/60 border border-navy-600/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-teal-500/50" placeholder="+919876543210" />
                                    <p className="text-xs text-surface-500 mt-1">Include country code (e.g., +91 for India)</p>
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={caregiver.notifyEmail} onChange={e => setCaregiver({ ...caregiver, notifyEmail: e.target.checked })} className="accent-teal-500" />
                                        <span className="text-sm text-surface-300">Email alerts</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={caregiver.notifySms} onChange={e => setCaregiver({ ...caregiver, notifySms: e.target.checked })} className="accent-teal-500" />
                                        <span className="text-sm text-surface-300">SMS alerts</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-6 pt-4 border-t border-navy-700/30">
                        <button onClick={() => setStep(STEPS[stepIdx - 1])} disabled={stepIdx === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800/50 border border-navy-600/25 text-surface-300 text-sm font-bold disabled:opacity-30 hover:border-navy-500/40 transition-all">
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        {stepIdx < STEPS.length - 1 ? (
                            <button onClick={() => setStep(STEPS[stepIdx + 1])}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 text-navy-950 font-bold text-sm hover:bg-teal-400 transition-all">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={onFinish}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 text-navy-950 font-bold text-sm hover:bg-teal-400 transition-all">
                                <Play className="w-4 h-4" /> Start My Cycle
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

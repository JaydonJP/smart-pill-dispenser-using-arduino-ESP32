import React, { useState } from 'react';
import {
    CalendarClock, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Pill, X,
} from 'lucide-react';
import { PillSlot } from '../types';
import { frequencyLabel, pillPercentage, pillBarColor, pillBarGlow } from '../utils/helpers';

interface Props {
    slots: PillSlot[];
    onAdd: (slot: Omit<PillSlot, 'id'>) => void;
    onUpdate: (id: string, updates: Partial<PillSlot>) => void;
    onRemove: (id: string) => void;
    onSync: () => void;
}

export const SchedulePanel: React.FC<Props> = ({
    slots, onAdd, onUpdate, onRemove, onSync,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        dosageTime: '08:00',
        frequency: 'daily' as PillSlot['frequency'],
        pillsTotal: 30,
    });

    const handleAdd = () => {
        if (!form.name.trim()) return;
        onAdd({
            name: form.name.trim(),
            dosageTime: form.dosageTime,
            frequency: form.frequency,
            pillsRemaining: form.pillsTotal,
            pillsTotal: form.pillsTotal,
            enabled: true,
            slotIndex: slots.length,
        });
        setForm({ name: '', dosageTime: '08:00', frequency: 'daily', pillsTotal: 30 });
        setShowForm(false);
        onSync();
    };

    return (
        <div className="card p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                        <CalendarClock className="w-4 h-4 text-teal-400" />
                    </div>
                    Pill Schedule
                </h2>
                <div className="flex gap-2">
                    <button onClick={onSync} className="btn-outline text-xs px-3 py-1.5">
                        Sync RTC
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-primary text-xs px-3 py-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Slot
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="mb-6 p-5 bg-navy-800/60 rounded-xl border border-navy-600/30 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-white">New Medication</p>
                        <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                            className="input-field sm:col-span-2"
                            placeholder="Medication name (e.g. Aspirin)"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-surface-400 flex-shrink-0" />
                            <input
                                type="time"
                                className="input-field"
                                value={form.dosageTime}
                                onChange={e => setForm(f => ({ ...f, dosageTime: e.target.value }))}
                            />
                        </div>
                        <select
                            className="input-field"
                            value={form.frequency}
                            onChange={e => setForm(f => ({ ...f, frequency: e.target.value as PillSlot['frequency'] }))}
                        >
                            <option value="daily">Daily</option>
                            <option value="twice_daily">Twice Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <label className="text-label whitespace-nowrap !mt-0">Total Pills</label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            className="input-field w-24"
                            value={form.pillsTotal}
                            onChange={e => setForm(f => ({ ...f, pillsTotal: parseInt(e.target.value) || 30 }))}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancel</button>
                        <button onClick={handleAdd} className="btn-primary text-xs">
                            <Plus className="w-3 h-3" />
                            Add Medication
                        </button>
                    </div>
                </div>
            )}

            {/* Slots List */}
            <div className="space-y-2.5">
                {slots.length === 0 && (
                    <div className="text-center py-10 text-surface-400">
                        <Pill className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No medications scheduled yet.</p>
                        <p className="text-xs text-surface-500 mt-1">Click "Add Slot" to get started.</p>
                    </div>
                )}
                {slots.map(slot => {
                    const pct = pillPercentage(slot);
                    return (
                        <div
                            key={slot.id}
                            className={`group relative p-4 rounded-xl border transition-all duration-200 ${slot.enabled
                                ? 'bg-navy-800/40 border-navy-600/25 hover:border-teal-600/25 hover:bg-navy-800/60'
                                : 'bg-navy-800/20 border-navy-700/15 opacity-50'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider ${slot.enabled
                                        ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                                        : 'bg-navy-700/40 border border-navy-600/20 text-surface-500'
                                        }`}>
                                        S{slot.slotIndex + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white text-sm">{slot.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-teal-400/80 font-mono">{slot.dosageTime}</span>
                                            <span className="w-1 h-1 rounded-full bg-surface-600" />
                                            <span className="text-xs text-surface-400">{frequencyLabel(slot.frequency)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => { onUpdate(slot.id, { enabled: !slot.enabled }); onSync(); }}
                                        className="p-1.5 rounded-lg transition-colors hover:bg-navy-700/50"
                                        title={slot.enabled ? 'Disable' : 'Enable'}
                                    >
                                        {slot.enabled
                                            ? <ToggleRight className="w-5 h-5 text-teal-400" />
                                            : <ToggleLeft className="w-5 h-5 text-surface-500" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => { onRemove(slot.id); onSync(); }}
                                        className="p-1.5 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Inventory Mini Bar */}
                            <div className="flex items-center gap-3">
                                <div className="bar-track flex-1">
                                    <div
                                        className={`bar-fill ${pillBarColor(pct)} ${pillBarGlow(pct)}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-mono font-bold ${pct > 50 ? 'text-teal-400' : pct > 20 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                    {slot.pillsRemaining}/{slot.pillsTotal}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

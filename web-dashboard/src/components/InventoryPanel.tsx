import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { Medicine, Schedule, COLOR_MAP, SlotColor } from '../types';
import { pillPct, pillBarColor, weeklyPillCount } from '../utils/helpers';

interface Props {
    medicines: Medicine[];
    schedules: Schedule[];
    onRefill: (id: string, total: number) => void;
}

export const InventoryPanel: React.FC<Props> = ({ medicines, schedules, onRefill }) => {
    const enabled = medicines.filter(m => m.enabled);

    return (
        <div className="card p-5">
            <h2 className="heading-section mb-5"><Package className="w-4 h-4 text-teal-400" /> Inventory & Refill Guide</h2>
            
            {enabled.length === 0 && (
                <p className="text-surface-500 text-sm text-center py-6">No medicines configured. Complete setup first.</p>
            )}

            <div className="space-y-4">
                {enabled.map(med => {
                    const pct = pillPct(med);
                    const medScheds = schedules.filter(s => s.medicineId === med.id && s.enabled);
                    const weeklyTotal = medScheds.reduce((a, s) => a + weeklyPillCount(s) * med.pillsPerDose, 0);
                    const weeksLeft = weeklyTotal > 0 ? (med.pillsRemaining / weeklyTotal).toFixed(1) : '∞';
                    const isEmpty = med.pillsRemaining === 0;
                    const isLow = pct <= 20 && !isEmpty;

                    return (
                        <div key={med.id} className={`rounded-xl border p-4 ${isEmpty ? 'border-red-500/30 bg-red-500/5' : isLow ? 'border-amber-500/30 bg-amber-500/5' : 'border-navy-600/25 bg-navy-800/30'}`}>
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: COLOR_MAP[med.colorLabel as SlotColor] ?? '#fff' }} />
                                <span className="text-white font-bold text-sm flex-1">{med.name}</span>
                                <span className="text-xs text-surface-500 font-mono">Slot {med.slotIndex}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-navy-700/50 rounded-full h-2 mb-2">
                                <div className={`${pillBarColor(pct)} rounded-full h-2 transition-all`} style={{ width: `${pct}%` }} />
                            </div>

                            {/* Stats Row */}
                            <div className="flex justify-between text-xs text-surface-400 mb-3">
                                <span>{med.pillsRemaining}/{med.pillsTotal} pills</span>
                                <span>{pct}% remaining</span>
                                <span>{weeksLeft} weeks supply</span>
                            </div>

                            {/* Weekly count */}
                            {weeklyTotal > 0 && (
                                <p className="text-xs text-teal-400/80 mb-3">📊 {weeklyTotal} pills needed per week</p>
                            )}

                            {/* Refill instruction if empty or low */}
                            {(isEmpty || isLow) && (
                                <div className={`flex items-start gap-2 rounded-lg p-3 mb-3 ${isEmpty ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                                    <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isEmpty ? 'text-red-400' : 'text-amber-400'}`} />
                                    <div className="text-xs">
                                        <p className={`font-bold mb-0.5 ${isEmpty ? 'text-red-300' : 'text-amber-300'}`}>
                                            {isEmpty ? 'Slot Empty — Refill Required' : 'Running Low — Refill Soon'}
                                        </p>
                                        <p className={isEmpty ? 'text-red-300/70' : 'text-amber-300/70'}>
                                            Open the dispenser cover. Locate the <strong>{med.colorLabel}</strong> compartment (Slot {med.slotIndex}). 
                                            Add <strong>{weeklyTotal * 2}</strong> tablets for a 2-week supply.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Refill Button */}
                            <button onClick={() => onRefill(med.id, med.pillsTotal)}
                                className="w-full text-xs py-2 rounded-lg bg-navy-700/50 border border-navy-600/25 text-surface-300 hover:border-teal-500/30 hover:text-teal-400 transition-all font-medium">
                                ↺ Mark as Refilled
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

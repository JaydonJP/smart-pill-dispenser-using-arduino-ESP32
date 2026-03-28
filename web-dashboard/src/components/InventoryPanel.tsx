import React from 'react';
import { Package, AlertCircle, RefreshCw } from 'lucide-react';
import { PillSlot } from '../types';
import { pillPercentage, pillBarColor, pillBarGlow } from '../utils/helpers';

interface Props {
    slots: PillSlot[];
    onRefill: (id: string) => void;
}

export const InventoryPanel: React.FC<Props> = ({ slots, onRefill }) => {
    const lowStock = slots.filter(s => pillPercentage(s) <= 20 && s.enabled);
    const totalPills = slots.reduce((sum, s) => sum + s.pillsRemaining, 0);
    const totalCapacity = slots.reduce((sum, s) => sum + s.pillsTotal, 0);

    return (
        <div className="card p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="heading-section">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                        <Package className="w-4 h-4 text-teal-400" />
                    </div>
                    Inventory
                </h2>
                {lowStock.length > 0 && (
                    <span className="badge-warning">
                        <AlertCircle className="w-3 h-3" />
                        {lowStock.length} Low
                    </span>
                )}
            </div>

            {/* Total Overview */}
            <div className="mb-5 p-3.5 bg-navy-800/40 rounded-xl border border-navy-600/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-label !mt-0">Total Inventory</span>
                    <span className="text-sm font-bold text-white">{totalPills} / {totalCapacity}</span>
                </div>
                <div className="bar-track !h-2">
                    <div
                        className="bar-fill bg-gradient-to-r from-teal-500 to-teal-400"
                        style={{ width: `${totalCapacity > 0 ? (totalPills / totalCapacity) * 100 : 0}%` }}
                    />
                </div>
            </div>

            {/* Inventory Cards */}
            <div className="space-y-3">
                {slots.map(slot => {
                    const pct = pillPercentage(slot);
                    const isLow = pct <= 20 && slot.enabled;
                    return (
                        <div
                            key={slot.id}
                            className={`p-4 rounded-xl border transition-all duration-200 ${isLow
                                    ? 'bg-red-500/5 border-red-500/15 hover:border-red-500/25'
                                    : 'bg-navy-800/30 border-navy-600/20 hover:border-navy-500/30'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isLow
                                            ? 'bg-red-500/15 border border-red-500/20 text-red-400'
                                            : 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                                        }`}>
                                        S{slot.slotIndex + 1}
                                    </div>
                                    <span className="text-sm font-semibold text-white">{slot.name}</span>
                                </div>
                                {isLow && (
                                    <button
                                        onClick={() => onRefill(slot.id)}
                                        className="btn-primary text-[11px] px-3 py-1.5 !rounded-lg"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Refill
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bar-track flex-1">
                                    <div
                                        className={`bar-fill ${pillBarColor(pct)} ${pillBarGlow(pct)}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className={`text-sm font-mono font-bold min-w-[56px] text-right ${pct > 50 ? 'text-teal-400' : pct > 20 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                    {slot.pillsRemaining}/{slot.pillsTotal}
                                </span>
                            </div>

                            {isLow && (
                                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-red-300/70">
                                    <AlertCircle className="w-3 h-3" />
                                    Low stock — {slot.pillsRemaining} pills remaining
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

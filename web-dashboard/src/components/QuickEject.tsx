import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ShieldAlert, Lock, Unlock, AlertTriangle, ChevronRight } from 'lucide-react';
import { Medicine, Schedule, COLOR_MAP, SlotColor } from '../types';

interface Props {
    medicines: Medicine[];
    schedules: Schedule[];
    safetyLocked: boolean;
    onToggleLock: () => void;
    onQuickEject: () => void;
}

export const QuickEject: React.FC<Props> = ({
    medicines, schedules, safetyLocked, onToggleLock, onQuickEject,
}) => {
    const [slideProgress, setSlideProgress] = useState(0);
    const [isSliding, setIsSliding] = useState(false);
    const [ejected, setEjected] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    // Deduce next due slot
    const now = new Date();
    const hhMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const enabledScheds = schedules.filter(s => s.enabled).sort((a, b) => a.doseTime.localeCompare(b.doseTime));
    const nextSched = enabledScheds.find(s => s.doseTime >= hhMM) ?? enabledScheds[0];
    const nextMed = nextSched ? medicines.find(m => m.id === nextSched.medicineId && m.pillsRemaining > 0) : null;

    useEffect(() => {
        if (ejected) { const t = setTimeout(() => setEjected(false), 3000); return () => clearTimeout(t); }
    }, [ejected]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (safetyLocked || !nextMed) return;
        setIsSliding(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isSliding || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const thumbW = 72;
        const maxTravel = rect.width - thumbW - 8;
        const progress = Math.max(0, Math.min(1, (e.clientX - rect.left - thumbW / 2) / maxTravel));
        setSlideProgress(progress);
        if (progress >= 0.95) {
            setIsSliding(false);
            setEjected(true);
            onQuickEject();
            setTimeout(() => setSlideProgress(0), 500);
        }
    };

    const thumbLeft = (() => {
        if (!trackRef.current) return 4;
        return 4 + slideProgress * (trackRef.current.getBoundingClientRect().width - 72 - 8);
    })();

    return (
        <div className="card p-5 h-full border-red-500/10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading-section">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Quick Eject
                </h2>
                <button onClick={onToggleLock}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${safetyLocked
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse-soft'}`}>
                    {safetyLocked ? <><Lock className="w-3 h-3" /> SAFETY ON</> : <><Unlock className="w-3 h-3" /> UNLOCKED</>}
                </button>
            </div>

            <p className="text-xs text-surface-400 mb-5">Immediately dispenses the next due medicine, bypassing the timer. System auto-selects based on your schedule.</p>

            {/* Next due card */}
            <div className="mb-5">
                <label className="text-label block mb-2">Next Dose to Eject</label>
                {nextMed && nextSched ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-800/80 border border-teal-500/30">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: COLOR_MAP[nextMed.colorLabel as SlotColor] ?? '#fff' }} />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm">{nextMed.name}</p>
                            <p className="text-[11px] text-surface-500">Slot {nextMed.slotIndex} · {nextMed.pillsRemaining} pills left</p>
                        </div>
                        <span className="text-teal-400 font-mono text-sm">{nextSched.doseTime}</span>
                    </div>
                ) : (
                    <div className="px-4 py-3 rounded-xl bg-navy-800/50 border border-red-500/20 text-surface-500 text-sm">
                        No medicines available
                    </div>
                )}
            </div>

            {/* Warnings */}
            {!safetyLocked && nextMed && !ejected && (
                <div className="mb-4 px-3 py-2.5 bg-red-500/5 border border-red-500/15 rounded-xl flex items-center gap-2 animate-slide-up">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300/80">Slide to dispense <strong>{nextMed.name}</strong> now.</p>
                </div>
            )}
            {ejected && nextMed && (
                <div className="mb-4 px-4 py-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-center animate-slide-up">
                    <p className="text-teal-300 font-bold text-sm">✅ Dispensed {nextMed.name} — Inventory Updated</p>
                </div>
            )}

            {/* Slide Track */}
            <div ref={trackRef}
                className={`slide-track ${(safetyLocked || !nextMed) ? 'opacity-30 pointer-events-none' : ''}`}
                onPointerUp={() => { if (isSliding && slideProgress < 0.95) { setSlideProgress(0); setIsSliding(false); } }}>
                <div className="slide-track-text">
                    {safetyLocked ? '🔒 UNLOCK SAFETY FIRST' : '⟩⟩⟩ SLIDE TO EJECT ⟩⟩⟩'}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-500/40 rounded-2xl"
                    style={{ opacity: slideProgress, width: `${slideProgress * 100}%` }} />
                <div className="slide-thumb"
                    style={{ left: `${thumbLeft}px`, transition: isSliding ? 'none' : 'left 0.3s ease-out' }}
                    onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
                    <ChevronRight className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
};

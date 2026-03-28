import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, ChevronRight, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { PillSlot } from '../types';

interface Props {
    slots: PillSlot[];
    safetyLocked: boolean;
    onToggleLock: () => void;
    onEmergencyDispense: (slotIndex: number) => void;
    mqttSendDispense: (slot: number, priority: 'emergency') => void;
}

export const EmergencyEject: React.FC<Props> = ({
    slots, safetyLocked, onToggleLock, onEmergencyDispense, mqttSendDispense,
}) => {
    const [slideProgress, setSlideProgress] = useState(0);
    const [isSliding, setIsSliding] = useState(false);
    const [ejected, setEjected] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    // DEDUCE NEXT SLOT
    const now = new Date();
    const currentHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const validSlots = slots.filter(s => s.enabled && s.pillsRemaining > 0);
    const sorted = validSlots.sort((a, b) => a.dosageTime.localeCompare(b.dosageTime));
    const nextSlot = sorted.length > 0 ? (sorted.find(s => s.dosageTime >= currentHHMM) || sorted[0]) : null;

    const resetSlide = useCallback(() => {
        setSlideProgress(0);
        setIsSliding(false);
    }, []);

    useEffect(() => {
        if (ejected) {
            const t = setTimeout(() => setEjected(false), 3000);
            return () => clearTimeout(t);
        }
    }, [ejected]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (safetyLocked) return;
        setIsSliding(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isSliding || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const thumbWidth = 72;
        const maxTravel = rect.width - thumbWidth - 8;
        const x = e.clientX - rect.left - thumbWidth / 2;
        const progress = Math.max(0, Math.min(1, x / maxTravel));
        setSlideProgress(progress);

        if (progress >= 0.95 && nextSlot) {
            setIsSliding(false);
            setEjected(true);
            onEmergencyDispense(nextSlot.slotIndex);
            mqttSendDispense(nextSlot.slotIndex, 'emergency');
            setTimeout(() => setSlideProgress(0), 500);
        }
    };

    const handlePointerUp = () => {
        if (isSliding && slideProgress < 0.95) {
            resetSlide();
        }
    };

    const thumbLeft = (() => {
        if (!trackRef.current) return 4;
        const maxTravel = trackRef.current.getBoundingClientRect().width - 72 - 8;
        return 4 + slideProgress * maxTravel;
    })();

    return (
        <div className="card p-6 animate-fade-in h-full border-red-500/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="heading-section">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    Emergency Quick Eject
                </h2>
                <button
                    onClick={onToggleLock}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${safetyLocked
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15'
                        : 'bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse-soft hover:bg-red-500/15'
                        }`}
                >
                    {safetyLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    {safetyLocked ? 'SAFETY ON' : 'UNLOCKED'}
                </button>
            </div>

            {/* Description */}
            <p className="text-xs text-surface-400 mb-6 leading-relaxed">
                Trigger an immediate servo dispense, bypassing all scheduled timers. 
                Unlock the safety first, then slide to confirm. The system will auto-eject the most relevant dose.
            </p>

            {/* Next Due Indicator */}
            <div className="mb-6">
                <label className="text-label mb-2.5 block">Next Scheduled Dose to Eject</label>
                {nextSlot ? (
                    <div className="py-3 px-4 rounded-xl text-sm font-bold bg-navy-800/80 border border-teal-500/30 flex items-center justify-between">
                        <span className="text-white">{nextSlot.name}</span>
                        <span className="text-teal-400 font-mono">{nextSlot.dosageTime}</span>
                    </div>
                ) : (
                    <div className="py-3 px-4 rounded-xl text-sm font-bold bg-navy-800/50 border border-red-500/20 text-surface-500">
                        No pills loaded / enabled.
                    </div>
                )}
            </div>

            {/* Safety Warning */}
            {!safetyLocked && !ejected && nextSlot && (
                <div className="mb-4 px-4 py-2.5 bg-red-500/5 border border-red-500/15 rounded-xl flex items-center gap-2.5 animate-slide-up">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300/80">
                        Safety disengaged — slide below to immediately dispense <strong>{nextSlot.name}</strong>.
                    </p>
                </div>
            )}

            {/* Ejected Confirmation */}
            {ejected && nextSlot && (
                <div className="mb-4 px-4 py-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-center animate-slide-up">
                    <p className="text-teal-300 font-bold text-sm">
                        ✅ Dispensing {nextSlot.name} — Inventory Updated
                    </p>
                </div>
            )}

            {/* Slide to Confirm */}
            <div
                ref={trackRef}
                className={`slide-track ${ (safetyLocked || !nextSlot) ? 'opacity-30 pointer-events-none' : ''}`}
                onPointerUp={handlePointerUp}
            >
                <div className="slide-track-text">
                    {safetyLocked ? '🔒  UNLOCK SAFETY FIRST' : '⟩⟩⟩  SLIDE TO EJECT  ⟩⟩⟩'}
                </div>
                <div
                    className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-500/40 rounded-2xl transition-opacity"
                    style={{ opacity: slideProgress, width: `${slideProgress * 100}%` }}
                />
                <div
                    className="slide-thumb"
                    style={{ left: `${thumbLeft}px`, transition: isSliding ? 'none' : 'left 0.3s ease-out' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
};

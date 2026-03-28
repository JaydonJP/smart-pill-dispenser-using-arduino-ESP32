import React from 'react';
import { Activity, Wifi, WifiOff, Clock, Pill } from 'lucide-react';
import { MachineStatus, Medicine, Schedule } from '../types';
import { timeAgo, formatTime, getNextDoseTime } from '../utils/helpers';

interface Props {
    status: MachineStatus;
    connected: boolean;
    medicines: Medicine[];
    schedules: Schedule[];
    onRefresh: () => void;
}

export const StatusPanel: React.FC<Props> = ({ status, connected, medicines, schedules, onRefresh }) => {
    const next = getNextDoseTime(schedules);
    const enabledMeds = medicines.filter(m => m.enabled);
    const lowStock = medicines.filter(m => m.enabled && m.pillsRemaining <= 5);

    return (
        <div className="card p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading-section"><Activity className="w-4 h-4 text-teal-400" /> System Status</h2>
                <button onClick={onRefresh} className="text-xs text-surface-400 hover:text-teal-400 transition-colors">Refresh</button>
            </div>

            {/* Online Status */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${status.online ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                {status.online
                    ? <Wifi className="w-4 h-4 text-teal-400" />
                    : <WifiOff className="w-4 h-4 text-red-400" />}
                <div>
                    <p className={`text-sm font-bold ${status.online ? 'text-teal-300' : 'text-red-300'}`}>
                        {status.online ? 'Dispenser Online' : 'Dispenser Offline'}
                    </p>
                    <p className="text-xs text-surface-500">
                        {status.online ? `Heartbeat ${timeAgo(status.lastHeartbeat)}` : 'No signal'}
                    </p>
                </div>
                <div className={`w-2 h-2 rounded-full ml-auto ${status.online ? 'bg-teal-400 animate-pulse' : 'bg-red-500'}`} />
            </div>

            {/* MQTT & Cycle */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-navy-800/50 border border-navy-600/25 rounded-xl p-3">
                    <p className="text-label mb-1">MQTT</p>
                    <p className={`text-sm font-bold ${connected ? 'text-teal-400' : 'text-red-400'}`}>
                        {connected ? 'Connected' : 'Disconnected'}
                    </p>
                </div>
                <div className="bg-navy-800/50 border border-navy-600/25 rounded-xl p-3">
                    <p className="text-label mb-1">Cycle</p>
                    <p className={`text-sm font-bold ${status.cycleStarted ? 'text-teal-400' : 'text-amber-400'}`}>
                        {status.cycleStarted ? 'Running' : 'Idle'}
                    </p>
                </div>
            </div>

            {/* Next Dose */}
            <div className="bg-navy-800/50 border border-navy-600/25 rounded-xl p-3 mb-4">
                <p className="text-label mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Next Scheduled Dose</p>
                <p className="text-white font-bold">{next === '—' ? 'No schedule set' : formatTime(next)}</p>
            </div>

            {/* Low Stock Warning */}
            {lowStock.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-amber-400 text-xs font-bold mb-1">⚠️ Low Stock Alert</p>
                    {lowStock.map(m => (
                        <p key={m.id} className="text-xs text-amber-300/80">
                            Slot {m.slotIndex} ({m.name}): {m.pillsRemaining} pills left
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};

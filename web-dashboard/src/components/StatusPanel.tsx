import React from 'react';
import {
    Wifi, WifiOff, Clock, Activity, Signal, Cpu, RefreshCw,
} from 'lucide-react';
import { MachineStatus } from '../types';
import { formatTime, timeAgo } from '../utils/helpers';

interface Props {
    status: MachineStatus;
    mqttConnected: boolean;
    onRefresh: () => void;
}

export const StatusPanel: React.FC<Props> = ({ status, mqttConnected, onRefresh }) => {
    const isOnline = status.online && mqttConnected;

    return (
        <div className="card p-6 animate-fade-in h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="heading-section">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-teal-400" />
                    </div>
                    System Status
                </h2>
                <button onClick={onRefresh} className="btn-ghost p-2 rounded-lg" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Online/Offline Banner */}
            <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-6 transition-all duration-300 ${isOnline
                ? 'bg-teal-500/10 border border-teal-500/15'
                : 'bg-red-500/10 border border-red-500/15'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-teal-500/15' : 'bg-red-500/15'
                    }`}>
                    {isOnline ? (
                        <Wifi className="w-5 h-5 text-teal-400" />
                    ) : (
                        <WifiOff className="w-5 h-5 text-red-400" />
                    )}
                </div>
                <div className="flex-1">
                    <p className={`font-bold text-sm ${isOnline ? 'text-teal-300' : 'text-red-300'}`}>
                        {isOnline ? 'ESP32 Online' : 'Device Offline'}
                    </p>
                    <p className="text-[11px] text-surface-400 mt-0.5">
                        Heartbeat: {timeAgo(status.lastHeartbeat)}
                    </p>
                </div>
                <span className={isOnline ? 'badge-online' : 'badge-offline'}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-teal-400 animate-pulse-soft' : 'bg-red-400'
                        }`} />
                    {isOnline ? 'LIVE' : 'DOWN'}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={<Clock className="w-3.5 h-3.5 text-teal-400" />}
                    label="Last Dispensed"
                    value={timeAgo(status.lastDispensed)}
                />
                <StatCard
                    icon={<Clock className="w-3.5 h-3.5 text-amber-400" />}
                    label="Next Dose"
                    value={formatTime(status.nextScheduledDose)}
                />
                <StatCard
                    icon={<Signal className="w-3.5 h-3.5 text-teal-400" />}
                    label="WiFi Signal"
                    value={`${status.wifiRssi} dBm`}
                />
                <StatCard
                    icon={<Cpu className="w-3.5 h-3.5 text-purple-400" />}
                    label="Firmware"
                    value={`v${status.firmwareVersion}`}
                />
            </div>

            {/* Refill Mode Warning */}
            {status.refillMode && (
                <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 animate-slide-up">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 text-sm">
                        ⚠️
                    </div>
                    <p className="text-amber-300 text-sm font-medium">
                        Refill mode active — reload compartments.
                    </p>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
}> = ({ icon, label, value }) => (
    <div className="stat-card">
        <div className="flex items-center gap-1.5 mb-2">
            {icon}
            <span className="text-label !mt-0">{label}</span>
        </div>
        <p className="text-lg font-bold text-white tracking-tight">{value}</p>
    </div>
);

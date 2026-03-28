import React from 'react';
import { ScrollText, CheckCircle2, XCircle, Hand, Siren } from 'lucide-react';
import { DispenseLog } from '../types';
import { formatDateTime } from '../utils/helpers';

interface Props {
    logs: DispenseLog[];
}

const statusConfig: Record<DispenseLog['status'], {
    bg: string; text: string; icon: React.ReactNode; label: string;
}> = {
    success: { bg: 'bg-teal-500/10', text: 'text-teal-400', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Dispensed' },
    missed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: <XCircle className="w-4 h-4" />, label: 'Missed' },
    manual: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <Hand className="w-4 h-4" />, label: 'Manual' },
    emergency: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: <Siren className="w-4 h-4" />, label: 'Emergency' },
};

export const LogsPanel: React.FC<Props> = ({ logs }) => {
    const totalSuccess = logs.filter(l => l.status === 'success').length;
    const totalMissed = logs.filter(l => l.status === 'missed').length;
    const total = totalSuccess + totalMissed;

    return (
        <div className="card p-6 animate-fade-in h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="heading-section">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                        <ScrollText className="w-4 h-4 text-teal-400" />
                    </div>
                    Caregiver Logs
                </h2>
                <div className="flex gap-3 text-xs font-bold">
                    <span className="text-teal-400">{totalSuccess} ✓</span>
                    <span className="text-red-400">{totalMissed} ✗</span>
                </div>
            </div>

            {/* Compliance Bar */}
            {total > 0 && (
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-label !mt-0">Compliance Rate</span>
                        <span className="text-xs font-bold text-teal-400">
                            {Math.round((totalSuccess / total) * 100)}%
                        </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-navy-700/30">
                        <div
                            className="bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-700 rounded-full"
                            style={{ width: `${(totalSuccess / total) * 100}%` }}
                        />
                        <div
                            className="bg-red-500/70 transition-all duration-700"
                            style={{ width: `${(totalMissed / total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Log List */}
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {logs.length === 0 && (
                    <p className="text-center text-surface-400 text-sm py-10">No logs recorded yet.</p>
                )}
                {logs.map(log => {
                    const cfg = statusConfig[log.status];
                    return (
                        <div
                            key={log.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-800/30 border border-navy-700/15 hover:bg-navy-800/50 hover:border-navy-600/25 transition-all duration-200"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                                {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{log.slotName}</p>
                                <p className="text-[11px] text-surface-500">{formatDateTime(log.timestamp)}</p>
                            </div>
                            <span className={`${cfg.text} text-[11px] font-bold px-2.5 py-1 rounded-lg ${cfg.bg} border border-current/10`}>
                                {cfg.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

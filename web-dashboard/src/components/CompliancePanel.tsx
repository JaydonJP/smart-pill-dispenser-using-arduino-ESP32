import React from 'react';
import { BarChart2, TrendingUp } from 'lucide-react';
import { DispenseLog } from '../types';
import { formatDateTime, statusIcon } from '../utils/helpers';

interface Props { logs: DispenseLog[]; }

export const CompliancePanel: React.FC<Props> = ({ logs }) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const byDay = last7Days.map(day => {
        const dayLogs = logs.filter(l => l.dispensedAt.startsWith(day));
        const taken = dayLogs.filter(l => l.status === 'success' || l.status === 'manual').length;
        const missed = dayLogs.filter(l => l.status === 'missed').length;
        const total = taken + missed;
        return { day, taken, missed, total, pct: total === 0 ? 0 : Math.round((taken / total) * 100) };
    });

    const totalTaken  = logs.filter(l => l.status === 'success' || l.status === 'manual').length;
    const totalMissed = logs.filter(l => l.status === 'missed').length;
    const overallPct  = (totalTaken + totalMissed) === 0 ? 100
        : Math.round((totalTaken / (totalTaken + totalMissed)) * 100);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxBar = Math.max(...byDay.map(d => d.total), 1);

    return (
        <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
                <h2 className="heading-section"><BarChart2 className="w-4 h-4 text-teal-400" /> Compliance Report</h2>
                <div className="flex items-center gap-1.5 text-xs">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    <span className={`font-bold ${overallPct >= 80 ? 'text-teal-400' : overallPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {overallPct}% Overall
                    </span>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end gap-2 h-28 mb-4">
                {byDay.map((d, i) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end h-20 gap-0.5">
                            {d.missed > 0 && (
                                <div className="w-full bg-red-500/60 rounded-sm"
                                    style={{ height: `${(d.missed / maxBar) * 100}%`, minHeight: '4px' }} />
                            )}
                            {d.taken > 0 && (
                                <div className="w-full bg-teal-500 rounded-sm"
                                    style={{ height: `${(d.taken / maxBar) * 100}%`, minHeight: '4px' }} />
                            )}
                            {d.total === 0 && <div className="w-full h-1 bg-navy-700/40 rounded-sm" />}
                        </div>
                        <span className="text-[10px] text-surface-500">{dayNames[i % 7]}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-teal-500" /><span className="text-surface-400">Taken ({totalTaken})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" /><span className="text-surface-400">Missed ({totalMissed})</span></div>
            </div>

            {/* Recent Log */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {logs.slice(0, 10).map(log => (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-2 bg-navy-800/40 rounded-lg">
                        <span className="text-base">{statusIcon(log.status)}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium truncate">{log.medicineName}</p>
                            <p className="text-[10px] text-surface-500">{formatDateTime(log.dispensedAt)}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${
                            log.status === 'success' ? 'text-teal-400' :
                            log.status === 'missed' ? 'text-red-400' : 'text-amber-400'
                        }`}>{log.status}</span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <p className="text-surface-500 text-xs text-center py-4">No logs yet. Start a cycle to track compliance.</p>
                )}
            </div>
        </div>
    );
};

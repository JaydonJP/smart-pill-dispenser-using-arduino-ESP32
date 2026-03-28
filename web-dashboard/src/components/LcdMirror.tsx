import React, { useState } from 'react';
import { Monitor, Send, CheckCircle } from 'lucide-react';

interface Props {
    onSend: (line1: string, line2: string) => void;
}

export const LcdMirror: React.FC<Props> = ({ onSend }) => {
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [sent, setSent] = useState(false);

    const handleSend = () => {
        onSend(line1, line2);
        setSent(true);
        setTimeout(() => setSent(false), 2000);
    };

    return (
        <div className="card p-6 animate-fade-in h-full">
            <h2 className="heading-section mb-5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-teal-400" />
                </div>
                LCD Display Mirror
            </h2>

            {/* LCD Preview — realistic 16x2 character display */}
            <div className="mb-4 rounded-xl overflow-hidden border border-navy-600/30">
                {/* Enclosure top */}
                <div className="bg-[#0b1a2e] px-4 py-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-surface-500 tracking-[0.15em] uppercase">PCF8574 — 16×2 LCD</span>
                    <span className="text-[9px] text-surface-600 font-mono">I²C</span>
                </div>
                {/* Screen */}
                <div className="bg-[#001a0a] p-5 border-t border-[#0a2f1a]/60">
                    <div className="bg-[#002010] rounded-lg p-4 border border-[#004d1a]/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                        <p className="text-[#33ff66] text-[15px] font-mono tracking-[0.25em] leading-7 h-7 overflow-hidden"
                            style={{ textShadow: '0 0 8px rgba(51,255,102,0.4)' }}>
                            {(line1 || 'MEDISYNC v2.1').padEnd(16, ' ').slice(0, 16)}
                        </p>
                        <p className="text-[#33ff66] text-[15px] font-mono tracking-[0.25em] leading-7 h-7 overflow-hidden"
                            style={{ textShadow: '0 0 8px rgba(51,255,102,0.4)' }}>
                            {(line2 || 'READY...').padEnd(16, ' ').slice(0, 16)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2.5 mb-4">
                <div>
                    <label className="text-label mb-1 block">Line 1</label>
                    <input
                        className="input-field font-mono text-sm tracking-wider"
                        maxLength={16}
                        placeholder="Up to 16 characters"
                        value={line1}
                        onChange={e => setLine1(e.target.value.slice(0, 16))}
                    />
                </div>
                <div>
                    <label className="text-label mb-1 block">Line 2</label>
                    <input
                        className="input-field font-mono text-sm tracking-wider"
                        maxLength={16}
                        placeholder="Up to 16 characters"
                        value={line2}
                        onChange={e => setLine2(e.target.value.slice(0, 16))}
                    />
                </div>
            </div>

            <button
                onClick={handleSend}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${sent
                        ? 'bg-teal-500/15 text-teal-400 border border-teal-500/25'
                        : 'btn-primary'
                    }`}
            >
                {sent ? (
                    <>
                        <CheckCircle className="w-4 h-4" />
                        Sent to ESP32!
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        Push to LCD
                    </>
                )}
            </button>
        </div>
    );
};

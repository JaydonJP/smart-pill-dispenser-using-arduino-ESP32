import React, { useState, useCallback } from 'react';
import { FileImage, Sparkles, Upload, X, CheckCircle2, Loader } from 'lucide-react';
import { Medicine, Schedule } from '../types';
import { generateId } from '../utils/helpers';

interface Props {
    medicines: Medicine[];
    setMedicines: (m: Medicine[]) => void;
    schedules: Schedule[];
    setSchedules: (s: Schedule[]) => void;
}

// Gemini Vision parsing via browser fetch
// In production, this should go via a Supabase Edge Function to keep the API key server-side.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

async function parsePrescription(base64Image: string, mimeType: string): Promise<{ name: string; times: string[]; frequency: string }[]> {
    const prompt = `You are a medical assistant. Analyze this prescription image and extract all medicines.
Return ONLY a valid JSON array, no markdown, no explanation. Format:
[{"name":"Medicine Name","times":["08:00","20:00"],"frequency":"twice_daily"}]
Frequency options: "daily", "twice_daily", "weekly".
If a time is unclear, use a sensible default (morning=08:00, noon=12:00, evening=18:00, night=21:00).`;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Image } },
                ]}],
                generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
            }),
        }
    );
    const data = await res.json();
    if (data.error) {
        throw new Error(data.error.message || 'API Error');
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return [];
    }
}

export const PrescriptionUpload: React.FC<Props> = ({ medicines, setMedicines, schedules, setSchedules }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ name: string; times: string[]; frequency: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [applied, setApplied] = useState(false);

    const applyToScheduleParams = (parsedResults: any[]) => {
        const empty = medicines.filter(m => !m.enabled);
        const updated = [...medicines];
        const newScheds = [...schedules];

        parsedResults.forEach((r, i) => {
            const slot = empty[i];
            if (!slot) return; // No more empty slots
            const slotIdx = updated.findIndex(m => m.id === slot.id);
            updated[slotIdx] = { ...slot, name: r.name || 'Unknown', enabled: true, pillsRemaining: 10, pillsTotal: 10 };
            const times = Array.isArray(r.times) ? r.times : ['08:00'];
            times.forEach(t => {
                newScheds.push({
                    id: generateId(), medicineId: slot.id,
                    doseTime: typeof t === 'string' ? t : '08:00', frequency: r.frequency as Schedule['frequency'] || 'daily',
                    daysOfWeek: [1,2,3,4,5,6,7], enabled: true,
                });
            });
        });
        setMedicines(updated);
        setSchedules(newScheds);
        setApplied(true);
    };

    const analyze = async (base64Str: string, mimeType: string) => {
        if (!GEMINI_API_KEY) {
            setError('Set VITE_GEMINI_API_KEY in your .env file to enable AI parsing.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const base64 = base64Str.split(',')[1];
            const parsed = await parsePrescription(base64, mimeType);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                setError('No medicines found in image or invalid format.');
            } else {
                setResults(parsed);
                applyToScheduleParams(parsed);
            }
        } catch (e: any) {
            setError(e.message || 'Could not parse the prescription. Try a clearer image.');
        } finally {
            setLoading(false);
        }
    };

    const handleFile = useCallback((f: File) => {
        setFile(f);
        setResults([]);
        setApplied(false);
        setError(null);
        const reader = new FileReader();
        reader.onload = e => {
            const resultStr = e.target?.result as string;
            setPreview(resultStr);
            analyze(resultStr, f.type);
        };
        reader.readAsDataURL(f);
    }, [medicines, schedules]); // adding dependencies so analyze uses latest state

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    }, [handleFile]);

    return (
        <div className="card p-5">
            <h2 className="heading-section mb-1">
                <Sparkles className="w-4 h-4 text-teal-400" /> AI Prescription Reader
            </h2>
            <p className="text-xs text-surface-400 mb-5">
                Upload a photo of your doctor's prescription. Gemini Vision AI will automatically extract medicines,
                dosages, and timings and populate your schedule.
            </p>

            {/* Drop zone */}
            {!preview ? (
                <label
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="flex flex-col items-center justify-center gap-3 w-full h-40 border-2 border-dashed border-navy-600/40 rounded-2xl cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all">
                    <Upload className="w-8 h-8 text-surface-500" />
                    <p className="text-xs text-surface-400">Drag & drop or <span className="text-teal-400">browse</span></p>
                    <p className="text-[10px] text-surface-600">JPG, PNG, PDF (photo preferred)</p>
                    <input type="file" accept="image/*" hidden onChange={e => {
                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                        e.target.value = ''; // Reset so same file can be selected again
                    }} />
                </label>
            ) : (
                <div className="relative mb-4">
                    <img src={preview} alt="Prescription" className={`w-full h-48 object-cover rounded-xl border border-navy-600/25 ${loading ? 'opacity-50 blur-sm' : ''} transition-all`} />
                    
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950/40 rounded-xl">
                            <Loader className="w-8 h-8 text-teal-400 animate-spin mb-2" />
                            <p className="text-xs font-bold text-teal-400 animate-pulse">Analyzing with AI...</p>
                        </div>
                    )}

                    <button onClick={() => { setPreview(null); setFile(null); setResults([]); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-navy-900/80 rounded-full flex items-center justify-center text-surface-400 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Error */}
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

            {/* Parsed Results */}
            {results.length > 0 && applied && (
                <div className="mt-4 space-y-2">
                    <p className="text-label text-teal-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Schedule Auto-Updated</p>
                    {results.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-navy-800/60 border border-teal-500/20 rounded-xl">
                            <div>
                                <p className="text-white text-sm font-bold">{r.name}</p>
                                <p className="text-teal-400 text-xs">{r.times.join(', ')} · {r.frequency.replace('_', ' ')}</p>
                            </div>
                            <FileImage className="w-4 h-4 text-surface-500" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

import { Medicine, Schedule, DispenseLog } from '../types';

export function downloadReport(medicines: Medicine[], schedules: Schedule[], logs: DispenseLog[]) {
    let report = `MEDISYNC - PATIENT COMPLIANCE & INVENTORY REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `==============================================\n\n`;

    // 1. Inventory Summary
    report += `1. INVENTORY SUMMARY\n`;
    report += `--------------------\n`;
    report += `Slot | Medicine      | Remaining | Per Dose | Capacity\n`;
    medicines.forEach(m => {
        const name = (m.name || `Slot ${m.slotIndex}`).padEnd(14);
        report += `${m.slotIndex.toString().padEnd(4)} | ${name} | ${m.pillsRemaining.toString().padEnd(9)} | ${m.pillsPerDose.toString().padEnd(8)} | ${m.pillsTotal}\n`;
    });
    report += `\n`;

    // 2. Active Schedule
    report += `2. MEDICINE SCHEDULE\n`;
    report += `--------------------\n`;
    report += `Time  | Medicine      | Frequency\n`;
    schedules.filter(s => s.enabled).forEach(s => {
        const med = medicines.find(m => m.id === s.medicineId);
        const name = (med?.name || 'Unknown').padEnd(14);
        report += `${s.doseTime.padEnd(5)} | ${name} | ${s.frequency}\n`;
    });
    report += `\n`;

    // 3. Compliance Log
    report += `3. RECENT DISPENSE LOGS (COMPLIANCE)\n`;
    report += `------------------------------------\n`;
    report += `Date/Time           | Medicine      | Status    | Pills\n`;
    logs.forEach(l => {
        const date = new Date(l.dispensedAt).toLocaleString().padEnd(19);
        const name = (l.medicineName || 'Unknown').padEnd(14);
        const status = l.status.toUpperCase().padEnd(9);
        report += `${date} | ${name} | ${status} | ${l.pillsDispensed}\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediSync_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

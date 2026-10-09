import * as XLSX from 'xlsx';
import { EagleEyeDataset, SUBSYSTEM_LABELS } from '../../types';
import { getRegisterAddressByName } from '../registers/chx2000Registers';

/**
 * Builds the 'Parameter Metrics (Triad)' sheet with peak, min, settling (525s),
 * statistical bounds, and safety margins for all monitored sensor channels.
 */
export function buildParameterMetricsSheet(
  wb: XLSX.WorkBook,
  data: EagleEyeDataset
): void {
  const headers = [
    'Parameter / Sensor',
    'PLC Register',
    'Subsystem Category',
    'Engineering Unit',
    'Overall Test Peak (Max)',
    'Overall Test Minimum (Min)',
    'Final Settling Value (525s)',
    'Representative Baseline Range',
    'Worst-Case Margin Buffer',
    'Failed Checks Count',
    'Overall Sensor Verdict'
  ];

  const rows = Object.values(data.parameterStats).map(p => {
    const regAddr = getRegisterAddressByName(p.name);
    const regStr = regAddr !== undefined ? `Reg ${regAddr}` : '—';
    const peakVal = typeof p.peak === 'number' ? Number(p.peak.toFixed(3)) : p.peak;
    const minVal = typeof p.min === 'number' ? Number(p.min.toFixed(3)) : p.min;
    const setVal = typeof p.settling === 'number' ? Number(p.settling.toFixed(3)) : p.settling;
    const marginVal = p.worstMargin !== null ? Number(p.worstMargin.toFixed(3)) : '—';

    return [
      p.name,
      regStr,
      SUBSYSTEM_LABELS[p.category] || p.category,
      p.unit,
      peakVal ?? '—',
      minVal ?? '—',
      setVal ?? '—',
      p.requiredRangeSample || '—',
      marginVal,
      p.failCount,
      p.status.toUpperCase()
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 16 },
    { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 30 },
    { wch: 24 }, { wch: 18 }, { wch: 22 }
  ];

  const sheetName = 'Parameter Metrics (Triad)';
  if (wb.SheetNames.includes(sheetName)) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

/**
 * Builds the 'Full Step-by-Step Log' sheet recording all 1,372 evaluated checks
 * across the 10 test stages with dual delta and tolerance safety buffers.
 */
export function buildStepLogSheet(
  wb: XLSX.WorkBook,
  data: EagleEyeDataset
): void {
  const headers = [
    'Time (sec)',
    'Target Flow (LPM)',
    'Target DP (psi)',
    'Target Temp (°C)',
    'Parameter',
    'PLC Register',
    'Category',
    'Unit',
    'Measured Value',
    'Lower 3σ Limit',
    'Upper 3σ Limit',
    'Delta Lower (ΔL)',
    'Delta Upper (ΔU)',
    'Margin Buffer',
    'Status'
  ];

  const rows = data.evaluatedChecks.map(c => {
    const regAddr = getRegisterAddressByName(c.parameter);
    const regStr = regAddr !== undefined ? `Reg ${regAddr}` : '—';
    const measVal = typeof c.measured === 'number' ? Number(c.measured.toFixed(3)) : c.measured;
    const lowVal = typeof c.lowLimit === 'number' ? Number(c.lowLimit.toFixed(3)) : c.lowLimit;
    const highVal = typeof c.highLimit === 'number' ? Number(c.highLimit.toFixed(3)) : c.highLimit;
    const dLower = c.deltaLower !== null ? Number(c.deltaLower.toFixed(3)) : '—';
    const dUpper = c.deltaUpper !== null ? Number(c.deltaUpper.toFixed(3)) : '—';
    const buf = c.marginBuffer !== null ? Number(c.marginBuffer.toFixed(3)) : '—';

    return [
      c.timeSec,
      c.flowSp ?? '—',
      c.dpSp ?? '—',
      c.tempSp ?? '—',
      c.parameter,
      regStr,
      SUBSYSTEM_LABELS[c.category] || c.category,
      c.unit,
      measVal,
      lowVal ?? '—',
      highVal ?? '—',
      dLower,
      dUpper,
      buf,
      c.status.toUpperCase()
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    { wch: 28 }, { wch: 14 }, { wch: 24 }, { wch: 10 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 12 }
  ];

  const sheetName = 'Full Step-by-Step Log';
  if (wb.SheetNames.includes(sheetName)) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

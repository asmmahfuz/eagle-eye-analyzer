import * as XLSX from 'xlsx';
import { EagleEyeDataset, SUBSYSTEM_LABELS } from '../../types';
import { getExcursionDeficitInfo, getSubsystemRootCauseAction } from '../../components/views/common/diagnosticUtils';
import { getRegisterAddressByName } from '../registers/chx2000Registers';

/**
 * Builds the official 'Failure Diagnostics' (Punch-List) sheet with complete
 * mathematical deficits, register addresses, and shopfloor rework directives.
 */
export function buildPunchlistSheet(
  wb: XLSX.WorkBook,
  data: EagleEyeDataset
): void {
  const headers = [
    'Time (sec)',
    'Target Flow (LPM)',
    'Target DP (psi)',
    'Target Temp (°C)',
    'Failed Parameter',
    'PLC Register',
    'Subsystem Category',
    'Unit',
    'Measured Value',
    'Lower 3σ Limit',
    'Upper 3σ Limit',
    'Nominal Mean (μ)',
    'Exact Deficit Amount',
    'Percentage Deficit',
    'Breach Direction',
    'Reason of Failure',
    'Shopfloor Remediation Directive'
  ];

  const rows = data.failures.map(f => {
    const deficitInfo = getExcursionDeficitInfo(f);
    const regAddr = getRegisterAddressByName(f.parameter);
    const regStr = regAddr !== undefined ? `Reg ${regAddr}` : '—';
    const rc = getSubsystemRootCauseAction(f.category, f.parameter);

    const measuredVal = typeof f.measured === 'number' ? Number(f.measured.toFixed(3)) : f.measured;
    const lowLimitVal = typeof f.lowLimit === 'number' ? Number(f.lowLimit.toFixed(3)) : f.lowLimit;
    const highLimitVal = typeof f.highLimit === 'number' ? Number(f.highLimit.toFixed(3)) : f.highLimit;
    const meanVal = typeof f.nominalMean === 'number' ? Number(f.nominalMean.toFixed(3)) : f.nominalMean;

    return [
      f.timeSec,
      f.flowSp ?? '—',
      f.dpSp ?? '—',
      f.tempSp ?? '—',
      f.parameter,
      regStr,
      SUBSYSTEM_LABELS[f.category] || f.category,
      f.unit,
      measuredVal,
      lowLimitVal ?? '—',
      highLimitVal ?? '—',
      meanVal ?? '—',
      Number(deficitInfo.deltaVal.toFixed(3)),
      deficitInfo.percentStr,
      deficitInfo.isLower ? 'BELOW LOWER 3σ' : deficitInfo.isUpper ? 'ABOVE UPPER 3σ' : 'OUT OF TOLERANCE',
      f.failureReason || 'Exceeded statistical 3-sigma tolerance limit',
      rc.action
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  ws['!cols'] = [
    { wch: 12 }, // Time
    { wch: 18 }, // Flow SP
    { wch: 16 }, // DP SP
    { wch: 16 }, // Temp SP
    { wch: 28 }, // Failed Parameter
    { wch: 14 }, // PLC Register
    { wch: 26 }, // Category
    { wch: 10 }, // Unit
    { wch: 16 }, // Measured
    { wch: 16 }, // Low Limit
    { wch: 16 }, // High Limit
    { wch: 16 }, // Mean
    { wch: 20 }, // Deficit
    { wch: 18 }, // % Deficit
    { wch: 20 }, // Breach Direction
    { wch: 42 }, // Reason
    { wch: 55 }  // Directive
  ];

  const sheetName = 'Failure Diagnostics';
  if (wb.SheetNames.includes(sheetName)) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

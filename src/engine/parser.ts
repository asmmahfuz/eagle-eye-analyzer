import * as XLSX from 'xlsx';
import { EagleEyeDataset, TestMetadata, SubsystemCategory } from '../types';
import { analyzeDataset } from './marginMath';

export const SENSOR_CATEGORIES: Record<string, SubsystemCategory> = {
  // Hydraulic & Flow Transmitters
  'Primary DP (Supply - Return)': 'hydraulic',
  'Secondary DP (Supply - Return)': 'hydraulic',
  'Secondary Diff Pres': 'hydraulic',
  'Pump 31 Filter DP': 'hydraulic',
  'Pump 41 Filter DP': 'hydraulic',
  'Primary Filter 53 DP': 'hydraulic',
  'FT01': 'hydraulic',
  'FT61': 'hydraulic',
  'FT61/61v': 'hydraulic',
  'FCV61': 'hydraulic',
  'FCV61 Actual Flow%': 'hydraulic',
  'FCV61 Actual Open%': 'hydraulic',
  'Manual Valve Flow%': 'hydraulic',

  // Pumps & VFDs
  'P31 Speed %': 'pump',
  'P41 Speed %': 'pump',
  'P31': 'pump',
  'P41': 'pump',
  'P11': 'pump',
  'P12': 'pump',
  'Reservoir Fill Pump (P12)': 'pump',
  'System Fill Pump (P11)': 'pump',
  'Minimum Pump Speed': 'pump',
  'Maximum Pump Speed': 'pump',

  // Environmental & Ambient
  'Air Humidity': 'environmental',
  'Air Temperature': 'environmental',
  'Ambient': 'environmental',
  'Dewpoint': 'environmental',

  // System, Discrete I/O & Firmware
  'Program version': 'system',
  'Status (0-off 1-on)': 'system',
  'Group (0-standalone 1-Group lead 2-Group follow)': 'system',
  'Contactor Enable (O0)': 'system',
  'AC Power Monitor (I8)': 'system',
  'DC Power Status (I9)': 'system',
  'LD01 (I5)': 'system',
  'LD02 (I11)': 'system',
  'Reservoir Level': 'system',

  // Setpoints
  'Secondary Temperature Setpoint': 'setpoint',
  'Secondary DP Setpoint': 'setpoint',
  'Secondary Flow Setpoint': 'setpoint',
  'DP Setpoint': 'setpoint',
  'Flow Setpoint': 'setpoint'
};

export function getCategory(name: string): SubsystemCategory {
  if (SENSOR_CATEGORIES[name]) return SENSOR_CATEGORIES[name];
  const upper = name.trim().toUpperCase();

  // Temperature (TT transmitters, ambient temp, dewpoint)
  if (upper.startsWith('TT') || upper.includes('TEMP') || upper.includes('DEWPOINT')) return 'temperature';

  // Pressure (PT transmitters, DP, Diff Pres, filter)
  if (upper.startsWith('PT') || upper.includes('PRESS') || upper.includes('PSI') || upper.includes('DP') && !upper.includes('SETPOINT') && !upper.includes('SP')) {
    if (!upper.includes('FILTER DP') && !upper.includes('PRIMARY DP') && !upper.includes('SECONDARY DP')) {
      return 'pressure';
    }
  }

  // Hydraulic & Flow (Flow transmitters FT, DP loops, bypass valve FCV)
  if (upper.includes('DP') || upper.includes('FLOW') || upper.includes('FILTER') || upper.startsWith('FT') || upper.startsWith('FCV')) return 'hydraulic';

  // Pumps & VFD Drives (P31, P41, Fill pumps P11, P12, pump speeds)
  if (upper.includes('SPEED') || upper.includes('PUMP') || upper.startsWith('P3') || upper.startsWith('P4') || upper.startsWith('P1')) return 'pump';

  // Setpoints (Flow, DP, Temp setpoints)
  if (upper.includes('SETPOINT') || upper.includes('SP')) return 'setpoint';

  // Environmental (Humidity, Ambient room conditions)
  if (upper.includes('HUMIDITY') || upper.includes('AMBIENT') || upper.includes('AIR')) return 'environmental';

  // System, Discrete I/O, Leaks, Levels, Firmware
  if (
    upper.startsWith('LT') ||
    upper.startsWith('LD') ||
    upper.includes('LEAK') ||
    upper.includes('LEVEL') ||
    upper.includes('CONTACTOR') ||
    upper.includes('VERSION') ||
    upper.includes('STATUS') ||
    upper.includes('FIRMWARE') ||
    upper.includes('GROUP')
  ) {
    return 'system';
  }

  return 'other';
}

/**
 * Flexible sheet lookup supporting case-insensitivity, trimmed spaces, and common alias variations.
 */
export function findSheet(
  wb: XLSX.WorkBook,
  candidates: string[]
): { name: string; sheet: XLSX.WorkSheet } | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Exact match
  for (const c of candidates) {
    if (wb.Sheets[c]) return { name: c, sheet: wb.Sheets[c] };
  }

  // 2. Normalized match (ignores casing, spaces, underscores, dashes)
  for (const c of candidates) {
    const target = norm(c);
    const match = wb.SheetNames.find(n => norm(n) === target);
    if (match && wb.Sheets[match]) return { name: match, sheet: wb.Sheets[match] };
  }

  return undefined;
}

/**
 * Detects measurement sheet by candidate names or by scanning sheet contents for tabular data.
 */
export function findMeasurementSheet(wb: XLSX.WorkBook): { name: string; sheet: XLSX.WorkSheet } | undefined {
  const candidates = [
    'measurements', 'measurement', 'data', 'testdata', 'readings',
    'eagleeye', 'eagleeyedata', 'telemetry', 'sheet1'
  ];
  const byName = findSheet(wb, candidates);
  if (byName) return byName;

  // Scan sheet contents for a sheet that contains 'Time' in header or tabular numeric rows
  for (const name of wb.SheetNames) {
    const s = wb.Sheets[name];
    if (!s) continue;
    const mat = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
    if (mat.length >= 3 && Array.isArray(mat[0])) {
      const firstCell = String(mat[0][0] || '').toLowerCase().trim();
      if (firstCell === 'time' || (mat[0].length >= 5 && mat[2] && typeof mat[2][0] === 'number')) {
        return { name, sheet: s };
      }
    }
  }

  return undefined;
}

/**
 * Canonical 50-parameter unit specification provided directly from the official CDU factory test report:
 */
export const CANONICAL_UNITS: Record<string, string> = {
  'Time': 'sec',
  'Status (0-off 1-on)': '[]',
  'Group (0-standalone 1-Group lead 2-Group follow)': '[]',
  'TT01': '°C',
  'TT02': '°C',
  'TT31': '°C',
  'TT41': '°C',
  'TT61': '°C',
  'TT62': '°C',
  'TT51': '°C',
  'TT52': '°C',
  'TT45': '°C',
  'PT01': 'psi',
  'PT02': 'psi',
  'PT31': 'psi',
  'PT41': 'psi',
  'PT32': 'psi',
  'PT42': 'psi',
  'PT21': 'psi',
  'PT11': 'psi',
  'PT51': 'psi',
  'PT52': 'psi',
  'PT53': 'psi',
  'PT61': 'psi',
  'PT62': 'psi',
  'TT01/TT02': '°C',
  'TT31/TT41': '°C',
  'TT61/TT62': '°C',
  'TT51/TT52': '°C',
  'PT01/PT02': 'psi',
  'PT32/PT42': 'psi',
  'PT61/PT62': 'psi',
  'PT51/PT52': 'psi',
  'Pump 31 Filter DP': 'psi',
  'Pump 41 Filter DP': 'psi',
  'Primary Filter 53 DP': 'psi',
  'Secondary DP (Supply - Return)': 'psi',
  'Primary DP (Supply - Return)': 'psi',
  'FT01': 'l/m',
  'FT61': 'l/m',
  'P31 Speed %': '%',
  'P41 Speed %': '%',
  'FCV61 Actual Flow%': '%',
  'FCV61 Actual Open%': '%',
  'Air Humidity': '%',
  'Air Temperature': '°C',
  'Program version': '[]',
  'Secondary Temperature Setpoint': '°C',
  'Secondary DP Setpoint': 'psi',
  'Secondary Flow Setpoint': 'l/m'
};

export function normalizeUnit(paramName: string, rawUnit: string): string {
  // 1. Exact match in canonical dictionary takes absolute precedence (corrects legacy Excel template typos)
  if (CANONICAL_UNITS[paramName]) {
    return CANONICAL_UNITS[paramName];
  }

  const trimmed = (rawUnit || '').trim();
  // 2. Normalize common raw unit variants
  if (trimmed === 'C' || trimmed === 'deg C' || trimmed === 'degC') return '°C';
  if (trimmed.toUpperCase() === 'PSI') return 'psi';
  if (trimmed === 'FT' || trimmed.toLowerCase() === 'lpm') return 'l/m';
  if (trimmed && trimmed !== '-') {
    return trimmed;
  }

  // 3. Fallback matching by name
  const lowerName = paramName.toLowerCase();
  if (lowerName.includes('speed') || lowerName.includes('%') || lowerName.includes('humidity')) return '%';
  if (lowerName.startsWith('tt') || lowerName.includes('temp') || lowerName.includes('dewpoint')) return '°C';
  if (lowerName.startsWith('pt') || lowerName.includes('press') || lowerName.includes('dp')) return 'psi';
  if (lowerName.startsWith('ft') || lowerName.includes('flow')) return 'l/m';
  if (lowerName === 'time') return 'sec';

  return trimmed || '-';
}

export function parseEagleEyeWorkbook(wb: XLSX.WorkBook, filename: string): EagleEyeDataset {
  // Check if user uploaded the Factory Test Report (FTR) traveler checklist instead of Eagle Eye log
  const ftrChecklistSheets = ['FTR', 'Gas Testing', 'Visual Inspection', 'HI-POT', 'Low-Power Testing'];
  const isFtrChecklist = ftrChecklistSheets.some(s => wb.SheetNames.includes(s));
  if (isFtrChecklist && !wb.SheetNames.includes('Measurements')) {
    throw new Error(
      `"${filename}" is a Factory Test Report (FTR) traveler checklist containing sheets [${wb.SheetNames.slice(0, 5).join(', ')}...]. ` +
      `Please upload the automated Eagle Eye Data Log export (from Step 6.8 in FTR), which contains the 'Measurements' and 'Decision' sheets.`
    );
  }

  // 1. Summary Sheet (Metadata)
  const summaryEntry = findSheet(wb, ['summary', 'overview', 'general', 'cover', 'info', 'meta']);
  const summaryRows = summaryEntry ? (XLSX.utils.sheet_to_json(summaryEntry.sheet, { header: 1 }) as any[][]) : [];
  const rawMeta: Record<string, string> = {};

  summaryRows.forEach(row => {
    if (row && row[0] !== undefined) {
      const k = String(row[0]).trim();
      const v = row[1] !== undefined ? String(row[1]).trim() : '';
      rawMeta[k] = v;
    }
  });

  // Extract true serial number dynamically (e.g. CY08J0, CD04XB)
  let trueSerial = '';
  // Check filename first for common CoolIT CDU serial patterns (e.g. CY08J0, CD04XB)
  const matchSerial = filename.match(/C[A-Z0-9]{5}/i) || filename.match(/[A-Z]{2,3}-[A-Z0-9]+-([A-Z0-9]{5,8})/i);
  if (matchSerial) {
    trueSerial = (matchSerial[1] || matchSerial[0]).toUpperCase();
  } else if (rawMeta['Unit Serial Number']) {
    trueSerial = rawMeta['Unit Serial Number'];
  } else if (rawMeta['Unit Serial']) {
    trueSerial = rawMeta['Unit Serial'];
  } else if (rawMeta['Serial Number'] && !/^\d+\.\d+/.test(rawMeta['Serial Number'])) {
    trueSerial = rawMeta['Serial Number'];
  } else if (rawMeta['Serial']) {
    trueSerial = rawMeta['Serial'];
  } else {
    // Clean basename of the file
    trueSerial = filename.replace(/\.[^/.]+$/, '').replace(/\s*\(\d+\)$/, '');
  }

  // Software & Framework Versions
  let frameworkBuild = rawMeta['Framework Version'] || rawMeta['Build Version'] || rawMeta['Framework Build'] || '';
  if (!frameworkBuild && rawMeta['Serial Number'] && /^\d+\.\d+/.test(rawMeta['Serial Number'])) {
    frameworkBuild = rawMeta['Serial Number'];
  }
  if (!frameworkBuild) frameworkBuild = '-';

  const softwareVersion = rawMeta['Software Version'] || rawMeta['SW Version'] || rawMeta['Firmware Version'] || '-';

  // Work Order Number
  let workOrder = rawMeta['Work Order Number'] || rawMeta['Work Order'] || rawMeta['WO Number'] || rawMeta['WO'] || '';
  if (!workOrder) {
    const matchWO = filename.match(/WO[0-9]{6,10}/i);
    if (matchWO) workOrder = matchWO[0].toUpperCase();
    else workOrder = '-';
  }

  // Tested by & Date Tested
  const testedBy = rawMeta['Tested by'] || rawMeta['Tested By'] || rawMeta['Operator'] || rawMeta['Technician'] || '-';
  const dateTested = rawMeta['Date Tested'] || rawMeta['Date'] || rawMeta['Test Date'] || '-';

  // Final Result
  const finalResultStr = rawMeta['Final Result'] || rawMeta['Result'] || rawMeta['Status'] || '';
  const finalResult = finalResultStr.toLowerCase().includes('pass') ? 'Pass' : 'Fail';

  // Customer & Sequence
  let customer = rawMeta['Customer'] || rawMeta['Client'] || '';
  if (!customer && /google/i.test(filename)) customer = 'GOOGLE';

  let seqNumber = rawMeta['Sequence Number'] || rawMeta['Sequence'] || '';
  if (!seqNumber) {
    const matchSeq = filename.match(/G[0-9]{3}/i);
    if (matchSeq) seqNumber = matchSeq[0].toUpperCase();
  }

  // CDU Model Detection
  let detectedModel = rawMeta['Model'] || rawMeta['CDU Model'] || rawMeta['CDU Type'] || rawMeta['Type'] || '';
  if (!detectedModel) {
    if (/AHX[-_]?180|CHX[-_]?80/i.test(filename)) detectedModel = 'AHx180';
    else if (/CHX[-_]?1000|CH[-_]?1000/i.test(filename)) detectedModel = 'CHx1000';
    else if (/CHX[-_]?2000|CH[-_]?2000|CD050L|CD04XB/i.test(filename)) detectedModel = 'CHx2000';
  }

  const saleOrder = rawMeta['Sale Order Number'] || rawMeta['Sale Order'] || rawMeta['SO'] || '';
  const partNumber = rawMeta['Part Number'] || rawMeta['PN'] || '';
  const firmwareVersion = rawMeta['Firmware Version'] || rawMeta['FW Version'] || frameworkBuild;
  const activeAlarms = rawMeta['Active Alarms'] || rawMeta['Active Alarms Test'] || '';

  const metadata: TestMetadata = {
    serialNumber: trueSerial,
    workOrderNumber: workOrder,
    softwareVersion: softwareVersion,
    frameworkBuildVersion: frameworkBuild,
    testedBy: testedBy,
    dateTested: dateTested,
    finalResult: finalResult,
    customer: customer || undefined,
    seqNumber: seqNumber || undefined,
    model: detectedModel || undefined,
    filename: filename,
    saleOrderNumber: saleOrder || undefined,
    partNumber: partNumber || undefined,
    firmwareVersion: firmwareVersion !== '-' ? firmwareVersion : undefined,
    activeAlarms: activeAlarms || undefined
  };

  // 2. Measurements Sheet
  const measEntry = findMeasurementSheet(wb);
  if (!measEntry) {
    throw new Error(
      `Could not find a valid telemetry 'Measurements' sheet in "${filename}". ` +
      `Sheets found: [${wb.SheetNames.join(', ')}]. Please verify the file is an Eagle Eye Data Log export.`
    );
  }

  const measMatrix = XLSX.utils.sheet_to_json(measEntry.sheet, { header: 1 }) as any[][];
  if (measMatrix.length < 3) {
    throw new Error(`The '${measEntry.name}' sheet does not contain enough data rows (minimum 3 rows required).`);
  }

  // Identify Header & Unit rows
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(5, measMatrix.length); r++) {
    if (measMatrix[r] && measMatrix[r].some((c: any) => String(c).toLowerCase().trim() === 'time')) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = measMatrix[headerRowIdx] || [];
  const rawUnits = measMatrix[headerRowIdx + 1] || [];
  const dataStartRowIdx = headerRowIdx + 2;

  // Clean headers (trim whitespace, eliminate empty trailing columns)
  const headers: string[] = [];
  const validColIndices: number[] = [];
  rawHeaders.forEach((h: any, idx: number) => {
    const str = String(h ?? '').trim();
    if (str && (idx === 0 || str.toLowerCase() !== 'empty')) {
      headers.push(str);
      validColIndices.push(idx);
    }
  });

  if (headers.length === 0) {
    throw new Error(`No valid parameter column headers found in sheet '${measEntry.name}'.`);
  }

  // Units map with automatic CoolIT engineering units normalization (e.g. Flow -> LPM, Temp -> °C, Pressure -> PSI)
  const units: string[] = validColIndices.map((idx, i) => {
    const rawU = String(rawUnits[idx] ?? '').trim();
    const paramName = headers[i] || '';
    return normalizeUnit(paramName, rawU);
  });
  const unitMap: Record<string, string> = {};
  headers.forEach((h, i) => {
    unitMap[h] = units[i] || '';
  });

  // Extract measurement rows
  const measurements: Record<string, any>[] = [];
  for (let r = dataStartRowIdx; r < measMatrix.length; r++) {
    const row = measMatrix[r];
    if (!row || row.length === 0) continue;
    // Check if time column has a valid entry
    const timeVal = row[validColIndices[0]];
    if (timeVal === undefined || timeVal === null || timeVal === '') continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const originalColIdx = validColIndices[i];
      const val = row[originalColIdx];
      const isPv = h.trim().toLowerCase().includes('program version') || h.trim().toLowerCase() === 'software version';
      if (typeof val === 'number') {
        rowObj[h] = isPv && val > 1 ? Number((val / 100).toFixed(2)) : val;
      } else if (val !== undefined && val !== null && val !== '') {
        const parsedNum = Number(val);
        if (!isNaN(parsedNum)) {
          rowObj[h] = isPv && parsedNum > 1 ? Number((parsedNum / 100).toFixed(2)) : parsedNum;
        } else {
          rowObj[h] = String(val).trim();
        }
      } else {
        rowObj[h] = null;
      }
    });
    measurements.push(rowObj);
  }

  if (measurements.length === 0) {
    throw new Error(`No valid data rows found in sheet '${measEntry.name}'.`);
  }

  // Ensure softwareVersion fallback if missing from Summary sheet
  if ((!metadata.softwareVersion || metadata.softwareVersion === '-') && measurements.length > 0) {
    const pvKey = headers.find(h => h.trim().toLowerCase().includes('program version'));
    if (pvKey && measurements[0][pvKey] !== null && measurements[0][pvKey] !== undefined) {
      metadata.softwareVersion = String(measurements[0][pvKey]);
    }
  }

  // 3. Decision Sheet
  const decEntry = findSheet(wb, ['decision', 'decisions', 'result', 'results']);
  const decMatrix = decEntry ? (XLSX.utils.sheet_to_json(decEntry.sheet, { header: 1 }) as any[][]) : [];
  const decisions: Record<string, any>[] = [];

  for (let r = dataStartRowIdx; r < decMatrix.length; r++) {
    const row = decMatrix[r];
    if (!row) continue;
    const rowObj: Record<string, any> = {};
    headers.forEach((h, i) => {
      const originalColIdx = validColIndices[i];
      const val = row[originalColIdx];
      rowObj[h] = val !== undefined && val !== null ? Number(val) : null;
    });
    decisions.push(rowObj);
  }

  // 4. Limits Sheets (mean-3Sigma, mean+3Sigma, min, max)
  const limits: EagleEyeDataset['limits'] = {
    'mean-3Sigma': [],
    'mean+3Sigma': [],
    'min': [],
    'max': []
  };

  const limitSheetAliases: Record<keyof EagleEyeDataset['limits'], string[]> = {
    'mean-3Sigma': ['mean-3Sigma', 'mean - 3Sigma', 'mean-3sigma', 'mean - 3sigma', 'lower limit', 'low limit', 'mean-3s'],
    'mean+3Sigma': ['mean+3Sigma', 'mean + 3Sigma', 'mean+3sigma', 'mean + 3sigma', 'upper limit', 'high limit', 'mean+3s'],
    'min': ['min', 'minimum', 'abs min', 'absmin'],
    'max': ['max', 'maximum', 'abs max', 'absmax']
  };

  (['mean-3Sigma', 'mean+3Sigma', 'min', 'max'] as const).forEach(key => {
    const sheetEntry = findSheet(wb, limitSheetAliases[key]);
    if (sheetEntry) {
      const mat = XLSX.utils.sheet_to_json(sheetEntry.sheet, { header: 1 }) as any[][];
      const rows: Record<string, any>[] = [];
      // Limits rows typically start at index 1 (after headers)
      for (let r = 1; r < mat.length; r++) {
        const row = mat[r];
        if (!row) continue;
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          const originalColIdx = validColIndices[i];
          const val = row[originalColIdx];
          const isPv = h.trim().toLowerCase().includes('program version') || h.trim().toLowerCase() === 'software version';
          if (val !== undefined && val !== null && val !== '') {
            let num = Number(val);
            if (!isNaN(num)) {
              if (isPv && num > 1) {
                num = Number((num / 100).toFixed(2));
              }
              rowObj[h] = num;
            } else {
              rowObj[h] = null;
            }
          } else {
            rowObj[h] = null;
          }
        });
        rows.push(rowObj);
      }
      limits[key] = rows;
    }
  });

  return analyzeDataset({
    metadata,
    headers,
    units,
    unitMap,
    measurements,
    decisions,
    limits
  });
}

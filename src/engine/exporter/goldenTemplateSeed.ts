import * as XLSX from 'xlsx';
import { CANONICAL_FAULTS } from '../diagnostics/faultCatalog';

/**
 * Loads the official binary template if available, or constructs a 100% compliant
 * golden workbook seed matching Template_diagnostic_results_CHx2000.xlsx.
 */
export async function loadOrSeedGoldenWorkbook(): Promise<XLSX.WorkBook> {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const resp = await window.fetch('/Template_diagnostic_results_CHx2000.xlsx');
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        return XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true });
      }
    } catch {
      // Fallback to pure offline seed generation
    }
  }

  return createInMemoryGoldenWorkbook();
}

/**
 * Constructs an authentic golden workbook in-memory matching the schema and cell
 * coordinates of Template_diagnostic_results_CHx2000.xlsx.
 */
export function createInMemoryGoldenWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Summary (exact A1, A6:A14, A17:A18)
  const summaryAoa: (string | null)[][] = [
    ['CDU Factory Test Report', null],
    [null, null],
    [null, null],
    [null, null],
    [null, null],
    ['Work Order Number', null],
    ['Sale Order Number', null],
    ['Part Number', null],
    ['Software Version', null],
    ['Firmware Version', null],
    ['Serial Number', null],
    ['Tested by', null],
    ['Date Tested', null],
    ['Final Result', null],
    [null, null],
    [null, null],
    ['Active Alarms Test', null],
    ['Active Alarms', null]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Sheet: Measurements
  const wsMeas = XLSX.utils.aoa_to_sheet([['Time'], ['sec']]);
  XLSX.utils.book_append_sheet(wb, wsMeas, 'Measurements');

  // 3. Sheet: Limits
  const wsLimits = XLSX.utils.aoa_to_sheet([['Limits']]);
  XLSX.utils.book_append_sheet(wb, wsLimits, 'Limits');

  // 4. Sheet: Description of Diagnostics
  const descRows: (string | null)[][] = [
    ['Fault Code', null, null, null, 'Description of the Diagnostic', 'Purpose of the Diagnostic', 'Troubleshooting Guide']
  ];

  CANONICAL_FAULTS.forEach(f => {
    descRows.push([
      f.title,
      null,
      null,
      null,
      f.mathDescription,
      f.purpose,
      f.troubleshooting
    ]);
  });

  const wsDesc = XLSX.utils.aoa_to_sheet(descRows);
  const merges: XLSX.Range[] = [];
  for (let r = 0; r < 21; r++) {
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  }
  wsDesc['!merges'] = merges;
  wsDesc['!cols'] = [
    { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 30 },
    { wch: 88 }, { wch: 88 }, { wch: 75 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDesc, 'Description of Diagnostics');

  return wb;
}

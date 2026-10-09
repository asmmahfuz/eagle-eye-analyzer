import * as XLSX from 'xlsx';
import { EagleEyeDataset } from '../../types';
import { CANONICAL_FAULTS } from '../diagnostics/faultCatalog';
import { runCanonicalDiagnostics } from '../diagnostics/diagnosticsEngine';

/**
 * Builds the canonical 20 Fault Code guide sheet matching the golden template
 * 'Description of Diagnostics' layout and overlays live diagnostic verdicts.
 */
export function buildDiagnosticsGuideSheet(
  wb: XLSX.WorkBook,
  data: EagleEyeDataset
): void {
  const evalResults = runCanonicalDiagnostics(data);
  const evalMap = new Map<number, (typeof evalResults)[0]>();
  evalResults.forEach(r => evalMap.set(r.definition.codeNumber, r));

  const rows: (string | null)[][] = [
    [
      'Fault Code', null, null, null,
      'Description of the Diagnostic',
      'Purpose of the Diagnostic',
      'Troubleshooting Guide',
      'Diagnostic Status',
      'Evaluated Operational Findings'
    ]
  ];

  CANONICAL_FAULTS.forEach(f => {
    const res = evalMap.get(f.codeNumber);
    let statusStr = 'PASS';
    let findingStr = 'Normal operation within baseline envelope.';

    if (res) {
      if (res.status === 'not_applicable') {
        statusStr = 'NOT EQUIPPED';
        findingStr = 'Channel / pump hardware not configured on this unit model.';
      } else if (res.isTriggered || res.status === 'fail') {
        statusStr = 'TRIGGERED (FAIL)';
        findingStr = res.summary || 'Out-of-tolerance mathematical excursion detected.';
      } else if (res.status === 'warn') {
        statusStr = 'CAUTION (WARN)';
        findingStr = res.summary || 'Statistical 3σ margin breaches observed on associated sensors.';
      }
    }

    rows.push([
      f.title,
      null,
      null,
      null,
      f.mathDescription,
      f.purpose,
      f.troubleshooting,
      statusStr,
      findingStr
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Preserve official 4-column merges (A:D) on each fault row
  const merges: XLSX.Range[] = [];
  for (let r = 0; r < rows.length; r++) {
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
  }
  ws['!merges'] = merges;

  // Calibrate column widths matching golden spec
  ws['!cols'] = [
    { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 30 },
    { wch: 88 }, { wch: 88 }, { wch: 75 }, { wch: 20 }, { wch: 48 }
  ];

  const sheetName = 'Description of Diagnostics';
  if (wb.SheetNames.includes(sheetName)) {
    wb.Sheets[sheetName] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
}

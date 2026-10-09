import * as XLSX from 'xlsx';
import { EagleEyeDataset } from '../../types';
import { ExportOptions } from './exporterTypes';
import { loadOrSeedGoldenWorkbook } from './goldenTemplateSeed';
import { buildSummarySheet } from './summarySheetBuilder';
import { buildDiagnosticsGuideSheet } from './diagnosticsGuideBuilder';
import { buildPunchlistSheet } from './punchlistSheetBuilder';
import { buildParameterMetricsSheet, buildStepLogSheet } from './resultsSheetBuilder';

export * from './exporterTypes';
export { loadOrSeedGoldenWorkbook } from './goldenTemplateSeed';
export { buildSummarySheet } from './summarySheetBuilder';
export { buildDiagnosticsGuideSheet } from './diagnosticsGuideBuilder';
export { buildPunchlistSheet } from './punchlistSheetBuilder';
export { buildParameterMetricsSheet, buildStepLogSheet } from './resultsSheetBuilder';

/**
 * Builds the complete multi-sheet analysis workbook injected into the golden template.
 */
export async function generateAnalysisWorkbook(
  data: EagleEyeDataset,
  options?: ExportOptions
): Promise<XLSX.WorkBook> {
  // 1. Seed from golden template (fetch if in browser, or in-memory generator)
  const wb = await loadOrSeedGoldenWorkbook();

  // 2. Populate Summary Sheet (exact B6:B14 cells + executive audit summary)
  buildSummarySheet(wb, data, options);

  // 3. Populate Canonical 20 Fault Code Guide Sheet with live evaluation
  buildDiagnosticsGuideSheet(wb, data);

  // 4. Populate Failure Diagnostics (Punch-List) Sheet
  buildPunchlistSheet(wb, data);

  // 5. Populate Parameter Metrics (Triad: Peak, Min, Settling at 525s) Sheet
  buildParameterMetricsSheet(wb, data);

  // 6. Populate Full Step-by-Step Log Sheet (1,372 checks)
  buildStepLogSheet(wb, data);

  return wb;
}

/**
 * Main entry point: Generates and triggers download of the official Eagle Eye Excel report.
 */
export async function exportAnalysisExcel(
  data: EagleEyeDataset,
  options?: ExportOptions
): Promise<void> {
  const serial = data.metadata.serialNumber || 'CD050L';
  const wo = data.metadata.workOrderNumber || 'WO2602286';
  const outName = options?.customFilename || `EagleEye_Analysis_Report_${serial}_${wo}.xlsx`;

  const wb = await generateAnalysisWorkbook(data, options);

  if (!options?.skipDownload) {
    XLSX.writeFile(wb, outName);
  }
}

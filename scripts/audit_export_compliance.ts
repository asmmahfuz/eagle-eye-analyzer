import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseEagleEyeWorkbook } from '../src/engine/parser';
import { generateAnalysisWorkbook } from '../src/engine/exporter/index';

async function runAudit() {
  console.log('=== STARTING AUTOMATED EXPORT ROUND-TRIP COMPLIANCE AUDIT ===\n');

  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  // Reference 1: SEQ-G659-CD050L.xlsx
  console.log('[1/4] Ingesting reference run SEQ-G659-CD050L.xlsx...');
  const cd050lPath = path.resolve(process.cwd(), 'SEQ-G659-CD050L.xlsx');
  const buf050 = fs.readFileSync(cd050lPath);
  const wb050 = XLSX.read(buf050, { type: 'buffer' });
  const data050 = parseEagleEyeWorkbook(wb050, 'SEQ-G659-CD050L.xlsx');
  console.log(`  Parsed: Serial=${data050.metadata.serialNumber}, WO=${data050.metadata.workOrderNumber}, Failures=${data050.failures.length}, Evaluated=${data050.totalEvaluated}`);

  console.log('[2/4] Generating Golden Spec Excel export for CD050L...');
  const exportWb050 = await generateAnalysisWorkbook(data050, { modelName: 'CHx2000', coolingSeries: 'Liquid-to-Liquid' });
  const out050Path = path.join(scratchDir, 'audit_export_CD050L.xlsx');
  XLSX.writeFile(exportWb050, out050Path);
  console.log(`  Export written to: ${out050Path}`);

  // Reference 2: SEQ-G592-CD04XB (1).xlsx
  console.log('[3/4] Ingesting reference run SEQ-G592-CD04XB (1).xlsx...');
  const cd04xbPath = path.resolve(process.cwd(), 'SEQ-G592-CD04XB (1).xlsx');
  const buf04 = fs.readFileSync(cd04xbPath);
  const wb04 = XLSX.read(buf04, { type: 'buffer' });
  const data04 = parseEagleEyeWorkbook(wb04, 'SEQ-G592-CD04XB (1).xlsx');
  console.log(`  Parsed: Serial=${data04.metadata.serialNumber}, WO=${data04.metadata.workOrderNumber}, Failures=${data04.failures.length}, Evaluated=${data04.totalEvaluated}`);

  console.log('[4/4] Generating Golden Spec Excel export for CD04XB...');
  const exportWb04 = await generateAnalysisWorkbook(data04, { modelName: 'CHx2000', coolingSeries: 'Liquid-to-Liquid' });
  const out04Path = path.join(scratchDir, 'audit_export_CD04XB.xlsx');
  XLSX.writeFile(exportWb04, out04Path);
  console.log(`  Export written to: ${out04Path}`);

  console.log('\n[OK] Both export workbooks generated successfully. Ready for openpyxl inspection.');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

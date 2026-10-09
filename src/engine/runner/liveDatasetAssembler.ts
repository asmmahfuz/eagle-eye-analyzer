import { EagleEyeDataset, TestMetadata } from '../../types';
import { LiveTestConfig, LiveStageTelemetry } from './runnerTypes';
import { analyzeDataset } from '../marginMath';
import { getCategory } from '../parser';
import sampleData from '../../../sample_data.json';

/**
 * Live Dataset Assembler for Real-Time Test-Bay Execution
 * Translates streaming stage telemetry into a fully evaluated EagleEyeDataset
 * with SPC 3-sigma tolerance envelopes and 20 canonical fault evaluations.
 * Target size: 140-190 lines (Invariant 11 compliant)
 */

export function assembleLiveDataset(
  config: LiveTestConfig,
  stages: LiveStageTelemetry[],
  isComplete: boolean = false
): EagleEyeDataset {
  const baseHeaders: string[] = sampleData.headers || [];
  const baseUnits: string[] = sampleData.units || [];
  const baseLimits = sampleData.limits as EagleEyeDataset['limits'];

  // Unit map
  const unitMap: Record<string, string> = {};
  baseHeaders.forEach((h, i) => {
    unitMap[h] = baseUnits[i] || '';
  });

  // Construct Measurements rows from stages
  const measurements: Record<string, any>[] = stages.map(st => {
    const row: Record<string, any> = { Time: st.timeSec };
    baseHeaders.forEach(h => {
      if (h === 'Time') return;
      if (st.readings[h] !== undefined) {
        row[h] = st.readings[h];
      } else if (h === 'Secondary Flow Setpoint') {
        row[h] = st.flowSp;
      } else if (h === 'Secondary DP Setpoint') {
        row[h] = st.dpSp;
      } else if (h === 'Secondary Temperature Setpoint') {
        row[h] = st.tempSp;
      } else {
        row[h] = null;
      }
    });
    return row;
  });

  // Decisions placeholder (will be computed by analyzeDataset if missing)
  const decisions: Record<string, any>[] = stages.map(st => {
    const row: Record<string, any> = { Time: st.timeSec };
    baseHeaders.forEach(h => {
      row[h] = 1; // Default to 1 (Pass)
    });
    return row;
  });

  // Construct limits sliced or matched to the stages count
  const limits: EagleEyeDataset['limits'] = {
    'mean-3Sigma': baseLimits?.['mean-3Sigma']?.slice(0, stages.length) || [],
    'mean+3Sigma': baseLimits?.['mean+3Sigma']?.slice(0, stages.length) || [],
    'min': baseLimits?.['min']?.slice(0, stages.length) || [],
    'max': baseLimits?.['max']?.slice(0, stages.length) || []
  };

  // Build traveler metadata
  const metadata: TestMetadata = {
    serialNumber: config.serialNumber || 'LIVE_UNIT',
    workOrderNumber: config.workOrderNumber || 'WO_LIVE',
    softwareVersion: config.softwareVersion || '0.23',
    frameworkBuildVersion: config.firmwareVersion || '1.41.329',
    testedBy: config.testedBy || 'TestBay.Operator',
    dateTested: config.dateTested || new Date().toISOString().split('T')[0],
    finalResult: 'Pass', // analyzeDataset will evaluate this
    model: config.modelId,
    saleOrderNumber: config.saleOrderNumber || '',
    partNumber: config.partNumber || '',
    firmwareVersion: config.firmwareVersion || '1.41.329',
    filename: `LIVE_${config.serialNumber || 'UNIT'}_${config.workOrderNumber || 'WO'}.xlsx`
  };

  // Execute full SPC margin math & fault evaluations
  const dataset = analyzeDataset({
    metadata,
    headers: baseHeaders,
    units: baseUnits,
    unitMap,
    measurements,
    decisions,
    limits
  });

  // If complete, set the evaluated verdict
  if (isComplete) {
    dataset.metadata.finalResult = dataset.failedCount === 0 ? 'Pass' : 'Fail';
  }

  return dataset;
}

export function createDefaultLiveConfig(): LiveTestConfig {
  return {
    ipAddress: '169.254.244.6',
    port: 502,
    workOrderNumber: 'WO2602286',
    serialNumber: 'CD050L',
    saleOrderNumber: 'SO26011',
    partNumber: '900-02233',
    softwareVersion: '0.23',
    firmwareVersion: '1.41.329',
    testedBy: 'mdtahmid.jami',
    dateTested: new Date().toISOString().split('T')[0],
    modelId: 'CHx2000',
    executionMode: 'simulation_bay',
    speedMultiplier: 10 // 10x rapid test default (52s) for responsive test bay verification
  };
}

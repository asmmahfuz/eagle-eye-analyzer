import { EagleEyeDataset, OperatingStage } from '../../../types';

export interface StageDynamicsMetrics {
  stageNum: number;
  timeSec: number;
  dpSp: number | null;
  flowSp: number | null;
  tempSp: number | null;
  isPass: boolean;
  failCount: number;

  // Secondary loop transducers
  measuredDp: number;
  flow: number;
  p31Speed: number;
  p41Speed: number;
  avgPumpSpeed: number;
  suctionPressure: number;
  dischargePressure: number;
  reservoirPressure: number;
  secondarySupplyT: number;
  secondaryReturnT: number;
  secondaryReturnP?: number;
  cabinetT?: number;
  ambientT?: number;
  ambientRh?: number;
  dewpoint?: number;

  // Primary loop transducers
  primaryFlow: number;
  primarySupplyP: number;
  primaryReturnP: number;
  primarySupplyT: number;
  primaryReturnT: number;
  modulatingValve: number;

  // Filter differentials
  filter31Dp: number;
  filter41Dp: number;
  primaryFilter53Dp: number;

  // Dynamic Deltas from previous stage
  deltaDp: number;
  deltaPump: number;
  deltaFlow: number;
  deltaSuction: number;
  deltaDischarge: number;
  deltaTemp: number;

  // Diagnostics & Invariants
  suctionCavitationSafe: boolean;
  flowBelowSpec: boolean;
  airBleedWarning: boolean;
}

/**
 * Normalizes analog 0-10V pump/valve register readings (e.g. 5.6 -> 56%)
 */
export function normalizeAnalogValue(val: number): number {
  if (val > 0 && val <= 10.5) {
    return val * 10;
  }
  return val;
}

/**
 * Helper to safely extract numeric sensor value from a measurement row
 */
export function getMetric(row: Record<string, any> | null, ...keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
      const num = Number(row[k]);
      if (!Number.isNaN(num)) return num;
    }
  }
  return 0;
}

/**
 * Extracts comprehensive closed-loop system dynamics metrics for a specific stage index
 */
export function extractStageMetrics(
  dataset: EagleEyeDataset,
  stageIdx: number
): StageDynamicsMetrics {
  const stages = dataset.stages;
  const currentStage: OperatingStage = stages[stageIdx] || stages[0];
  const prevStage: OperatingStage | null = stageIdx > 0 ? stages[stageIdx - 1] : null;

  // Find measurement row corresponding to current stage timestamp
  const row = dataset.measurements.find(m => m['Time'] === currentStage?.timeSec) || dataset.measurements[0] || null;
  const prevRow = prevStage ? (dataset.measurements.find(m => m['Time'] === prevStage.timeSec) || null) : null;

  // Secondary loop readings
  const measuredDp = getMetric(row, 'Secondary DP (Supply - Return)', 'Secondary DP', 'DP_01');
  const flow = getMetric(row, 'FT01', 'FT_01', 'Secondary Flow');
  const p31Speed = normalizeAnalogValue(getMetric(row, 'P31 Speed %', 'P31_Speed', 'P31'));
  const p41Speed = normalizeAnalogValue(getMetric(row, 'P41 Speed %', 'P41_Speed', 'P41'));
  const avgPumpSpeed = (p31Speed + p41Speed) / (p31Speed > 0 && p41Speed > 0 ? 2 : 1);
  const suctionPressure = getMetric(row, 'PT21', 'PT_21', 'Suction Pressure');
  const dischargePressure = getMetric(row, 'PT32', 'PT42', 'PT32/PT42');
  const reservoirPressure = getMetric(row, 'PT11', 'PT_11');
  const secondarySupplyT = getMetric(row, 'TT31', 'TT41', 'TT31/TT41', 'TT01');
  const secondaryReturnT = getMetric(row, 'TT02', 'TT01', 'TT01/TT02');
  const secondaryReturnP = getMetric(row, 'PT01', 'PT02', 'PT01/PT02');
  const cabinetT = getMetric(row, 'TT45', 'TT_45');

  // Primary loop readings
  const primaryFlow = getMetric(row, 'FT61', 'FT_61', 'Primary Flow');
  const primarySupplyP = getMetric(row, 'PT51', 'PT52', 'PT51/PT52');
  const primaryReturnP = getMetric(row, 'PT61', 'PT62', 'PT61/PT62');
  const primarySupplyT = getMetric(row, 'TT51', 'TT52', 'TT51/TT52', 'TT61');
  const primaryReturnT = getMetric(row, 'TT62', 'TT61', 'TT61/TT62', 'TT52');
  const modulatingValve = normalizeAnalogValue(getMetric(row, 'FCV61 Actual Flow%', 'FCV61 Actual Open%'));

  // Environmental readings & calculated dewpoint
  const ambientT = getMetric(row, 'Air Temperature', 'Ambient Temperature');
  const ambientRh = getMetric(row, 'Air Humidity', 'Relative Humidity');
  const dewpoint = ambientT > 0 && ambientRh > 0 ? Number((ambientT - (100 - ambientRh) / 5).toFixed(1)) : 8.6;

  // Filter differentials
  const filter31Dp = getMetric(row, 'Pump 31 Filter DP');
  const filter41Dp = getMetric(row, 'Pump 41 Filter DP');
  const primaryFilter53Dp = getMetric(row, 'Primary Filter 53 DP');

  // Previous stage values for delta calculations
  const prevDp = prevRow ? getMetric(prevRow, 'Secondary DP (Supply - Return)', 'Secondary DP', 'DP_01') : measuredDp;
  const prevP31 = prevRow ? normalizeAnalogValue(getMetric(prevRow, 'P31 Speed %', 'P31_Speed', 'P31')) : p31Speed;
  const prevP41 = prevRow ? normalizeAnalogValue(getMetric(prevRow, 'P41 Speed %', 'P41_Speed', 'P41')) : p41Speed;
  const prevAvgPump = (prevP31 + prevP41) / (prevP31 > 0 && prevP41 > 0 ? 2 : 1);
  const prevFlow = prevRow ? getMetric(prevRow, 'FT01', 'FT_01', 'Secondary Flow') : flow;
  const prevSuction = prevRow ? getMetric(prevRow, 'PT21', 'PT_21', 'Suction Pressure') : suctionPressure;
  const prevDischarge = prevRow ? getMetric(prevRow, 'PT32', 'PT42', 'PT32/PT42') : dischargePressure;
  const prevTemp = prevRow ? getMetric(prevRow, 'TT31', 'TT41', 'TT31/TT41', 'TT01') : secondarySupplyT;

  const deltaDp = measuredDp - prevDp;
  const deltaPump = avgPumpSpeed - prevAvgPump;
  const deltaFlow = flow - prevFlow;
  const deltaSuction = suctionPressure - prevSuction;
  const deltaDischarge = dischargePressure - prevDischarge;
  const deltaTemp = secondarySupplyT - prevTemp;

  const suctionCavitationSafe = suctionPressure >= 15.0;
  const flowSp = currentStage?.flowSp ?? null;
  const flowStat = dataset.parameterStats['FT01'];
  const hasFlowDeficit = (flowStat?.failCount ?? 0) > 0 || (flowSp != null && flowSp > 0 && flow < flowSp * 0.85);

  return {
    stageNum: currentStage?.stageNum ?? (stageIdx + 1),
    timeSec: currentStage?.timeSec ?? 15,
    dpSp: currentStage?.dpSp ?? null,
    flowSp,
    tempSp: currentStage?.tempSp ?? null,
    isPass: currentStage?.isPass ?? true,
    failCount: currentStage?.failCount ?? 0,
    measuredDp,
    flow,
    p31Speed,
    p41Speed,
    avgPumpSpeed,
    suctionPressure,
    dischargePressure,
    reservoirPressure,
    secondarySupplyT,
    secondaryReturnT,
    secondaryReturnP,
    cabinetT,
    ambientT,
    ambientRh,
    dewpoint,
    primaryFlow,
    primarySupplyP,
    primaryReturnP,
    primarySupplyT,
    primaryReturnT,
    modulatingValve,
    filter31Dp,
    filter41Dp,
    primaryFilter53Dp,
    deltaDp,
    deltaPump,
    deltaFlow,
    deltaSuction,
    deltaDischarge,
    deltaTemp,
    suctionCavitationSafe,
    flowBelowSpec: hasFlowDeficit,
    airBleedWarning: hasFlowDeficit
  };
}

export function formatDelta(val: number, unit = '', decimals = 1): { text: string; direction: 'up' | 'down' | 'steady' } {
  const threshold = 0.05;
  if (Math.abs(val) < threshold) {
    return { text: `±0.0 ${unit}`.trim(), direction: 'steady' };
  }
  if (val > 0) {
    return { text: `+${val.toFixed(decimals)} ${unit}`.trim(), direction: 'up' };
  }
  return { text: `${val.toFixed(decimals)} ${unit}`.trim(), direction: 'down' };
}

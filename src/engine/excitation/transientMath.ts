import { 
  ProgrammedStageSetpoint, 
  StageTransientMetrics, 
  ChannelTransientProfile, 
  UnitTransientSummary,
  TrackedQuantity,
  SettlingStability,
  TransientStatusBadge
} from './excitationTypes';
import { 
  PROGRAMMED_EXCITATION_STAGES, 
  getChannelTrackedQuantity, 
  getProgrammedSetpointForChannel 
} from './excitationSchedule';
import { EagleEyeDataset } from '../../types';

/**
 * Modular Transient Tracking & Dynamic Settling Math Engine
 * Target size: 150-220 lines (Invariant 11 compliant)
 */

export function calculateStageTransientMetrics(
  channel: string,
  stage: ProgrammedStageSetpoint,
  measured: number | null,
  unit: string
): StageTransientMetrics {
  const quantity = getChannelTrackedQuantity(channel);
  const setpoint = getProgrammedSetpointForChannel(channel, stage.timeSec);

  if (quantity === 'none' || setpoint === null || measured === null || isNaN(measured)) {
    return {
      stageNum: stage.stageNum,
      timeSec: stage.timeSec,
      channel,
      quantity,
      unit,
      measured,
      setpoint,
      trackingError: null,
      trackingErrorPercent: null,
      overshootPercent: null,
      isSettled: true,
      settlingStability: 'N/A',
      statusBadge: 'N/A'
    };
  }

  const trackingError = measured - setpoint;
  let trackingErrorPercent: number | null = null;
  let overshootPercent: number | null = null;

  if (setpoint !== 0) {
    trackingErrorPercent = (trackingError / setpoint) * 100;
    if (measured > setpoint) {
      overshootPercent = ((measured - setpoint) / setpoint) * 100;
    } else {
      overshootPercent = 0;
    }
  } else {
    trackingErrorPercent = Math.abs(measured) <= 0.5 ? 0 : null;
    overshootPercent = measured > 0 ? measured : 0;
  }

  // Determine physical settling tolerances based on physical quantity
  let isStable = false;
  let isSettling = false;
  const absErr = Math.abs(trackingError);
  const absPct = trackingErrorPercent !== null ? Math.abs(trackingErrorPercent) : null;

  if (quantity === 'flow') {
    isStable = absErr <= 8.0 || (absPct !== null && absPct <= 3.5);
    isSettling = absErr <= 20.0 || (absPct !== null && absPct <= 8.0);
  } else if (quantity === 'dp') {
    isStable = absErr <= 0.8 || (absPct !== null && absPct <= 5.0);
    isSettling = absErr <= 2.0 || (absPct !== null && absPct <= 10.0);
  } else if (quantity === 'temp') {
    isStable = absErr <= 0.6 || (absPct !== null && absPct <= 3.0);
    isSettling = absErr <= 1.5 || (absPct !== null && absPct <= 6.0);
  } else {
    isStable = absPct !== null && absPct <= 5.0;
    isSettling = absPct !== null && absPct <= 10.0;
  }

  let settlingStability: SettlingStability = 'DEVIATING';
  let statusBadge: TransientStatusBadge = 'BREACH';

  if (isStable) {
    settlingStability = 'STABLE';
    statusBadge = (absPct !== null && absPct <= 1.5) ? 'EXCELLENT' : 'STABLE';
  } else if (isSettling) {
    settlingStability = 'SETTLING';
    statusBadge = 'WARNING';
  }

  return {
    stageNum: stage.stageNum,
    timeSec: stage.timeSec,
    channel,
    quantity,
    unit,
    measured,
    setpoint,
    trackingError: parseFloat(trackingError.toFixed(2)),
    trackingErrorPercent: trackingErrorPercent !== null ? parseFloat(trackingErrorPercent.toFixed(1)) : null,
    overshootPercent: overshootPercent !== null ? parseFloat(overshootPercent.toFixed(1)) : null,
    isSettled: isStable || isSettling,
    settlingStability,
    statusBadge
  };
}

export function calculateChannelTransientProfile(
  channel: string,
  dataset: EagleEyeDataset
): ChannelTransientProfile {
  const { measurements, parameterStats, unitMap } = dataset;
  const quantity = getChannelTrackedQuantity(channel);
  const stat = parameterStats ? parameterStats[channel] : undefined;
  const unit = stat?.unit || (unitMap ? unitMap[channel] : '') || '';

  const stageMetrics: StageTransientMetrics[] = PROGRAMMED_EXCITATION_STAGES.map(stage => {
    // Find steady-state dwell measurement corresponding to stage timeSec
    const mRows = measurements.filter(m => m['Time'] === stage.timeSec);
    const lastRow = mRows[mRows.length - 1];
    const val = lastRow ? lastRow[channel] : null;
    const numVal = typeof val === 'number' ? val : null;
    return calculateStageTransientMetrics(channel, stage, numVal, unit);
  });

  const validErrors = stageMetrics
    .map(m => m.trackingError)
    .filter((e): e is number => typeof e === 'number');

  const validOvershoots = stageMetrics
    .map(m => m.overshootPercent)
    .filter((o): o is number => typeof o === 'number');

  const avgTrackingError = validErrors.length > 0 
    ? parseFloat((validErrors.reduce((a, b) => a + Math.abs(b), 0) / validErrors.length).toFixed(2)) 
    : null;

  const maxTrackingError = validErrors.length > 0 
    ? parseFloat(Math.max(...validErrors.map(e => Math.abs(e))).toFixed(2)) 
    : null;

  const maxOvershootPercent = validOvershoots.length > 0 
    ? parseFloat(Math.max(...validOvershoots).toFixed(1)) 
    : null;

  const stableCount = stageMetrics.filter(m => m.settlingStability === 'STABLE').length;
  const evaluatedCount = stageMetrics.filter(m => m.settlingStability !== 'N/A').length;

  let overallStability: 'STABLE' | 'MARGINAL' | 'UNSTABLE' | 'N/A' = 'N/A';
  let settlingScorePercent = 100;

  if (evaluatedCount > 0) {
    settlingScorePercent = Math.round((stableCount / evaluatedCount) * 100);
    if (settlingScorePercent >= 80) overallStability = 'STABLE';
    else if (settlingScorePercent >= 50) overallStability = 'MARGINAL';
    else overallStability = 'UNSTABLE';
  }

  return {
    channel,
    quantity,
    unit,
    stageMetrics,
    avgTrackingError,
    maxTrackingError,
    maxOvershootPercent,
    overallStability,
    settlingScorePercent
  };
}

export function calculateUnitTransientSummary(dataset: EagleEyeDataset): UnitTransientSummary {
  // Key feedback channels representing the primary excitation loops
  const flowProfile = calculateChannelTransientProfile('FT01', dataset);
  const dpProfile = calculateChannelTransientProfile('Secondary DP (Supply - Return)', dataset);
  const tempProfile = calculateChannelTransientProfile('TT31', dataset);

  const getSubStability = (prof: ChannelTransientProfile): SettlingStability => {
    if (prof.overallStability === 'STABLE') return 'STABLE';
    if (prof.overallStability === 'MARGINAL') return 'SETTLING';
    if (prof.overallStability === 'UNSTABLE') return 'DEVIATING';
    return 'N/A';
  };

  const flowStability = getSubStability(flowProfile);
  const dpStability = getSubStability(dpProfile);
  const tempStability = getSubStability(tempProfile);

  let overallStability: 'STABLE' | 'MARGINAL' | 'UNSTABLE' = 'STABLE';
  if (flowStability === 'DEVIATING' || dpStability === 'DEVIATING' || tempStability === 'DEVIATING') {
    overallStability = 'UNSTABLE';
  } else if (flowStability === 'SETTLING' || dpStability === 'SETTLING' || tempStability === 'SETTLING') {
    overallStability = 'MARGINAL';
  }

  return {
    flowTrackingError: flowProfile.avgTrackingError,
    flowStability,
    dpTrackingError: dpProfile.avgTrackingError,
    dpStability,
    tempTrackingError: tempProfile.avgTrackingError,
    tempStability,
    overallStability,
    stagesEvaluated: PROGRAMMED_EXCITATION_STAGES.length
  };
}

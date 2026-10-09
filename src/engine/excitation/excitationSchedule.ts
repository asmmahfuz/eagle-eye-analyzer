import { ProgrammedStageSetpoint, TrackedQuantity } from './excitationTypes';

/**
 * Authoritative 10-Stage Excitation Timetable & Setpoint Schema
 * Sourced directly from factory automation script: Excitation_Profile.py
 * Modbus TCP Port 502: Reg 200 (Temp SP), Reg 201 (DP SP), Reg 202 (Flow SP)
 * Target size: 120-160 lines (Invariant 11 compliant)
 */
export const PROGRAMMED_EXCITATION_STAGES: ProgrammedStageSetpoint[] = [
  {
    stageNum: 1,
    timeSec: 15,
    dwellSec: 15,
    startTimeSec: 0,
    tempSp: 21.0,
    dpSp: 5.0,
    flowSp: 160,
    regime: 'Warmup & low-flow baseline',
    description: 'Initial circulation and thermal stabilization at low flow'
  },
  {
    stageNum: 2,
    timeSec: 75,
    dwellSec: 60,
    startTimeSec: 15,
    tempSp: 21.0,
    dpSp: 10.0,
    flowSp: 320,
    regime: 'Intermediate flow ramp',
    description: 'Flow step to 320 LPM; intermediate differential pressure evaluation'
  },
  {
    stageNum: 3,
    timeSec: 135,
    dwellSec: 60,
    startTimeSec: 75,
    tempSp: 22.0,
    dpSp: 25.0,
    flowSp: 480,
    regime: 'High flow ramp',
    description: 'High flow ramp to 480 LPM with elevated loop differential pressure'
  },
  {
    stageNum: 4,
    timeSec: 195,
    dwellSec: 60,
    startTimeSec: 135,
    tempSp: 23.0,
    dpSp: 33.0,
    flowSp: 560,
    regime: 'Maximum rated hydraulic load',
    description: 'Peak rated hydraulic load at 560 LPM and 33 psi secondary DP'
  },
  {
    stageNum: 5,
    timeSec: 255,
    dwellSec: 60,
    startTimeSec: 195,
    tempSp: 23.0,
    dpSp: 15.0,
    flowSp: 380,
    regime: 'Mid-point step down',
    description: 'Hydraulic unloading step down to 380 LPM at 15 psi'
  },
  {
    stageNum: 6,
    timeSec: 315,
    dwellSec: 60,
    startTimeSec: 255,
    tempSp: 24.0,
    dpSp: 20.0,
    flowSp: 430,
    regime: 'Thermal elevation ramp',
    description: 'Secondary loop thermal elevation to 24°C at 430 LPM'
  },
  {
    stageNum: 7,
    timeSec: 375,
    dwellSec: 60,
    startTimeSec: 315,
    tempSp: 25.0,
    dpSp: 25.0,
    flowSp: 490,
    regime: 'High thermal/flow dwell',
    description: 'Combined high thermal and flow dwell test at 25°C and 490 LPM'
  },
  {
    stageNum: 8,
    timeSec: 435,
    dwellSec: 60,
    startTimeSec: 375,
    tempSp: 27.0,
    dpSp: 30.0,
    flowSp: 515,
    regime: 'Peak temperature test',
    description: 'Maximum secondary temperature step to 27°C at 515 LPM'
  },
  {
    stageNum: 9,
    timeSec: 495,
    dwellSec: 60,
    startTimeSec: 435,
    tempSp: 27.0,
    dpSp: 5.0,
    flowSp: 160,
    regime: 'Low-flow cooldown step',
    description: 'Hydraulic cooldown step returning to 160 LPM baseline'
  },
  {
    stageNum: 10,
    timeSec: 525,
    dwellSec: 30,
    startTimeSec: 495,
    tempSp: 27.0,
    dpSp: 0.0,
    flowSp: 0,
    regime: 'Final idle settling & pump shutdown',
    description: 'Final idle settling, zero differential pressure, and pump coast-down'
  }
];

export function getProgrammedSchedule(): ProgrammedStageSetpoint[] {
  return PROGRAMMED_EXCITATION_STAGES;
}

export function getProgrammedStage(stageNumOrTimeSec: number): ProgrammedStageSetpoint | undefined {
  return PROGRAMMED_EXCITATION_STAGES.find(
    s => s.stageNum === stageNumOrTimeSec || s.timeSec === stageNumOrTimeSec
  );
}

export function getChannelTrackedQuantity(channelName: string): TrackedQuantity {
  const norm = channelName.toLowerCase();
  if (norm.includes('ft01') || norm.includes('ft61') || norm.includes('flow setpoint') || norm.includes('flow')) {
    return 'flow';
  }
  if (norm.includes('secondary dp') || norm.includes('primary dp') || norm.includes('dp setpoint') || norm.includes('filter dp')) {
    return 'dp';
  }
  if (norm.startsWith('tt') || norm.includes('temp') || norm.includes('temperature')) {
    return 'temp';
  }
  if (norm.includes('p31 speed') || norm.includes('p41 speed') || norm.includes('pump')) {
    return 'pump';
  }
  return 'none';
}

export function getProgrammedSetpointForChannel(channelName: string, timeSec: number): number | null {
  const quantity = getChannelTrackedQuantity(channelName);
  if (quantity === 'none') return null;

  // Find corresponding stage active at timeSec
  const stage = PROGRAMMED_EXCITATION_STAGES.find(s => timeSec <= s.timeSec) 
    || PROGRAMMED_EXCITATION_STAGES[PROGRAMMED_EXCITATION_STAGES.length - 1];

  switch (quantity) {
    case 'flow': return stage.flowSp;
    case 'dp': return stage.dpSp;
    case 'temp': return stage.tempSp;
    case 'pump': return stage.flowSp > 0 ? 100 : 0; // Nominal VFD duty
    default: return null;
  }
}

export function generateProgrammedTimeline(quantity: TrackedQuantity, timePoints: number[]): (number | null)[] {
  if (quantity === 'none') return timePoints.map(() => null);

  return timePoints.map(t => {
    const stage = PROGRAMMED_EXCITATION_STAGES.find(s => t <= s.timeSec) 
      || PROGRAMMED_EXCITATION_STAGES[PROGRAMMED_EXCITATION_STAGES.length - 1];

    switch (quantity) {
      case 'flow': return stage.flowSp;
      case 'dp': return stage.dpSp;
      case 'temp': return stage.tempSp;
      case 'pump': return stage.flowSp > 0 ? 95 : 0;
      default: return null;
    }
  });
}

export function generateSteppedSetpointTimeline(channelName: string, timePoints: number[]): (number | null)[] {
  const quantity = getChannelTrackedQuantity(channelName);
  return generateProgrammedTimeline(quantity, timePoints);
}

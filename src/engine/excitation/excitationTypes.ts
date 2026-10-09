/**
 * Excitation Schedule & Dynamic Transient Analytics Types
 * Strictly adhering to Invariant 11 (Modular Sub-Component Architecture)
 */

export interface ProgrammedStageSetpoint {
  stageNum: number;
  timeSec: number;
  dwellSec: number;
  startTimeSec: number;
  tempSp: number;        // Holding Reg 200: °C (scaled /10)
  dpSp: number;          // Holding Reg 201: psi (scaled /10)
  flowSp: number;        // Holding Reg 202: LPM (scaled /10)
  regime: string;        // Operating regime label
  description: string;   // Technical test objective
}

export type TrackedQuantity = 'flow' | 'dp' | 'temp' | 'pump' | 'none';

export type SettlingStability = 'STABLE' | 'SETTLING' | 'DEVIATING' | 'N/A';

export type TransientStatusBadge = 'EXCELLENT' | 'STABLE' | 'WARNING' | 'BREACH' | 'N/A';

export interface StageTransientMetrics {
  stageNum: number;
  timeSec: number;
  channel: string;
  quantity: TrackedQuantity;
  unit: string;
  measured: number | null;
  setpoint: number | null;
  trackingError: number | null;        // Measured - Setpoint
  trackingErrorPercent: number | null; // ((Measured - Setpoint) / Setpoint) * 100
  overshootPercent: number | null;     // Overshoot beyond setpoint (%)
  isSettled: boolean;                  // Within ±5% or 3σ tolerance band
  settlingStability: SettlingStability;
  statusBadge: TransientStatusBadge;
}

export interface ChannelTransientProfile {
  channel: string;
  quantity: TrackedQuantity;
  unit: string;
  stageMetrics: StageTransientMetrics[];
  avgTrackingError: number | null;
  maxTrackingError: number | null;
  maxOvershootPercent: number | null;
  overallStability: 'STABLE' | 'MARGINAL' | 'UNSTABLE' | 'N/A';
  settlingScorePercent: number;        // 0 to 100%
}

export interface UnitTransientSummary {
  flowTrackingError: number | null;
  flowStability: SettlingStability;
  dpTrackingError: number | null;
  dpStability: SettlingStability;
  tempTrackingError: number | null;
  tempStability: SettlingStability;
  overallStability: 'STABLE' | 'MARGINAL' | 'UNSTABLE';
  stagesEvaluated: number;
}

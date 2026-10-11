/**
 * Prescriptive Diagnostics Types & Standard Shopfloor Root Causes
 * 
 * Part of Eagle Eye™ Diagnostics & Tolerance Margin Analyzer (Phase 16 - Task 16.6).
 * Follows CoolIT CDU Shopfloor Engineering Standard SOP-CDU-CHX2000.
 */

export interface SuspectedCause {
  priority: number;
  title: string;
  description: string;
  sopReference?: string;
}

export interface PrescriptiveTuningGuide {
  parameter: string;
  measuredVal: number;
  expectedRange: [number, number];
  deficitStr: string;
  suspectedCauses: SuspectedCause[];
  howToIncrease: string[];
  howToDecrease: string[];
  coupledTradeoffs: string;
}

/**
 * Standard 3-Tier Root Cause Hierarchy for Low Flow (FT01 / FT61).
 * SOP-CDU-CHX2000 shopfloor priority alignment.
 */
export const LOW_FLOW_ROOT_CAUSES: SuspectedCause[] = [
  {
    priority: 1,
    title: 'Air Lock / Incomplete Air Bleed',
    description:
      'Check air vent near primary filter and sight glass. Incomplete air venting prior to Eagle Eye (SOP Step 7) allows trapped air pockets to cavitate pump impellers, causing severe flow deficits.',
    sopReference: 'SOP Step 7'
  },
  {
    priority: 2,
    title: 'Flow Sensor Parameter Calibration',
    description:
      'Check IFM Moneo configuration for flow sensor FT01. If the media parameter is incorrectly set to H2O (instead of Glycol) or the internal pulse scaling/damping parameter is set too high, measured flow reads artificially low. Calibrating this parameter down is used as an authorized adjustment when prolonged air venting is verified.',
    sopReference: 'IFM Moneo Config'
  },
  {
    priority: 3,
    title: 'Motor Ramp Frequency (Control Loop)',
    description:
      'Valves are fixed during test. Verify ABB drive composer parameters P054/P055 for Pump 31 and 41 to ensure motors are not frequency-limited.',
    sopReference: 'ABB Drive Composer P054/P055'
  }
];

export const LOW_FLOW_DIRECTIONAL_INCREASE: string[] = [
  'Re-bleed air via the primary filter air vent (SOP Step 7) until 100% fluid stream is observed without micro-bubbles.',
  'If venting is complete, inspect Moneo sensor parameter and calibrate scaling down.',
  'Verify Pump 31 & 41 VFD speed command is ramping to meet the stage DP setpoint.'
];

export const HIGH_DP_TEMP_DIRECTIONAL_DECREASE: string[] = [
  'High DP dwell causes hydraulic heating. Verify facility primary cooling water supply temperature.',
  'Reduce DP dwell duration if testing limits are exceeded.'
];

export const SUCTION_CAVITATION_WARNING =
  'Warning: Ramping motor speed to increase flow will also decrease suction pressure PT21. Monitor PT21 to ensure it remains above 15 psi to prevent pump cavitation.';

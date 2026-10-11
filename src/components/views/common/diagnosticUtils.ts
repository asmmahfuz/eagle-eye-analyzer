/**
 * Shared Analytical & Diagnostic Helpers
 * 
 * Part of Eagle Eye™ 3-Tier Modular Component Architecture (Phase 16 - Task 16.6).
 * Pure mathematical deficit calculations, excursion delta metrics, and shopfloor
 * root-cause engineering domain attribution with zero React state dependencies.
 */

import type { SubsystemCategory, EvaluatedPoint, FailurePoint } from '../../../types';

export type { FailurePoint };
export * from './prescriptiveGuide';

/**
 * Detailed excursion deficit metrics representing the exact numerical gap
 * between a measured telemetry sensor reading and the required 3-sigma tolerance envelope.
 */
export interface ExcursionDeficitInfo {
  /** Numeric delta value: negative if below lower limit, positive if above upper limit, or buffer fallback */
  deltaVal: number;
  /** Formatted delta with sign and engineering unit, e.g. "-0.61 psi" or "+1.40 °C" */
  deltaStr: string;
  /** Formatted percentage deviation relative to breached limit boundary, e.g. "-7.7%" or "+12.3%" */
  percentStr: string;
  /** Consolidated formatted readout, e.g. "-0.61 psi (-7.7%)" or "+1.40 °C (+12.3%)" */
  formatted: string;
  /** True if reading fell below lower 3σ limit (μ - 3σ) */
  isLower: boolean;
  /** True if reading exceeded upper 3σ limit (μ + 3σ) */
  isUpper: boolean;
}

/**
 * Root-cause classification and shopfloor action directive.
 */
export interface RootCauseAction {
  /** Physical engineering domain, e.g. "Hydraulic & DP Loop" */
  domain: string;
  /** Specific actionable rework and inspection procedure */
  action: string;
  /** Probable physical cause */
  probableCause: string;
  /** Shopfloor rework directive */
  reworkDirective: string;
}

/**
 * Computes exact numeric excursion deficit (Δ), percentage deviation relative to the limit,
 * and boundary breach status for an evaluated point or failure record.
 */
export function getExcursionDeficitInfo(
  f: EvaluatedPoint | {
    measured: number | string | null;
    lowLimit: number | null;
    highLimit: number | null;
    unit?: string;
    marginBuffer?: number | null;
  }
): ExcursionDeficitInfo {
  const meas = typeof f.measured === 'number' ? f.measured : null;
  const unitStr = f.unit ? ` ${f.unit}` : '';

  if (meas === null) {
    return {
      deltaVal: 0,
      deltaStr: '--',
      percentStr: '',
      formatted: '--',
      isLower: false,
      isUpper: false
    };
  }

  // Lower limit excursion (measured < μ - 3σ)
  if (f.lowLimit !== null && meas < f.lowLimit) {
    const delta = meas - f.lowLimit;
    const pct = f.lowLimit !== 0 ? (delta / Math.abs(f.lowLimit)) * 100 : 0;
    const pctFormatted = `${pct.toFixed(1)}%`;
    return {
      deltaVal: delta,
      deltaStr: `${delta.toFixed(2)}${unitStr}`,
      percentStr: pctFormatted,
      formatted: `${delta.toFixed(2)}${unitStr} (${pctFormatted})`,
      isLower: true,
      isUpper: false
    };
  }

  // Upper limit excursion (measured > μ + 3σ)
  if (f.highLimit !== null && meas > f.highLimit) {
    const delta = meas - f.highLimit;
    const pct = f.highLimit !== 0 ? (delta / Math.abs(f.highLimit)) * 100 : 0;
    const pctFormatted = `+${pct.toFixed(1)}%`;
    return {
      deltaVal: delta,
      deltaStr: `+${delta.toFixed(2)}${unitStr}`,
      percentStr: pctFormatted,
      formatted: `+${delta.toFixed(2)}${unitStr} (${pctFormatted})`,
      isLower: false,
      isUpper: true
    };
  }

  const buf = typeof f.marginBuffer === 'number' ? f.marginBuffer : 0;
  return {
    deltaVal: buf,
    deltaStr: `${buf.toFixed(2)}${unitStr}`,
    percentStr: '',
    formatted: `${buf.toFixed(2)}${unitStr}`,
    isLower: buf < 0,
    isUpper: false
  };
}

/**
 * Returns physical engineering domain classification and shopfloor rework directives
 * aligned with real CDU closed-loop physics (SOP-CDU-CHX2000):
 * - Fixed valves during test (no dynamic bypass modulation)
 * - Low flow priority: (1) SOP Step 7 trapped air, (2) Moneo sensor scaling, (3) Motor ramp
 * - High DP dwell hydraulic heating and suction PT21 ≥ 15 psi cavitation limits
 */
export function getSubsystemRootCauseAction(
  category: SubsystemCategory,
  paramName?: string,
  softwareVersion?: string
): RootCauseAction {
  const versionStr = softwareVersion ? ` (${softwareVersion})` : '';
  const param = (paramName || '').trim().toUpperCase();

  let domain = 'Telemetry Sensor';
  let action = 'Inspect channel wiring harness and calibrate transducer.';
  let probableCause = 'Sensor reading deviated from baseline 3-sigma tolerance envelope.';
  let reworkDirective = 'Inspect transducer wiring and zero-point calibration.';

  switch (category) {
    case 'hydraulic': {
      domain = 'Hydraulic & DP Loop';
      if (param.includes('FT') || param.includes('FLOW')) {
        probableCause = 'Trapped air lock from incomplete SOP Step 7 venting or IFM Moneo sensor parameter scaling.';
        reworkDirective = '↑ Re-bleed via filter vent (SOP Step 7) until bubble-free. Inspect Moneo scaling if venting complete.';
      } else if (param.includes('FCV61')) {
        probableCause = 'Valves remain fixed during test. FCV61 seat drift or analog command offset.';
        reworkDirective = 'Verify FCV61 closed mechanical seating and 0–10V command calibration.';
      } else {
        probableCause = 'Valves fixed during test. Dynamic DP tracking lag from Pump 31 & 41 VFD ramp or impulse line air.';
        reworkDirective = 'Verify ABB drive parameters P054/P055, bleed sensor impulse lines, and check filter DP.';
      }
      action = reworkDirective;
      break;
    }
    case 'pump': {
      domain = 'Pumps & VFD Drive';
      probableCause = param.includes('P31') || param.includes('P41')
        ? `Circulation pump ${param} VFD frequency ramp lag or parameter P054 clamp.`
        : 'Circulation pump VFD inverter speed deviation from setpoint profile.';
      reworkDirective = 'Verify ABB Drive Composer parameters P054/P055 (P054 min 56% / 33.6 Hz) and terminal connections.';
      action = reworkDirective;
      break;
    }
    case 'temperature': {
      domain = 'Thermal Loop & Probes';
      probableCause = 'Hydraulic heating from prolonged high DP dwell or primary facility chilled water deficit.';
      reworkDirective = 'Verify facility cooling water supply temp/flow. Reduce DP dwell duration if testing limits exceeded.';
      action = reworkDirective;
      break;
    }
    case 'pressure': {
      domain = 'Pressure Transmitters';
      if (param.includes('PT21') || param.includes('PT11')) {
        probableCause = 'Suction pressure drawdown under high pump flow demand approaching cavitation limit.';
        reworkDirective = 'Verify coolant reservoir level and make-up pressure. Ensure PT21 remains ≥ 15 psi to prevent cavitation.';
      } else {
        probableCause = 'Transducer impulse line air entrainment or diaphragm zero-offset drift.';
        reworkDirective = 'Bleed impulse lines at PT manifold, check atmospheric zero calibration, and verify wiring.';
      }
      action = reworkDirective;
      break;
    }
    case 'environmental': {
      domain = 'Ambient Cleanroom Conditions';
      probableCause = 'Test bay ambient HVAC relative humidity or room temperature excursion.';
      reworkDirective = 'Verify test bay cleanroom HVAC dehumidifier control and record ambient room temperature/hygrometer before re-test.';
      action = reworkDirective;
      break;
    }
    case 'system': {
      domain = 'Firmware & System Configuration';
      probableCause = `Controller software build revision mismatch${versionStr}.`;
      reworkDirective = `Verify controller software build revision matches FTR specification${versionStr}.`;
      action = reworkDirective;
      break;
    }
    case 'setpoint': {
      domain = 'Excitation Setpoints';
      probableCause = 'Modbus excitation setpoint communication delay or register write fault.';
      reworkDirective = 'Verify Modbus excitation profile registers (Reg 200 Temp SP, Reg 201 DP SP, Reg 202 Flow SP) and link-local communications.';
      action = reworkDirective;
      break;
    }
  }

  return { domain, action, probableCause, reworkDirective };
}

/**
 * Provides step-by-step factory floor corrective actions for an individual test channel.
 */
export function getChannelCorrectiveSteps(
  category: SubsystemCategory,
  paramName?: string,
  _stats?: { peak?: number | null; settling?: number | null; unit?: string }
): string[] {
  const p = (paramName || '').toUpperCase();

  if (p.includes('FT') || p.includes('FLOW')) {
    return [
      '#1 Primary Action: Re-bleed air via primary filter air vent (SOP Step 7) until 100% fluid stream is observed without micro-bubbles.',
      '#2 Secondary Action: If venting is complete, inspect IFM Moneo sensor media parameter and calibrate scaling down.',
      '#3 Control Action: Valves are fixed. Verify ABB drive composer parameters P054/P055 for Pump 31 & 41 to ensure motors are not frequency-limited.'
    ];
  }

  if (p.includes('DP')) {
    return [
      'Verify Pump 31 & 41 VFD speed command is ramping to meet stage DP setpoint (valves remain fixed).',
      'Bleed air pockets at differential pressure sensor impulse lines.',
      'Inspect secondary and primary filter differential pressures for debris loading.'
    ];
  }

  if (p.includes('PT21') || p.includes('PT11')) {
    return [
      'Monitor PT21 suction pressure to ensure it remains above 15.0 psi to prevent pump cavitation.',
      'Check coolant expansion reservoir level and top up glycol charge.',
      'Clean pump suction strainer baskets to eliminate intake head losses.'
    ];
  }

  switch (category) {
    case 'pump':
      return [
        'Inspect ABB drive parameters P054/P055 in Drive Composer.',
        'Verify minimum pump speed parameter is set to ≥ 56.00% (33.6 Hz per Invariant 7).',
        'Verify PLC 0–10V analog speed reference tracking.'
      ];
    case 'temperature':
      return [
        'High DP dwell causes hydraulic heating. Verify facility primary cooling water supply temperature.',
        'Reduce DP dwell duration if testing limits are exceeded.',
        'Inspect RTD probe thermal well contact and sensor zero/span calibration.'
      ];
    case 'pressure':
      return [
        'Bleed pressure transducer impulse line to purge entrained air.',
        'Perform zero-point check with loop depressurized.',
        'Inspect terminal strip wiring and shield grounding.'
      ];
    case 'environmental':
      return [
        'Verify test cell HVAC dehumidifier operation and ambient climate control.',
        'This is a facility ambient condition; ensure room humidity is within test bay envelope.'
      ];
    case 'system':
      return [
        'Verify controller firmware build revision matches the required customer production release.',
        'Confirm parameter register mappings against FTR release notes.'
      ];
    default:
      return [
        'Review sensor calibration record and check terminal wiring.',
        'Re-test operating step under steady-state conditions to verify recurrence.'
      ];
  }
}

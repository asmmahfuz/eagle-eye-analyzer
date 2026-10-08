/**
 * Shared Analytical & Diagnostic Helpers
 * 
 * Part of Eagle Eye™ 3-Tier Modular Component Architecture (Phase 9 - Task 9.2).
 * Pure mathematical deficit calculations, excursion delta metrics, and shopfloor
 * root-cause engineering domain attribution with zero React state dependencies.
 */

import type { SubsystemCategory, EvaluatedPoint, FailurePoint } from '../../../types';

export type { FailurePoint };

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
}

/**
 * Computes exact numeric excursion deficit (Δ), percentage deviation relative to the limit,
 * and boundary breach status for an evaluated point or failure record.
 * 
 * Mathematical Formulation:
 * - Lower Breach (measured < lowLimit):
 *     Δ = measured - lowLimit (strictly negative)
 *     % Deviation = (Δ / |lowLimit|) * 100
 * - Upper Breach (measured > highLimit):
 *     Δ = measured - highLimit (strictly positive)
 *     % Deviation = (Δ / |highLimit|) * 100
 * - In-Bounds / Fallback (marginBuffer):
 *     Δ = marginBuffer
 * 
 * @param f The failure point or evaluated telemetry point
 * @returns ExcursionDeficitInfo containing exact numeric deltas and formatted strings
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

  // Non-numeric or missing reading
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

  // Fallback to margin buffer if present
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
 * partitioned by subsystem category, parameter identifier, and optional firmware version.
 * 
 * Complies with Invariant 4 (Root-Cause Subsystem Classification) and CoolIT Systems™ CDU specs:
 * - Hydraulic & DP Loop: Bypass valve FCV61, filter differentials, loop restriction.
 * - Pumps & VFD Drive: Minimum pump speed (≥ 56% / 33.6 Hz), VFD terminal connections.
 * - Thermal Loop: RTD probes, secondary chiller heat exchange, thermal well paste.
 * - Pressure Transmitters: Impulse lines air entrainment, zero-offset calibration.
 * - Environmental: Test bay cleanroom HVAC humidity/temperature limits.
 * - Firmware/System: Controller software build revision verification.
 * 
 * @param category Subsystem domain category
 * @param paramName Optional channel / transducer tag name
 * @param softwareVersion Optional software build version string (e.g. from FTR metadata)
 * @returns RootCauseAction containing engineering domain and actionable shopfloor instructions
 */
export function getSubsystemRootCauseAction(
  category: SubsystemCategory,
  paramName?: string,
  softwareVersion?: string
): RootCauseAction {
  const versionStr = softwareVersion ? ` (${softwareVersion})` : '';
  const param = (paramName || '').trim();

  switch (category) {
    case 'hydraulic': {
      if (param.includes('FCV61')) {
        return {
          domain: 'Hydraulic & DP Loop',
          action: 'Inspect modulating bypass valve FCV61 mechanical seating, 0–10V command calibration, and verify valve travel feedback.'
        };
      }
      return {
        domain: 'Hydraulic & DP Loop',
        action: 'Verify loop differential pressure, inspect secondary filter restriction, and check modulating bypass valve FCV61 mechanical seating & calibration.'
      };
    }
    case 'pump': {
      if (param.includes('P31') || param.includes('P41')) {
        return {
          domain: 'Pumps & VFD Drive',
          action: `Inspect circulation pump ${param} inverter speed register, terminal connections, and verify minimum pump frequency (≥ 56% / 33.6 Hz).`
        };
      }
      return {
        domain: 'Pumps & VFD Drive',
        action: 'Inspect circulation pump VFD inverter speed register, terminal connections, and verify minimum pump frequency (≥ 56% / 33.6 Hz).'
      };
    }
    case 'temperature': {
      return {
        domain: 'Thermal Loop & Probes',
        action: 'Inspect temperature transmitter probe harness wiring, verify secondary chiller loop heat exchange, and check transducer zero/span.'
      };
    }
    case 'pressure': {
      return {
        domain: 'Pressure Transmitters',
        action: 'Inspect transducer impulse lines for entrained air, verify sensor zero-offset calibration, and check reservoir vacuum seal.'
      };
    }
    case 'environmental': {
      return {
        domain: 'Ambient Cleanroom Conditions',
        action: 'Verify test bay cleanroom HVAC dehumidifier control and record ambient room temperature/hygrometer before re-test.'
      };
    }
    case 'system': {
      return {
        domain: 'Firmware & System Configuration',
        action: `Verify controller software build revision matches FTR specification${versionStr}.`
      };
    }
    case 'setpoint': {
      return {
        domain: 'Excitation Setpoints',
        action: 'Verify Modbus excitation profile registers (Reg 200 Temp SP, Reg 201 DP SP, Reg 202 Flow SP) and link-local communications.'
      };
    }
    default: {
      return {
        domain: 'Telemetry Sensor',
        action: 'Inspect channel wiring harness and calibrate transducer.'
      };
    }
  }
}

/**
 * Provides step-by-step factory floor corrective actions for an individual test channel.
 * 
 * @param category Subsystem domain category
 * @param paramName Optional channel / transducer tag name
 * @param stats Optional summary stats (peak, settling, unit)
 * @returns Array of step-by-step corrective actions
 */
export function getChannelCorrectiveSteps(
  category: SubsystemCategory,
  paramName?: string,
  stats?: { peak?: number | null; settling?: number | null; unit?: string }
): string[] {
  switch (category) {
    case 'hydraulic':
      return [
        'Inspect loop differential pressure transmitters and check primary/secondary filter condition.',
        'Verify bypass valve FCV61 calibration and check flow meter readings across high flow stages.',
        'Check for hydraulic loop constriction or air entrainment in the CDU manifold.'
      ];
    case 'environmental': {
      const peakStr = stats?.peak !== null && stats?.peak !== undefined 
        ? `${stats.peak.toFixed(1)} ${stats.unit || ''}`.trim() 
        : 'excursion level';
      return [
        `Test bay ambient reading logged at ${peakStr}.`,
        'Verify test cell HVAC climate control and ambient dehumidifier operation. This is an environmental facility condition.'
      ];
    }
    case 'system': {
      const settlingStr = stats?.settling !== null && stats?.settling !== undefined 
        ? String(stats.settling) 
        : 'current value';
      return [
        `Configuration parameter mismatch: Unit logged ${settlingStr}.`,
        'Verify controller firmware build revision matches the required customer production release.'
      ];
    }
    case 'pump':
      return [
        'Inspect pump VFD parameters and speed command tracking across operating steps.',
        'Check pump impeller rotation direction and verify differential pressure build.'
      ];
    case 'temperature':
      return [
        'Check RTD/temperature transmitter calibration and thermal well contact paste.',
        'Inspect facility chilled water supply and secondary heat exchanger loop balance.'
      ];
    case 'pressure':
      return [
        'Inspect pressure transducer calibration and check wiring harness on terminal strip.',
        'Perform zero-point check with loop depressurized.'
      ];
    default:
      return [
        'Review sensor calibration record and check terminal wiring.',
        'Re-test operating step under steady-state conditions to verify recurrence.'
      ];
  }
}

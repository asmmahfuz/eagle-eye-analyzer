/**
 * Prescriptive Diagnostics & Directional Tuning Guide Generator
 * 
 * Part of Eagle Eye™ Diagnostics & Tolerance Margin Analyzer (Phase 16 - Task 16.6).
 * Computes channel-specific root cause rankings, directional tuning directives,
 * and closed-loop interlock warnings.
 */

import {
  PrescriptiveTuningGuide,
  LOW_FLOW_ROOT_CAUSES,
  LOW_FLOW_DIRECTIONAL_INCREASE,
  HIGH_DP_TEMP_DIRECTIONAL_DECREASE,
  SUCTION_CAVITATION_WARNING
} from './prescriptiveTypes';

export * from './prescriptiveTypes';

/**
 * Generates closed-loop prescriptive tuning instructions and root-cause hierarchy
 * for any given channel based on physical transducer domain and measured breach.
 */
export function getPrescriptiveTuningGuide(
  parameter: string,
  measuredVal = 0,
  expectedRange: [number, number] = [0, 0],
  deficitStr = ''
): PrescriptiveTuningGuide {
  const p = parameter.toUpperCase();

  // 1. Flow Transmitters (FT01, FT61, Flow channels)
  if (p.includes('FT') || p.includes('FLOW')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: LOW_FLOW_ROOT_CAUSES,
      howToIncrease: LOW_FLOW_DIRECTIONAL_INCREASE,
      howToDecrease: [
        'Reduce Pump 31 & 41 speed demand via VFD inverter parameter P054.',
        'Inspect customer loop for overpressure or verify downstream bypass seating.',
        'Check IFM Moneo pulse scaling parameter if sensor is over-reporting flow.'
      ],
      coupledTradeoffs: SUCTION_CAVITATION_WARNING
    };
  }

  // 2. Differential Pressures (DP, Secondary DP, Primary DP, Filter DPs)
  if (p.includes('DP') || p.includes('DIFFERENTIAL')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: [
        {
          priority: 1,
          title: 'Pump VFD Frequency Ramp Tracking Lag',
          description:
            'Valves remain fixed during test. Dynamic DP relies solely on Pump 31 & 41 PID speed ramping. Drive ramp lag creates temporary DP deficits.',
          sopReference: 'ABB Drive Composer P054/P055'
        },
        {
          priority: 2,
          title: 'Air Entrainment in Sensor Manifold',
          description:
            'Trapped air in differential pressure sensing lines causes delayed transducer response or dampening.',
          sopReference: 'SOP Step 7 Venting'
        },
        {
          priority: 3,
          title: 'Filter Element Contamination',
          description:
            'Excessive debris on pump suction strainer or primary filter 53 causes abnormal localized differential pressure drops.',
          sopReference: 'Filter Inspection'
        }
      ],
      howToIncrease: [
        'Verify ABB drive composer parameters P054/P055 allow full frequency ramping for Pumps 31 & 41.',
        'Bleed impulse lines at PT manifold to clear trapped air pockets.',
        'Verify bypass valve FCV61 is fully seated.'
      ],
      howToDecrease: HIGH_DP_TEMP_DIRECTIONAL_DECREASE,
      coupledTradeoffs:
        'Warning: Ramping motor speed to increase DP will also decrease suction pressure PT21 and cause hydraulic heating in the closed fluid loop.'
    };
  }

  // 3. Suction Pressure (PT21, PT11, Pump Inlets)
  if (p.includes('PT21') || p.includes('PT11') || p.includes('SUCTION')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: [
        {
          priority: 1,
          title: 'Suction Drawdown Under High Pump RPM',
          description:
            'Pumps 31 & 41 drawing fluid faster than make-up supply can replenish, pulling suction pressure down toward cavitation threshold.',
          sopReference: 'Cavitation Guard'
        },
        {
          priority: 2,
          title: 'Reservoir Charge & Nitrogen Blanket Depletion',
          description:
            'Expansion reservoir fluid volume low or make-up regulator pressure set below factory specification.',
          sopReference: 'Reservoir Charge SOP'
        },
        {
          priority: 3,
          title: 'Suction Strainer Restriction',
          description:
            'Debris on pump suction strainer creating high local inlet head loss.',
          sopReference: 'Strainer Maintenance'
        }
      ],
      howToIncrease: [
        'Verify coolant reservoir fluid level sight glass and top up glycol charge.',
        'Reduce pump speed demand or shorten high DP dwell durations.',
        'Clean pump suction strainer baskets to eliminate intake restriction.'
      ],
      howToDecrease: [
        'Vent excess gas head space at expansion reservoir vent port.',
        'Verify facility supply regulator pressure.'
      ],
      coupledTradeoffs:
        'Critical Invariant: Suction pressure PT21 must remain above 15.0 psi under all operating stages to prevent pump cavitation.'
    };
  }

  // 4. Temperature Sensors (TT01..TT62, Temperature Dwell)
  if (p.includes('TT') || p.includes('TEMP')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: [
        {
          priority: 1,
          title: 'Hydraulic Heating from High DP Dwells',
          description:
            'Pump mechanical energy dissipation converts into fluid heat during prolonged high differential pressure stages.',
          sopReference: 'Thermal Dissipation SOP'
        },
        {
          priority: 2,
          title: 'Facility Primary Chilled Water Flow Deficit',
          description:
            'Facility chilled water supply (FT61 / PT51) insufficient or supply temperature too warm to extract secondary heat load.',
          sopReference: 'Facility Chiller Loop'
        },
        {
          priority: 3,
          title: 'RTD Probe Calibration / Thermal Well Contact',
          description:
            'Transducer resistance offset or degraded thermal conductive paste in RTD immersion well.',
          sopReference: 'Transducer Calibration'
        }
      ],
      howToIncrease: [
        'Inspect primary facility cooling valve FCV61 modulating bypass.',
        'Allow thermal stabilization at stage dwell before recording steady-state read.'
      ],
      howToDecrease: HIGH_DP_TEMP_DIRECTIONAL_DECREASE,
      coupledTradeoffs:
        'Thermal Interlock: High DP pumping operations generate up to 5 kW of frictional heat. Reducing temperature requires adequate facility cooling water.'
    };
  }

  // 5. Pump Speeds & VFD Actuators (P31, P41, FCV61)
  if (p.includes('P31') || p.includes('P41') || p.includes('SPEED') || p.includes('FCV61')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: [
        {
          priority: 1,
          title: 'ABB Drive Composer Parameter Bounds (P054/P055)',
          description:
            'VFD inverter speed clamp set too restrictive. Minimum speed parameter P054 must be 56.00% (33.6 Hz), maximum 100%.',
          sopReference: 'ABB Drive Composer P054/P055'
        },
        {
          priority: 2,
          title: '0–10V Analog Speed Command Scaling',
          description:
            'PLC analog output module 0–10V voltage offset or 10x multiplier scaling misconfiguration.',
          sopReference: 'PLC Analog I/O'
        },
        {
          priority: 3,
          title: 'Modbus Speed Reference Update Delay',
          description:
            'PLC PID speed loop update rate lagging behind commanded stage step timetable.',
          sopReference: 'Modbus Polling Profile'
        }
      ],
      howToIncrease: [
        'Verify ABB drive composer parameter P055 allows maximum frequency (60 Hz / 100%).',
        'Inspect PLC 0–10V analog speed reference terminal wiring.',
        'Verify target DP setpoint command is reaching the drive controller.'
      ],
      howToDecrease: [
        'Ensure minimum pump speed parameter P054 is respected (never operate below 56% / 33.6 Hz per Invariant 7).',
        'Adjust stage DP setpoint down to decrease required pump RPM.'
      ],
      coupledTradeoffs: SUCTION_CAVITATION_WARNING
    };
  }

  // 6. Generic Pressure Transmitters (PT01..PT62)
  if (p.includes('PT')) {
    return {
      parameter,
      measuredVal,
      expectedRange,
      deficitStr,
      suspectedCauses: [
        {
          priority: 1,
          title: 'Transducer Impulse Line Air Entrainment',
          description:
            'Air bubbles trapped in sensing lines causing false pressure reading or sluggish response.',
          sopReference: 'SOP Step 7 Bleed'
        },
        {
          priority: 2,
          title: 'Sensor Atmospheric Zero / Span Drift',
          description:
            'Transducer diaphragm zero-point offset drifted from 0.00 psig atmospheric calibration.',
          sopReference: 'Transducer Calibration'
        },
        {
          priority: 3,
          title: 'Modbus Register Scaling / Rollover',
          description:
            'Signed 16-bit integer two\'s complement interpretation or open-circuit 0xFFFF hardware sentinel.',
          sopReference: 'Modbus Dictionary'
        }
      ],
      howToIncrease: [
        'Check line pressure isolation needle valves to ensure sensor port is fully open.',
        'Ramp circulation pump speed to raise header pressure.',
        'Bleed sensor impulse line to purge air pocket.'
      ],
      howToDecrease: [
        'Lower pump speed or reduce downstream restriction.',
        'Inspect pressure relief valve (PRV) setpoint.'
      ],
      coupledTradeoffs:
        'Hydraulic Guard: Verify differential between supply and return pressures does not exceed maximum allowable loop rating.'
    };
  }

  // 7. Ambient / Firmware / Default Fallback
  return {
    parameter,
    measuredVal,
    expectedRange,
    deficitStr,
    suspectedCauses: [
      {
        priority: 1,
        title: 'Environmental or Configuration Deviation',
        description:
          'Reading or setting deviates from the standardized baseline specification for this operating stage.',
        sopReference: 'FTR General Spec'
      }
    ],
    howToIncrease: [
      'Verify cleanroom HVAC environmental controls and sensor calibration.'
    ],
    howToDecrease: [
      'Adjust facility environmental parameters or verify configuration build release.'
    ],
    coupledTradeoffs:
      'Ensure test cell ambient parameters match standardized factory baseline conditions.'
  };
}

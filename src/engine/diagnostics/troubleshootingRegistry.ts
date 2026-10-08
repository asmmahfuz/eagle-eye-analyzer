import { CanonicalFaultDefinition, FaultCodeId } from './faultTypes';
import { CANONICAL_FAULTS, getFaultDefinition } from './faultCatalog';

export interface ShopfloorDirective {
  faultId: FaultCodeId;
  codeNumber: number;
  subsystemTitle: string;
  requiredTools: string[];
  safetyAdvisory: string;
  inspectionStages: {
    stage: 'Mechanical Inspection' | 'Electrical & Transducer' | 'PLC Firmware & Parameters' | 'Verification & Retest';
    action: string;
  }[];
}

export const SHOPFLOOR_TROUBLESHOOTING_REGISTRY: Record<number, ShopfloorDirective> = {
  1: {
    faultId: 'FAULT-01',
    codeNumber: 1,
    subsystemTitle: 'Primary Loop Hydraulic Over-Flow',
    requiredTools: ['Ultrasonic Flow Meter Verification Clamp', 'Digital Multimeter', 'Borescope'],
    safetyAdvisory: 'Depressurize primary facility loop before decoupling mechanical flow meters.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect primary bypass line valve seating; verify zero internal leakage.' },
      { stage: 'Electrical & Transducer', action: 'Verify FT01 signal wiring and shield grounding to prevent false 4-20mA pulses.' },
      { stage: 'PLC Firmware & Parameters', action: 'Confirm Modbus Address 37 scaling factor is 10.0 LPM/count.' },
      { stage: 'Verification & Retest', action: 'Rerun 160 LPM steady-state dwell test and observe primary/secondary flow ratio.' }
    ]
  },
  2: {
    faultId: 'FAULT-02',
    codeNumber: 2,
    subsystemTitle: 'Primary Loop Hydraulic Starvation',
    requiredTools: ['Differential Pressure Gauge', 'Valve Stroke Indicator', 'Torque Wrench'],
    safetyAdvisory: 'Ensure supply line isolation valves are locked open during testing.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect primary Y-strainer and basket filter for particulate contamination.' },
      { stage: 'Electrical & Transducer', action: 'Check FCV61 analog 0-10V control signal from PLC.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify primary control loop PID setpoint tracking parameter.' },
      { stage: 'Verification & Retest', action: 'Perform valve 0-100% full-stroke ramp and log flow response.' }
    ]
  },
  3: {
    faultId: 'FAULT-03',
    codeNumber: 3,
    subsystemTitle: 'Secondary Loop Over-Flow vs PQ Benchmark',
    requiredTools: ['Reference Flow Rig', 'VFD Interface Terminal', 'Tachometer'],
    safetyAdvisory: 'High-velocity fluid circulation. Avoid rapid valve closures.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Check secondary manifold bypass throttling valve position.' },
      { stage: 'Electrical & Transducer', action: 'Verify FT61 turbine pickup coil air gap and pulse counter.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify maximum pump speed parameter P055 is capped at 100% (60.0 Hz).' },
      { stage: 'Verification & Retest', action: 'Verify steady-state secondary flow against golden unit PQ curve.' }
    ]
  },
  4: {
    faultId: 'FAULT-04',
    codeNumber: 4,
    subsystemTitle: 'Secondary Loop Under-Flow vs PQ Benchmark',
    requiredTools: ['Impeller Inspection Kit', 'Filter DP Gauge', 'Current Clamp'],
    safetyAdvisory: 'Verify both pumps P31 and P41 are powered and phased correctly.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect pump suction strainers and primary filter 53 for high DP.' },
      { stage: 'Electrical & Transducer', action: 'Measure three-phase AC currents on P31 and P41 motors.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify lead/lag pump staging parameters and minimum speed P054 (>=56%).' },
      { stage: 'Verification & Retest', action: 'Run Stage 5 (560 LPM peak flow) and verify pump frequency reaches 60 Hz.' }
    ]
  },
  5: {
    faultId: 'FAULT-05',
    codeNumber: 5,
    subsystemTitle: 'Secondary Loop Differential Pressure High Excursion',
    requiredTools: ['Digital Manometer (0-50 PSI)', 'Transducer Calibrator', 'Purge Tool'],
    safetyAdvisory: 'Do not exceed 40 PSI secondary differential pressure limit.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect test bay server simulator orifice plate for blockages.' },
      { stage: 'Electrical & Transducer', action: 'Check PT61 supply and PT62 return transducer zero-calibration.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify DP setpoint Address 201 matches test stage expectation.' },
      { stage: 'Verification & Retest', action: 'Bleed air from DP transducer impulse tubing and recheck differential reading.' }
    ]
  },
  6: {
    faultId: 'FAULT-06',
    codeNumber: 6,
    subsystemTitle: 'Secondary Loop Differential Pressure Low Excursion',
    requiredTools: ['Digital Manometer', 'Multimeter', 'Modbus Diagnostic Sniffer'],
    safetyAdvisory: 'Check for two\'s complement rollover on negative differential values.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect bypass relief valve to ensure it is not stuck open.' },
      { stage: 'Electrical & Transducer', action: 'Verify PT61 and PT62 wiring polarity and excitation voltages (24VDC).' },
      { stage: 'PLC Firmware & Parameters', action: 'Ensure signed integer 16-bit decoding is active in firmware.' },
      { stage: 'Verification & Retest', action: 'Re-zero DP sensor at zero flow and verify positive DP under pump duty.' }
    ]
  },
  7: {
    faultId: 'FAULT-07',
    codeNumber: 7,
    subsystemTitle: 'Primary Supply Temperature Parity Breach (High)',
    requiredTools: ['Calibrated Reference Thermometer (±0.05°C)', 'Thermal Paste', 'RTD Simulator'],
    safetyAdvisory: 'Allow thermal bath to equilibrate before probe calibration.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect TT01 thermowell depth and thermal heat transfer compound.' },
      { stage: 'Electrical & Transducer', action: 'Check RTD PT100/PT1000 4-wire resistance bridge balance.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify temperature offset parameter in PLC calibration table.' },
      { stage: 'Verification & Retest', action: 'Cross-check TT01 against TT02, TT61, and TT62 under uniform fluid temperature.' }
    ]
  },
  15: {
    faultId: 'FAULT-15',
    codeNumber: 15,
    subsystemTitle: 'Pump 0 VFD Over-Speed Anomaly',
    requiredTools: ['Optical Tachometer', 'Power Analyzer', 'VFD Keypad'],
    safetyAdvisory: 'High voltage 480VAC / 650VDC bus inside VFD cabinet.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Inspect pump motor shaft coupling and bearing alignment.' },
      { stage: 'Electrical & Transducer', action: 'Measure 0-10V analog speed reference from PLC terminal AO0.' },
      { stage: 'PLC Firmware & Parameters', action: 'Confirm maximum frequency parameter on drive is capped at 60.0 Hz (100%).' },
      { stage: 'Verification & Retest', action: 'Command 75% speed and verify physical shaft RPM matches 2650 RPM.' }
    ]
  },
  16: {
    faultId: 'FAULT-16',
    codeNumber: 16,
    subsystemTitle: 'Pump 0 VFD Under-Speed / Stall Anomaly',
    requiredTools: ['Multimeter', 'VFD Keypad', 'Phase Rotation Meter'],
    safetyAdvisory: 'Check motor thermal overload before clearing drive faults.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: 'Check for impeller binding or foreign debris in pump volute.' },
      { stage: 'Electrical & Transducer', action: 'Inspect VFD run enable contactor and 24V digital command lines.' },
      { stage: 'PLC Firmware & Parameters', action: 'Verify minimum speed parameter P054 is set to 56.00% (33.6 Hz).' },
      { stage: 'Verification & Retest', action: 'Restart pump at 56% baseline and confirm smooth rotation.' }
    ]
  }
};

export function getTroubleshootingGuide(codeNumber: number): ShopfloorDirective | undefined {
  if (SHOPFLOOR_TROUBLESHOOTING_REGISTRY[codeNumber]) {
    return SHOPFLOOR_TROUBLESHOOTING_REGISTRY[codeNumber];
  }
  const fault = getFaultDefinition(codeNumber);
  if (!fault) return undefined;

  // General fallback directive for temperature/pump variants
  const isTemp = fault.domain === 'temperature';
  return {
    faultId: fault.id,
    codeNumber: fault.codeNumber,
    subsystemTitle: fault.shortName,
    requiredTools: isTemp 
      ? ['Calibrated Reference Thermometer', 'Thermal Paste', 'RTD Simulator']
      : ['Digital Multimeter', 'VFD Keypad', 'Oscilloscope'],
    safetyAdvisory: isTemp
      ? 'Ensure loop fluid is at safe operating temperature before withdrawing RTD sensor.'
      : 'Lockout electrical main breaker before servicing motor leads.',
    inspectionStages: [
      { stage: 'Mechanical Inspection', action: `Inspect physical mounting, wiring harness, and thermowell for ${fault.associatedSensors.join(', ')}.` },
      { stage: 'Electrical & Transducer', action: `Perform 4-wire resistance and continuity check on ${fault.associatedSensors[0]}.` },
      { stage: 'PLC Firmware & Parameters', action: 'Verify sensor channel gain and zero offset in PLC register configuration.' },
      { stage: 'Verification & Retest', action: `Retest sensor readings across 10 test stages and verify parity against remaining sensors.` }
    ]
  };
}

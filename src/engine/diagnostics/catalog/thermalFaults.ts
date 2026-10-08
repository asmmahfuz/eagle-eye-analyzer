import { CanonicalFaultDefinition } from '../faultTypes';

export const THERMAL_FAULTS: CanonicalFaultDefinition[] = [
  {
    id: 'FAULT-07',
    codeNumber: 7,
    title: 'Fault Code 7: Abnormal High Primary Supply Temperature Check',
    shortName: 'Abnormal High Primary Supply Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT01', 'TT02', 'TT61', 'TT62'],
    mathDescription: 'TT01 > Upper limit for uncertainty × Avg(TT02, TT61, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check primary supply temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT01 RTD probe thermowell thermal paste',
      'Check TT01 transmitter wiring and 4-wire resistance bridge',
      'Verify PLC analog input scaling'
    ]
  },
  {
    id: 'FAULT-08',
    codeNumber: 8,
    title: 'Fault Code 8: Abnormal Low Primary Supply Temperature Check',
    shortName: 'Abnormal Low Primary Supply Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT01', 'TT02', 'TT61', 'TT62'],
    mathDescription: 'TT01 < Lower limit for uncertainty × Avg(TT02, TT61, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check primary supply temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT01 probe connection for loose terminals',
      'Check for open-circuit bias',
      'Recalibrate RTD offset in PLC'
    ]
  },
  {
    id: 'FAULT-09',
    codeNumber: 9,
    title: 'Fault Code 9: Abnormal High Secondary Supply Temperature Check',
    shortName: 'Abnormal High Secondary Supply Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT61', 'TT01', 'TT02', 'TT62'],
    mathDescription: 'TT61 > Upper limit for uncertainty × Avg(TT01, TT02, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check secondary supply temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT61 RTD probe thermowell thermal paste',
      'Check TT61 transmitter wiring',
      'Recalibrate RTD offset in PLC'
    ]
  },
  {
    id: 'FAULT-10',
    codeNumber: 10,
    title: 'Fault Code 10: Abnormal Low Secondary Supply Temperature Check',
    shortName: 'Abnormal Low Secondary Supply Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT61', 'TT01', 'TT02', 'TT62'],
    mathDescription: 'TT61 < Lower limit for uncertainty × Avg(TT01, TT02, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check secondary supply temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT61 wiring terminal block',
      'Perform multi-meter resistance cross-check',
      'Replace RTD sensor if drifting'
    ]
  },
  {
    id: 'FAULT-11',
    codeNumber: 11,
    title: 'Fault Code 11: Abnormal High Primary Return Temperature Check',
    shortName: 'Abnormal High Primary Return Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT02', 'TT01', 'TT61', 'TT62'],
    mathDescription: 'TT02 > Upper limit for uncertainty × Avg(TT01, TT61, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check primary return temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT02 RTD probe thermowell thermal paste',
      'Check TT02 transmitter wiring',
      'Recalibrate RTD offset in PLC'
    ]
  },
  {
    id: 'FAULT-12',
    codeNumber: 12,
    title: 'Fault Code 12: Abnormal Low Primary Return Temperature Check',
    shortName: 'Abnormal Low Primary Return Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT02', 'TT01', 'TT61', 'TT62'],
    mathDescription: 'TT02 < Lower limit for uncertainty × Avg(TT01, TT61, TT62)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check primary return temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT02 wiring for cold solder or loose crimp',
      'Cross-check against reference thermometer',
      'Replace RTD sensor'
    ]
  },
  {
    id: 'FAULT-13',
    codeNumber: 13,
    title: 'Fault Code 13: Abnormal High Secondary Return Temperature Check',
    shortName: 'Abnormal High Secondary Return Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT62', 'TT01', 'TT02', 'TT61'],
    mathDescription: 'TT62 > Upper limit for uncertainty × Avg(TT01, TT02, TT61)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check secondary return temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT62 RTD probe thermowell thermal paste',
      'Check TT62 transmitter wiring',
      'Recalibrate RTD offset in PLC'
    ]
  },
  {
    id: 'FAULT-14',
    codeNumber: 14,
    title: 'Fault Code 14: Abnormal Low Secondary Return Temperature Check',
    shortName: 'Abnormal Low Secondary Return Temp',
    category: 'temperature',
    domain: 'temperature',
    severity: 'warning',
    associatedSensors: ['TT62', 'TT01', 'TT02', 'TT61'],
    mathDescription: 'TT62 < Lower limit for uncertainty × Avg(TT01, TT02, TT61)',
    purpose: 'The four temperature sensors (primary supply, primary return, secondary supply, secondary return) should have very similar temperature.',
    troubleshooting: 'Check secondary return temperature wiring and sensor.',
    remediationSteps: [
      'Inspect TT62 wiring harness and junction',
      'Cross-check against calibrated probe',
      'Replace probe'
    ]
  }
];

import { CanonicalFaultDefinition } from '../faultTypes';

export const PUMP_FAULTS: CanonicalFaultDefinition[] = [
  {
    id: 'FAULT-15',
    codeNumber: 15,
    title: 'Fault Code 15: Abnormal High Pump 0 Speed',
    shortName: 'Abnormal High Pump 0 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'critical',
    associatedSensors: ['P31 Speed %'],
    mathDescription: 'Pump 0 Speed > Upper limit for pump speed (100%)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 0 and its wiring.',
    remediationSteps: [
      'Verify PLC VFD drive maximum speed scaling parameter',
      'Check analog 0-10V command register',
      'Inspect firmware revision'
    ]
  },
  {
    id: 'FAULT-16',
    codeNumber: 16,
    title: 'Fault Code 16: Abnormal Low Pump 0 Speed',
    shortName: 'Abnormal Low Pump 0 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'critical',
    associatedSensors: ['P31 Speed %'],
    mathDescription: 'Pump 0 Speed < Lower limit for pump speed (25% / 56% baseline)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 0 and its wiring.',
    remediationSteps: [
      'Verify minimum speed parameter P054 is set to >= 56.00%',
      'Inspect VFD motor wiring',
      'Check drive fault codes in HMI'
    ]
  },
  {
    id: 'FAULT-17',
    codeNumber: 17,
    title: 'Fault Code 17: Abnormal High Pump 1 Speed',
    shortName: 'Abnormal High Pump 1 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'critical',
    associatedSensors: ['P41 Speed %'],
    mathDescription: 'Pump 1 Speed > Upper limit for pump speed (100%)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 1 and its wiring.',
    remediationSteps: [
      'Verify PLC VFD drive 1 maximum speed scaling parameter',
      'Inspect VFD 1 analog reference',
      'Check firmware version'
    ]
  },
  {
    id: 'FAULT-18',
    codeNumber: 18,
    title: 'Fault Code 18: Abnormal Low Pump 1 Speed',
    shortName: 'Abnormal Low Pump 1 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'critical',
    associatedSensors: ['P41 Speed %'],
    mathDescription: 'Pump 1 Speed < Lower limit for pump speed (25% / 56% baseline)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 1 and its wiring.',
    remediationSteps: [
      'Verify minimum speed parameter P054 for pump 1',
      'Inspect VFD 1 motor power leads',
      'Check VFD drive error log'
    ]
  },
  {
    id: 'FAULT-19',
    codeNumber: 19,
    title: 'Fault Code 19: Abnormal High Pump 2 Speed',
    shortName: 'Abnormal High Pump 2 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'warning',
    associatedSensors: ['Pump 2 Speed %'],
    mathDescription: 'Pump 2 Speed > Upper limit for pump speed (100%)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 2 and its wiring.',
    remediationSteps: [
      'Inspect 3-pump configuration settings',
      'Check auxiliary pump VFD address',
      'Verify PLC firmware map'
    ]
  },
  {
    id: 'FAULT-20',
    codeNumber: 20,
    title: 'Fault Code 20: Abnormal Low Pump 2 Speed',
    shortName: 'Abnormal Low Pump 2 Speed',
    category: 'pump',
    domain: 'pump',
    severity: 'warning',
    associatedSensors: ['Pump 2 Speed %'],
    mathDescription: 'Pump 2 Speed < Lower limit for pump speed (25% baseline)',
    purpose: 'Pump speed for all the pumps should be within lower and upper limit.',
    troubleshooting: 'Check the SW/FW revision. Check pump 2 and its wiring.',
    remediationSteps: [
      'Inspect 3-pump configuration settings',
      'Check auxiliary pump VFD power',
      'Verify PLC firmware map'
    ]
  }
];

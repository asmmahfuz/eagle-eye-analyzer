import { CanonicalFaultDefinition } from '../faultTypes';

export const HYDRAULIC_FAULTS: CanonicalFaultDefinition[] = [
  {
    id: 'FAULT-01',
    codeNumber: 1,
    title: 'Fault Code 1: Abnormal High Primary Flow Check',
    shortName: 'Abnormal High Primary Flow',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'critical',
    associatedSensors: ['FT01', 'FT61'],
    mathDescription: 'Primary Flow > Upper limit for uncertainty × Secondary Flow',
    purpose: "Primary flow shouldn't be higher than upper limit for uncertainty*(secondary flow). Primary flow should be equal to secondary flow.",
    troubleshooting: 'Either the primary flow is too high. Or the secondary flow is too low. One of the two sensors is not working properly.',
    remediationSteps: [
      'Inspect FT01 primary ultrasonic/turbine flow meter wiring and signal coupling',
      'Verify FT61 secondary flow transmitter zero and span calibration',
      'Inspect primary loop bypass valve seating and differential pressure across heat exchanger',
      'Check for entrained air pockets or incomplete loop de-aeration'
    ]
  },
  {
    id: 'FAULT-02',
    codeNumber: 2,
    title: 'Fault Code 2: Abnormal Low Primary Flow Check',
    shortName: 'Abnormal Low Primary Flow',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'critical',
    associatedSensors: ['FT01', 'FT61'],
    mathDescription: 'Primary Flow < Lower limit for uncertainty × Secondary Flow',
    purpose: "Primary flow shouldn't be lower than lower limit for uncertainty*(secondary flow). Primary flow should be equal to secondary flow.",
    troubleshooting: 'Either the primary flow is too low. Or the secondary flow is too high. One of the two sensors is not working properly.',
    remediationSteps: [
      'Verify facility supply pump pressure and primary supply strainer cleanliness',
      'Inspect FCV61 modulating control valve positioner and stroke travel',
      'Confirm FT01 flow meter transducer alignment and electrical continuity',
      'Check primary isolation shutoff valves for partial closure'
    ]
  },
  {
    id: 'FAULT-03',
    codeNumber: 3,
    title: 'Fault Code 3: Abnormal High Secondary Flow Check',
    shortName: 'Abnormal High Secondary Flow',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'warning',
    associatedSensors: ['FT61', 'Secondary Flow Setpoint'],
    mathDescription: 'Secondary Flow > Upper limit for uncertainty × Nominal PQ Secondary Flow',
    purpose: 'The secondary flow at 100% of all the pumps should be close to the PQ curve of the golden unit.',
    troubleshooting: 'Either the pumps are providing excessive flow or the secondary flow sensor is not working properly. Check fault codes 1.',
    remediationSteps: [
      'Verify VFD pump maximum frequency limit parameter (P054/P055)',
      'Inspect FT61 pulse scaling factor and K-factor calibration in PLC register',
      'Check secondary server simulator loop flow resistance'
    ]
  },
  {
    id: 'FAULT-04',
    codeNumber: 4,
    title: 'Fault Code 4: Abnormal Low Secondary Flow Check',
    shortName: 'Abnormal Low Secondary Flow',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'critical',
    associatedSensors: ['FT61', 'Secondary Flow Setpoint'],
    mathDescription: 'Secondary Flow < Lower limit for uncertainty × Nominal PQ Secondary Flow',
    purpose: 'The secondary flow at 100% of all the pumps should be close to the PQ curve of the golden unit.',
    troubleshooting: 'Either the pumps are providing low flow or the secondary flow sensor is not working properly.',
    remediationSteps: [
      'Check Pump 31 and Pump 41 rotation direction and suction strainer DP',
      'Inspect secondary loop filter 53 for particulate clogging',
      'Verify VFD drive inverter output frequency and motor terminal voltages'
    ]
  },
  {
    id: 'FAULT-05',
    codeNumber: 5,
    title: 'Fault Code 5: Abnormal High Secondary Differential Pressure Check',
    shortName: 'Abnormal High Secondary DP',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'critical',
    associatedSensors: ['Secondary DP (Supply - Return)', 'PT61', 'PT62', 'Secondary DP Setpoint'],
    mathDescription: 'Secondary DP > Upper limit for uncertainty × [X-loop expected DP]',
    purpose: 'The secondary differential pressure should be close to the X-loop expected differential pressure.',
    troubleshooting: 'The secondary pressure sensors are likely not working properly.',
    remediationSteps: [
      'Inspect PT61 and PT62 pressure transducers for mechanical binding or line obstruction',
      'Confirm differential pressure transmitter zero-offset calibration',
      'Inspect external bypass valve setting and test manifold restriction'
    ]
  },
  {
    id: 'FAULT-06',
    codeNumber: 6,
    title: 'Fault Code 6: Abnormal Low Secondary Differential Pressure Check',
    shortName: 'Abnormal Low Secondary DP',
    category: 'hydraulic',
    domain: 'hydraulic',
    severity: 'critical',
    associatedSensors: ['Secondary DP (Supply - Return)', 'PT61', 'PT62', 'Secondary DP Setpoint'],
    mathDescription: 'Secondary DP < Lower limit for uncertainty × [X-loop expected DP]',
    purpose: 'The secondary differential pressure should be close to the X-loop expected differential pressure.',
    troubleshooting: 'The secondary pressure sensors are likely not working properly.',
    remediationSteps: [
      'Inspect secondary loop circulation pump impeller and check valves',
      'Check PT61 and PT62 sensor cabling and PLC analog input channel scaling',
      'Verify negative DP Modbus signed integer decoding'
    ]
  }
];

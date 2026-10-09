import { CduModelProfile } from './modelTypes';

/**
 * Authoritative Hardware & Telemetry Profile for CoolIT CHx1000 CDU
 * Medium-density liquid-to-liquid cooling distribution unit (1000 kW).
 * Source: CDU_Diagnostics_GUI_CHx1000.py & Template_diagnostic_results_CHx1000.xlsm
 */
export const CHX1000_PROFILE: CduModelProfile = {
  id: 'CHx1000',
  name: 'CoolIT™ CHx1000 Liquid-to-Liquid CDU',
  shortName: 'CHx1000',
  series: 'liquid-to-liquid',
  nominalCapacityKw: 1000,
  coolingMedium: 'Facility Chilled Water / Technology Cooling System (TCS)',
  formFactor: 'Mid-Density Row-Mount Liquid-to-Liquid Enclosure',
  description:
    'Compact 1000 kW liquid-to-liquid distribution unit optimized for standard row cooling. Incorporates dual circulating VFD pumps, proportional facility chilled water bypass control, and an 18-rule diagnostic verification suite.',
  badges: [
    'Liquid-to-Liquid',
    '1000 kW PHE',
    'Dual Circulating Pumps',
    'Compact Enclosure',
    '18 Diagnostic Rules',
    '42-Channel Modbus'
  ],
  pumping: {
    type: 'dual_or_triplex_vfd',
    pumpNames: ['Pump 0', 'Pump 1'],
    speedChannels: ['P31 Speed %', 'P41 Speed %', 'Pump 0 Speed', 'Pump 1 Speed'],
    filterDpChannels: ['Pump 31 Filter DP', 'Pump 41 Filter DP'],
    minVfdSpeedPercent: 50.0,
    maxVfdSpeedPercent: 99.0
  },
  heatRejection: {
    type: 'facility_plate_heat_exchanger',
    description:
      'Compact plate heat exchanger with primary facility water loop and proportional control valve for medium-density data hall rows.',
    controlActuator: 'FCV Primary Proportional Valve (0–10V / 0–100%)',
    actuatorChannels: ['FCV61 Actual Flow%', 'FCV61 Actual Open%'],
    hasPrimaryFacilityLoop: true,
    hasFanBank: false
  },
  hasExpansionReservoir: false,
  reservoirChannels: ['Reservoir Level'],
  primaryChannels: {
    supplyTemp: 'TT01',
    returnTemp: 'TT02',
    supplyPressure: 'PT01',
    returnPressure: 'PT02',
    flow: 'FT01'
  },
  secondaryChannels: {
    supplyTemp: 'TT61',
    returnTemp: 'TT62',
    supplyPressure: 'PT61',
    returnPressure: 'PT62',
    flow: 'FT61',
    dp: 'Secondary DP (Supply - Return)'
  },
  modbus: {
    readRegisterCount: 42,
    writeRegisterCount: 3,
    port: 502,
    defaultIpAddress: '169.254.244.6',
    writeRegisters: {
      tempSpAddress: 200,
      dpSpAddress: 201,
      flowSpAddress: 202
    }
  },
  diagnostics: {
    ruleCount: 18,
    suiteName: 'CHx1000 18-Check Diagnostic Suite',
    referenceDoc: 'Template_diagnostic_results_CHx1000.xlsm',
    keyChecks: [
      'Secondary Flow Rate Bound Limits (Checks 3-4)',
      'Secondary Differential Pressure Limits (Checks 5-6)',
      'Secondary Supply & Return Temp Parity (Checks 7-10)',
      'Pump 0 & Pump 1 Speed Limits (Checks 11-14)'
    ]
  },
  defaultSubsystemCategories: {
    'Primary DP (Supply - Return)': 'hydraulic',
    'Secondary DP (Supply - Return)': 'hydraulic',
    'Pump 31 Filter DP': 'hydraulic',
    'Pump 41 Filter DP': 'hydraulic',
    'FT01': 'hydraulic',
    'FT61': 'hydraulic',
    'FCV61 Actual Flow%': 'hydraulic',
    'P31 Speed %': 'pump',
    'P41 Speed %': 'pump',
    'Pump 0 Speed': 'pump',
    'Pump 1 Speed': 'pump',
    'TT01': 'temperature',
    'TT02': 'temperature',
    'TT61': 'temperature',
    'TT62': 'temperature',
    'PT01': 'pressure',
    'PT02': 'pressure',
    'PT61': 'pressure',
    'PT62': 'pressure',
    'Secondary Temperature Setpoint': 'setpoint',
    'Secondary DP Setpoint': 'setpoint',
    'Secondary Flow Setpoint': 'setpoint'
  }
};

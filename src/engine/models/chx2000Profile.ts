import { CduModelProfile } from './modelTypes';

/**
 * Authoritative Hardware & Telemetry Profile for CoolIT CHx2000 CDU
 * Flagship hyperscale liquid-to-liquid cooling distribution unit (2000 kW).
 * Source: CHx2000_Configuration.xlsx & Template_diagnostic_results_CHx2000.xlsx
 */
export const CHX2000_PROFILE: CduModelProfile = {
  id: 'CHx2000',
  name: 'CoolIT™ CHx2000 Liquid-to-Liquid CDU',
  shortName: 'CHx2000',
  series: 'liquid-to-liquid',
  nominalCapacityKw: 2000,
  coolingMedium: 'Facility Water System (FWS) / Technology Cooling System (TCS)',
  formFactor: '42U High-Density Floor-Standing Workstation Enclosure',
  description:
    'Flagship 2000 kW liquid-to-liquid cooling distribution unit engineered for hyperscale server clusters. Features dual redundant circulating pumps, motorized primary FCV61 control valve, plate heat exchanger, and 20 canonical diagnostic fault checks.',
  badges: [
    'Liquid-to-Liquid',
    '2000 kW PHE',
    'Dual P31/P41 Pumps',
    'FCV61 Modulating',
    '20 Canonical Faults',
    '50-Channel Modbus'
  ],
  pumping: {
    type: 'dual_redundant_vfd',
    pumpNames: ['P31', 'P41'],
    speedChannels: ['P31 Speed %', 'P41 Speed %'],
    filterDpChannels: ['Pump 31 Filter DP', 'Pump 41 Filter DP'],
    minVfdSpeedPercent: 56.0,
    maxVfdSpeedPercent: 99.0
  },
  heatRejection: {
    type: 'facility_plate_heat_exchanger',
    description:
      'Dual primary facility water loops with motorized Flow Control Valve (FCV61) modulating facility chilled water through high-efficiency plate heat exchanger.',
    controlActuator: 'FCV61 Motorized Modulating Valve (0–10V / 0–100%)',
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
    readRegisterCount: 49,
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
    ruleCount: 20,
    suiteName: 'Canonical 20-Fault Diagnostic Suite',
    referenceDoc: 'Template_diagnostic_results_CHx2000.xlsx',
    keyChecks: [
      'Primary & Secondary Flow Balance (Faults 1-4)',
      'Secondary DP vs X-Loop Setpoint Tracking (Faults 5-6)',
      '4-Way Thermal Parity Cross-Consistency (Faults 7-14)',
      'P31 & P41 VFD Speed Limits & 0-10V Normalization (Faults 15-20)'
    ]
  },
  defaultSubsystemCategories: {
    'Primary DP (Supply - Return)': 'hydraulic',
    'Secondary DP (Supply - Return)': 'hydraulic',
    'Pump 31 Filter DP': 'hydraulic',
    'Pump 41 Filter DP': 'hydraulic',
    'Primary Filter 53 DP': 'hydraulic',
    'FT01': 'hydraulic',
    'FT61': 'hydraulic',
    'FCV61 Actual Flow%': 'hydraulic',
    'FCV61 Actual Open%': 'hydraulic',
    'P31 Speed %': 'pump',
    'P41 Speed %': 'pump',
    'TT01': 'temperature',
    'TT02': 'temperature',
    'TT31': 'temperature',
    'TT41': 'temperature',
    'TT61': 'temperature',
    'TT62': 'temperature',
    'PT01': 'pressure',
    'PT02': 'pressure',
    'PT31': 'pressure',
    'PT41': 'pressure',
    'PT32': 'pressure',
    'PT42': 'pressure',
    'PT61': 'pressure',
    'PT62': 'pressure',
    'Air Humidity': 'environmental',
    'Air Temperature': 'environmental',
    'Secondary Temperature Setpoint': 'setpoint',
    'Secondary DP Setpoint': 'setpoint',
    'Secondary Flow Setpoint': 'setpoint'
  }
};

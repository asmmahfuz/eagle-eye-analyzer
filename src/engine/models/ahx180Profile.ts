import { CduModelProfile } from './modelTypes';

/**
 * Authoritative Hardware & Telemetry Profile for CoolIT AHx180 / CHx80 CDU
 * High-performance air-cooled liquid heat rejection distribution unit (180 kW).
 * Source: pyCduConnect.ahx & CDU_Diagnostics_GUI_CHx1000.py (lines 308–327)
 */
export const AHX180_PROFILE: CduModelProfile = {
  id: 'AHx180',
  name: 'CoolIT™ AHx180 / CHx80 Air-Cooled CDU',
  shortName: 'AHx180 / CHx80',
  series: 'air-to-liquid',
  nominalCapacityKw: 180,
  coolingMedium: 'Air-Cooled Heat Rejection / Technology Cooling System (TCS)',
  formFactor: 'Row-Based Air-Cooled Liquid Heat Exchanger Enclosure',
  description:
    'High-performance 180 kW air-cooled CDU engineered for facilities without chilled water infrastructure. Features a high-velocity EC fan bank, triplex staged VFD circulating pumps, integrated coolant expansion reservoir with ultrasonic level sensing, and 18 specialized air-cooling diagnostic rules.',
  badges: [
    'Air-to-Liquid',
    '180 kW Fan Array',
    'Triplex Pumps',
    'Expansion Reservoir',
    'Zero Facility Water',
    '18 Air-Cooled Rules'
  ],
  pumping: {
    type: 'triplex_staged_vfd',
    pumpNames: ['Pump 0', 'Pump 1', 'Pump 2'],
    speedChannels: ['Pump 0 Speed', 'Pump 1 Speed', 'Pump 2 Speed', 'P31 Speed %', 'P41 Speed %'],
    filterDpChannels: ['Pump 31 Filter DP', 'Pump 41 Filter DP'],
    minVfdSpeedPercent: 40.0,
    maxVfdSpeedPercent: 100.0
  },
  heatRejection: {
    type: 'air_cooled_fan_array',
    description:
      'High-velocity EC fan bank rejecting heat directly to ambient data center air. Eliminates primary facility water loops and motorized FCV bypass valves.',
    controlActuator: 'Multi-Fan EC Speed Array (PWM / Modbus Speed Modulation)',
    actuatorChannels: ['Average Fan RPM', 'Fan 1 RPM', 'Fan 2 RPM', 'Air Temperature', 'Air Humidity'],
    hasPrimaryFacilityLoop: false,
    hasFanBank: true
  },
  hasExpansionReservoir: true,
  reservoirChannels: [
    'Reservoir Level',
    'Reservoir Level %',
    'Reservoir Fill Pump (P12)',
    'System Fill Pump (P11)'
  ],
  secondaryChannels: {
    supplyTemp: 'TT61',
    returnTemp: 'TT62',
    supplyPressure: 'PT61',
    returnPressure: 'PT62',
    flow: 'FT61',
    dp: 'Secondary DP (Supply - Return)'
  },
  modbus: {
    readRegisterCount: 38,
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
    suiteName: 'AHx180 18-Rule Air-Cooled Diagnostic Suite',
    referenceDoc: 'CDU_Types/AHx180/Diagnostics/Excitation_Profile.py',
    keyChecks: [
      'Abnormal High/Low Average Fan RPM Check (Faults 1-2)',
      'Abnormal High/Low Secondary Flow & DP (Faults 3-6)',
      'Secondary Supply/Return Thermal Envelope (Faults 7-10)',
      'Triplex Pump 0, 1, 2 Operational Speed Limits (Faults 11-16)',
      'Abnormal Ambient Temperature & Reservoir Level (Faults 17-18)'
    ]
  },
  defaultSubsystemCategories: {
    'Average Fan RPM': 'environmental',
    'Fan 1 RPM': 'environmental',
    'Fan 2 RPM': 'environmental',
    'Air Temperature': 'environmental',
    'Air Humidity': 'environmental',
    'Reservoir Level': 'system',
    'Reservoir Level %': 'system',
    'Reservoir Fill Pump (P12)': 'pump',
    'System Fill Pump (P11)': 'pump',
    'Pump 0 Speed': 'pump',
    'Pump 1 Speed': 'pump',
    'Pump 2 Speed': 'pump',
    'Secondary DP (Supply - Return)': 'hydraulic',
    'FT61': 'hydraulic',
    'TT61': 'temperature',
    'TT62': 'temperature',
    'PT61': 'pressure',
    'PT62': 'pressure',
    'Secondary Temperature Setpoint': 'setpoint',
    'Secondary DP Setpoint': 'setpoint',
    'Secondary Flow Setpoint': 'setpoint'
  }
};

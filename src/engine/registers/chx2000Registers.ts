import { ModbusRegisterDef } from './registerTypes';

/**
 * Authoritative 49 Read Registers for CoolIT CHx2000 CDU
 * Source: CHx2000_Configuration.xlsx [Read Sheet]
 */
export const CHX2000_READ_REGISTERS: ModbusRegisterDef[] = [
  { address: 0, displayName: 'Status (0-off 1-on)', scaling: 1, rawUnit: '[]', engineeringUnit: '', category: 'system', isSigned: false, description: 'CDU Operating Run Status (0=Off, 1=On)' },
  { address: 1, displayName: 'Group (0-standalone 1-Group lead 2-Group follow)', scaling: 1, rawUnit: '[]', engineeringUnit: '', category: 'system', isSigned: false, description: 'Cluster Lead/Follow Mode (0=Standalone, 1=Lead, 2=Follow)' },
  { address: 2, displayName: 'TT01', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Secondary Coolant Supply Temperature Transmitter' },
  { address: 3, displayName: 'TT02', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Secondary Coolant Return Temperature Transmitter' },
  { address: 4, displayName: 'TT31', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Circulation Pump 31 Internal Fluid Temperature' },
  { address: 5, displayName: 'TT41', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Circulation Pump 41 Internal Fluid Temperature' },
  { address: 6, displayName: 'TT61', scaling: 10, rawUnit: 'PSI', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Primary Facility Water Supply Temperature Transmitter' },
  { address: 7, displayName: 'TT62', scaling: 10, rawUnit: 'PSI', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Primary Facility Water Return Temperature Transmitter' },
  { address: 8, displayName: 'TT51', scaling: 10, rawUnit: 'PSI', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Expansion Reservoir Temperature Transmitter TT51' },
  { address: 9, displayName: 'TT52', scaling: 10, rawUnit: 'PSI', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Expansion Reservoir Temperature Transmitter TT52' },
  { address: 10, displayName: 'TT45', scaling: 10, rawUnit: 'PSI', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Internal Enclosure Cabinet Temperature Probe' },
  { address: 11, displayName: 'PT01', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Secondary Coolant Supply Pressure Transducer' },
  { address: 12, displayName: 'PT02', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Secondary Coolant Return Pressure Transducer' },
  { address: 13, displayName: 'PT31', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Pump 31 Suction Suction Pressure Transducer' },
  { address: 14, displayName: 'PT41', scaling: 10, rawUnit: 'C', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Pump 41 Suction Pressure Transducer' },
  { address: 15, displayName: 'PT32', scaling: 10, rawUnit: 'C', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Pump 31 Discharge Pressure Transducer' },
  { address: 16, displayName: 'PT42', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Pump 41 Discharge Pressure Transducer' },
  { address: 17, displayName: 'PT21', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Secondary Internal Circulation Loop Pressure' },
  { address: 18, displayName: 'PT11', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Expansion Reservoir Tank Vacuum/Pressure Transducer' },
  { address: 19, displayName: 'PT51', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Circuit Inlet Filter Pressure PT51' },
  { address: 20, displayName: 'PT52', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Circuit Outlet Filter Pressure PT52' },
  { address: 21, displayName: 'PT53', scaling: 10, rawUnit: 'g/min', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Heat Exchanger Pressure Transducer PT53' },
  { address: 22, displayName: 'PT61', scaling: 10, rawUnit: '%', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Facility Water Supply Pressure PT61' },
  { address: 23, displayName: 'PT62', scaling: 10, rawUnit: '%', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Facility Water Return Pressure PT62' },
  { address: 24, displayName: 'TT01/TT02', scaling: 10, rawUnit: '%', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Secondary Differential Temperature (TT01 Supply - TT02 Return)' },
  { address: 25, displayName: 'TT31/TT41', scaling: 10, rawUnit: '%', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Pump Heat Balance Delta Temperature (TT31 - TT41)' },
  { address: 26, displayName: 'TT61/TT62', scaling: 10, rawUnit: '%', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Primary Differential Temperature (TT61 Supply - TT62 Return)' },
  { address: 27, displayName: 'TT51/TT52', scaling: 10, rawUnit: '%', engineeringUnit: '°C', category: 'temperature', isSigned: true, description: 'Reservoir Differential Gradient (TT51 - TT52)' },
  { address: 28, displayName: 'PT01/PT02', scaling: 10, rawUnit: '%', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Secondary Differential Pressure (PT01 - PT02)' },
  { address: 29, displayName: 'PT32/PT42', scaling: 10, rawUnit: 'C', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Pump Discharge Balance Delta Pressure (PT32 - PT42)' },
  { address: 30, displayName: 'PT61/PT62', scaling: 10, rawUnit: '[]', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Facility Differential Pressure Delta (PT61 - PT62)' },
  { address: 31, displayName: 'PT51/PT52', scaling: 10, rawUnit: 'C', engineeringUnit: 'psi', category: 'pressure', isSigned: true, description: 'Primary Filter Core Differential Pressure (PT51 - PT52)' },
  { address: 32, displayName: 'Pump 31 Filter DP', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'hydraulic', isSigned: true, description: 'Circulation Pump 31 Suction Strainer Differential Pressure' },
  { address: 33, displayName: 'Pump 41 Filter DP', scaling: 10, rawUnit: 'g/min', engineeringUnit: 'psi', category: 'hydraulic', isSigned: true, description: 'Circulation Pump 41 Suction Strainer Differential Pressure' },
  { address: 34, displayName: 'Primary Filter 53 DP', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'hydraulic', isSigned: true, description: 'Primary Circuit 50-Micron Filter Differential Pressure' },
  { address: 35, displayName: 'Secondary DP (Supply - Return)', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'hydraulic', isSigned: true, description: 'Secondary Loop Supply-to-Return Differential Pressure' },
  { address: 36, displayName: 'Primary DP (Supply - Return)', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'hydraulic', isSigned: true, description: 'Primary Facility Supply-to-Return Differential Pressure' },
  { address: 37, displayName: 'FT01', scaling: 10, rawUnit: 'FT', engineeringUnit: 'LPM', category: 'hydraulic', isSigned: false, description: 'Secondary Coolant Total Flow Rate Transmitter' },
  { address: 38, displayName: 'FT61', scaling: 10, rawUnit: 'FT', engineeringUnit: 'LPM', category: 'hydraulic', isSigned: false, description: 'Primary Facility Water Flow Rate Transmitter' },
  { address: 39, displayName: 'P31 Speed %', scaling: 10, rawUnit: '%', engineeringUnit: '%', category: 'pump', isSigned: false, description: 'Circulation Pump 31 Inverter Command Speed (0–100%)' },
  { address: 40, displayName: 'P41 Speed %', scaling: 10, rawUnit: '%', engineeringUnit: '%', category: 'pump', isSigned: false, description: 'Circulation Pump 41 Inverter Command Speed (0–100%)' },
  { address: 41, displayName: 'FCV61 Actual Flow%', scaling: 10, rawUnit: '%', engineeringUnit: '%', category: 'hydraulic', isSigned: false, description: 'Primary Flow Control Valve FCV61 Flow Feedback' },
  { address: 42, displayName: 'FCV61 Actual Open%', scaling: 10, rawUnit: '%', engineeringUnit: '%', category: 'hydraulic', isSigned: false, description: 'Primary Flow Control Valve FCV61 Actuator Position Feedback' },
  { address: 49, displayName: 'Air Humidity', scaling: 10, rawUnit: '%', engineeringUnit: '%', category: 'environmental', isSigned: false, description: 'Test Bay Ambient Air Relative Humidity' },
  { address: 50, displayName: 'Air Temperature', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'environmental', isSigned: true, description: 'Test Bay Ambient Room Temperature' },
  { address: 61, displayName: 'Program version', scaling: 100, rawUnit: '[]', engineeringUnit: '', category: 'system', isSigned: false, description: 'Embedded PLC Application Software & Firmware Revision' },
  { address: 200, displayName: 'Secondary Temperature Setpoint', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'setpoint', isSigned: false, description: 'Secondary Coolant Temperature Target Setpoint', notes: 'Range: 21.0°C to 27.0°C' },
  { address: 201, displayName: 'Secondary DP Setpoint', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'setpoint', isSigned: false, description: 'Secondary Differential Pressure Target Setpoint', notes: 'Range: 0.0 to 33.0 psi' },
  { address: 202, displayName: 'Secondary Flow Setpoint', scaling: 10, rawUnit: 'g/m', engineeringUnit: 'LPM', category: 'setpoint', isSigned: false, description: 'Secondary Coolant Flow Rate Target Setpoint', notes: 'Range: 0.0 to 560.0 LPM' }
];

/**
 * Authoritative 3 Write Registers for CoolIT CHx2000 CDU
 * Source: CHx2000_Configuration.xlsx [Write Sheet]
 */
export const CHX2000_WRITE_REGISTERS: ModbusRegisterDef[] = [
  { address: 200, displayName: 'Secondary Temperature Setpoint', scaling: 10, rawUnit: 'C', engineeringUnit: '°C', category: 'setpoint', isSigned: false, description: 'Secondary Coolant Target Temperature Setpoint', notes: 'Step values: 21.0, 22.0, 23.0, 24.0, 25.0, 27.0 °C' },
  { address: 201, displayName: 'Secondary DP Setpoint', scaling: 10, rawUnit: 'PSI', engineeringUnit: 'psi', category: 'setpoint', isSigned: false, description: 'Secondary Differential Pressure Target Setpoint', notes: 'Step values: 0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 33.0 psi' },
  { address: 202, displayName: 'Secondary Flow Setpoint', scaling: 10, rawUnit: 'g/m', engineeringUnit: 'LPM', category: 'setpoint', isSigned: false, description: 'Secondary Coolant Flow Rate Target Setpoint', notes: 'Step values: 0, 160, 320, 380, 430, 480, 490, 515, 560 LPM' }
];

const BY_ADDRESS = new Map<number, ModbusRegisterDef>();
const BY_NAME = new Map<string, ModbusRegisterDef>();

CHX2000_READ_REGISTERS.forEach(reg => {
  BY_ADDRESS.set(reg.address, reg);
  BY_NAME.set(reg.displayName.toLowerCase().trim(), reg);
});

CHX2000_WRITE_REGISTERS.forEach(reg => {
  if (!BY_ADDRESS.has(reg.address)) BY_ADDRESS.set(reg.address, reg);
});

export function getRegisterByAddress(address: number): ModbusRegisterDef | undefined {
  return BY_ADDRESS.get(address);
}

export function getRegisterByName(name: string): ModbusRegisterDef | undefined {
  if (!name) return undefined;
  const direct = BY_NAME.get(name.toLowerCase().trim());
  if (direct) return direct;
  // Normalized fallback lookup
  const clean = name.trim().toLowerCase();
  for (const [key, reg] of BY_NAME.entries()) {
    if (clean === key || clean.startsWith(key) || key.startsWith(clean)) return reg;
  }
  return undefined;
}

export function getRegisterAddressByName(name: string): number | undefined {
  return getRegisterByName(name)?.address;
}

import { SubsystemCategory } from '../../types';

export type ModbusAccessType = 'read' | 'write' | 'read_write';

/**
 * Authoritative PLC Modbus Holding Register Definition
 * Ingested from CoolIT Systems CHx2000_Configuration.xlsx specification
 */
export interface ModbusRegisterDef {
  /** Modbus holding register 0-based address (e.g. 0, 2, 200) */
  address: number;
  /** Exact display name as logged in PLC telemetry and test workbooks */
  displayName: string;
  /** Integer divisor/scaling factor (typically 10 for 0.1x scaling, or 1 for unscaled) */
  scaling: number;
  /** Raw unit label defined in the PLC configuration table */
  rawUnit: string;
  /** Physical engineering unit conforming to CoolIT CDU specification (Invariant 6) */
  engineeringUnit: string;
  /** Physical engineering domain classification */
  category: SubsystemCategory;
  /** True if signed 16-bit integer two's complement decoding applies */
  isSigned: boolean;
  /** Industrial function and signal description */
  description: string;
  /** Optional engineering notes (e.g. excitation setpoint range, sensor type) */
  notes?: string;
}

/**
 * Telemetry value decoded from raw Modbus 16-bit register
 */
export interface ModbusDecodeResult {
  raw: number;
  scaled: number;
  isSentinel: boolean;
  isRollover: boolean;
  unit: string;
  description?: string;
}

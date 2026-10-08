import { ModbusDecodeResult } from './registerTypes';

/**
 * 0xFFFF Sentinel Constants (Hardware Disconnect / Open Circuit)
 * Conforms to Invariant 8
 */
export const MODBUS_SENTINEL_RAW = 65535; // 0xFFFF
export const MODBUS_SENTINEL_SCALED = 6553.5;

/**
 * Evaluates whether a measured telemetry value is an electrical hardware sentinel
 * (0xFFFF = 65535 raw register, exported as 6553.5 after 0.1x scaling).
 */
export function isModbusSentinel(value: number | null | undefined): boolean {
  if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  return Math.abs(value - MODBUS_SENTINEL_SCALED) < 0.05 || value === MODBUS_SENTINEL_RAW;
}

/**
 * Canonical Python scaledsensorvalue implementation
 * Direct port of CDU_Diagnostics_GUI_CHx2000.py (lines 23-32):
 *
 * def scaledsensorvalue(sensor_reg, client):
 *     sensor_value = client.read_register(int(sensor_reg))
 *     if sensor_value is not None:
 *         if sensor_value > 32768:
 *             sensor_value = -1 * (65535 - sensor_value)
 *     else:
 *         sensor_value = 0
 *     return sensor_value
 */
export function scaledsensorvalue(_sensorReg: number, rawValue: number | null | undefined): number {
  if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
    return 0;
  }
  let sensorValue = Number(rawValue);
  if (sensorValue > 32768) {
    sensorValue = -1 * (65535 - sensorValue);
  }
  return sensorValue;
}

/**
 * Decodes 16-bit unsigned integer rollover in scaled telemetry
 * Conforms to Invariant 9:
 * Values in [6500.0, 6553.4] (or >6000 for negative DP) decode to two's complement:
 * V_corrected = (V * 10 - 65536) / 10
 */
export function decodeModbusTwosComplement(scaledVal: number): number {
  if (scaledVal > 6000 && scaledVal <= 6553.6) {
    return Number(((scaledVal * 10 - 65536) / 10).toFixed(2));
  }
  return scaledVal;
}

/**
 * Normalizes 0–10V analog register values (Invariant 7)
 * In raw Eagle Eye Excel logs, pump speed and valve percentage channels export
 * 0–10V commands (5.6 to 9.9). If max observed value <= 10.5, normalize by 10x (56% to 99%).
 */
export function normalizeAnalogRegister(value: number, isVfdOrValveChannel: boolean): number {
  if (isVfdOrValveChannel && value <= 10.5 && value > 0) {
    return Number((value * 10).toFixed(2));
  }
  return value;
}

/**
 * Decodes a raw or scaled Modbus register reading into engineering telemetry
 */
export function decodeModbusReading(
  address: number,
  reading: number,
  scaling: number = 10,
  isSigned: boolean = false
): ModbusDecodeResult {
  const isSentinel = isModbusSentinel(reading);
  let scaled = reading;
  let isRollover = false;

  if (isSentinel) {
    return {
      raw: MODBUS_SENTINEL_RAW,
      scaled: MODBUS_SENTINEL_SCALED,
      isSentinel: true,
      isRollover: false,
      unit: '',
      description: '0xFFFF Open-Circuit / Disconnected Transducer Fault'
    };
  }

  if (isSigned && reading > 6000 && reading <= 6553.6) {
    scaled = decodeModbusTwosComplement(reading);
    isRollover = true;
  } else if (scaling > 1 && reading > 1000) {
    // If raw 16-bit value was supplied
    const signedRaw = isSigned ? scaledsensorvalue(address, reading) : reading;
    scaled = Number((signedRaw / scaling).toFixed(2));
  }

  return {
    raw: reading,
    scaled,
    isSentinel: false,
    isRollover,
    unit: '',
    description: isRollover ? "Decoded 16-bit Two's Complement Negative Telemetry" : 'Normal Modbus Telemetry'
  };
}

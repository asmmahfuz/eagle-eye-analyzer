import { SubsystemCategory } from '../../types';

export type CduModelId = 'CHx2000' | 'CHx1000' | 'AHx180';

export type CduCoolingSeries = 'liquid-to-liquid' | 'air-to-liquid';

export type HeatRejectionType = 'facility_plate_heat_exchanger' | 'air_cooled_fan_array';

export type PumpingArchitectureType = 'dual_redundant_vfd' | 'dual_or_triplex_vfd' | 'triplex_staged_vfd';

export interface PumpingSpec {
  type: PumpingArchitectureType;
  pumpNames: string[];
  speedChannels: string[];
  filterDpChannels?: string[];
  minVfdSpeedPercent: number;
  maxVfdSpeedPercent: number;
}

export interface HeatRejectionSpec {
  type: HeatRejectionType;
  description: string;
  controlActuator: string;
  actuatorChannels: string[];
  hasPrimaryFacilityLoop: boolean;
  hasFanBank: boolean;
}

export interface ModbusProfileSpec {
  readRegisterCount: number;
  writeRegisterCount: number;
  port: number;
  defaultIpAddress: string;
  writeRegisters: {
    tempSpAddress: number;
    dpSpAddress: number;
    flowSpAddress: number;
  };
}

export interface DiagnosticsProfileSpec {
  ruleCount: number;
  suiteName: string;
  referenceDoc: string;
  keyChecks: string[];
}

export interface CduModelProfile {
  id: CduModelId;
  name: string;
  shortName: string;
  series: CduCoolingSeries;
  nominalCapacityKw: number;
  coolingMedium: string;
  formFactor: string;
  description: string;
  badges: string[];
  pumping: PumpingSpec;
  heatRejection: HeatRejectionSpec;
  hasExpansionReservoir: boolean;
  reservoirChannels?: string[];
  primaryChannels?: {
    supplyTemp: string;
    returnTemp: string;
    supplyPressure: string;
    returnPressure: string;
    flow?: string;
  };
  secondaryChannels: {
    supplyTemp: string;
    returnTemp: string;
    supplyPressure: string;
    returnPressure: string;
    flow: string;
    dp: string;
  };
  modbus: ModbusProfileSpec;
  diagnostics: DiagnosticsProfileSpec;
  defaultSubsystemCategories: Record<string, SubsystemCategory>;
}

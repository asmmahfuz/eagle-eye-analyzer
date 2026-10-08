import { SubsystemCategory } from '../../types';

export type FaultCodeId = 
  | 'FAULT-01' | 'FAULT-02' | 'FAULT-03' | 'FAULT-04'
  | 'FAULT-05' | 'FAULT-06' | 'FAULT-07' | 'FAULT-08'
  | 'FAULT-09' | 'FAULT-10' | 'FAULT-11' | 'FAULT-12'
  | 'FAULT-13' | 'FAULT-14' | 'FAULT-15' | 'FAULT-16'
  | 'FAULT-17' | 'FAULT-18' | 'FAULT-19' | 'FAULT-20';

export type FaultDomain = 'hydraulic' | 'temperature' | 'pump' | 'pressure';

export type FaultSeverity = 'critical' | 'warning' | 'info';

export type FaultStatus = 'pass' | 'fail' | 'warn' | 'not_applicable';

export interface FaultBreachDetail {
  timeSec: number;
  stageNum: number;
  parameter: string;
  measured: number;
  expectedLimit: number;
  deviation: number;
  unit: string;
  condition: string;
}

export interface CanonicalFaultDefinition {
  id: FaultCodeId;
  codeNumber: number;
  title: string;
  shortName: string;
  category: SubsystemCategory;
  domain: FaultDomain;
  severity: FaultSeverity;
  associatedSensors: string[];
  mathDescription: string;
  purpose: string;
  troubleshooting: string;
  remediationSteps: string[];
}

export interface EvaluatedFaultResult {
  definition: CanonicalFaultDefinition;
  status: FaultStatus;
  isTriggered: boolean;
  triggerCount: number;
  worstDeviation: number | null;
  worstDeviationStr: string | null;
  breaches: FaultBreachDetail[];
  summary: string;
}

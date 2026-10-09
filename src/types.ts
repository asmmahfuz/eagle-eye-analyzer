export interface TestMetadata {
  serialNumber: string;         // e.g. "CD04XB"
  workOrderNumber: string;      // e.g. "WO2601284"
  softwareVersion: string;      // e.g. "0.23"
  frameworkBuildVersion: string;// e.g. "1.41.329" (was previously confused as serial)
  testedBy: string;             // e.g. "Luis.Andrade"
  dateTested: string;           // e.g. "2026-09-25"
  finalResult: 'Pass' | 'Fail';
  customer?: string;            // e.g. "GOOGLE"
  seqNumber?: string;           // e.g. "G592"
  model?: string;               // e.g. "CHx2000" | "CHx1000" | "AHx180"
  filename: string;
  saleOrderNumber?: string;
  partNumber?: string;
  firmwareVersion?: string;
  activeAlarms?: string;
}

export type SubsystemCategory = 
  | 'hydraulic' 
  | 'pump' 
  | 'temperature' 
  | 'pressure' 
  | 'environmental' 
  | 'system' 
  | 'setpoint' 
  | 'other';

export type CadMainView = 
  | 'datasheet' 
  | 'telemetry' 
  | 'diagnostics';

export type ScopeTier = 
  | 'unit' 
  | 'group' 
  | 'test';

export const SUBSYSTEM_LABELS: Record<SubsystemCategory, string> = {
  hydraulic: 'Hydraulic & DP',
  pump: 'Pumps & VFD Drives',
  temperature: 'Temperature Transmitters',
  pressure: 'Pressure Transmitters',
  environmental: 'Environmental & Ambient',
  system: 'System & Configuration',
  setpoint: 'Excitation Setpoints',
  other: 'Other Telemetry'
};

export interface EvaluatedPoint {
  mIdx: number;                 // Row index in measurements
  limitIdx: number;             // Row index in limits
  timeSec: number;              // Time in seconds (15, 75, 135, ...)
  flowSp: number | null;        // Secondary Flow Setpoint (g/m)
  dpSp: number | null;          // Secondary DP Setpoint (PSI)
  tempSp: number | null;        // Secondary Temp Setpoint (C)
  parameter: string;            // Parameter/sensor name
  category: SubsystemCategory;
  unit: string;
  measured: number | string | null;
  lowLimit: number | null;      // mean - 3Sigma
  highLimit: number | null;     // mean + 3Sigma
  nominalMean: number | null;   // Process Mean (μ) = (highLimit + lowLimit) / 2
  processSigma: number | null;  // Process Sigma (σ) = (highLimit - lowLimit) / 6
  threeSigmaSpan: number | null;// 3σ Half-Span = 3 * σ
  zScore: number | null;        // Sigma Distance: (measured - μ) / σ
  absMin: number | null;        // min
  absMax: number | null;        // max
  deltaLower: number | null;    // measured - lowLimit
  deltaUpper: number | null;    // highLimit - measured
  marginBuffer: number | null;  // min(deltaLower, deltaUpper)
  bufferPercent: number;        // 0 to 100%
  status: 'pass' | 'fail' | 'warn';
  isPass: boolean;
  failureReason?: string;       // Detailed human-readable failure reason
  requiredRangeStr?: string;    // Formatted expected range, e.g. "[7.91 PSI ~ 11.81 PSI]"
}

export type FailurePoint = EvaluatedPoint;

export interface ParameterSummary {
  name: string;
  category: SubsystemCategory;
  unit: string;
  peak: number | null;          // Maximum value across test
  min: number | null;           // Minimum value across test
  settling: number | null;      // Final settled steady-state value at 525s
  worstMargin: number | null;   // Smallest margin buffer (negative if failed)
  nominalMean: number | null;   // Settling/steady-state process mean μ
  processSigma: number | null;  // Settling/steady-state process sigma σ
  low3Sigma: number | null;     // Settling/steady-state lower 3σ limit (μ - 3σ)
  high3Sigma: number | null;    // Settling/steady-state upper 3σ limit (μ + 3σ)
  threeSigmaSpan: number | null;// Settling/steady-state 3σ half-span
  maxZScore: number | null;     // Maximum observed |Z| across all stages (worst sigma excursion)
  totalChecks: number;
  failCount: number;
  warnCount: number;
  status: 'pass' | 'fail' | 'warn';
  requiredRangeSample: string;  // Representative required range
}

export interface OperatingStage {
  stageNum: number;
  timeSec: number;
  flowSp: number | null;
  dpSp: number | null;
  tempSp: number | null;
  sampleCount: number;
  failCount: number;
  isPass: boolean;
  failedSensors: string[];
}

export interface EagleEyeDataset {
  metadata: TestMetadata;
  headers: string[];
  units: string[];
  unitMap: Record<string, string>;
  measurements: Record<string, any>[];
  decisions: Record<string, any>[];
  limits: {
    'mean-3Sigma': Record<string, any>[];
    'mean+3Sigma': Record<string, any>[];
    'min': Record<string, any>[];
    'max': Record<string, any>[];
  };
  evaluatedChecks: EvaluatedPoint[];
  failures: EvaluatedPoint[];
  parameterStats: Record<string, ParameterSummary>;
  stages: OperatingStage[];
  totalEvaluated: number;
  passedCount: number;
  failedCount: number;
  passRate: string;
  categoryCounts: Record<SubsystemCategory, { pass: number; fail: number }>;
}

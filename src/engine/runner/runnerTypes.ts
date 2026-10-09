import { CduModelId } from '../models/modelTypes';
import { EagleEyeDataset, EvaluatedPoint } from '../../types';

/**
 * Execution Mode for Live Test-Bench Runner
 */
export type LiveExecutionMode = 
  | 'simulation_bay'    // High-fidelity physical simulation runner
  | 'live_modbus'        // Direct Modbus TCP connection to PLC
  | 'python_ipc';        // Local Python Excitation_Profile.py IPC child process

/**
 * Operational Status of the Live Test Runner
 */
export type LiveRunnerStatus = 
  | 'idle' 
  | 'connecting' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'aborted' 
  | 'error';

/**
 * Configuration for a live test execution run
 */
export interface LiveTestConfig {
  ipAddress: string;              // e.g. "169.254.244.6"
  port: number;                   // e.g. 502
  workOrderNumber: string;         // e.g. "WO2602286"
  saleOrderNumber: string;         // e.g. "SO26011"
  partNumber: string;              // e.g. "900-02233"
  softwareVersion: string;         // e.g. "0.23"
  firmwareVersion: string;         // e.g. "1.41.329"
  serialNumber: string;            // e.g. "CD050L"
  testedBy: string;                // e.g. "mdtahmid.jami"
  dateTested: string;              // e.g. "2026-10-01"
  modelId: CduModelId;             // "CHx2000" | "CHx1000" | "AHx180"
  executionMode: LiveExecutionMode;
  speedMultiplier: number;         // 1 (real-time 525s), 5 (105s), 10 (52s), 0 (instant)
}

/**
 * Telemetry snapshot for a single test stage
 */
export interface LiveStageTelemetry {
  stageNum: number;
  timeSec: number;
  flowSp: number;
  dpSp: number;
  tempSp: number;
  readings: Record<string, number>;
  rawRegisters: Record<number, number>;
  timestamp: number;
}

/**
 * Real-time test progress state broadcast to UI
 */
export interface LiveRunnerProgress {
  status: LiveRunnerStatus;
  currentStageIndex: number;       // 0 to 9
  totalStages: number;            // 10
  elapsedSec: number;             // Virtual elapsed test time (0 to 525)
  totalDurationSec: number;       // 525
  stageRemainingSec: number;      // Seconds left in current stage dwell
  percent: number;                // 0 to 100%
  activeSetpoints: {
    temp: number;
    dp: number;
    flow: number;
  };
  currentReadings: Record<string, number>;
  logStream: string[];
  errorMsg?: string;
  completedStagesCount: number;
}

/**
 * Observer listener interface for live runner events
 */
export interface LiveRunnerListener {
  onProgress?: (progress: LiveRunnerProgress) => void;
  onStageComplete?: (stage: LiveStageTelemetry, dataset: EagleEyeDataset) => void;
  onLog?: (message: string, level?: 'info' | 'warn' | 'error' | 'modbus') => void;
  onComplete?: (finalDataset: EagleEyeDataset) => void;
  onError?: (error: Error) => void;
}

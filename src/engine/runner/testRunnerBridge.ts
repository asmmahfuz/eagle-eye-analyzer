import { EagleEyeDataset } from '../../types';
import { PROGRAMMED_EXCITATION_STAGES } from '../excitation/excitationSchedule';
import { 
  LiveTestConfig, 
  LiveRunnerStatus, 
  LiveStageTelemetry, 
  LiveRunnerProgress, 
  LiveRunnerListener 
} from './runnerTypes';
import { simulateCduStageOutput } from './simulationBayEngine';
import { assembleLiveDataset, createDefaultLiveConfig } from './liveDatasetAssembler';

/**
 * Modular Test Runner Bridge for Test-Bay Execution (Phase 15 - Task 15.1)
 * Bridges Excitation_Profile.py timetable into the application host,
 * driving live 10-stage execution with streaming telemetry.
 * Target size: 180-250 lines (Invariant 11 compliant)
 */

export class TestRunnerBridge {
  private status: LiveRunnerStatus = 'idle';
  private config: LiveTestConfig = createDefaultLiveConfig();
  private stages: LiveStageTelemetry[] = [];
  private currentStageIndex: number = 0;
  private elapsedSec: number = 0;
  private timerId: any = null;
  private listeners: Set<LiveRunnerListener> = new Set();
  private logStream: string[] = [];
  private lastDataset: EagleEyeDataset | null = null;

  constructor() {}

  public subscribe(listener: LiveRunnerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): LiveRunnerStatus {
    return this.status;
  }

  public getConfig(): LiveTestConfig {
    return { ...this.config };
  }

  public getLatestDataset(): EagleEyeDataset | null {
    return this.lastDataset;
  }

  public getProgress(): LiveRunnerProgress {
    const stage = PROGRAMMED_EXCITATION_STAGES[Math.min(this.currentStageIndex, 9)];
    const stageRemaining = Math.max(0, stage.timeSec - this.elapsedSec);
    const latestStage = this.stages[this.stages.length - 1];

    return {
      status: this.status,
      currentStageIndex: this.currentStageIndex,
      totalStages: 10,
      elapsedSec: Number(this.elapsedSec.toFixed(1)),
      totalDurationSec: 525,
      stageRemainingSec: Math.round(stageRemaining),
      percent: Math.min(100, Math.round((this.elapsedSec / 525) * 100)),
      activeSetpoints: {
        temp: stage.tempSp,
        dp: stage.dpSp,
        flow: stage.flowSp
      },
      currentReadings: latestStage ? latestStage.readings : {},
      logStream: [...this.logStream],
      completedStagesCount: this.stages.length
    };
  }

  public startTest(config?: Partial<LiveTestConfig>): void {
    if (this.status === 'running') return;
    this.config = { ...createDefaultLiveConfig(), ...config };
    this.status = 'connecting';
    this.stages = [];
    this.currentStageIndex = 0;
    this.elapsedSec = 0;
    this.logStream = [
      `[RUNNER INIT] Initializing Live Test Bay Runner for Model ${this.config.modelId}...`,
      `[CONNECT] Connecting to PLC at ${this.config.ipAddress}:${this.config.port}...`,
      `[STATUS] Connected to Modbus TCP Server. Loading Excitation Profile timetable...`
    ];
    this.notifyLog('Connected to PLC. Starting Stage 1...', 'info');

    // If speedMultiplier === 0, execute instantly
    if (this.config.speedMultiplier === 0) {
      this.executeInstant();
      return;
    }

    this.status = 'running';
    this.notifyProgress();
    this.startTimerLoop();
  }

  public pauseTest(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.stopTimerLoop();
    this.notifyLog('[STATUS] Live test paused by operator.', 'warn');
    this.notifyProgress();
  }

  public resumeTest(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.notifyLog('[STATUS] Resuming excitation profile execution.', 'info');
    this.startTimerLoop();
  }

  public abortTest(): void {
    this.status = 'aborted';
    this.stopTimerLoop();
    this.notifyLog('[ABORT] Live excitation profile aborted by operator.', 'error');
    this.notifyProgress();
  }

  public instantComplete(): EagleEyeDataset {
    this.stopTimerLoop();
    return this.executeInstant();
  }

  private startTimerLoop(): void {
    this.stopTimerLoop();
    const tickMs = 100; // 10 ticks per second
    const speed = Math.max(1, this.config.speedMultiplier || 1);

    this.timerId = setInterval(() => {
      if (this.status !== 'running') return;

      const secIncrement = (tickMs / 1000) * speed;
      this.elapsedSec += secIncrement;

      const targetStage = PROGRAMMED_EXCITATION_STAGES[this.currentStageIndex];
      if (this.elapsedSec >= targetStage.timeSec) {
        // Complete current stage
        this.processStageCompletion(this.currentStageIndex);
        this.currentStageIndex++;

        if (this.currentStageIndex >= PROGRAMMED_EXCITATION_STAGES.length) {
          // All 10 stages completed!
          this.status = 'completed';
          this.stopTimerLoop();
          const finalDataset = assembleLiveDataset(this.config, this.stages, true);
          this.notifyLog('[COMPLETED] 10-Stage Excitation Profile finished. Cooldown complete.', 'info');
          this.listeners.forEach(l => l.onComplete?.(finalDataset));
          this.notifyProgress();
          return;
        }
      }

      this.notifyProgress();
    }, tickMs);
  }

  private stopTimerLoop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private processStageCompletion(idx: number): void {
    const stage = PROGRAMMED_EXCITATION_STAGES[idx];
    const sim = simulateCduStageOutput(this.config.modelId, idx, this.elapsedSec);

    const snapshot: LiveStageTelemetry = {
      stageNum: stage.stageNum,
      timeSec: stage.timeSec,
      flowSp: stage.flowSp,
      dpSp: stage.dpSp,
      tempSp: stage.tempSp,
      readings: sim.readings,
      rawRegisters: sim.rawRegisters,
      timestamp: Date.now()
    };

    this.stages.push(snapshot);
    sim.logLines.forEach(l => this.notifyLog(l, 'modbus'));

    const partialDataset = assembleLiveDataset(this.config, this.stages, false);
    this.lastDataset = partialDataset;
    this.listeners.forEach(l => l.onStageComplete?.(snapshot, partialDataset));
  }

  private executeInstant(): EagleEyeDataset {
    this.status = 'running';
    while (this.stages.length < 10) {
      const idx = this.stages.length;
      this.processStageCompletion(idx);
    }
    this.elapsedSec = 525;
    this.status = 'completed';
    const finalDataset = assembleLiveDataset(this.config, this.stages, true);
    this.lastDataset = finalDataset;
    this.notifyLog('[INSTANT EVAL] Completed all 10 stages instantaneously.', 'info');
    this.listeners.forEach(l => l.onComplete?.(finalDataset));
    this.notifyProgress();
    return finalDataset;
  }

  private notifyProgress(): void {
    const prog = this.getProgress();
    this.listeners.forEach(l => l.onProgress?.(prog));
  }

  private notifyLog(msg: string, level: 'info' | 'warn' | 'error' | 'modbus' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${msg}`;
    this.logStream.push(entry);
    if (this.logStream.length > 50) this.logStream.shift();
    this.listeners.forEach(l => l.onLog?.(entry, level));
  }
}

export const testRunnerBridge = new TestRunnerBridge();

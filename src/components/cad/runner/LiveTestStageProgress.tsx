import React from 'react';
import { LiveRunnerProgress } from '../../../engine/runner/runnerTypes';
import { PROGRAMMED_EXCITATION_STAGES } from '../../../engine/excitation/excitationSchedule';
import { CheckCircle2, Clock, Activity, Cpu } from '../../Icons';

interface LiveTestStageProgressProps {
  progress: LiveRunnerProgress;
}

export const LiveTestStageProgress: React.FC<LiveTestStageProgressProps> = ({ progress }) => {
  const currentStage = PROGRAMMED_EXCITATION_STAGES[Math.min(progress.currentStageIndex, 9)];
  const isRunning = progress.status === 'running';

  return (
    <div className="cad-live-stage-progress">
      {/* 10-Stage Horizontal Stepper */}
      <div className="cad-live-stepper-strip">
        {PROGRAMMED_EXCITATION_STAGES.map((st, idx) => {
          const isDone = idx < progress.completedStagesCount;
          const isActive = idx === progress.currentStageIndex && (progress.status === 'running' || progress.status === 'paused');
          
          let pillClass = 'cad-step-pill';
          if (isDone) pillClass += ' step-done';
          else if (isActive) pillClass += ' step-active';
          else pillClass += ' step-pending';

          return (
            <div key={st.stageNum} className={pillClass} title={`Stage ${st.stageNum}: ${st.flowSp} LPM, ${st.dpSp} psi, ${st.tempSp}°C`}>
              <div className="cad-step-num">
                {isDone ? <CheckCircle2 size={11} className="text-emerald" /> : `S${st.stageNum}`}
              </div>
              <div className="cad-step-time">{st.timeSec}s</div>
            </div>
          );
        })}
      </div>

      {/* Main Progress Bar */}
      <div className="cad-progress-bar-wrap">
        <div className="cad-progress-bar-header">
          <span className="cad-prog-title font-bold">
            Excitation Timetable Progress: {progress.percent}% ({progress.elapsedSec}s / 525s)
          </span>
          <span className="cad-prog-status">
            {progress.status === 'running' && <span className="cad-pulse-led">⚡ RUNNING</span>}
            {progress.status === 'paused' && <span className="text-amber font-bold">⏸ PAUSED</span>}
            {progress.status === 'completed' && <span className="text-emerald font-bold">✓ COMPLETED</span>}
            {progress.status === 'connecting' && <span className="text-cyan font-bold">CONNECTING...</span>}
          </span>
        </div>
        <div className="cad-progress-track">
          <div 
            className={`cad-progress-fill ${progress.status === 'completed' ? 'fill-emerald' : ''}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Active Stage & Setpoint Banner */}
      <div className="cad-stage-active-banner">
        <div className="cad-stage-banner-left">
          <div className="cad-stage-badge">
            <span className="cad-stage-badge-num">STAGE {currentStage.stageNum}</span>
            <span className="cad-stage-badge-time">Target: {currentStage.timeSec}s</span>
          </div>
          <div className="cad-stage-details">
            <div className="cad-stage-regime font-bold">{currentStage.regime}</div>
            <div className="cad-stage-desc text-dim">{currentStage.description}</div>
          </div>
        </div>

        <div className="cad-stage-banner-right">
          <div className="cad-stage-timer-chip">
            <Clock size={13} className="text-cyan" />
            <span className="cad-stage-timer-label">Dwell Remaining:</span>
            <span className="cad-stage-timer-val font-mono">{progress.stageRemainingSec}s</span>
          </div>
        </div>
      </div>

      {/* Modbus Write Registers Setpoint Strip */}
      <div className="cad-live-setpoint-strip">
        <div className="cad-setpoint-card">
          <div className="cad-sp-hdr">
            <Cpu size={12} className="text-purple" />
            <span>[Reg 200] Supply Temp SP</span>
          </div>
          <div className="cad-sp-val text-cyan font-mono">
            {progress.activeSetpoints.temp.toFixed(1)} <span className="cad-sp-unit">°C</span>
          </div>
        </div>

        <div className="cad-setpoint-card">
          <div className="cad-sp-hdr">
            <Cpu size={12} className="text-purple" />
            <span>[Reg 201] Secondary DP SP</span>
          </div>
          <div className="cad-sp-val text-amber font-mono">
            {progress.activeSetpoints.dp.toFixed(1)} <span className="cad-sp-unit">psi</span>
          </div>
        </div>

        <div className="cad-setpoint-card">
          <div className="cad-sp-hdr">
            <Cpu size={12} className="text-purple" />
            <span>[Reg 202] Secondary Flow SP</span>
          </div>
          <div className="cad-sp-val text-emerald font-mono">
            {progress.activeSetpoints.flow.toFixed(0)} <span className="cad-sp-unit">LPM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

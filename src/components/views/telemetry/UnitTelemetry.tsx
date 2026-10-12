import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, OperatingStage, SubsystemCategory } from '../../../types';
import { CduFlowSchematic } from '../dynamics/CduFlowSchematic';
import { StimulusResponseChart } from '../dynamics/StimulusResponseChart';
import { extractStageMetrics } from '../dynamics/dynamicsTypes';
import {
  Activity,
  Cpu,
  Sliders
} from '../../Icons';

export interface UnitTelemetryProps {
  dataset: EagleEyeDataset;
  selectedSensor?: string | null;
  onSelectSensor?: (sensorName: string | null) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

type DynamicsSubView = 'schematic' | 'scope';

export const UnitTelemetry: React.FC<UnitTelemetryProps> = ({
  dataset,
  selectedSensor,
  onSelectSensor
}) => {
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [subView, setSubView] = useState<DynamicsSubView>('scope');

  const stages: OperatingStage[] = dataset?.stages || [];

  // Extract comprehensive stage physics metrics
  const metrics = useMemo(() => {
    if (!dataset) return null;
    return extractStageMetrics(dataset, activeStageIdx);
  }, [dataset, activeStageIdx]);

  if (!dataset || !metrics) {
    return (
      <div className="cad-dynamics-standby">
        <Sliders size={36} className="text-cyan mb-3" />
        <h3>Whole-Unit Telemetry & Closed-Loop Dynamics</h3>
        <p className="text-muted">Load an Eagle Eye workbook (.xlsx) to inspect closed-loop CDU physics and telemetry response.</p>
      </div>
    );
  }

  return (
    <div className="cad-dynamics-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* ROW 1: Stage Physics Operational Regimes & Verdict Banner (No redundant metadata - shown in right inspector) */}
      <div className="cad-dynamics-banner">
        <div className="cad-banner-left">
          <span className="cad-banner-stage-chip">
            <span className="stage-chip-dot"></span>
            STAGE {metrics.stageNum} DWELL ({metrics.timeSec}s)
          </span>
          <span className="cad-banner-regime-chip regime-fixed" title="Secondary Valves: Strictly Fixed (100% Open)">
            🔒 SECONDARY VALVES: STRICTLY FIXED (100% OPEN)
          </span>
          <span className="cad-banner-regime-chip regime-pid" title="Pumps P31 & P41: Dynamic PID Ramp">
            ⚡ PUMPS P31 & P41: DYNAMIC PID RAMP
          </span>
        </div>
        <div className="cad-banner-right font-mono">
          <span className="cad-spec-chip">
            <span className="spec-label">Commanded DP:</span>
            <span className="spec-value">{metrics.dpSp != null ? `${metrics.dpSp} psi` : 'Dwell'}</span>
          </span>
          <span className="cad-spec-divider">|</span>
          <span className="cad-spec-chip">
            <span className="spec-label">Flow Ref:</span>
            <span className="spec-value">{metrics.flowSp != null ? `${metrics.flowSp} LPM` : 'Fixed'}</span>
          </span>
          <span className="cad-spec-divider">|</span>
          <span className="cad-spec-chip">
            <span className="spec-label">Stage Verdict:</span>
            <span className={`spec-value font-bold ${metrics.isPass ? 'text-emerald' : 'text-rose'}`}>
              {metrics.isPass ? 'PASS' : `FAIL (${metrics.failCount} Deficits)`}
            </span>
          </span>
        </div>
      </div>

      {/* ROW 2: 10-Stage Dwell Quick Selector Strip */}
      <div className="cad-dynamics-stage-strip" role="tablist" aria-label="10-Stage Quick Selector">
        <span className="cad-strip-label font-mono font-bold">10-STAGE DWELL STRIP:</span>
        <div className="cad-strip-buttons">
          {stages.map((stg, idx) => {
            const isSelected = idx === activeStageIdx;
            return (
              <button
                key={stg.stageNum}
                type="button"
                className={`cad-stage-btn ${isSelected ? 'active' : ''} ${stg.isPass ? 'pass' : 'fail'}`}
                onClick={() => setActiveStageIdx(idx)}
                title={`Stage ${stg.stageNum} (${stg.timeSec}s) — DP SP: ${stg.dpSp ?? 'N/A'} psi, Flow SP: ${stg.flowSp ?? 'N/A'} LPM`}
              >
                <span className="stage-num font-mono">S{stg.stageNum}</span>
                <span className="stage-time font-mono">{stg.timeSec}s</span>
                <span className={`stage-dot ${stg.isPass ? 'pass' : 'fail'}`}></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ROW 3: Cockpit Navigation View Mode Switcher */}
      <div className="cad-dynamics-mode-strip">
        <div className="cad-dynamics-mode-switcher">
          <button
            type="button"
            className={`cad-mode-btn ${subView === 'scope' ? 'active' : ''}`}
            onClick={() => setSubView('scope')}
            title="Multi-Axis Closed-Loop Oscilloscope"
          >
            <Activity size={11} />
            <span>Dynamics Scope</span>
          </button>
          <button
            type="button"
            className={`cad-mode-btn ${subView === 'schematic' ? 'active' : ''}`}
            onClick={() => setSubView('schematic')}
            title="CDU Flow Mimic Schematic"
          >
            <Cpu size={11} />
            <span>Flow Schematic</span>
          </button>
        </div>
      </div>

      {/* Active Sub-View: Interactive CDU Flow Schematic */}
      {subView === 'schematic' && (
        <CduFlowSchematic
          metrics={metrics}
          dataset={dataset}
          selectedSensor={selectedSensor}
          onSelectSensor={onSelectSensor}
        />
      )}

      {/* Active Sub-View: Stimulus vs. Response Multi-Axis Dynamics Scope */}
      {subView === 'scope' && (
        <StimulusResponseChart
          dataset={dataset}
          activeStageIdx={activeStageIdx}
          onSelectStage={setActiveStageIdx}
        />
      )}
    </div>
  );
};

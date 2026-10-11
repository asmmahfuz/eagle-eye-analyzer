import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, OperatingStage } from '../../../types';
import { CduFlowSchematic } from './CduFlowSchematic';
import { StimulusResponseChart } from './StimulusResponseChart';
import { StageCouplingMatrix } from './StageCouplingMatrix';
import { extractStageMetrics } from './dynamicsTypes';
import {
  Sliders,
  Activity,
  Cpu,
  Layers,
  BarChart2,
  AlertTriangle
} from '../../Icons';

export interface SystemDynamicsProps {
  dataset: EagleEyeDataset | null;
  selectedSensor?: string | null;
  onSelectSensor?: (sensor: string | null) => void;
}

type DynamicsSubView = 'all' | 'schematic' | 'scope' | 'matrix';

export const SystemDynamics: React.FC<SystemDynamicsProps> = ({
  dataset,
  selectedSensor,
  onSelectSensor
}) => {
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [subView, setSubView] = useState<DynamicsSubView>('all');

  const stages: OperatingStage[] = dataset?.stages || [];
  const currentStage = stages[activeStageIdx] || stages[0];

  // Extract comprehensive stage physics metrics
  const metrics = useMemo(() => {
    if (!dataset) return null;
    return extractStageMetrics(dataset, activeStageIdx);
  }, [dataset, activeStageIdx]);

  if (!dataset || !metrics) {
    return (
      <div className="cad-dynamics-standby">
        <Sliders size={36} className="text-cyan mb-3" />
        <h3>Closed-Loop System Dynamics</h3>
        <p className="text-muted">Load an Eagle Eye workbook (.xlsx) to inspect 10-stage physics coupling and control responses.</p>
      </div>
    );
  }

  return (
    <div className="cad-dynamics-container">
      {/* ROW 1: Stage Physics Operational Regimes & Verdict Banner */}
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
            className={`cad-mode-btn ${subView === 'all' ? 'active' : ''}`}
            onClick={() => setSubView('all')}
            title="All Cockpit Modules"
          >
            <Layers size={11} />
            <span>All Cockpit</span>
          </button>
          <button
            type="button"
            className={`cad-mode-btn ${subView === 'schematic' ? 'active' : ''}`}
            onClick={() => setSubView('schematic')}
            title="CDU Flow Mimic Only"
          >
            <Cpu size={11} />
            <span>Flow Schematic</span>
          </button>
          <button
            type="button"
            className={`cad-mode-btn ${subView === 'scope' ? 'active' : ''}`}
            onClick={() => setSubView('scope')}
            title="Multi-Axis Oscilloscope Only"
          >
            <Activity size={11} />
            <span>Dynamics Scope</span>
          </button>
          <button
            type="button"
            className={`cad-mode-btn ${subView === 'matrix' ? 'active' : ''}`}
            onClick={() => setSubView('matrix')}
            title="Stage Coupling Table Only"
          >
            <BarChart2 size={11} />
            <span>Coupling Matrix</span>
          </button>
        </div>
      </div>

      {/* 3. Component 3: Interactive CDU Flow Schematic */}
      {(subView === 'all' || subView === 'schematic') && (
        <CduFlowSchematic
          metrics={metrics}
          dataset={dataset}
          selectedSensor={selectedSensor}
          onSelectSensor={onSelectSensor}
        />
      )}

      {/* 4. Component 4: Stimulus vs. Response Multi-Axis Dynamics Chart */}
      {(subView === 'all' || subView === 'scope') && (
        <StimulusResponseChart
          dataset={dataset}
          activeStageIdx={activeStageIdx}
          onSelectStage={setActiveStageIdx}
        />
      )}

      {/* 5. Component 5: Stage Coupling Interconnection Matrix */}
      {(subView === 'all' || subView === 'matrix') && (
        <StageCouplingMatrix
          dataset={dataset}
          activeStageIdx={activeStageIdx}
          onSelectStage={setActiveStageIdx}
          metrics={metrics}
          selectedSensor={selectedSensor}
          onSelectSensor={onSelectSensor}
        />
      )}

      {/* 6. Closed-Loop System Invariants & Shopfloor Principles (SOP-CDU-CHX2000) */}
      <div className="cad-dynamics-card cad-invariants-summary">
        <div className="cad-dynamics-card-header">
          <div className="card-title-group">
            <Cpu size={14} className="text-cyan" />
            <h4 className="font-bold">Closed-Loop System Coupling Invariants</h4>
          </div>
          <span className="card-sub font-mono">SOP-CDU-CHX2000 Shopfloor Standard</span>
        </div>

        <div className="cad-dynamics-coupling-rules">
          <div className="cad-coupling-rule-item">
            <div className="rule-badge up">Motor Speed ↑</div>
            <div className="rule-desc">
              <strong>Flow (FT01) ↑ & Discharge (PT32/42) ↑, but Suction (PT21) Drawdown ↓:</strong>
              <span> Higher motor RPM aggressively pulls fluid from suction manifold. Verify suction pressure maintains ≥ 15 psi to prevent impeller cavitation.</span>
            </div>
          </div>

          <div className="cad-coupling-rule-item">
            <div className="rule-badge up">High DP Dwell ↑</div>
            <div className="rule-desc">
              <strong>Impeller Shear & Heavy Torque dissipates heat into coolant loop:</strong>
              <span> At high DP stages (e.g. Stage 4 at 33 psi), heavy pump work heats secondary coolant (TT31/41 ↑). Fluid heating is normal physics, not thermal sensor drift.</span>
            </div>
          </div>

          <div className="cad-coupling-rule-item">
            <div className="rule-badge info">Priority 1 Root Cause</div>
            <div className="rule-desc">
              <strong>Trapped Air / Incomplete Air Bleed (SOP Step 7):</strong>
              <span> Low flow is primarily caused by air locks in primary filter housing or pump volutes. Ensure air venting prior to Eagle Eye was completely executed.</span>
            </div>
          </div>

          <div className="cad-coupling-rule-item">
            <div className="rule-badge info">Priority 2 Root Cause</div>
            <div className="rule-desc">
              <strong>IFM Moneo Flow Transmitter Scaling:</strong>
              <span> If sensor parameter or damping is set too high in Moneo, the sensor mathematically scales down measured LPM. Technicians adjust this parameter as a calibrated adjustment.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

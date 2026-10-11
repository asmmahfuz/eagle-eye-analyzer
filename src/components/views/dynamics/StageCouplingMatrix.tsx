import React from 'react';
import { EagleEyeDataset } from '../../../types';
import { StageDynamicsMetrics, formatDelta, extractStageMetrics } from './dynamicsTypes';
import {
  Sliders,
  Activity,
  Droplets,
  Gauge,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Cpu
} from '../../Icons';

export interface StageCouplingMatrixProps {
  dataset: EagleEyeDataset;
  activeStageIdx: number;
  onSelectStage: (idx: number) => void;
  metrics: StageDynamicsMetrics;
  selectedSensor?: string | null;
  onSelectSensor?: (sensor: string | null) => void;
}

export const StageCouplingMatrix: React.FC<StageCouplingMatrixProps> = ({
  dataset,
  activeStageIdx,
  onSelectStage,
  metrics,
  selectedSensor,
  onSelectSensor
}) => {
  const deltaDp = formatDelta(metrics.deltaDp, 'psi');
  const deltaPump = formatDelta(metrics.deltaPump, '%');
  const deltaFlow = formatDelta(metrics.deltaFlow, 'LPM');
  const deltaSuction = formatDelta(metrics.deltaSuction, 'psi');
  const deltaDischarge = formatDelta(metrics.deltaDischarge, 'psi');
  const deltaTemp = formatDelta(metrics.deltaTemp, '°C');

  // Pre-calculate 10-stage metrics for table
  const allStageMetrics = dataset.stages.map((_, idx) => extractStageMetrics(dataset, idx));

  return (
    <div className="cad-dynamics-matrix-section">
      {/* 1. Parameter Physical Movement Cards for Active Stage */}
      <div className="cad-dynamics-card">
        <div className="cad-dynamics-card-header">
          <div className="card-title-group">
            <Sliders size={14} className="text-cyan" />
            <h4 className="font-bold">Stage {metrics.stageNum} Closed-Loop Parameter Coupling & Response</h4>
          </div>
          <span className="card-sub font-mono">Dwell t = {metrics.timeSec}s | Valves Strictly FIXED</span>
        </div>

        <div className="cad-dynamics-matrix-grid">
          {/* Commanded DP */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <Gauge size={13} className="text-purple" />
              <span className="node-title font-bold">1. Commanded Target DP</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">Target Setpoint:</span>
                <span className="metric-val font-mono font-bold">{metrics.dpSp != null ? `${metrics.dpSp} psi` : 'Dwell Track'}</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Stage Delta (Δ):</span>
                <span className={`metric-val font-mono font-bold ${deltaDp.direction}`}>{deltaDp.text}</span>
              </div>
              <p className="coupling-physics-note">Valves fixed (100% open); commanded via differential pressure setpoints.</p>
            </div>
          </div>

          {/* Pump Motor Speeds */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <Activity size={13} className="text-blue" />
              <span className="node-title font-bold">2. Pumps P31 & P41 Speed</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">PID Speed (Driver):</span>
                <span className="metric-val font-mono font-bold">{metrics.p31Speed.toFixed(1)}% / {metrics.p41Speed.toFixed(1)}%</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Speed Delta (Δ):</span>
                <span className={`metric-val font-mono font-bold ${deltaPump.direction}`}>{deltaPump.text}</span>
              </div>
              <p className="coupling-physics-note">Internal PID loop commands motor RPM to overcome loop resistance.</p>
            </div>
          </div>

          {/* Discharge Pressure */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <Gauge size={13} className="text-amber" />
              <span className="node-title font-bold">3. Discharge Head (PT32/42)</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">Discharge Pressure:</span>
                <span className="metric-val font-mono font-bold">{metrics.dischargePressure.toFixed(2)} psi</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Head Delta (Δ):</span>
                <span className={`metric-val font-mono font-bold ${deltaDischarge.direction}`}>{deltaDischarge.text}</span>
              </div>
              <p className="coupling-physics-note">Hydraulic head developed by impellers pushing into server manifold.</p>
            </div>
          </div>

          {/* Secondary Flow FT01 */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <Droplets size={13} className="text-emerald" />
              <span className="node-title font-bold">4. Secondary Flow (FT01)</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">Delivered Flow:</span>
                <span className="metric-val font-mono font-bold text-emerald">{metrics.flow.toFixed(1)} LPM</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Flow Delta (Δ):</span>
                <span className={`metric-val font-mono font-bold ${deltaFlow.direction}`}>{deltaFlow.text}</span>
              </div>
              <p className="coupling-physics-note">Volumetric delivery response. Trapped air or scaling causes flow lag.</p>
            </div>
          </div>

          {/* Suction Drawdown & Cavitation Guard */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <AlertTriangle size={13} className={metrics.suctionCavitationSafe ? 'text-emerald' : 'text-danger'} />
              <span className="node-title font-bold">5. Suction Pressure (PT21)</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">Suction Drawdown:</span>
                <span className="metric-val font-mono font-bold">{metrics.suctionPressure.toFixed(2)} psi</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Cavitation Guard (&gt;15 psi):</span>
                <span className={`metric-val font-bold ${metrics.suctionCavitationSafe ? 'text-emerald' : 'text-danger'}`}>
                  {metrics.suctionCavitationSafe ? '✓ SAFE BUFFER' : '⚠ CAVITATION RISK'}
                </span>
              </div>
              <p className="coupling-physics-note">Higher motor speed pulls suction lower. Must remain &gt;15.0 psi.</p>
            </div>
          </div>

          {/* Temperature Dissipation */}
          <div className="cad-coupling-node">
            <div className="coupling-node-header">
              <Thermometer size={13} className="text-rose" />
              <span className="node-title font-bold">6. Secondary Temp (TT31)</span>
            </div>
            <div className="coupling-node-body">
              <div className="node-metric-row">
                <span className="metric-label">Secondary Temp:</span>
                <span className="metric-val font-mono font-bold">{metrics.secondarySupplyT.toFixed(1)}°C</span>
              </div>
              <div className="node-metric-row">
                <span className="metric-label">Thermal Delta (Δ):</span>
                <span className={`metric-val font-mono font-bold ${deltaTemp.direction}`}>{deltaTemp.text}</span>
              </div>
              <p className="coupling-physics-note">Impeller shear & motor torque under high DP naturally heats coolant.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Full 10-Stage Closed-Loop Cross-Coupling Table */}
      <div className="cad-dynamics-card">
        <div className="cad-dynamics-card-header">
          <div className="card-title-group">
            <Cpu size={14} className="text-cyan" />
            <h4 className="font-bold">10-Stage Closed-Loop Parameter Coupling Progression Ledger</h4>
          </div>
          <span className="card-sub font-mono">Click any stage row to inspect physics mimic</span>
        </div>

        <div className="cad-dynamics-table-wrapper">
          <table className="cad-dynamics-table font-mono">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Dwell (s)</th>
                <th>Target DP</th>
                <th>Measured DP</th>
                <th>P31/P41 Speed</th>
                <th>Flow FT01</th>
                <th>Suction PT21</th>
                <th>Disch PT32</th>
                <th>Temp TT31</th>
                <th>Coupling Status</th>
              </tr>
            </thead>
            <tbody>
              {allStageMetrics.map((sm, idx) => {
                const isActive = idx === activeStageIdx;
                const isSafe = sm.suctionCavitationSafe;
                return (
                  <tr
                    key={sm.stageNum}
                    className={`stage-row ${isActive ? 'active-row' : ''} ${sm.isPass ? 'pass-row' : 'fail-row'}`}
                    onClick={() => onSelectStage(idx)}
                    title={`Click to inspect Stage ${sm.stageNum}`}
                  >
                    <td className="font-bold">
                      <span className="stage-chip font-bold">S{sm.stageNum}</span>
                    </td>
                    <td>{sm.timeSec}s</td>
                    <td>{sm.dpSp != null ? `${sm.dpSp} psi` : '--'}</td>
                    <td className="font-bold text-cyan">{sm.measuredDp.toFixed(2)} psi</td>
                    <td>{sm.p31Speed.toFixed(0)}% / {sm.p41Speed.toFixed(0)}%</td>
                    <td className="font-bold text-emerald">{sm.flow.toFixed(0)} LPM</td>
                    <td className={isSafe ? 'text-emerald' : 'text-danger font-bold'}>
                      {sm.suctionPressure.toFixed(2)} psi
                    </td>
                    <td>{sm.dischargePressure.toFixed(1)} psi</td>
                    <td>{sm.secondarySupplyT.toFixed(1)}°C</td>
                    <td>
                      <span className={`status-pill ${sm.isPass ? 'pass' : 'fail'}`}>
                        {sm.isPass ? (isSafe ? 'PASS (Closed-Loop)' : 'WARN (Suction)') : `FAIL (${sm.failCount})`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

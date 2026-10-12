import React from 'react';
import { EagleEyeDataset } from '../../../types';
import { StageDynamicsMetrics, extractStageMetrics } from './dynamicsTypes';
import { Cpu } from '../../Icons';

export interface StageCouplingMatrixProps {
  dataset: EagleEyeDataset;
  activeStageIdx: number;
  onSelectStage: (idx: number) => void;
  metrics?: StageDynamicsMetrics;
  selectedSensor?: string | null;
  onSelectSensor?: (sensor: string | null) => void;
}

export const StageCouplingMatrix: React.FC<StageCouplingMatrixProps> = ({
  dataset,
  activeStageIdx,
  onSelectStage
}) => {
  // Pre-calculate 10-stage metrics for table
  const allStageMetrics = dataset.stages.map((_, idx) => extractStageMetrics(dataset, idx));

  return (
    <div className="cad-dynamics-matrix-section">
      {/* 10-Stage Closed-Loop Cross-Coupling Progression Ledger */}
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

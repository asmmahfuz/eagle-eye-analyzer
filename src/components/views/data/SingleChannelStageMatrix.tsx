import React, { useMemo } from 'react';
import { EagleEyeDataset } from '../../../types';
import { CheckCircle2, AlertTriangle, BarChart2 } from '../../Icons';
import { getFriendlyChannelName } from '../../../engine/registers';
import { getProgrammedStage, calculateStageTransientMetrics } from '../../../engine/excitation';
import { TransientBadge } from '../common/TransientBadge';

export interface SingleChannelStageMatrixProps {
  selectedSensor: string;
  dataset: EagleEyeDataset;
  onOpenMetricsModal: (stageNum: number | null) => void;
  flowSpUnit?: string;
  dpSpUnit?: string;
  tempSpUnit?: string;
}

export const SingleChannelStageMatrix: React.FC<SingleChannelStageMatrixProps> = ({
  selectedSensor,
  dataset,
  onOpenMetricsModal,
  flowSpUnit = 'LPM',
  dpSpUnit = 'psi',
  tempSpUnit = '°C'
}) => {
  const {
    parameterStats,
    stages,
    unitMap,
    measurements,
    evaluatedChecks
  } = dataset;

  const stats = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const friendlyName = getFriendlyChannelName(selectedSensor);

  const sensorEvaluations = useMemo(() => {
    return evaluatedChecks.filter(c => c.parameter === selectedSensor);
  }, [evaluatedChecks, selectedSensor]);

  const stageEvaluations = useMemo(() => {
    return stages.map(stg => {
      const mRow = measurements.find(m => m['Time'] === stg.timeSec);
      const val = mRow ? mRow[selectedSensor] : null;
      const pt = sensorEvaluations.find(e => e.timeSec === stg.timeSec);
      const isFailed = stg.failedSensors.includes(selectedSensor) || (pt ? pt.status === 'fail' : false);
      const progStage = getProgrammedStage(stg.stageNum);
      const transientMetrics = (progStage && typeof val === 'number')
        ? calculateStageTransientMetrics(selectedSensor, progStage, val, unit)
        : null;

      let rangeText = '--';
      const lowLimit = pt?.lowLimit ?? stats?.low3Sigma;
      const highLimit = pt?.highLimit ?? stats?.high3Sigma;
      if (typeof lowLimit === 'number' && typeof highLimit === 'number') {
        rangeText = `[${lowLimit.toFixed(2)} ~ ${highLimit.toFixed(2)} ${unit}]`;
      } else if (typeof lowLimit === 'number') {
        rangeText = `[≥ ${lowLimit.toFixed(2)} ${unit}]`;
      } else if (typeof highLimit === 'number') {
        rangeText = `[≤ ${highLimit.toFixed(2)} ${unit}]`;
      } else if (stats?.requiredRangeSample) {
        rangeText = stats.requiredRangeSample;
      }

      const valStr = typeof val === 'number'
        ? `${val.toFixed(2)} ${unit}`
        : (val !== null && val !== undefined ? `${String(val)} ${unit}` : '--');

      return {
        stage: stg,
        measuredStr: valStr,
        rangeText,
        isFailed,
        transientMetrics
      };
    });
  }, [stages, measurements, sensorEvaluations, selectedSensor, unit, stats]);

  const failCount = stageEvaluations.filter(e => e.isFailed).length;

  return (
    <div className="stage-matrix-container">
      <div className="stage-matrix-toolbar">
        <div className="stage-matrix-title-wrap">
          <span className="stage-matrix-title">
            10-Stage Operating Progression & Verification Matrix — {friendlyName} (15s – 525s)
          </span>
          <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.28)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
            Invariant 13 Compliant
          </span>
          <div className="stage-matrix-counts">
            <span className="count-pill all">{stages.length} Stages</span>
            <span className={`count-pill ${failCount > 0 ? 'fail' : 'pass'}`}>
              {failCount} Failed
            </span>
            <span className="count-pill pass">
              {stages.length - failCount} Nominal
            </span>
          </div>
        </div>

        <div className="stage-matrix-actions">
          <button
            type="button"
            className="cad-details-btn"
            onClick={() => onOpenMetricsModal(null)}
            title="Open 11-column statistical process control ledger and distribution"
          >
            <BarChart2 size={12} />
            <span>⋯ Advanced SPC Details</span>
          </button>
        </div>
      </div>

      <div className="stage-matrix-scroll-wrap">
        <table className="stage-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Stage & Dwell</th>
              <th style={{ width: '10%' }}>Verdict</th>
              <th style={{ width: '15%' }}>Transient Stability</th>
              <th style={{ width: '9%' }}>Flow Sp</th>
              <th style={{ width: '8%' }}>DP Sp</th>
              <th style={{ width: '8%' }}>Temp Sp</th>
              <th style={{ width: '15%' }}>Measured Dwell</th>
              <th style={{ width: '14%' }}>Expected Range / Spec</th>
              <th style={{ width: '8%', textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {stageEvaluations.map(({ stage, measuredStr, isFailed, transientMetrics, rangeText }) => (
              <tr
                key={`sensor-stage-${stage.stageNum}`}
                className={`stage-matrix-row ${isFailed ? 'row-fail' : 'row-pass'}`}
              >
                <td className="stage-cell-stage">
                  <div className="stage-primary-id">
                    <span className="stage-name">Stage {stage.stageNum}</span>
                    {stage.stageNum === 10 && <span className="stage-steady-tag">Steady</span>}
                  </div>
                  <span className="stage-dwell-sub">{stage.timeSec}s dwell</span>
                </td>

                <td className="stage-cell-verdict">
                  <span className={`status-badge-mini ${isFailed ? 'fail' : 'pass'}`}>
                    {isFailed ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                    <span>{isFailed ? 'FAILED' : 'PASS'}</span>
                  </span>
                </td>

                <td className="stage-cell-transient">
                  {transientMetrics ? (
                    <TransientBadge metrics={transientMetrics} compact showDelta />
                  ) : (
                    <span className="text-muted font-mono" style={{ fontSize: '10px' }}>--</span>
                  )}
                </td>

                <td className="stage-cell-sp font-mono text-cyan-400">
                  {stage.flowSp !== null ? `${stage.flowSp} ${flowSpUnit}` : '--'}
                </td>

                <td className="stage-cell-sp font-mono text-emerald-400">
                  {stage.dpSp !== null ? `${stage.dpSp} ${dpSpUnit}` : '--'}
                </td>

                <td className="stage-cell-sp font-mono text-amber-300">
                  {stage.tempSp !== null ? `${stage.tempSp} ${tempSpUnit}` : '--'}
                </td>

                <td className="stage-cell-sp">
                  <strong className={`font-mono ${isFailed ? 'text-red' : 'text-cyan-400'}`} style={{ fontSize: '12px' }}>
                    {measuredStr}
                  </strong>
                </td>

                <td>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {rangeText}
                  </span>
                </td>

                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="cad-details-btn"
                    onClick={() => onOpenMetricsModal(stage.stageNum)}
                    title={`Open Advanced Metrology Modal for ${friendlyName} focusing on Stage ${stage.stageNum}`}
                  >
                    ⋯ Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integrated SPC Metrology Footer */}
      <div className="stage-matrix-spc-footer">
        <div className="stage-matrix-spc-summary">
          <span className="spc-summary-title">Statistical Process Control (SPC):</span>
          <span className="spc-stat-pill">
            <span className="spc-stat-label">Nominal Mean (μ):</span>
            <strong className="spc-stat-val font-mono text-cyan-400">
              {stats?.nominalMean?.toFixed(2) ?? '--'} {unit}
            </strong>
          </span>
          <span className="spc-stat-divider">•</span>
          <span className="spc-stat-pill">
            <span className="spc-stat-label">Std Dev (σ):</span>
            <strong className="spc-stat-val font-mono text-amber-300">
              {stats?.processSigma?.toFixed(3) ?? '--'} {unit}
            </strong>
          </span>
          <span className="spc-stat-divider">•</span>
          <span className="spc-stat-pill">
            <span className="spc-stat-label">Worst Margin:</span>
            <strong className={`spc-stat-val font-mono ${stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0 ? 'text-red' : 'text-emerald-400'}`}>
              {stats?.worstMargin !== null && stats?.worstMargin !== undefined ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}` : '--'}
            </strong>
          </span>
          {stats?.low3Sigma !== undefined && stats?.high3Sigma !== undefined && (
            <>
              <span className="spc-stat-divider">•</span>
              <span className="spc-stat-pill">
                <span className="spc-stat-label">3σ Tolerance Gate:</span>
                <span className="spc-stat-val font-mono text-dim">
                  [{stats.low3Sigma.toFixed(2)} ~ {stats.high3Sigma.toFixed(2)} {unit}]
                </span>
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          className="cad-details-btn spc-footer-btn"
          onClick={() => onOpenMetricsModal(null)}
          title="Open full 11-column statistical process control ledger, tolerance gates, and distribution in details menu"
        >
          <BarChart2 size={12} />
          <span>⋯ Advanced SPC Details</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { ParameterSummary } from '../../../types';

export interface MetrologyMetricCardsProps {
  stats: ParameterSummary | undefined;
  unit: string;
  nominalMean: number | null | undefined;
  processSigma: number | null | undefined;
  low3Sigma: number | null | undefined;
  high3Sigma: number | null | undefined;
  threeSigmaSpan: number | null | undefined;
}

export const MetrologyMetricCards: React.FC<MetrologyMetricCardsProps> = ({
  stats,
  unit,
  nominalMean,
  processSigma,
  low3Sigma,
  high3Sigma,
  threeSigmaSpan,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
        gap: '8px',
        marginBottom: '14px',
      }}
    >
      <div className="spec-metric-card">
        <span className="spec-label">Process Mean (μ)</span>
        <span className="spec-value text-cyan-500 font-mono font-bold">
          {nominalMean !== null && nominalMean !== undefined ? `${nominalMean.toFixed(2)} ${unit}` : '--'}
        </span>
        <span className="spec-sub">Distribution Center</span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">Std Deviation (σ)</span>
        <span className="spec-value text-amber-500 font-mono font-bold">
          {processSigma !== null && processSigma !== undefined ? `${processSigma.toFixed(3)} ${unit}` : '--'}
        </span>
        <span className="spec-sub">1-Sigma Variation</span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">3σ Tolerance Band</span>
        <span className="spec-value font-mono font-bold">
          {threeSigmaSpan !== null && threeSigmaSpan !== undefined ? `±${threeSigmaSpan.toFixed(2)} ${unit}` : '--'}
        </span>
        <span className="spec-sub">Total Span: {threeSigmaSpan ? (threeSigmaSpan * 2).toFixed(2) : '--'}</span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">Lower 3σ (μ - 3σ)</span>
        <span className="spec-value font-mono text-cyan-600 font-bold">
          {low3Sigma !== null && low3Sigma !== undefined ? `${low3Sigma.toFixed(2)} ${unit}` : '--'}
        </span>
        <span className="spec-sub">Lower Acceptance Gate</span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">Upper 3σ (μ + 3σ)</span>
        <span className="spec-value font-mono text-cyan-600 font-bold">
          {high3Sigma !== null && high3Sigma !== undefined ? `${high3Sigma.toFixed(2)} ${unit}` : '--'}
        </span>
        <span className="spec-sub">Upper Acceptance Gate</span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">Settling (525s)</span>
        <span className="spec-value text-emerald-500 font-mono font-bold">
          {stats?.settling !== null && stats?.settling !== undefined
            ? `${typeof stats.settling === 'number' ? stats.settling.toFixed(2) : stats.settling} ${unit}`
            : '--'}
        </span>
        <span className="spec-sub">Final Steady-State</span>
      </div>

      <div className="spec-metric-card highlight">
        <span className="spec-label">Worst Margin</span>
        <span
          className={`spec-value font-mono font-bold ${
            stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0
              ? 'text-rose-500'
              : 'text-emerald-500'
          }`}
        >
          {stats?.worstMargin !== null && stats?.worstMargin !== undefined
            ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}`
            : '--'}
        </span>
        <span className="spec-sub">
          {stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0
            ? 'Deficit below limit'
            : 'Safety clearance buffer'}
        </span>
      </div>

      <div className="spec-metric-card">
        <span className="spec-label">Max Difference</span>
        <span
          className={`spec-value font-mono font-bold ${
            stats?.maxZScore && stats.maxZScore > 3.0 ? 'text-rose-500' : 'text-slate-200'
          }`}
        >
          {stats?.maxZScore !== null && stats?.maxZScore !== undefined
            ? `|Z| = ${stats.maxZScore.toFixed(2)}σ`
            : '--'}
        </span>
        <span className="spec-sub">Max Sigma Distance</span>
      </div>
    </div>
  );
};

import React from 'react';
import { MetrologyStageRow } from './advancedMetricsTypes';
import { TransientBadge } from '../../views/common/TransientBadge';

export interface MetrologyLedgerTableProps {
  stageRows: MetrologyStageRow[];
  unit: string;
  highlightStageNum?: number | null;
}

export const MetrologyLedgerTable: React.FC<MetrologyLedgerTableProps> = ({
  stageRows,
  unit,
  highlightStageNum,
}) => {
  return (
    <div style={{ borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)' }}>
          10-Stage Operating Dwell Points & Tolerance Metrology Ledger
        </span>
        <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          10 Stages Evaluated (15s – 525s) • Dual Envelope [μ - 3σ, μ + 3σ]
        </span>
      </div>

      <div className="datasheet-table-wrapper metrology-ledger-scroll-wrapper">
        <table className="datasheet-table" style={{ fontSize: '11.5px', width: '100%', minWidth: '1150px' }}>
          <thead>
            <tr>
              <th style={{ width: '9%' }}>Stage (Time)</th>
              <th style={{ width: '22%' }}>Dwell Condition / Setpoints</th>
              <th style={{ width: '9%' }}>Measured Result</th>
              <th style={{ width: '7%' }}>Lower 3σ</th>
              <th style={{ width: '8%' }}>Process Mean (μ)</th>
              <th style={{ width: '7%' }}>Upper 3σ</th>
              <th style={{ width: '7%' }}>Std Dev (σ)</th>
              <th style={{ width: '8%' }}>Sigma Dev (Z)</th>
              <th style={{ width: '9%' }}>Margin Buffer</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Transient Tracking</th>
              <th style={{ width: '6%' }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {stageRows.map((r) => {
              const isRowFail = r.isFailed;
              const isRowWarn = r.status === 'warn';
              const measuredStr =
                typeof r.measured === 'number' ? r.measured.toFixed(2) : (r.measured ?? '--');
              const lowStr = typeof r.lowLimit === 'number' ? r.lowLimit.toFixed(2) : '--';
              const meanStr = typeof r.mean === 'number' ? r.mean.toFixed(2) : '--';
              const highStr = typeof r.highLimit === 'number' ? r.highLimit.toFixed(2) : '--';
              const sigmaStr = typeof r.sigma === 'number' ? r.sigma.toFixed(3) : '--';

              const isHighlighted = highlightStageNum === r.stageNum;

              return (
                <tr
                  key={r.stageNum}
                  className={`${isRowFail ? 'row-failed' : isRowWarn ? 'row-warn' : ''} ${isHighlighted ? 'row-focused-highlight' : ''}`}
                >
                  <td className="font-mono">
                    <span style={{ fontWeight: 700 }}>Stage {r.stageNum}</span>
                    <span className="stage-num-tag" style={{ marginLeft: '5px' }}>
                      {r.timeSec}s
                    </span>
                    {isHighlighted && (
                      <span className="stage-steady-tag" style={{ marginLeft: '6px', background: 'rgba(2, 132, 199, 0.18)', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                        Focused
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                    {r.progStage?.description ||
                      `DP: ${r.dpSp ?? '--'} psi • Flow: ${r.flowSp ?? '--'} LPM`}
                  </td>
                  <td
                    className="font-mono font-bold"
                    style={{ color: isRowFail ? 'var(--danger-text)' : 'var(--accent-cyan)' }}
                  >
                    {measuredStr} {unit}
                  </td>
                  <td className="font-mono text-dim">{lowStr}</td>
                  <td className="font-mono">{meanStr}</td>
                  <td className="font-mono text-dim">{highStr}</td>
                  <td className="font-mono text-dim" style={{ fontSize: '10px' }}>
                    {sigmaStr}
                  </td>
                  <td className="font-mono">
                    {r.zScore !== null ? (
                      <span
                        className={`z-score-pill ${
                          Math.abs(r.zScore) > 3.0
                            ? 'fail'
                            : Math.abs(r.zScore) > 2.5
                            ? 'warn'
                            : 'pass'
                        }`}
                      >
                        {r.zScore > 0 ? '+' : ''}
                        {r.zScore.toFixed(2)}σ
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="font-mono font-bold">
                    {r.marginBuffer !== null ? (
                      <span
                        style={{
                          color: r.marginBuffer < 0 ? 'var(--danger)' : 'var(--success)',
                        }}
                      >
                        {r.marginBuffer >= 0 ? '+' : ''}
                        {r.marginBuffer.toFixed(2)} {unit}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {r.transientMetrics ? (
                      <TransientBadge metrics={r.transientMetrics} compact showDelta />
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>--</span>
                    )}
                  </td>
                  <td>
                    <span className={`cad-stage-badge ${isRowFail ? 'fail' : 'pass'}`}>
                      {isRowFail ? 'FAIL' : 'PASS'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

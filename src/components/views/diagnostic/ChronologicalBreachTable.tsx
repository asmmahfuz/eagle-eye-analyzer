import React from 'react';
import { EvaluatedPoint, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { getExcursionDeficitInfo, getSubsystemRootCauseAction } from '../common/diagnosticUtils';
import { ShieldAlert, Search } from '../../Icons';

export interface ChronologicalBreachTableProps {
  excursions: EvaluatedPoint[];
  softwareVersion: string;
  flowSpUnit?: string;
  dpSpUnit?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
  title?: string;
}

export const ChronologicalBreachTable: React.FC<ChronologicalBreachTableProps> = ({
  excursions,
  softwareVersion,
  flowSpUnit = 'LPM',
  dpSpUnit = 'psi',
  searchQuery,
  onSearchChange,
  onSelectSensor,
  onSelectSubsystem,
  title
}) => {
  return (
    <div className="excursions-ledger-card">
      <div className="excursions-ledger-header">
        <div className="excursion-ledger-title">
          <ShieldAlert size={14} className="text-rose-400" />
          <span>
            {title || `Chronological Out-of-Tolerance Excursions Ledger (${excursions.length} Breaches)`}
          </span>
        </div>

        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search breaches (tag, stage, reason)..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              padding: '3px 8px 3px 24px',
              fontSize: '10.5px',
              borderRadius: '4px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              width: '210px'
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="cad-data-table">
          <thead>
            <tr>
              <th>Timestamp (t)</th>
              <th>Parameter Tag</th>
              <th>Subsystem Domain</th>
              <th>Measured Reading</th>
              <th>Tolerance Limits (±3σ)</th>
              <th>Exact Deficit (Δ)</th>
              <th>Active Stage Setpoints</th>
              <th>Root-Cause Attribution & Action</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {excursions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                  No out-of-tolerance breaches match the search criteria.
                </td>
              </tr>
            ) : (
              excursions.map((f, idx) => {
                const deficit = getExcursionDeficitInfo(f);
                const limitsStr = (f.lowLimit !== null && f.highLimit !== null)
                  ? `[${f.lowLimit.toFixed(2)} ~ ${f.highLimit.toFixed(2)} ${f.unit}]`
                  : '--';
                const measStr = typeof f.measured === 'number' 
                  ? `${f.measured.toFixed(2)} ${f.unit}` 
                  : String(f.measured);
                const rootCause = getSubsystemRootCauseAction(f.category, f.parameter, softwareVersion);
                const spStr = `Flow: ${f.flowSp ?? '--'} ${flowSpUnit}, DP: ${f.dpSp ?? '--'} ${dpSpUnit}`;

                return (
                  <tr key={`${f.parameter}-${f.timeSec}-${idx}`} className="row-fail">
                    <td className="font-mono font-bold" style={{ whiteSpace: 'nowrap' }}>
                      t = {f.timeSec}s
                    </td>
                    <td className="font-bold">
                      <span
                        style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}
                        onClick={() => onSelectSensor(f.parameter)}
                        title={`Open scope for ${f.parameter}`}
                      >
                        {f.parameter}
                      </span>
                    </td>
                    <td className="font-mono text-dim" style={{ fontSize: '10px' }}>
                      {onSelectSubsystem ? (
                        <span
                          style={{ cursor: 'pointer', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                          onClick={() => onSelectSubsystem(f.category)}
                          title={`Filter to ${SUBSYSTEM_LABELS[f.category] || f.category}`}
                        >
                          {SUBSYSTEM_LABELS[f.category] || f.category}
                        </span>
                      ) : (
                        SUBSYSTEM_LABELS[f.category] || f.category
                      )}
                    </td>
                    <td className="font-mono font-bold text-red" style={{ whiteSpace: 'nowrap' }}>
                      {measStr}
                    </td>
                    <td className="font-mono text-dim" style={{ whiteSpace: 'nowrap' }}>
                      {limitsStr}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={deficit.isUpper ? 'deficit-badge-positive' : 'deficit-badge-negative'}>
                        {deficit.formatted}
                      </span>
                    </td>
                    <td className="font-mono text-dim" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                      {spStr}
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '11px', lineHeight: '1.3' }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {f.failureReason || rootCause.probableCause}
                      </div>
                      <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>
                        → {rootCause.reworkDirective}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cad-view-btn-sm"
                        onClick={() => onSelectSensor(f.parameter)}
                        title={`Jump to ${f.parameter} waveform & tolerance envelopes`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

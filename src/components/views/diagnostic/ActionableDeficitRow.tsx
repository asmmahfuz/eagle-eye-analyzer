import React from 'react';
import { EvaluatedPoint, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { getExcursionDeficitInfo } from '../common/diagnosticUtils';

export interface ActionableDeficitRowProps {
  excursion: EvaluatedPoint;
  flowSpUnit: string;
  dpSpUnit: string;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const ActionableDeficitRow: React.FC<ActionableDeficitRowProps> = ({
  excursion: f,
  flowSpUnit,
  dpSpUnit,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const deficit = getExcursionDeficitInfo(f);
  const limitsStr = (f.lowLimit !== null && f.highLimit !== null)
    ? `[${f.lowLimit.toFixed(2)} ~ ${f.highLimit.toFixed(2)} ${f.unit || ''}]`
    : '--';
  const measStr = typeof f.measured === 'number' 
    ? `${f.measured.toFixed(2)} ${f.unit || ''}` 
    : String(f.measured);
  const spStr = `Flow: ${f.flowSp ?? '--'} ${flowSpUnit}, DP: ${f.dpSp ?? '--'} ${dpSpUnit}`;

  // Factual, non-speculative status
  const boundaryText = deficit.isLower
    ? '< Lower 3σ Limit'
    : deficit.isUpper
    ? '> Upper 3σ Limit'
    : 'Tolerance Breached';

  return (
    <tr className="row-fail">
      <td className="font-mono font-bold" style={{ whiteSpace: 'nowrap' }}>
        t = {f.timeSec}s
      </td>
      <td className="font-bold">
        <span
          style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}
          onClick={() => onSelectSensor(f.parameter)}
          title={`Scope telemetry and waveform for ${f.parameter}`}
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
      <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
          {boundaryText}
        </span>
      </td>
      <td style={{ textAlign: 'center' }}>
        <button
          type="button"
          className="cad-view-btn-sm"
          onClick={() => onSelectSensor(f.parameter)}
          title={`Inspect ${f.parameter} oscilloscope waveform`}
        >
          Scope →
        </button>
      </td>
    </tr>
  );
};

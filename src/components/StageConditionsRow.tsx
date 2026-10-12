import React from 'react';
import { OperatingStage, ParameterSummary } from '../types';
import { CheckCircle2, AlertTriangle } from './Icons';
import { TransientBadge } from './views/common/TransientBadge';

export interface StageConditionsRowProps {
  stage: OperatingStage;
  mRow?: Record<string, any>;
  pumpStr: string | null;
  scopedFailedSensors: string[];
  isScopedPass: boolean;
  transientMetrics: any;
  flowSpUnit: string;
  dpSpUnit: string;
  tempSpUnit: string;
  isSubsystemActive: boolean;
  subsystemChannels: { name: string; stat: ParameterSummary }[];
  isRowExpanded: boolean;
  expandAll: boolean;
  isSelected: boolean;
  onSelectSensor: (sensorName: string) => void;
  onSelectStageNum?: (stageNum: number | null) => void;
  onToggleStage: (stageNum: number) => void;
}

export const StageConditionsRow: React.FC<StageConditionsRowProps> = ({
  stage: s,
  mRow,
  pumpStr,
  scopedFailedSensors,
  isScopedPass,
  transientMetrics,
  flowSpUnit,
  dpSpUnit,
  tempSpUnit,
  isSubsystemActive,
  subsystemChannels,
  isRowExpanded,
  expandAll,
  isSelected,
  onSelectSensor,
  onSelectStageNum,
  onToggleStage
}) => {
  const displaySensors = isRowExpanded ? scopedFailedSensors : scopedFailedSensors.slice(0, 3);
  const remainingCount = scopedFailedSensors.length - 3;

  return (
    <tr
      className={`stage-matrix-row ${isScopedPass ? 'row-pass' : 'row-fail'} ${isSelected ? 'row-selected' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button') && onSelectStageNum) {
          onSelectStageNum(isSelected ? null : s.stageNum);
        }
      }}
      style={{ cursor: onSelectStageNum ? 'pointer' : 'default' }}
      title={onSelectStageNum ? (isSelected ? 'Click to clear stage filter' : `Filter matrix to Stage ${s.stageNum}`) : undefined}
    >
      <td className="stage-cell-stage">
        <div className="stage-primary-id">
          <span className="stage-name">Stage {s.stageNum}</span>
          {s.stageNum === 10 && <span className="stage-steady-tag">Steady</span>}
        </div>
        <span className="stage-dwell-sub">{s.timeSec}s dwell</span>
      </td>
      <td className="stage-cell-verdict">
        <span className={`status-badge-mini ${isScopedPass ? 'pass' : 'fail'}`}>
          {isScopedPass ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
          <span>{isScopedPass ? 'PASS' : `${scopedFailedSensors.length} FAIL`}</span>
        </span>
      </td>
      <td className="stage-cell-transient">
        {transientMetrics ? <TransientBadge metrics={transientMetrics} compact showDelta /> : <span className="text-muted font-mono" style={{ fontSize: '10px' }}>--</span>}
      </td>
      <td className="stage-cell-sp font-mono text-cyan-400">
        {s.flowSp !== null ? `${s.flowSp} ${flowSpUnit}` : '--'}
      </td>
      <td className="stage-cell-sp font-mono text-emerald-400">
        {s.dpSp !== null ? `${s.dpSp} ${dpSpUnit}` : '--'}
      </td>
      <td className="stage-cell-sp font-mono text-amber-300">
        {s.tempSp !== null ? `${s.tempSp} ${tempSpUnit}` : '--'}
      </td>
      <td className="stage-cell-sp font-mono text-purple-300">
        {pumpStr ?? '--'}
      </td>
      {isSubsystemActive && (
        <td className="stage-cell-snapshot">
          <div className="stage-subsystem-snapshot-inline">
            {subsystemChannels.slice(0, 2).map(({ name }) => {
              const val = mRow ? mRow[name] : null;
              const isFailed = s.failedSensors.includes(name);
              const valStr = typeof val === 'number' ? val.toFixed(1) : (val !== null && val !== undefined ? String(val) : '--');
              return (
                <span key={name} className={`snapshot-channel ${isFailed ? 'failed' : ''}`}>
                  <span className="snap-name">{name}:</span>{' '}
                  <strong className="snap-val">{valStr}</strong>
                </span>
              );
            })}
          </div>
        </td>
      )}
      <td className="stage-cell-pills">
        {isScopedPass ? (
          <span className="stage-nominal-label">
            <CheckCircle2 size={10} />
            <span>All channels passed</span>
          </span>
        ) : (
          <div className="failed-sensors-pills-row">
            {displaySensors.map(sens => (
              <button
                key={sens}
                type="button"
                className="fail-sensor-tag"
                onClick={() => onSelectSensor(sens)}
              >
                <AlertTriangle size={9} />
                <span>{sens}</span>
              </button>
            ))}
            {!isRowExpanded && remainingCount > 0 && (
              <button
                type="button"
                className="tag-expand-btn"
                onClick={() => onToggleStage(s.stageNum)}
              >
                +{remainingCount} more ▾
              </button>
            )}
            {isRowExpanded && scopedFailedSensors.length > 3 && !expandAll && (
              <button
                type="button"
                className="tag-expand-btn collapse"
                onClick={() => onToggleStage(s.stageNum)}
              >
                Collapse ▴
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

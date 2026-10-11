import React, { useState } from 'react';
import { OperatingStage, SubsystemCategory, ParameterSummary } from '../types';
import { CheckCircle2, AlertTriangle } from './Icons';
import { 
  getProgrammedStage, 
  calculateStageTransientMetrics 
} from '../engine/excitation';
import { TransientBadge } from './views/common/TransientBadge';

interface StageCardsProps {
  stages: OperatingStage[];
  onSelectSensor: (sensorName: string) => void;
  selectedSubsystem?: SubsystemCategory | null;
  selectedSensor?: string | null;
  subsystemChannels?: { name: string; stat: ParameterSummary }[];
  measurements?: Record<string, any>[];
  flowSpUnit?: string;
  dpSpUnit?: string;
  tempSpUnit?: string;
  title?: string;
  selectedStageNum?: number | null;
  onSelectStageNum?: (stageNum: number | null) => void;
}

type StageFilter = 'all' | 'fail' | 'pass';

export const StageCards: React.FC<StageCardsProps> = ({
  stages,
  onSelectSensor,
  selectedSubsystem = null,
  selectedSensor = null,
  subsystemChannels = [],
  measurements = [],
  flowSpUnit = 'LPM',
  dpSpUnit = 'psi',
  tempSpUnit = '°C',
  title,
  selectedStageNum = null,
  onSelectStageNum
}) => {
  const [filter, setFilter] = useState<StageFilter>('all');
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);

  const toggleStage = (stageNum: number) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageNum]: !prev[stageNum]
    }));
  };

  const toggleExpandAll = () => {
    setExpandAll(prev => !prev);
  };

  const isSubsystemActive = !!selectedSubsystem && subsystemChannels.length > 0;

  const stageRows = stages.map(s => {
    const mRow = measurements.find(m => m['Time'] === s.timeSec);
    const pumpVal = mRow ? (mRow['P31 Speed %'] ?? mRow['P41 Speed %']) : null;
    const pumpStr = typeof pumpVal === 'number' ? `${Math.round(pumpVal)}%` : null;

    const scopedFailedSensors = isSubsystemActive
      ? s.failedSensors.filter(sens => subsystemChannels.some(ch => ch.name === sens))
      : s.failedSensors;

    const isScopedPass = scopedFailedSensors.length === 0;

    const progStage = getProgrammedStage(s.stageNum);
    let targetSensorToTrack = selectedSensor;
    let targetUnit = flowSpUnit;

    if (!targetSensorToTrack) {
      if (selectedSubsystem === 'hydraulic') {
        targetSensorToTrack = 'FT01';
        targetUnit = flowSpUnit;
      } else if (selectedSubsystem === 'temperature') {
        targetSensorToTrack = 'TT31';
        targetUnit = tempSpUnit;
      } else if (selectedSubsystem === 'pump') {
        targetSensorToTrack = 'P31 Speed %';
        targetUnit = '%';
      } else {
        targetSensorToTrack = 'FT01';
        targetUnit = flowSpUnit;
      }
    }

    const trackedVal = mRow && targetSensorToTrack ? mRow[targetSensorToTrack] : null;
    const transientMetrics = (progStage && targetSensorToTrack && typeof trackedVal === 'number')
      ? calculateStageTransientMetrics(targetSensorToTrack, progStage, trackedVal, targetUnit)
      : null;

    return {
      stage: s,
      mRow,
      pumpStr,
      scopedFailedSensors,
      isScopedPass,
      transientMetrics
    };
  });

  const totalStages = stageRows.length;
  const failStagesCount = stageRows.filter(r => !r.isScopedPass).length;
  const passStagesCount = stageRows.filter(r => r.isScopedPass).length;

  const filteredRows = stageRows.filter(r => {
    if (filter === 'fail') return !r.isScopedPass;
    if (filter === 'pass') return r.isScopedPass;
    return true;
  });

  return (
    <div className="stage-matrix-container">
      {/* Matrix Controls & Filter Toolbar */}
      <div className="stage-matrix-toolbar">
        <div className="stage-matrix-title-wrap">
          <span className="stage-matrix-title">
            {title ?? (selectedSubsystem ? '10-Stage Operating Conditions — Domain Focus (15s – 525s)' : '10-Stage Operating Conditions & Setpoint Profiles (15s – 525s)')}
          </span>
          <div className="stage-matrix-counts">
            <span className="count-pill all">{totalStages} Stages</span>
            <span className="count-pill fail">{failStagesCount} Failed</span>
            <span className="count-pill pass">{passStagesCount} Nominal</span>
            {selectedStageNum && (
              <span className="count-pill active-stage">
                Filtering Stage {selectedStageNum}
              </span>
            )}
          </div>
        </div>

        <div className="stage-matrix-actions">
          {selectedStageNum && onSelectStageNum && (
            <button
              type="button"
              className="stage-matrix-filter-btn active"
              onClick={() => onSelectStageNum(null)}
              style={{ padding: '2px 8px', color: 'var(--accent-cyan)' }}
              title="Clear stage focus"
            >
              Show All Stages ✕
            </button>
          )}

          {/* Filter toggle buttons */}
          <div className="stage-matrix-filter-group">
            <button
              type="button"
              className={`stage-matrix-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({totalStages})
            </button>
            <button
              type="button"
              className={`stage-matrix-filter-btn fail ${filter === 'fail' ? 'active' : ''}`}
              onClick={() => setFilter('fail')}
            >
              Failed ({failStagesCount})
            </button>
            <button
              type="button"
              className={`stage-matrix-filter-btn pass ${filter === 'pass' ? 'active' : ''}`}
              onClick={() => setFilter('pass')}
            >
              Nominal ({passStagesCount})
            </button>
          </div>

          {/* Expand/Collapse All Failed tags button */}
          {failStagesCount > 0 && (
            <button
              type="button"
              className="stage-matrix-toggle-all-btn"
              onClick={toggleExpandAll}
              title={expandAll ? 'Collapse channel tags' : 'Show all failed channel tags'}
            >
              {expandAll ? 'Collapse Tags' : 'Expand All Tags'}
            </button>
          )}
        </div>
      </div>

      {/* Vertical Scrollable Matrix Table */}
      <div className="stage-matrix-scroll-wrap">
        <table className="stage-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>
                Stage & Dwell
                {onSelectStageNum && (
                  <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--accent-cyan)', marginLeft: '4px', textTransform: 'none' }}>
                    (click to focus)
                  </span>
                )}
              </th>
              <th style={{ width: '9%' }}>Verdict</th>
              <th style={{ width: '14%' }}>Transient Stability</th>
              <th style={{ width: '9%' }}>Flow Sp</th>
              <th style={{ width: '8%' }}>DP Sp</th>
              <th style={{ width: '8%' }}>Temp Sp</th>
              <th style={{ width: '8%' }}>Pump Cmd</th>
              {isSubsystemActive && <th style={{ width: '13%' }}>Snapshot</th>}
              <th style={{ width: isSubsystemActive ? '18%' : '31%' }}>
                Failed Channels ({failStagesCount > 0 ? 'Click to inspect' : 'All Passed'})
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ stage: s, mRow, pumpStr, scopedFailedSensors, isScopedPass, transientMetrics }) => {
              const isRowExpanded = expandAll || !!expandedStages[s.stageNum];
              const displaySensors = isRowExpanded 
                ? scopedFailedSensors 
                : scopedFailedSensors.slice(0, 3);
              const remainingCount = scopedFailedSensors.length - 3;
              const hasOverflow = !isRowExpanded && remainingCount > 0;
              const isSelected = selectedStageNum === s.stageNum;

              return (
                <tr 
                  key={`stage-row-${s.stageNum}`}
                  className={`stage-matrix-row ${isScopedPass ? 'row-pass' : 'row-fail'} ${isSelected ? 'row-selected' : ''}`}
                  onClick={(e) => {
                    // Only trigger stage focus if clicking outside interactive buttons
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && onSelectStageNum) {
                      onSelectStageNum(isSelected ? null : s.stageNum);
                    }
                  }}
                  style={{ cursor: onSelectStageNum ? 'pointer' : 'default' }}
                  title={onSelectStageNum ? (isSelected ? 'Click to clear stage focus' : `Click to filter Core Matrix to Stage ${s.stageNum} checks`) : undefined}
                >
                  {/* Stage & Dwell */}
                  <td className="stage-cell-stage">
                    <div className="stage-primary-id">
                      <span className="stage-name">Stage {s.stageNum}</span>
                      {s.stageNum === 10 && (
                        <span className="stage-steady-tag">Steady</span>
                      )}
                    </div>
                    <span className="stage-dwell-sub">{s.timeSec}s dwell</span>
                  </td>

                  {/* Verdict */}
                  <td className="stage-cell-verdict">
                    <span className={`status-badge-mini ${isScopedPass ? 'pass' : 'fail'}`}>
                      {isScopedPass ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                      <span>{isScopedPass ? 'PASS' : `${scopedFailedSensors.length} FAIL`}</span>
                    </span>
                  </td>

                  {/* Transient Stability */}
                  <td className="stage-cell-transient">
                    {transientMetrics ? (
                      <TransientBadge metrics={transientMetrics} compact showDelta />
                    ) : (
                      <span className="text-muted font-mono" style={{ fontSize: '10px' }}>--</span>
                    )}
                  </td>

                  {/* Flow Sp */}
                  <td className="stage-cell-sp">
                    <span className="sp-v font-mono text-cyan-400">
                      {s.flowSp !== null ? `${s.flowSp} ${flowSpUnit}` : '--'}
                    </span>
                  </td>

                  {/* DP Sp */}
                  <td className="stage-cell-sp">
                    <span className="sp-v font-mono text-emerald-400">
                      {s.dpSp !== null ? `${s.dpSp} ${dpSpUnit}` : '--'}
                    </span>
                  </td>

                  {/* Temp Sp */}
                  <td className="stage-cell-sp">
                    <span className="sp-v font-mono text-amber-300">
                      {s.tempSp !== null ? `${s.tempSp} ${tempSpUnit}` : '--'}
                    </span>
                  </td>

                  {/* Pump Cmd */}
                  <td className="stage-cell-sp">
                    <span className="sp-v font-mono text-purple-300">
                      {pumpStr ?? '--'}
                    </span>
                  </td>

                  {/* Subsystem Snapshot (if scoped) */}
                  {isSubsystemActive && (
                    <td className="stage-cell-snapshot">
                      <div className="stage-subsystem-snapshot-inline">
                        {subsystemChannels.slice(0, 2).map(({ name, stat }) => {
                          const val = mRow ? mRow[name] : null;
                          const isFailed = s.failedSensors.includes(name);
                          const valStr = typeof val === 'number' ? val.toFixed(1) : (val !== null && val !== undefined ? String(val) : '--');
                          return (
                            <span 
                              key={name} 
                              className={`snapshot-channel ${isFailed ? 'failed' : ''}`}
                              title={`${name}: ${valStr} ${stat.unit}`}
                            >
                              <span className="snap-name">{name}:</span>{' '}
                              <strong className="snap-val">{valStr}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  )}

                  {/* Excursions / Failing Sensors */}
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
                            title={`Click to inspect waveform and failure details for ${sens}`}
                          >
                            <AlertTriangle size={9} />
                            <span>{sens}</span>
                          </button>
                        ))}
                        {hasOverflow && (
                          <button
                            type="button"
                            className="tag-expand-btn"
                            onClick={() => toggleStage(s.stageNum)}
                            title="Show all failing channels"
                          >
                            +{remainingCount} more ▾
                          </button>
                        )}
                        {isRowExpanded && scopedFailedSensors.length > 3 && !expandAll && (
                          <button
                            type="button"
                            className="tag-expand-btn collapse"
                            onClick={() => toggleStage(s.stageNum)}
                            title="Collapse list"
                          >
                            Collapse ▴
                          </button>
                        )}
                      </div>
                    )}
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

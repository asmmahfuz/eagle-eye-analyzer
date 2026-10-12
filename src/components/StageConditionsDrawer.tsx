import React, { useState } from 'react';
import { OperatingStage, SubsystemCategory, ParameterSummary } from '../types';
import { getProgrammedStage, calculateStageTransientMetrics } from '../engine/excitation';
import { StageConditionsRow } from './StageConditionsRow';

export interface StageConditionsDrawerProps {
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

export const StageConditionsDrawer: React.FC<StageConditionsDrawerProps> = ({
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
    setExpandedStages(prev => ({ ...prev, [stageNum]: !prev[stageNum] }));
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

    let targetSensor = selectedSensor || (selectedSubsystem === 'hydraulic' ? 'FT01' : selectedSubsystem === 'temperature' ? 'TT31' : selectedSubsystem === 'pump' ? 'P31 Speed %' : 'FT01');
    let targetUnit = targetSensor === 'P31 Speed %' ? '%' : targetSensor === 'TT31' ? tempSpUnit : flowSpUnit;
    const trackedVal = mRow && targetSensor ? mRow[targetSensor] : null;

    const transientMetrics = (progStage && targetSensor && typeof trackedVal === 'number')
      ? calculateStageTransientMetrics(targetSensor, progStage, trackedVal, targetUnit)
      : null;

    return { stage: s, mRow, pumpStr, scopedFailedSensors, isScopedPass, transientMetrics };
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
    <div className="stage-matrix-container stage-drawer-container">
      <div className="stage-matrix-toolbar">
        <div className="stage-matrix-title-wrap">
          <span className="stage-matrix-title">
            {title ?? (selectedSubsystem ? '10-Stage Operating Conditions Matrix — Subsystem Detail' : '10-Stage Operating Conditions Matrix (15s – 525s)')}
          </span>
          <div className="stage-matrix-counts">
            <span className="count-pill all">{totalStages} Stages</span>
            <span className="count-pill fail">{failStagesCount} Failed</span>
            <span className="count-pill pass">{passStagesCount} Nominal</span>
          </div>
        </div>

        <div className="stage-matrix-actions">
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

          {failStagesCount > 0 && (
            <button
              type="button"
              className="stage-matrix-toggle-all-btn"
              onClick={() => setExpandAll(p => !p)}
            >
              {expandAll ? 'Collapse Tags' : 'Expand All Tags'}
            </button>
          )}
        </div>
      </div>

      <div className="stage-matrix-scroll-wrap">
        <table className="stage-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Stage & Dwell</th>
              <th style={{ width: '9%' }}>Verdict</th>
              <th style={{ width: '14%' }}>Transient Stability</th>
              <th style={{ width: '9%' }}>Flow Sp</th>
              <th style={{ width: '8%' }}>DP Sp</th>
              <th style={{ width: '8%' }}>Temp Sp</th>
              <th style={{ width: '8%' }}>Pump Cmd</th>
              {isSubsystemActive && <th style={{ width: '13%' }}>Snapshot</th>}
              <th style={{ width: isSubsystemActive ? '18%' : '31%' }}>Failed Channels</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ stage: s, mRow, pumpStr, scopedFailedSensors, isScopedPass, transientMetrics }) => (
              <StageConditionsRow
                key={`stage-row-${s.stageNum}`}
                stage={s}
                mRow={mRow}
                pumpStr={pumpStr}
                scopedFailedSensors={scopedFailedSensors}
                isScopedPass={isScopedPass}
                transientMetrics={transientMetrics}
                flowSpUnit={flowSpUnit}
                dpSpUnit={dpSpUnit}
                tempSpUnit={tempSpUnit}
                isSubsystemActive={isSubsystemActive}
                subsystemChannels={subsystemChannels}
                isRowExpanded={expandAll || !!expandedStages[s.stageNum]}
                expandAll={expandAll}
                isSelected={selectedStageNum === s.stageNum}
                onSelectSensor={onSelectSensor}
                onSelectStageNum={onSelectStageNum}
                onToggleStage={toggleStage}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

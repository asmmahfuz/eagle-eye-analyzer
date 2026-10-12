import React, { useState } from 'react';
import { OperatingStage, SubsystemCategory, ParameterSummary } from '../types';
import { ChevronRight, ChevronDown } from './Icons';
import { StageConditionsDrawer } from './StageConditionsDrawer';

export interface StageCardsProps {
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

export const StageCards: React.FC<StageCardsProps> = (props) => {
  const {
    stages,
    selectedSubsystem = null,
    subsystemChannels = [],
    selectedStageNum = null,
    onSelectStageNum
  } = props;

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const isSubsystemActive = !!selectedSubsystem && subsystemChannels.length > 0;

  return (
    <div className="stage-dwell-strip-wrapper">
      {/* Compact Horizontal Stage Dwell Filter Strip */}
      <div className="stage-dwell-filter-strip" role="region" aria-label="10-Stage Dwell Filter Strip">
        <div className="stage-dwell-strip-left">
          <span className="stage-dwell-strip-label">STAGE FILTER:</span>
          <div className="stage-dwell-strip-buttons">
            {/* All Stages Button */}
            <button
              type="button"
              className={`stage-strip-btn ${selectedStageNum === null ? 'active' : ''}`}
              onClick={() => onSelectStageNum && onSelectStageNum(null)}
              title="Show checks across all stages"
            >
              All Stages ({stages.length})
            </button>

            {/* S1..S10 Buttons */}
            {stages.map(s => {
              const scopedFailures = isSubsystemActive
                ? s.failedSensors.filter(sens => subsystemChannels.some(ch => ch.name === sens))
                : s.failedSensors;
              const isPass = scopedFailures.length === 0;
              const isSelected = selectedStageNum === s.stageNum;

              return (
                <button
                  key={s.stageNum}
                  type="button"
                  className={`stage-strip-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    if (onSelectStageNum) {
                      onSelectStageNum(isSelected ? null : s.stageNum);
                    }
                  }}
                  title={`Stage ${s.stageNum} (${s.timeSec}s) — ${isPass ? 'All Nominal' : `${scopedFailures.length} Failed`}. Click to filter table.`}
                >
                  <span>S{s.stageNum}</span>
                  <span style={{ fontSize: '9px', opacity: 0.75 }}>({s.timeSec}s)</span>
                  <span className={`stage-dot ${isPass ? 'pass' : 'fail'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Drawer Toggle */}
        <button
          type="button"
          className="stage-drawer-toggle-btn"
          onClick={() => setIsDrawerOpen(prev => !prev)}
          title={isDrawerOpen ? 'Collapse operating conditions matrix' : 'Expand full 10-stage operating setpoints matrix'}
          aria-expanded={isDrawerOpen}
        >
          {isDrawerOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>{isDrawerOpen ? 'Hide Setpoints Matrix' : '▸ Show 10-Stage Setpoints Matrix'}</span>
        </button>
      </div>

      {/* Progressive Disclosure: Collapsible 10-Stage Operating Conditions Matrix */}
      {isDrawerOpen && (
        <StageConditionsDrawer {...props} />
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { StageCards } from '../../StageCards';
import { 
  CheckCircle2, 
  XCircle, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Activity, 
  Thermometer, 
  Layers 
} from '../../Icons';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';
import { CoreInspectionMatrix } from './CoreInspectionMatrix';

export interface GroupDataSheetProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

export const GroupDataSheet: React.FC<GroupDataSheetProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
}) => {
  const [selectedMetricSensor, setSelectedMetricSensor] = useState<string | null>(null);
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);

  const { 
    metadata, 
    categoryCounts, 
    parameterStats, 
    stages, 
    unitMap, 
    measurements 
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  const subName = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;

  const activeChannels = useMemo(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, selectedSubsystem]);

  const subCatCount = categoryCounts[selectedSubsystem];
  const activeFailCount = subCatCount ? subCatCount.fail : 0;
  const activePassCount = subCatCount ? subCatCount.pass : 0;
  const activeTotalEvaluated = activePassCount + activeFailCount;
  const activePassRate = activeTotalEvaluated > 0 
    ? Number(((activePassCount / activeTotalEvaluated) * 100).toFixed(1)) 
    : 100;
  const isScopePass = activeFailCount === 0;

  const getSubsystemIcon = (cat: SubsystemCategory) => {
    switch (cat) {
      case 'hydraulic': return <Droplets size={16} className="text-cyan-400" />;
      case 'pump': return <Activity size={16} className="text-blue-400" />;
      case 'temperature': return <Thermometer size={16} className="text-amber-400" />;
      case 'pressure': return <Gauge size={16} className="text-sky-400" />;
      case 'environmental': return <Wind size={16} className="text-indigo-400" />;
      case 'system': return <Cpu size={16} className="text-purple-400" />;
      default: return <Activity size={16} className="text-cyan-400" />;
    }
  };

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem Filter Announcement Banner */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info">
          <span>FILTERED BY SUBSYSTEM:</span>
          <strong className="text-cyan-400">{subName.toUpperCase()}</strong>
          <span style={{ opacity: 0.7 }}>— Showing telemetry & operating matrix for this domain only</span>
        </div>
        {onResetSubsystem && (
          <button 
            type="button"
            className="reset-subsystem-btn"
            onClick={onResetSubsystem}
            title="Click to view the entire unit overview"
          >
            <Layers size={11} />
            <span>Show Whole Unit</span>
          </button>
        )}
      </div>

      {/* Row Header Bar (Single Source of Truth for Subsystem Metadata & Acceptance Verdict) */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            {getSubsystemIcon(selectedSubsystem)}
          </div>
          <div>
            <h2 className="sensor-main-title">
              {subName} Subsystem Data Sheet & Stages
            </h2>
            <span className="unit-metadata-sub">
              Unit Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | Work Order: <strong>{metadata.workOrderNumber || 'N/A'}</strong> | Tested by: <strong>{metadata.testedBy || 'N/A'}</strong> | Date: <strong>{metadata.dateTested || 'N/A'}</strong> | SW: <strong>v{metadata.softwareVersion}</strong>
            </span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Acceptance Standard">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isScopePass ? 'pass' : 'fail'}`}>
            {isScopePass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>SUBSYSTEM VERDICT: {isScopePass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">({activePassRate}% Compliance)</span>
          </div>
        </div>
      </div>

      {/* Compact 10-Stage Operating Conditions Filter Strip Scoped to Subsystem */}
      <div style={{ padding: '0 14px' }}>
        <StageCards 
          title={`10-Stage Operating Conditions — ${subName} Domain Focus (15s – 525s)`}
          stages={stages} 
          measurements={measurements} 
          selectedSubsystem={selectedSubsystem} 
          subsystemChannels={activeChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
          selectedStageNum={selectedStageNum}
          onSelectStageNum={setSelectedStageNum}
        />
      </div>

      {/* Strict 5-Column Core Inspection Matrix Scoped to Subsystem */}
      <CoreInspectionMatrix
        dataset={dataset}
        selectedStageNum={selectedStageNum}
        onClearStageNum={() => setSelectedStageNum(null)}
        onSelectSensor={onSelectSensor}
        onOpenMetricsModal={(s) => setSelectedMetricSensor(s)}
        fixedCategory={selectedSubsystem}
      />

      {/* On-Demand Advanced SPC Metrology Modal */}
      <CadAdvancedMetricsModal
        isOpen={selectedMetricSensor !== null}
        onClose={() => setSelectedMetricSensor(null)}
        initialSensor={selectedMetricSensor || ''}
        dataset={dataset}
        onSelectSensor={onSelectSensor}
      />
    </section>
  );
};

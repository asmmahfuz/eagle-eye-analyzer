import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
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
import { getFriendlyChannelName } from '../../../engine/registers';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';
import { SingleChannelStageMatrix } from './SingleChannelStageMatrix';

export interface TestDataSheetProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

export const TestDataSheet: React.FC<TestDataSheetProps> = ({
  dataset,
  selectedSensor,
  onSelectSubsystem,
  onBackToOverview,
  onSelectSensor
}) => {
  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [selectedModalStage, setSelectedModalStage] = useState<number | null>(null);

  const { 
    metadata, 
    evaluatedChecks, 
    parameterStats, 
    stages, 
    unitMap 
  } = dataset;

  const stats = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subName = SUBSYSTEM_LABELS[category] || category;
  const friendlyName = getFriendlyChannelName(selectedSensor);

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  // Evaluated points for this specific sensor
  const sensorEvaluations = useMemo(() => {
    return evaluatedChecks.filter(c => c.parameter === selectedSensor);
  }, [evaluatedChecks, selectedSensor]);

  const failures = useMemo(() => {
    return sensorEvaluations.filter(c => c.status === 'fail');
  }, [sensorEvaluations]);

  const hasFail = failures.length > 0;
  const isPass = !hasFail;

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

  const handleOpenMetricsModal = (stageNum: number | null) => {
    setSelectedModalStage(stageNum);
    setShowMetricsModal(true);
  };

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem & Channel Navigation Banner */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.7 }}>TELEMETRY CHANNEL:</span>
          <strong className="text-cyan-400 font-mono" style={{ fontSize: '13px' }}>{friendlyName}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>({selectedSensor})</span>
          <span className="cad-badge-unit" style={{ padding: '1px 6px', fontSize: '10px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
            {unit || '--'}
          </span>
          <span style={{ opacity: 0.6, fontSize: '11px' }}>• {subName} Domain</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSelectSubsystem && (
            <button
              type="button"
              className="reset-subsystem-btn"
              onClick={() => onSelectSubsystem(category)}
              title={`Filter to all ${subName} channels`}
            >
              {getSubsystemIcon(category)}
              <span>{subName} Group</span>
            </button>
          )}

          {onBackToOverview && (
            <button
              type="button"
              className="reset-subsystem-btn"
              onClick={onBackToOverview}
              title="Return to Whole Unit Data Sheet"
            >
              <Layers size={11} />
              <span>Whole Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Row Header Bar (Single Source of Truth for Channel Metadata & Acceptance Verdict) */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            {getSubsystemIcon(category)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="sensor-main-title" style={{ margin: 0 }}>
                {friendlyName}
              </h2>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                color: 'var(--accent-cyan)', 
                background: 'rgba(2, 132, 199, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '3px',
                border: '1px solid rgba(2, 132, 199, 0.2)'
              }}>
                Tag: {selectedSensor}
              </span>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                color: 'var(--success)', 
                background: 'rgba(5, 150, 105, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '3px',
                border: '1px solid rgba(5, 150, 105, 0.2)'
              }}>
                {unit || '--'}
              </span>
            </div>
            <span className="unit-metadata-sub">
              Domain: <strong>{subName}</strong> | Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | Work Order: <strong>{metadata.workOrderNumber || 'N/A'}</strong> | Tested by: <strong>{metadata.testedBy || 'N/A'}</strong> | Date: <strong>{metadata.dateTested || 'N/A'}</strong>
            </span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Acceptance Standard">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isPass ? 'pass' : 'fail'}`}>
            {isPass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>3σ VERDICT: {isPass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">
              ({hasFail ? `${failures.length} Violations` : '100% In Tolerance'})
            </span>
          </div>
        </div>
      </div>

      {/* Single-Channel 10-Stage Operating Progression & Verification Matrix */}
      <div style={{ padding: '0 14px' }}>
        <SingleChannelStageMatrix
          selectedSensor={selectedSensor}
          dataset={dataset}
          onOpenMetricsModal={handleOpenMetricsModal}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
        />
      </div>

      {/* On-Demand Advanced SPC Metrology Modal */}
      <CadAdvancedMetricsModal
        isOpen={showMetricsModal}
        onClose={() => {
          setShowMetricsModal(false);
          setSelectedModalStage(null);
        }}
        initialSensor={selectedSensor}
        dataset={dataset}
        onSelectSensor={onSelectSensor}
        highlightStageNum={selectedModalStage}
      />
    </section>
  );
};

import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { StageCards } from '../../StageCards';
import { CheckCircle2, XCircle, BarChart2 } from '../../Icons';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';
import { CoreInspectionMatrix } from './CoreInspectionMatrix';

export interface UnitDataSheetProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const UnitDataSheet: React.FC<UnitDataSheetProps> = ({
  dataset,
  onSelectSensor
}) => {
  const [selectedMetricSensor, setSelectedMetricSensor] = useState<string | null>(null);
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);

  const { 
    metadata, 
    failedCount, 
    passRate, 
    parameterStats,
    stages,
    unitMap,
    measurements
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  const isOverallPass = metadata.finalResult === 'Pass' || failedCount === 0;

  const allChannels = useMemo(() => {
    return Object.entries(parameterStats).map(([name, stat]) => ({ name, stat }));
  }, [parameterStats]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Row Header Bar (Single Source of Truth for Unit Metadata & Acceptance Verdict) */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            <BarChart2 size={16} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="sensor-main-title">
              Executive Test Run & Subsystem Data Sheet
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

          <div className={`status-badge-prominent ${isOverallPass ? 'pass' : 'fail'}`}>
            {isOverallPass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>OVERALL VERDICT: {isOverallPass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">({passRate}% Compliance)</span>
          </div>
        </div>
      </div>

      {/* Compact 10-Stage Operating Conditions Filter Strip & Progressive Disclosure Drawer */}
      <div style={{ padding: '0 14px' }}>
        <StageCards 
          title="10-Stage Operating Conditions Matrix (15s – 525s)"
          stages={stages} 
          measurements={measurements} 
          subsystemChannels={allChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
          selectedStageNum={selectedStageNum}
          onSelectStageNum={setSelectedStageNum}
        />
      </div>

      {/* Strict 5-Column Core Inspection Matrix */}
      <CoreInspectionMatrix
        dataset={dataset}
        selectedStageNum={selectedStageNum}
        onClearStageNum={() => setSelectedStageNum(null)}
        onSelectSensor={onSelectSensor}
        onOpenMetricsModal={(s) => setSelectedMetricSensor(s)}
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

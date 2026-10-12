import React from 'react';
import { EagleEyeDataset, ScopeTier, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  ShieldAlert,
  Layers,
  ArrowLeft,
  ChevronRight,
  Sliders,
  Activity,
  Cpu,
  Wrench
} from '../../Icons';

export interface DiagnosticPlaceholderProps {
  dataset: EagleEyeDataset;
  scope: ScopeTier;
  selectedSensor?: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  onBackToOverview?: () => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
}

interface PlannedFeature {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const PLANNED_FEATURES: PlannedFeature[] = [
  {
    title: 'Model-Specific Baseline Calibration',
    desc: 'Dynamic tolerance bounds and flow-compensated operating envelopes tuned for specific CDU architectures.',
    icon: <Sliders size={18} className="text-cyan-400" />
  },
  {
    title: 'Multi-Sensor Anomaly Correlation',
    desc: 'Cross-checks thermal and hydraulic balance with transient settling filters to distinguish noise from genuine faults.',
    icon: <Activity size={18} className="text-emerald-400" />
  },
  {
    title: 'Modbus Register Deep Diagnostics',
    desc: 'Direct interrogation of hardware holding registers, signed vacuum decoding, and communication health checks.',
    icon: <Cpu size={18} className="text-amber-400" />
  },
  {
    title: 'Guided Technician Rework Directives',
    desc: 'Step-by-step physical inspection procedures and digital QA traveler sign-offs for shopfloor technicians.',
    icon: <Wrench size={18} className="text-purple-400" />
  }
];

export const DiagnosticPlaceholder: React.FC<DiagnosticPlaceholderProps> = ({
  dataset,
  scope,
  selectedSensor,
  selectedSubsystem,
  onBackToOverview,
  onSelectSubsystem
}) => {
  const { metadata } = dataset;
  const subName = selectedSubsystem ? (SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem) : '';

  const title = scope === 'test' && selectedSensor
    ? `${selectedSensor} Diagnostics`
    : scope === 'group' && selectedSubsystem
    ? `${subName} Subsystem Diagnostics`
    : 'Automated Diagnostics & Root-Cause Analysis';

  return (
    <div className="cad-diag-placeholder-container">
      {/* Scope Navigation Bar (if scoped to group or sensor) */}
      {scope !== 'unit' && (
        <div className="cad-subsystem-filter-banner" style={{ margin: '0 0 14px 0' }}>
          <div className="filter-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBackToOverview && (
              <button
                className="reset-subsystem-btn"
                onClick={onBackToOverview}
                title="Return to Whole Unit Overview"
                style={{ padding: '2px 8px', fontSize: '10.5px' }}
              >
                <ArrowLeft size={11} />
                <span>Whole Unit</span>
              </button>
            )}

            <span>SCOPE:</span>
            <strong className="text-cyan-400">
              {scope === 'test' ? selectedSensor : subName.toUpperCase()}
            </strong>

            {scope === 'test' && selectedSubsystem && onSelectSubsystem && (
              <button
                className="cad-view-btn-sm"
                onClick={() => onSelectSubsystem(selectedSubsystem)}
                title={`Scope to ${subName} Subsystem`}
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                <span>{subName}</span>
                <ChevronRight size={10} />
              </button>
            )}
          </div>

          <button
            className="reset-subsystem-btn"
            onClick={onBackToOverview}
            title="Reset Scope to Whole Unit"
          >
            <Layers size={11} />
            <span>Show Whole Unit</span>
          </button>
        </div>
      )}

      {/* Main Hero Card */}
      <div className="cad-diag-hero-card">
        <div className="cad-diag-hero-top">
          <div className="cad-diag-icon-box">
            <ShieldAlert size={24} className="text-cyan-400" />
          </div>
          <div className="cad-diag-hero-text">
            <div className="cad-diag-badge-row">
              <span className="cad-diag-status-badge">IN DEVELOPMENT</span>
              <span className="cad-diag-unit-badge">
                Unit {metadata.serialNumber || 'CD050L'} (WO {metadata.workOrderNumber || 'WO2602286'})
              </span>
            </div>
            <h1 className="cad-diag-title">{title}</h1>
            <p className="cad-diag-subtitle">
              Automated root-cause diagnostics are currently under development. In the future, this tab will 
              evaluate operating telemetry against physics-informed models and provide actionable rework directives.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Planned Capability Cards */}
      <div className="cad-diag-features-grid">
        {PLANNED_FEATURES.map((feat, idx) => (
          <div key={idx} className="cad-diag-feature-card">
            <div className="cad-diag-card-header">
              <div className="cad-diag-card-icon">{feat.icon}</div>
              <span className="cad-diag-card-status">IN DEVELOPMENT</span>
            </div>
            <h3 className="cad-diag-card-title">{feat.title}</h3>
            <p className="cad-diag-card-desc">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

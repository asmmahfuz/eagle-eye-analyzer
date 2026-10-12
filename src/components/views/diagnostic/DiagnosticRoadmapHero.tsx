import React from 'react';
import { EagleEyeDataset, ScopeTier, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  ShieldAlert,
  Layers,
  ArrowLeft,
  ChevronRight,
  Info,
  Sliders
} from '../../Icons';

export interface DiagnosticRoadmapHeroProps {
  dataset: EagleEyeDataset;
  scope: ScopeTier;
  selectedSensor?: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  onBackToOverview?: () => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onSelectSensor?: (sensor: string | null) => void;
}

export const DiagnosticRoadmapHero: React.FC<DiagnosticRoadmapHeroProps> = ({
  dataset,
  scope,
  selectedSensor,
  selectedSubsystem,
  onBackToOverview,
  onSelectSubsystem
}) => {
  const { metadata, headers } = dataset;
  const channelCount = headers.length > 1 ? headers.length - 1 : Object.keys(dataset.parameterStats).length;
  const subName = selectedSubsystem ? (SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem) : '';

  return (
    <div className="cad-roadmap-hero-wrapper">
      {/* Scope Navigation Bar (if scoped to group or channel) */}
      {scope !== 'unit' && (
        <div className="cad-subsystem-filter-banner" style={{ margin: '0 0 12px 0' }}>
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

            <span>DIAGNOSTIC SCOPE:</span>
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

            <span style={{ opacity: 0.7 }}>
              — Planned Diagnostic Specification & Algorithm Calibration
            </span>
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

      {/* Hero Notice & Vision Card */}
      <div className="cad-roadmap-hero-card">
        <div className="cad-roadmap-badge-row">
          <span className="cad-roadmap-status-pill in-design">
            <Sliders size={12} className="spin-slow" />
            <span>ACTIVE DEVELOPMENT</span>
          </span>
          <span className="cad-roadmap-version-tag">
            ENGINEERING SPECIFICATION
          </span>
          <span className="cad-roadmap-arch-tag">
            COOLIT™ CHx2000 ARCHITECTURE
          </span>
        </div>

        <div className="cad-roadmap-title-row">
          <div className="cad-roadmap-icon-box">
            <ShieldAlert size={26} className="text-cyan-400" />
          </div>
          <div className="cad-roadmap-headings">
            <h1 className="cad-roadmap-main-heading">
              {scope === 'test' && selectedSensor
                ? `${selectedSensor} Diagnostic & Anomaly Detection Framework`
                : scope === 'group' && selectedSubsystem
                ? `${subName} Subsystem Diagnostic Engine`
                : 'Automated Diagnostic & Root-Cause Analysis Framework'}
            </h1>
            <p className="cad-roadmap-subheading">
              Physics-informed automated root-cause diagnostic framework under development. Engineered to evaluate 
              first-principles thermal-hydraulic balance, multi-sensor correlation, and Modbus hardware holding registers.
            </p>
          </div>
        </div>

        {/* Live Context Strip */}
        <div className="cad-roadmap-context-strip">
          <div className="cad-roadmap-ctx-item">
            <span className="ctx-label">Target Unit:</span>
            <span className="ctx-val font-mono">{metadata.serialNumber || 'CD050L'}</span>
          </div>
          <div className="cad-roadmap-ctx-item">
            <span className="ctx-label">Work Order:</span>
            <span className="ctx-val font-mono">{metadata.workOrderNumber || 'WO2602286'}</span>
          </div>
          <div className="cad-roadmap-ctx-item">
            <span className="ctx-label">CDU Architecture:</span>
            <span className="ctx-val">CoolIT™ CHx2000 (Liquid-to-Liquid)</span>
          </div>
          <div className="cad-roadmap-ctx-item">
            <span className="ctx-label">Telemetry Channels:</span>
            <span className="ctx-val font-mono">{channelCount} channels</span>
          </div>
          <div className="cad-roadmap-ctx-item">
            <span className="ctx-label">Software Build:</span>
            <span className="ctx-val font-mono">v{metadata.softwareVersion || '0.23'}</span>
          </div>
        </div>

        {/* Engineering Objectives Callout */}
        <div className="cad-roadmap-rationale-box">
          <div className="rationale-header">
            <Info size={14} className="text-cyan-400" />
            <strong>Engineering Design Goals & Scope:</strong>
          </div>
          <p className="rationale-text">
            This workspace outlines the planned automated diagnostic engine for Eagle Eye™. The objective is to replace 
            generic threshold checks with high-confidence root-cause attribution—accounting for thermal settling periods, 
            pump affinity curves, and sensor communication protocols to deliver reliable rework guidance to shopfloor technicians.
          </p>
        </div>
      </div>
    </div>
  );
};

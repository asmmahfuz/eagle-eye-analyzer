import React, { useState } from 'react';
import { EvaluatedFaultResult } from '../../../engine/diagnostics/faultTypes';
import { getTroubleshootingGuide } from '../../../engine/diagnostics/troubleshootingRegistry';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Wrench,
  ShieldAlert
} from '../../Icons';

export interface FaultCodeCardProps {
  fault: EvaluatedFaultResult;
  initialExpanded?: boolean;
  onSelectSensor?: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const FaultCodeCard: React.FC<FaultCodeCardProps> = ({
  fault,
  initialExpanded = false,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded || fault.isTriggered);
  const { definition, status, isTriggered, triggerCount, worstDeviationStr, breaches, summary } = fault;
  const guide = getTroubleshootingGuide(definition.codeNumber);

  const statusClass = isTriggered 
    ? 'fault-status-fail' 
    : status === 'warn' 
      ? 'fault-status-warn' 
      : status === 'not_applicable' 
        ? 'fault-status-na' 
        : 'fault-status-pass';

  return (
    <div className={`cad-fault-code-card ${statusClass} ${isExpanded ? 'is-expanded' : ''}`}>
      {/* Clickable Header Strip */}
      <div 
        className="fault-card-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <div className="fault-header-left">
          <span className={`fault-code-badge ${statusClass}`}>
            {definition.id}
          </span>
          <span className="fault-title-text">
            {definition.title}
          </span>
          <span 
            className="fault-subsystem-pill"
            onClick={(e) => {
              if (onSelectSubsystem) {
                e.stopPropagation();
                onSelectSubsystem(definition.category);
              }
            }}
            title={`Filter to ${SUBSYSTEM_LABELS[definition.category] || definition.category}`}
          >
            {SUBSYSTEM_LABELS[definition.category] || definition.category}
          </span>
        </div>

        <div className="fault-header-right">
          {isTriggered ? (
            <span className="fault-verdict-pill verdict-triggered">
              <AlertTriangle size={12} />
              <span>TRIGGERED ({triggerCount} Breaches)</span>
            </span>
          ) : status === 'warn' ? (
            <span className="fault-verdict-pill verdict-warning">
              <AlertTriangle size={12} />
              <span>3σ MARGIN WARNING</span>
            </span>
          ) : status === 'not_applicable' ? (
            <span className="fault-verdict-pill verdict-na">
              <span>NOT EQUIPPED</span>
            </span>
          ) : (
            <span className="fault-verdict-pill verdict-passed">
              <CheckCircle2 size={12} />
              <span>PASS</span>
            </span>
          )}

          <button type="button" className="fault-expand-toggle-btn" aria-label="Toggle details">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Summary Line */}
      <div className="fault-card-summary">
        <span className="fault-summary-text">{summary}</span>
        {worstDeviationStr && (
          <span className="fault-worst-deviation">
            Worst Excursion: <strong>{worstDeviationStr}</strong>
          </span>
        )}
      </div>

      {/* Expandable Details Drawer */}
      {isExpanded && (
        <div className="fault-card-body">
          {/* Engineering Purpose & Mathematical Formulation */}
          <div className="fault-details-grid">
            <div className="fault-purpose-panel">
              <div className="panel-label">
                <Info size={12} className="text-cyan-400" />
                <span>Engineering Purpose</span>
              </div>
              <p className="panel-text">{definition.purpose}</p>
            </div>

            <div className="fault-math-panel">
              <div className="panel-label">
                <ShieldAlert size={12} className="text-amber-400" />
                <span>Mathematical Validation Rule</span>
              </div>
              <code className="panel-code">{definition.mathDescription}</code>
            </div>
          </div>

          {/* Associated Sensors Nav Strip */}
          {definition.associatedSensors.length > 0 && (
            <div className="fault-sensors-row">
              <span className="sensors-label">Associated Channels:</span>
              <div className="sensors-chips">
                {definition.associatedSensors.map(sensor => (
                  <button
                    key={sensor}
                    type="button"
                    className="fault-sensor-chip"
                    onClick={() => onSelectSensor && onSelectSensor(sensor)}
                    title={`Inspect telemetry and waveform for ${sensor}`}
                  >
                    <span>{sensor}</span>
                    <ChevronRight size={10} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shopfloor Troubleshooting Remediation Drawer */}
          <div className="fault-troubleshooting-drawer">
            <div className="drawer-header">
              <Wrench size={14} className="text-amber-400" />
              <span className="drawer-title">Shopfloor Remediation & Inspection Protocol</span>
            </div>
            <p className="drawer-trouble-text">{definition.troubleshooting}</p>

            {guide && guide.safetyAdvisory && (
              <div className="drawer-safety-notice">
                <strong>Safety Advisory:</strong> {guide.safetyAdvisory}
              </div>
            )}

            <div className="drawer-remediation-checklist">
              <span className="checklist-heading">Actionable Remediation Directives:</span>
              <ol className="remediation-steps-list">
                {definition.remediationSteps.map((step, idx) => (
                  <li key={idx} className="remediation-step-item">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

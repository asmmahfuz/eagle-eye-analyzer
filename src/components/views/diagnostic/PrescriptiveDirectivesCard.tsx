import React from 'react';
import {
  PrescriptiveTuningGuide,
  getPrescriptiveTuningGuide,
  LOW_FLOW_ROOT_CAUSES,
  LOW_FLOW_DIRECTIONAL_INCREASE,
  HIGH_DP_TEMP_DIRECTIONAL_DECREASE,
  SUCTION_CAVITATION_WARNING
} from '../common/diagnosticUtils';
import { AlertTriangle, ShieldAlert, Wrench, Info } from '../../Icons';

export interface PrescriptiveDirectivesCardProps {
  guide?: PrescriptiveTuningGuide;
  parameter?: string;
  measuredVal?: number;
  expectedRange?: [number, number];
  deficitStr?: string;
  title?: string;
  isUnitOverview?: boolean;
}

export const PrescriptiveDirectivesCard: React.FC<PrescriptiveDirectivesCardProps> = ({
  guide,
  parameter,
  measuredVal,
  expectedRange,
  deficitStr,
  title,
  isUnitOverview = false
}) => {
  const activeGuide: PrescriptiveTuningGuide = guide || getPrescriptiveTuningGuide(
    parameter || 'FT01',
    measuredVal ?? 0,
    expectedRange ?? [0, 0],
    deficitStr ?? ''
  );

  const causes = isUnitOverview ? LOW_FLOW_ROOT_CAUSES : activeGuide.suspectedCauses;
  const increaseSteps = isUnitOverview ? LOW_FLOW_DIRECTIONAL_INCREASE : activeGuide.howToIncrease;
  const decreaseSteps = isUnitOverview ? HIGH_DP_TEMP_DIRECTIONAL_DECREASE : activeGuide.howToDecrease;
  const warningText = isUnitOverview ? SUCTION_CAVITATION_WARNING : activeGuide.coupledTradeoffs;

  return (
    <div className="prescriptive-directives-card">
      {/* Header Bar */}
      <div className="prescriptive-header">
        <div className="prescriptive-title-group">
          <Wrench size={15} className="text-cyan-400" />
          <span className="prescriptive-title">
            {title || (isUnitOverview
              ? 'Prescriptive Diagnostics & Directional Tuning Directives'
              : `${activeGuide.parameter} Prescriptive Remediation & Directional Tuning`)}
          </span>
          <span className="prescriptive-sop-pill">SOP-CDU-CHX2000</span>
        </div>
        {activeGuide.deficitStr && (
          <span className="prescriptive-deficit-tag">
            Deficit: {activeGuide.deficitStr}
          </span>
        )}
      </div>

      <div className="prescriptive-body">
        {/* 3-Tier Root Cause Hierarchy Grid */}
        <div className="prescriptive-section-title">
          <ShieldAlert size={13} className="text-amber-400" />
          <span>Shopfloor Root-Cause Attribution Hierarchy (Priority Ranked)</span>
        </div>

        <div className="prescriptive-root-causes-grid">
          {causes.map((c) => {
            const badgeClass =
              c.priority === 1
                ? 'priority-badge p1'
                : c.priority === 2
                ? 'priority-badge p2'
                : 'priority-badge p3';

            return (
              <div key={c.priority} className="prescriptive-tier-item">
                <div className="tier-header">
                  <span className={badgeClass}>PRIORITY {c.priority}</span>
                  <span className="tier-title">{c.title}</span>
                  {c.sopReference && (
                    <span className="tier-sop-ref">{c.sopReference}</span>
                  )}
                </div>
                <div className="tier-desc">{c.description}</div>
              </div>
            );
          })}
        </div>

        {/* Directional Rework Instructions (Split Columns) */}
        <div className="prescriptive-directional-container">
          <div className="directional-col increase-col">
            <div className="directional-col-header">
              <span className="directional-arrow">↑</span>
              <span className="directional-col-title">
                {isUnitOverview ? 'To Increase Flow (FT01 / FT61)' : `To Increase ${activeGuide.parameter}`}
              </span>
            </div>
            <ul className="directional-steps-list">
              {increaseSteps.map((step, idx) => (
                <li key={idx}>
                  <strong>Action {idx + 1}:</strong> {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="directional-col decrease-col">
            <div className="directional-col-header">
              <span className="directional-arrow">↓</span>
              <span className="directional-col-title">
                {isUnitOverview ? 'To Decrease Value (Temp / High DP)' : `To Decrease ${activeGuide.parameter}`}
              </span>
            </div>
            <ul className="directional-steps-list">
              {decreaseSteps.map((step, idx) => (
                <li key={idx}>
                  <strong>Action {idx + 1}:</strong> {step}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coupled Interlock & Cavitation Warning Box */}
        <div className="coupled-interlock-warning-box">
          <div className="warning-icon-wrapper">
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="warning-content">
            <div className="warning-title">Closed-Loop System Coupling Interlock Warning</div>
            <div className="warning-text">{warningText}</div>
            <div className="warning-meta-note">
              <Info size={11} />
              <span>
                Valves remain strictly fixed during test. Dynamic variables are strictly Motor Speeds (P31 & P41) and DP setpoints.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

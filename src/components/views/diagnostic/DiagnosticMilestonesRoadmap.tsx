import React, { useState } from 'react';
import {
  CheckCircle2,
  Sliders,
  Activity,
  Wrench,
  Download,
  Info,
  Check
} from '../../Icons';

interface MilestoneItem {
  id: string;
  quarter: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  deliverables: string[];
}

export const DiagnosticMilestonesRoadmap: React.FC = () => {
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('false_alarm');

  const milestones: MilestoneItem[] = [
    {
      id: 'm1',
      quarter: 'Phase 1 • Ground-Truth Foundation',
      title: 'Telemetry Protocol & Reference Characterization',
      description: 'Establish verified Modbus decoding pipelines and empirical reference datasets.',
      status: 'completed',
      deliverables: [
        'Characterized factory test runs across 10-stage operating profiles (100–300 LPM).',
        'Codified Modbus 16-bit signed two’s complement vacuum decoding on PT11.',
        'Implemented 0–10V analog pump scaling normalization (57%–99% operational duty).'
      ]
    },
    {
      id: 'm2',
      quarter: 'Phase 2 • Q4 2026',
      title: 'Empirical Baseline Modeling & Dynamic Threshold Tuning',
      description: 'Train statistical envelopes on CoolIT CHx2000 and CHx1000 golden unit test runs.',
      status: 'in-progress',
      deliverables: [
        'Formulate hydraulic head-loss curves dynamic across 100–300 LPM setpoints.',
        'Implement transient thermal inertia compensation (0–30s post-step masking).',
        'Incorporate ambient test bay HVAC compensation equations.'
      ]
    },
    {
      id: 'm3',
      quarter: 'Phase 3 • Q1 2027',
      title: 'Multi-Variable Causal Inference & Cross-Sensor Graph',
      description: 'Engine that correlates thermal and hydraulic anomalies to isolate true root causes.',
      status: 'scheduled',
      deliverables: [
        'Automated discrimination between transducer drift and physical mechanical failure.',
        'Differential thermal scoring for redundant pairs (TT61/TT62, TT51/TT52).',
        'Holding register correlation with live Modbus telemetry stream on port 502.'
      ]
    },
    {
      id: 'm4',
      quarter: 'Phase 4 • Q2 2027',
      title: 'Shopfloor Integration & Automated Traveler QA Sign-Off',
      description: 'Deploy interactive technician remediation wizard to production factory terminals.',
      status: 'scheduled',
      deliverables: [
        'Step-by-step physical verification guides tied to CoolIT Standard Operating Procedures.',
        'Single-click digital traveler sign-off saved into permanent factory Excel reports.',
        'Real-time anomaly feedback loop directly from factory test technicians.'
      ]
    }
  ];

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNote.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackNote('');
    }, 4000);
  };

  return (
    <div className="cad-roadmap-milestones-section">
      <div className="cad-roadmap-section-header">
        <div className="section-title-group">
          <Wrench size={16} className="text-purple-400" />
          <h2 className="section-title">Engineering Delivery Milestones & Technician Feedback</h2>
        </div>
        <span className="section-subtitle">
          Implementation timeline and interactive channel for factory floor diagnostic calibration
        </span>
      </div>

      {/* Visual Timeline Track */}
      <div className="cad-milestones-timeline-grid">
        {milestones.map((ms, index) => {
          return (
            <div key={ms.id} className={`milestone-timeline-card ${ms.status}`}>
              <div className="milestone-card-header">
                <div className="milestone-status-dot">
                  {ms.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                  {ms.status === 'in-progress' && <Sliders size={14} className="text-cyan-400" />}
                  {ms.status === 'scheduled' && <Activity size={14} className="text-muted" />}
                </div>
                <span className="milestone-quarter-tag">{ms.quarter}</span>
                <span className={`milestone-badge-pill ${ms.status}`}>
                  {ms.status === 'completed' ? 'COMPLETED' : ms.status === 'in-progress' ? 'IN PROGRESS' : 'SCHEDULED'}
                </span>
              </div>

              <h4 className="milestone-card-title">{ms.title}</h4>
              <p className="milestone-card-desc">{ms.description}</p>

              <div className="milestone-deliverables-box">
                <span className="deliverables-heading">Deliverables:</span>
                <ul className="deliverables-list">
                  {ms.deliverables.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Anomaly Reporting / Rule Proposal Box */}
      <div className="cad-roadmap-feedback-box">
        <div className="feedback-box-header">
          <div className="feedback-title-group">
            <Info size={15} className="text-cyan-400" />
            <h4 className="feedback-box-title">Technician Feedback & Diagnostic Rule Proposal</h4>
          </div>
          <span className="feedback-box-hint">
            Directly inform algorithm calibration for future diagnostic releases
          </span>
        </div>

        {feedbackSubmitted ? (
          <div className="feedback-success-banner">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span>Thank you! Your feedback has been logged for the upcoming diagnostic engine calibration review.</span>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
            <div className="feedback-row">
              <div className="feedback-input-group">
                <label className="feedback-label">Category:</label>
                <select
                  className="feedback-select"
                  value={feedbackCategory}
                  onChange={e => setFeedbackCategory(e.target.value)}
                >
                  <option value="false_alarm">False Positive Anomaly Report</option>
                  <option value="suggest_rule">Suggest New Diagnostic Verification Rule</option>
                  <option value="threshold_adjustment">Proposed Setpoint / Tolerance Margin Adjustment</option>
                  <option value="modbus_register">Modbus Register Decoding Observation</option>
                </select>
              </div>

              <div className="feedback-input-group flex-1">
                <label className="feedback-label">Observation Details & Suggestions:</label>
                <input
                  type="text"
                  className="feedback-input"
                  placeholder="e.g., PT31 pressure transducer reading is nominal during Stage 4, but trips 3σ limits due to rapid pump step..."
                  value={feedbackNote}
                  onChange={e => setFeedbackNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="feedback-submit-btn"
                disabled={!feedbackNote.trim()}
              >
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

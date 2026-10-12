import React, { useState } from 'react';
import { ScopeTier, SubsystemCategory } from '../../../types';
import {
  Sliders,
  Activity,
  Cpu,
  Wrench,
  CheckCircle2,
  ChevronRight,
  ShieldAlert
} from '../../Icons';

interface DiagnosticPillarsGridProps {
  scope: ScopeTier;
  selectedSensor?: string | null;
  selectedSubsystem?: SubsystemCategory | null;
}

interface PillarData {
  id: string;
  number: string;
  title: string;
  icon: React.ReactNode;
  tagline: string;
  status: 'In Development' | 'Architecture Finalized' | 'Prototype Ready';
  badgeColor: string;
  keyFeatures: string[];
  deliverable: string;
}

export const DiagnosticPillarsGrid: React.FC<DiagnosticPillarsGridProps> = ({
  scope,
  selectedSensor,
  selectedSubsystem
}) => {
  const [activePillar, setActivePillar] = useState<string>('pillar1');

  const pillars: PillarData[] = [
    {
      id: 'pillar1',
      number: '01',
      title: 'Model-Specific Baseline Calibration',
      icon: <Sliders size={20} className="text-cyan-400" />,
      tagline: 'Dynamic tolerance bounds tailored to specific CDU model profiles',
      status: 'In Development',
      badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-950/40',
      keyFeatures: [
        'Model-aware envelopes distinguishing CHx2000 (liquid-to-liquid) from CHx1000 and AHx180 (air-to-liquid).',
        'Head-loss curve modeling based on active stage flow setpoint (100–300 LPM) rather than static tolerances.',
        'Ambient test-bay temperature & relative humidity compensation for primary heat-exchange loops.',
        'Graduated confidence bands (Pass / Nominal / Marginal Warning) replacing binary pass/fail triggers.'
      ],
      deliverable: 'Physics-informed empirical envelope library calibrated across golden unit test runs.'
    },
    {
      id: 'pillar2',
      number: '02',
      title: 'Multi-Variable Anomaly Correlation',
      icon: <Activity size={20} className="text-emerald-400" />,
      tagline: 'Coupled thermal-hydraulic balance & transient settling filters',
      status: 'Architecture Finalized',
      badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/40',
      keyFeatures: [
        'Conservation of energy verification: Q = ṁ · Cp · ΔT cross-checks across Primary and Secondary loops.',
        'Transient settling masking: 0–30s settling windows post-setpoint step changes to ignore normal thermal lag.',
        'Causal anomaly graph: Distinguishes physical flow restrictions from sensor calibration drift.',
        'Differential thermal parity: Dynamically weights redundant pairs (TT61 vs TT62, TT51 vs TT52).'
      ],
      deliverable: 'Cross-channel causal graph engine eliminating false alarms during thermal ramp stages.'
    },
    {
      id: 'pillar3',
      number: '03',
      title: 'Modbus Register Deep Diagnostics',
      icon: <Cpu size={20} className="text-amber-400" />,
      tagline: 'Hardware holding register inspection & protocol sentinel isolation',
      status: 'Prototype Ready',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-950/40',
      keyFeatures: [
        'Direct mapping of Holding Registers (Reg 200 Temp SP, Reg 201 DP SP, Reg 202 Flow SP) on port 502.',
        'Unsigned 16-bit two’s complement decoding: Accurately isolates negative vacuum (-0.1 psi) on PT11.',
        'Hardware sentinel detection: Disconnected sensor flags (6553.5) separated from physical excursions.',
        'VFD pump register monitoring: Real-time validation of drive frequency registers and 0–10V card scaling.'
      ],
      deliverable: 'Direct Modbus register decoder preventing telemetry communication artifacts from failing units.'
    },
    {
      id: 'pillar4',
      number: '04',
      title: 'Technician-Guided Root-Cause Workflows',
      icon: <Wrench size={20} className="text-purple-400" />,
      tagline: 'Interactive shopfloor decision trees replacing black-box verdicts',
      status: 'In Development',
      badgeColor: 'border-purple-500/30 text-purple-300 bg-purple-950/40',
      keyFeatures: [
        'Guided inspection trees: Provides test technicians with clear step-by-step physical verification steps.',
        'Specific shopfloor directives: Check FCV61 valve seating, verify loop air-purge, inspect VFD terminals.',
        'Digital QA Traveler integration: Direct sign-off logging stored into final Excel inspection traveler.',
        'Technician feedback capture: Factory technicians can flag erroneous detections directly from the UI.'
      ],
      deliverable: 'Interactive troubleshooting wizard linked directly to CoolIT standard operating procedures.'
    }
  ];

  const currentPillar = pillars.find(p => p.id === activePillar) || pillars[0];

  return (
    <div className="cad-roadmap-pillars-section">
      <div className="cad-roadmap-section-header">
        <div className="section-title-group">
          <ShieldAlert size={16} className="text-cyan-400" />
          <h2 className="section-title">Core Architectural Pillars of Diagnostics</h2>
        </div>
        <span className="section-subtitle">
          4 foundational capabilities delivering intelligent physics-informed diagnostic modeling
        </span>
      </div>

      {/* Pillar Cards Grid */}
      <div className="cad-roadmap-pillars-grid">
        {pillars.map(pillar => {
          const isSelected = activePillar === pillar.id;
          return (
            <div
              key={pillar.id}
              className={`cad-roadmap-pillar-card ${isSelected ? 'active' : ''}`}
              onClick={() => setActivePillar(pillar.id)}
            >
              <div className="pillar-card-top">
                <div className="pillar-num-badge">{pillar.number}</div>
                <div className={`pillar-status-chip ${pillar.badgeColor}`}>
                  {pillar.status}
                </div>
              </div>

              <div className="pillar-icon-row">
                <div className="pillar-icon-circle">{pillar.icon}</div>
                <h3 className="pillar-card-title">{pillar.title}</h3>
              </div>

              <p className="pillar-card-tagline">{pillar.tagline}</p>

              <div className="pillar-click-hint">
                <span>{isSelected ? 'Viewing Architecture' : 'Click to inspect pillar details'}</span>
                <ChevronRight size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Pillar Deep-Dive Drawer */}
      <div className="cad-roadmap-pillar-detail-box">
        <div className="pillar-detail-header">
          <div className="detail-title-group">
            <span className="detail-num-pill">PILLAR {currentPillar.number}</span>
            <h3 className="detail-heading">{currentPillar.title}</h3>
          </div>
          <span className="detail-target-deliverable">
            <strong>Target Deliverable:</strong> {currentPillar.deliverable}
          </span>
        </div>

        <div className="pillar-features-grid">
          {currentPillar.keyFeatures.map((feat, idx) => (
            <div key={idx} className="pillar-feature-item">
              <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

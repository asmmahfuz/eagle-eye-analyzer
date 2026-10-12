import React, { useState } from 'react';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  Droplets,
  Thermometer,
  Activity,
  Gauge,
  Check,
  ChevronRight,
  Info
} from '../../Icons';

interface DiagnosticModulesPreviewProps {
  selectedSubsystem?: SubsystemCategory | null;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
}

interface ModuleSpec {
  id: SubsystemCategory;
  name: string;
  icon: React.ReactNode;
  targetAccuracy: string;
  primaryChannels: string[];
  physicsPrinciple: string;
  plannedChecks: { name: string; desc: string; priority: 'Critical' | 'High' | 'Standard' }[];
  status: 'Design Phase' | 'Calibration Testing' | 'Prototype';
}

export const DiagnosticModulesPreview: React.FC<DiagnosticModulesPreviewProps> = ({
  selectedSubsystem,
  onSelectSubsystem
}) => {
  const [activeModuleId, setActiveModuleId] = useState<SubsystemCategory>(
    selectedSubsystem || 'hydraulic'
  );

  const modules: ModuleSpec[] = [
    {
      id: 'hydraulic',
      name: 'Hydraulic Loop Dynamics & Valve Seating Engine',
      icon: <Droplets size={18} className="text-cyan-400" />,
      targetAccuracy: '99.4% True Positive Rate',
      primaryChannels: ['FT01', 'FT61', 'Primary DP (Supply - Return)', 'Secondary DP (Supply - Return)', 'FCV61 Actual Flow%'],
      physicsPrinciple: 'Conservation of Mass & Bernoulli Differential Pressure Balance',
      status: 'Calibration Testing',
      plannedChecks: [
        {
          name: 'Primary/Secondary Steady-State Flow Balance',
          desc: 'Cross-checks secondary loop flow rate against primary coolant delivery during heat exchanger dwell states.',
          priority: 'Critical'
        },
        {
          name: 'FCV61 Modulating Valve Travel & Full Closure',
          desc: 'Verifies analog 0–10V feedback matches command with zero leakage when valve is commanded to 0% bypass.',
          priority: 'High'
        },
        {
          name: 'Differential Pressure Strainer Clog Monitor',
          desc: 'Tracks Primary Filter 53 DP and Pump Filter DPs against flow velocity to detect particulate buildup.',
          priority: 'Standard'
        }
      ]
    },
    {
      id: 'temperature',
      name: 'Thermal Performance & PHE Heat Transfer Engine',
      icon: <Thermometer size={18} className="text-rose-400" />,
      targetAccuracy: '99.8% True Positive Rate',
      primaryChannels: ['TT01', 'TT02', 'TT31', 'TT41', 'TT51', 'TT52', 'TT61', 'TT62'],
      physicsPrinciple: 'LMTD (Log Mean Temperature Difference) & Redundant Sensor Parity',
      status: 'Design Phase',
      plannedChecks: [
        {
          name: 'Plate Heat Exchanger Approach Temperature',
          desc: 'Calculates |TT01 - TT31| to determine whether heat transfer efficiency conforms to 2000 kW design spec.',
          priority: 'Critical'
        },
        {
          name: 'Quad-Sensor Thermal Parity Verification',
          desc: 'Cross-compares redundant sensor pairs (TT61 vs TT62, TT51 vs TT52) to isolate single-sensor RTD drift.',
          priority: 'High'
        },
        {
          name: 'Thermal Dwell Ramp Settling Mask',
          desc: 'Suppresses false limit trips during the initial 30 seconds following each temperature setpoint change.',
          priority: 'High'
        }
      ]
    },
    {
      id: 'pump',
      name: 'Pump VFD Drive & Impeller Integrity Engine',
      icon: <Activity size={18} className="text-emerald-400" />,
      targetAccuracy: '99.9% True Positive Rate',
      primaryChannels: ['P31 Speed %', 'P41 Speed %', 'Pump 31 Filter DP', 'Pump 41 Filter DP'],
      physicsPrinciple: 'Affinity Laws (Flow ∝ RPM, Head ∝ RPM²) & Dual-Pump Load Sharing',
      status: 'Prototype',
      plannedChecks: [
        {
          name: 'Dual Redundant VFD Load Balancing',
          desc: 'Verifies that circulating pumps P31 and P41 share duty equally without impeller hunting or cavitation.',
          priority: 'Critical'
        },
        {
          name: '0–10V Analog Scaling Normalizer',
          desc: 'Applies hardware 10× multiplier to prevent 5.7–9.9V analog control registers from triggering low speed alarms.',
          priority: 'Critical'
        },
        {
          name: 'Minimum Speed & Deadband Safeguard',
          desc: 'Enforces the physical 25% minimum VFD floor to safeguard ceramic bearings and mechanical seals.',
          priority: 'High'
        }
      ]
    },
    {
      id: 'pressure',
      name: 'Instrumentation, Transducer Drift & Sentinel Engine',
      icon: <Gauge size={18} className="text-amber-400" />,
      targetAccuracy: '100% Sentinel Classification',
      primaryChannels: ['PT01', 'PT02', 'PT31', 'PT41', 'PT51', 'PT52', 'PT61', 'PT62', 'PT11'],
      physicsPrinciple: 'Hydrostatic Calibration & Modbus Word Register Protocol Verification',
      status: 'Calibration Testing',
      plannedChecks: [
        {
          name: 'Atmospheric Zero-Shift Drift Detection',
          desc: 'Evaluates pressure transducers under zero-flow conditions to flag sensor calibration offsets before testing.',
          priority: 'High'
        },
        {
          name: 'Modbus 16-Bit Two’s Complement Vacuum Recovery',
          desc: 'Decodes unsigned values >6500 into true physical negative vacuum (-0.1 psi) on reservoir channel PT11.',
          priority: 'Critical'
        },
        {
          name: 'Open-Circuit / Disconnected Transducer Sentinel Isolation',
          desc: 'Identifies un-terminated Modbus lines (reading 6553.5) and prevents them from skewing whole-unit pass rates.',
          priority: 'Critical'
        }
      ]
    }
  ];

  const currentMod = modules.find(m => m.id === activeModuleId) || modules[0];

  const handleSelectModule = (id: SubsystemCategory) => {
    setActiveModuleId(id);
    onSelectSubsystem?.(id);
  };

  return (
    <div className="cad-roadmap-modules-section">
      <div className="cad-roadmap-section-header">
        <div className="section-title-group">
          <Activity size={16} className="text-emerald-400" />
          <h2 className="section-title">Subsystem Diagnostic Engines Under Construction</h2>
        </div>
        <span className="section-subtitle">
          Interactive specification for the 4 dedicated domain diagnostic modules
        </span>
      </div>

      {/* Module Selector Tabs */}
      <div className="cad-roadmap-module-tabs">
        {modules.map(mod => {
          const isActive = activeModuleId === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              className={`cad-roadmap-mod-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectModule(mod.id)}
            >
              <div className="mod-tab-icon">{mod.icon}</div>
              <span className="mod-tab-name">{SUBSYSTEM_LABELS[mod.id] || mod.name}</span>
              <span className="mod-tab-status">{mod.status}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Spec Card */}
      <div className="cad-roadmap-mod-detail-card">
        <div className="mod-detail-header-row">
          <div className="mod-detail-title-col">
            <div className="mod-title-flex">
              {currentMod.icon}
              <h3 className="mod-detail-name">{currentMod.name}</h3>
            </div>
            <p className="mod-detail-physics">
              <strong>Governing Principle:</strong> {currentMod.physicsPrinciple}
            </p>
          </div>

          <div className="mod-detail-kpi-col">
            <div className="mod-kpi-chip">
              <span className="kpi-label">Target Metric:</span>
              <span className="kpi-val text-emerald-400">{currentMod.targetAccuracy}</span>
            </div>
            <div className="mod-kpi-chip">
              <span className="kpi-label">Current Phase:</span>
              <span className="kpi-val text-cyan-400">{currentMod.status}</span>
            </div>
          </div>
        </div>

        {/* Channels Monitored */}
        <div className="mod-channels-bar">
          <span className="channels-label">Monitored Telemetry Channels:</span>
          <div className="channels-pills-list">
            {currentMod.primaryChannels.map((ch, i) => (
              <span key={i} className="channel-spec-pill">{ch}</span>
            ))}
          </div>
        </div>

        {/* Planned Automated Verification Checks */}
        <div className="mod-planned-checks-list">
          <div className="checks-list-heading">
            <span>Planned Verification Algorithms & Decision Logic:</span>
          </div>

          <div className="checks-grid">
            {currentMod.plannedChecks.map((chk, i) => (
              <div key={i} className="check-card-item">
                <div className="check-header">
                  <span className={`check-priority-pill ${chk.priority.toLowerCase()}`}>
                    {chk.priority}
                  </span>
                  <strong className="check-title">{chk.name}</strong>
                </div>
                <p className="check-desc">{chk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

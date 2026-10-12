import React, { useState, useEffect, useMemo } from 'react';
import { 
  EagleEyeDataset, 
  SubsystemCategory, 
  SUBSYSTEM_LABELS 
} from '../../../types';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Thermometer, 
  ArrowLeft
} from '../../Icons';
import { TimebasePreset } from './UnitTelemetryToolbar';
import { GroupTelemetryToolbar, GroupChannelItem } from './GroupTelemetryToolbar';
import { GroupTelemetryChart } from './GroupTelemetryChart';

export interface GroupTelemetryProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

// Curated high-contrast industrial telemetry color palette
const TELEMETRY_PALETTE = [
  '#00d2ff', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose/Red
  '#8b5cf6', // Violet
  '#06b6d4', // Ocean Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#eab308', // Yellow
  '#3b82f6', // Blue
  '#d946ef', // Fuchsia
  '#2dd4bf', // Mint
  '#64748b'  // Slate
];

export const GroupTelemetry: React.FC<GroupTelemetryProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
}) => {
  const [currentTheme, setCurrentTheme] = useState(() => 
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const { parameterStats, categoryCounts, unitMap } = dataset;

  const subName = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;
  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';

  // Subsystem channels
  const subChannels = useMemo<GroupChannelItem[]>(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, selectedSubsystem]);

  // Channel color assignment map
  const channelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    subChannels.forEach((ch, idx) => {
      map[ch.name] = TELEMETRY_PALETTE[idx % TELEMETRY_PALETTE.length];
    });
    return map;
  }, [subChannels]);

  // Channel visibility states
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      init[ch.name] = true;
    });
    return init;
  });

  useEffect(() => {
    const init: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      init[ch.name] = true;
    });
    setVisibleChannels(init);
  }, [selectedSubsystem, subChannels]);

  const [showFlowSp, setShowFlowSp] = useState(false);
  const [showDpSp, setShowDpSp] = useState(false);
  const [showStageDwells, setShowStageDwells] = useState(true);
  const [timebase, setTimebase] = useState<TimebasePreset>('all');

  const toggleChannel = (name: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const setAllChannels = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      next[ch.name] = visible;
    });
    setVisibleChannels(next);
  };

  // Subsystem failure stats
  const subFailCount = categoryCounts[selectedSubsystem]?.fail ?? 0;
  const isSubsystemPass = subFailCount === 0;

  // Subsystem category icon
  const renderCategoryIcon = (cat: SubsystemCategory) => {
    switch (cat) {
      case 'hydraulic': return <Droplets size={14} className="text-cyan-400" />;
      case 'pump': return <Activity size={14} className="text-blue-400" />;
      case 'temperature': return <Thermometer size={14} className="text-amber-400" />;
      case 'pressure': return <Gauge size={14} className="text-sky-400" />;
      case 'environmental': return <Wind size={14} className="text-indigo-400" />;
      case 'system': return <Cpu size={14} className="text-purple-400" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };

  // Primary engineering unit for this subsystem
  const dominantUnit = useMemo(() => {
    const units = subChannels.map(c => c.stat.unit).filter(Boolean);
    if (units.length === 0) return '';
    const counts: Record<string, number> = {};
    units.forEach(u => { counts[u] = (counts[u] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [subChannels]);

  return (
    <section className="cad-tab-focused-card row-telemetry-subsystem" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 1. Subsystem Scope Header Bar */}
      <div className="row-header-bar">
        <div className="row-title-group">
          {onResetSubsystem && (
            <>
              <button 
                className="back-overview-btn" 
                onClick={onResetSubsystem}
                title="Return to Whole-Unit Telemetry Overview"
              >
                <ArrowLeft size={13} />
                <span>Unit Overview</span>
              </button>
              <div className="divider-vertical"></div>
            </>
          )}

          <div className="sensor-title-box">
            <span className="category-tag-badge">
              {renderCategoryIcon(selectedSubsystem)}
              <span>{selectedSubsystem.toUpperCase()}</span>
            </span>
            <h2 className="sensor-main-title">{subName} Subsystem Oscilloscope</h2>
            {dominantUnit && <span className="unit-pill">{dominantUnit}</span>}
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Rule">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isSubsystemPass ? 'pass' : 'fail'}`}>
            {isSubsystemPass ? (
              <>
                <CheckCircle2 size={13} />
                <span>SUBSYSTEM PASS (100% in tolerance)</span>
              </>
            ) : (
              <>
                <AlertTriangle size={13} />
                <span>{subFailCount} VIOLATIONS DETECTED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Full-Height Subsystem Multi-Channel Overlay Waveform Card */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <GroupTelemetryToolbar
          subChannels={subChannels}
          subName={subName}
          visibleChannels={visibleChannels}
          channelColorMap={channelColorMap}
          onToggleChannel={toggleChannel}
          onSetAllChannels={setAllChannels}
          onSelectSensor={onSelectSensor}
          timebase={timebase}
          onChangeTimebase={setTimebase}
          showFlowSp={showFlowSp}
          onToggleFlowSp={setShowFlowSp}
          showDpSp={showDpSp}
          onToggleDpSp={setShowDpSp}
          showStageDwells={showStageDwells}
          onToggleStageDwells={setShowStageDwells}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
        />

        <GroupTelemetryChart
          dataset={dataset}
          subChannels={subChannels}
          visibleChannels={visibleChannels}
          channelColorMap={channelColorMap}
          showFlowSp={showFlowSp}
          showDpSp={showDpSp}
          showStageDwells={showStageDwells}
          timebase={timebase}
          currentTheme={currentTheme}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          dominantUnit={dominantUnit}
          subName={subName}
        />
      </div>
    </section>
  );
};

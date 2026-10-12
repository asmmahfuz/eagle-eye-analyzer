import React from 'react';
import { ParameterSummary } from '../../../types';
import { ChevronRight } from '../../Icons';
import { TimebasePreset } from './UnitTelemetryToolbar';

export interface GroupChannelItem {
  name: string;
  stat: ParameterSummary;
}

export interface GroupTelemetryToolbarProps {
  subChannels: GroupChannelItem[];
  subName: string;
  visibleChannels: Record<string, boolean>;
  channelColorMap: Record<string, string>;
  onToggleChannel: (name: string) => void;
  onSetAllChannels: (visible: boolean) => void;
  onSelectSensor: (name: string) => void;
  timebase: TimebasePreset;
  onChangeTimebase: (timebase: TimebasePreset) => void;
  showFlowSp: boolean;
  onToggleFlowSp: (show: boolean) => void;
  showDpSp: boolean;
  onToggleDpSp: (show: boolean) => void;
  showStageDwells: boolean;
  onToggleStageDwells: (show: boolean) => void;
  flowSpUnit: string;
  dpSpUnit: string;
}

const TIMEBASE_PRESETS: { id: TimebasePreset; label: string; title: string }[] = [
  { id: 'all', label: 'All (0–525s)', title: 'View full 0s to 525s cooldown run' },
  { id: 'warmup', label: 'Warmup (S1–S3)', title: 'Zoom into Warmup (Stages 1–3)' },
  { id: 'ramp', label: 'Load Ramp (S4–S6)', title: 'Zoom into Load Ramp (Stages 4–6)' },
  { id: 'cooldown', label: 'Steady-State (S7–S10)', title: 'Zoom into Steady-State (Stages 7–10)' }
];

export const GroupTelemetryToolbar: React.FC<GroupTelemetryToolbarProps> = ({
  subChannels,
  subName,
  visibleChannels,
  channelColorMap,
  onToggleChannel,
  onSetAllChannels,
  onSelectSensor,
  timebase,
  onChangeTimebase,
  showFlowSp,
  onToggleFlowSp,
  showDpSp,
  onToggleDpSp,
  showStageDwells,
  onToggleStageDwells,
  flowSpUnit,
  dpSpUnit
}) => {
  const activeCurvesCount = subChannels.filter(c => visibleChannels[c.name]).length;

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
            Multi-Channel Transient Laboratory Oscilloscope
          </h3>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Simultaneous overlay of all {subChannels.length} channels in the {subName} subsystem across 525s cooldown run
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Timebase Presets */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
            {TIMEBASE_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeTimebase(preset.id)}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  borderLeft: idx > 0 ? '1px solid var(--border-color)' : 'none',
                  cursor: 'pointer',
                  background: timebase === preset.id ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === preset.id ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === preset.id ? 700 : 500
                }}
                title={preset.title}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="divider-vertical" style={{ height: '16px' }}></div>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Active: <strong>{activeCurvesCount}</strong>/{subChannels.length}
          </span>

          <button
            onClick={() => onSetAllChannels(true)}
            className="cad-sheet-table-action-btn"
            title="Show all channels on chart"
          >
            Show All
          </button>
          <button
            onClick={() => onSetAllChannels(false)}
            className="cad-sheet-table-action-btn"
            title="Hide all channels from chart"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Setpoint Reference Overlay & Stage Dwell Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Reference Overlays:</span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={showFlowSp} 
            onChange={(e) => onToggleFlowSp(e.target.checked)} 
            style={{ cursor: 'pointer', accentColor: '#f59e0b' }}
          />
          <span className="legend-indicator dotted-amber"></span>
          <span style={{ color: showFlowSp ? 'var(--text-main)' : 'var(--text-muted)' }}>
            Secondary Flow SP ({flowSpUnit})
          </span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={showDpSp} 
            onChange={(e) => onToggleDpSp(e.target.checked)} 
            style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
          />
          <span className="legend-indicator dotted-amber" style={{ borderTopColor: '#38bdf8' }}></span>
          <span style={{ color: showDpSp ? 'var(--text-main)' : 'var(--text-muted)' }}>
            Secondary DP SP ({dpSpUnit})
          </span>
        </label>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={showStageDwells} 
            onChange={(e) => onToggleStageDwells(e.target.checked)} 
            style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)' }}>┊ S1..S10</span>
          <span style={{ color: showStageDwells ? 'var(--text-main)' : 'var(--text-muted)' }}>
            Stage Dwells
          </span>
        </label>
      </div>

      {/* Channel Visibility Chips Strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', maxHeight: '110px', overflowY: 'auto' }}>
        {subChannels.map(({ name, stat }) => {
          const isVisible = !!visibleChannels[name];
          const color = channelColorMap[name] || '#00d2ff';
          const settlingStr = stat.settling !== null && stat.settling !== undefined
            ? (typeof stat.settling === 'number' ? stat.settling.toFixed(1) : stat.settling)
            : null;

          return (
            <div 
              key={`toggle-${name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '14px',
                border: `1px solid ${isVisible ? color : 'var(--border-color)'}`,
                background: isVisible ? `${color}15` : 'var(--bg-subtle)',
                fontSize: '10.5px',
                userSelect: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <input 
                type="checkbox" 
                checked={isVisible} 
                onChange={() => onToggleChannel(name)} 
                style={{ cursor: 'pointer', accentColor: color }}
                title="Toggle waveform visibility"
              />
              <span 
                style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: color,
                  boxShadow: isVisible ? `0 0 5px ${color}` : 'none'
                }} 
              />
              <span 
                onClick={() => onSelectSensor(name)}
                style={{ 
                  fontWeight: 600, 
                  fontFamily: 'var(--font-mono)', 
                  color: isVisible ? 'var(--text-main)' : 'var(--text-dim)',
                  cursor: 'pointer'
                }}
                title={`Open single-channel oscilloscope for ${name}`}
              >
                {name}
              </span>
              {settlingStr !== null && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: isVisible ? color : 'var(--text-dim)' }}>
                  ({settlingStr})
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelectSensor(name)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--text-dim)'
                }}
                title={`Drill down into ${name}`}
              >
                <ChevronRight size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

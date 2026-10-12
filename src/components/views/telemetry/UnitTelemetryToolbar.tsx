import React from 'react';
import { ParameterSummary } from '../../../types';

export type TimebasePreset = 'all' | 'warmup' | 'ramp' | 'cooldown';

export interface PrimaryCurveDef {
  key: string;
  name: string;
  unit: string;
  color: string;
  yAxisID: string;
  isSetpoint?: boolean;
}

export interface UnitTelemetryToolbarProps {
  availablePrimaryCurves: PrimaryCurveDef[];
  visibleCurves: Record<string, boolean>;
  parameterStats: Record<string, ParameterSummary>;
  onToggleCurve: (key: string) => void;
  onSetAllCurves: (visible: boolean) => void;
  timebase: TimebasePreset;
  onChangeTimebase: (timebase: TimebasePreset) => void;
  showStageDwells: boolean;
  onToggleStageDwells: (show: boolean) => void;
}

export const UnitTelemetryToolbar: React.FC<UnitTelemetryToolbarProps> = ({
  availablePrimaryCurves,
  visibleCurves,
  parameterStats,
  onToggleCurve,
  onSetAllCurves,
  timebase,
  onChangeTimebase,
  showStageDwells,
  onToggleStageDwells
}) => {
  const activeCurvesCount = availablePrimaryCurves.filter(c => visibleCurves[c.key]).length;

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
            Multi-Axis Laboratory Oscilloscope & Primary Feedback Overlay
          </h3>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Primary excitation setpoints plotted alongside real-time unit flow, differential pressure, pump speed, and thermal feedbacks
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Timebase Presets */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => onChangeTimebase('all')}
              style={{
                padding: '3px 8px',
                fontSize: '10.5px',
                border: 'none',
                cursor: 'pointer',
                background: timebase === 'all' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                color: timebase === 'all' ? '#ffffff' : 'var(--text-main)',
                fontWeight: timebase === 'all' ? 700 : 500
              }}
              title="View full 0s to 525s cooldown run"
            >
              All (0–525s)
            </button>
            <button
              type="button"
              onClick={() => onChangeTimebase('warmup')}
              style={{
                padding: '3px 8px',
                fontSize: '10.5px',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                cursor: 'pointer',
                background: timebase === 'warmup' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                color: timebase === 'warmup' ? '#ffffff' : 'var(--text-main)',
                fontWeight: timebase === 'warmup' ? 700 : 500
              }}
              title="Zoom into Warmup (Stages 1–3)"
            >
              Warmup (S1–S3)
            </button>
            <button
              type="button"
              onClick={() => onChangeTimebase('ramp')}
              style={{
                padding: '3px 8px',
                fontSize: '10.5px',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                cursor: 'pointer',
                background: timebase === 'ramp' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                color: timebase === 'ramp' ? '#ffffff' : 'var(--text-main)',
                fontWeight: timebase === 'ramp' ? 700 : 500
              }}
              title="Zoom into Load Ramp (Stages 4–6)"
            >
              Load Ramp (S4–S6)
            </button>
            <button
              type="button"
              onClick={() => onChangeTimebase('cooldown')}
              style={{
                padding: '3px 8px',
                fontSize: '10.5px',
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                cursor: 'pointer',
                background: timebase === 'cooldown' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                color: timebase === 'cooldown' ? '#ffffff' : 'var(--text-main)',
                fontWeight: timebase === 'cooldown' ? 700 : 500
              }}
              title="Zoom into Steady-State (Stages 7–10)"
            >
              Steady-State (S7–S10)
            </button>
          </div>

          <div className="divider-vertical" style={{ height: '16px' }}></div>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Curves: <strong>{activeCurvesCount}</strong>/{availablePrimaryCurves.length}
          </span>

          <button
            onClick={() => onSetAllCurves(true)}
            className="cad-sheet-table-action-btn"
            title="Enable all primary curves"
          >
            Select All
          </button>
          <button
            onClick={() => onSetAllCurves(false)}
            className="cad-sheet-table-action-btn"
            title="Deselect all curves"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Curve Toggle Chips & Stage Dwell Toggle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none', fontSize: '11px', marginRight: '6px' }}>
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

        {availablePrimaryCurves.map(c => {
          const isVisible = !!visibleCurves[c.key];
          const stat = parameterStats[c.key];
          const settlingVal = stat?.settling !== null && stat?.settling !== undefined 
            ? (typeof stat.settling === 'number' ? stat.settling.toFixed(1) : stat.settling)
            : null;

          return (
            <label 
              key={c.key} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '14px',
                border: `1px solid ${isVisible ? c.color : 'var(--border-color)'}`,
                background: isVisible ? `${c.color}15` : 'var(--bg-subtle)',
                cursor: 'pointer',
                fontSize: '10.5px',
                userSelect: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <input 
                type="checkbox" 
                checked={isVisible}
                onChange={() => onToggleCurve(c.key)}
                style={{ cursor: 'pointer', accentColor: c.color }}
              />
              <span 
                style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: c.color,
                  boxShadow: isVisible ? `0 0 5px ${c.color}` : 'none'
                }} 
              />
              <span style={{ fontWeight: 600, color: isVisible ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {c.name}
              </span>
              {settlingVal !== null && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: c.color, fontWeight: 'bold' }}>
                  {settlingVal} {c.unit}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
};

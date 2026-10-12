import React from 'react';
import { Activity, BarChart2 } from '../../Icons';
import { TimebasePreset } from './UnitTelemetryToolbar';

export interface TestTelemetryToolbarProps {
  timebase: TimebasePreset;
  onChangeTimebase: (timebase: TimebasePreset) => void;
  show3Sigma: boolean;
  onToggle3Sigma: (show: boolean) => void;
  showAbsLimits: boolean;
  onToggleAbsLimits: (show: boolean) => void;
  showSetpointOverlay: boolean;
  onToggleSetpointOverlay: (show: boolean) => void;
  showStageDwells: boolean;
  onToggleStageDwells: (show: boolean) => void;
  highlightExtremes: boolean;
  onToggleHighlightExtremes: (show: boolean) => void;
  trackedQty: string;
  onOpenMetricsModal?: () => void;
}

export const TestTelemetryToolbar: React.FC<TestTelemetryToolbarProps> = ({
  timebase,
  onChangeTimebase,
  show3Sigma,
  onToggle3Sigma,
  showAbsLimits,
  onToggleAbsLimits,
  showSetpointOverlay,
  onToggleSetpointOverlay,
  showStageDwells,
  onToggleStageDwells,
  highlightExtremes,
  onToggleHighlightExtremes,
  trackedQty,
  onOpenMetricsModal
}) => {
  return (
    <div className="plot-header-bar" style={{ padding: '0 0 10px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
      <div className="plot-title-group">
        <Activity size={15} className="text-cyan-400" />
        <span className="plot-title">Laboratory Multi-Channel Transient Oscilloscope</span>
        <span className="plot-subtitle">High-Speed 1 Hz Time Series (0s – 525s Cooldown Run)</span>
      </div>

      <div className="plot-controls-group" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
            title="Zoom into Warmup & Low-Flow Baseline (Stages 1–3)"
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
            title="Zoom into Load Ramp & Peak Excitation (Stages 4–6)"
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
            title="Zoom into Steady-State Cooldown (Stages 7–10)"
          >
            Steady-State (S7–S10)
          </button>
        </div>

        <div className="divider-vertical" style={{ height: '16px' }}></div>

        {/* Oscilloscope Channel & Envelope Toggles */}
        <label className="plot-toggle-btn">
          <input 
            type="checkbox" 
            checked={show3Sigma} 
            onChange={(e) => onToggle3Sigma(e.target.checked)} 
          />
          <span className="legend-indicator band-green"></span>
          <span>3σ Envelope</span>
        </label>

        <label className="plot-toggle-btn">
          <input 
            type="checkbox" 
            checked={showAbsLimits} 
            onChange={(e) => onToggleAbsLimits(e.target.checked)} 
          />
          <span className="legend-indicator dotted-red"></span>
          <span>Min / Max</span>
        </label>

        <label className="plot-toggle-btn" title="Toggle 10-stage ideal stepped programmed setpoint curve">
          <input 
            type="checkbox" 
            checked={showSetpointOverlay} 
            onChange={(e) => onToggleSetpointOverlay(e.target.checked)} 
          />
          <span className="legend-indicator dotted-amber"></span>
          <span>
            {trackedQty !== 'none' 
              ? `${trackedQty.toUpperCase()} SP` 
              : 'Flow SP'}
          </span>
        </label>

        <label className="plot-toggle-btn" title="Toggle vertical stage dwell transition boundary lines">
          <input 
            type="checkbox" 
            checked={showStageDwells} 
            onChange={(e) => onToggleStageDwells(e.target.checked)} 
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)' }}>┊ S1..S10</span>
          <span>Stage Dwells</span>
        </label>

        <label className="plot-toggle-btn">
          <input 
            type="checkbox" 
            checked={highlightExtremes} 
            onChange={(e) => onToggleHighlightExtremes(e.target.checked)} 
          />
          <span>Extremes</span>
        </label>

        {onOpenMetricsModal && (
          <>
            <div className="divider-vertical" style={{ height: '16px' }}></div>
            <button
              type="button"
              onClick={onOpenMetricsModal}
              className="cad-sheet-table-action-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                padding: '3px 9px',
                color: 'var(--accent-cyan)',
                borderColor: 'var(--accent-cyan)'
              }}
              title="Open full statistical process control and metrology ledger modal"
            >
              <BarChart2 size={12} />
              <span>⋯ Advanced SPC Details</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

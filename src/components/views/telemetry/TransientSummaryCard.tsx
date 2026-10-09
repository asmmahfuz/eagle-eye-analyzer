import React, { useMemo } from 'react';
import { EagleEyeDataset } from '../../../types';
import { calculateUnitTransientSummary, calculateChannelTransientProfile } from '../../../engine/excitation';
import { Activity, Droplets, Gauge, Thermometer, CheckCircle2, AlertTriangle } from '../../Icons';

export interface TransientSummaryCardProps {
  dataset: EagleEyeDataset;
}

export const TransientSummaryCard: React.FC<TransientSummaryCardProps> = ({ dataset }) => {
  const summary = useMemo(() => calculateUnitTransientSummary(dataset), [dataset]);
  const flowProfile = useMemo(() => calculateChannelTransientProfile('FT01', dataset), [dataset]);
  const dpProfile = useMemo(
    () => calculateChannelTransientProfile('Secondary DP (Supply - Return)', dataset),
    [dataset]
  );
  const tempProfile = useMemo(() => calculateChannelTransientProfile('TT31', dataset), [dataset]);

  const getPillStyle = (stab: string) => {
    switch (stab) {
      case 'STABLE':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)' };
      case 'SETTLING':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.35)' };
      default:
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' };
    }
  };

  return (
    <div style={{
      margin: '0 14px 12px 14px',
      padding: '10px 14px',
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #cbd5e1)',
      borderRadius: '6px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} className="text-cyan-400" />
          <strong style={{ fontSize: '12px', color: 'var(--text-main, #0f172a)' }}>
            Dynamic Transient Analytics & 10-Stage Setpoint Tracking Engine
          </strong>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>
            (Excitation_Profile.py Holding Registers 200–202)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Overall Loop Settling:</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono, monospace)',
            ...getPillStyle(summary.overallStability)
          }}>
            {summary.overallStability === 'STABLE' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
            <span>{summary.overallStability}</span>
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '10px'
      }}>
        {/* Flow Tracking */}
        <div style={{ padding: '8px 10px', background: 'var(--bg-panel, #f8fafc)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Droplets size={12} className="text-cyan-400" /> Secondary Flow (FT01)
            </span>
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, ...getPillStyle(summary.flowStability) }}>
              {summary.flowStability}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Avg |Tracking Error|:</span>
            <strong className="font-mono text-cyan-400" style={{ fontSize: '12px' }}>
              {summary.flowTrackingError !== null ? `±${summary.flowTrackingError} LPM` : '--'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px', fontSize: '10px', color: 'var(--text-dim)' }}>
            <span>Settling Score: {flowProfile.settlingScorePercent}%</span>
            <span>Max Err: {flowProfile.maxTrackingError !== null ? `±${flowProfile.maxTrackingError}` : '--'}</span>
          </div>
        </div>

        {/* DP Tracking */}
        <div style={{ padding: '8px 10px', background: 'var(--bg-panel, #f8fafc)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Gauge size={12} className="text-emerald-400" /> Secondary DP Loop
            </span>
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, ...getPillStyle(summary.dpStability) }}>
              {summary.dpStability}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Avg |Tracking Error|:</span>
            <strong className="font-mono text-emerald-400" style={{ fontSize: '12px' }}>
              {summary.dpTrackingError !== null ? `±${summary.dpTrackingError} psi` : '--'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px', fontSize: '10px', color: 'var(--text-dim)' }}>
            <span>Settling Score: {dpProfile.settlingScorePercent}%</span>
            <span>Max Err: {dpProfile.maxTrackingError !== null ? `±${dpProfile.maxTrackingError}` : '--'}</span>
          </div>
        </div>

        {/* Temperature Tracking */}
        <div style={{ padding: '8px 10px', background: 'var(--bg-panel, #f8fafc)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Thermometer size={12} className="text-amber-400" /> Supply Temp (TT31)
            </span>
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, ...getPillStyle(summary.tempStability) }}>
              {summary.tempStability}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Avg |Tracking Error|:</span>
            <strong className="font-mono text-amber-300" style={{ fontSize: '12px' }}>
              {summary.tempTrackingError !== null ? `±${summary.tempTrackingError} °C` : '--'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px', fontSize: '10px', color: 'var(--text-dim)' }}>
            <span>Settling Score: {tempProfile.settlingScorePercent}%</span>
            <span>Max Err: {tempProfile.maxTrackingError !== null ? `±${tempProfile.maxTrackingError}` : '--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { StageTransientMetrics, SettlingStability } from '../../../engine/excitation';
import { CheckCircle2, AlertTriangle, Activity } from '../../Icons';

export interface TransientBadgeProps {
  metrics?: StageTransientMetrics | null;
  compact?: boolean;
  showDelta?: boolean;
  showOvershoot?: boolean;
  className?: string;
}

export const TransientBadge: React.FC<TransientBadgeProps> = ({
  metrics,
  compact = false,
  showDelta = true,
  showOvershoot = false,
  className = ''
}) => {
  if (!metrics || metrics.settlingStability === 'N/A' || metrics.setpoint === null) {
    return null;
  }

  const { settlingStability, trackingError, trackingErrorPercent, overshootPercent, unit } = metrics;

  const getBadgeStyle = (stab: SettlingStability) => {
    switch (stab) {
      case 'STABLE':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.35)'
        };
      case 'SETTLING':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        };
      case 'DEVIATING':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.35)'
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.12)',
          color: '#94a3b8',
          border: '1px solid rgba(148, 163, 184, 0.25)'
        };
    }
  };

  const style = getBadgeStyle(settlingStability);
  const deltaStr = trackingError !== null 
    ? `${trackingError >= 0 ? '+' : ''}${trackingError.toFixed(1)}${unit ? ` ${unit}` : ''}`
    : null;

  const pctStr = trackingErrorPercent !== null
    ? `${trackingErrorPercent >= 0 ? '+' : ''}${trackingErrorPercent.toFixed(1)}%`
    : null;

  return (
    <span
      className={`transient-tracking-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '1px 5px' : '2px 7px',
        borderRadius: '3px',
        fontSize: compact ? '9.5px' : '10.5px',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
        whiteSpace: 'nowrap'
      }}
      title={`Setpoint: ${metrics.setpoint} ${unit} | Error: ${deltaStr} (${pctStr}) | Stability: ${settlingStability}`}
    >
      {settlingStability === 'STABLE' ? (
        <CheckCircle2 size={compact ? 9 : 11} />
      ) : settlingStability === 'SETTLING' ? (
        <Activity size={compact ? 9 : 11} />
      ) : (
        <AlertTriangle size={compact ? 9 : 11} />
      )}

      <span>{settlingStability}</span>

      {showDelta && deltaStr && (
        <span style={{ opacity: 0.85, fontWeight: 500 }}>
          ({deltaStr})
        </span>
      )}

      {showOvershoot && overshootPercent !== null && overshootPercent > 0 && (
        <span style={{ color: '#f59e0b', fontSize: '9px', marginLeft: '2px' }}>
          OS:+{overshootPercent.toFixed(1)}%
        </span>
      )}
    </span>
  );
};

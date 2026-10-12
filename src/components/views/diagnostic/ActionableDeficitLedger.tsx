import React, { useState, useMemo } from 'react';
import { EvaluatedPoint, SubsystemCategory } from '../../../types';
import { ShieldAlert, Search, AlertTriangle } from '../../Icons';
import { ActionableDeficitRow } from './ActionableDeficitRow';

export interface ActionableDeficitLedgerProps {
  excursions: EvaluatedPoint[];
  softwareVersion?: string;
  flowSpUnit?: string;
  dpSpUnit?: string;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
  title?: string;
  subtitle?: string;
  selectedSensor?: string;
}

export const ActionableDeficitLedger: React.FC<ActionableDeficitLedgerProps> = ({
  excursions,
  flowSpUnit = 'LPM',
  dpSpUnit = 'psi',
  onSelectSensor,
  onSelectSubsystem,
  title,
  subtitle,
  selectedSensor
}) => {
  const [activeChannelFilter, setActiveChannelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique failing channels and their breach counts
  const channelBreachCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    excursions.forEach(f => {
      counts[f.parameter] = (counts[f.parameter] || 0) + 1;
    });
    return counts;
  }, [excursions]);

  const uniqueChannels = useMemo(() => {
    return Object.keys(channelBreachCounts).sort((a, b) => {
      return (channelBreachCounts[b] || 0) - (channelBreachCounts[a] || 0);
    });
  }, [channelBreachCounts]);

  // Filter excursions by active channel filter and search query
  const filteredExcursions = useMemo(() => {
    let list = excursions;

    if (activeChannelFilter !== 'ALL') {
      list = list.filter(f => f.parameter === activeChannelFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.parameter.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        String(f.timeSec).includes(q) ||
        (typeof f.measured === 'number' && String(f.measured).includes(q)) ||
        (f.failureReason && f.failureReason.toLowerCase().includes(q))
      );
    }

    return list;
  }, [excursions, activeChannelFilter, searchQuery]);

  return (
    <div className="actionable-deficit-ledger-card excursions-ledger-card">
      {/* Header Bar */}
      <div className="excursions-ledger-header">
        <div className="excursion-ledger-title">
          <ShieldAlert size={14} className="text-rose-400" />
          <span>
            {title || `Actionable Deficit Ledger (${excursions.length} Breaches)`}
          </span>
          {subtitle && (
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '6px' }}>
              — {subtitle}
            </span>
          )}
        </div>

        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search breaches (tag, stage, reading)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '3px 8px 3px 24px',
              fontSize: '10.5px',
              borderRadius: '4px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              width: '210px'
            }}
          />
        </div>
      </div>

      {/* Integrated Channel Filter Pills Row (Consolidates triple failure listings) */}
      {!selectedSensor && uniqueChannels.length > 1 && (
        <div className="actionable-filter-pills-row">
          <span className="pills-row-label">Filter Channel:</span>
          <button
            type="button"
            className={`actionable-channel-pill-btn ${activeChannelFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveChannelFilter('ALL')}
          >
            <span>All Breaches</span>
            <span className="pill-count-badge">{excursions.length}</span>
          </button>

          {uniqueChannels.map(channel => (
            <button
              key={channel}
              type="button"
              className={`actionable-channel-pill-btn ${activeChannelFilter === channel ? 'active' : ''}`}
              onClick={() => setActiveChannelFilter(channel)}
              title={`Filter deficit ledger to ${channel} (${channelBreachCounts[channel]} breaches)`}
            >
              <AlertTriangle size={11} className="text-rose-400" />
              <span>{channel}</span>
              <span className="pill-count-badge">{channelBreachCounts[channel]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Factual, Barebone Metrology Deficit Table */}
      <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
        <table className="cad-data-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Time (t)</th>
              <th>Channel Tag</th>
              <th>Subsystem</th>
              <th>Measured Reading</th>
              <th>Tolerance Range (±3σ)</th>
              <th>Margin Deficit (Δ)</th>
              <th>Active Stage Setpoints</th>
              <th>Breach Status</th>
              <th style={{ textAlign: 'center', width: '70px' }}>Scope</th>
            </tr>
          </thead>
          <tbody>
            {filteredExcursions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                  No out-of-tolerance breaches match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredExcursions.map((f, idx) => (
                <ActionableDeficitRow
                  key={`${f.parameter}-${f.timeSec}-${idx}`}
                  excursion={f}
                  flowSpUnit={flowSpUnit}
                  dpSpUnit={dpSpUnit}
                  onSelectSensor={onSelectSensor}
                  onSelectSubsystem={onSelectSubsystem}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div style={{
        padding: '6px 12px',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-color)',
        fontSize: '10.5px',
        color: 'var(--text-dim)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          Showing {filteredExcursions.length} of {excursions.length} non-conformances
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          Evaluated against factory ±3σ tolerance boundaries
        </span>
      </div>
    </div>
  );
};

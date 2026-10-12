import React, { useState, useMemo } from 'react';
import { EvaluatedFaultResult } from '../../../engine/diagnostics/faultTypes';
import { getFaultOverviewStats } from '../../../engine/diagnostics/diagnosticsEngine';
import { FaultCodeCard } from './FaultCodeCard';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  Layers
} from '../../Icons';

export interface CanonicalFaultsSectionProps {
  faultResults: EvaluatedFaultResult[];
  selectedSubsystem?: SubsystemCategory;
  selectedSensor?: string;
  onSelectSensor?: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const CanonicalFaultsSection: React.FC<CanonicalFaultsSectionProps> = ({
  faultResults,
  selectedSubsystem,
  selectedSensor,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const stats = useMemo(() => getFaultOverviewStats(faultResults), [faultResults]);
  // Default to showing only triggered faults if any exist, collapsing passing rules
  const [filterMode, setFilterMode] = useState<'all' | 'triggered' | 'subsystem'>(
    stats.triggered > 0 ? 'triggered' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaults = useMemo(() => {
    let list = [...faultResults];

    // Subsystem or sensor filter
    if (selectedSensor) {
      const target = selectedSensor.toLowerCase();
      list = list.filter(f => 
        f.definition.associatedSensors.some(s => s.toLowerCase() === target || target.includes(s.toLowerCase()))
      );
    } else if (filterMode === 'subsystem' && selectedSubsystem) {
      list = list.filter(f => f.definition.category === selectedSubsystem);
    } else if (filterMode === 'triggered') {
      list = list.filter(f => f.isTriggered || f.status === 'fail' || f.status === 'warn');
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.definition.title.toLowerCase().includes(q) ||
        f.definition.id.toLowerCase().includes(q) ||
        f.definition.purpose.toLowerCase().includes(q) ||
        f.definition.troubleshooting.toLowerCase().includes(q) ||
        f.definition.associatedSensors.some(s => s.toLowerCase().includes(q))
      );
    }

    return list;
  }, [faultResults, filterMode, selectedSubsystem, selectedSensor, searchQuery]);

  return (
    <div className="cad-canonical-faults-section">
      {/* Section Header & Progressive Disclosure Summary Bar */}
      <div className="canonical-faults-header-bar">
        <div className="header-title-group">
          <ShieldAlert size={16} className={stats.triggered > 0 ? "text-rose-400" : "text-emerald-400"} />
          <span className="canonical-title">
            Canonical 20-Fault Diagnostics Registry
          </span>
          <span className="canonical-subtitle">
            CoolIT™ CHx2000 Baseline Checks
          </span>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="fault-stats-pills-row">
          <span className="stat-pill total-pill">
            20 Rules Evaluated
          </span>
          {stats.triggered > 0 ? (
            <span className="stat-pill triggered-pill">
              <AlertTriangle size={11} />
              {stats.triggered} Triggered
            </span>
          ) : (
            <span className="stat-pill all-pass-pill">
              <CheckCircle2 size={11} />
              0 Breaches
            </span>
          )}
          {stats.warnings > 0 && (
            <span className="stat-pill warn-pill">
              {stats.warnings} 3σ Warnings
            </span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic', marginLeft: '4px' }}>
            (Diagnostics under calibration)
          </span>
        </div>
      </div>

      {/* Control Strip: Progressive Disclosure Filters & Search */}
      <div className="canonical-filter-toolbar">
        <div className="filter-button-group">
          {stats.triggered > 0 && (
            <button
              type="button"
              className={`filter-tab-btn ${filterMode === 'triggered' ? 'active' : ''}`}
              onClick={() => setFilterMode('triggered')}
            >
              <AlertTriangle size={11} />
              <span>Triggered Non-Conformances ({stats.triggered + stats.warnings})</span>
            </button>
          )}
          <button
            type="button"
            className={`filter-tab-btn ${filterMode === 'all' && !selectedSensor ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            {stats.triggered > 0 ? `Show All 20 Rules (${faultResults.length}) ▾` : `All 20 Rules (${faultResults.length})`}
          </button>
          {selectedSubsystem && (
            <button
              type="button"
              className={`filter-tab-btn ${filterMode === 'subsystem' ? 'active' : ''}`}
              onClick={() => setFilterMode('subsystem')}
            >
              <Layers size={11} />
              <span>{SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem} Only</span>
            </button>
          )}
        </div>

        <div className="fault-search-box">
          <Search size={12} className="search-icon" />
          <input
            type="text"
            placeholder="Search fault code or channel..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="fault-search-input"
          />
        </div>
      </div>

      {/* Progressive Disclosure Cards List */}
      <div className="canonical-cards-container">
        {filteredFaults.length === 0 ? (
          <div className="no-faults-matching-box">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                All 20 Canonical Fault Rules Verified In-Spec
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>
                Zero non-conformances triggered. Click "Show All 20 Rules" above to audit individual pass thresholds.
              </span>
            </div>
          </div>
        ) : (
          filteredFaults.map(fault => (
            <FaultCodeCard
              key={fault.definition.id}
              fault={fault}
              initialExpanded={fault.isTriggered}
              onSelectSensor={onSelectSensor}
              onSelectSubsystem={onSelectSubsystem}
            />
          ))
        )}
      </div>
    </div>
  );
};

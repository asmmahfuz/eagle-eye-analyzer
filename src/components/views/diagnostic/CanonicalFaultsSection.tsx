import React, { useState, useMemo } from 'react';
import { EvaluatedFaultResult } from '../../../engine/diagnostics/faultTypes';
import { getFaultOverviewStats } from '../../../engine/diagnostics/diagnosticsEngine';
import { FaultCodeCard } from './FaultCodeCard';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
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
  const [filterMode, setFilterMode] = useState<'all' | 'triggered' | 'subsystem'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => getFaultOverviewStats(faultResults), [faultResults]);

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
      {/* Section Header & KPI Summary */}
      <div className="canonical-faults-header-bar">
        <div className="header-title-group">
          <ShieldAlert size={16} className={stats.triggered > 0 ? "text-rose-400" : "text-emerald-400"} />
          <span className="canonical-title">
            Canonical 20-Fault Diagnostics Registry
          </span>
          <span className="canonical-subtitle">
            CoolIT™ CHx2000 Golden Specification Checks
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
        </div>
      </div>

      {/* Control Strip: Filters & Search */}
      <div className="canonical-filter-toolbar">
        <div className="filter-button-group">
          <button
            type="button"
            className={`filter-tab-btn ${filterMode === 'all' && !selectedSensor ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All 20 Faults ({faultResults.length})
          </button>
          <button
            type="button"
            className={`filter-tab-btn ${filterMode === 'triggered' ? 'active' : ''}`}
            onClick={() => setFilterMode('triggered')}
          >
            <AlertTriangle size={11} />
            <span>Triggered & Warnings ({stats.triggered + stats.warnings})</span>
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
            placeholder="Search fault code, parameter, or directive..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="fault-search-input"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="canonical-cards-container">
        {filteredFaults.length === 0 ? (
          <div className="no-faults-matching-box">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <p>No fault codes matching the current filter criteria.</p>
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

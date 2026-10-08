import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, CadMainView } from '../../types';
import {
  Folder,
  FolderOpen,
  Search,
  X,
  Layers,
  AlertTriangle,
  Droplets,
  Cpu,
  Wind,
  Thermometer,
  Gauge,
  Sliders,
  Upload
} from '../Icons';
import { CadWorkspaceTreeStandby } from './CadWorkspaceTreeStandby';
import { CadRegisterBadge } from './CadRegisterBadge';

interface CadWorkspaceTreeProps {
  dataset: EagleEyeDataset | null;
  selectedSensor: string | null;
  selectedSubsystem: SubsystemCategory | null;
  activeView?: CadMainView;
  onSelectSensor: (sensorName: string | null) => void;
  onSelectSubsystem: (subsystem: SubsystemCategory | null) => void;
  onClose: () => void;
  onOpenFileClick: () => void;
}

const CATEGORY_META: Record<SubsystemCategory, { label: string; icon: React.ReactNode; color: string }> = {
  hydraulic: { label: 'Hydraulic & DP', icon: <Droplets size={13} />, color: '#00D2FF' },
  pump: { label: 'Pump Speeds & VFD', icon: <Sliders size={13} />, color: '#60A5FA' },
  temperature: { label: 'Temperature Transmitters', icon: <Thermometer size={13} />, color: '#F97316' },
  pressure: { label: 'Pressure Transmitters', icon: <Gauge size={13} />, color: '#A855F7' },
  environmental: { label: 'Environmental & Ambient', icon: <Wind size={13} />, color: '#EAB308' },
  system: { label: 'System & Discrete I/O', icon: <Cpu size={13} />, color: '#38BDF8' },
  setpoint: { label: 'Excitation Setpoints', icon: <Sliders size={13} />, color: '#94A3B8' },
  other: { label: 'Other Telemetry', icon: <Layers size={13} />, color: '#64748B' }
};

export const CadWorkspaceTree: React.FC<CadWorkspaceTreeProps> = ({
  dataset,
  selectedSensor,
  selectedSubsystem,
  activeView,
  onSelectSensor,
  onSelectSubsystem,
  onClose,
  onOpenFileClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'failed' | 'passed'>('all');
  const [isUnitExpanded, setIsUnitExpanded] = useState<boolean>(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Group sensors by category and calculate stats
  const groupedData = useMemo(() => {
    if (!dataset) return null;

    const groups: Record<SubsystemCategory, {
      items: { name: string; summary: any }[];
      totalCount: number;
      failCount: number;
    }> = {
      hydraulic: { items: [], totalCount: 0, failCount: 0 },
      pump: { items: [], totalCount: 0, failCount: 0 },
      temperature: { items: [], totalCount: 0, failCount: 0 },
      pressure: { items: [], totalCount: 0, failCount: 0 },
      environmental: { items: [], totalCount: 0, failCount: 0 },
      system: { items: [], totalCount: 0, failCount: 0 },
      setpoint: { items: [], totalCount: 0, failCount: 0 },
      other: { items: [], totalCount: 0, failCount: 0 }
    };

    const searchLower = searchTerm.toLowerCase();

    Object.entries(dataset.parameterStats).forEach(([name, summary]) => {
      const cat = summary.category as SubsystemCategory;
      if (!groups[cat]) return;

      const matchesSearch = name.toLowerCase().includes(searchLower) || summary.unit.toLowerCase().includes(searchLower);
      const isFailed = summary.failCount > 0;
      const matchesFilter =
        filterMode === 'all' ? true :
          filterMode === 'failed' ? isFailed :
            !isFailed;

      if (matchesSearch && matchesFilter) {
        groups[cat].items.push({ name, summary });
      }

      groups[cat].totalCount++;
      if (isFailed) groups[cat].failCount++;
    });

    return groups;
  }, [dataset, searchTerm, filterMode]);

  const totalChannels = dataset ? Object.keys(dataset.parameterStats).length : 0;
  const totalFailedChannels = dataset ? Object.values(dataset.parameterStats).filter(s => s.failCount > 0).length : 0;
  const totalPassedChannels = totalChannels - totalFailedChannels;

  return (
    <aside className="cad-dock-panel cad-workspace-tree-dock" aria-label="Workspace Channels Tree">
      {/* Dock Window Title Bar */}
      <div className="cad-dock-header">
        <div className="cad-dock-title">
          <FolderOpen size={14} className="cad-dock-icon" />
          <span>Workspace</span>
        </div>
        <div className="cad-dock-actions">
          {dataset && (
            <>
              <button
                className="cad-dock-btn"
                title="Expand All"
                onClick={() => {
                  if (!groupedData) return;
                  const allExpanded: Record<string, boolean> = {};
                  Object.keys(groupedData).forEach(k => allExpanded[k] = true);
                  setExpandedCategories(allExpanded);
                  setIsUnitExpanded(true);
                }}
              >
                +
              </button>
              <button
                className="cad-dock-btn"
                title="Collapse All"
                onClick={() => setExpandedCategories({})}
              >
                _
              </button>
            </>
          )}
          <button
            className="cad-dock-btn cad-dock-btn-close"
            title="Close Workspace Tree (Ctrl+1)"
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {!dataset ? (
        <CadWorkspaceTreeStandby onOpenFileClick={onOpenFileClick} />
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="cad-tree-toolbar">
            <div className="cad-search-input-wrap">
              <Search size={12} className="cad-search-icon" />
              <input
                type="text"
                className="cad-search-input"
                placeholder="Filter channels (PT, TT, DP)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="cad-search-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>

            <div className="cad-filter-pills-row">
              <button
                className={`cad-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All ({totalChannels})
              </button>
              <button
                className={`cad-filter-chip cad-chip-fail ${filterMode === 'failed' ? 'active' : ''}`}
                onClick={() => setFilterMode('failed')}
              >
                Failed ({totalFailedChannels})
              </button>
              <button
                className={`cad-filter-chip cad-chip-pass ${filterMode === 'passed' ? 'active' : ''}`}
                onClick={() => setFilterMode('passed')}
              >
                Passed ({totalPassedChannels})
              </button>
            </div>
          </div>

          {/* Tree Content */}
          <div className="cad-tree-scroll-content">
            {/* Unit Root Node (Whole System) */}
            <div
              className={`cad-tree-unit-root ${selectedSensor === null && selectedSubsystem === null ? 'selected' : ''}`}
              onClick={() => {
                onSelectSubsystem(null);
                onSelectSensor(null);
              }}
              title={`Unit ${dataset.metadata.serialNumber || dataset.metadata.filename}${dataset.metadata.workOrderNumber && dataset.metadata.workOrderNumber !== '-' ? ` (${dataset.metadata.workOrderNumber})` : ''} - Click to view Whole System Overview`}
            >
              <button
                className="cad-unit-expander-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUnitExpanded(prev => !prev);
                }}
                title={isUnitExpanded ? "Collapse Unit Subsystems" : "Expand Unit Subsystems"}
                aria-label="Toggle Unit Subsystems"
              >
                <span className="cad-cat-chevron">{isUnitExpanded ? '▾' : '▸'}</span>
              </button>
              <FolderOpen size={14} className="cad-tree-folder-icon" />
              <div className="cad-tree-unit-info">
                <span className="cad-unit-name">
                  <span className="cad-unit-prefix">Unit:</span>
                  <span className="cad-unit-num">{dataset.metadata.serialNumber || dataset.metadata.filename}</span>
                </span>
                {dataset.metadata.workOrderNumber && dataset.metadata.workOrderNumber !== '-' && (
                  <span className="cad-unit-wo" title={`Work Order: ${dataset.metadata.workOrderNumber}`}>
                    {dataset.metadata.workOrderNumber}
                  </span>
                )}
              </div>
              <span className={`cad-unit-status-badge ${dataset.metadata.finalResult === 'Pass' ? 'pass' : 'fail'}`}>
                {dataset.metadata.finalResult}
              </span>
            </div>

            {/* Subsystem Categorized Folders (Indented Test Types) */}
            {isUnitExpanded && (
              <div className="cad-subsystems-list">
                {groupedData && (Object.keys(groupedData) as SubsystemCategory[]).map(catKey => {
                  const group = groupedData[catKey];
                  if (group.totalCount === 0) return null;
                  const meta = CATEGORY_META[catKey];
                  const isExpanded = searchTerm.trim() !== '' ? true : !!expandedCategories[catKey];
                  const hasFailures = group.failCount > 0;

                  return (
                    <div key={catKey} className={`cad-cat-branch ${selectedSubsystem === catKey ? 'subsystem-active' : ''}`}>
                      {/* Category Header (Subsystem Selection) */}
                      <div
                        className={`cad-cat-header ${selectedSubsystem === catKey && selectedSensor === null ? 'selected' : ''}`}
                        onClick={() => {
                          onSelectSubsystem(catKey);
                          onSelectSensor(null);
                          if (!isExpanded) toggleCategory(catKey);
                        }}
                        title={`Click to focus center & right windows on ${meta.label} subsystem`}
                      >
                        <button
                          className="cad-cat-chevron-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(catKey);
                          }}
                          title={isExpanded ? `Collapse ${meta.label}` : `Expand ${meta.label}`}
                        >
                          <span className="cad-cat-chevron">{isExpanded ? '▾' : '▸'}</span>
                        </button>
                        <span className="cad-cat-icon" style={{ color: meta.color }}>{meta.icon}</span>
                        <span className="cad-cat-title">{meta.label}</span>
                        <div className="cad-cat-badges">
                          {hasFailures ? (
                            <span className="cad-cat-fail-badge">{group.failCount} FAIL</span>
                          ) : (
                            <span className="cad-cat-pass-badge">✓</span>
                          )}
                          <span className="cad-cat-count-badge">{group.items.length}</span>
                        </div>
                      </div>

                      {/* Channel Items Under Category (Actual Tests) */}
                      {isExpanded && (
                        <div className="cad-cat-children">
                          {group.items.map(({ name, summary }) => {
                            const isSelected = selectedSensor === name;
                            const isFailed = summary.failCount > 0;
                            const settlingVal = summary.settling !== null ? summary.settling.toFixed(2) : '--';

                            return (
                              <div
                                key={name}
                                className={`cad-channel-tree-item ${isSelected ? 'selected' : ''} ${isFailed ? 'failed' : 'passed'}`}
                                onClick={() => {
                                  onSelectSensor(name);
                                }}
                                title={`${name} (${summary.unit}) - ${isFailed ? `${summary.failCount} Failures` : 'Passed'}`}
                              >
                                <span className="cad-channel-status-indicator">
                                  {isFailed ? (
                                    <AlertTriangle size={11} className="cad-alert-icon" />
                                  ) : (
                                    <span className="cad-pass-dot"></span>
                                  )}
                                </span>

                                <span className="cad-channel-tag" title={name}>
                                  <CadRegisterBadge channelName={name} style={{ marginRight: '4px' }} />
                                  {name}
                                </span>

                                <span className="cad-channel-unit">
                                  {summary.unit}
                                </span>

                                <span className={`cad-channel-val ${isFailed ? 'cad-val-fail' : 'cad-val-pass'}`}>
                                  {settlingVal}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dock Bottom Info Summary */}
          <div className="cad-dock-footer">
            <div className="cad-dock-metric">
              <span className="cad-metric-label">Channels:</span>
              <span className="cad-metric-val">{totalChannels}</span>
            </div>
            <div className="cad-dock-metric">
              <span className="cad-metric-label">Evaluated:</span>
              <span className="cad-metric-val">{dataset.totalEvaluated}</span>
            </div>
            <div className="cad-dock-metric">
              <span className="cad-metric-label">Violations:</span>
              <span className={`cad-metric-val ${totalFailedChannels > 0 ? 'text-red' : 'text-green'}`}>
                {dataset.failedCount} ({totalFailedChannels} Ch)
              </span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

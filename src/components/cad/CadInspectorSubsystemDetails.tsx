import React, { useState } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS, CadMainView } from '../../types';
import { Info } from '../Icons';

interface CadInspectorSubsystemDetailsProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string | null) => void;
  onSelectView?: (view: CadMainView) => void;
}

export const CadInspectorSubsystemDetails: React.FC<CadInspectorSubsystemDetailsProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onSelectView
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    subsystem_perf: true,
    subsystem_channels: true,
    subsystem_diag: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const subMeta = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;
  const subChannels = Object.entries(dataset.parameterStats).filter(([_, s]) => s.category === selectedSubsystem);
  const subFailures = dataset.failures.filter(f => f.category === selectedSubsystem);
  const subTotalChecks = subChannels.length * dataset.stages.length;
  const subFailCount = subFailures.length;
  const subPassCount = subTotalChecks - subFailCount;
  const subPassRate = subTotalChecks > 0 ? ((subPassCount / subTotalChecks) * 100).toFixed(1) : '100.0';
  const hasFail = subFailCount > 0;

  return (
    <div className="cad-property-grid">
      <div className={`cad-inspector-target-card ${hasFail ? 'failed' : 'passed'}`}>
        <div className="cad-target-card-top">
          <span className="cad-target-param-tag">
            {subMeta.toUpperCase()}
          </span>
          <span className={`cad-target-verdict-badge ${hasFail ? 'fail' : 'pass'}`}>
            {hasFail ? `${subFailCount} FAIL` : 'PASS'}
          </span>
        </div>
        <div className="cad-target-card-sub">
          <span>Channels: <strong>{subChannels.length} Active</strong></span>
          <span>Yield: <strong>{subPassRate}%</strong></span>
        </div>
      </div>

      {/* Section 1: Subsystem Performance */}
      <div className="cad-prop-group">
        <div
          className="cad-prop-group-header"
          onClick={() => toggleSection('subsystem_perf')}
        >
          <span className="cad-prop-chevron">{expandedSections.subsystem_perf ? '▾' : '▸'}</span>
          <span className="cad-prop-group-title">Subsystem Performance Metrics</span>
        </div>
        {expandedSections.subsystem_perf && (
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Subsystem</td>
                <td className="cad-prop-val font-bold text-cyan">{subMeta}</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Total Channels</td>
                <td className="cad-prop-val font-mono">{subChannels.length} test channels</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Checks Evaluated</td>
                <td className="cad-prop-val font-mono">{subTotalChecks} checks ({subChannels.length} × {dataset.stages.length})</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Passed Checks</td>
                <td className="cad-prop-val font-mono text-green">{subPassCount} ({subPassRate}%)</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Out of Tolerance</td>
                <td className="cad-prop-val font-mono text-red">{subFailCount} violations</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Primary Transducer</td>
                <td className="cad-prop-val font-mono">{subChannels[0]?.[0] || 'None'}</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Active Filter Scope</td>
                <td className="cad-prop-val font-mono text-cyan">Isolated Subsystem</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Section 2: Channel Directory */}
      <div className="cad-prop-group">
        <div
          className="cad-prop-group-header"
          onClick={() => toggleSection('subsystem_channels')}
        >
          <span className="cad-prop-chevron">{expandedSections.subsystem_channels ? '▾' : '▸'}</span>
          <span className="cad-prop-group-title">Subsystem Channels ({subChannels.length})</span>
        </div>
        {expandedSections.subsystem_channels && (
          <div className="cad-inspector-channel-list" style={{ padding: '6px 8px' }}>
            {subChannels.map(([name, s]) => {
              const chFailed = s.failCount > 0;
              return (
                <div
                  key={name}
                  onClick={() => onSelectSensor(name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    marginBottom: '3px',
                    borderRadius: '4px',
                    background: chFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                    border: `1px solid ${chFailed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  title={`Click to inspect channel ${name}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: chFailed ? '#ef4444' : '#10b981', flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span className="font-mono text-dim" style={{ fontSize: '10px' }}>{s.settling !== null ? `${s.settling.toFixed(1)} ${s.unit}` : '--'}</span>
                    <span className={`cad-tab-badge-count ${chFailed ? 'fail' : 'pass'}`} style={{ fontSize: '8.5px', padding: '0 4px' }}>
                      {chFailed ? `${s.failCount} FAIL` : 'PASS'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Diagnostic & Shopfloor Directive */}
      <div className="cad-prop-group">
        <div
          className="cad-prop-group-header"
          onClick={() => toggleSection('subsystem_diag')}
        >
          <span className="cad-prop-chevron">{expandedSections.subsystem_diag ? '▾' : '▸'}</span>
          <span className="cad-prop-group-title">Shopfloor Directive</span>
        </div>
        {expandedSections.subsystem_diag && (
          <div className="cad-prop-diagnostic-content">
            <button
              type="button"
              className={`cad-inspector-rework-btn ${hasFail ? 'danger-action' : ''}`}
              onClick={() => onSelectView?.('diagnostics')}
              title={`Open Diagnostics (In Development)`}
            >
              <span>Diagnostics (In Development)</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold' }}>→</span>
            </button>
          </div>
        )}
      </div>

      <div className="cad-inspector-hint-box">
        <Info size={14} className="text-cyan flex-shrink-0" />
        <span>Viewing only <strong>{subMeta}</strong>. Click <strong>Unit: {dataset.metadata.serialNumber}</strong> in the left window to view the whole system.</span>
      </div>
    </div>
  );
};

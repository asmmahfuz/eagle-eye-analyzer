import React, { useState } from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { Search } from '../../Icons';
import { useCoreMatrixRows, InspectionViewMode } from './useCoreMatrixRows';
import { CoreInspectionRow } from './CoreInspectionRow';

export interface CoreInspectionMatrixProps {
  dataset: EagleEyeDataset;
  selectedStageNum: number | null;
  onClearStageNum?: () => void;
  onSelectSensor: (sensorName: string) => void;
  onOpenMetricsModal: (sensorName: string) => void;
  fixedCategory?: SubsystemCategory;
}

export const CoreInspectionMatrix: React.FC<CoreInspectionMatrixProps> = ({
  dataset,
  selectedStageNum,
  onClearStageNum,
  onSelectSensor,
  onOpenMetricsModal,
  fixedCategory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectionMode, setInspectionMode] = useState<InspectionViewMode>('steady_state');
  const [categoryFilter, setCategoryFilter] = useState<string>(fixedCategory || 'all');

  const { matrixRows, activeFailCount, activeTotalChecks } = useCoreMatrixRows({
    dataset,
    selectedStageNum,
    inspectionMode,
    categoryFilter,
    fixedCategory,
    searchQuery
  });

  return (
    <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
      {/* Table Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              {selectedStageNum !== null
                ? `Verification Data Sheet — Stage ${selectedStageNum} Dwell Checks (${matrixRows.length} Rows)`
                : `Verification Data Sheet — 5-Column Core Matrix (${matrixRows.length} Rows)`}
            </h3>
            <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.28)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
              Invariant 13 Compliant
            </span>
            {selectedStageNum !== null && onClearStageNum && (
              <button
                type="button"
                onClick={onClearStageNum}
                style={{
                  padding: '2px 7px',
                  fontSize: '10px',
                  background: 'rgba(2, 132, 199, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  borderRadius: '3px',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Clear stage focus and return to full matrix"
              >
                Stage {selectedStageNum} Active ✕
              </button>
            )}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            {selectedStageNum !== null
              ? `Isolated to Stage ${selectedStageNum} dwell checks across all channels`
              : 'Core Matrix: [Test Parameter, Stage/Condition, Measured Result, Expected Range/Spec, Pass/Fail Verdict]'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: '4px', padding: '2px', gap: '2px' }}>
            <button
              type="button"
              className={`cad-view-mode-btn ${inspectionMode === 'steady_state' ? 'active' : ''}`}
              onClick={() => setInspectionMode('steady_state')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '3px',
                border: 'none',
                background: inspectionMode === 'steady_state' ? 'var(--bg-card)' : 'transparent',
                color: inspectionMode === 'steady_state' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: inspectionMode === 'steady_state' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              Steady-State (525s)
            </button>
            <button
              type="button"
              className={`cad-view-mode-btn ${inspectionMode === 'all_checks' ? 'active' : ''}`}
              onClick={() => setInspectionMode('all_checks')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '3px',
                border: 'none',
                background: inspectionMode === 'all_checks' ? 'var(--bg-card)' : 'transparent',
                color: inspectionMode === 'all_checks' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: inspectionMode === 'all_checks' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              All Stage Checks ({activeTotalChecks})
            </button>
            <button
              type="button"
              className={`cad-view-mode-btn ${inspectionMode === 'failures' ? 'active' : ''}`}
              onClick={() => setInspectionMode('failures')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                borderRadius: '3px',
                border: 'none',
                background: inspectionMode === 'failures' ? 'var(--bg-card)' : 'transparent',
                color: inspectionMode === 'failures' ? 'var(--danger-text)' : 'var(--text-muted)',
                fontWeight: inspectionMode === 'failures' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              Failed Only ({activeFailCount})
            </button>
          </div>

          {/* Subsystem Domain Filter (only shown if not fixedCategory) */}
          {!fixedCategory && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Domains</option>
              <option value="hydraulic">Hydraulic & DP</option>
              <option value="pump">Pumps & VFD</option>
              <option value="temperature">Temperatures</option>
              <option value="pressure">Pressures</option>
              <option value="environmental">Ambient</option>
              <option value="system">System / PLC</option>
            </select>
          )}

          {/* Search Input */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Filter channel or tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '4px 8px 4px 26px',
                fontSize: '11px',
                borderRadius: '4px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                width: '160px'
              }}
            />
          </div>
        </div>
      </div>

      {/* The Strict 5-Column Table */}
      <table className="cad-data-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>1. Test Parameter / Channel</th>
            <th style={{ width: '26%' }}>2. Stage / Condition</th>
            <th style={{ width: '18%' }}>3. Measured Result</th>
            <th style={{ width: '18%' }}>4. Expected Range / Spec</th>
            <th style={{ width: '10%', textAlign: 'right' }}>5. Verdict</th>
          </tr>
        </thead>
        <tbody>
          {matrixRows.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                No channels match the active filter criteria.
              </td>
            </tr>
          ) : (
            matrixRows.map(row => (
              <CoreInspectionRow
                key={row.id}
                row={row}
                onSelectSensor={onSelectSensor}
                onOpenMetricsModal={onOpenMetricsModal}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

import React from 'react';
import { EagleEyeDataset, CadMainView } from '../../types';
import { CduModelProfile } from '../../engine/models/modelTypes';
import { Info } from '../Icons';

interface CadInspectorUnitOverviewProps {
  dataset: EagleEyeDataset;
  modelProfile: CduModelProfile;
  onSelectView?: (view: CadMainView) => void;
}

export const CadInspectorUnitOverview: React.FC<CadInspectorUnitOverviewProps> = ({
  dataset,
  modelProfile,
  onSelectView
}) => {
  const isFailed = dataset.metadata.finalResult !== 'Pass' || dataset.failedCount > 0;

  return (
    <div className="cad-property-grid">
      <div className={`cad-inspector-target-card ${isFailed ? 'failed' : 'passed'}`}>
        <div className="cad-target-card-top">
          <span className="cad-target-param-tag">
            {dataset.metadata.serialNumber || 'UNIT OVERVIEW'}
          </span>
          <span className={`cad-target-verdict-badge ${isFailed ? 'fail' : 'pass'}`}>
            {dataset.metadata.finalResult}
          </span>
        </div>
        <div className="cad-target-card-sub">
          <span>WO: <strong>{dataset.metadata.workOrderNumber}</strong></span>
          <span>Pass Rate: <strong>{dataset.passRate}%</strong></span>
        </div>
      </div>

      <div className="cad-prop-group">
        <div className="cad-prop-group-header">
          <span className="cad-prop-chevron">▾</span>
          <span className="cad-prop-group-title">Unit Test Run Properties</span>
        </div>
        <table className="cad-prop-table">
          <tbody>
            <tr>
              <td className="cad-prop-key">Serial Number</td>
              <td className="cad-prop-val font-mono font-bold text-cyan">{dataset.metadata.serialNumber}</td>
            </tr>
            <tr>
              <td className="cad-prop-key">CDU Architecture</td>
              <td className="cad-prop-val font-mono font-bold text-cyan">
                {modelProfile.shortName} ({modelProfile.series === 'air-to-liquid' ? 'Air-Cooled' : 'Liquid-to-Liquid'})
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Work Order</td>
              <td className="cad-prop-val font-mono">{dataset.metadata.workOrderNumber}</td>
            </tr>
            <tr>
              <td className="cad-prop-key">Pass Rate</td>
              <td className={`cad-prop-val font-mono font-bold ${isFailed ? 'text-red' : 'text-green'}`}>
                {dataset.passRate}%
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Violations Count</td>
              <td className={`cad-prop-val font-mono font-bold ${dataset.failedCount > 0 ? 'text-red' : 'text-green'}`}>
                {dataset.failedCount} violations
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {onSelectView && (
        <button
          type="button"
          className="cad-inspector-rework-btn"
          onClick={() => onSelectView('diagnostics')}
          title="Open Diagnostics (In Development)"
        >
          <span>Diagnostics (In Development)</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>→</span>
        </button>
      )}

      <div className="cad-inspector-hint-box">
        <Info size={14} className="text-cyan flex-shrink-0" />
        <span>Select any channel from the left <strong>Workspace Tree</strong> to inspect its statistical 3σ parameters, peak/settling values, and Modbus registers.</span>
      </div>
    </div>
  );
};

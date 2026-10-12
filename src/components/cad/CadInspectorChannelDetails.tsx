import React, { useState } from 'react';
import { ParameterSummary, CadMainView } from '../../types';
import { CadRegisterBadge } from './CadRegisterBadge';
import { CadInspectorModbusSection } from './CadInspectorModbusSection';
import { CadInspectorSpcSection } from './CadInspectorSpcSection';
import { getRegisterByName } from '../../engine/registers';

interface CadInspectorChannelDetailsProps {
  selectedSensor: string;
  summary: ParameterSummary;
  showModbusOverlays?: boolean;
  onOpenTerminalModbus?: () => void;
  onSelectView?: (view: CadMainView) => void;
}

export const CadInspectorChannelDetails: React.FC<CadInspectorChannelDetailsProps> = ({
  selectedSensor,
  summary,
  showModbusOverlays = false,
  onOpenTerminalModbus,
  onSelectView
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    spc: true,
    telemetry: true,
    modbus: true,
    diagnostic: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isFailed = summary.failCount > 0;

  return (
    <div className="cad-property-grid">
      {/* Selected Parameter Header Card */}
      <div className={`cad-inspector-target-card ${isFailed ? 'failed' : 'passed'}`}>
        <div className="cad-target-card-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showModbusOverlays && (
              <CadRegisterBadge channelName={selectedSensor} showPrefix style={{ fontSize: '10.5px' }} />
            )}
            <span className="cad-target-param-tag">{selectedSensor}</span>
          </div>
          <span className={`cad-target-verdict-badge ${isFailed ? 'fail' : 'pass'}`}>
            {isFailed ? `${summary.failCount} FAIL` : 'PASS'}
          </span>
        </div>
        <div className="cad-target-card-sub">
          <span>Unit: <strong>{summary.unit}</strong></span>
          <span>Category: <strong>{summary.category}</strong></span>
        </div>
      </div>

      {/* SECTION 1: IDENTITY */}
      <div className="cad-prop-group">
        <div
          className="cad-prop-group-header"
          onClick={() => toggleSection('identity')}
        >
          <span className="cad-prop-chevron">{expandedSections.identity ? '▾' : '▸'}</span>
          <span className="cad-prop-group-title">Channel Identity</span>
        </div>
        {expandedSections.identity && (
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Tag Name</td>
                <td className="cad-prop-val font-mono">{selectedSensor}</td>
              </tr>
              {showModbusOverlays && (
                <tr>
                  <td className="cad-prop-key">Modbus Address</td>
                  <td className="cad-prop-val font-mono">
                    {(() => {
                      const reg = getRegisterByName(selectedSensor);
                      return reg ? (
                        <span className="cad-reg-badge" style={{ padding: '1px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '3px', color: '#C084FC' }}>
                          Reg {reg.address} (0x{reg.address.toString(16).toUpperCase().padStart(4, '0')})
                        </span>
                      ) : '--';
                    })()}
                  </td>
                </tr>
              )}
              <tr>
                <td className="cad-prop-key">Subsystem</td>
                <td className="cad-prop-val">{summary.category.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Engineering Unit</td>
                <td className="cad-prop-val font-mono font-bold text-cyan">{summary.unit}</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Required Envelope</td>
                <td className="cad-prop-val font-mono">{summary.requiredRangeSample || '±3σ Dynamic'}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* SECTION 2: STATISTICAL PROCESS CONTROL (3-SIGMA) */}
      <CadInspectorSpcSection
        summary={summary}
        isOpen={expandedSections.spc}
        onToggle={() => toggleSection('spc')}
      />

      {/* SECTION 3: MEASURED TELEMETRY */}
      <div className="cad-prop-group">
        <div
          className="cad-prop-group-header"
          onClick={() => toggleSection('telemetry')}
        >
          <span className="cad-prop-chevron">{expandedSections.telemetry ? '▾' : '▸'}</span>
          <span className="cad-prop-group-title">Measured Telemetry</span>
        </div>
        {expandedSections.telemetry && (
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Settling (at 525s)</td>
                <td className="cad-prop-val font-mono font-bold text-green">
                  {summary.settling !== null ? `${summary.settling.toFixed(2)} ${summary.unit}` : '--'}
                </td>
              </tr>
              <tr>
                <td className="cad-prop-key">Peak (Maximum)</td>
                <td className="cad-prop-val font-mono text-blue">
                  {summary.peak !== null ? `${summary.peak.toFixed(2)} ${summary.unit}` : '--'}
                </td>
              </tr>
              <tr>
                <td className="cad-prop-key">Minimum (Min)</td>
                <td className="cad-prop-val font-mono text-sky">
                  {summary.min !== null ? `${summary.min.toFixed(2)} ${summary.unit}` : '--'}
                </td>
              </tr>
              <tr>
                <td className="cad-prop-key">Worst Margin Buffer</td>
                <td className="cad-prop-val font-mono">
                  <span className={`cad-margin-pill ${summary.worstMargin !== null && summary.worstMargin < 0 ? 'margin-deficit' : 'margin-healthy'}`}>
                    {summary.worstMargin !== null ? `${summary.worstMargin > 0 ? '+' : ''}${summary.worstMargin.toFixed(2)} ${summary.unit}` : '--'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="cad-prop-key">Evaluated Steps</td>
                <td className="cad-prop-val font-mono">{summary.totalChecks} stages</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Violations</td>
                <td className="cad-prop-val font-mono font-bold">
                  <span className={summary.failCount > 0 ? 'text-red' : 'text-green'}>
                    {summary.failCount} of {summary.totalChecks} ({((summary.failCount / summary.totalChecks) * 100).toFixed(1)}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* SECTION 4: MODBUS & HARDWARE SIGNALS */}
      <CadInspectorModbusSection
        selectedSensor={selectedSensor}
        summary={summary}
        showModbusOverlays={showModbusOverlays}
        isOpen={expandedSections.modbus}
        onToggle={() => toggleSection('modbus')}
        onOpenTerminalModbus={onOpenTerminalModbus}
      />

      {/* SECTION 5: DIAGNOSTIC REWORK DIRECTIVE */}
      {isFailed && (
        <div className="cad-prop-group">
          <div
            className="cad-prop-group-header"
            onClick={() => toggleSection('diagnostic')}
          >
            <span className="cad-prop-chevron">{expandedSections.diagnostic ? '▾' : '▸'}</span>
            <span className="cad-prop-group-title text-red">Diagnostic Action</span>
          </div>
          {expandedSections.diagnostic && (
            <div className="cad-prop-diagnostic-content">
              <button
                type="button"
                className="cad-inspector-rework-btn danger-action"
                onClick={() => onSelectView?.('diagnostics')}
                title={`Open Diagnostics (In Development)`}
              >
                <span>Diagnostics (In Development)</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

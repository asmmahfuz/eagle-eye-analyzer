import React from 'react';
import { Sliders, Info } from '../Icons';

export const CadInspectorStandby: React.FC = () => {
  return (
    <div className="cad-inspector-empty-wrapper">
      <div className="cad-inspector-empty-state">
        <div className="cad-empty-icon-wrap">
          <Sliders size={18} />
        </div>
        <div className="cad-empty-text-wrap">
          <p className="cad-empty-title">No Active Parameter</p>
          <p className="cad-empty-desc">Open an Eagle Eye test workbook to view channel identity, 3-sigma statistical limits, and measured telemetry.</p>
        </div>
      </div>

      <div className="cad-property-grid" style={{ opacity: 0.7 }}>
        <div className="cad-prop-group">
          <div className="cad-prop-group-header">
            <span className="cad-prop-chevron">▾</span>
            <span className="cad-prop-group-title">Channel Identity</span>
            <span className="cad-prop-tag-idle">STANDBY</span>
          </div>
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Tag Name</td>
                <td className="cad-prop-val font-mono text-dim">--</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Subsystem</td>
                <td className="cad-prop-val font-mono text-dim">--</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Engineering Unit</td>
                <td className="cad-prop-val font-mono text-dim">--</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cad-prop-group">
          <div className="cad-prop-group-header">
            <span className="cad-prop-chevron">▾</span>
            <span className="cad-prop-group-title">Tolerance Envelopes</span>
            <span className="cad-prop-tag-idle">STANDBY</span>
          </div>
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Statistical Limits</td>
                <td className="cad-prop-val font-mono text-dim">±3σ Bounds</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Physical Envelope</td>
                <td className="cad-prop-val font-mono text-dim">Hard Clamps</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Settling Delta</td>
                <td className="cad-prop-val font-mono text-dim">--</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cad-prop-group">
          <div className="cad-prop-group-header">
            <span className="cad-prop-chevron">▾</span>
            <span className="cad-prop-group-title">Modbus Register Map</span>
            <span className="cad-prop-tag-idle">STANDBY</span>
          </div>
          <table className="cad-prop-table">
            <tbody>
              <tr>
                <td className="cad-prop-key">Register Address</td>
                <td className="cad-prop-val font-mono text-dim">--</td>
              </tr>
              <tr>
                <td className="cad-prop-key">Signal Format</td>
                <td className="cad-prop-val font-mono text-dim">Holding Registers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="cad-inspector-hint-box" style={{ marginTop: '10px' }}>
        <Info size={13} className="text-cyan flex-shrink-0" />
        <span>Select any channel from the left <strong>Workspace Tree</strong> or interactive charts to inspect telemetry envelopes and settling statistics.</span>
      </div>
    </div>
  );
};

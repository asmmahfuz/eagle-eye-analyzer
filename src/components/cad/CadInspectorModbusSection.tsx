import React from 'react';
import { ParameterSummary } from '../../types';
import { getRegisterByName } from '../../engine/registers';

interface CadInspectorModbusSectionProps {
  selectedSensor: string;
  summary: ParameterSummary;
  showModbusOverlays?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onOpenTerminalModbus?: () => void;
}

export const CadInspectorModbusSection: React.FC<CadInspectorModbusSectionProps> = ({
  selectedSensor,
  summary,
  showModbusOverlays = false,
  isOpen,
  onToggle,
  onOpenTerminalModbus
}) => {
  const reg = getRegisterByName(selectedSensor);

  return (
    <div className="cad-prop-group">
      <div
        className="cad-prop-group-header"
        onClick={onToggle}
      >
        <span className="cad-prop-chevron">{isOpen ? '▾' : '▸'}</span>
        <span className="cad-prop-group-title">
          {showModbusOverlays ? 'Modbus & Signal Conditioning' : 'Signal Conditioning & Specs'}
        </span>
      </div>
      {isOpen && (
        <table className="cad-prop-table">
          <tbody>
            <tr>
              <td className="cad-prop-key">Modbus Register</td>
              <td className="cad-prop-val font-mono">
                {reg ? (
                  <button
                    type="button"
                    onClick={onOpenTerminalModbus}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-cyan, #00D2FF)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono, monospace)',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={`View Reg ${reg.address} in Terminal Modbus Map`}
                  >
                    Reg {reg.address} (View in Terminal ↓)
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Internal Metric</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Register Scaling</td>
              <td className="cad-prop-val font-mono">
                {reg ? (reg.scaling === 1 ? '1.0× (Raw/Unscaled)' : reg.scaling === 100 ? '0.01× (100 Divisor)' : `0.1× (${reg.scaling} Divisor)`) : '1.0×'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">0–10V Scaling</td>
              <td className="cad-prop-val">
                {summary.category === 'pump' || selectedSensor.includes('FCV') ? (
                  <span className="cad-active-tag">10× Normalized (0–100%)</span>
                ) : (
                  <span className="cad-dim-tag">Standard Physical</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Word Representation</td>
              <td className="cad-prop-val">
                {reg?.isSigned || selectedSensor.includes('DP') ? (
                  <span className="cad-active-tag">Signed 16-Bit (Two's Comp)</span>
                ) : (
                  <span className="cad-dim-tag">Unsigned 16-Bit Word</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Sentinel Check</td>
              <td className="cad-prop-val font-mono">
                {summary.peak === 6553.5 ? (
                  <span className="text-red font-bold">0xFFFF Disconnect</span>
                ) : (
                  <span className="text-green">Clean (No 0xFFFF)</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

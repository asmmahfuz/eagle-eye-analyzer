import React from 'react';
import { X, HelpCircle, Cpu, Layers } from '../Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CadShortcutsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div className="cad-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cad-modal-header">
          <div className="cad-modal-title">
            <HelpCircle size={16} className="text-cyan" />
            <span>Eagle Eye™ Keyboard Shortcuts</span>
          </div>
          <button className="cad-modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="cad-modal-body">
          <table className="cad-shortcuts-table">
            <thead>
              <tr>
                <th>Keybinding</th>
                <th>Action</th>
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>O</kbd></td>
                <td>Open Eagle Eye Workbook (.xlsx)</td>
                <td>Global</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
                <td>Export Multi-Sheet Quality Report (.xlsx)</td>
                <td>Global</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>R</kbd></td>
                <td>Re-run 3-Sigma SPC Audit Engine</td>
                <td>Global</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>1</kbd></td>
                <td>Toggle Left Workspace Tree Window</td>
                <td>Workspace</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>2</kbd></td>
                <td>Toggle Right Parameter Inspector Window</td>
                <td>Inspector</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>3</kbd></td>
                <td>Toggle Bottom Terminal & Build Messages Panel</td>
                <td>Terminal</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>0</kbd></td>
                <td>Reset Zoom to Extents (100% Fit)</td>
                <td>Canvas</td>
              </tr>
              <tr>
                <td><kbd>Alt</kbd> + <kbd>1</kbd></td>
                <td>Switch to Data Sheet & Operating Stages</td>
                <td>View</td>
              </tr>
              <tr>
                <td><kbd>Alt</kbd> + <kbd>2</kbd></td>
                <td>Switch to Telemetry Scope</td>
                <td>View</td>
              </tr>
              <tr>
                <td><kbd>Alt</kbd> + <kbd>3</kbd></td>
                <td>Switch to Diagnostics & Rework Punch-List</td>
                <td>View</td>
              </tr>
              <tr>
                <td><kbd>F11</kbd></td>
                <td>Toggle Fullscreen Mode</td>
                <td>Window</td>
              </tr>
              <tr>
                <td><kbd>Esc</kbd></td>
                <td>Close Dropdowns / Clear Selection</td>
                <td>Global</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cad-modal-footer">
          <button className="cad-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export { CadModbusModal } from './modbus/CadModbusModal';

export const CadAboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div className="cad-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cad-modal-header">
          <div className="cad-modal-title">
            <Layers size={16} className="text-cyan" />
            <span>About Eagle Eye™</span>
          </div>
          <button className="cad-modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="cad-modal-body">
          <div className="cad-about-brand">
            <h2 className="cad-about-title">EAGLE EYE™</h2>
            <p className="cad-about-sub">Factory Test Diagnostics & Tolerance Margin Analyzer</p>
          </div>

          <div className="cad-about-meta-list">
            <div className="cad-about-row">
              <span className="cad-about-k">Numerical Kernel:</span>
              <span className="cad-about-v">Statistical Process Control (SPC) 3-Sigma Dual Envelope</span>
            </div>
            <div className="cad-about-row">
              <span className="cad-about-k">Target Hardware:</span>
              <span className="cad-about-v">CoolIT CHx1500-2000 Liquid Cooling Distribution Units</span>
            </div>
            <div className="cad-about-row">
              <span className="cad-about-k">Program / Customer:</span>
              <span className="cad-about-v">Google Enterprise Cloud Infrastructure Quality</span>
            </div>
            <div className="cad-about-row">
              <span className="cad-about-k">Standard:</span>
              <span className="cad-about-v">ANSI/ISA-101 Industrial Human-Machine Interface Guidelines</span>
            </div>
          </div>
        </div>

        <div className="cad-modal-footer">
          <button className="cad-btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

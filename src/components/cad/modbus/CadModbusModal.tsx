import React, { useState } from 'react';
import { Cpu, X, HelpCircle, Layers, Sliders } from '../../Icons';
import { getRegisterByName } from '../../../engine/registers';
import { ModbusReadRegistersTable } from './ModbusReadRegistersTable';
import { ModbusWriteSetpointsTable } from './ModbusWriteSetpointsTable';
import { ModbusSentinelGuide } from './ModbusSentinelGuide';

export interface CadModbusModalProps {
  isOpen: boolean;
  onClose: () => void;
  showModbusOverlays?: boolean;
  onToggleModbusOverlays?: (show?: boolean) => void;
  selectedSensor?: string | null;
}

type ModbusTab = 'read' | 'write' | 'guide';

export const CadModbusModal: React.FC<CadModbusModalProps> = ({
  isOpen,
  onClose,
  showModbusOverlays = false,
  onToggleModbusOverlays,
  selectedSensor
}) => {
  const [activeTab, setActiveTab] = useState<ModbusTab>('read');

  if (!isOpen) return null;

  const currentReg = selectedSensor ? getRegisterByName(selectedSensor) : undefined;

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div 
        className="cad-modal-dialog cad-modal-lg" 
        style={{ maxWidth: '1000px', width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cad-modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '14px 20px' }}>
          <div className="cad-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} className="text-purple" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              🔒 Hidden Engineering Menu — PLC Modbus Architecture & Address Dictionary
            </span>
            <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '3px', color: '#C084FC', fontWeight: 600 }}>
              Port 502 Internal
            </span>
            <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.35)', borderRadius: '3px', color: '#38BDF8', fontWeight: 600 }}>
              Hidden Developer Scope
            </span>
          </div>
          <button className="cad-modal-close" onClick={onClose} aria-label="Close Modal">
            <X size={15} />
          </button>
        </div>

        {/* Engineering Mode Control & Active Sensor Strip */}
        <div style={{
          padding: '10px 20px',
          background: 'var(--bg-subtle, rgba(241, 245, 249, 0.6))',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Toggle for Front UI Overlays */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
                userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={showModbusOverlays}
                onChange={() => onToggleModbusOverlays?.()}
                style={{ width: '16px', height: '16px', accentColor: '#A855F7', cursor: 'pointer' }}
              />
              <span>Overlay Modbus Register Badges (Rxx) on Front Workspace</span>
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({showModbusOverlays ? 'Visible on front' : 'Hidden from front by default'})
            </span>
          </div>

          {/* Active Sensor Quick Spec */}
          {selectedSensor && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              background: 'var(--bg-panel, #ffffff)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              fontSize: '11.5px'
            }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Focused Channel:</span>
              <strong style={{ color: 'var(--text-main)' }}>{selectedSensor}</strong>
              {currentReg ? (
                <>
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#C084FC',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    Reg {currentReg.address} (0x{currentReg.address.toString(16).toUpperCase().padStart(4, '0')})
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                    Scale: {currentReg.scaling === 1 ? '1.0×' : currentReg.scaling === 100 ? '0.01×' : '0.1×'} | Unit: {currentReg.engineeringUnit || '--'}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Internal Calculated Metric</span>
              )}
            </div>
          )}
        </div>

        {/* Modal Sub-Tabs */}
        <div className="cad-modal-tabs" style={{ display: 'flex', gap: '4px', padding: '10px 20px 0', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
          <button
            className={`cad-tab-btn ${activeTab === 'read' ? 'active' : ''}`}
            onClick={() => setActiveTab('read')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'read' ? 600 : 400,
              background: activeTab === 'read' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'read' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'read' ? 'var(--accent-purple, #A855F7)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} />
            <span>Read Holding Registers (Addresses 0–61)</span>
          </button>

          <button
            className={`cad-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => setActiveTab('write')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'write' ? 600 : 400,
              background: activeTab === 'write' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'write' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'write' ? 'var(--accent-purple, #A855F7)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sliders size={13} />
            <span>Excitation Write Setpoints (Registers 200–202)</span>
          </button>

          <button
            className={`cad-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'guide' ? 600 : 400,
              background: activeTab === 'guide' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'guide' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'guide' ? 'var(--accent-purple, #A855F7)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <HelpCircle size={13} />
            <span>Protocol & Sentinel Rules</span>
          </button>
        </div>

        <div className="cad-modal-body" style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'read' && <ModbusReadRegistersTable />}
          {activeTab === 'write' && <ModbusWriteSetpointsTable />}
          {activeTab === 'guide' && <ModbusSentinelGuide />}
        </div>

        <div className="cad-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Shortcut: <kbd style={{ padding: '1px 5px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>Ctrl</kbd> + <kbd style={{ padding: '1px 5px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>Shift</kbd> + <kbd style={{ padding: '1px 5px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '3px' }}>M</kbd>
          </span>
          <button className="cad-btn-primary" onClick={onClose}>
            Close Hidden Menu
          </button>
        </div>
      </div>
    </div>
  );
};

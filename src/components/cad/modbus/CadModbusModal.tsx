import React, { useState } from 'react';
import { Cpu, X, HelpCircle, Layers, Sliders } from '../../Icons';
import { ModbusReadRegistersTable } from './ModbusReadRegistersTable';
import { ModbusWriteSetpointsTable } from './ModbusWriteSetpointsTable';
import { ModbusSentinelGuide } from './ModbusSentinelGuide';

export interface CadModbusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModbusTab = 'read' | 'write' | 'guide';

export const CadModbusModal: React.FC<CadModbusModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ModbusTab>('read');

  if (!isOpen) return null;

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div 
        className="cad-modal-dialog cad-modal-lg" 
        style={{ maxWidth: '980px', width: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cad-modal-header">
          <div className="cad-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} className="text-purple" />
            <span style={{ fontWeight: 700 }}>PLC Modbus Register Dictionary & Hardware Address Overlays</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '3px', color: '#C084FC' }}>
              CHx2000 Config Golden Spec
            </span>
          </div>
          <button className="cad-modal-close" onClick={onClose} aria-label="Close Modal">
            <X size={14} />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="cad-modal-tabs" style={{ display: 'flex', gap: '4px', padding: '10px 16px 0', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-subtle)' }}>
          <button
            className={`cad-tab-btn ${activeTab === 'read' ? 'active' : ''}`}
            onClick={() => setActiveTab('read')}
            style={{
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: activeTab === 'read' ? 600 : 400,
              background: activeTab === 'read' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'read' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'read' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} />
            <span>Read Holding Registers (49)</span>
          </button>

          <button
            className={`cad-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => setActiveTab('write')}
            style={{
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: activeTab === 'write' ? 600 : 400,
              background: activeTab === 'write' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'write' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'write' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sliders size={13} />
            <span>Write Setpoints (3)</span>
          </button>

          <button
            className={`cad-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: activeTab === 'guide' ? 600 : 400,
              background: activeTab === 'guide' ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid',
              borderColor: activeTab === 'guide' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
              borderRadius: '4px 4px 0 0',
              color: activeTab === 'guide' ? 'var(--accent-cyan)' : 'var(--text-muted)',
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

        <div className="cad-modal-body" style={{ padding: '16px' }}>
          {activeTab === 'read' && <ModbusReadRegistersTable />}
          {activeTab === 'write' && <ModbusWriteSetpointsTable />}
          {activeTab === 'guide' && <ModbusSentinelGuide />}
        </div>

        <div className="cad-modal-footer">
          <button className="cad-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

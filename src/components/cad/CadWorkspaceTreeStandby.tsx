import React from 'react';
import {
  Search,
  Upload,
  Droplets,
  Sliders,
  Thermometer,
  Gauge,
  Wind,
  Cpu
} from '../Icons';

export interface CadWorkspaceTreeStandbyProps {
  onOpenFileClick: () => void;
}

export const CadWorkspaceTreeStandby: React.FC<CadWorkspaceTreeStandbyProps> = ({ onOpenFileClick }) => {
  return (
    <div className="cad-tree-idle-wrapper">
      <div className="cad-tree-toolbar">
        <div className="cad-search-input-wrap">
          <Search size={12} className="cad-search-icon" />
          <input
            type="text"
            className="cad-search-input"
            placeholder="Channels awaiting workbook..."
            disabled
          />
        </div>
        <div className="cad-filter-pills-row">
          <span className="cad-filter-chip" style={{ opacity: 0.6, cursor: 'default' }}>All (0)</span>
          <span className="cad-filter-chip" style={{ opacity: 0.6, cursor: 'default' }}>Failed (0)</span>
          <span className="cad-filter-chip" style={{ opacity: 0.6, cursor: 'default' }}>Passed (0)</span>
        </div>
      </div>

      <div className="cad-tree-scroll-content">
        <div className="cad-tree-empty-state">
          <div className="cad-empty-icon-wrap">
            <Upload size={18} />
          </div>
          <div className="cad-empty-text-wrap">
            <p className="cad-empty-title">No Workbook Loaded</p>
            <p className="cad-empty-desc">Open an Eagle Eye test workbook (.xlsx) to view channels and subsystems.</p>
          </div>
          <button className="cad-tree-open-btn" onClick={onOpenFileClick}>
            <Upload size={12} />
            <span>Open Workbook</span>
          </button>
        </div>

        <div className="cad-tree-placeholder-section">
          <div className="cad-tree-placeholder-title">STANDBY SUBSYSTEMS (50 CH)</div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#00D2FF' }}><Droplets size={12} /></span>
            <span className="cad-cat-title">Hydraulic & DP</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#60A5FA' }}><Sliders size={12} /></span>
            <span className="cad-cat-title">Pump Speeds & VFD</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#F97316' }}><Thermometer size={12} /></span>
            <span className="cad-cat-title">Temperature Transmitters</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#A855F7' }}><Gauge size={12} /></span>
            <span className="cad-cat-title">Pressure Transmitters</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#EAB308' }}><Wind size={12} /></span>
            <span className="cad-cat-title">Environmental & Ambient</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
          <div className="cad-cat-header placeholder">
            <span className="cad-cat-chevron">▸</span>
            <span className="cad-cat-icon" style={{ color: '#38BDF8' }}><Cpu size={12} /></span>
            <span className="cad-cat-title">System & Discrete I/O</span>
            <span className="cad-cat-idle-badge">Standby</span>
          </div>
        </div>
      </div>
    </div>
  );
};

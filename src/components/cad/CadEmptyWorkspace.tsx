import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Droplets, 
  Sliders, 
  Activity, 
  ShieldAlert, 
  FileSpreadsheet 
} from '../Icons';

interface CadEmptyWorkspaceProps {
  onOpenFileClick: () => void;
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  uploadError: string | null;
  onClearError: () => void;
  onLoadSample?: (name?: string) => void;
}

export const CadEmptyWorkspace: React.FC<CadEmptyWorkspaceProps> = ({
  onOpenFileClick,
  onFileUpload,
  isLoading,
  uploadError,
  onClearError,
  onLoadSample
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm')) {
        onFileUpload(file);
      }
    }
  };

  return (
    <div className="cad-empty-workspace-container">
      {/* Brand Header */}
      <div className="cad-empty-header-block">
        <div className="cad-empty-brand-badge">⚡</div>
        <div className="cad-empty-header-text">
          <div className="cad-empty-title-row">
            <h1 className="cad-empty-title-main">EAGLE EYE™</h1>
            <span className="cad-empty-status-tag">AWAITING INGESTION</span>
          </div>
          <p className="cad-empty-subtitle">
            Coolant Distribution Unit (CDU) Factory Test Diagnostics & Tolerance Margin Analyzer
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="cad-upload-error-banner">
          <ShieldAlert size={14} className="text-red flex-shrink-0" />
          <span className="cad-upload-error-text">{uploadError}</span>
          <button className="cad-error-dismiss-btn" onClick={onClearError}>✕</button>
        </div>
      )}

      {/* Primary Ingestion Drag & Drop Zone */}
      <div 
        ref={dropRef}
        className={`cad-drag-drop-zone ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={onOpenFileClick}
      >
        <div className="cad-drop-icon-wrap">
          <Upload size={22} className="cad-drop-icon" />
        </div>

        <div className="cad-drop-text-group">
          <h2 className="cad-drop-title">
            {isLoading ? 'Analyzing Workbook...' : 'Open Factory Test Workbook'}
          </h2>
          <p className="cad-drop-sub">
            Drag and drop an Eagle Eye diagnostic export (<code>.xlsx</code>, <code>.xls</code>, <code>.xlsm</code>) here, or click to browse
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="cad-drop-browse-btn"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onOpenFileClick();
            }}
          >
            <FileSpreadsheet size={13} style={{ marginRight: 6 }} />
            {isLoading ? 'Processing...' : 'Browse Local Files'}
          </button>

          {onLoadSample && (
            <button 
              className="cad-drop-browse-btn"
              disabled={isLoading}
              style={{ background: 'rgba(0, 210, 255, 0.15)', borderColor: 'rgba(0, 210, 255, 0.4)', color: 'var(--text-main)' }}
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('SEQ-G659-CD050L.xlsx');
              }}
              title="Load standard CDU test run (CD050L)"
            >
              <Upload size={13} style={{ marginRight: 6 }} />
              Load Sample (CD050L)
            </button>
          )}
        </div>

        <span className="cad-drop-hint">
          Evaluates all 50 PLC sensor channels across 10 operating stages with statistical 3-sigma tolerance envelopes
        </span>
      </div>

      {/* Feature Capability Cards */}
      <div className="cad-capabilities-grid">
        <div className="cad-cap-card">
          <div className="cad-cap-icon-box text-cyan">
            <Droplets size={16} />
          </div>
          <div className="cad-cap-text">
            <h3 className="cad-cap-title">Subsystem Domain Partitioning</h3>
            <p className="cad-cap-desc">
              Hydraulic DP, Pump Speeds, Temperatures, Pressures & Ambient.
            </p>
          </div>
        </div>

        <div className="cad-cap-card">
          <div className="cad-cap-icon-box text-green">
            <Activity size={16} />
          </div>
          <div className="cad-cap-text">
            <h3 className="cad-cap-title">Statistical 3-Sigma Margins</h3>
            <p className="cad-cap-desc">
              Evaluates measurements against statistical ±3σ bounds & physical limits.
            </p>
          </div>
        </div>

        <div className="cad-cap-card">
          <div className="cad-cap-icon-box text-blue">
            <Sliders size={16} />
          </div>
          <div className="cad-cap-text">
            <h3 className="cad-cap-title">Automated Signal Conditioning</h3>
            <p className="cad-cap-desc">
              Normalizes 0–10V pump commands and decodes Modbus two's complement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

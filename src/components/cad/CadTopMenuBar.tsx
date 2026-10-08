import React, { useState, useEffect, useRef } from 'react';
import { CadMainView, SubsystemCategory, SUBSYSTEM_LABELS } from '../../types';
import {
  FileSpreadsheet,
  FolderOpen,
  Save,
  Play,
  RotateCcw,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  HelpCircle,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table,
  Activity,
  Cpu,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Crosshair,
  BarChart2,
  ShieldAlert
} from '../Icons';

interface CadTopMenuBarProps {
  onOpenFileClick: () => void;
  onExport: () => void;
  onRunAudit: () => void;
  onResetView: () => void;
  activeView: CadMainView;
  onSelectView: (view: CadMainView) => void;
  showLeftDock: boolean;
  onToggleLeftDock: () => void;
  showRightDock: boolean;
  onToggleRightDock: () => void;
  showBottomDock: boolean;
  onToggleBottomDock: () => void;
  onOpenShortcuts: () => void;
  onOpenModbusMap: () => void;
  onOpenAbout: () => void;
  filename?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  selectedSensor?: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onClearSensor?: () => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  hasDataset?: boolean;
  onLoadSample?: (name?: string) => void;
}

export const CadTopMenuBar: React.FC<CadTopMenuBarProps> = ({
  onOpenFileClick,
  onExport,
  onRunAudit,
  onResetView,
  activeView,
  onSelectView,
  showLeftDock,
  onToggleLeftDock,
  showRightDock,
  onToggleRightDock,
  showBottomDock,
  onToggleBottomDock,
  onOpenShortcuts,
  onOpenModbusMap,
  onOpenAbout,
  filename,
  theme = 'light',
  onToggleTheme,
  selectedSensor,
  selectedSubsystem = null,
  onSelectSubsystem,
  onClearSensor,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  hasDataset,
  onLoadSample
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(prev => (prev === menuName ? null : menuName));
  };

  const handleMenuHover = (menuName: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuName);
    }
  };

  const executeAction = (action: () => void) => {
    setOpenMenu(null);
    action();
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  return (
    <div className="cad-menu-strip-container" ref={menuBarRef}>
      {/* Top Application Window Bar */}
      <div className="cad-window-titlebar">
        <div className="cad-titlebar-left">
          <div className="cad-brand-logo">
            <span className="cad-logo-glyph">⚡</span>
            <span className="cad-logo-text">EAGLE EYE™</span>
          </div>

          {/* Quick Access Toolbar directly alongside App Name */}
          <div className="cad-titlebar-quick-toolbar" role="toolbar" aria-label="Quick Access Shortcuts">
            {/* Primary Operations */}
            <div className="cad-title-btn-group">
              <button
                className="cad-title-icon-btn cad-btn-open"
                onClick={onOpenFileClick}
                title="Open Workbook (.xlsx) [Ctrl+O]"
                aria-label="Open Workbook"
              >
                <FolderOpen size={13} />
              </button>
              <button
                className={`cad-title-icon-btn cad-btn-save ${!hasDataset ? 'disabled' : ''}`}
                onClick={hasDataset ? onExport : undefined}
                disabled={!hasDataset}
                title="Export Multi-Sheet Quality Report (.xlsx) [Ctrl+S]"
                aria-label="Export Report"
              >
                <Save size={13} />
              </button>
              <button
                className={`cad-title-icon-btn cad-btn-run ${!hasDataset ? 'disabled' : ''}`}
                onClick={hasDataset ? onRunAudit : undefined}
                disabled={!hasDataset}
                title="Run Automated 3-Sigma SPC Audit [Ctrl+R]"
                aria-label="Run 3-Sigma SPC Audit"
              >
                <Play size={11} />
              </button>
              <button
                className="cad-title-icon-btn cad-btn-reset"
                onClick={onResetView}
                title="Reset Dock Layout & View [Ctrl+0]"
                aria-label="Reset Layout"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <span className="cad-title-toolbar-sep"></span>

            {/* Quick Access View Switcher Strip for the 3 Consolidated Tabs */}
            <div className="cad-title-btn-group cad-title-view-switcher" role="radiogroup" aria-label="Consolidated Canvas Views">
              <button
                className={`cad-title-icon-btn cad-view-btn cad-btn-datasheet ${activeView === 'datasheet' ? 'active' : ''}`}
                onClick={() => onSelectView('datasheet')}
                title="Data Sheet & Operating Stages [Alt+1]"
                aria-label="Data Sheet & Operating Stages"
              >
                <BarChart2 size={12} />
                <span className="cad-title-btn-label">Data Sheet</span>
              </button>
              <button
                className={`cad-title-icon-btn cad-view-btn cad-btn-telemetry ${activeView === 'telemetry' ? 'active' : ''}`}
                onClick={() => onSelectView('telemetry')}
                title="Telemetry Scope [Alt+2]"
                aria-label="Telemetry Scope"
              >
                <Activity size={12} />
                <span className="cad-title-btn-label">Telemetry</span>
              </button>
              <button
                className={`cad-title-icon-btn cad-view-btn cad-btn-diagnostics ${activeView === 'diagnostics' ? 'active' : ''}`}
                onClick={() => onSelectView('diagnostics')}
                title="Diagnostics & Rework Punch-List [Alt+3]"
                aria-label="Diagnostics & Rework Punch-List"
              >
                <AlertTriangle size={12} />
                <span className="cad-title-btn-label">Diagnostics</span>
              </button>
            </div>

            {onZoomIn && onZoomOut && onZoomReset && (
              <>
                <span className="cad-title-toolbar-sep"></span>
                {/* Zoom Controls */}
                <div className="cad-title-btn-group">
                  <button
                    className="cad-title-icon-btn cad-btn-zoom-out"
                    onClick={onZoomOut}
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <button
                    className="cad-title-zoom-chip"
                    onClick={onZoomReset}
                    title="Current Zoom Level (Click to Reset 100%)"
                  >
                    {Math.round((zoomLevel ?? 1) * 100)}%
                  </button>
                  <button
                    className="cad-title-icon-btn cad-btn-zoom-in"
                    onClick={onZoomIn}
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    className="cad-title-icon-btn cad-btn-extents"
                    onClick={onZoomReset}
                    title="Zoom Extents (100% Fit) [Ctrl+0]"
                    aria-label="Zoom Extents"
                  >
                    <Crosshair size={13} />
                  </button>
                </div>
              </>
            )}
          </div>

          {filename && (
            <>
              <span className="cad-title-separator">|</span>

              {/* Document & View Breadcrumb (Displayed when a workbook is loaded) */}
              <div className="cad-titlebar-breadcrumb" title={`Active File: ${filename}`}>
                <FileSpreadsheet size={12} className="cad-breadcrumb-icon" />
                <span className="cad-breadcrumb-doc">{filename}</span>
                {selectedSubsystem && (
                  <>
                    <span className="cad-breadcrumb-arrow">›</span>
                    <span className="cad-breadcrumb-subsystem text-cyan font-bold" title={`Subsystem: ${SUBSYSTEM_LABELS[selectedSubsystem]}`}>
                      {SUBSYSTEM_LABELS[selectedSubsystem]}
                    </span>
                  </>
                )}
                <span className="cad-breadcrumb-arrow">›</span>
                <span className="cad-breadcrumb-view">
                  {activeView === 'datasheet' && 'Data Sheet & Stages'}
                  {activeView === 'telemetry' && (selectedSensor ? `Scope: ${selectedSensor}` : 'Telemetry Scope')}
                  {activeView === 'diagnostics' && 'Diagnostics & Punch-List'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="cad-titlebar-right">
          {onToggleTheme && (
            <button
              className="cad-theme-pill-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={12} /> : <Sun size={12} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          )}
          <div className="cad-window-ctrl-buttons">
            <button className="cad-win-btn" title="Minimize" onClick={() => { }}>─</button>
            <button className="cad-win-btn" title="Maximize / Restore" onClick={handleFullscreen}>▢</button>
            <button className="cad-win-btn cad-win-btn-close" title="Close" onClick={() => window.close()}>✕</button>
          </div>
        </div>
      </div>


      {/* Thin Dropdown Menu Bar (NO RIBBON) */}
      <nav className="cad-thin-menubar" role="menubar">
        {/* FILE MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'file' ? 'active' : ''}`}
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuHover('file')}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(onOpenFileClick)}>
                <span className="cad-dd-icon"><Upload size={14} /></span>
                <span className="cad-dd-label">Open Workbook (.xlsx)...</span>
                <span className="cad-dd-shortcut">Ctrl+O</span>
              </button>
              {onLoadSample && (
                <button className="cad-dropdown-item" onClick={() => executeAction(() => onLoadSample('SEQ-G659-CD050L.xlsx'))}>
                  <span className="cad-dd-icon"><FileSpreadsheet size={14} /></span>
                  <span className="cad-dd-label">Load Sample (CD050L)...</span>
                </button>
              )}
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(onExport)}>
                <span className="cad-dd-icon"><Download size={14} /></span>
                <span className="cad-dd-label">Export Multi-Sheet Report (.xlsx)</span>
                <span className="cad-dd-shortcut">Ctrl+S</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => window.print())}>
                <span className="cad-dd-icon"><Table size={14} /></span>
                <span className="cad-dd-label">Print / Physical Signoff Report</span>
                <span className="cad-dd-shortcut">Ctrl+P</span>
              </button>
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(onResetView)}>
                <span className="cad-dd-icon"><RefreshCw size={14} /></span>
                <span className="cad-dd-label">Close / Reset Workbook</span>
              </button>
            </div>
          )}
        </div>

        {/* HOME MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'home' ? 'active' : ''}`}
            onClick={() => toggleMenu('home')}
            onMouseEnter={() => handleMenuHover('home')}
          >
            Home
          </button>
          {openMenu === 'home' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('datasheet'))}>
                <span className="cad-dd-icon"><BarChart2 size={14} /></span>
                <span className="cad-dd-label">Data Sheet & Operating Stages</span>
                <span className="cad-dd-check">{activeView === 'datasheet' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+1</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><Activity size={14} /></span>
                <span className="cad-dd-label">Telemetry Scope</span>
                <span className="cad-dd-check">{activeView === 'telemetry' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+2</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('diagnostics'))}>
                <span className="cad-dd-icon"><AlertTriangle size={14} /></span>
                <span className="cad-dd-label">Diagnostics & Rework Punch-List</span>
                <span className="cad-dd-check">{activeView === 'diagnostics' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+3</span>
              </button>
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(onRunAudit)}>
                <span className="cad-dd-icon"><RefreshCw size={14} /></span>
                <span className="cad-dd-label">Run Full 3-Sigma SPC Audit</span>
                <span className="cad-dd-shortcut">Ctrl+R</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'view' ? 'active' : ''}`}
            onClick={() => toggleMenu('view')}
            onMouseEnter={() => handleMenuHover('view')}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(onToggleLeftDock)}>
                <span className="cad-dd-icon"><PanelLeft size={14} /></span>
                <span className="cad-dd-label">Workspace Tree (Left Window)</span>
                <span className="cad-dd-check">{showLeftDock ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Ctrl+1</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onToggleRightDock)}>
                <span className="cad-dd-icon"><PanelRight size={14} /></span>
                <span className="cad-dd-label">Parameter Inspector (Right Window)</span>
                <span className="cad-dd-check">{showRightDock ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Ctrl+2</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onToggleBottomDock)}>
                <span className="cad-dd-icon"><PanelBottom size={14} /></span>
                <span className="cad-dd-label">Diagnostic Terminal (Bottom Window)</span>
                <span className="cad-dd-check">{showBottomDock ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Ctrl+3</span>
              </button>
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(handleFullscreen)}>
                <span className="cad-dd-icon"><Maximize2 size={14} /></span>
                <span className="cad-dd-label">Toggle Fullscreen</span>
                <span className="cad-dd-shortcut">F11</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onResetView)}>
                <span className="cad-dd-icon"><RefreshCw size={14} /></span>
                <span className="cad-dd-label">Reset Dock Layout & Zoom</span>
                <span className="cad-dd-shortcut">Ctrl+0</span>
              </button>
              {onToggleTheme && (
                <>
                  <div className="cad-dd-divider"></div>
                  <button className="cad-dropdown-item" onClick={() => executeAction(onToggleTheme)}>
                    <span className="cad-dd-icon">{theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}</span>
                    <span className="cad-dd-label">Color Theme: {theme === 'light' ? 'Dark Mode' : 'Comfortable Light'}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ANALYSIS MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'analysis' ? 'active' : ''}`}
            onClick={() => toggleMenu('analysis')}
            onMouseEnter={() => handleMenuHover('analysis')}
          >
            Analysis
          </button>
          {openMenu === 'analysis' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><Activity size={14} /></span>
                <span className="cad-dd-label">3-Sigma Statistical Tolerance Envelope (±3σ)</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><Sliders size={14} /></span>
                <span className="cad-dd-label">VFD 0–10V Analog Scaling (10x Normalizer)</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><RefreshCw size={14} /></span>
                <span className="cad-dd-label">Modbus Unsigned 16-Bit Rollover Decoder</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><AlertTriangle size={14} /></span>
                <span className="cad-dd-label">Modbus 0xFFFF Hardware Sentinel Filter</span>
              </button>
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('datasheet'))}>
                <span className="cad-dd-icon"><Table size={14} /></span>
                <span className="cad-dd-label">10-Stage Operating Conditions Matrix</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('diagnostics'))}>
                <span className="cad-dd-icon"><AlertTriangle size={14} /></span>
                <span className="cad-dd-label">Subsystem Failure Root-Cause Attribution</span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'tools' ? 'active' : ''}`}
            onClick={() => toggleMenu('tools')}
            onMouseEnter={() => handleMenuHover('tools')}
          >
            Tools
          </button>
          {openMenu === 'tools' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(onOpenModbusMap)}>
                <span className="cad-dd-icon"><Cpu size={14} /></span>
                <span className="cad-dd-label">Modbus Holding Register Map (Port 502)</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onToggleBottomDock)}>
                <span className="cad-dd-icon"><Layers size={14} /></span>
                <span className="cad-dd-label">Raw Terminal Telemetry Log Stream</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onRunAudit)}>
                <span className="cad-dd-icon"><CheckCircle2 size={14} /></span>
                <span className="cad-dd-label">Run Automated SPC Audit Verification</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onExport)}>
                <span className="cad-dd-icon"><Download size={14} /></span>
                <span className="cad-dd-label">Generate Multi-Sheet Excel Verification File</span>
              </button>
            </div>
          )}
        </div>

        {/* WINDOW MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'window' ? 'active' : ''}`}
            onClick={() => toggleMenu('window')}
            onMouseEnter={() => handleMenuHover('window')}
          >
            Window
          </button>
          {openMenu === 'window' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('datasheet'))}>
                <span className="cad-dd-icon"><BarChart2 size={14} /></span>
                <span className="cad-dd-label">Switch to: Data Sheet & Operating Stages</span>
                <span className="cad-dd-check">{activeView === 'datasheet' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+1</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('telemetry'))}>
                <span className="cad-dd-icon"><Activity size={14} /></span>
                <span className="cad-dd-label">Switch to: Telemetry Scope</span>
                <span className="cad-dd-check">{activeView === 'telemetry' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+2</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => onSelectView('diagnostics'))}>
                <span className="cad-dd-icon"><AlertTriangle size={14} /></span>
                <span className="cad-dd-label">Switch to: Diagnostics & Rework Punch-List</span>
                <span className="cad-dd-check">{activeView === 'diagnostics' ? '✓' : ''}</span>
                <span className="cad-dd-shortcut">Alt+3</span>
              </button>
              <div className="cad-dd-divider"></div>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => {
                if (!showLeftDock) onToggleLeftDock();
                if (!showRightDock) onToggleRightDock();
                if (!showBottomDock) onToggleBottomDock();
              })}>
                <span className="cad-dd-label">Show & Dock All Side Windows</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(() => {
                if (showLeftDock) onToggleLeftDock();
                if (showRightDock) onToggleRightDock();
                if (showBottomDock) onToggleBottomDock();
              })}>
                <span className="cad-dd-label">Collapse All Side Windows (Max Canvas)</span>
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="cad-menu-item-wrapper">
          <button
            className={`cad-menu-btn ${openMenu === 'help' ? 'active' : ''}`}
            onClick={() => toggleMenu('help')}
            onMouseEnter={() => handleMenuHover('help')}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="cad-dropdown-menu">
              <button className="cad-dropdown-item" onClick={() => executeAction(onOpenShortcuts)}>
                <span className="cad-dd-icon"><HelpCircle size={14} /></span>
                <span className="cad-dd-label">Keyboard Shortcuts</span>
                <span className="cad-dd-shortcut">F1</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onOpenModbusMap)}>
                <span className="cad-dd-icon"><Cpu size={14} /></span>
                <span className="cad-dd-label">CDU Modbus & PLC Architecture</span>
              </button>
              <button className="cad-dropdown-item" onClick={() => executeAction(onOpenAbout)}>
                <span className="cad-dd-icon"><HelpCircle size={14} /></span>
                <span className="cad-dd-label">About Eagle Eye™ Analyzer</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

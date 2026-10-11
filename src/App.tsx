import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { EagleEyeDataset, CadMainView, SubsystemCategory } from './types';
import { parseEagleEyeWorkbook } from './engine/parser';
import { exportAnalysisExcel } from './engine/exporter';
import { CduModelId } from './engine/models/modelTypes';
import { detectModelFromWorkbook, getModelProfile } from './engine/models/modelRegistry';

import { CadTopMenuBar } from './components/cad/CadTopMenuBar';
import { CadWorkspaceTree } from './components/cad/CadWorkspaceTree';
import { CadParameterInspector } from './components/cad/CadParameterInspector';
import { CadTerminalPanel } from './components/cad/CadTerminalPanel';
import { CadTabbedCanvas } from './components/cad/CadTabbedCanvas';
import { CadStatusBar } from './components/cad/CadStatusBar';
import { CadShortcutsModal, CadAboutModal } from './components/cad/CadModals';
import { TerminalTab } from './components/cad/CadTerminalPanel';
import { CadSplitter } from './components/cad/CadSplitter';
import { Minimize2 } from './components/Icons';

export const App: React.FC = () => {
  // Clean workstation state: Starts with 0 preloaded data awaiting user ingestion
  const [dataset, setDataset] = useState<EagleEyeDataset | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemCategory | null>(null);
  const [activeView, setActiveView] = useState<CadMainView>('datasheet');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Multi-Model CDU Architecture Schema (Phase 13)
  const [activeModelId, setActiveModelId] = useState<CduModelId>('CHx2000');
  const [detectedModelId, setDetectedModelId] = useState<CduModelId>('CHx2000');

  // Multi-window Dock Visibility States
  const [showLeftDock, setShowLeftDock] = useState<boolean>(() => {
    return localStorage.getItem('eagle-eye-show-left-dock') !== 'false';
  });
  const [showMiddleDock, setShowMiddleDock] = useState<boolean>(() => {
    return localStorage.getItem('eagle-eye-show-middle-dock') !== 'false';
  });
  const [showRightDock, setShowRightDock] = useState<boolean>(() => {
    return localStorage.getItem('eagle-eye-show-right-dock') !== 'false';
  });
  const [showBottomDock, setShowBottomDock] = useState<boolean>(() => {
    return localStorage.getItem('eagle-eye-show-bottom-dock') !== 'false';
  });

  // Dock Window Sizing States (draggable splitters)
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('eagle-eye-dock-left-width');
    const parsed = saved ? parseInt(saved, 10) : 280;
    return isNaN(parsed) || parsed < 180 || parsed > 800 ? 280 : parsed;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem('eagle-eye-dock-right-width');
    const parsed = saved ? parseInt(saved, 10) : 310;
    return isNaN(parsed) || parsed < 200 || parsed > 800 ? 310 : parsed;
  });
  const [bottomHeight, setBottomHeight] = useState<number>(() => {
    const saved = localStorage.getItem('eagle-eye-dock-bottom-height');
    const parsed = saved ? parseInt(saved, 10) : 240;
    return isNaN(parsed) || parsed < 100 || parsed > 800 ? 240 : parsed;
  });

  // Minimized Windows States
  const [minimizedWindows, setMinimizedWindows] = useState<{
    left: boolean;
    middle: boolean;
    right: boolean;
    bottom: boolean;
  }>({
    left: false,
    middle: false,
    right: false,
    bottom: false
  });

  // Maximized / Full App Screen State ('none' | 'left' | 'middle' | 'right' | 'bottom')
  const [maximizedWindow, setMaximizedWindow] = useState<'none' | 'left' | 'middle' | 'right' | 'bottom'>('none');

  const workspaceRef = useRef<HTMLElement>(null);

  const handleToggleLeftDock = () => {
    setShowLeftDock(prev => {
      const next = !prev;
      localStorage.setItem('eagle-eye-show-left-dock', String(next));
      return next;
    });
  };
  const handleToggleMiddleDock = () => {
    setShowMiddleDock(prev => {
      const next = !prev;
      localStorage.setItem('eagle-eye-show-middle-dock', String(next));
      return next;
    });
  };
  const handleToggleRightDock = () => {
    setShowRightDock(prev => {
      const next = !prev;
      localStorage.setItem('eagle-eye-show-right-dock', String(next));
      return next;
    });
  };
  const handleToggleBottomDock = () => {
    setShowBottomDock(prev => {
      const next = !prev;
      localStorage.setItem('eagle-eye-show-bottom-dock', String(next));
      return next;
    });
  };

  const handleToggleMinimize = (win: 'left' | 'middle' | 'right' | 'bottom') => {
    if (maximizedWindow === win) {
      setMaximizedWindow('none');
    }
    setMinimizedWindows(prev => ({
      ...prev,
      [win]: !prev[win]
    }));
  };

  const handleToggleMaximize = (win: 'left' | 'middle' | 'right' | 'bottom') => {
    setMaximizedWindow(prev => {
      if (prev === win) return 'none';
      setMinimizedWindows(m => ({ ...m, [win]: false }));
      return win;
    });
  };

  // Cached workspace rect and active values for 60fps/120fps butter-smooth resizing
  const cachedRectRef = useRef<DOMRect | null>(null);
  const currentLeftWidthRef = useRef<number>(leftWidth);
  const currentRightWidthRef = useRef<number>(rightWidth);
  const currentBottomHeightRef = useRef<number>(bottomHeight);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    currentLeftWidthRef.current = leftWidth;
    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty('--left-width', `${leftWidth}px`);
    }
  }, [leftWidth]);

  useEffect(() => {
    currentRightWidthRef.current = rightWidth;
    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty('--right-width', `${rightWidth}px`);
    }
  }, [rightWidth]);

  useEffect(() => {
    currentBottomHeightRef.current = bottomHeight;
    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty('--bottom-height', `${bottomHeight}px`);
    }
  }, [bottomHeight]);

  const handleDragStart = () => {
    if (workspaceRef.current) {
      cachedRectRef.current = workspaceRef.current.getBoundingClientRect();
    }
  };

  const handleResizeLeftMove = (clientX: number) => {
    if (!workspaceRef.current) return;
    const rect = cachedRectRef.current || workspaceRef.current.getBoundingClientRect();
    cachedRectRef.current = rect;
    const newWidth = Math.round(clientX - rect.left);
    const minWidth = 180;
    const maxWidth = Math.max(minWidth, Math.min(700, rect.width - currentRightWidthRef.current - 250));
    const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));
    currentLeftWidthRef.current = clamped;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (workspaceRef.current) {
        workspaceRef.current.style.setProperty('--left-width', `${clamped}px`);
      }
    });
  };

  const handleResizeLeftEnd = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const finalVal = currentLeftWidthRef.current;
    setLeftWidth(finalVal);
    localStorage.setItem('eagle-eye-dock-left-width', String(finalVal));
    cachedRectRef.current = null;
  };

  const handleResizeRightMove = (clientX: number) => {
    if (!workspaceRef.current) return;
    const rect = cachedRectRef.current || workspaceRef.current.getBoundingClientRect();
    cachedRectRef.current = rect;
    const newWidth = Math.round(rect.right - clientX);
    const minWidth = 200;
    const maxWidth = Math.max(minWidth, Math.min(700, rect.width - currentLeftWidthRef.current - 250));
    const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));
    currentRightWidthRef.current = clamped;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (workspaceRef.current) {
        workspaceRef.current.style.setProperty('--right-width', `${clamped}px`);
      }
    });
  };

  const handleResizeRightEnd = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const finalVal = currentRightWidthRef.current;
    setRightWidth(finalVal);
    localStorage.setItem('eagle-eye-dock-right-width', String(finalVal));
    cachedRectRef.current = null;
  };

  const handleResizeBottomMove = (_clientX: number, clientY: number) => {
    if (!workspaceRef.current) return;
    const rect = cachedRectRef.current || workspaceRef.current.getBoundingClientRect();
    cachedRectRef.current = rect;
    const newHeight = Math.round(rect.bottom - clientY);
    const minHeight = 100;
    const maxHeight = Math.max(minHeight, Math.min(700, rect.height - 120));
    const clamped = Math.max(minHeight, Math.min(maxHeight, newHeight));
    currentBottomHeightRef.current = clamped;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (workspaceRef.current) {
        workspaceRef.current.style.setProperty('--bottom-height', `${clamped}px`);
      }
    });
  };

  const handleResizeBottomEnd = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const finalVal = currentBottomHeightRef.current;
    setBottomHeight(finalVal);
    localStorage.setItem('eagle-eye-dock-bottom-height', String(finalVal));
    cachedRectRef.current = null;
  };

  // Zoom & Crosshair Coordinates
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dialog Modals
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // Terminal Active Tab State ('build' | 'registers' | 'stream' | 'console' | 'raw')
  const [terminalTab, setTerminalTab] = useState<TerminalTab>('build');

  const handleOpenTerminalModbus = () => {
    setShowBottomDock(true);
    setTerminalTab('registers');
  };

  // Modbus Address Overlays (Hidden from front by default; toggled via Hidden Menu or View menu)
  const [showModbusOverlays, setShowModbusOverlays] = useState<boolean>(() => {
    return localStorage.getItem('eagle-eye-show-modbus') === 'true';
  });

  const handleToggleModbusOverlays = (val?: boolean) => {
    setShowModbusOverlays(prev => {
      const next = val !== undefined ? val : !prev;
      localStorage.setItem('eagle-eye-show-modbus', String(next));
      return next;
    });
  };

  // Comfortable light theme state by default, persisted to localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('eagle-eye-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eagle-eye-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local test workbook upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), {
        type: 'array',
        cellDates: true,
        raw: false
      });
      const parsed = parseEagleEyeWorkbook(wb, file.name);
      const detection = detectModelFromWorkbook(parsed, file.name);
      setActiveModelId(detection.profile.id);
      setDetectedModelId(detection.profile.id);
      setDataset(parsed);
      setSelectedSubsystem(null);
      setSelectedSensor(null);
      setActiveView('datasheet');
    } catch (err: any) {
      console.error('Error parsing Eagle Eye workbook:', err);
      setUploadError(err.message || 'Failed to parse file. Please verify it is a valid Eagle Eye Excel export.');
    } finally {
      setIsLoading(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleLoadSample = async (sampleName: string = 'SEQ-G659-CD050L.xlsx') => {
    setIsLoading(true);
    setUploadError(null);
    try {
      let response: Response;
      try {
        response = await fetch(`./${sampleName}`);
        if (!response.ok) throw new Error('Retry with /');
      } catch {
        try {
          response = await fetch(`/${sampleName}`);
          if (!response.ok) throw new Error('Retry with relative');
        } catch {
          response = await fetch(sampleName);
        }
      }
      if (!response.ok) throw new Error(`Could not load ${sampleName} (${response.statusText})`);
      const buffer = await response.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), {
        type: 'array',
        cellDates: true,
        raw: false
      });
      const parsed = parseEagleEyeWorkbook(wb, sampleName);
      const detection = detectModelFromWorkbook(parsed, sampleName);
      setActiveModelId(detection.profile.id);
      setDetectedModelId(detection.profile.id);
      setDataset(parsed);
      setSelectedSubsystem(null);
      setSelectedSensor(null);
      setActiveView('datasheet');
    } catch (err: any) {
      console.error('Error loading sample workbook:', err);
      setUploadError(err.message || 'Failed to parse sample workbook.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (dataset) {
      const currentModel = getModelProfile(activeModelId);
      exportAnalysisExcel(dataset, {
        modelName: currentModel.name,
        coolingSeries: currentModel.series
      });
    }
  };

  const handleRunAudit = () => {
    if (dataset) {
      const reParsed = { ...dataset };
      setDataset(reParsed);
    }
  };

  const handleSelectSensor = (sensor: string | null) => {
    setSelectedSensor(sensor);
    if (sensor && dataset && dataset.parameterStats[sensor]) {
      setSelectedSubsystem(dataset.parameterStats[sensor].category);
    }
  };

  const handleSelectSubsystem = (subsystem: SubsystemCategory | null) => {
    setSelectedSubsystem(subsystem);
    setSelectedSensor(null);
  };

  const handleResetView = () => {
    setZoomLevel(1.0);
    setShowLeftDock(true);
    setShowMiddleDock(true);
    setShowRightDock(true);
    setShowBottomDock(true);
    setMinimizedWindows({ left: false, middle: false, right: false, bottom: false });
    setMaximizedWindow('none');
    setLeftWidth(280);
    setRightWidth(310);
    setBottomHeight(240);
    localStorage.setItem('eagle-eye-dock-left-width', '280');
    localStorage.setItem('eagle-eye-dock-right-width', '310');
    localStorage.setItem('eagle-eye-dock-bottom-height', '240');
    localStorage.setItem('eagle-eye-show-left-dock', 'true');
    localStorage.setItem('eagle-eye-show-middle-dock', 'true');
    localStorage.setItem('eagle-eye-show-right-dock', 'true');
    localStorage.setItem('eagle-eye-show-bottom-dock', 'true');
    setDataset(null);
    setSelectedSensor(null);
    setSelectedSubsystem(null);
    setActiveView('datasheet');
    setActiveModelId('CHx2000');
    setDetectedModelId('CHx2000');
    setUploadError(null);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (maximizedWindow !== 'none') {
          e.preventDefault();
          setMaximizedWindow('none');
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExport();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRunAudit();
      } else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        handleToggleLeftDock();
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        handleToggleRightDock();
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        handleToggleBottomDock();
      } else if (e.ctrlKey && e.key === '4') {
        e.preventDefault();
        handleToggleMiddleDock();
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleResetView();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveView('datasheet');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveView('telemetry');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveView('dynamics');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        setActiveView('diagnostics');
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsModal(true);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleOpenTerminalModbus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataset, maximizedWindow]);

  return (
    <div className="cad-app-container">
      {/* Hidden file input for Ctrl+O and Open menu */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx,.xls,.xlsm"
        onChange={onFileInputChange}
      />

      {/* Top Application Window Bar with Titlebar Shortcuts & Dropdown Menubar */}
      <CadTopMenuBar
        onOpenFileClick={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onRunAudit={handleRunAudit}
        onResetView={handleResetView}
        activeView={activeView}
        onSelectView={setActiveView}
        showLeftDock={showLeftDock}
        onToggleLeftDock={handleToggleLeftDock}
        showMiddleDock={showMiddleDock}
        onToggleMiddleDock={handleToggleMiddleDock}
        showRightDock={showRightDock}
        onToggleRightDock={handleToggleRightDock}
        showBottomDock={showBottomDock}
        onToggleBottomDock={handleToggleBottomDock}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenTerminalModbus={handleOpenTerminalModbus}
        onOpenAbout={() => setShowAboutModal(true)}
        filename={dataset?.metadata?.filename}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        selectedSensor={selectedSensor}
        selectedSubsystem={selectedSubsystem}
        onSelectSubsystem={handleSelectSubsystem}
        onClearSensor={() => setSelectedSensor(null)}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
        onZoomOut={() => setZoomLevel(prev => Math.max(0.75, prev - 0.1))}
        onZoomReset={() => setZoomLevel(1.0)}
        hasDataset={dataset !== null}
        onLoadSample={handleLoadSample}
        activeModelId={activeModelId}
        onSelectModel={setActiveModelId}
        detectedModelId={detectedModelId}
        showModbusOverlays={showModbusOverlays}
        onToggleModbusOverlays={handleToggleModbusOverlays}
      />

      {/* Full App Screen Floating Notification Banner */}
      {maximizedWindow !== 'none' && (
        <div className="cad-fullscreen-banner" role="status">
          <div className="cad-fullscreen-banner-content">
            <span className="cad-fullscreen-pulse"></span>
            <span className="cad-fullscreen-text">
              <strong>
                {maximizedWindow === 'left' && 'Workspace Tree (Left Window)'}
                {maximizedWindow === 'middle' && 'Main Document Canvas (Middle Window)'}
                {maximizedWindow === 'right' && 'Parameter Inspector (Right Window)'}
                {maximizedWindow === 'bottom' && 'Diagnostic Terminal (Bottom Window)'}
              </strong> in Full App Screen Mode
            </span>
            <span className="cad-fullscreen-hint">(Press Esc or click to restore)</span>
            <button
              type="button"
              className="cad-fullscreen-restore-btn"
              onClick={() => setMaximizedWindow('none')}
              title="Exit Full App Screen (Esc)"
            >
              <Minimize2 size={12} />
              <span>Restore Normal Size</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Multi-Window Engineering Workspace */}
      <main
        className="cad-main-workspace"
        ref={workspaceRef}
        style={{
          '--left-width': `${leftWidth}px`,
          '--right-width': `${rightWidth}px`,
          '--bottom-height': `${bottomHeight}px`
        } as React.CSSProperties}
      >
        {/* Full App Screen Mode: Left Window */}
        {maximizedWindow === 'left' && (
          <CadWorkspaceTree
            dataset={dataset}
            selectedSensor={selectedSensor}
            selectedSubsystem={selectedSubsystem}
            onSelectSubsystem={handleSelectSubsystem}
            activeView={activeView}
            onSelectSensor={handleSelectSensor}
            onClose={() => { setMaximizedWindow('none'); setShowLeftDock(false); }}
            onOpenFileClick={() => fileInputRef.current?.click()}
            showModbusOverlays={showModbusOverlays}
            isMaximized={true}
            onToggleMaximize={() => setMaximizedWindow('none')}
            onMinimize={() => { setMaximizedWindow('none'); handleToggleMinimize('left'); }}
            style={{ width: '100%', height: '100%', borderRight: 'none' }}
          />
        )}

        {/* Full App Screen Mode: Middle Window */}
        {maximizedWindow === 'middle' && (
          <section className="cad-center-area" style={{ width: '100%', height: '100%' }}>
            <CadTabbedCanvas
              dataset={dataset}
              activeView={activeView}
              onSelectView={setActiveView}
              selectedSensor={selectedSensor}
              onSelectSensor={handleSelectSensor}
              selectedSubsystem={selectedSubsystem}
              onSelectSubsystem={handleSelectSubsystem}
              onOpenFileClick={() => fileInputRef.current?.click()}
              onFileUpload={handleFileUpload}
              isLoading={isLoading}
              uploadError={uploadError}
              onClearError={() => setUploadError(null)}
              onOpenModbusMap={handleOpenTerminalModbus}
              zoomLevel={zoomLevel}
              onMouseMoveCoords={(x, y) => setCursorCoords({ x, y })}
              onLoadSample={handleLoadSample}
              isMaximized={true}
              onToggleMaximize={() => setMaximizedWindow('none')}
              onMinimize={() => { setMaximizedWindow('none'); handleToggleMinimize('middle'); }}
              onClose={() => { setMaximizedWindow('none'); setShowMiddleDock(false); }}
              style={{ width: '100%', height: '100%' }}
            />
          </section>
        )}

        {/* Full App Screen Mode: Right Window */}
        {maximizedWindow === 'right' && (
          <CadParameterInspector
            dataset={dataset}
            selectedSensor={selectedSensor}
            onSelectSensor={handleSelectSensor}
            selectedSubsystem={selectedSubsystem}
            onSelectSubsystem={handleSelectSubsystem}
            activeModelId={activeModelId}
            onClose={() => { setMaximizedWindow('none'); setShowRightDock(false); }}
            showModbusOverlays={showModbusOverlays}
            onOpenTerminalModbus={handleOpenTerminalModbus}
            isMaximized={true}
            onToggleMaximize={() => setMaximizedWindow('none')}
            onMinimize={() => { setMaximizedWindow('none'); handleToggleMinimize('right'); }}
            style={{ width: '100%', height: '100%', borderLeft: 'none' }}
          />
        )}

        {/* Full App Screen Mode: Bottom Window */}
        {maximizedWindow === 'bottom' && (
          <section className="cad-center-area" style={{ width: '100%', height: '100%' }}>
            <CadTerminalPanel
              dataset={dataset}
              selectedSensor={selectedSensor}
              selectedSubsystem={selectedSubsystem}
              onSelectSensor={handleSelectSensor}
              onSelectSubsystem={handleSelectSubsystem}
              onRunAudit={handleRunAudit}
              onExport={handleExport}
              onClose={() => { setMaximizedWindow('none'); setShowBottomDock(false); }}
              activeTab={terminalTab}
              onSelectTab={setTerminalTab}
              isMaximized={true}
              onToggleMaximize={() => setMaximizedWindow('none')}
              onMinimize={() => { setMaximizedWindow('none'); handleToggleMinimize('bottom'); }}
              style={{ width: '100%', height: '100%', borderTop: 'none' }}
            />
          </section>
        )}

        {/* Normal Multi-Window Workspace Mode */}
        {maximizedWindow === 'none' && (
          <>
            {/* Left Side Window: Workspace Tree */}
            {showLeftDock && (
              <CadWorkspaceTree
                dataset={dataset}
                selectedSensor={selectedSensor}
                selectedSubsystem={selectedSubsystem}
                onSelectSubsystem={handleSelectSubsystem}
                activeView={activeView}
                onSelectSensor={handleSelectSensor}
                onClose={() => setShowLeftDock(false)}
                onOpenFileClick={() => fileInputRef.current?.click()}
                showModbusOverlays={showModbusOverlays}
                isMinimized={minimizedWindows.left}
                onMinimize={() => handleToggleMinimize('left')}
                isMaximized={false}
                onToggleMaximize={() => handleToggleMaximize('left')}
                onRestore={() => setMinimizedWindows(p => ({ ...p, left: false }))}
                style={{ width: minimizedWindows.left ? '32px' : 'var(--left-width)' }}
              />
            )}

            {/* Left Splitter */}
            {showLeftDock && !minimizedWindows.left && (
              <CadSplitter
                direction="vertical"
                onDragStart={handleDragStart}
                onResize={handleResizeLeftMove}
                onDragEnd={handleResizeLeftEnd}
                onDoubleClick={() => {
                  setLeftWidth(280);
                  localStorage.setItem('eagle-eye-dock-left-width', '280');
                  if (workspaceRef.current) workspaceRef.current.style.setProperty('--left-width', '280px');
                }}
                title="Drag to resize Workspace Tree • Double-click to reset (280px)"
              />
            )}

            {/* Center Area: Tabbed Canvas (Middle Window) + Terminal (Bottom Window) */}
            <section className="cad-center-area">
              {/* Middle Window: Tabbed Document Canvas */}
              {showMiddleDock ? (
                <CadTabbedCanvas
                  dataset={dataset}
                  activeView={activeView}
                  onSelectView={setActiveView}
                  selectedSensor={selectedSensor}
                  onSelectSensor={handleSelectSensor}
                  selectedSubsystem={selectedSubsystem}
                  onSelectSubsystem={handleSelectSubsystem}
                  onOpenFileClick={() => fileInputRef.current?.click()}
                  onFileUpload={handleFileUpload}
                  isLoading={isLoading}
                  uploadError={uploadError}
                  onClearError={() => setUploadError(null)}
                  onOpenModbusMap={handleOpenTerminalModbus}
                  zoomLevel={zoomLevel}
                  onMouseMoveCoords={(x, y) => setCursorCoords({ x, y })}
                  onLoadSample={handleLoadSample}
                  isMinimized={minimizedWindows.middle}
                  onMinimize={() => handleToggleMinimize('middle')}
                  isMaximized={false}
                  onToggleMaximize={() => handleToggleMaximize('middle')}
                  onRestore={() => setMinimizedWindows(p => ({ ...p, middle: false }))}
                  onClose={() => setShowMiddleDock(false)}
                  style={{
                    flex: minimizedWindows.middle ? '0 0 34px' : (showBottomDock && !minimizedWindows.bottom ? '1 1 0' : '1 1 100%'),
                    minHeight: minimizedWindows.middle ? '34px' : 0
                  }}
                />
              ) : (
                <div className="cad-middle-closed-placeholder">
                  <div className="cad-middle-closed-card">
                    <span className="cad-middle-closed-title">Main Document Canvas is Closed</span>
                    <button
                      type="button"
                      className="cad-dock-restore-canvas-btn"
                      onClick={() => setShowMiddleDock(true)}
                    >
                      Restore Main Canvas
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Splitter */}
              {showMiddleDock && !minimizedWindows.middle && showBottomDock && !minimizedWindows.bottom && (
                <CadSplitter
                  direction="horizontal"
                  onDragStart={handleDragStart}
                  onResize={handleResizeBottomMove}
                  onDragEnd={handleResizeBottomEnd}
                  onDoubleClick={() => {
                    setBottomHeight(240);
                    localStorage.setItem('eagle-eye-dock-bottom-height', '240');
                    if (workspaceRef.current) workspaceRef.current.style.setProperty('--bottom-height', '240px');
                  }}
                  title="Drag to resize Diagnostic Terminal • Double-click to reset (240px)"
                />
              )}

              {/* Bottom Window: Terminal & Diagnostics Messages */}
              {showBottomDock && (
                <CadTerminalPanel
                  dataset={dataset}
                  selectedSensor={selectedSensor}
                  selectedSubsystem={selectedSubsystem}
                  onSelectSensor={handleSelectSensor}
                  onSelectSubsystem={handleSelectSubsystem}
                  onRunAudit={handleRunAudit}
                  onExport={handleExport}
                  onClose={() => setShowBottomDock(false)}
                  activeTab={terminalTab}
                  onSelectTab={setTerminalTab}
                  isMinimized={minimizedWindows.bottom}
                  onMinimize={() => handleToggleMinimize('bottom')}
                  isMaximized={false}
                  onToggleMaximize={() => handleToggleMaximize('bottom')}
                  onRestore={() => setMinimizedWindows(p => ({ ...p, bottom: false }))}
                  style={{
                    height: minimizedWindows.bottom ? '28px' : 'var(--bottom-height)',
                    flex: 'none'
                  }}
                />
              )}
            </section>

            {/* Right Splitter */}
            {showRightDock && !minimizedWindows.right && (
              <CadSplitter
                direction="vertical"
                onDragStart={handleDragStart}
                onResize={handleResizeRightMove}
                onDragEnd={handleResizeRightEnd}
                onDoubleClick={() => {
                  setRightWidth(310);
                  localStorage.setItem('eagle-eye-dock-right-width', '310');
                  if (workspaceRef.current) workspaceRef.current.style.setProperty('--right-width', '310px');
                }}
                title="Drag to resize Parameter Inspector • Double-click to reset (310px)"
              />
            )}

            {/* Right Side Window: Parameter Inspector */}
            {showRightDock && (
              <CadParameterInspector
                dataset={dataset}
                selectedSensor={selectedSensor}
                onSelectSensor={handleSelectSensor}
                selectedSubsystem={selectedSubsystem}
                onSelectSubsystem={handleSelectSubsystem}
                activeModelId={activeModelId}
                onClose={() => setShowRightDock(false)}
                showModbusOverlays={showModbusOverlays}
                onOpenTerminalModbus={handleOpenTerminalModbus}
                isMinimized={minimizedWindows.right}
                onMinimize={() => handleToggleMinimize('right')}
                isMaximized={false}
                onToggleMaximize={() => handleToggleMaximize('right')}
                onRestore={() => setMinimizedWindows(p => ({ ...p, right: false }))}
                style={{ width: minimizedWindows.right ? '32px' : 'var(--right-width)' }}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Status Bar */}
      <CadStatusBar
        dataset={dataset}
        activeView={activeView}
        selectedSubsystem={selectedSubsystem}
        selectedSensor={selectedSensor}
        showLeftDock={showLeftDock}
        onToggleLeftDock={handleToggleLeftDock}
        showMiddleDock={showMiddleDock}
        onToggleMiddleDock={handleToggleMiddleDock}
        showRightDock={showRightDock}
        onToggleRightDock={handleToggleRightDock}
        showBottomDock={showBottomDock}
        onToggleBottomDock={handleToggleBottomDock}
        zoomLevel={zoomLevel}
        cursorCoords={cursorCoords}
      />

      {/* Dialog Modals */}
      <CadShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      <CadAboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </div>
  );
};

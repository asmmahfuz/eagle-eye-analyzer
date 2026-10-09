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
import { CadShortcutsModal, CadModbusModal, CadAboutModal, CadLiveTestModal } from './components/cad/CadModals';

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

  // Multi-window Dock Visibility States ("might not be needed all the time")
  const [showLeftDock, setShowLeftDock] = useState<boolean>(true);
  const [showRightDock, setShowRightDock] = useState<boolean>(true);
  const [showBottomDock, setShowBottomDock] = useState<boolean>(true);

  // Zoom & Crosshair Coordinates
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dialog Modals
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showModbusModal, setShowModbusModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showLiveTestModal, setShowLiveTestModal] = useState<boolean>(false);

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

  const handleLiveTestCompleted = (liveDataset: EagleEyeDataset) => {
    setDataset(liveDataset);
    if (liveDataset.metadata.model) {
      setActiveModelId(liveDataset.metadata.model as CduModelId);
      setDetectedModelId(liveDataset.metadata.model as CduModelId);
    }
    setSelectedSubsystem(null);
    setSelectedSensor(null);
    setActiveView('datasheet');
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
    setShowRightDock(true);
    setShowBottomDock(true);
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
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
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
        setShowLeftDock(prev => !prev);
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setShowRightDock(prev => !prev);
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setShowBottomDock(prev => !prev);
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setZoomLevel(1.0);
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveView('datasheet');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveView('telemetry');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveView('diagnostics');
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsModal(true);
      } else if (e.key === 'F5' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        setShowLiveTestModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataset]);

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
        onToggleLeftDock={() => setShowLeftDock(!showLeftDock)}
        showRightDock={showRightDock}
        onToggleRightDock={() => setShowRightDock(!showRightDock)}
        showBottomDock={showBottomDock}
        onToggleBottomDock={() => setShowBottomDock(!showBottomDock)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenModbusMap={() => setShowModbusModal(true)}
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
        onOpenLiveTest={() => setShowLiveTestModal(true)}
      />

      {/* Main Multi-Window Engineering Workspace */}
      <main className="cad-main-workspace">
        {/* Left Side Window: Workspace Tree (Dockable & Collapsible) */}
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
          />
        )}

        {/* Center Area: Tabbed Document Canvas + Bottom Terminal */}
        <section className="cad-center-area">
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
            onOpenModbusMap={() => setShowModbusModal(true)}
            zoomLevel={zoomLevel}
            onMouseMoveCoords={(x, y) => setCursorCoords({ x, y })}
            onLoadSample={handleLoadSample}
            onOpenLiveTest={() => setShowLiveTestModal(true)}
          />

          {/* Bottom Side Window: Terminal & Diagnostics Messages */}
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
            />
          )}
        </section>

        {/* Right Side Window: Parameter Inspector (Dockable & Collapsible) */}
        {showRightDock && (
          <CadParameterInspector
            dataset={dataset}
            selectedSensor={selectedSensor}
            onSelectSensor={handleSelectSensor}
            selectedSubsystem={selectedSubsystem}
            onSelectSubsystem={handleSelectSubsystem}
            activeModelId={activeModelId}
            onClose={() => setShowRightDock(false)}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <CadStatusBar
        dataset={dataset}
        activeView={activeView}
        selectedSubsystem={selectedSubsystem}
        selectedSensor={selectedSensor}
        showLeftDock={showLeftDock}
        onToggleLeftDock={() => setShowLeftDock(!showLeftDock)}
        showRightDock={showRightDock}
        onToggleRightDock={() => setShowRightDock(!showRightDock)}
        showBottomDock={showBottomDock}
        onToggleBottomDock={() => setShowBottomDock(!showBottomDock)}
        zoomLevel={zoomLevel}
        cursorCoords={cursorCoords}
      />

      {/* Dialog Modals */}
      <CadShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      <CadModbusModal
        isOpen={showModbusModal}
        onClose={() => setShowModbusModal(false)}
      />
      <CadAboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
      <CadLiveTestModal
        isOpen={showLiveTestModal}
        onClose={() => setShowLiveTestModal(false)}
        onTestCompleted={handleLiveTestCompleted}
        activeModelId={activeModelId}
      />
    </div>
  );
};

import React, { useMemo } from 'react';
import { EagleEyeDataset, CadMainView, SubsystemCategory, SUBSYSTEM_LABELS, ScopeTier } from '../../types';
import { CadEmptyWorkspace } from './CadEmptyWorkspace';
import { UnitDataSheet, GroupDataSheet, TestDataSheet } from '../views/data';
import { UnitTelemetry, GroupTelemetry, TestTelemetry } from '../views/telemetry';
import { UnitDiagnostics, GroupDiagnostics, TestDiagnostics } from '../views/diagnostic';
import {
  Layers,
  BarChart2,
  Activity,
  ShieldAlert,
  Minus,
  Maximize2,
  Minimize2,
  X,
  Crosshair,
  RotateCcw
} from '../Icons';

interface CadTabbedCanvasProps {
  dataset: EagleEyeDataset | null;
  activeView: CadMainView;
  onSelectView: (view: CadMainView) => void;
  selectedSensor: string | null;
  onSelectSensor: (sensor: string | null) => void;
  selectedSubsystem?: SubsystemCategory | null;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onOpenFileClick: () => void;
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  uploadError: string | null;
  onClearError: () => void;
  onOpenModbusMap: () => void;
  zoomLevel: number;
  onMouseMoveCoords?: (x: number, y: number) => void;
  onLoadSample?: (name?: string) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onRestore?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const CadTabbedCanvas: React.FC<CadTabbedCanvasProps> = ({
  dataset,
  activeView,
  onSelectView,
  selectedSensor,
  onSelectSensor,
  selectedSubsystem = null,
  onSelectSubsystem,
  onOpenFileClick,
  onFileUpload,
  isLoading,
  uploadError,
  onClearError,
  zoomLevel,
  onMouseMoveCoords,
  onLoadSample,
  isMinimized = false,
  onMinimize,
  isMaximized = false,
  onToggleMaximize,
  onRestore,
  onClose,
  style
}) => {
  // Active 3-tier Scope Calculation (unit | group | test)
  const validSensor = useMemo(() => {
    if (!dataset || !selectedSensor) return null;
    return dataset.parameterStats[selectedSensor] ? selectedSensor : null;
  }, [dataset, selectedSensor]);

  const scope: ScopeTier = useMemo(() => {
    if (validSensor) return 'test';
    if (selectedSubsystem) return 'group';
    return 'unit';
  }, [validSensor, selectedSubsystem]);

  // Scope Navigation Handlers (Preserves activeView across Scope Tier transitions)
  const handleSelectSensor = (sensor: string) => {
    onSelectSensor(sensor);
  };

  const handleSelectSubsystem = (subsystem: SubsystemCategory | null) => {
    onSelectSensor(null);
    onSelectSubsystem?.(subsystem);
  };

  const handleBackToOverview = () => {
    onSelectSensor(null);
  };

  const handleResetSubsystem = () => {
    onSelectSubsystem?.(null);
  };

  const handleResetToUnit = () => {
    onSelectSensor(null);
    onSelectSubsystem?.(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseMoveCoords) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      onMouseMoveCoords(x, y);
    }
  };

  // Subsystem specific name & failure count calculations
  const subName = selectedSubsystem ? (SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem) : '';
  const subCatCount = (selectedSubsystem && dataset) ? dataset.categoryCounts[selectedSubsystem] : null;
  const subFailCount = subCatCount ? subCatCount.fail : (selectedSubsystem ? 0 : (dataset?.failedCount ?? 0));

  // Filtered failure points for Diagnostics tab badge & inspection
  const displayFailures = useMemo(() => {
    if (!dataset) return [];
    if (validSensor) {
      return dataset.failures.filter(f => f.parameter === validSensor);
    }
    if (!selectedSubsystem) return dataset.failures;
    return dataset.failures.filter(f => f.category === selectedSubsystem);
  }, [dataset, validSensor, selectedSubsystem]);

  // Total and subsystem channel counts for Data Sheet badge
  const totalSensorCount = useMemo(() => {
    if (!dataset) return 0;
    return Object.keys(dataset.parameterStats).length;
  }, [dataset]);

  const activeSubsystemChannels = useMemo(() => {
    if (!dataset || !selectedSubsystem) return [];
    return Object.entries(dataset.parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem);
  }, [dataset, selectedSubsystem]);

  // Scope-aware Tab 1 (Data Sheet) Badge & Title
  const dataSheetBadge = useMemo(() => {
    if (scope === 'test') {
      return { text: '1 ch', status: 'neutral' };
    }
    if (scope === 'group') {
      return { text: `${activeSubsystemChannels.length} ch`, status: 'neutral' };
    }
    return { text: `${totalSensorCount} ch`, status: 'neutral' };
  }, [scope, activeSubsystemChannels.length, totalSensorCount]);

  const dataSheetTitle = useMemo(() => {
    if (scope === 'test' && validSensor) {
      return `Single-Channel Data Sheet (${validSensor}) — Specs & 10-Stage Measured Dwells`;
    }
    if (scope === 'group') {
      return `${subName} Subsystem Data Sheet — 10-Stage Operating Matrix & Directory`;
    }
    return 'Executive Data Sheet, 10-Stage Operating Matrix & Channel Directory';
  }, [scope, validSensor, subName]);

  // Scope-aware Tab 2 (Telemetry Scope) Badge & Title
  const telemetryBadge = useMemo(() => {
    if (scope === 'test' && validSensor) {
      const isFail = (dataset?.parameterStats[validSensor]?.failCount ?? 0) > 0;
      return { text: isFail ? 'FAIL' : 'PASS', status: isFail ? 'fail' : 'pass' };
    }
    if (scope === 'group') {
      return { text: `${activeSubsystemChannels.length} ch`, status: subFailCount > 0 ? 'fail' : 'pass' };
    }
    return { text: `${totalSensorCount} ch`, status: (dataset?.failedCount ?? 0) > 0 ? 'fail' : 'pass' };
  }, [scope, validSensor, dataset, activeSubsystemChannels.length, subFailCount, totalSensorCount]);

  const telemetryTitle = useMemo(() => {
    if (scope === 'test' && validSensor) {
      return `Single-Channel Laboratory Oscilloscope (${validSensor}) — ±3σ Envelope & Modbus Inspector`;
    }
    if (scope === 'group') {
      return `${subName} Subsystem Multi-Channel Telemetry Waveform Overlay`;
    }
    return 'Whole-Unit Closed-Loop Dynamics Cockpit & Telemetry Oscilloscope';
  }, [scope, validSensor, subName]);

  // Scope-aware Tab 3 Diagnostics Badge & Title
  const diagnosticsBadge = useMemo(() => {
    return { text: 'In Dev', status: 'neutral' };
  }, []);

  const diagnosticsTitle = useMemo(() => {
    if (scope === 'test' && validSensor) {
      return `${validSensor} Diagnostics (In Development)`;
    }
    if (scope === 'group') {
      return `${subName} Diagnostics (In Development)`;
    }
    return 'Automated Diagnostics (In Development)';
  }, [scope, validSensor, subName]);

  // Minimized Collapsed State
  if (isMinimized) {
    return (
      <div 
        className="cad-dock-minimized cad-dock-minimized-middle"
        title="Main Document Canvas (Minimized) • Click to restore"
        onClick={onRestore || onMinimize}
        style={style}
      >
        <div className="cad-dock-min-horizontal-left">
          <Layers size={13} className="cad-dock-icon" />
          <span className="cad-dock-min-title">MAIN DOCUMENT CANVAS [MINIMIZED]</span>
          <span className="cad-scope-pill unit">
            {activeView === 'datasheet' && 'Data Sheet'}
            {activeView === 'telemetry' && 'Telemetry'}
            {activeView === 'diagnostics' && 'Diagnostics'}
          </span>
        </div>
        <div className="cad-dock-min-actions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="cad-dock-btn"
            title="Restore Main Canvas"
            onClick={onRestore || onMinimize}
          >
            <Maximize2 size={12} />
          </button>
          {onClose && (
            <button
              type="button"
              className="cad-dock-btn cad-dock-btn-close"
              title="Close Main Canvas"
              onClick={onClose}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dormant state: No dataset loaded
  if (!dataset) {
    return (
      <div
        className="cad-tabbed-canvas"
        style={style}
        onMouseMove={handleCanvasMouseMove}
      >
        <div className="cad-canvas-tabbar">
          <div className="cad-canvas-tabs-list">
            <div className="cad-ctab active">
              <Layers size={13} />
              <span>Workspace Ready</span>
            </div>
          </div>
          <div className="cad-canvas-window-actions">
            <span className="cad-dock-pill-docked">{isMaximized ? 'Full Screen' : 'Main View'}</span>
            {onMinimize && (
              <button
                type="button"
                className="cad-dock-btn"
                title="Minimize Main Canvas"
                onClick={onMinimize}
              >
                <Minus size={12} />
              </button>
            )}
            {onToggleMaximize && (
              <button
                type="button"
                className={`cad-dock-btn ${isMaximized ? 'active' : ''}`}
                title={isMaximized ? "Restore Normal Size (Esc)" : "Full App Screen (Main Canvas)"}
                onClick={onToggleMaximize}
              >
                {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="cad-dock-btn cad-dock-btn-close"
                title="Close Main Canvas"
                onClick={onClose}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div
          className="cad-canvas-viewport cad-canvas-viewport-empty"
          style={{ transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined, transformOrigin: 'top left' }}
        >
          <CadEmptyWorkspace
            onOpenFileClick={onOpenFileClick}
            onFileUpload={onFileUpload}
            isLoading={isLoading}
            uploadError={uploadError}
            onClearError={onClearError}
            onLoadSample={onLoadSample}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="cad-tabbed-canvas"
      style={style}
      onMouseMove={handleCanvasMouseMove}
    >
      {/* Streamlined 4-Tab Header Bar with Dynamic Scope Routing */}
      <div className="cad-canvas-tabbar">
        <div className="cad-canvas-tabs-list">
          {/* Tab 1: Data Sheet */}
          <button
            className={`cad-ctab ${activeView === 'datasheet' ? 'active' : ''}`}
            onClick={() => onSelectView('datasheet')}
            title={dataSheetTitle}
          >
            <BarChart2 size={13} />
            <span>Data Sheet</span>
            <span className={`cad-tab-badge-count ${dataSheetBadge.status}`}>
              {dataSheetBadge.text}
            </span>
          </button>

          {/* Tab 2: Telemetry */}
          <button
            className={`cad-ctab ${activeView === 'telemetry' ? 'active' : ''}`}
            onClick={() => onSelectView('telemetry')}
            title={telemetryTitle}
          >
            <Activity size={13} />
            <span>Telemetry</span>
            <span className={`cad-tab-badge-count ${telemetryBadge.status}`}>
              {telemetryBadge.text}
            </span>
          </button>

          {/* Tab 3: Diagnostics */}
          <button
            className={`cad-ctab ${activeView === 'diagnostics' ? 'active' : ''}`}
            onClick={() => onSelectView('diagnostics')}
            title={diagnosticsTitle}
          >
            <ShieldAlert size={13} />
            <span>Diagnostics</span>
            <span className={`cad-tab-badge-count ${diagnosticsBadge.status}`}>
              {diagnosticsBadge.text}
            </span>
          </button>
        </div>

        {/* Canvas Right Tools: Real-time status tags & Scope tier badge */}
        <div className="cad-canvas-top-tools">
          {/* Real-time Scope Tier Badge */}
          <div className="cad-canvas-scope-indicator" title={`Active Scope Tier: ${scope.toUpperCase()} ${scope !== 'unit' ? '• Click ↺ to return to Whole Unit' : ''}`}>
            <Crosshair size={11} className="cad-scope-icon" />
            <span className={`cad-scope-pill ${scope}`}>
              {scope === 'unit' && 'UNIT'}
              {scope === 'group' && subName.toUpperCase()}
              {scope === 'test' && validSensor}
            </span>
            {scope !== 'unit' && (
              <button
                type="button"
                className="cad-scope-reset-btn"
                onClick={handleResetToUnit}
                title="Return to Whole Unit Scope"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>

          {/* Real-time Status Tag based on active view and scope */}
          {activeView === 'datasheet' && (
            <span
              className={`cad-sheet-status-tag ${
                scope === 'test' && validSensor
                  ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? 'fail' : 'pass')
                  : scope === 'group'
                  ? (subFailCount > 0 ? 'fail' : 'pass')
                  : ((dataset.failedCount ?? 0) > 0 ? 'fail' : 'pass')
              }`}
              title={
                scope === 'test' && validSensor
                  ? `${validSensor}: ${(dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? `${dataset.parameterStats[validSensor]?.failCount} Violations` : 'PASS (100% in tolerance)'}`
                  : scope === 'group'
                  ? `${subName.toUpperCase()}: ${subFailCount > 0 ? `FAIL (${subFailCount} Violations)` : 'PASS (100% in tolerance)'}`
                  : ((dataset.failedCount ?? 0) > 0
                      ? `OVERALL: FAIL (${dataset.failedCount} Violations)`
                      : 'OVERALL: PASS (100% in tolerance)')
              }
            >
              {scope === 'test' && validSensor
                ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? `FAIL (${dataset.parameterStats[validSensor]?.failCount})` : 'PASS')
                : scope === 'group'
                ? (subFailCount > 0 ? `FAIL (${subFailCount})` : 'PASS')
                : ((dataset.failedCount ?? 0) > 0 ? `FAIL (${dataset.failedCount})` : 'PASS (100%)')}
            </span>
          )}
          {activeView === 'telemetry' && (
            <span
              className={`cad-sheet-status-tag ${
                scope === 'test' && validSensor
                  ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? 'fail' : 'pass')
                  : scope === 'group'
                  ? (subFailCount > 0 ? 'fail' : 'pass')
                  : ((dataset.failedCount ?? 0) > 0 ? 'fail' : 'pass')
              }`}
              title={
                scope === 'test' && validSensor
                  ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? `FAILED (${dataset.parameterStats[validSensor]?.failCount} pts)` : 'PASS (In Tolerance)')
                  : scope === 'group'
                  ? `${subName.toUpperCase()}: ${subFailCount > 0 ? `FAIL (${subFailCount} Violations)` : 'PASS (100% in tolerance)'}`
                  : ((dataset.failedCount ?? 0) > 0
                      ? `OVERALL: FAIL (${dataset.failedCount} Violations)`
                      : 'OVERALL: PASS (100% in tolerance)')
              }
            >
              {scope === 'test' && validSensor
                ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0
                    ? `FAIL (${dataset.parameterStats[validSensor]?.failCount})`
                    : 'PASS')
                : scope === 'group'
                ? (subFailCount > 0 ? `FAIL (${subFailCount})` : 'PASS')
                : ((dataset.failedCount ?? 0) > 0
                    ? `FAIL (${dataset.failedCount})`
                    : 'PASS')}
            </span>
          )}
          {activeView === 'diagnostics' && (
            <span
              className="cad-sheet-status-tag neutral"
              title="Automated Diagnostics (In Development)"
            >
              IN DEVELOPMENT
            </span>
          )}

          {/* Window Control Buttons */}
          <div className="cad-canvas-window-actions">
            <span className="cad-dock-pill-docked">{isMaximized ? 'Full Screen' : 'Main View'}</span>
            {onMinimize && (
              <button
                type="button"
                className="cad-dock-btn"
                title="Minimize Main Canvas"
                onClick={onMinimize}
              >
                <Minus size={12} />
              </button>
            )}
            {onToggleMaximize && (
              <button
                type="button"
                className={`cad-dock-btn ${isMaximized ? 'active' : ''}`}
                title={isMaximized ? "Restore Normal Size (Esc)" : "Full App Screen (Main Canvas)"}
                onClick={onToggleMaximize}
              >
                {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="cad-dock-btn cad-dock-btn-close"
                title="Close Main Canvas"
                onClick={onClose}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Scrollable Work Area (Streamlined 3-Route Scope Dispatcher) */}
      <div
        className="cad-canvas-viewport"
        style={{ transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined, transformOrigin: 'top left' }}
      >
        {/* Route 1: Data Sheet & Operating Stages (Modular 3-Tier Scope Dispatcher) */}
        {activeView === 'datasheet' && (
          <div className="cad-overview-wrapper">
            {scope === 'test' && validSensor ? (
              <TestDataSheet
                dataset={dataset}
                selectedSensor={validSensor}
                onSelectSubsystem={handleSelectSubsystem}
                onBackToOverview={handleBackToOverview}
                onSelectSensor={handleSelectSensor}
              />
            ) : scope === 'group' && selectedSubsystem ? (
              <GroupDataSheet
                dataset={dataset}
                selectedSubsystem={selectedSubsystem}
                onSelectSensor={handleSelectSensor}
                onResetSubsystem={handleResetSubsystem}
              />
            ) : (
              <UnitDataSheet
                dataset={dataset}
                onSelectSensor={handleSelectSensor}
                onSelectSubsystem={handleSelectSubsystem}
              />
            )}
          </div>
        )}

        {/* Route 2: Telemetry Scope (Modular 3-Tier Scope Dispatcher) */}
        {activeView === 'telemetry' && (
          <div className="cad-overview-wrapper">
            {scope === 'test' && validSensor ? (
              <TestTelemetry
                dataset={dataset}
                selectedSensor={validSensor}
                onSelectSubsystem={handleSelectSubsystem}
                onBackToOverview={handleBackToOverview}
                onSelectSensor={handleSelectSensor}
              />
            ) : scope === 'group' && selectedSubsystem ? (
              <GroupTelemetry
                dataset={dataset}
                selectedSubsystem={selectedSubsystem}
                onSelectSensor={handleSelectSensor}
                onResetSubsystem={handleResetSubsystem}
              />
            ) : (
              <UnitTelemetry
                dataset={dataset}
                selectedSensor={selectedSensor}
                onSelectSensor={handleSelectSensor}
                onSelectSubsystem={handleSelectSubsystem}
              />
            )}
          </div>
        )}

        {/* Route 3: Diagnostics & Rework Directives (Modular 3-Tier Scope Dispatcher) */}
        {activeView === 'diagnostics' && (
          <div className="cad-overview-wrapper">
            {scope === 'test' && validSensor ? (
              <TestDiagnostics
                dataset={dataset}
                selectedSensor={validSensor}
                onSelectSubsystem={handleSelectSubsystem}
                onBackToOverview={handleBackToOverview}
                onSelectSensor={handleSelectSensor}
              />
            ) : scope === 'group' && selectedSubsystem ? (
              <GroupDiagnostics
                dataset={dataset}
                selectedSubsystem={selectedSubsystem}
                onSelectSensor={handleSelectSensor}
                onResetSubsystem={handleResetSubsystem}
              />
            ) : (
              <UnitDiagnostics
                dataset={dataset}
                onSelectSensor={handleSelectSensor}
                onSelectSubsystem={handleSelectSubsystem}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

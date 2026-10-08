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
  ShieldAlert
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
  onLoadSample
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
      return { text: validSensor, status: isFail ? 'fail' : 'pass' };
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
    return 'Whole-Unit Operational Telemetry & System Excitation Multi-Curve';
  }, [scope, validSensor, subName]);

  // Scope-aware Tab 3 (Diagnostics & Rework) Badge & Title
  const diagnosticsBadge = useMemo(() => {
    const count = displayFailures.length;
    return { text: `${count}`, status: count > 0 ? 'fail' : 'pass' };
  }, [displayFailures.length]);

  const diagnosticsTitle = useMemo(() => {
    if (scope === 'test' && validSensor) {
      return `${validSensor} Diagnostics — Breach Ledger & Targeted Corrective Directive`;
    }
    if (scope === 'group') {
      return `${subName} Diagnostics — Subsystem Excursion Ledger & Rework Action`;
    }
    return 'Whole-Unit Diagnostics — Root Cause Verdict & Shopfloor Rework Punch-List';
  }, [scope, validSensor, subName]);

  // Dormant state: No dataset loaded
  if (!dataset) {
    return (
      <div
        className="cad-tabbed-canvas"
        onMouseMove={handleCanvasMouseMove}
      >
        <div className="cad-canvas-tabbar">
          <div className="cad-canvas-tabs-list">
            <div className="cad-ctab active">
              <Layers size={13} />
              <span>Workspace Ready</span>
            </div>
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
      onMouseMove={handleCanvasMouseMove}
    >
      {/* Streamlined 3-Tab Header Bar with Dynamic Scope Routing */}
      <div className="cad-canvas-tabbar">
        <div className="cad-canvas-tabs-list">
          {/* Tab 1: Data Sheet & Operating Stages */}
          <button
            className={`cad-ctab ${activeView === 'datasheet' ? 'active' : ''}`}
            onClick={() => onSelectView('datasheet')}
            title={dataSheetTitle}
          >
            <BarChart2 size={13} />
            <span>Data Sheet & Operating Stages</span>
            <span className={`cad-tab-badge-count ${dataSheetBadge.status}`}>
              {dataSheetBadge.text}
            </span>
          </button>

          {/* Tab 2: Telemetry Scope */}
          <button
            className={`cad-ctab ${activeView === 'telemetry' ? 'active' : ''}`}
            onClick={() => onSelectView('telemetry')}
            title={telemetryTitle}
          >
            <Activity size={13} />
            <span>Telemetry Scope</span>
            <span className={`cad-tab-badge-count ${telemetryBadge.status}`}>
              {telemetryBadge.text}
            </span>
          </button>

          {/* Tab 3: Diagnostics & Rework Punch-List */}
          <button
            className={`cad-ctab ${activeView === 'diagnostics' ? 'active' : ''}`}
            onClick={() => onSelectView('diagnostics')}
            title={diagnosticsTitle}
          >
            <ShieldAlert size={13} />
            <span>Diagnostics & Rework Punch-List</span>
            <span className={`cad-tab-badge-count ${diagnosticsBadge.status}`}>
              {diagnosticsBadge.text}
            </span>
          </button>
        </div>

        {/* Canvas Right Tools: Real-time status tags & Scope tier badge */}
        <div className="cad-canvas-top-tools">
          {/* Real-time Scope Tier Badge */}
          <div className="cad-canvas-scope-indicator" title={`Active Scope Tier: ${scope.toUpperCase()}`}>
            <span className="cad-scope-tier-label">SCOPE:</span>
            <span className={`cad-scope-pill ${scope}`}>
              {scope === 'unit' && 'WHOLE UNIT'}
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
                ↺ Unit
              </button>
            )}
          </div>

          {/* Real-time Status Tag based on active view and scope */}
          {activeView === 'datasheet' && (
            <span className={`cad-sheet-status-tag ${
              scope === 'test' && validSensor
                ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? 'fail' : 'pass')
                : scope === 'group'
                ? (subFailCount > 0 ? 'fail' : 'pass')
                : ((dataset.failedCount ?? 0) > 0 ? 'fail' : 'pass')
            }`}>
              {scope === 'test' && validSensor
                ? `${validSensor}: ${(dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? `${dataset.parameterStats[validSensor]?.failCount} Violations` : 'PASS (100% in tolerance)'}`
                : scope === 'group'
                ? `${subName.toUpperCase()}: ${subFailCount > 0 ? `FAIL (${subFailCount} Violations)` : 'PASS (100% in tolerance)'}`
                : ((dataset.failedCount ?? 0) > 0
                    ? `OVERALL: FAIL (${dataset.failedCount} Violations)`
                    : 'OVERALL: PASS (100% in tolerance)')}
            </span>
          )}
          {activeView === 'telemetry' && (
            <span className={`cad-sheet-status-tag ${
              scope === 'test' && validSensor
                ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0 ? 'fail' : 'pass')
                : scope === 'group'
                ? (subFailCount > 0 ? 'fail' : 'pass')
                : ((dataset.failedCount ?? 0) > 0 ? 'fail' : 'pass')
            }`}>
              {scope === 'test' && validSensor
                ? ((dataset.parameterStats[validSensor]?.failCount ?? 0) > 0
                    ? `3σ EXCURSION (${dataset.parameterStats[validSensor]?.failCount} pts)`
                    : '3σ PASS (Healthy Buffer)')
                : scope === 'group'
                ? `${subName.toUpperCase()}: ${subFailCount > 0 ? `FAIL (${subFailCount} Violations)` : 'PASS (100% in tolerance)'}`
                : ((dataset.failedCount ?? 0) > 0
                    ? `OVERALL: FAIL (${dataset.failedCount} Violations)`
                    : 'OVERALL: PASS (100% in tolerance)')}
            </span>
          )}
          {activeView === 'diagnostics' && (
            <span className={`cad-sheet-status-tag ${displayFailures.length > 0 ? 'fail' : 'pass'}`}>
              {scope === 'test' && validSensor
                ? (displayFailures.length > 0 ? `${validSensor}: ${displayFailures.length} Deficits` : `${validSensor}: 100% Quality Acceptance`)
                : scope === 'group'
                ? (displayFailures.length > 0 ? `${displayFailures.length} ${subName} Deficits` : `${subName}: 100% Quality Acceptance`)
                : ((dataset.failedCount ?? 0) > 0
                    ? `${dataset.failedCount} Excursion Deficits`
                    : '100% Quality Acceptance')}
            </span>
          )}
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
                onSelectSensor={handleSelectSensor}
                onSelectSubsystem={handleSelectSubsystem}
              />
            )}
          </div>
        )}

        {/* Route 3: Diagnostics & Rework Punch-List (Modular 3-Tier Scope Dispatcher) */}
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

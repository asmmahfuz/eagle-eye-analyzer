import React from 'react';
import { EagleEyeDataset, ParameterSummary, SubsystemCategory, CadMainView } from '../../types';
import {
  Sliders,
  X,
  Minus,
  Maximize2,
  Minimize2
} from '../Icons';
import { CadInspectorStandby } from './CadInspectorStandby';
import { CadInspectorChannelDetails } from './CadInspectorChannelDetails';
import { CadInspectorSubsystemDetails } from './CadInspectorSubsystemDetails';
import { CadInspectorUnitOverview } from './CadInspectorUnitOverview';
import { CduModelId } from '../../engine/models/modelTypes';
import { getModelProfile } from '../../engine/models/modelRegistry';

export interface CadParameterInspectorProps {
  dataset: EagleEyeDataset | null;
  selectedSensor: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  activeModelId?: CduModelId;
  onClose: () => void;
  onSelectSensor: (sensorName: string | null) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onSelectView?: (view: CadMainView) => void;
  showModbusOverlays?: boolean;
  onOpenTerminalModbus?: () => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onRestore?: () => void;
  style?: React.CSSProperties;
}

export const CadParameterInspector: React.FC<CadParameterInspectorProps> = ({
  dataset,
  selectedSensor,
  selectedSubsystem,
  activeModelId = 'CHx2000',
  onClose,
  onSelectSensor,
  onSelectView,
  showModbusOverlays = false,
  onOpenTerminalModbus,
  isMinimized = false,
  onMinimize,
  isMaximized = false,
  onToggleMaximize,
  onRestore,
  style
}) => {
  const modelProfile = getModelProfile(activeModelId);

  const summary: ParameterSummary | undefined = (dataset && selectedSensor)
    ? dataset.parameterStats[selectedSensor]
    : undefined;

  // Minimized Collapsed Vertical Strip State
  if (isMinimized) {
    return (
      <aside
        className="cad-dock-panel cad-dock-minimized cad-dock-minimized-right"
        title="Parameter Inspector (Minimized) • Click to restore"
        onClick={onRestore || onMinimize}
      >
        <div className="cad-dock-min-header">
          <Sliders size={14} className="cad-dock-icon" />
        </div>
        <div className="cad-dock-min-label">
          <span>PARAMETER INSPECTOR</span>
        </div>
        <div className="cad-dock-min-actions" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="cad-dock-btn"
            title="Restore Parameter Inspector"
            onClick={onRestore || onMinimize}
          >
            <Maximize2 size={12} />
          </button>
          <button
            type="button"
            className="cad-dock-btn cad-dock-btn-close"
            title="Close Inspector (Ctrl+2)"
            onClick={onClose}
          >
            <X size={12} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="cad-dock-panel cad-parameter-inspector-dock" style={style} aria-label="Parameter Inspector">
      {/* Inspector Dock Header */}
      <div className="cad-dock-header">
        <div className="cad-dock-title">
          <Sliders size={14} className="cad-dock-icon" />
          <span>Parameter Inspector</span>
        </div>
        <div className="cad-dock-actions">
          <span className="cad-dock-pill-docked">{isMaximized ? 'Full Screen' : 'Docked'}</span>
          {onMinimize && (
            <button
              type="button"
              className="cad-dock-btn"
              title="Minimize Parameter Inspector"
              onClick={onMinimize}
            >
              <Minus size={12} />
            </button>
          )}
          {onToggleMaximize && (
            <button
              type="button"
              className={`cad-dock-btn ${isMaximized ? 'active' : ''}`}
              title={isMaximized ? "Restore Normal Size (Esc)" : "Full App Screen (Parameter Inspector)"}
              onClick={onToggleMaximize}
            >
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          <button
            type="button"
            className="cad-dock-btn cad-dock-btn-close"
            title="Close Inspector (Ctrl+2)"
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Inspector Scroll Body */}
      <div className="cad-inspector-scroll-body">
        {!dataset ? (
          <CadInspectorStandby />
        ) : selectedSensor && summary ? (
          <CadInspectorChannelDetails
            selectedSensor={selectedSensor}
            summary={summary}
            showModbusOverlays={showModbusOverlays}
            onOpenTerminalModbus={onOpenTerminalModbus}
            onSelectView={onSelectView}
          />
        ) : selectedSubsystem && dataset ? (
          <CadInspectorSubsystemDetails
            dataset={dataset}
            selectedSubsystem={selectedSubsystem}
            onSelectSensor={onSelectSensor}
            onSelectView={onSelectView}
          />
        ) : (
          <CadInspectorUnitOverview
            dataset={dataset}
            modelProfile={modelProfile}
            onSelectView={onSelectView}
          />
        )}
      </div>
    </aside>
  );
};

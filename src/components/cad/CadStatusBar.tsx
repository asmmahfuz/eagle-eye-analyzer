import React from 'react';
import { EagleEyeDataset, CadMainView, SubsystemCategory, SUBSYSTEM_LABELS } from '../../types';
import { 
  PanelLeft, 
  PanelRight, 
  PanelBottom, 
  Maximize2 
} from '../Icons';

interface CadStatusBarProps {
  dataset: EagleEyeDataset | null;
  activeView: CadMainView;
  selectedSubsystem?: SubsystemCategory | null;
  selectedSensor?: string | null;
  showLeftDock: boolean;
  onToggleLeftDock: () => void;
  showRightDock: boolean;
  onToggleRightDock: () => void;
  showBottomDock: boolean;
  onToggleBottomDock: () => void;
  zoomLevel: number;
  cursorCoords: { x: number; y: number };
}

export const CadStatusBar: React.FC<CadStatusBarProps> = ({
  dataset,
  activeView,
  selectedSubsystem = null,
  selectedSensor = null,
  showLeftDock,
  onToggleLeftDock,
  showRightDock,
  onToggleRightDock,
  showBottomDock,
  onToggleBottomDock,
  zoomLevel,
  cursorCoords
}) => {
  const isPass = dataset ? dataset.metadata.finalResult === 'Pass' : false;
  const totalChannels = dataset ? Object.keys(dataset.parameterStats).length : 0;

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <footer className="cad-bottom-status-bar" role="status">
      {/* Left Status & Simulation Dwell Timer */}
      <div className="cad-status-left">
        <div className="cad-status-indicator-block">
          <span className="cad-status-led-pulse"></span>
          <span className="cad-status-text font-bold">READY</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item font-mono">
          <span className="cad-slabel">t =</span>
          <span className="cad-sval text-cyan">{dataset ? '525.00 s' : '0.00 s'}</span>
          <span className="cad-sdim">/ 525 s</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item font-mono">
          <span className="cad-slabel">Channels:</span>
          <span className="cad-sval">{totalChannels}</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item font-mono">
          <span className="cad-slabel">Stages:</span>
          <span className="cad-sval">{dataset ? dataset.stages.length : 0}</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item font-mono">
          <span className="cad-slabel">Points:</span>
          <span className="cad-sval">{dataset ? dataset.totalEvaluated : 0}</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item">
          <span className="cad-slabel">Status:</span>
          {dataset ? (
            <span className={`cad-sval-verdict font-bold ${isPass ? 'pass' : 'fail'}`}>
              {dataset.metadata.finalResult.toUpperCase()} ({dataset.passRate}% Compliance)
            </span>
          ) : (
            <span className="cad-sdim">Awaiting Workbook</span>
          )}
        </div>

        <div className="cad-status-sep">|</div>

        {/* Active View Indicator */}
        <div className="cad-status-item font-mono">
          <span className="cad-slabel">View:</span>
          <span className="cad-sval text-cyan font-bold">
            {activeView === 'datasheet' && 'Data Sheet & Stages'}
            {activeView === 'telemetry' && (selectedSensor ? `Telemetry Scope [${selectedSensor}]` : 'Telemetry Scope')}
            {activeView === 'diagnostics' && 'Diagnostics & Punch-List'}
          </span>
        </div>

        {/* Active Subsystem Isolation Context */}
        {selectedSubsystem && (
          <>
            <div className="cad-status-sep">|</div>
            <div className="cad-status-item font-mono">
              <span className="cad-slabel">Scope:</span>
              <span className="cad-sval text-yellow font-bold">
                {SUBSYSTEM_LABELS[selectedSubsystem]}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right Cursor Coordinates, Zoom, and Dock Toggles */}
      <div className="cad-status-right">
        <div className="cad-status-item font-mono cad-coords-item">
          <span className="cad-slabel">X:</span>
          <span className="cad-sval">{cursorCoords.x}</span>
          <span className="cad-slabel ml-1">Y:</span>
          <span className="cad-sval">{cursorCoords.y}</span>
        </div>

        <div className="cad-status-sep">|</div>

        <div className="cad-status-item font-mono">
          <span className="cad-slabel">Zoom:</span>
          <span className="cad-sval">{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="cad-status-sep">|</div>

        {/* Dock Controls */}
        <div className="cad-status-dock-btns">
          <button 
            className={`cad-sbtn ${showLeftDock ? 'active' : ''}`}
            onClick={onToggleLeftDock}
            title="Toggle Left Workspace Tree Window [Ctrl+1]"
          >
            <PanelLeft size={13} />
          </button>

          <button 
            className={`cad-sbtn ${showRightDock ? 'active' : ''}`}
            onClick={onToggleRightDock}
            title="Toggle Right Parameter Inspector Window [Ctrl+2]"
          >
            <PanelRight size={13} />
          </button>

          <button 
            className={`cad-sbtn ${showBottomDock ? 'active' : ''}`}
            onClick={onToggleBottomDock}
            title="Toggle Bottom Diagnostic Terminal [Ctrl+3]"
          >
            <PanelBottom size={13} />
          </button>

          <button 
            className="cad-sbtn"
            onClick={handleFullscreen}
            title="Toggle Fullscreen [F11]"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
};

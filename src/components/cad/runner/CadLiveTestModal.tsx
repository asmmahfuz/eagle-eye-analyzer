import React, { useState, useEffect } from 'react';
import { EagleEyeDataset } from '../../../types';
import { CduModelId } from '../../../engine/models/modelTypes';
import { 
  testRunnerBridge, 
  LiveTestConfig, 
  LiveRunnerProgress 
} from '../../../engine/runner';
import { LiveTestConfigForm } from './LiveTestConfigForm';
import { LiveTestStageProgress } from './LiveTestStageProgress';
import { LiveTestReadingsStream } from './LiveTestReadingsStream';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FastForward,
  Sliders
} from '../../Icons';

interface CadLiveTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCompleted: (dataset: EagleEyeDataset) => void;
  activeModelId?: CduModelId;
}

export const CadLiveTestModal: React.FC<CadLiveTestModalProps> = ({
  isOpen,
  onClose,
  onTestCompleted,
  activeModelId = 'CHx2000'
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'live'>('config');
  const [config, setConfig] = useState<LiveTestConfig>(() => ({
    ...testRunnerBridge.getConfig(),
    modelId: activeModelId
  }));
  const [progress, setProgress] = useState<LiveRunnerProgress>(() => testRunnerBridge.getProgress());
  const [latestDataset, setLatestDataset] = useState<EagleEyeDataset | null>(null);

  // Subscribe to bridge events
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = testRunnerBridge.subscribe({
      onProgress: (p) => setProgress({ ...p }),
      onStageComplete: (_, partialDataset) => setLatestDataset(partialDataset),
      onComplete: (finalDataset) => {
        setLatestDataset(finalDataset);
        setActiveTab('live');
      }
    });

    setProgress(testRunnerBridge.getProgress());
    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart = () => {
    setActiveTab('live');
    testRunnerBridge.startTest(config);
  };

  const handlePauseResume = () => {
    if (progress.status === 'running') testRunnerBridge.pauseTest();
    else if (progress.status === 'paused') testRunnerBridge.resumeTest();
  };

  const handleAbort = () => {
    testRunnerBridge.abortTest();
  };

  const handleInstant = () => {
    setActiveTab('live');
    const finalData = testRunnerBridge.instantComplete();
    setLatestDataset(finalData);
  };

  const handleOpenInCanvas = () => {
    const dataToCommit = latestDataset || testRunnerBridge.getLatestDataset();
    if (dataToCommit) {
      onTestCompleted(dataToCommit);
      onClose();
    }
  };

  const isRunning = progress.status === 'running';
  const isPaused = progress.status === 'paused';
  const isCompleted = progress.status === 'completed';

  return (
    <div className="cad-modal-backdrop" onClick={onClose}>
      <div 
        className="cad-modal-dialog cad-modal-dialog-wide" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '980px', width: '95vw' }}
      >
        {/* Header */}
        <div className="cad-modal-header">
          <div className="cad-modal-title">
            <span className="cad-logo-glyph text-cyan">⚡</span>
            <span>Live Test-Bench Execution & Modbus Polling Runner</span>
            <span className="cad-modal-chip font-mono">
              {config.modelId} • {config.ipAddress}:502
            </span>
          </div>
          <button className="cad-modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="cad-modal-tab-bar">
          <button
            className={`cad-modal-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
            disabled={isRunning}
          >
            <Sliders size={13} />
            <span>1. Test Rig Configuration</span>
          </button>
          <button
            className={`cad-modal-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Activity size={13} />
            <span>2. Live Stepping Telemetry ({progress.percent}%)</span>
            {isRunning && <span className="cad-pulse-led-sm"></span>}
          </button>
        </div>

        {/* Modal Body */}
        <div className="cad-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {activeTab === 'config' ? (
            <LiveTestConfigForm
              config={config}
              onChange={(up) => setConfig((prev) => ({ ...prev, ...up }))}
              disabled={isRunning || isPaused}
            />
          ) : (
            <div className="cad-live-execution-pane">
              <LiveTestStageProgress progress={progress} />
              <LiveTestReadingsStream
                readings={progress.currentReadings}
                logStream={progress.logStream}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="cad-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="cad-modal-footer-left font-mono" style={{ fontSize: '11px' }}>
            {isRunning && <span className="text-cyan">⚡ Streaming Excitation Profile ({config.speedMultiplier}× Speed)...</span>}
            {isPaused && <span className="text-amber">⏸ Test Paused at t={progress.elapsedSec}s</span>}
            {isCompleted && (
              <span className="text-emerald font-bold">
                ✓ Run Complete. Verdict: {latestDataset?.metadata?.finalResult?.toUpperCase() || 'EVALUATED'} ({latestDataset?.passRate || '100'}% compliance)
              </span>
            )}
          </div>

          <div className="cad-modal-footer-right" style={{ display: 'flex', gap: '8px' }}>
            {!isRunning && !isPaused && !isCompleted && (
              <>
                <button className="cad-btn-secondary" onClick={handleInstant}>
                  <FastForward size={13} style={{ marginRight: 4 }} />
                  Instant Complete & Evaluate
                </button>
                <button className="cad-btn-primary" onClick={handleStart}>
                  <Play size={13} style={{ marginRight: 4 }} />
                  Start Excitation Profile
                </button>
              </>
            )}

            {(isRunning || isPaused) && (
              <>
                <button className="cad-btn-secondary" onClick={handleInstant}>
                  <FastForward size={13} style={{ marginRight: 4 }} />
                  Fast-Forward to End
                </button>
                <button className="cad-btn-secondary" onClick={handlePauseResume}>
                  {isRunning ? <Pause size={13} style={{ marginRight: 4 }} /> : <Play size={13} style={{ marginRight: 4 }} />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button className="cad-btn-danger" onClick={handleAbort}>
                  <RotateCcw size={13} style={{ marginRight: 4 }} />
                  Abort
                </button>
              </>
            )}

            {isCompleted && (
              <>
                <button className="cad-btn-secondary" onClick={() => { setActiveTab('config'); }}>
                  <RotateCcw size={13} style={{ marginRight: 4 }} />
                  Configure New Run
                </button>
                <button className="cad-btn-primary" onClick={handleOpenInCanvas}>
                  <Layers size={13} style={{ marginRight: 4 }} />
                  Inspect in Workspace Canvas
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

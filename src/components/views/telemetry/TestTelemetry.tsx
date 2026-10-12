import React, { useState, useEffect, useMemo } from 'react';
import { 
  EagleEyeDataset, 
  SubsystemCategory, 
  SUBSYSTEM_LABELS, 
  ParameterSummary 
} from '../../../types';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Thermometer, 
  ArrowLeft
} from '../../Icons';
import { getChannelTrackedQuantity } from '../../../engine/excitation';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';
import { TimebasePreset } from './UnitTelemetryToolbar';
import { TestTelemetryToolbar } from './TestTelemetryToolbar';
import { TestTelemetryChart } from './TestTelemetryChart';

export interface TestTelemetryProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

export const TestTelemetry: React.FC<TestTelemetryProps> = ({
  dataset,
  selectedSensor,
  onBackToOverview,
  onSelectSensor
}) => {
  const [show3Sigma, setShow3Sigma] = useState(true);
  const [showAbsLimits, setShowAbsLimits] = useState(true);
  const [showSetpointOverlay, setShowSetpointOverlay] = useState(false);
  const [highlightExtremes, setHighlightExtremes] = useState(true);
  const [showStageDwells, setShowStageDwells] = useState(true);
  const [timebase, setTimebase] = useState<TimebasePreset>('all');
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(() => 
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const { parameterStats, evaluatedChecks, unitMap } = dataset;
  const stats: ParameterSummary | undefined = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subName = SUBSYSTEM_LABELS[category] || category;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';

  // Sensor evaluations
  const sensorEvaluations = useMemo(() => {
    return evaluatedChecks.filter(c => c.parameter === selectedSensor);
  }, [evaluatedChecks, selectedSensor]);

  const failures = useMemo(() => {
    return sensorEvaluations.filter(c => c.status === 'fail');
  }, [sensorEvaluations]);

  const hasFail = failures.length > 0;
  const trackedQty = useMemo(() => getChannelTrackedQuantity(selectedSensor), [selectedSensor]);

  // Subsystem icon helper
  const renderCategoryIcon = (cat: SubsystemCategory) => {
    switch (cat) {
      case 'hydraulic': return <Droplets size={14} className="text-cyan-400" />;
      case 'pump': return <Activity size={14} className="text-blue-400" />;
      case 'temperature': return <Thermometer size={14} className="text-amber-400" />;
      case 'pressure': return <Gauge size={14} className="text-sky-400" />;
      case 'environmental': return <Wind size={14} className="text-indigo-400" />;
      case 'system': return <Cpu size={14} className="text-purple-400" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };

  return (
    <section className="cad-tab-focused-card row-telemetry-test" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 1. Single-Channel Scope Header Bar */}
      <div className="row-header-bar">
        <div className="row-title-group">
          {onBackToOverview && (
            <>
              <button 
                className="back-overview-btn" 
                onClick={onBackToOverview}
                title={category ? `Return to ${subName} Telemetry` : "Return to general telemetry overview"}
              >
                <ArrowLeft size={13} />
                <span>{subName} Telemetry</span>
              </button>
              <div className="divider-vertical"></div>
            </>
          )}

          <div className="sensor-title-box">
            <span className="category-tag-badge">
              {renderCategoryIcon(category)}
              <span>{category.toUpperCase()}</span>
            </span>
            <h2 className="sensor-main-title">{selectedSensor}</h2>
            {unit && <span className="unit-pill">{unit}</span>}
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Rule">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${hasFail ? 'fail' : 'pass'}`}>
            {hasFail ? (
              <>
                <AlertTriangle size={13} />
                <span>FAILED ({failures.length} of {sensorEvaluations.length} checks)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>PASSED (100% in tolerance)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Full-Height Laboratory Oscilloscope Screen & Toolbar */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <TestTelemetryToolbar
          timebase={timebase}
          onChangeTimebase={setTimebase}
          show3Sigma={show3Sigma}
          onToggle3Sigma={setShow3Sigma}
          showAbsLimits={showAbsLimits}
          onToggleAbsLimits={setShowAbsLimits}
          showSetpointOverlay={showSetpointOverlay}
          onToggleSetpointOverlay={setShowSetpointOverlay}
          showStageDwells={showStageDwells}
          onToggleStageDwells={setShowStageDwells}
          highlightExtremes={highlightExtremes}
          onToggleHighlightExtremes={setHighlightExtremes}
          trackedQty={trackedQty}
          onOpenMetricsModal={() => setShowMetricsModal(true)}
        />

        <TestTelemetryChart
          dataset={dataset}
          selectedSensor={selectedSensor}
          show3Sigma={show3Sigma}
          showAbsLimits={showAbsLimits}
          showSetpointOverlay={showSetpointOverlay}
          highlightExtremes={highlightExtremes}
          showStageDwells={showStageDwells}
          timebase={timebase}
          currentTheme={currentTheme}
          unit={unit}
          category={category}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          trackedQty={trackedQty}
          stats={stats}
          sensorEvaluations={sensorEvaluations}
          hasFail={hasFail}
        />
      </div>

      {/* On-Demand Advanced SPC Metrology Modal */}
      <CadAdvancedMetricsModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        initialSensor={selectedSensor}
        dataset={dataset}
        onSelectSensor={onSelectSensor}
      />
    </section>
  );
};

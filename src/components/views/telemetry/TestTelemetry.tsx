import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
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
import { 
  getChannelTrackedQuantity, 
  generateProgrammedTimeline 
} from '../../../engine/excitation';
import { createStageDwellPlugin } from './stageDwellPlugin';

Chart.register(...registerables);

export interface TestTelemetryProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

type TimebasePreset = 'all' | 'warmup' | 'ramp' | 'cooldown';

export const TestTelemetry: React.FC<TestTelemetryProps> = ({
  dataset,
  selectedSensor,
  onSelectSubsystem,
  onBackToOverview
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Plot view toggle states
  const [show3Sigma, setShow3Sigma] = useState(true);
  const [showAbsLimits, setShowAbsLimits] = useState(true);
  const [showSetpointOverlay, setShowSetpointOverlay] = useState(false);
  const [highlightExtremes, setHighlightExtremes] = useState(true);
  const [showStageDwells, setShowStageDwells] = useState(true);
  const [timebase, setTimebase] = useState<TimebasePreset>('all');

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

  const { measurements, limits, parameterStats, evaluatedChecks, stages, unitMap } = dataset;
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

  // Mean value fallback
  const meanValue = useMemo(() => {
    const validVals = measurements
      .map(m => m[selectedSensor])
      .filter((v): v is number => typeof v === 'number');
    if (validVals.length === 0) return null;
    return validVals.reduce((a, b) => a + b, 0) / validVals.length;
  }, [measurements, selectedSensor]);

  // Dynamic span (Peak - Min)
  const dynamicSpan = useMemo(() => {
    if (typeof stats?.peak === 'number' && typeof stats?.min === 'number') {
      return stats.peak - stats.min;
    }
    return null;
  }, [stats]);

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

  // Render Transient Oscilloscope Chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = measurements.map(m => `${m['Time']}s`);
    const measuredData = measurements.map(m => m[selectedSensor]);

    // Build 3-sigma and abs limits
    const low3Sigma: (number | null)[] = [];
    const high3Sigma: (number | null)[] = [];
    const absMinLine: (number | null)[] = [];
    const absMaxLine: (number | null)[] = [];

    const isDp = selectedSensor.toLowerCase().includes('dp') || (unit.toLowerCase() === 'psi' && category === 'hydraulic');

    for (let mIdx = 0; mIdx < measurements.length; mIdx++) {
      const limitIdx = mIdx >= 2 ? Math.min(limits['mean-3Sigma'].length - 1, mIdx - 2) : 0;
      let low = limits['mean-3Sigma']?.[limitIdx]?.[selectedSensor] ?? null;
      let high = limits['mean+3Sigma']?.[limitIdx]?.[selectedSensor] ?? null;
      let absMin = limits['min']?.[limitIdx]?.[selectedSensor] ?? null;
      let absMax = limits['max']?.[limitIdx]?.[selectedSensor] ?? null;

      if (isDp) {
        // Enforce physical DP properties: DP is strictly >= 0, normal max < 50
        if (low !== null) {
          low = low < 0 || Math.abs(low) > 200 ? 0 : Math.max(0, low);
        }
        if (high !== null && (high > 200 || high < 0)) {
          high = 50;
        }
        if (absMin !== null) {
          absMin = absMin < 0 || Math.abs(absMin) > 200 ? 0 : Math.max(0, absMin);
        }
        if (absMax !== null && (absMax > 200 || absMax === 6553.5)) {
          absMax = high !== null ? Math.min(50, high) : 50;
        }
      }

      low3Sigma.push(low);
      high3Sigma.push(high);
      absMinLine.push(absMin);
      absMaxLine.push(absMax);
    }

    const isDark = currentTheme === 'dark';
    const activeCyan = isDark ? '#00d2ff' : '#0284c7';
    const isPassingTest = !hasFail;
    const curveBorderColor = isPassingTest ? (isDark ? '#10b981' : '#059669') : activeCyan;
    const curveBgColor = isPassingTest 
      ? 'rgba(16, 185, 129, 0.08)' 
      : (isDark ? 'rgba(0, 210, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)');

    // Point colors and radii
    const pointBgColors = measurements.map((_, idx) => {
      if (idx < 2) return '#64748b';
      const check = sensorEvaluations.find(c => c.mIdx === idx);
      if (check && check.status === 'fail') return '#ef4444';
      if (check && check.status === 'warn') return '#f59e0b';
      return isPassingTest ? (isDark ? '#10b981' : '#059669') : activeCyan;
    });

    const pointRadii = measurements.map((m, idx) => {
      const val = m[selectedSensor];
      if (highlightExtremes && (val === stats?.peak || val === stats?.min || val === stats?.settling)) {
        return 5.5;
      }
      const check = sensorEvaluations.find(c => c.mIdx === idx);
      if (check && check.status === 'fail') return 6.5;
      return 3;
    });

    const datasets: any[] = [
      {
        label: `${selectedSensor} (Measured)`,
        data: measuredData,
        borderColor: curveBorderColor,
        backgroundColor: curveBgColor,
        borderWidth: 2.2,
        pointBackgroundColor: pointBgColors,
        pointBorderColor: isDark ? '#0b1120' : '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: pointRadii,
        tension: 0.15,
        zIndex: 10,
        yAxisID: 'y'
      }
    ];

    if (show3Sigma) {
      datasets.push({
        label: 'Upper 3σ Limit (mean + 3σ)',
        data: high3Sigma,
        borderColor: 'rgba(16, 185, 129, 0.85)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: '+1',
        backgroundColor: 'rgba(16, 185, 129, 0.07)',
        yAxisID: 'y'
      });
      datasets.push({
        label: 'Lower 3σ Limit (mean - 3σ)',
        data: low3Sigma,
        borderColor: 'rgba(16, 185, 129, 0.85)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y'
      });
    }

    if (showAbsLimits) {
      datasets.push({
        label: 'Absolute Max',
        data: absMaxLine,
        borderColor: 'rgba(239, 68, 68, 0.45)',
        borderWidth: 1.2,
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y'
      });
      datasets.push({
        label: 'Absolute Min',
        data: absMinLine,
        borderColor: 'rgba(239, 68, 68, 0.45)',
        borderWidth: 1.2,
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false,
        yAxisID: 'y'
      });
    }

    if (showSetpointOverlay) {
      const sharesPrimaryAxis = trackedQty !== 'none';
      const targetQuantity = trackedQty !== 'none' ? trackedQty : 'flow';
      const steppedData = generateProgrammedTimeline(targetQuantity, measurements.map(m => m['Time']));

      const spLabel = targetQuantity === 'flow'
        ? `Programmed Flow SP (Stepped: 160–560 ${flowSpUnit})`
        : targetQuantity === 'dp'
        ? `Programmed DP SP (Stepped: 5–33 ${dpSpUnit})`
        : targetQuantity === 'temp'
        ? 'Programmed Temp SP (Stepped: 21–27°C)'
        : targetQuantity === 'pump'
        ? 'Nominal Pump SP (Stepped: 56–99%)'
        : `Programmed Flow SP (${flowSpUnit})`;

      const spColor = targetQuantity === 'flow' ? '#f59e0b'
        : targetQuantity === 'dp' ? '#10b981'
        : targetQuantity === 'temp' ? '#fb923c'
        : '#8b5cf6';

      datasets.push({
        label: spLabel,
        data: steppedData,
        borderColor: spColor,
        borderWidth: 1.8,
        borderDash: [5, 3],
        stepped: 'before' as const,
        pointRadius: 0,
        fill: false,
        yAxisID: sharesPrimaryAxis ? 'y' : 'ySetpoint'
      });
    }

    // Determine scale limits for timebase preset
    let xMin: string | undefined = undefined;
    let xMax: string | undefined = undefined;

    if (timebase === 'warmup') {
      xMin = labels[0];
      const endIdx = measurements.findIndex(m => m['Time'] === 135);
      xMax = endIdx !== -1 ? labels[endIdx] : labels[Math.min(5, labels.length - 1)];
    } else if (timebase === 'ramp') {
      const startIdx = measurements.findIndex(m => m['Time'] === 135);
      const endIdx = measurements.findIndex(m => m['Time'] === 375);
      xMin = startIdx !== -1 ? labels[startIdx] : labels[0];
      xMax = endIdx !== -1 ? labels[endIdx] : labels[labels.length - 1];
    } else if (timebase === 'cooldown') {
      const startIdx = measurements.findIndex(m => m['Time'] === 375);
      xMin = startIdx !== -1 ? labels[startIdx] : labels[0];
      xMax = labels[labels.length - 1];
    }

    const stageDwellPlugin = createStageDwellPlugin({
      stages,
      measurements,
      isDark,
      enabled: showStageDwells
    });

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      plugins: [stageDwellPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(11, 17, 32, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            titleColor: activeCyan,
            bodyColor: isDark ? '#f8fafc' : '#0f172a',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.9)',
            borderWidth: 1,
            padding: 8,
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 10 },
            callbacks: {
              title: function(tooltipItems) {
                const idx = tooltipItems[0].dataIndex;
                const m = measurements[idx];
                const stage = stages.find(s => s.timeSec === m['Time']);
                return `Time: ${m['Time']}s ${stage ? `(Stage ${stage.stageNum})` : ''} | Flow SP: ${m['Secondary Flow Setpoint'] ?? '-'} ${flowSpUnit} | DP SP: ${m['Secondary DP Setpoint'] ?? '-'} ${dpSpUnit}`;
              },
              label: function(context) {
                const val = context.parsed.y;
                return `${context.dataset.label}: ${val !== null && val !== undefined ? Number(val).toFixed(2) : 'N/A'}`;
              },
              afterBody: function(tooltipItems) {
                const idx = tooltipItems[0].dataIndex;
                const check = sensorEvaluations.find(c => c.mIdx === idx);
                if (check) {
                  const lines = [`Required Range: ${check.requiredRangeStr || 'N/A'}`];
                  if (check.status === 'fail') {
                    lines.push(`❌ FAIL: ${check.failureReason || 'Out of tolerance'}`);
                  } else if (check.marginBuffer !== null) {
                    lines.push(`Margin Buffer: +${check.marginBuffer.toFixed(2)} ${check.unit}`);
                  }
                  return lines;
                }
                return [];
              }
            }
          }
        },
        scales: {
          x: {
            min: xMin,
            max: xMax,
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 9.5 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            ...(isDp ? {
              min: 0,
              max: Math.max(50, Math.ceil(((stats?.peak ?? 0) * 1.1) / 10) * 10),
              suggestedMax: 50,
            } : {}),
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { 
              color: isDark ? '#94a3b8' : '#334155', 
              font: { family: "'JetBrains Mono', monospace", size: 9.5 },
              ...(isDp ? { stepSize: 10 } : {})
            },
            title: {
              display: true,
              text: unit ? `${selectedSensor} (${unit})` : selectedSensor,
              color: isDark ? '#94a3b8' : '#475569',
              font: { size: 10, weight: 'bold' }
            }
          },
          ...(showSetpointOverlay && trackedQty === 'none' ? {
            ySetpoint: {
              type: 'linear' as const,
              position: 'right' as const,
              grid: { drawOnChartArea: false },
              ticks: { color: '#f59e0b', font: { size: 9 } },
              title: {
                display: true,
                text: `Flow Setpoint (${flowSpUnit})`,
                color: '#f59e0b',
                font: { size: 9.5 }
              }
            }
          } : {})
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [
    selectedSensor, 
    measurements, 
    limits, 
    show3Sigma, 
    showAbsLimits, 
    showSetpointOverlay, 
    highlightExtremes, 
    showStageDwells,
    timebase,
    sensorEvaluations, 
    stats, 
    currentTheme, 
    hasFail, 
    flowSpUnit, 
    dpSpUnit, 
    unit,
    stages,
    trackedQty
  ]);

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

      {/* 2. Laboratory Oscilloscope Screen & Toolbar */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <div className="plot-header-bar" style={{ padding: '0 0 10px 0', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '8px' }}>
          <div className="plot-title-group">
            <Activity size={15} className="text-cyan-400" />
            <span className="plot-title">Laboratory Multi-Channel Transient Oscilloscope</span>
            <span className="plot-subtitle">High-Speed 1 Hz Time Series (0s – 525s Cooldown Run)</span>
          </div>

          <div className="plot-controls-group" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Timebase Presets */}
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setTimebase('all')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: timebase === 'all' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === 'all' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === 'all' ? 700 : 500
                }}
                title="View full 0s to 525s cooldown run"
              >
                All (0–525s)
              </button>
              <button
                type="button"
                onClick={() => setTimebase('warmup')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: timebase === 'warmup' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === 'warmup' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === 'warmup' ? 700 : 500
                }}
                title="Zoom into Warmup & Low-Flow Baseline (Stages 1–3)"
              >
                Warmup (S1–S3)
              </button>
              <button
                type="button"
                onClick={() => setTimebase('ramp')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: timebase === 'ramp' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === 'ramp' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === 'ramp' ? 700 : 500
                }}
                title="Zoom into Load Ramp & Peak Excitation (Stages 4–6)"
              >
                Load Ramp (S4–S6)
              </button>
              <button
                type="button"
                onClick={() => setTimebase('cooldown')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: timebase === 'cooldown' ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === 'cooldown' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === 'cooldown' ? 700 : 500
                }}
                title="Zoom into Steady-State Cooldown (Stages 7–10)"
              >
                Steady-State (S7–S10)
              </button>
            </div>

            <div className="divider-vertical" style={{ height: '16px' }}></div>

            {/* Oscilloscope Channel Toggles */}
            <label className="plot-toggle-btn">
              <input 
                type="checkbox" 
                checked={show3Sigma} 
                onChange={(e) => setShow3Sigma(e.target.checked)} 
              />
              <span className="legend-indicator band-green"></span>
              <span>3σ Envelope</span>
            </label>

            <label className="plot-toggle-btn">
              <input 
                type="checkbox" 
                checked={showAbsLimits} 
                onChange={(e) => setShowAbsLimits(e.target.checked)} 
              />
              <span className="legend-indicator dotted-red"></span>
              <span>Min / Max</span>
            </label>

            <label className="plot-toggle-btn" title="Toggle 10-stage ideal stepped programmed setpoint curve">
              <input 
                type="checkbox" 
                checked={showSetpointOverlay} 
                onChange={(e) => setShowSetpointOverlay(e.target.checked)} 
              />
              <span className="legend-indicator dotted-amber"></span>
              <span>
                {trackedQty !== 'none' 
                  ? `${trackedQty.toUpperCase()} SP` 
                  : 'Flow SP'}
              </span>
            </label>

            <label className="plot-toggle-btn" title="Toggle vertical stage dwell transition boundary lines">
              <input 
                type="checkbox" 
                checked={showStageDwells} 
                onChange={(e) => setShowStageDwells(e.target.checked)} 
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)' }}>┊ S1..S10</span>
              <span>Stage Dwells</span>
            </label>

            <label className="plot-toggle-btn">
              <input 
                type="checkbox" 
                checked={highlightExtremes} 
                onChange={(e) => setHighlightExtremes(e.target.checked)} 
              />
              <span>Extremes</span>
            </label>
          </div>
        </div>

        {/* Canvas Area: Expanded responsive oscilloscope display */}
        <div className="plot-canvas-area" style={{ height: '520px', minHeight: '440px', padding: '8px 0', flex: 1 }}>
          <canvas ref={chartCanvasRef}></canvas>
        </div>

        {/* 3. Oscilloscope Metrology Status HUD */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '8px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-panel)',
          padding: '8px 12px',
          borderRadius: '6px'
        }}>
          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Process Mean (μ)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {stats?.nominalMean !== null && stats?.nominalMean !== undefined 
                ? `${stats.nominalMean.toFixed(2)} ${unit}` 
                : (meanValue !== null ? `${meanValue.toFixed(2)} ${unit}` : '--')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Process Sigma (σ)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
              {stats?.processSigma !== null && stats?.processSigma !== undefined 
                ? `±${stats.processSigma.toFixed(3)} ${unit}` 
                : '--'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Peak (Max)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {typeof stats?.peak === 'number' ? `${stats.peak.toFixed(1)} ${unit}` : (stats?.peak ?? '--')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Minimum (Min)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
              {typeof stats?.min === 'number' ? `${stats.min.toFixed(1)} ${unit}` : (stats?.min ?? '--')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settling (525s)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {typeof stats?.settling === 'number' ? `${stats.settling.toFixed(1)} ${unit}` : (stats?.settling ?? '--')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Worst Margin Buffer</div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 700, 
              fontFamily: 'var(--font-mono)', 
              color: (stats?.worstMargin ?? 0) < 0 ? 'var(--danger)' : 'var(--success)' 
            }}>
              {stats?.worstMargin !== null && stats?.worstMargin !== undefined 
                ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}` 
                : '--'}
            </div>
          </div>

          {dynamicSpan !== null && (
            <div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dynamic Span (Δ)</div>
              <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {dynamicSpan.toFixed(2)} {unit}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>3σ Bounds (μ±3σ)</div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {stats?.low3Sigma !== null && stats?.high3Sigma !== null && stats?.low3Sigma !== undefined && stats?.high3Sigma !== undefined
                ? `[${stats.low3Sigma.toFixed(1)} ~ ${stats.high3Sigma.toFixed(1)}]`
                : '--'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

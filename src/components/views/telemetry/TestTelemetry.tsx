import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { 
  EagleEyeDataset, 
  SubsystemCategory, 
  SUBSYSTEM_LABELS, 
  ParameterSummary,
  EvaluatedPoint
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
  ArrowLeft,
  Sliders,
  Table,
  Cpu as ModbusIcon,
  BarChart2
} from '../../Icons';
import { getRegisterByName } from '../../../engine/registers';
import { CadRegisterBadge } from '../../cad/CadRegisterBadge';

Chart.register(...registerables);

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
  onSelectSubsystem,
  onBackToOverview,
  onSelectSensor
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Plot view toggle states
  const [show3Sigma, setShow3Sigma] = useState(true);
  const [showAbsLimits, setShowAbsLimits] = useState(true);
  const [showSetpointOverlay, setShowSetpointOverlay] = useState(false);
  const [highlightExtremes, setHighlightExtremes] = useState(true);

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

  // Mean value fallback
  const meanValue = useMemo(() => {
    const validVals = measurements
      .map(m => m[selectedSensor])
      .filter((v): v is number => typeof v === 'number');
    if (validVals.length === 0) return null;
    return validVals.reduce((a, b) => a + b, 0) / validVals.length;
  }, [measurements, selectedSensor]);

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

  // Authoritative Modbus register definition
  const regDef = useMemo(() => getRegisterByName(selectedSensor), [selectedSensor]);
  const modbusAddress = useMemo(() => {
    if (regDef) return `Address ${regDef.address} (${regDef.displayName})`;
    return 'Standard PLC Holding Register';
  }, [regDef]);

  // Dynamic span (Peak - Min)
  const dynamicSpan = useMemo(() => {
    if (typeof stats?.peak === 'number' && typeof stats?.min === 'number') {
      return stats.peak - stats.min;
    }
    return null;
  }, [stats]);

  // Render Transient Chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = measurements.map(m => `${m['Time']}s`);
    const measuredData = measurements.map(m => m[selectedSensor]);
    const flowSpData = measurements.map(m => m['Secondary Flow Setpoint']);

    // Build 3-sigma and abs limits
    const low3Sigma: (number | null)[] = [];
    const high3Sigma: (number | null)[] = [];
    const absMinLine: (number | null)[] = [];
    const absMaxLine: (number | null)[] = [];

    for (let mIdx = 0; mIdx < measurements.length; mIdx++) {
      const limitIdx = mIdx >= 2 ? Math.min(limits['mean-3Sigma'].length - 1, mIdx - 2) : 0;
      low3Sigma.push(limits['mean-3Sigma']?.[limitIdx]?.[selectedSensor] ?? null);
      high3Sigma.push(limits['mean+3Sigma']?.[limitIdx]?.[selectedSensor] ?? null);
      absMinLine.push(limits['min']?.[limitIdx]?.[selectedSensor] ?? null);
      absMaxLine.push(limits['max']?.[limitIdx]?.[selectedSensor] ?? null);
    }

    const isDark = currentTheme === 'dark';
    const activeCyan = isDark ? '#00d2ff' : '#0284c7';
    const isPassingTest = !hasFail;
    const curveBorderColor = isPassingTest ? (isDark ? '#10b981' : '#059669') : activeCyan;
    const curveBgColor = isPassingTest 
      ? 'rgba(16, 185, 129, 0.08)' 
      : (isDark ? 'rgba(0, 210, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)');

    // Point colors and radii
    const pointBgColors = measurements.map((m, idx) => {
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
      datasets.push({
        label: `Flow Setpoint (${flowSpUnit})`,
        data: flowSpData,
        borderColor: 'rgba(245, 158, 11, 0.65)',
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        yAxisID: 'ySetpoint'
      });
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
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
            display: false // Controlled via top custom toolbar
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
                return `Time: ${m['Time']}sec | Flow SP: ${m['Secondary Flow Setpoint'] ?? '-'} ${flowSpUnit} | DP SP: ${m['Secondary DP Setpoint'] ?? '-'} ${dpSpUnit}`;
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
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 9.5 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: isDark ? '#94a3b8' : '#334155', font: { family: "'JetBrains Mono', monospace", size: 9.5 } },
            title: {
              display: true,
              text: unit ? `${selectedSensor} (${unit})` : selectedSensor,
              color: isDark ? '#94a3b8' : '#475569',
              font: { size: 10, weight: 'bold' }
            }
          },
          ...(showSetpointOverlay ? {
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
    sensorEvaluations, 
    stats, 
    currentTheme, 
    hasFail, 
    flowSpUnit, 
    dpSpUnit, 
    unit
  ]);

  return (
    <section className="cad-tab-focused-card row-telemetry-test">
      {/* 1. Single-Channel Header Bar */}
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

      {/* 2. Waveform & 3-Sigma Plot Card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div className="plot-header-bar" style={{ padding: '0 0 10px 0', borderBottom: 'none' }}>
          <div className="plot-title-group">
            <Activity size={15} className="text-cyan-400" />
            <span className="plot-title">Transient Laboratory Oscilloscope & Tolerance Envelope</span>
            <span className="plot-subtitle">Interactive 10-Stage Time Series Analysis</span>
          </div>

          <div className="plot-controls-group">
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
              <span>Min / Max Limits</span>
            </label>

            <label className="plot-toggle-btn">
              <input 
                type="checkbox" 
                checked={showSetpointOverlay} 
                onChange={(e) => setShowSetpointOverlay(e.target.checked)} 
              />
              <span className="legend-indicator dotted-amber"></span>
              <span>Flow Setpoint Overlay</span>
            </label>

            <label className="plot-toggle-btn">
              <input 
                type="checkbox" 
                checked={highlightExtremes} 
                onChange={(e) => setHighlightExtremes(e.target.checked)} 
              />
              <span>Annotate Extremes</span>
            </label>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="plot-canvas-area" style={{ height: '420px', minHeight: '360px', padding: 0 }}>
          <canvas ref={chartCanvasRef}></canvas>
        </div>
      </div>

      {/* 3. Modbus Register Telemetry & Triad Metrics Grid */}
      <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0, fontSize: '12.5px' }}>
              Modbus Holding Register Telemetry & Statistical Process Control (SPC)
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Hardware register decoding, 0-10V analog scaling, parametric triad and 3-sigma tolerance boundaries
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ModbusIcon size={13} className="text-purple-400" />
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Port 502 (169.254.244.6)
            </span>
          </div>
        </div>

        <div className="cad-property-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '10px' }}>
          {/* Card A: Modbus Register Hardware & Conditioning */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Modbus TCP & Signal Conditioning</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Holding Register</td>
                  <td className="cad-prop-val font-mono font-bold text-cyan">{modbusAddress}</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Data Representation</td>
                  <td className="cad-prop-val font-mono">
                    {category === 'pressure' || selectedSensor.includes('DP') 
                      ? 'Signed Int16 (Two\'s Complement)' 
                      : 'IEEE 754 Float32'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">0–10V Scaling</td>
                  <td className="cad-prop-val">
                    {category === 'pump' || selectedSensor.includes('FCV') ? (
                      <span className="cad-active-tag">10× Normalized (0–100%)</span>
                    ) : (
                      <span className="cad-dim-tag">Direct Physical Unit</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Sampling Interval</td>
                  <td className="cad-prop-val font-mono">1,000 ms (1 Hz) | Dwells 15s–60s</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Sentinel Health (0xFFFF)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.peak === 6553.5 ? (
                      <span className="text-red font-bold">0xFFFF Open-Circuit Fault</span>
                    ) : (
                      <span className="text-green font-bold">Normal Transducer Bus</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card B: Statistical Triad & SPC Distribution Metrics */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Statistical Distribution & Parametric Triad</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Lower 3σ (μ - 3σ)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.low3Sigma !== null && stats?.low3Sigma !== undefined 
                      ? `${stats.low3Sigma.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Process Mean (μ)</td>
                  <td className="cad-prop-val font-mono font-bold">
                    {stats?.nominalMean !== null && stats?.nominalMean !== undefined 
                      ? `${stats.nominalMean.toFixed(2)} ${unit}` 
                      : (meanValue !== null ? `${meanValue.toFixed(2)} ${unit}` : '--')}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Upper 3σ (μ + 3σ)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.high3Sigma !== null && stats?.high3Sigma !== undefined 
                      ? `${stats.high3Sigma.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Process Sigma (σ)</td>
                  <td className="cad-prop-val font-mono text-amber">
                    {stats?.processSigma !== null && stats?.processSigma !== undefined 
                      ? `${stats.processSigma.toFixed(3)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Triad: Peak / Min / Settle</td>
                  <td className="cad-prop-val font-mono">
                    P: <strong>{typeof stats?.peak === 'number' ? stats.peak.toFixed(1) : (stats?.peak ?? '--')}</strong> | M: <strong>{typeof stats?.min === 'number' ? stats.min.toFixed(1) : (stats?.min ?? '--')}</strong> | S: <strong>{typeof stats?.settling === 'number' ? stats.settling.toFixed(1) : (stats?.settling ?? '--')}</strong>
                  </td>
                </tr>
                {dynamicSpan !== null && (
                  <tr>
                    <td className="cad-prop-key">Dynamic Peak-to-Peak Span</td>
                    <td className="cad-prop-val font-mono">
                      Δ {dynamicSpan.toFixed(2)} {unit}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="cad-prop-key">Worst Margin Buffer</td>
                  <td className="cad-prop-val font-mono font-bold">
                    {stats?.worstMargin !== null && stats?.worstMargin !== undefined ? (
                      <span style={{ color: stats.worstMargin < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {stats.worstMargin >= 0 ? '+' : ''}{stats.worstMargin.toFixed(2)} {unit}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. 10-Stage Operating Dwell Points Ledger */}
      <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0, fontSize: '13px' }}>
              10-Stage Operating Dwell Points Ledger ({selectedSensor})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Step-by-step dwell evaluation vs 3σ tolerance limits, sigma deviation (Z), and margin buffer
            </span>
          </div>

          <div>
            {hasFail ? (
              <span className="cad-tab-badge-count fail">{failures.length} Out-of-Tolerance Failures</span>
            ) : (
              <span className="cad-tab-badge-count pass">100% Tolerance Compliance</span>
            )}
          </div>
        </div>

        <div className="datasheet-table-wrapper" style={{ maxHeight: '340px', overflowY: 'auto' }}>
          <table className="datasheet-table">
            <thead>
              <tr>
                <th>Time (Stage)</th>
                <th>Flow SP</th>
                <th>DP SP</th>
                <th>Measured Value</th>
                <th>Lower 3σ (μ - 3σ)</th>
                <th>Process Mean (μ)</th>
                <th>Upper 3σ (μ + 3σ)</th>
                <th>Process Sigma (σ)</th>
                <th>Sigma Dev (Z)</th>
                <th>Margin Buffer</th>
                <th>3σ Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sensorEvaluations.map((pt, idx) => {
                const isFail = pt.status === 'fail';
                const isWarn = pt.status === 'warn';
                return (
                  <tr key={`${pt.timeSec}-${idx}`} className={isFail ? 'row-failed' : (isWarn ? 'row-warn' : '')}>
                    <td className="time-col font-mono">
                      <span>{pt.timeSec}s</span>
                      <span className="stage-num-tag">Stage {Math.min(10, Math.floor(idx / 3) + 1)}</span>
                    </td>
                    <td className="sp-col font-mono">{pt.flowSp !== null ? `${pt.flowSp} ${flowSpUnit}` : '-'}</td>
                    <td className="sp-col font-mono">{pt.dpSp !== null ? `${pt.dpSp} ${dpSpUnit}` : '-'}</td>
                    <td className="val-col font-mono font-bold">
                      {typeof pt.measured === 'number' ? pt.measured.toFixed(2) : (pt.measured ?? '-')} {pt.unit}
                    </td>
                    <td className="limit-col font-mono">
                      {typeof pt.lowLimit === 'number' ? `${pt.lowLimit.toFixed(2)} ${pt.unit}` : (pt.lowLimit ?? '-')}
                    </td>
                    <td className="mean-col font-mono">
                      {typeof pt.nominalMean === 'number' ? `${pt.nominalMean.toFixed(2)} ${pt.unit}` : '-'}
                    </td>
                    <td className="limit-col font-mono">
                      {typeof pt.highLimit === 'number' ? `${pt.highLimit.toFixed(2)} ${pt.unit}` : (pt.highLimit ?? '-')}
                    </td>
                    <td className="sigma-col font-mono text-xs">
                      {typeof pt.processSigma === 'number' ? (
                        <span>
                          {pt.processSigma.toFixed(3)} <span className="text-slate-400 font-normal">(±{pt.threeSigmaSpan?.toFixed(2)})</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="z-col font-mono">
                      {typeof pt.zScore === 'number' ? (
                        <span className={`z-score-pill ${Math.abs(pt.zScore) > 3.0 ? 'fail' : (Math.abs(pt.zScore) > 2.5 ? 'warn' : 'pass')}`}>
                          {pt.zScore > 0 ? '+' : ''}{pt.zScore.toFixed(2)}σ
                        </span>
                      ) : '-'}
                    </td>
                    <td className="margin-col font-mono">
                      {pt.marginBuffer !== null ? (
                        <span className={pt.marginBuffer < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {pt.marginBuffer >= 0 ? '+' : ''}{pt.marginBuffer.toFixed(2)} {pt.unit}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="status-col">
                      <span className={`status-pill-small ${pt.status}`}>
                        {isFail ? 'FAIL (>3σ)' : (isWarn ? 'WARN' : 'PASS (≤3σ)')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

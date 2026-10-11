import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { 
  EagleEyeDataset, 
  SubsystemCategory, 
  SUBSYSTEM_LABELS 
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
  ChevronRight,
  Layers
} from '../../Icons';
import { TransientSummaryCard } from './TransientSummaryCard';
import { createStageDwellPlugin } from './stageDwellPlugin';

Chart.register(...registerables);

export interface UnitTelemetryProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

interface PrimaryCurveDef {
  key: string;
  name: string;
  unit: string;
  color: string;
  yAxisID: string;
  isSetpoint?: boolean;
}

type TimebasePreset = 'all' | 'warmup' | 'ramp' | 'cooldown';

export const UnitTelemetry: React.FC<UnitTelemetryProps> = ({
  dataset,
  onSelectSubsystem
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

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

  const { 
    metadata, 
    headers, 
    measurements, 
    parameterStats, 
    unitMap, 
    failedCount, 
    stages, 
    categoryCounts 
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  // Available key excitation & feedback channels
  const availablePrimaryCurves = useMemo<PrimaryCurveDef[]>(() => {
    const list: PrimaryCurveDef[] = [];

    // 1. Secondary Flow Setpoint
    if (headers.includes('Secondary Flow Setpoint')) {
      list.push({
        key: 'Secondary Flow Setpoint',
        name: 'Secondary Flow SP',
        unit: flowSpUnit,
        color: '#f59e0b', // Amber
        yAxisID: 'yFlow',
        isSetpoint: true
      });
    }

    // 2. Secondary DP Setpoint
    if (headers.includes('Secondary DP Setpoint')) {
      list.push({
        key: 'Secondary DP Setpoint',
        name: 'Secondary DP SP',
        unit: dpSpUnit,
        color: '#0284c7', // Sky Blue
        yAxisID: 'yPressure',
        isSetpoint: true
      });
    }

    // 3. Flow Feedback (FT01 or FT61)
    const flowSensor = ['FT01', 'FT61'].find(k => headers.includes(k));
    if (flowSensor) {
      list.push({
        key: flowSensor,
        name: `${flowSensor} Flow Feedback`,
        unit: unitMap[flowSensor] || 'LPM',
        color: '#10b981', // Emerald
        yAxisID: 'yFlow'
      });
    }

    // 4. Differential Pressure Feedback (Secondary DP)
    const dpSensor = ['Secondary DP (Supply - Return)', 'Primary DP (Supply - Return)', 'PT01'].find(k => headers.includes(k));
    if (dpSensor) {
      list.push({
        key: dpSensor,
        name: dpSensor.includes('Secondary DP') ? 'Secondary DP Feedback' : `${dpSensor} Feedback`,
        unit: unitMap[dpSensor] || 'psi',
        color: '#8b5cf6', // Violet
        yAxisID: 'yPressure'
      });
    }

    // 5. Pump Speed %
    const pumpSensor = ['P31 Speed %', 'P41 Speed %'].find(k => headers.includes(k));
    if (pumpSensor) {
      list.push({
        key: pumpSensor,
        name: `${pumpSensor} Feedback`,
        unit: '%',
        color: '#06b6d4', // Cyan
        yAxisID: 'yPercent'
      });
    }

    // 6. Secondary Supply Temp
    const tempSensor = ['TT01', 'TT61', 'Secondary Temperature Setpoint'].find(k => headers.includes(k));
    if (tempSensor) {
      list.push({
        key: tempSensor,
        name: tempSensor.includes('Setpoint') ? 'Supply Temp SP' : `${tempSensor} Supply Temp`,
        unit: unitMap[tempSensor] || '°C',
        color: '#f43f5e', // Rose
        yAxisID: 'yPercent'
      });
    }

    return list;
  }, [headers, flowSpUnit, dpSpUnit, unitMap]);

  // Curve visibility states
  const [visibleCurves, setVisibleCurves] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    availablePrimaryCurves.forEach(c => {
      init[c.key] = true;
    });
    return init;
  });

  useEffect(() => {
    setVisibleCurves(prev => {
      const next = { ...prev };
      let changed = false;
      availablePrimaryCurves.forEach(c => {
        if (next[c.key] === undefined) {
          next[c.key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [availablePrimaryCurves]);

  const toggleCurve = (key: string) => {
    setVisibleCurves(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setAllCurves = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    availablePrimaryCurves.forEach(c => {
      next[c.key] = visible;
    });
    setVisibleCurves(next);
  };

  const [showStageDwells, setShowStageDwells] = useState(true);
  const [timebase, setTimebase] = useState<TimebasePreset>('all');
  const [focusedStage, setFocusedStage] = useState<number | null>(null);

  // Render Operational Multi-Curve Chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = measurements.map(m => `${m['Time']}s`);
    const isDark = currentTheme === 'dark';

    const datasets: any[] = availablePrimaryCurves
      .filter(c => visibleCurves[c.key])
      .map(c => {
        const data = measurements.map(m => m[c.key]);
        return {
          label: `${c.name} (${c.unit})`,
          data,
          borderColor: c.color,
          backgroundColor: c.isSetpoint ? 'transparent' : `${c.color}15`,
          borderWidth: c.isSetpoint ? 1.8 : 2.2,
          borderDash: c.isSetpoint ? [5, 4] : undefined,
          stepped: c.isSetpoint ? ('before' as const) : undefined,
          pointRadius: 2.5,
          pointHoverRadius: 5.5,
          pointBackgroundColor: c.color,
          pointBorderColor: isDark ? '#0b1120' : '#ffffff',
          pointBorderWidth: 1.5,
          tension: c.isSetpoint ? 0 : 0.15,
          yAxisID: c.yAxisID
        };
      });

    // Determine scale limits for timebase preset or focused stage
    let xMin: string | undefined = undefined;
    let xMax: string | undefined = undefined;

    if (focusedStage !== null) {
      const stg = stages.find(s => s.stageNum === focusedStage);
      if (stg) {
        const curIdx = measurements.findIndex(m => m['Time'] === stg.timeSec);
        if (curIdx !== -1) {
          const startIdx = Math.max(0, curIdx - 2);
          const endIdx = Math.min(labels.length - 1, curIdx + 2);
          xMin = labels[startIdx];
          xMax = labels[endIdx];
        }
      }
    } else if (timebase === 'warmup') {
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
            titleColor: isDark ? '#00d2ff' : '#0284c7',
            bodyColor: isDark ? '#f8fafc' : '#0f172a',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.9)',
            borderWidth: 1,
            padding: 10,
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 10 },
            callbacks: {
              title: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const m = measurements[idx];
                const stage = stages.find(s => s.timeSec === m['Time']);
                return `Time: ${m['Time']}s ${stage ? `(Stage ${stage.stageNum})` : ''}`;
              },
              label: (context) => {
                const val = context.parsed.y;
                return `${context.dataset.label}: ${val !== null && val !== undefined ? Number(val).toFixed(2) : 'N/A'}`;
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
          yFlow: {
            type: 'linear',
            position: 'left',
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: '#f59e0b', font: { family: "'JetBrains Mono', monospace", size: 9.5 } },
            title: {
              display: true,
              text: `Flow (${flowSpUnit})`,
              color: '#f59e0b',
              font: { size: 10, weight: 'bold' }
            }
          },
          yPressure: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#0284c7', font: { family: "'JetBrains Mono', monospace", size: 9.5 } },
            title: {
              display: true,
              text: `Pressure / DP (${dpSpUnit})`,
              color: '#0284c7',
              font: { size: 10, weight: 'bold' }
            }
          },
          yPercent: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#06b6d4', font: { family: "'JetBrains Mono', monospace", size: 9 } },
            title: {
              display: true,
              text: `Speed % / Temp (${tempSpUnit})`,
              color: '#06b6d4',
              font: { size: 9.5 }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [
    measurements, 
    availablePrimaryCurves, 
    visibleCurves, 
    currentTheme, 
    stages, 
    flowSpUnit, 
    dpSpUnit, 
    tempSpUnit,
    showStageDwells,
    timebase,
    focusedStage
  ]);

  const activeCurvesCount = Object.values(visibleCurves).filter(Boolean).length;

  return (
    <section className="cad-tab-focused-card row-telemetry-unit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Bar: Whole Unit Telemetry Identity */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            <Activity size={16} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="sensor-main-title">
              Whole-Unit Operational Telemetry & System Excitation Oscilloscope
            </h2>
            <span className="unit-metadata-sub">
              Unit Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | Work Order: <strong>{metadata.workOrderNumber || 'N/A'}</strong> | Duration: <strong>525s Cooldown Run</strong> | Operating Stages: <strong>10 Steps</strong>
            </span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Rule">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${failedCount > 0 ? 'fail' : 'pass'}`}>
            {failedCount > 0 ? (
              <>
                <AlertTriangle size={13} />
                <span>OVERALL: FAIL ({failedCount} Violations)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>OVERALL: PASS (100% in tolerance)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Transient Analytics Summary Card (Flow, DP, Temp Tracking Loops) */}
      <TransientSummaryCard dataset={dataset} />

      {/* 2. Whole-Unit Operational Overview Chart Card */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              Multi-Axis Laboratory Oscilloscope & Primary Feedback Overlay
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Primary excitation setpoints plotted alongside real-time unit flow, differential pressure, pump speed, and thermal feedbacks
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {/* Timebase Presets */}
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => { setTimebase('all'); setFocusedStage(null); }}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  border: 'none',
                  cursor: 'pointer',
                  background: timebase === 'all' && focusedStage === null ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                  color: timebase === 'all' && focusedStage === null ? '#ffffff' : 'var(--text-main)',
                  fontWeight: timebase === 'all' && focusedStage === null ? 700 : 500
                }}
                title="View full 0s to 525s cooldown run"
              >
                All (0–525s)
              </button>
              <button
                type="button"
                onClick={() => { setTimebase('warmup'); setFocusedStage(null); }}
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
                title="Zoom into Warmup (Stages 1–3)"
              >
                Warmup (S1–S3)
              </button>
              <button
                type="button"
                onClick={() => { setTimebase('ramp'); setFocusedStage(null); }}
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
                title="Zoom into Load Ramp (Stages 4–6)"
              >
                Load Ramp (S4–S6)
              </button>
              <button
                type="button"
                onClick={() => { setTimebase('cooldown'); setFocusedStage(null); }}
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
                title="Zoom into Steady-State (Stages 7–10)"
              >
                Steady-State (S7–S10)
              </button>
            </div>

            <div className="divider-vertical" style={{ height: '16px' }}></div>

            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Curves: <strong>{activeCurvesCount}</strong>/{availablePrimaryCurves.length}
            </span>

            <button
              onClick={() => setAllCurves(true)}
              className="cad-sheet-table-action-btn"
              title="Enable all primary curves"
            >
              Select All
            </button>
            <button
              onClick={() => setAllCurves(false)}
              className="cad-sheet-table-action-btn"
              title="Deselect all curves"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Curve Toggle Chips & Stage Dwell Toggle */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none', fontSize: '11px', marginRight: '6px' }}>
            <input 
              type="checkbox" 
              checked={showStageDwells} 
              onChange={(e) => setShowStageDwells(e.target.checked)} 
              style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-cyan)' }}>┊ S1..S10</span>
            <span style={{ color: showStageDwells ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Stage Dwells
            </span>
          </label>

          {availablePrimaryCurves.map(c => {
            const isVisible = !!visibleCurves[c.key];
            const stat = parameterStats[c.key];
            const settlingVal = stat?.settling !== null && stat?.settling !== undefined 
              ? (typeof stat.settling === 'number' ? stat.settling.toFixed(1) : stat.settling)
              : null;

            return (
              <label 
                key={c.key} 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '14px',
                  border: `1px solid ${isVisible ? c.color : 'var(--border-color)'}`,
                  background: isVisible ? `${c.color}15` : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isVisible}
                  onChange={() => toggleCurve(c.key)}
                  style={{ cursor: 'pointer', accentColor: c.color }}
                />
                <span 
                  style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: c.color,
                    boxShadow: isVisible ? `0 0 5px ${c.color}` : 'none'
                  }} 
                />
                <span style={{ fontWeight: 600, color: isVisible ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {c.name}
                </span>
                {settlingVal !== null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: c.color, fontWeight: 'bold' }}>
                    {settlingVal} {c.unit}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Chart Canvas Area */}
        <div className="plot-canvas-area" style={{ height: '480px', minHeight: '400px', padding: 0, flex: 1 }}>
          <canvas ref={chartCanvasRef}></canvas>
        </div>
      </div>

      {/* 3. 10-Stage Operating Progression Ribbon (Interactive Oscilloscope Dwell Navigator) */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
              10 Operating Stages Progression (Excitation & Step Dwells)
            </span>
            {focusedStage !== null && (
              <button
                type="button"
                onClick={() => setFocusedStage(null)}
                className="cad-sheet-table-action-btn"
                style={{ fontSize: '10px', padding: '1px 6px' }}
                title="Reset zoom to show all stages"
              >
                Reset Stage Zoom
              </button>
            )}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Click any stage dwell card to isolate on the oscilloscope waveform
          </span>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', 
          gap: '6px' 
        }}>
          {stages.map((stg) => {
            const isStagePass = stg.isPass;
            const isFocused = focusedStage === stg.stageNum;

            return (
              <div 
                key={`stage-ribbon-${stg.stageNum}`}
                onClick={() => setFocusedStage(isFocused ? null : stg.stageNum)}
                style={{
                  background: isFocused ? 'rgba(0, 210, 255, 0.12)' : 'var(--bg-card)',
                  border: `1px solid ${isFocused ? 'var(--accent-cyan)' : (isStagePass ? 'var(--border-color)' : 'var(--danger-border)')}`,
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={`Click to focus oscilloscope on Stage ${stg.stageNum} (${stg.timeSec}s dwell)`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: isFocused ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                    S{stg.stageNum} ({stg.timeSec}s)
                  </span>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: isStagePass ? 'var(--success)' : 'var(--danger)' 
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>
                  <span>Flow:</span>
                  <strong className="text-amber-400">{stg.flowSp !== null ? `${stg.flowSp}` : '--'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>
                  <span>DP:</span>
                  <strong className="text-cyan-400">{stg.dpSp !== null ? `${stg.dpSp}` : '--'}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Subsystem Scope Quick Focus Strip */}
      {onSelectSubsystem && (
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} className="text-cyan-400" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>
              Subsystem Oscilloscopes:
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {([
              { id: 'hydraulic' as SubsystemCategory, name: 'Hydraulic & DP', icon: <Droplets size={12} className="text-cyan-400" /> },
              { id: 'pump' as SubsystemCategory, name: 'Pumps & VFD', icon: <Activity size={12} className="text-blue-400" /> },
              { id: 'temperature' as SubsystemCategory, name: 'Temperature', icon: <Thermometer size={12} className="text-amber-400" /> },
              { id: 'pressure' as SubsystemCategory, name: 'Pressure', icon: <Gauge size={12} className="text-sky-400" /> },
              { id: 'environmental' as SubsystemCategory, name: 'Ambient', icon: <Wind size={12} className="text-indigo-400" /> },
              { id: 'system' as SubsystemCategory, name: 'System', icon: <Cpu size={12} className="text-purple-400" /> }
            ]).map(sub => {
              const fails = categoryCounts[sub.id]?.fail ?? 0;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubsystem(sub.id)}
                  className="cad-sheet-table-action-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', padding: '3px 8px' }}
                  title={`Open dedicated multi-channel oscilloscope for ${sub.name}`}
                >
                  {sub.icon}
                  <span>{sub.name}</span>
                  {fails > 0 ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>({fails})</span>
                  ) : null}
                  <ChevronRight size={10} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

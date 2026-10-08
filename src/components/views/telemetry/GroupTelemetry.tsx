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
  ArrowLeft,
  ChevronRight,
  Layers,
  Search,
  Sliders,
  Table
} from '../../Icons';

Chart.register(...registerables);

export interface GroupTelemetryProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

// Curated high-contrast industrial telemetry color palette
const TELEMETRY_PALETTE = [
  '#00d2ff', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose/Red
  '#8b5cf6', // Violet
  '#06b6d4', // Ocean Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#eab308', // Yellow
  '#3b82f6', // Blue
  '#d946ef', // Fuchsia
  '#2dd4bf', // Mint
  '#64748b'  // Slate
];

export const GroupTelemetry: React.FC<GroupTelemetryProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
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
    measurements, 
    parameterStats, 
    categoryCounts, 
    unitMap, 
    stages 
  } = dataset;

  const subName = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;
  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';

  // Subsystem channels
  const subChannels = useMemo(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, selectedSubsystem]);

  // Channel color assignment map
  const channelColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    subChannels.forEach((ch, idx) => {
      map[ch.name] = TELEMETRY_PALETTE[idx % TELEMETRY_PALETTE.length];
    });
    return map;
  }, [subChannels]);

  // Channel visibility states
  const [visibleChannels, setVisibleChannels] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      init[ch.name] = true;
    });
    return init;
  });

  // Keep state updated if selected subsystem changes
  useEffect(() => {
    const init: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      init[ch.name] = true;
    });
    setVisibleChannels(init);
  }, [selectedSubsystem, subChannels]);

  // Optional Setpoint Overlays
  const [showFlowSp, setShowFlowSp] = useState(false);
  const [showDpSp, setShowDpSp] = useState(false);

  const toggleChannel = (name: string) => {
    setVisibleChannels(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const setAllChannels = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    subChannels.forEach(ch => {
      next[ch.name] = visible;
    });
    setVisibleChannels(next);
  };

  // Subsystem failure stats
  const subFailCount = categoryCounts[selectedSubsystem]?.fail ?? 0;
  const isSubsystemPass = subFailCount === 0;

  // Subsystem category icon
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

  // Primary engineering unit for this subsystem
  const dominantUnit = useMemo(() => {
    const units = subChannels.map(c => c.stat.unit).filter(Boolean);
    if (units.length === 0) return '';
    const counts: Record<string, number> = {};
    units.forEach(u => { counts[u] = (counts[u] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [subChannels]);

  // Render Subsystem Multi-Channel Overlay Waveform
  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = measurements.map(m => `${m['Time']}s`);
    const isDark = currentTheme === 'dark';

    const datasets: any[] = [];

    // Add active subsystem channel waveforms
    subChannels.forEach(ch => {
      if (!visibleChannels[ch.name]) return;
      const color = channelColorMap[ch.name] || '#00d2ff';
      const data = measurements.map(m => m[ch.name]);

      datasets.push({
        label: `${ch.name} (${ch.stat.unit || ''})`,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: isDark ? '#0b1120' : '#ffffff',
        pointBorderWidth: 1,
        tension: 0.15,
        yAxisID: 'y'
      });
    });

    // Optional Secondary Flow Setpoint reference overlay
    if (showFlowSp && measurements[0]?.['Secondary Flow Setpoint'] !== undefined) {
      datasets.push({
        label: `Flow SP (${flowSpUnit})`,
        data: measurements.map(m => m['Secondary Flow Setpoint']),
        borderColor: '#f59e0b',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
        backgroundColor: 'transparent',
        yAxisID: 'ySetpoint'
      });
    }

    // Optional Secondary DP Setpoint reference overlay
    if (showDpSp && measurements[0]?.['Secondary DP Setpoint'] !== undefined) {
      datasets.push({
        label: `DP SP (${dpSpUnit})`,
        data: measurements.map(m => m['Secondary DP Setpoint']),
        borderColor: '#38bdf8',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0,
        backgroundColor: 'transparent',
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
            display: false // Controlled via top chip strip
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
              text: dominantUnit ? `${subName} (${dominantUnit})` : subName,
              color: isDark ? '#94a3b8' : '#475569',
              font: { size: 10, weight: 'bold' }
            }
          },
          ...((showFlowSp || showDpSp) ? {
            ySetpoint: {
              type: 'linear' as const,
              position: 'right' as const,
              grid: { drawOnChartArea: false },
              ticks: { color: '#f59e0b', font: { size: 9 } },
              title: {
                display: true,
                text: 'Excitation Setpoint Reference',
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
    measurements, 
    subChannels, 
    visibleChannels, 
    channelColorMap, 
    showFlowSp, 
    showDpSp, 
    currentTheme, 
    stages, 
    subName, 
    dominantUnit, 
    flowSpUnit, 
    dpSpUnit
  ]);

  // Channel search in table
  const [tableSearch, setTableSearch] = useState('');

  const filteredTableChannels = useMemo(() => {
    if (!tableSearch.trim()) return subChannels;
    const q = tableSearch.toLowerCase().trim();
    return subChannels.filter(({ name, stat }) => 
      name.toLowerCase().includes(q) || 
      (stat.unit && stat.unit.toLowerCase().includes(q))
    );
  }, [subChannels, tableSearch]);

  const activeCurvesCount = Object.values(visibleChannels).filter(Boolean).length;

  return (
    <section className="cad-tab-focused-card row-telemetry-group">
      {/* 1. Header Bar: Subsystem Scope Telemetry */}
      <div className="row-header-bar">
        <div className="row-title-group">
          {onResetSubsystem && (
            <>
              <button 
                className="back-overview-btn" 
                onClick={onResetSubsystem}
                title="Return to Unit Telemetry overview"
              >
                <ArrowLeft size={13} />
                <span>Unit Telemetry</span>
              </button>
              <div className="divider-vertical"></div>
            </>
          )}

          <div className="sensor-title-box">
            <span className="category-tag-badge">
              {renderCategoryIcon(selectedSubsystem)}
              <span>{selectedSubsystem.toUpperCase()}</span>
            </span>
            <h2 className="sensor-main-title">{subName} Multi-Channel Telemetry</h2>
            <span className="unit-pill">{subChannels.length} Channels</span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Rule">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isSubsystemPass ? 'pass' : 'fail'}`}>
            {isSubsystemPass ? (
              <>
                <CheckCircle2 size={13} />
                <span>SUBSYSTEM PASS (100% in tolerance)</span>
              </>
            ) : (
              <>
                <AlertTriangle size={13} />
                <span>{subFailCount} VIOLATIONS DETECTED</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Subsystem Multi-Channel Overlay Waveform Card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              Multi-Channel Transient Overlay & Dynamic Co-Registration
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Simultaneous overlay of all {subChannels.length} channels in the {subName} subsystem across 525s cooldown test
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Active: <strong>{activeCurvesCount}</strong> of {subChannels.length}
            </span>
            <button
              onClick={() => setAllChannels(true)}
              className="cad-sheet-table-action-btn"
              title="Show all channels on chart"
            >
              Show All
            </button>
            <button
              onClick={() => setAllChannels(false)}
              className="cad-sheet-table-action-btn"
              title="Hide all channels from chart"
            >
              Hide All
            </button>
          </div>
        </div>

        {/* Setpoint Reference Overlay Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Reference Overlays:</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showFlowSp} 
              onChange={(e) => setShowFlowSp(e.target.checked)} 
              style={{ cursor: 'pointer', accentColor: '#f59e0b' }}
            />
            <span className="legend-indicator dotted-amber"></span>
            <span style={{ color: showFlowSp ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Secondary Flow SP ({flowSpUnit})
            </span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showDpSp} 
              onChange={(e) => setShowDpSp(e.target.checked)} 
              style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            <span className="legend-indicator dotted-amber" style={{ borderTopColor: '#38bdf8' }}></span>
            <span style={{ color: showDpSp ? 'var(--text-main)' : 'var(--text-muted)' }}>
              Secondary DP SP ({dpSpUnit})
            </span>
          </label>
        </div>

        {/* Channel Visibility Chips Strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', maxHeight: '90px', overflowY: 'auto' }}>
          {subChannels.map(({ name, stat }) => {
            const isVisible = !!visibleChannels[name];
            const color = channelColorMap[name] || '#00d2ff';
            const settlingStr = stat.settling !== null && stat.settling !== undefined
              ? (typeof stat.settling === 'number' ? stat.settling.toFixed(1) : stat.settling)
              : null;

            return (
              <label 
                key={`toggle-${name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '14px',
                  border: `1px solid ${isVisible ? color : 'var(--border-color)'}`,
                  background: isVisible ? `${color}15` : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  userSelect: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isVisible}
                  onChange={() => toggleChannel(name)}
                  style={{ cursor: 'pointer', accentColor: color }}
                />
                <span 
                  style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: color,
                    boxShadow: isVisible ? `0 0 5px ${color}` : 'none'
                  }} 
                />
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: isVisible ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {name}
                </span>
                {settlingStr !== null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: isVisible ? color : 'var(--text-dim)' }}>
                    ({settlingStr})
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Chart Canvas Area */}
        <div className="plot-canvas-area" style={{ height: '380px', minHeight: '340px', padding: 0 }}>
          <canvas ref={chartCanvasRef}></canvas>
        </div>
      </div>

      {/* 3. Subsystem Dwell Statistics & SPC Table */}
      <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0, fontSize: '13px' }}>
              Subsystem Channel Parametric Statistics & 3σ Tolerances
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Process mean (μ), standard deviation (σ), statistical bounds, and worst-case margin clearance for all {subName} sensors
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter channels..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{
                padding: '4px 8px 4px 26px',
                fontSize: '11px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                width: '180px'
              }}
            />
            <span style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              <Search size={12} />
            </span>
          </div>
        </div>

        {/* Dwell Statistics Table */}
        <div className="datasheet-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="datasheet-table">
            <thead>
              <tr>
                <th>Channel Tag</th>
                <th>Unit</th>
                <th>Process Mean (μ)</th>
                <th>Std Dev (σ)</th>
                <th>Lower 3σ (μ - 3σ)</th>
                <th>Upper 3σ (μ + 3σ)</th>
                <th>Peak (Max)</th>
                <th>Minimum</th>
                <th>Settling (525s)</th>
                <th>Worst Margin</th>
                <th>Verdict</th>
                <th style={{ textAlign: 'right' }}>Transient Scope</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableChannels.map(({ name, stat }) => {
                const isPass = stat.failCount === 0;
                const color = channelColorMap[name] || '#00d2ff';

                return (
                  <tr key={`stat-row-${name}`} className={!isPass ? 'row-failed' : ''}>
                    <td className="sensor-name-col">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span 
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: color 
                          }} 
                        />
                        <button
                          onClick={() => onSelectSensor(name)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          title={`Open single-channel oscilloscope for ${name}`}
                        >
                          {name}
                        </button>
                      </div>
                    </td>

                    <td className="unit-col font-mono text-dim">
                      {stat.unit || '--'}
                    </td>

                    <td className="mean-col font-mono">
                      {stat.nominalMean !== null && stat.nominalMean !== undefined
                        ? stat.nominalMean.toFixed(2)
                        : '--'}
                    </td>

                    <td className="sigma-col font-mono text-xs">
                      {stat.processSigma !== null && stat.processSigma !== undefined
                        ? stat.processSigma.toFixed(3)
                        : '--'}
                    </td>

                    <td className="limit-col font-mono">
                      {stat.low3Sigma !== null && stat.low3Sigma !== undefined
                        ? stat.low3Sigma.toFixed(2)
                        : '--'}
                    </td>

                    <td className="limit-col font-mono">
                      {stat.high3Sigma !== null && stat.high3Sigma !== undefined
                        ? stat.high3Sigma.toFixed(2)
                        : '--'}
                    </td>

                    <td className="val-col font-mono">
                      {stat.peak !== null && stat.peak !== undefined
                        ? (typeof stat.peak === 'number' ? stat.peak.toFixed(2) : stat.peak)
                        : '--'}
                    </td>

                    <td className="val-col font-mono">
                      {stat.min !== null && stat.min !== undefined
                        ? (typeof stat.min === 'number' ? stat.min.toFixed(2) : stat.min)
                        : '--'}
                    </td>

                    <td className="val-col font-mono font-bold text-cyan">
                      {stat.settling !== null && stat.settling !== undefined
                        ? (typeof stat.settling === 'number' ? stat.settling.toFixed(2) : stat.settling)
                        : '--'}
                    </td>

                    <td className="margin-col font-mono">
                      {stat.worstMargin !== null && stat.worstMargin !== undefined ? (
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: stat.worstMargin < 0 ? 'var(--danger)' : 'var(--success)' 
                        }}>
                          {stat.worstMargin >= 0 ? '+' : ''}{stat.worstMargin.toFixed(2)}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>

                    <td className="status-col">
                      <span className={`status-pill-small ${isPass ? 'pass' : 'fail'}`}>
                        {isPass ? 'PASS' : `FAIL (${stat.failCount})`}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectSensor(name)}
                        className="cad-sheet-table-action-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10.5px' }}
                        title={`Open single-test oscilloscope for ${name}`}
                      >
                        <span>Scope</span>
                        <ChevronRight size={11} />
                      </button>
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

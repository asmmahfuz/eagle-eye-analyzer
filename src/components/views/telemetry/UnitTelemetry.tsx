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
  Search, 
  ChevronRight,
  Layers,
  Sliders
} from '../../Icons';
import { TransientSummaryCard } from './TransientSummaryCard';

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

export const UnitTelemetry: React.FC<UnitTelemetryProps> = ({
  dataset,
  onSelectSensor,
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

  // Identify available key excitation & feedback channels in this workbook
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

  // Ensure newly discovered curves get default visibility
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
            display: false // Controlled via top custom toolbar chips
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
  }, [measurements, availablePrimaryCurves, visibleCurves, currentTheme, stages, flowSpUnit, dpSpUnit, tempSpUnit]);

  // Channel search and status filters for thumbnails
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fail' | 'pass'>('all');

  // Subsystem list definition
  const subsystems = useMemo(() => {
    const list: {
      id: SubsystemCategory;
      name: string;
      icon: React.ReactNode;
      color: string;
      channels: { name: string; stat: ParameterSummary }[];
    }[] = [
      {
        id: 'hydraulic',
        name: 'Hydraulic & DP',
        icon: <Droplets size={14} className="text-cyan-400" />,
        color: '#0284c7',
        channels: []
      },
      {
        id: 'pump',
        name: 'Pumps & VFD Drives',
        icon: <Activity size={14} className="text-blue-400" />,
        color: '#2563eb',
        channels: []
      },
      {
        id: 'temperature',
        name: 'Temperature Transmitters',
        icon: <Thermometer size={14} className="text-amber-400" />,
        color: '#f59e0b',
        channels: []
      },
      {
        id: 'pressure',
        name: 'Pressure Transmitters',
        icon: <Gauge size={14} className="text-sky-400" />,
        color: '#0ea5e9',
        channels: []
      },
      {
        id: 'environmental',
        name: 'Environmental & Ambient',
        icon: <Wind size={14} className="text-indigo-400" />,
        color: '#6366f1',
        channels: []
      },
      {
        id: 'system',
        name: 'System & Configuration',
        icon: <Cpu size={14} className="text-purple-400" />,
        color: '#a855f7',
        channels: []
      }
    ];

    Object.entries(parameterStats).forEach(([name, stat]) => {
      const sub = list.find(s => s.id === stat.category);
      if (sub) {
        sub.channels.push({ name, stat });
      }
    });

    return list;
  }, [parameterStats]);

  // Filter channels according to search and status filter
  const filteredSubsystems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return subsystems.map(sub => {
      const filteredChannels = sub.channels.filter(({ name, stat }) => {
        // Status filter
        if (statusFilter === 'fail' && stat.failCount === 0) return false;
        if (statusFilter === 'pass' && stat.failCount > 0) return false;

        // Search query
        if (!q) return true;
        return (
          name.toLowerCase().includes(q) ||
          (stat.unit && stat.unit.toLowerCase().includes(q)) ||
          sub.name.toLowerCase().includes(q)
        );
      });

      return {
        ...sub,
        channels: filteredChannels
      };
    }).filter(sub => sub.channels.length > 0);
  }, [subsystems, searchQuery, statusFilter]);

  const totalChannelsCount = Object.keys(parameterStats).length;
  const failingChannelsCount = Object.values(parameterStats).filter(s => s.failCount > 0).length;
  const passingChannelsCount = totalChannelsCount - failingChannelsCount;

  return (
    <section className="cad-tab-focused-card row-telemetry-unit">
      {/* 1. Header Bar: Whole Unit Telemetry Identity */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            <Activity size={16} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="sensor-main-title">
              Whole-Unit Operational Telemetry & System Excitation Overview
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

      {/* Dynamic Transient Analytics Summary Card */}
      <TransientSummaryCard dataset={dataset} />

      {/* 2. Whole-Unit Operational Overview Chart Card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              System-Wide Excitation & Primary Feedback Overlay (0s – 525s)
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Primary hydraulic excitation setpoints plotted alongside real-time unit flow, differential pressure, pump speed, and thermal feedbacks
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

        {/* Curve Toggle Chips Strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
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
                  padding: '4px 9px',
                  borderRadius: '16px',
                  border: `1px solid ${isVisible ? c.color : 'var(--border-color)'}`,
                  background: isVisible ? `${c.color}18` : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  fontSize: '11px',
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
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: c.color,
                    boxShadow: isVisible ? `0 0 6px ${c.color}` : 'none'
                  }} 
                />
                <span style={{ fontWeight: 600, color: isVisible ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {c.name}
                </span>
                {settlingVal !== null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: c.color, fontWeight: 'bold' }}>
                    {settlingVal} {c.unit}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Chart Canvas Area */}
        <div className="plot-canvas-area" style={{ height: '360px', minHeight: '320px', padding: 0 }}>
          <canvas ref={chartCanvasRef}></canvas>
        </div>
      </div>

      {/* 3. 10-Stage Operating Summary Ribbon */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
            10 Operating Stages Progression (Excitation & Step Dwells)
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            15s – 525s Cooldown Sequence
          </span>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', 
          gap: '6px' 
        }}>
          {stages.map((stg) => {
            const isStagePass = stg.isPass;
            return (
              <div 
                key={`stage-ribbon-${stg.stageNum}`}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${isStagePass ? 'var(--border-color)' : 'var(--danger-border)'}`,
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  fontSize: '10.5px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>S{stg.stageNum} ({stg.timeSec}s)</span>
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

      {/* 4. Subsystem Channel Thumbnail Cards Section */}
      <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0, fontSize: '13px' }}>
              Subsystem Telemetry Directory & Channel Status Thumbnails
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Click any channel card to open its dedicated transient laboratory oscilloscope waveform
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === 'all' ? 'var(--accent-cyan)' : 'var(--bg-card)',
                  color: statusFilter === 'all' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: statusFilter === 'all' ? 700 : 500
                }}
              >
                All ({totalChannelsCount})
              </button>
              <button
                onClick={() => setStatusFilter('fail')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: statusFilter === 'fail' ? 'var(--danger)' : 'var(--bg-card)',
                  color: statusFilter === 'fail' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: statusFilter === 'fail' ? 700 : 500
                }}
              >
                Failing ({failingChannelsCount})
              </button>
              <button
                onClick={() => setStatusFilter('pass')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === 'pass' ? 'var(--success)' : 'var(--bg-card)',
                  color: statusFilter === 'pass' ? '#ffffff' : 'var(--text-main)',
                  fontWeight: statusFilter === 'pass' ? 700 : 500
                }}
              >
                Passing ({passingChannelsCount})
              </button>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>

        {/* Subsystem Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredSubsystems.map(sub => {
            const subFailCount = categoryCounts[sub.id]?.fail ?? 0;
            const isSubPass = subFailCount === 0;

            return (
              <div 
                key={`sub-group-${sub.id}`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Subsystem Header Strip */}
                <div 
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-panel)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: 'rgba(0, 210, 255, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {sub.icon}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>
                      {sub.name}
                    </span>
                    <span className={`status-pill-small ${isSubPass ? 'pass' : 'fail'}`} style={{ fontSize: '10px' }}>
                      {isSubPass ? '100% In Tolerance' : `${subFailCount} Violations`}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                      ({sub.channels.length} channels)
                    </span>
                  </div>

                  {onSelectSubsystem && (
                    <button
                      onClick={() => onSelectSubsystem(sub.id)}
                      className="cad-sheet-table-action-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}
                      title={`Isolate ${sub.name} subsystem`}
                    >
                      <Layers size={11} />
                      <span>Focus Subsystem</span>
                      <ChevronRight size={11} />
                    </button>
                  )}
                </div>

                {/* Grid of Channel Thumbnails */}
                <div 
                  style={{
                    padding: '10px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '8px'
                  }}
                >
                  {sub.channels.map(({ name, stat }) => {
                    const isChannelPass = stat.failCount === 0;
                    const settlingStr = stat.settling !== null && stat.settling !== undefined
                      ? `${typeof stat.settling === 'number' ? stat.settling.toFixed(2) : stat.settling} ${stat.unit || ''}`
                      : '--';

                    return (
                      <div
                        key={`ch-thumb-${name}`}
                        onClick={() => onSelectSensor(name)}
                        style={{
                          background: 'var(--bg-panel)',
                          border: `1px solid ${isChannelPass ? 'var(--border-subtle)' : 'var(--danger-border)'}`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isChannelPass ? 'var(--border-subtle)' : 'var(--danger-border)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title={`Click to view transient oscilloscope for ${name}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                            {name}
                          </span>
                          <span className={`status-pill-small ${isChannelPass ? 'pass' : 'fail'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {isChannelPass ? 'PASS' : `FAIL (${stat.failCount})`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Settled at 525s:</span>
                          <strong style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: isChannelPass ? 'var(--success)' : 'var(--danger)' }}>
                            {settlingStr}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'var(--text-dim)', paddingTop: '2px', borderTop: '1px solid var(--border-subtle)' }}>
                          <span>Margin Buffer:</span>
                          {stat.worstMargin !== null && stat.worstMargin !== undefined ? (
                            <span style={{ 
                              fontFamily: 'var(--font-mono)', 
                              fontWeight: 'bold', 
                              color: stat.worstMargin < 0 ? 'var(--danger)' : 'var(--success)' 
                            }}>
                              {stat.worstMargin >= 0 ? '+' : ''}{stat.worstMargin.toFixed(2)} {stat.unit || ''}
                            </span>
                          ) : (
                            <span>--</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

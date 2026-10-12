import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { EagleEyeDataset } from '../../../types';
import { createStageDwellPlugin } from './stageDwellPlugin';
import { PrimaryCurveDef, TimebasePreset } from './UnitTelemetryToolbar';

Chart.register(...registerables);

export interface UnitTelemetryChartProps {
  dataset: EagleEyeDataset;
  availablePrimaryCurves: PrimaryCurveDef[];
  visibleCurves: Record<string, boolean>;
  timebase: TimebasePreset;
  showStageDwells: boolean;
  currentTheme: string;
  flowSpUnit: string;
  dpSpUnit: string;
}

export const UnitTelemetryChart: React.FC<UnitTelemetryChartProps> = ({
  dataset,
  availablePrimaryCurves,
  visibleCurves,
  timebase,
  showStageDwells,
  currentTheme,
  flowSpUnit,
  dpSpUnit
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const { measurements, stages } = dataset;

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
            titleColor: '#00d2ff',
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
                return `Time: ${m['Time']}s ${stage ? `(Stage ${stage.stageNum})` : ''}`;
              },
              label: function(context) {
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
            min: 0,
            max: 650,
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: isDark ? '#94a3b8' : '#334155', font: { size: 9.5 } },
            title: {
              display: true,
              text: `Flow Rate (${flowSpUnit})`,
              color: '#f59e0b',
              font: { size: 10, weight: 'bold' }
            }
          },
          yPressure: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 45,
            grid: { drawOnChartArea: false },
            ticks: { color: '#8b5cf6', font: { size: 9.5 } },
            title: {
              display: true,
              text: `Differential Pressure (${dpSpUnit})`,
              color: '#8b5cf6',
              font: { size: 10, weight: 'bold' }
            }
          },
          yPercent: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 110,
            grid: { drawOnChartArea: false },
            ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 9 } },
            title: {
              display: true,
              text: 'Speed (%) / Temp (°C)',
              color: isDark ? '#64748b' : '#94a3b8',
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
    timebase,
    showStageDwells,
    currentTheme,
    flowSpUnit,
    dpSpUnit,
    stages
  ]);

  return (
    <div className="plot-canvas-area" style={{ flex: 1, minHeight: '480px', height: '100%', padding: '4px 0' }}>
      <canvas ref={chartCanvasRef}></canvas>
    </div>
  );
};

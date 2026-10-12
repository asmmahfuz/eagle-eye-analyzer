import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { EagleEyeDataset } from '../../../types';
import { createStageDwellPlugin } from './stageDwellPlugin';
import { TimebasePreset } from './UnitTelemetryToolbar';
import { GroupChannelItem } from './GroupTelemetryToolbar';

Chart.register(...registerables);

export interface GroupTelemetryChartProps {
  dataset: EagleEyeDataset;
  subChannels: GroupChannelItem[];
  visibleChannels: Record<string, boolean>;
  channelColorMap: Record<string, string>;
  showFlowSp: boolean;
  showDpSp: boolean;
  showStageDwells: boolean;
  timebase: TimebasePreset;
  currentTheme: string;
  flowSpUnit: string;
  dpSpUnit: string;
  dominantUnit: string;
  subName: string;
}

export const GroupTelemetryChart: React.FC<GroupTelemetryChartProps> = ({
  dataset,
  subChannels,
  visibleChannels,
  channelColorMap,
  showFlowSp,
  showDpSp,
  showStageDwells,
  timebase,
  currentTheme,
  flowSpUnit,
  dpSpUnit,
  dominantUnit,
  subName
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

    const hasSetpointOverlay = (showFlowSp && measurements[0]?.['Secondary Flow Setpoint'] !== undefined) ||
                               (showDpSp && measurements[0]?.['Secondary DP Setpoint'] !== undefined);

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
                return `Time: ${m['Time']}s ${stage ? `(Stage ${stage.stageNum})` : ''} | Flow SP: ${m['Secondary Flow Setpoint'] ?? '-'} ${flowSpUnit} | DP SP: ${m['Secondary DP Setpoint'] ?? '-'} ${dpSpUnit}`;
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
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
            ticks: { color: isDark ? '#94a3b8' : '#334155', font: { size: 9.5 } },
            title: {
              display: true,
              text: dominantUnit ? `${subName} Telemetry (${dominantUnit})` : `${subName} Telemetry`,
              color: isDark ? '#94a3b8' : '#475569',
              font: { size: 10, weight: 'bold' }
            }
          },
          ...(hasSetpointOverlay ? {
            ySetpoint: {
              type: 'linear' as const,
              position: 'right' as const,
              grid: { drawOnChartArea: false },
              ticks: { color: '#f59e0b', font: { size: 9 } },
              title: {
                display: true,
                text: 'Setpoint Reference',
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
    showStageDwells,
    timebase,
    currentTheme,
    flowSpUnit,
    dpSpUnit,
    dominantUnit,
    subName,
    stages
  ]);

  return (
    <div className="plot-canvas-area" style={{ flex: 1, minHeight: '520px', height: '100%', padding: '4px 0' }}>
      <canvas ref={chartCanvasRef}></canvas>
    </div>
  );
};

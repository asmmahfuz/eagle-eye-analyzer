import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { 
  EagleEyeDataset, 
  SubsystemCategory, 
  ParameterSummary, 
  EvaluatedPoint 
} from '../../../types';
import { TrackedQuantity } from '../../../engine/excitation';
import { createStageDwellPlugin } from './stageDwellPlugin';
import { TimebasePreset } from './UnitTelemetryToolbar';
import { buildTestTelemetryDatasets } from './testTelemetryDatasets';
import { createTelemetryTooltipConfig } from './testTelemetryTooltipConfig';

Chart.register(...registerables);

export interface TestTelemetryChartProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  show3Sigma: boolean;
  showAbsLimits: boolean;
  showSetpointOverlay: boolean;
  highlightExtremes: boolean;
  showStageDwells: boolean;
  timebase: TimebasePreset;
  currentTheme: string;
  unit: string;
  category: SubsystemCategory;
  flowSpUnit: string;
  dpSpUnit: string;
  trackedQty: TrackedQuantity;
  stats: ParameterSummary | undefined;
  sensorEvaluations: EvaluatedPoint[];
  hasFail: boolean;
}

export const TestTelemetryChart: React.FC<TestTelemetryChartProps> = ({
  dataset,
  selectedSensor,
  show3Sigma,
  showAbsLimits,
  showSetpointOverlay,
  highlightExtremes,
  showStageDwells,
  timebase,
  currentTheme,
  unit,
  category,
  flowSpUnit,
  dpSpUnit,
  trackedQty,
  stats,
  sensorEvaluations,
  hasFail
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const { measurements, limits, stages } = dataset;

  useEffect(() => {
    if (!chartCanvasRef.current) return;
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = measurements.map(m => `${m['Time']}s`);
    const isDark = currentTheme === 'dark';
    const activeCyan = isDark ? '#00d2ff' : '#0284c7';

    const { datasets, isDp } = buildTestTelemetryDatasets({
      measurements,
      limits,
      selectedSensor,
      unit,
      category,
      isDark,
      hasFail,
      sensorEvaluations,
      stats,
      highlightExtremes,
      show3Sigma,
      showAbsLimits,
      showSetpointOverlay,
      trackedQty,
      flowSpUnit,
      dpSpUnit
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

    const tooltipConfig = createTelemetryTooltipConfig({
      measurements,
      stages,
      sensorEvaluations,
      activeCyan,
      isDark,
      flowSpUnit,
      dpSpUnit
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
          tooltip: tooltipConfig
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
    trackedQty,
    category
  ]);

  return (
    <div className="plot-canvas-area" style={{ flex: 1, minHeight: '520px', height: '100%', padding: '8px 0' }}>
      <canvas ref={chartCanvasRef}></canvas>
    </div>
  );
};

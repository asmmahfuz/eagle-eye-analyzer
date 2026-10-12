import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, registerables, ChartOptions, Plugin } from 'chart.js';
import { EagleEyeDataset } from '../../../types';
import { createStageDwellPlugin } from '../telemetry/stageDwellPlugin';
import { normalizeAnalogValue, getMetric } from './dynamicsTypes';
import { Sliders, Activity } from '../../Icons';

Chart.register(...registerables);

export interface StimulusResponseChartProps {
  dataset: EagleEyeDataset;
  activeStageIdx: number;
  onSelectStage?: (idx: number) => void;
}

interface CurveVisibility {
  dpSp: boolean;
  pumpSpeed: boolean;
  flow: boolean;
  discharge: boolean;
  suction: boolean;
  temp: boolean;
}

export const StimulusResponseChart: React.FC<StimulusResponseChartProps> = ({
  dataset,
  activeStageIdx,
  onSelectStage
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const [currentTheme, setCurrentTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  const [visibility, setVisibility] = useState<CurveVisibility>({
    dpSp: true,
    pumpSpeed: true,
    flow: true,
    discharge: true,
    suction: true,
    temp: true
  });

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

  const isDark = currentTheme === 'dark';
  const { measurements, stages } = dataset;

  const currentStage = stages[activeStageIdx] || stages[0];

  // 15 psi cavitation threshold line plugin
  const cavitationLinePlugin: Plugin<'line'> = useMemo(() => ({
    id: 'cavitationThresholdLine',
    afterDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.yPressure) return;
      const yVal = scales.yPressure.getPixelForValue(15.0);
      if (yVal < chartArea.top || yVal > chartArea.bottom) return;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = isDark ? 'rgba(239, 68, 68, 0.85)' : 'rgba(220, 38, 38, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(chartArea.left, yVal);
      ctx.lineTo(chartArea.right, yVal);
      ctx.stroke();

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#f87171' : '#dc2626';
      ctx.textAlign = 'right';
      ctx.fillText('15.0 psi Cavitation Guard', chartArea.right - 8, yVal - 4);
      ctx.restore();
    }
  }), [isDark]);

  useEffect(() => {
    if (!chartCanvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const labels = measurements.map((m, idx) =>
      m['Time'] !== undefined ? `${m['Time']}s` : `#${idx + 1}`
    );

    const dpSpData = measurements.map(m => getMetric(m, 'Secondary DP Setpoint'));
    const pumpData = measurements.map(m => {
      const p31 = normalizeAnalogValue(getMetric(m, 'P31 Speed %', 'P31_Speed', 'P31'));
      const p41 = normalizeAnalogValue(getMetric(m, 'P41 Speed %', 'P41_Speed', 'P41'));
      return (p31 + p41) / (p31 > 0 && p41 > 0 ? 2 : 1);
    });
    const flowData = measurements.map(m => getMetric(m, 'FT01', 'FT_01', 'Secondary Flow'));
    const dischargeData = measurements.map(m => getMetric(m, 'PT32', 'PT42', 'PT31', 'PT41'));
    const suctionData = measurements.map(m => getMetric(m, 'PT21', 'PT_21'));
    const tempData = measurements.map(m => getMetric(m, 'TT31', 'TT41', 'TT45'));

    // Dynamic Pressure Scale Headroom calculation (avoids clipping PT32 discharge pressure)
    const allPressureValues = [
      ...dpSpData,
      ...dischargeData,
      ...suctionData
    ].filter((v): v is number => typeof v === 'number' && !isNaN(v));

    const maxPressure = allPressureValues.length > 0 ? Math.max(...allPressureValues) : 60;
    // Generous 18% headroom rounded up to next 5 psi (minimum 75 psi) ensures the discharge curve
    // and stage dwell badges (S1..S10) have ample breathing room and are never clipped at the top
    const pressureCeiling = Math.max(75, Math.ceil((maxPressure * 1.18) / 5) * 5);

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const stagePlugin = createStageDwellPlugin({
      stages,
      measurements,
      isDark,
      enabled: true
    });

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '1. DP Target SP (Stimulus)',
            data: dpSpData,
            borderColor: isDark ? '#a78bfa' : '#7c3aed',
            backgroundColor: 'transparent',
            stepped: 'before',
            borderWidth: 2.2,
            pointRadius: 0,
            yAxisID: 'yPressure',
            hidden: !visibility.dpSp
          },
          {
            label: '2. Pump Motor Speed % (Control Effort)',
            data: pumpData,
            borderColor: isDark ? '#38bdf8' : '#0284c7',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            yAxisID: 'ySpeed',
            hidden: !visibility.pumpSpeed
          },
          {
            label: '3. Secondary Flow FT01 (Hydraulic Response)',
            data: flowData,
            borderColor: isDark ? '#34d399' : '#059669',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            yAxisID: 'yFlow',
            hidden: !visibility.flow
          },
          {
            label: '4. Discharge PT32 (Head Buildup)',
            data: dischargeData,
            borderColor: isDark ? '#fb923c' : '#ea580c',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointRadius: 2,
            yAxisID: 'yPressure',
            hidden: !visibility.discharge
          },
          {
            label: '5. Suction PT21 (Inverted Drawdown)',
            data: suctionData,
            borderColor: isDark ? '#22d3ee' : '#0891b2',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            yAxisID: 'yPressure',
            hidden: !visibility.suction
          },
          {
            label: '6. Secondary Temp TT31 (Thermal Dissipation)',
            data: tempData,
            borderColor: isDark ? '#f43f5e' : '#e11d48',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointRadius: 2,
            yAxisID: 'yTemp',
            hidden: !visibility.temp
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: 'index', intersect: false },
        layout: {
          padding: {
            top: 24,
            bottom: 6,
            left: 4,
            right: 8
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
            borderWidth: 1,
            padding: 10,
            bodyFont: { family: 'JetBrains Mono', size: 11 }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }
          },
          yPressure: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Pressure (psi)', color: textColor, font: { size: 11, weight: 'bold' } },
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } },
            min: 0,
            max: pressureCeiling
          },
          ySpeed: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Pump Speed (%)', color: '#0284c7', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#0284c7', font: { family: 'JetBrains Mono', size: 9.5 } },
            min: 0,
            max: 105
          },
          yFlow: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Flow (LPM)', color: '#059669', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#059669', font: { family: 'JetBrains Mono', size: 9.5 } }
          },
          yTemp: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Temp (°C)', color: '#e11d48', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#e11d48', font: { family: 'JetBrains Mono', size: 9.5 } }
          }
        }
      },
      plugins: [stagePlugin, cavitationLinePlugin]
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [measurements, stages, isDark, visibility, cavitationLinePlugin]);

  const toggleCurve = (key: keyof CurveVisibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="cad-dynamics-card cad-stimulus-card">
      <div className="cad-dynamics-card-header">
        <div className="card-title-group">
          <Activity size={14} className="text-cyan" />
          <h4 className="font-bold">Closed-Loop Stimulus vs. Response Dynamics Scope</h4>
          <span className="card-sub font-mono">Multi-Axis Transient Tracking (0–525s)</span>
        </div>
        <div className="cad-chart-stage-pill font-mono">
          Active: Stage {currentStage?.stageNum ?? 1} ({currentStage?.timeSec}s)
        </div>
      </div>

      {/* Interactive Trace Filter Chips */}
      <div className="cad-dynamics-trace-toggles">
        <button
          type="button"
          className={`trace-pill ${visibility.dpSp ? 'active purple' : ''}`}
          onClick={() => toggleCurve('dpSp')}
        >
          <span className="trace-color purple"></span>
          <span>1. DP Target SP (Stimulus)</span>
        </button>
        <button
          type="button"
          className={`trace-pill ${visibility.pumpSpeed ? 'active blue' : ''}`}
          onClick={() => toggleCurve('pumpSpeed')}
        >
          <span className="trace-color blue"></span>
          <span>2. Motors P31/P41 (Effort)</span>
        </button>
        <button
          type="button"
          className={`trace-pill ${visibility.flow ? 'active green' : ''}`}
          onClick={() => toggleCurve('flow')}
        >
          <span className="trace-color green"></span>
          <span>3. Flow FT01 (Delivery)</span>
        </button>
        <button
          type="button"
          className={`trace-pill ${visibility.discharge ? 'active orange' : ''}`}
          onClick={() => toggleCurve('discharge')}
        >
          <span className="trace-color orange"></span>
          <span>4. Discharge PT32 (Head)</span>
        </button>
        <button
          type="button"
          className={`trace-pill ${visibility.suction ? 'active cyan' : ''}`}
          onClick={() => toggleCurve('suction')}
        >
          <span className="trace-color cyan"></span>
          <span>5. Suction PT21 (Drawdown)</span>
        </button>
        <button
          type="button"
          className={`trace-pill ${visibility.temp ? 'active rose' : ''}`}
          onClick={() => toggleCurve('temp')}
        >
          <span className="trace-color rose"></span>
          <span>6. Temp TT31 (Dissipation)</span>
        </button>
      </div>

      {/* Chart Canvas Area */}
      <div className="cad-dynamics-chart-viewport" style={{ height: '420px', position: 'relative' }}>
        <canvas ref={chartCanvasRef} />
      </div>
    </div>
  );
};

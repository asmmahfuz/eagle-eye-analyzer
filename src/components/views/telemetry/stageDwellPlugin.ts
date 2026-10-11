import { Plugin } from 'chart.js';
import { OperatingStage } from '../../../types';

export interface StageDwellPluginOptions {
  stages: OperatingStage[];
  measurements: Record<string, any>[];
  isDark: boolean;
  enabled: boolean;
}

/**
 * Custom Chart.js inline plugin to draw stage dwell vertical boundary lines
 * and stage identification badges (S1..S10) across laboratory oscilloscope waveforms.
 */
export function createStageDwellPlugin(options: StageDwellPluginOptions): Plugin<'line'> {
  return {
    id: 'stageDwellLines',
    afterDraw: (chart) => {
      if (!options.enabled || !options.stages || options.stages.length === 0) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.x) return;
      const { top, bottom, left, right } = chartArea;

      ctx.save();
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      options.stages.forEach((stage) => {
        const mIdx = options.measurements.findIndex(m => m['Time'] === stage.timeSec);
        if (mIdx === -1) return;

        const xPos = scales.x.getPixelForValue(mIdx);
        if (xPos < left - 2 || xPos > right + 2) return;

        // 1. Draw vertical dashed stage boundary line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = options.isDark ? 'rgba(148, 163, 184, 0.32)' : 'rgba(100, 116, 139, 0.36)';
        ctx.lineWidth = 1;
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();

        // 2. Draw stage tag badge at top
        const tagText = `S${stage.stageNum}`;
        const pillWidth = 26;
        const pillHeight = 15;
        const pillX = xPos - pillWidth / 2;
        const pillY = top + 5;

        ctx.setLineDash([]);
        ctx.fillStyle = options.isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(248, 250, 252, 0.95)';
        ctx.strokeStyle = stage.isPass === false
          ? (options.isDark ? 'rgba(239, 68, 68, 0.8)' : 'rgba(220, 38, 38, 0.8)')
          : (options.isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(2, 132, 199, 0.6)');
        ctx.lineWidth = 1;

        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 3);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(pillX, pillY, pillWidth, pillHeight);
          ctx.strokeRect(pillX, pillY, pillWidth, pillHeight);
        }

        ctx.fillStyle = stage.isPass === false
          ? (options.isDark ? '#f87171' : '#dc2626')
          : (options.isDark ? '#e2e8f0' : '#1e293b');
        ctx.fillText(tagText, xPos, pillY + pillHeight / 2 + 0.5);
      });

      ctx.restore();
    }
  };
}

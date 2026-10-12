import { EvaluatedPoint, OperatingStage } from '../../../types';

export interface TelemetryTooltipConfigParams {
  measurements: Record<string, any>[];
  stages: OperatingStage[];
  sensorEvaluations: EvaluatedPoint[];
  activeCyan: string;
  isDark: boolean;
  flowSpUnit: string;
  dpSpUnit: string;
}

export function createTelemetryTooltipConfig({
  measurements,
  stages,
  sensorEvaluations,
  activeCyan,
  isDark,
  flowSpUnit,
  dpSpUnit
}: TelemetryTooltipConfigParams) {
  return {
    backgroundColor: isDark ? 'rgba(11, 17, 32, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    titleColor: activeCyan,
    bodyColor: isDark ? '#f8fafc' : '#0f172a',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(203, 213, 225, 0.9)',
    borderWidth: 1,
    padding: 8,
    titleFont: { size: 11, weight: 'bold' as const },
    bodyFont: { size: 10 },
    callbacks: {
      title: function(tooltipItems: any[]) {
        const idx = tooltipItems[0].dataIndex;
        const m = measurements[idx];
        const stage = stages.find(s => s.timeSec === m['Time']);
        return `Time: ${m['Time']}s ${stage ? `(Stage ${stage.stageNum})` : ''} | Flow SP: ${m['Secondary Flow Setpoint'] ?? '-'} ${flowSpUnit} | DP SP: ${m['Secondary DP Setpoint'] ?? '-'} ${dpSpUnit}`;
      },
      label: function(context: any) {
        const val = context.parsed.y;
        return `${context.dataset.label}: ${val !== null && val !== undefined ? Number(val).toFixed(2) : 'N/A'}`;
      },
      afterBody: function(tooltipItems: any[]) {
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
  };
}

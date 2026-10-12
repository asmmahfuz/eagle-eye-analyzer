import { 
  SubsystemCategory, 
  ParameterSummary, 
  EvaluatedPoint 
} from '../../../types';
import { generateProgrammedTimeline, TrackedQuantity } from '../../../engine/excitation';

export interface BuildTestDatasetsParams {
  measurements: Record<string, any>[];
  limits: {
    'min': Record<string, number | null>[];
    'max': Record<string, number | null>[];
    'mean-3Sigma': Record<string, number | null>[];
    'mean+3Sigma': Record<string, number | null>[];
  };
  selectedSensor: string;
  unit: string;
  category: SubsystemCategory;
  isDark: boolean;
  hasFail: boolean;
  sensorEvaluations: EvaluatedPoint[];
  stats: ParameterSummary | undefined;
  highlightExtremes: boolean;
  show3Sigma: boolean;
  showAbsLimits: boolean;
  showSetpointOverlay: boolean;
  trackedQty: TrackedQuantity;
  flowSpUnit: string;
  dpSpUnit: string;
}

export function buildTestTelemetryDatasets({
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
}: BuildTestDatasetsParams) {
  const measuredData = measurements.map(m => m[selectedSensor]);
  const low3Sigma: (number | null)[] = [];
  const high3Sigma: (number | null)[] = [];
  const absMinLine: (number | null)[] = [];
  const absMaxLine: (number | null)[] = [];

  const isDp = selectedSensor.toLowerCase().includes('dp') || (unit.toLowerCase() === 'psi' && category === 'hydraulic');

  for (let mIdx = 0; mIdx < measurements.length; mIdx++) {
    const limitIdx = mIdx >= 2 ? Math.min(limits['mean-3Sigma'].length - 1, mIdx - 2) : 0;
    let low = limits['mean-3Sigma']?.[limitIdx]?.[selectedSensor] ?? null;
    let high = limits['mean+3Sigma']?.[limitIdx]?.[selectedSensor] ?? null;
    let absMin = limits['min']?.[limitIdx]?.[selectedSensor] ?? null;
    let absMax = limits['max']?.[limitIdx]?.[selectedSensor] ?? null;

    if (isDp) {
      if (low !== null) {
        low = low < 0 || Math.abs(low) > 200 ? 0 : Math.max(0, low);
      }
      if (high !== null && (high > 200 || high < 0)) {
        high = 50;
      }
      if (absMin !== null) {
        absMin = absMin < 0 || Math.abs(absMin) > 200 ? 0 : Math.max(0, absMin);
      }
      if (absMax !== null && (absMax > 200 || absMax === 6553.5)) {
        absMax = high !== null ? Math.min(50, high) : 50;
      }
    }

    low3Sigma.push(low);
    high3Sigma.push(high);
    absMinLine.push(absMin);
    absMaxLine.push(absMax);
  }

  const activeCyan = isDark ? '#00d2ff' : '#0284c7';
  const isPassingTest = !hasFail;
  const curveBorderColor = isPassingTest ? (isDark ? '#10b981' : '#059669') : activeCyan;
  const curveBgColor = isPassingTest 
    ? 'rgba(16, 185, 129, 0.08)' 
    : (isDark ? 'rgba(0, 210, 255, 0.08)' : 'rgba(2, 132, 199, 0.08)');

  const pointBgColors = measurements.map((_, idx) => {
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
    const sharesPrimaryAxis = trackedQty !== 'none';
    const targetQuantity: TrackedQuantity = trackedQty !== 'none' ? trackedQty : 'flow';
    const steppedData = generateProgrammedTimeline(targetQuantity, measurements.map(m => m['Time']));

    const spLabel = targetQuantity === 'flow'
      ? `Programmed Flow SP (Stepped: 160–560 ${flowSpUnit})`
      : targetQuantity === 'dp'
      ? `Programmed DP SP (Stepped: 5–33 ${dpSpUnit})`
      : targetQuantity === 'temp'
      ? 'Programmed Temp SP (Stepped: 21–27°C)'
      : targetQuantity === 'pump'
      ? 'Nominal Pump SP (Stepped: 56–99%)'
      : `Programmed Flow SP (${flowSpUnit})`;

    const spColor = targetQuantity === 'flow' ? '#f59e0b'
      : targetQuantity === 'dp' ? '#10b981'
      : targetQuantity === 'temp' ? '#fb923c'
      : '#8b5cf6';

    datasets.push({
      label: spLabel,
      data: steppedData,
      borderColor: spColor,
      borderWidth: 1.8,
      borderDash: [5, 3],
      stepped: 'before' as const,
      pointRadius: 0,
      fill: false,
      yAxisID: sharesPrimaryAxis ? 'y' : 'ySetpoint'
    });
  }

  return { datasets, isDp };
}

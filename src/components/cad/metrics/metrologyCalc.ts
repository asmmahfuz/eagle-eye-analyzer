import { EvaluatedPoint, OperatingStage, ParameterSummary, TestMetadata } from '../../../types';
import { getProgrammedStage, calculateStageTransientMetrics } from '../../../engine/excitation';
import { MetrologyStageRow } from './advancedMetricsTypes';

export function buildMetrologyStageRows(
  stages: OperatingStage[],
  measurements: Record<string, any>[],
  sensorEvaluations: EvaluatedPoint[],
  activeSensor: string,
  unit: string,
  low3Sigma: number | null | undefined,
  nominalMean: number | null | undefined,
  high3Sigma: number | null | undefined,
  processSigma: number | null | undefined
): MetrologyStageRow[] {
  return stages.map((stg) => {
    const mRow = measurements.find((m) => m['Time'] === stg.timeSec);
    const measuredVal = mRow ? mRow[activeSensor] : null;
    const pt = sensorEvaluations.find((e) => e.timeSec === stg.timeSec);
    const isFailed = stg.failedSensors.includes(activeSensor) || (pt ? pt.status === 'fail' : false);
    const progStage = getProgrammedStage(stg.stageNum);
    const transientMetrics =
      progStage && typeof measuredVal === 'number'
        ? calculateStageTransientMetrics(activeSensor, progStage, measuredVal, unit)
        : null;

    const stageLow = pt?.lowLimit ?? low3Sigma;
    const stageHigh = pt?.highLimit ?? high3Sigma;
    const stageMean = pt?.nominalMean ?? nominalMean;
    const stageSigma = pt?.processSigma ?? processSigma;

    let zScore: number | null = null;
    if (
      typeof measuredVal === 'number' &&
      typeof stageMean === 'number' &&
      typeof stageSigma === 'number' &&
      stageSigma > 0
    ) {
      zScore = (measuredVal - stageMean) / stageSigma;
    }

    let marginBuffer: number | null = null;
    if (
      typeof measuredVal === 'number' &&
      typeof stageLow === 'number' &&
      typeof stageHigh === 'number'
    ) {
      marginBuffer = Math.min(measuredVal - stageLow, stageHigh - measuredVal);
    }

    return {
      stageNum: stg.stageNum,
      timeSec: stg.timeSec,
      progStage,
      flowSp: stg.flowSp,
      dpSp: stg.dpSp,
      tempSp: stg.tempSp,
      measured: measuredVal,
      lowLimit: stageLow,
      mean: stageMean,
      highLimit: stageHigh,
      sigma: stageSigma,
      zScore,
      marginBuffer,
      transientMetrics,
      isFailed,
      status: isFailed ? 'fail' : zScore !== null && Math.abs(zScore) > 2.5 ? 'warn' : 'pass',
    };
  });
}

export function generateMetrologyTsv(
  friendlyName: string,
  activeSensor: string,
  unit: string,
  subLabel: string,
  metadata: TestMetadata,
  nominalMean: number | null | undefined,
  processSigma: number | null | undefined,
  threeSigmaSpan: number | null | undefined,
  stageRows: MetrologyStageRow[]
): string {
  let tsv = `Channel: ${friendlyName} (${activeSensor})\tUnit: ${unit}\tSubsystem: ${subLabel}\tSerial: ${metadata.serialNumber}\n`;
  tsv += `Nominal Mean (μ): ${nominalMean?.toFixed(3) ?? '--'}\tStd Dev (σ): ${processSigma?.toFixed(3) ?? '--'}\t3σ Span: ±${threeSigmaSpan?.toFixed(3) ?? '--'}\n\n`;
  tsv += `Stage\tTime(s)\tFlow SP\tDP SP\tTemp SP\tMeasured\tLower 3σ\tProcess Mean\tUpper 3σ\tSigma\tZ-Score\tMargin\tVerdict\n`;

  stageRows.forEach((r) => {
    tsv += `S${r.stageNum}\t${r.timeSec}\t${r.flowSp ?? '--'}\t${r.dpSp ?? '--'}\t${r.tempSp ?? '--'}\t`;
    tsv += `${typeof r.measured === 'number' ? r.measured.toFixed(3) : '--'}\t`;
    tsv += `${typeof r.lowLimit === 'number' ? r.lowLimit.toFixed(3) : '--'}\t`;
    tsv += `${typeof r.mean === 'number' ? r.mean.toFixed(3) : '--'}\t`;
    tsv += `${typeof r.highLimit === 'number' ? r.highLimit.toFixed(3) : '--'}\t`;
    tsv += `${typeof r.sigma === 'number' ? r.sigma.toFixed(3) : '--'}\t`;
    tsv += `${typeof r.zScore === 'number' ? r.zScore.toFixed(2) : '--'}\t`;
    tsv += `${typeof r.marginBuffer === 'number' ? r.marginBuffer.toFixed(3) : '--'}\t`;
    tsv += `${r.isFailed ? 'FAIL' : 'PASS'}\n`;
  });

  return tsv;
}

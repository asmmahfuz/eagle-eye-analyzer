import { EvaluatedFaultResult, FaultBreachDetail } from '../faultTypes';
import { getFaultDefinition } from '../faultCatalog';
import { EagleEyeDataset } from '../../../types';

export function checkSecondaryDpRules(dataset: EagleEyeDataset): EvaluatedFaultResult[] {
  const f5Def = getFaultDefinition(5)!;
  const f6Def = getFaultDefinition(6)!;

  const f5Breaches: FaultBreachDetail[] = [];
  const f6Breaches: FaultBreachDetail[] = [];

  const DP_UNCERTAINTY_HIGH = 1.35; // +35% allowable vs X-loop setpoint
  const DP_UNCERTAINTY_LOW = 0.65;  // -35% allowable vs X-loop setpoint

  const { measurements, stages } = dataset;
  const stageCount = stages?.length || 10;
  const evalRows = measurements ? measurements.slice(2, 30) : []; // Rows 5 to 32

  evalRows.forEach((row, idx) => {
    const timeSec = Number(row['Time']) || (15 + idx * 20);
    const stageNum = Math.min(stageCount, Math.floor(idx / 3) + 1);

    let secDp = row['Secondary DP (Supply - Return)'];
    if (secDp === undefined || secDp === null) {
      // Calculate from PT61 - PT62 if channel not pre-computed
      const pt61 = Number(row['PT61']);
      const pt62 = Number(row['PT62']);
      if (!isNaN(pt61) && !isNaN(pt62)) {
        secDp = pt61 - pt62;
      }
    }

    let dpVal = typeof secDp === 'number' ? secDp : parseFloat(secDp);
    // Two's complement rollover normalization for differential pressure
    if (!isNaN(dpVal) && dpVal >= 6500.0 && dpVal <= 6553.4) {
      dpVal = (dpVal * 10 - 65536) / 10;
    }

    const dpSp = typeof row['Secondary DP Setpoint'] === 'number'
      ? row['Secondary DP Setpoint']
      : parseFloat(row['Secondary DP Setpoint']);

    if (!isNaN(dpVal) && !isNaN(dpSp) && dpSp > 0) {
      const upperExpected = dpSp * DP_UNCERTAINTY_HIGH;
      const lowerExpected = dpSp * DP_UNCERTAINTY_LOW;

      if (dpVal > upperExpected) {
        f5Breaches.push({
          timeSec,
          stageNum,
          parameter: 'Secondary DP (Supply - Return)',
          measured: Math.round(dpVal * 10) / 10,
          expectedLimit: Math.round(upperExpected * 10) / 10,
          deviation: Math.round((dpVal - upperExpected) * 10) / 10,
          unit: 'psi',
          condition: `Secondary DP (${dpVal.toFixed(1)} psi) > ${DP_UNCERTAINTY_HIGH}x X-loop DP SP (${upperExpected.toFixed(1)} psi)`
        });
      } else if (dpVal < lowerExpected) {
        f6Breaches.push({
          timeSec,
          stageNum,
          parameter: 'Secondary DP (Supply - Return)',
          measured: Math.round(dpVal * 10) / 10,
          expectedLimit: Math.round(lowerExpected * 10) / 10,
          deviation: Math.round((lowerExpected - dpVal) * 10) / 10,
          unit: 'psi',
          condition: `Secondary DP (${dpVal.toFixed(1)} psi) < ${DP_UNCERTAINTY_LOW}x X-loop DP SP (${lowerExpected.toFixed(1)} psi)`
        });
      }
    }
  });

  return [
    createDpFaultResult(f5Def, f5Breaches, 'Secondary DP exceeded allowable upper uncertainty vs X-loop expectation.'),
    createDpFaultResult(f6Def, f6Breaches, 'Secondary DP dropped below allowable lower uncertainty vs X-loop expectation.')
  ];
}

function createDpFaultResult(
  definition: ReturnType<typeof getFaultDefinition> & {},
  breaches: FaultBreachDetail[],
  failureSummary: string
): EvaluatedFaultResult {
  const isTriggered = breaches.length > 0;
  const worst = breaches.length > 0
    ? breaches.reduce((max, b) => b.deviation > max.deviation ? b : max, breaches[0])
    : null;

  return {
    definition,
    status: isTriggered ? 'fail' : 'pass',
    isTriggered,
    triggerCount: breaches.length,
    worstDeviation: worst ? worst.deviation : null,
    worstDeviationStr: worst ? `+${worst.deviation} ${worst.unit} @ t=${worst.timeSec}s` : null,
    breaches,
    summary: isTriggered
      ? `${failureSummary} (${breaches.length} stage step excursions observed)`
      : 'Secondary DP aligned with X-loop differential pressure envelope.'
  };
}

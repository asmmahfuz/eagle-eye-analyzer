import { EvaluatedFaultResult, FaultBreachDetail } from '../faultTypes';
import { getFaultDefinition } from '../faultCatalog';
import { EagleEyeDataset } from '../../../types';

interface TempProbeConfig {
  sensor: string;
  highCode: number;
  lowCode: number;
}

const PROBES: TempProbeConfig[] = [
  { sensor: 'TT01', highCode: 7, lowCode: 8 },
  { sensor: 'TT61', highCode: 9, lowCode: 10 },
  { sensor: 'TT02', highCode: 11, lowCode: 12 },
  { sensor: 'TT62', highCode: 13, lowCode: 14 }
];

export function checkThermalParityRules(dataset: EagleEyeDataset): EvaluatedFaultResult[] {
  const breachesMap: Record<number, FaultBreachDetail[]> = {};
  for (let c = 7; c <= 14; c++) {
    breachesMap[c] = [];
  }

  const TEMP_UNCERTAINTY_FACTOR_HIGH = 1.08; // +8% or approx +2.2°C at 27°C
  const TEMP_UNCERTAINTY_FACTOR_LOW = 0.92;  // -8% or approx -2.2°C at 27°C
  const MIN_DELTA_CELSIUS = 2.0;              // Absolute guardrail in °C

  const { measurements, stages } = dataset;
  const stageCount = stages?.length || 10;
  const evalRows = measurements ? measurements.slice(2, 30) : []; // Rows 5 to 32

  evalRows.forEach((row, idx) => {
    const timeSec = Number(row['Time']) || (15 + idx * 20);
    const stageNum = Math.min(stageCount, Math.floor(idx / 3) + 1);

    const temps: Record<string, number> = {};
    for (const p of PROBES) {
      const v = typeof row[p.sensor] === 'number' ? row[p.sensor] : parseFloat(row[p.sensor]);
      if (!isNaN(v) && v > -20 && v < 120) {
        temps[p.sensor] = v;
      }
    }

    // Evaluate 4-way parity if at least 4 probes are valid
    if (Object.keys(temps).length >= 4) {
      PROBES.forEach(p => {
        const targetVal = temps[p.sensor];
        const otherVals = PROBES.filter(o => o.sensor !== p.sensor).map(o => temps[o.sensor]);
        const otherAvg = otherVals.reduce((sum, v) => sum + v, 0) / otherVals.length;

        const upperLimit = Math.max(otherAvg * TEMP_UNCERTAINTY_FACTOR_HIGH, otherAvg + MIN_DELTA_CELSIUS);
        const lowerLimit = Math.min(otherAvg * TEMP_UNCERTAINTY_FACTOR_LOW, otherAvg - MIN_DELTA_CELSIUS);

        if (targetVal > upperLimit) {
          breachesMap[p.highCode].push({
            timeSec,
            stageNum,
            parameter: p.sensor,
            measured: Math.round(targetVal * 10) / 10,
            expectedLimit: Math.round(upperLimit * 10) / 10,
            deviation: Math.round((targetVal - upperLimit) * 10) / 10,
            unit: '°C',
            condition: `${p.sensor} (${targetVal.toFixed(1)}°C) > Upper Limit (${upperLimit.toFixed(1)}°C, Avg=${otherAvg.toFixed(1)}°C)`
          });
        } else if (targetVal < lowerLimit) {
          breachesMap[p.lowCode].push({
            timeSec,
            stageNum,
            parameter: p.sensor,
            measured: Math.round(targetVal * 10) / 10,
            expectedLimit: Math.round(lowerLimit * 10) / 10,
            deviation: Math.round((lowerLimit - targetVal) * 10) / 10,
            unit: '°C',
            condition: `${p.sensor} (${targetVal.toFixed(1)}°C) < Lower Limit (${lowerLimit.toFixed(1)}°C, Avg=${otherAvg.toFixed(1)}°C)`
          });
        }
      });
    }
  });

  const results: EvaluatedFaultResult[] = [];
  for (let c = 7; c <= 14; c++) {
    const def = getFaultDefinition(c)!;
    const breaches = breachesMap[c];
    const isTriggered = breaches.length > 0;
    const worst = breaches.length > 0
      ? breaches.reduce((max, b) => b.deviation > max.deviation ? b : max, breaches[0])
      : null;

    results.push({
      definition: def,
      status: isTriggered ? 'warn' : 'pass',
      isTriggered,
      triggerCount: breaches.length,
      worstDeviation: worst ? worst.deviation : null,
      worstDeviationStr: worst ? `+${worst.deviation} °C @ t=${worst.timeSec}s` : null,
      breaches,
      summary: isTriggered
        ? `${def.shortName}: Exceeded 4-way loop parity threshold (${breaches.length} stage step excursions observed).`
        : 'Loop temperature consistent with 4-way cross-probe parity average.'
    });
  }

  return results;
}

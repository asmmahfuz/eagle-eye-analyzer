import { EvaluatedFaultResult, FaultBreachDetail } from '../faultTypes';
import { getFaultDefinition } from '../faultCatalog';
import { EagleEyeDataset } from '../../../types';

interface PumpChannelConfig {
  tag: string;
  name: string;
  highCode: number;
  lowCode: number;
  isOptional?: boolean;
}

const PUMPS: PumpChannelConfig[] = [
  { tag: 'P31 Speed %', name: 'Pump 0', highCode: 15, lowCode: 16 },
  { tag: 'P41 Speed %', name: 'Pump 1', highCode: 17, lowCode: 18 },
  { tag: 'Pump 2 Speed %', name: 'Pump 2', highCode: 19, lowCode: 20, isOptional: true }
];

export function checkPumpSpeedRules(dataset: EagleEyeDataset): EvaluatedFaultResult[] {
  const breachesMap: Record<number, FaultBreachDetail[]> = {};
  for (let c = 15; c <= 20; c++) {
    breachesMap[c] = [];
  }

  const PUMP_SPEED_MAX_PCT = 100.5; // Max 100% (+0.5% tolerance)
  const PUMP_SPEED_MIN_PCT = 25.0;  // Never run below 25% (HMI baseline is 56.0%)

  const { measurements, stages } = dataset;
  const stageCount = stages?.length || 10;
  const evalRows = measurements ? measurements.slice(2, 30) : []; // Rows 5 to 32

  PUMPS.forEach(pump => {
    let channelPresent = false;

    evalRows.forEach((row, idx) => {
      const timeSec = Number(row['Time']) || (15 + idx * 20);
      const stageNum = Math.min(stageCount, Math.floor(idx / 3) + 1);

      let rawVal = row[pump.tag];
      if (rawVal === undefined && pump.isOptional) {
        rawVal = row['P2 Speed %'] || row['Pump2 Speed %'];
      }

      if (rawVal !== undefined && rawVal !== null) {
        channelPresent = true;
        let speed = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
        
        // 0-10V Analog Register Normalization (e.g. 5.6 -> 56%)
        if (!isNaN(speed) && speed <= 12.0 && speed > 0) {
          speed = speed * 10;
        }

        if (!isNaN(speed) && speed > 0) {
          if (speed > PUMP_SPEED_MAX_PCT) {
            breachesMap[pump.highCode].push({
              timeSec,
              stageNum,
              parameter: pump.tag,
              measured: Math.round(speed * 10) / 10,
              expectedLimit: PUMP_SPEED_MAX_PCT,
              deviation: Math.round((speed - PUMP_SPEED_MAX_PCT) * 10) / 10,
              unit: '%',
              condition: `${pump.name} Speed (${speed.toFixed(1)}%) > Max (${PUMP_SPEED_MAX_PCT}%)`
            });
          } else if (speed < PUMP_SPEED_MIN_PCT) {
            breachesMap[pump.lowCode].push({
              timeSec,
              stageNum,
              parameter: pump.tag,
              measured: Math.round(speed * 10) / 10,
              expectedLimit: PUMP_SPEED_MIN_PCT,
              deviation: Math.round((PUMP_SPEED_MIN_PCT - speed) * 10) / 10,
              unit: '%',
              condition: `${pump.name} Speed (${speed.toFixed(1)}%) < Min (${PUMP_SPEED_MIN_PCT}%)`
            });
          }
        }
      }
    });

    if (!channelPresent && pump.isOptional) {
      // Mark as unequipped
      breachesMap[pump.highCode] = [];
      breachesMap[pump.lowCode] = [];
    }
  });

  const results: EvaluatedFaultResult[] = [];
  PUMPS.forEach(pump => {
    [pump.highCode, pump.lowCode].forEach(code => {
      const def = getFaultDefinition(code)!;
      const breaches = breachesMap[code];
      const isTriggered = breaches.length > 0;
      const isUnequipped = pump.isOptional && !(dataset.headers?.includes(pump.tag));

      const worst = breaches.length > 0
        ? breaches.reduce((max, b) => b.deviation > max.deviation ? b : max, breaches[0])
        : null;

      results.push({
        definition: def,
        status: isUnequipped ? 'not_applicable' : (isTriggered ? 'fail' : 'pass'),
        isTriggered,
        triggerCount: breaches.length,
        worstDeviation: worst ? worst.deviation : null,
        worstDeviationStr: worst ? `+${worst.deviation} % @ t=${worst.timeSec}s` : null,
        breaches,
        summary: isUnequipped
          ? `${pump.name} is not equipped on this 2-pump CDU model configuration.`
          : (isTriggered
            ? `${def.shortName}: Measured speed breached allowable envelope (${breaches.length} stage step excursions observed).`
            : `${pump.name} operating speed within allowable 25%-100% envelope.`)
      });
    });
  });

  return results;
}

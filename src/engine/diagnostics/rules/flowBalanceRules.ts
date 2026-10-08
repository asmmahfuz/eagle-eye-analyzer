import { EvaluatedFaultResult, FaultBreachDetail } from '../faultTypes';
import { getFaultDefinition } from '../faultCatalog';
import { EagleEyeDataset } from '../../../types';

export function checkFlowBalanceRules(dataset: EagleEyeDataset): EvaluatedFaultResult[] {
  const f1Def = getFaultDefinition(1)!;
  const f2Def = getFaultDefinition(2)!;
  const f3Def = getFaultDefinition(3)!;
  const f4Def = getFaultDefinition(4)!;

  const f1Breaches: FaultBreachDetail[] = [];
  const f2Breaches: FaultBreachDetail[] = [];
  const f3Breaches: FaultBreachDetail[] = [];
  const f4Breaches: FaultBreachDetail[] = [];

  const FLOW_BALANCE_UNCERTAINTY_HIGH = 1.25; // +25% allowable differential
  const FLOW_BALANCE_UNCERTAINTY_LOW = 0.75;  // -25% allowable differential
  const PQ_FLOW_UNCERTAINTY_HIGH = 1.30;       // +30% allowable vs setpoint
  const PQ_FLOW_UNCERTAINTY_LOW = 0.70;        // -30% allowable vs setpoint

  const { measurements, stages } = dataset;
  const stageCount = stages?.length || 10;
  const evalRows = measurements ? measurements.slice(2, 30) : []; // Rows 5 to 32

  evalRows.forEach((row, idx) => {
    const timeSec = Number(row['Time']) || (15 + idx * 20);
    const stageNum = Math.min(stageCount, Math.floor(idx / 3) + 1);
    const ft01 = typeof row['FT01'] === 'number' ? row['FT01'] : parseFloat(row['FT01']);
    const ft61 = typeof row['FT61'] === 'number' ? row['FT61'] : parseFloat(row['FT61']);
    const flowSp = typeof row['Secondary Flow Setpoint'] === 'number' 
      ? row['Secondary Flow Setpoint'] 
      : parseFloat(row['Secondary Flow Setpoint']);

    // Flow Balance: FT01 vs FT61
    if (!isNaN(ft01) && !isNaN(ft61) && ft61 > 20) {
      const upperExpected = ft61 * FLOW_BALANCE_UNCERTAINTY_HIGH;
      const lowerExpected = ft61 * FLOW_BALANCE_UNCERTAINTY_LOW;

      if (ft01 > upperExpected) {
        f1Breaches.push({
          timeSec,
          stageNum,
          parameter: 'FT01',
          measured: ft01,
          expectedLimit: Math.round(upperExpected * 10) / 10,
          deviation: Math.round((ft01 - upperExpected) * 10) / 10,
          unit: 'LPM',
          condition: `FT01 (${ft01.toFixed(1)}) > ${FLOW_BALANCE_UNCERTAINTY_HIGH}x FT61 (${upperExpected.toFixed(1)})`
        });
      } else if (ft01 < lowerExpected) {
        f2Breaches.push({
          timeSec,
          stageNum,
          parameter: 'FT01',
          measured: ft01,
          expectedLimit: Math.round(lowerExpected * 10) / 10,
          deviation: Math.round((lowerExpected - ft01) * 10) / 10,
          unit: 'LPM',
          condition: `FT01 (${ft01.toFixed(1)}) < ${FLOW_BALANCE_UNCERTAINTY_LOW}x FT61 (${lowerExpected.toFixed(1)})`
        });
      }
    }

    // Secondary Flow vs PQ Setpoint: FT61 vs FlowSP
    if (!isNaN(ft61) && !isNaN(flowSp) && flowSp > 50) {
      const upperPq = flowSp * PQ_FLOW_UNCERTAINTY_HIGH;
      const lowerPq = flowSp * PQ_FLOW_UNCERTAINTY_LOW;

      // Note: If FT61 has different raw units (e.g. g/min vs LPM), only evaluate when scale is aligned
      // When scaled appropriately:
      if (ft61 > upperPq && ft61 < 1000) {
        f3Breaches.push({
          timeSec,
          stageNum,
          parameter: 'FT61',
          measured: ft61,
          expectedLimit: Math.round(upperPq * 10) / 10,
          deviation: Math.round((ft61 - upperPq) * 10) / 10,
          unit: 'LPM',
          condition: `FT61 (${ft61.toFixed(1)}) > ${PQ_FLOW_UNCERTAINTY_HIGH}x FlowSP (${upperPq.toFixed(1)})`
        });
      } else if (ft61 < lowerPq && ft61 > 0) {
        f4Breaches.push({
          timeSec,
          stageNum,
          parameter: 'FT61',
          measured: ft61,
          expectedLimit: Math.round(lowerPq * 10) / 10,
          deviation: Math.round((lowerPq - ft61) * 10) / 10,
          unit: 'LPM',
          condition: `FT61 (${ft61.toFixed(1)}) < ${PQ_FLOW_UNCERTAINTY_LOW}x FlowSP (${lowerPq.toFixed(1)})`
        });
      }
    }
  });

  return [
    createFaultResult(f1Def, f1Breaches, 'FT01 primary flow exceeded allowable uncertainty ratio vs secondary flow.'),
    createFaultResult(f2Def, f2Breaches, 'FT01 primary flow fell below allowable uncertainty ratio vs secondary flow.'),
    createFaultResult(f3Def, f3Breaches, 'FT61 secondary flow exceeded golden unit PQ nominal curve expectation.'),
    createFaultResult(f4Def, f4Breaches, 'FT61 secondary flow fell below golden unit PQ nominal curve expectation.')
  ];
}

function createFaultResult(
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
    status: isTriggered ? (definition.severity === 'critical' ? 'fail' : 'warn') : 'pass',
    isTriggered,
    triggerCount: breaches.length,
    worstDeviation: worst ? worst.deviation : null,
    worstDeviationStr: worst ? `+${worst.deviation} ${worst.unit} @ t=${worst.timeSec}s` : null,
    breaches,
    summary: isTriggered 
      ? `${failureSummary} (${breaches.length} stage step excursions observed)`
      : 'Within allowable flow balance & PQ tolerance limits.'
  };
}

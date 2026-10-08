import { EvaluatedFaultResult } from './faultTypes';
import { checkFlowBalanceRules } from './rules/flowBalanceRules';
import { checkSecondaryDpRules } from './rules/secondaryDpRules';
import { checkThermalParityRules } from './rules/thermalParityRules';
import { checkPumpSpeedRules } from './rules/pumpSpeedRules';
import { EagleEyeDataset, SubsystemCategory } from '../../types';

export function runCanonicalDiagnostics(dataset: EagleEyeDataset): EvaluatedFaultResult[] {
  const flowResults = checkFlowBalanceRules(dataset);
  const dpResults = checkSecondaryDpRules(dataset);
  const tempResults = checkThermalParityRules(dataset);
  const pumpResults = checkPumpSpeedRules(dataset);

  const allResults = [
    ...flowResults,
    ...dpResults,
    ...tempResults,
    ...pumpResults
  ];

  // Sort strictly by canonical fault code number (1 to 20)
  allResults.sort((a, b) => a.definition.codeNumber - b.definition.codeNumber);

  // Cross-reference statistical tolerance failures for associated sensors
  allResults.forEach(res => {
    const allFailures = dataset.failures || [];
    const associatedFails = allFailures.filter(f => 
      res.definition.associatedSensors.some(s => s.toLowerCase() === f.parameter.toLowerCase())
    );

    if (associatedFails.length > 0 && !res.isTriggered) {
      // If mathematical rule passed but statistical 3-sigma limits failed
      res.status = 'warn';
      res.summary = `${res.summary} (Note: ${associatedFails.length} statistical 3σ margin breaches observed on associated sensors).`;
    }
  });

  return allResults;
}

export function getTriggeredFaults(results: EvaluatedFaultResult[]): EvaluatedFaultResult[] {
  return results.filter(r => r.isTriggered || r.status === 'fail');
}

export function getFaultsForSubsystem(
  results: EvaluatedFaultResult[],
  category: SubsystemCategory
): EvaluatedFaultResult[] {
  return results.filter(r => r.definition.category === category);
}

export function getFaultsForSensor(
  results: EvaluatedFaultResult[],
  sensorName: string
): EvaluatedFaultResult[] {
  const target = sensorName.trim().toLowerCase();
  return results.filter(r => 
    r.definition.associatedSensors.some(s => s.toLowerCase() === target || target.includes(s.toLowerCase()))
  );
}

export function getFaultOverviewStats(results: EvaluatedFaultResult[]): {
  total: number;
  triggered: number;
  passed: number;
  warnings: number;
  notApplicable: number;
} {
  let triggered = 0;
  let passed = 0;
  let warnings = 0;
  let notApplicable = 0;

  results.forEach(r => {
    if (r.status === 'not_applicable') notApplicable++;
    else if (r.status === 'fail' || r.isTriggered) triggered++;
    else if (r.status === 'warn') warnings++;
    else passed++;
  });

  return {
    total: results.length,
    triggered,
    passed,
    warnings,
    notApplicable
  };
}

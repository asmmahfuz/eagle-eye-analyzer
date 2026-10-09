import { CanonicalFaultDefinition } from './faultTypes';
import { SubsystemCategory } from '../../types';
import { HYDRAULIC_FAULTS } from './catalog/hydraulicFaults';
import { THERMAL_FAULTS } from './catalog/thermalFaults';
import { PUMP_FAULTS } from './catalog/pumpFaults';

export { HYDRAULIC_FAULTS } from './catalog/hydraulicFaults';
export { THERMAL_FAULTS } from './catalog/thermalFaults';
export { PUMP_FAULTS } from './catalog/pumpFaults';

export const CANONICAL_FAULTS: CanonicalFaultDefinition[] = [
  ...HYDRAULIC_FAULTS,
  ...THERMAL_FAULTS,
  ...PUMP_FAULTS
];

export function getFaultDefinition(codeNumber: number): CanonicalFaultDefinition | undefined {
  return CANONICAL_FAULTS.find(f => f.codeNumber === codeNumber);
}

export function getFaultsForCategory(category: SubsystemCategory): CanonicalFaultDefinition[] {
  return CANONICAL_FAULTS.filter(f => f.category === category);
}

export function getCanonicalFaultsForSensor(sensorName: string): CanonicalFaultDefinition[] {
  const norm = sensorName.trim().toLowerCase();
  return CANONICAL_FAULTS.filter(f => 
    f.associatedSensors.some(s => s.toLowerCase() === norm || norm.includes(s.toLowerCase()))
  );
}

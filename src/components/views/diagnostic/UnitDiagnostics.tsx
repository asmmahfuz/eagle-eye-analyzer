import React from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { DiagnosticPlaceholder } from './DiagnosticPlaceholder';

export interface UnitDiagnosticsProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const UnitDiagnostics: React.FC<UnitDiagnosticsProps> = ({
  dataset,
  onSelectSubsystem
}) => {
  return (
    <DiagnosticPlaceholder
      dataset={dataset}
      scope="unit"
      onSelectSubsystem={onSelectSubsystem}
    />
  );
};

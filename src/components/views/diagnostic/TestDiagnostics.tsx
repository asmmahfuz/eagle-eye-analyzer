import React from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { DiagnosticPlaceholder } from './DiagnosticPlaceholder';

export interface TestDiagnosticsProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

export const TestDiagnostics: React.FC<TestDiagnosticsProps> = ({
  dataset,
  selectedSensor,
  onSelectSubsystem,
  onBackToOverview
}) => {
  const stats = dataset.parameterStats[selectedSensor];
  const category: SubsystemCategory = stats?.category || 'other';

  return (
    <DiagnosticPlaceholder
      dataset={dataset}
      scope="test"
      selectedSensor={selectedSensor}
      selectedSubsystem={category}
      onBackToOverview={onBackToOverview}
      onSelectSubsystem={onSelectSubsystem}
    />
  );
};

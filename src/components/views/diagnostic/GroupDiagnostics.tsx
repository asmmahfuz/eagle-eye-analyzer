import React from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { DiagnosticPlaceholder } from './DiagnosticPlaceholder';

export interface GroupDiagnosticsProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

export const GroupDiagnostics: React.FC<GroupDiagnosticsProps> = ({
  dataset,
  selectedSubsystem,
  onResetSubsystem
}) => {
  return (
    <DiagnosticPlaceholder
      dataset={dataset}
      scope="group"
      selectedSubsystem={selectedSubsystem}
      onBackToOverview={onResetSubsystem}
    />
  );
};

import { EagleEyeDataset } from '../../../types';
import { ProgrammedStageSetpoint, StageTransientMetrics } from '../../../engine/excitation';

export interface CadAdvancedMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSensor: string;
  dataset: EagleEyeDataset;
  onSelectSensor?: (sensorName: string) => void;
  highlightStageNum?: number | null;
}

export interface MetrologyStageRow {
  stageNum: number;
  timeSec: number;
  progStage: ProgrammedStageSetpoint | null;
  flowSp?: number;
  dpSp?: number;
  tempSp?: number;
  measured: number | null;
  lowLimit: number | null | undefined;
  mean: number | null | undefined;
  highLimit: number | null | undefined;
  sigma: number | null | undefined;
  zScore: number | null;
  marginBuffer: number | null;
  transientMetrics: StageTransientMetrics | null;
  isFailed: boolean;
  status: 'pass' | 'warn' | 'fail';
}

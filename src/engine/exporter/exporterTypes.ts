import { EagleEyeDataset } from '../../types';

export interface ExportOptions {
  modelName?: string;
  coolingSeries?: string;
  customFilename?: string;
  skipDownload?: boolean;
}

export interface SheetColWidth {
  wch: number;
}

export interface DeficitCalculation {
  deficitAmount: number;
  percentageDeficit: string;
  breachDirection: 'LOWER' | 'UPPER';
}

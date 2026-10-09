import { CduModelId, CduModelProfile } from './modelTypes';
import { CHX2000_PROFILE } from './chx2000Profile';
import { CHX1000_PROFILE } from './chx1000Profile';
import { AHX180_PROFILE } from './ahx180Profile';
import { EagleEyeDataset } from '../../types';

export const CDU_MODEL_REGISTRY: Record<CduModelId, CduModelProfile> = {
  CHx2000: CHX2000_PROFILE,
  CHx1000: CHX1000_PROFILE,
  AHx180: AHX180_PROFILE
};

export const DEFAULT_CDU_MODEL_ID: CduModelId = 'CHx2000';

/**
 * Returns all registered CDU model profiles.
 */
export function getAllModelProfiles(): CduModelProfile[] {
  return [CHX2000_PROFILE, CHX1000_PROFILE, AHX180_PROFILE];
}

/**
 * Looks up a CDU model profile by its identifier, falling back to CHx2000.
 */
export function getModelProfile(modelId?: CduModelId | string | null): CduModelProfile {
  if (!modelId) return CHX2000_PROFILE;
  const upper = modelId.toUpperCase().trim();
  if (upper === 'CHX2000' || upper === 'CH2000') return CHX2000_PROFILE;
  if (upper === 'CHX1000' || upper === 'CH1000') return CHX1000_PROFILE;
  if (upper === 'AHX180' || upper === 'AH180' || upper === 'CHX80' || upper === 'CH80') return AHX180_PROFILE;
  return CDU_MODEL_REGISTRY[modelId as CduModelId] || CHX2000_PROFILE;
}

/**
 * Intelligently auto-detects CDU model architecture from workbook metadata and telemetry channels.
 */
export function detectModelFromWorkbook(
  dataset: Partial<EagleEyeDataset> | null | undefined,
  filename?: string
): { profile: CduModelProfile; detectionMethod: 'metadata' | 'filename' | 'channel_heuristic' | 'default'; confidence: number } {
  if (!dataset && !filename) {
    return { profile: CHX2000_PROFILE, detectionMethod: 'default', confidence: 1.0 };
  }

  // 1. Explicit Model Field in Workbook Metadata
  const explicitModel = dataset?.metadata?.model;
  if (explicitModel) {
    const prof = getModelProfile(explicitModel);
    return { profile: prof, detectionMethod: 'metadata', confidence: 1.0 };
  }

  // 2. Filename Regex Pattern Matching
  const targetName = (filename || dataset?.metadata?.filename || '').toUpperCase();
  if (/AHX[-_]?180|CHX[-_]?80/i.test(targetName)) {
    return { profile: AHX180_PROFILE, detectionMethod: 'filename', confidence: 0.95 };
  }
  if (/CHX[-_]?1000|CH[-_]?1000/i.test(targetName)) {
    return { profile: CHX1000_PROFILE, detectionMethod: 'filename', confidence: 0.95 };
  }
  if (/CHX[-_]?2000|CH[-_]?2000|CD050L|CD04XB/i.test(targetName)) {
    return { profile: CHX2000_PROFILE, detectionMethod: 'filename', confidence: 0.98 };
  }

  // 3. Telemetry Channel Heuristics
  const headers = dataset?.headers || (dataset?.parameterStats ? Object.keys(dataset.parameterStats) : []);
  if (headers.length > 0) {
    const headerStr = headers.join(' ').toUpperCase();
    const hasFanChannels = headerStr.includes('FAN RPM') || headerStr.includes('AVERAGE FAN');
    const hasReservoir = headerStr.includes('RESERVOIR LEVEL');
    const hasPrimaryFcv = headerStr.includes('FCV61');
    const hasP31P41 = headerStr.includes('P31') && headerStr.includes('P41');

    if (hasFanChannels && hasReservoir && !hasPrimaryFcv) {
      return { profile: AHX180_PROFILE, detectionMethod: 'channel_heuristic', confidence: 0.9 };
    }
    if (hasPrimaryFcv && hasP31P41) {
      return { profile: CHX2000_PROFILE, detectionMethod: 'channel_heuristic', confidence: 0.92 };
    }
    if (!hasPrimaryFcv && hasReservoir) {
      return { profile: AHX180_PROFILE, detectionMethod: 'channel_heuristic', confidence: 0.8 };
    }
  }

  // 4. Default Fallback
  return { profile: CHX2000_PROFILE, detectionMethod: 'default', confidence: 0.85 };
}

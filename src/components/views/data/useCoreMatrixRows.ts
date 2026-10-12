import { useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { getFriendlyChannelName } from '../../../engine/registers';
import { getProgrammedStage } from '../../../engine/excitation';

export type InspectionViewMode = 'steady_state' | 'all_checks' | 'failures';

export interface MatrixRowItem {
  id: string;
  sensorName: string;
  friendlyName: string;
  category: string;
  stageCondition: string;
  measuredResult: string;
  expectedRange: string;
  isPass: boolean;
}

export interface UseCoreMatrixRowsParams {
  dataset: EagleEyeDataset;
  selectedStageNum: number | null;
  inspectionMode: InspectionViewMode;
  categoryFilter: string;
  fixedCategory?: SubsystemCategory;
  searchQuery: string;
}

export function useCoreMatrixRows({
  dataset,
  selectedStageNum,
  inspectionMode,
  categoryFilter,
  fixedCategory,
  searchQuery
}: UseCoreMatrixRowsParams) {
  const { parameterStats, stages, evaluatedChecks, failedCount } = dataset;

  const allChannels = useMemo(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => !fixedCategory || stat.category === fixedCategory)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, fixedCategory]);

  const activeEvaluatedChecks = useMemo(() => {
    return fixedCategory
      ? evaluatedChecks.filter(c => c.category === fixedCategory)
      : evaluatedChecks;
  }, [evaluatedChecks, fixedCategory]);

  const activeFailCount = useMemo(() => {
    return fixedCategory
      ? activeEvaluatedChecks.filter(c => c.status === 'fail').length
      : failedCount;
  }, [fixedCategory, activeEvaluatedChecks, failedCount]);

  const activeTotalChecks = activeEvaluatedChecks.length;

  const getStageConditionText = (timeSec: number) => {
    const stg = stages.find(s => s.timeSec === timeSec);
    const stgNum = stg ? stg.stageNum : 1;
    const prog = getProgrammedStage(stgNum);
    if (timeSec === 525 || stgNum === 10) {
      return `Steady-State (525s) — ${prog?.dpSp ?? 25} psi DP Dwell`;
    }
    const dpText = prog?.dpSp !== undefined
      ? `${prog.dpSp} psi DP`
      : (stg?.dpSp !== null && stg?.dpSp !== undefined ? `${stg.dpSp} psi DP` : '');
    return `Stage ${stgNum} (${timeSec}s)${dpText ? ` — ${dpText} Dwell` : ''}`;
  };

  const matrixRows: MatrixRowItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const effectiveCategory = fixedCategory || categoryFilter;

    // Mode A: Steady-State Dwell (1 row per channel at 525s settling)
    if (inspectionMode === 'steady_state' && selectedStageNum === null) {
      return allChannels
        .filter(({ name, stat }) => {
          if (effectiveCategory !== 'all' && stat.category !== effectiveCategory) return false;
          if (!q) return true;
          const friendly = getFriendlyChannelName(name).toLowerCase();
          return name.toLowerCase().includes(q) || friendly.includes(q) || stat.category.toLowerCase().includes(q);
        })
        .map(({ name, stat }) => {
          const friendly = getFriendlyChannelName(name);
          const isFail = stat.failCount > 0;
          const settlingVal = stat.settling;
          const settlingStr = settlingVal !== null && settlingVal !== undefined
            ? `${typeof settlingVal === 'number' ? settlingVal.toFixed(2) : settlingVal} ${stat.unit}`
            : '--';

          let rangeStr = '±3.0σ Dynamic SPC';
          if (stat.low3Sigma !== null && stat.high3Sigma !== null) {
            rangeStr = `[${stat.low3Sigma.toFixed(2)} ~ ${stat.high3Sigma.toFixed(2)} ${stat.unit}]`;
          } else if (stat.requiredRangeSample) {
            rangeStr = stat.requiredRangeSample;
          }

          const conditionText = isFail
            ? `Steady-State (525s) • ${stat.failCount} Failed`
            : `Steady-State (525s) — 25.0 psi DP Dwell`;

          return {
            id: `ch-${name}`,
            sensorName: name,
            friendlyName: friendly,
            category: stat.category,
            stageCondition: conditionText,
            measuredResult: settlingStr,
            expectedRange: rangeStr,
            isPass: !isFail
          };
        });
    }

    // Mode B: Stage Focus Mode or Mode C: All Checks / Failures
    let checksToDisplay = activeEvaluatedChecks;
    if (selectedStageNum !== null) {
      const activeStage = stages.find(s => s.stageNum === selectedStageNum);
      const stageTime = activeStage ? activeStage.timeSec : null;
      checksToDisplay = stageTime !== null
        ? activeEvaluatedChecks.filter(c => c.timeSec === stageTime)
        : activeEvaluatedChecks;
    }

    if (inspectionMode === 'failures') {
      checksToDisplay = checksToDisplay.filter(c => c.status === 'fail');
    }

    return checksToDisplay
      .filter(chk => {
        if (effectiveCategory !== 'all' && chk.category !== effectiveCategory) return false;
        if (!q) return true;
        const friendly = getFriendlyChannelName(chk.parameter).toLowerCase();
        return chk.parameter.toLowerCase().includes(q) || friendly.includes(q) || chk.category.toLowerCase().includes(q);
      })
      .map((chk, idx) => {
        const friendly = getFriendlyChannelName(chk.parameter);
        const isPass = chk.status !== 'fail';
        const measuredStr = typeof chk.measured === 'number'
          ? `${chk.measured.toFixed(2)} ${chk.unit}`
          : `${chk.measured ?? '--'} ${chk.unit}`;

        let rangeStr = '--';
        if (typeof chk.lowLimit === 'number' && typeof chk.highLimit === 'number') {
          rangeStr = `[${chk.lowLimit.toFixed(2)} ~ ${chk.highLimit.toFixed(2)} ${chk.unit}]`;
        } else if (typeof chk.lowLimit === 'number') {
          rangeStr = `[≥ ${chk.lowLimit.toFixed(2)} ${chk.unit}]`;
        } else if (typeof chk.highLimit === 'number') {
          rangeStr = `[≤ ${chk.highLimit.toFixed(2)} ${chk.unit}]`;
        }

        return {
          id: `chk-${chk.parameter}-${chk.timeSec}-${idx}`,
          sensorName: chk.parameter,
          friendlyName: friendly,
          category: chk.category,
          stageCondition: getStageConditionText(chk.timeSec),
          measuredResult: measuredStr,
          expectedRange: rangeStr,
          isPass
        };
      });
  }, [allChannels, activeEvaluatedChecks, inspectionMode, categoryFilter, fixedCategory, searchQuery, stages, selectedStageNum]);

  return {
    matrixRows,
    activeFailCount,
    activeTotalChecks
  };
}

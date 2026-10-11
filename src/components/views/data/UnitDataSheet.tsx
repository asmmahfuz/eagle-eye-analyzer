import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { StageCards } from '../../StageCards';
import { 
  CheckCircle2, 
  XCircle, 
  BarChart2, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Activity, 
  Thermometer, 
  ChevronRight, 
  Search,
  Filter
} from '../../Icons';
import { getFriendlyChannelName } from '../../../engine/registers';
import { getProgrammedStage } from '../../../engine/excitation';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';

export interface UnitDataSheetProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

type InspectionViewMode = 'steady_state' | 'all_checks' | 'failures';

export const UnitDataSheet: React.FC<UnitDataSheetProps> = ({
  dataset,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectionMode, setInspectionMode] = useState<InspectionViewMode>('steady_state');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMetricSensor, setSelectedMetricSensor] = useState<string | null>(null);
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);

  const { 
    metadata, 
    totalEvaluated, 
    passedCount, 
    failedCount, 
    passRate, 
    categoryCounts, 
    failures, 
    parameterStats,
    stages,
    headers,
    unitMap,
    measurements,
    evaluatedChecks
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  const isOverallPass = metadata.finalResult === 'Pass' || failedCount === 0;
  const totalChannels = headers.length > 1 ? headers.length - 1 : Object.keys(parameterStats).length;

  // All channels list
  const allChannels = useMemo(() => {
    return Object.entries(parameterStats).map(([name, stat]) => ({ name, stat }));
  }, [parameterStats]);

  // Unique failing sensor names
  const failingSensors = useMemo(() => {
    const set = new Set<string>();
    failures.forEach(f => set.add(f.parameter));
    return Array.from(set);
  }, [failures]);

  // Subsystem health category cards (Clean: no register badges)
  const subsystemList = useMemo(() => {
    const getFirstSensorInCat = (cat: SubsystemCategory) => {
      const failing = failures.find(f => f.category === cat);
      if (failing) return failing.parameter;
      const anyInCat = headers.slice(1).find(h => parameterStats[h]?.category === cat);
      return anyInCat || '';
    };

    return [
      {
        id: 'hydraulic' as SubsystemCategory,
        name: 'Hydraulic & DP',
        failCount: categoryCounts.hydraulic?.fail ?? 0,
        passCount: categoryCounts.hydraulic?.pass ?? 0,
        icon: <Droplets size={14} className="text-cyan-400" />,
        primarySensor: getFirstSensorInCat('hydraulic'),
        description: 'Primary DP, Secondary DP, Filter DPs & loop flow'
      },
      {
        id: 'pump' as SubsystemCategory,
        name: 'Pumps & VFD Drives',
        failCount: categoryCounts.pump?.fail ?? 0,
        passCount: categoryCounts.pump?.pass ?? 0,
        icon: <Activity size={14} className="text-blue-400" />,
        primarySensor: getFirstSensorInCat('pump'),
        description: 'Primary & secondary pump speed telemetry'
      },
      {
        id: 'temperature' as SubsystemCategory,
        name: 'Temperatures (TT)',
        failCount: categoryCounts.temperature?.fail ?? 0,
        passCount: categoryCounts.temperature?.pass ?? 0,
        icon: <Thermometer size={14} className="text-amber-400" />,
        primarySensor: getFirstSensorInCat('temperature'),
        description: 'Cooling loop temperature probes'
      },
      {
        id: 'pressure' as SubsystemCategory,
        name: 'Pressures (PT)',
        failCount: categoryCounts.pressure?.fail ?? 0,
        passCount: categoryCounts.pressure?.pass ?? 0,
        icon: <Gauge size={14} className="text-sky-400" />,
        primarySensor: getFirstSensorInCat('pressure'),
        description: 'Supply & return pressure transducers'
      },
      {
        id: 'environmental' as SubsystemCategory,
        name: 'Ambient Conditions',
        failCount: categoryCounts.environmental?.fail ?? 0,
        passCount: categoryCounts.environmental?.pass ?? 0,
        icon: <Wind size={14} className="text-indigo-400" />,
        primarySensor: getFirstSensorInCat('environmental'),
        description: 'Test bay ambient humidity & room temperature'
      },
      {
        id: 'system' as SubsystemCategory,
        name: 'System & Configuration',
        failCount: categoryCounts.system?.fail ?? 0,
        passCount: categoryCounts.system?.pass ?? 0,
        icon: <Cpu size={14} className="text-purple-400" />,
        primarySensor: getFirstSensorInCat('system'),
        description: 'Controller software build & configuration status'
      }
    ];
  }, [categoryCounts, failures, headers, parameterStats]);

  // Stage condition description helper
  const getStageConditionText = (timeSec: number) => {
    const stg = stages.find(s => s.timeSec === timeSec);
    const stgNum = stg ? stg.stageNum : 1;
    const prog = getProgrammedStage(stgNum);
    if (timeSec === 525 || stgNum === 10) {
      return `Steady-State (525s) — ${prog?.dpSp ?? 25} psi DP Dwell`;
    }
    const dpText = prog?.dpSp !== undefined ? `${prog.dpSp} psi DP` : (stg?.dpSp !== null && stg?.dpSp !== undefined ? `${stg.dpSp} psi DP` : '');
    return `Stage ${stgNum} (${timeSec}s)${dpText ? ` — ${dpText} Dwell` : ''}`;
  };

  // 5-Column Core Matrix Rows Computation
  const matrixRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Mode A: Steady-State Dwell (1 row per channel at 525s settling) when no specific stage is selected
    if (inspectionMode === 'steady_state' && selectedStageNum === null) {
      return allChannels
        .filter(({ name, stat }) => {
          if (categoryFilter !== 'all' && stat.category !== categoryFilter) return false;
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
            isPass: !isFail,
            failCount: stat.failCount
          };
        });
    }

    // Mode B: Stage Focus Mode (when a stage is clicked in the Operating Conditions table above)
    if (selectedStageNum !== null) {
      const activeStage = stages.find(s => s.stageNum === selectedStageNum);
      const stageTime = activeStage ? activeStage.timeSec : null;
      let checksToDisplay = stageTime !== null
        ? evaluatedChecks.filter(c => c.timeSec === stageTime)
        : evaluatedChecks;

      if (inspectionMode === 'failures') {
        checksToDisplay = checksToDisplay.filter(c => c.status === 'fail');
      }

      return checksToDisplay
        .filter(chk => {
          if (categoryFilter !== 'all' && chk.category !== categoryFilter) return false;
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
            id: `chk-stg-${chk.parameter}-${chk.timeSec}-${idx}`,
            sensorName: chk.parameter,
            friendlyName: friendly,
            category: chk.category,
            stageCondition: getStageConditionText(chk.timeSec),
            measuredResult: measuredStr,
            expectedRange: rangeStr,
            isPass,
            failCount: isPass ? 0 : 1
          };
        });
    }

    // Mode C: All Stage Checks or Failures Only
    let checksToDisplay = evaluatedChecks;
    if (inspectionMode === 'failures') {
      checksToDisplay = evaluatedChecks.filter(c => c.status === 'fail');
    }

    return checksToDisplay
      .filter(chk => {
        if (categoryFilter !== 'all' && chk.category !== categoryFilter) return false;
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
          isPass,
          failCount: isPass ? 0 : 1
        };
      });
  }, [allChannels, evaluatedChecks, inspectionMode, categoryFilter, searchQuery, stages, selectedStageNum]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Row Header Bar */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            <BarChart2 size={16} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="sensor-main-title">
              Executive Test Run & Subsystem Data Sheet
            </h2>
            <span className="unit-metadata-sub">
              Unit Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | Work Order: <strong>{metadata.workOrderNumber || 'N/A'}</strong> | Tested by: <strong>{metadata.testedBy || 'N/A'}</strong> | Date: <strong>{metadata.dateTested || 'N/A'}</strong> | SW: <strong>v{metadata.softwareVersion}</strong>
            </span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Acceptance Standard">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isOverallPass ? 'pass' : 'fail'}`}>
            {isOverallPass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>OVERALL VERDICT: {isOverallPass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">({passRate}% Compliance)</span>
          </div>
        </div>
      </div>

      {/* Header Metric Strip Simplification (Strict 4 High-Signal Cards) */}
      <div className="datasheet-metrics-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* Card 1: Hardware Unit & WO */}
        <div className="spec-metric-card">
          <span className="spec-label">Hardware Unit & WO</span>
          <span className="spec-value text-cyan-500 font-mono font-bold">
            Serial: {metadata.serialNumber || 'N/A'} | {metadata.workOrderNumber ? (metadata.workOrderNumber.startsWith('WO') ? metadata.workOrderNumber : `WO${metadata.workOrderNumber}`) : 'WO-N/A'}
          </span>
          <span className="spec-sub">
            Date: {metadata.dateTested || 'N/A'} • SW: v{metadata.softwareVersion}
          </span>
        </div>

        {/* Card 2: Total Evaluated Checks */}
        <div className="spec-metric-card">
          <span className="spec-label">Total Evaluated Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {totalEvaluated.toLocaleString()} Checks
          </span>
          <span className="spec-sub">
            {totalChannels} Channels × {stages.length} Operating Stages
          </span>
        </div>

        {/* Card 3: First-Pass Yield */}
        <div className="spec-metric-card">
          <span className="spec-label">First-Pass Yield</span>
          <span className="spec-value text-emerald-500 font-mono font-bold">
            {passRate}% Pass Rate
          </span>
          <span className="spec-sub">
            {passedCount.toLocaleString()} Passed • {failedCount} Violations
          </span>
        </div>

        {/* Card 4: Unit Acceptance Verdict */}
        <div className={`spec-metric-card ${isOverallPass ? 'highlight' : ''}`} style={{ borderLeft: `3px solid ${isOverallPass ? 'var(--success)' : 'var(--danger)'}` }}>
          <span className="spec-label">Unit Acceptance Verdict</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px' }}>
            <span className={`cad-stage-badge ${isOverallPass ? 'pass' : 'fail'}`} style={{ fontSize: '12px', padding: '2px 8px' }}>
              {isOverallPass ? 'PASS' : 'FAIL'}
            </span>
            <span className="font-mono text-xs" style={{ color: isOverallPass ? 'var(--success)' : 'var(--danger)' }}>
              {isOverallPass ? '100% Passed' : `${failedCount} Failed`}
            </span>
          </div>
          <span className="spec-sub">
            {isOverallPass ? 'Production verification approved' : 'Rework directive review required'}
          </span>
        </div>
      </div>

      {/* Clean Subsystem Health Cards (6 Categories without Modbus badges) */}
      <div className="subsystems-overview-grid">
        {subsystemList.map(sub => {
          const hasFail = sub.failCount > 0;
          return (
            <div 
              key={sub.id} 
              className={`subsystem-card ${hasFail ? 'has-fail' : 'pass'}`}
              onClick={() => {
                if (onSelectSubsystem) {
                  onSelectSubsystem(sub.id);
                } else if (sub.primarySensor) {
                  onSelectSensor(sub.primarySensor);
                }
              }}
              title={`Click to inspect ${sub.name} subsystem`}
            >
              <div className="subsystem-card-top">
                <div className="subsystem-title-wrap">
                  {sub.icon}
                  <span className="subsystem-name">{sub.name}</span>
                </div>
                <span className={`subsystem-badge ${hasFail ? 'fail' : 'pass'}`}>
                  {hasFail ? `${sub.failCount} FAIL` : 'PASS'}
                </span>
              </div>
              <div className="subsystem-desc">{sub.description}</div>
              <div className="subsystem-card-footer">
                <span className="primary-sensor-link">
                  {sub.primarySensor ? `Inspect: ${sub.primarySensor}` : 'All In Tolerance'}
                </span>
                <ChevronRight size={11} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 10-Stage Operating Conditions Matrix */}
      <div style={{ padding: '0 14px' }}>
        <StageCards 
          title="10-Stage Operating Conditions & Setpoint Profiles (15s – 525s)"
          stages={stages} 
          measurements={measurements} 
          subsystemChannels={allChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
          selectedStageNum={selectedStageNum}
          onSelectStageNum={setSelectedStageNum}
        />
      </div>

      {/* Strict 5-Column Core Inspection Matrix */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        {/* Table Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
                {selectedStageNum !== null
                  ? `Verification Data Sheet — Stage ${selectedStageNum} Dwell Checks (${matrixRows.length} Rows)`
                  : `Verification Data Sheet — 5-Column Core Matrix (${matrixRows.length} Rows)`}
              </h3>
              <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.28)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
                Invariant 13 Compliant
              </span>
              {selectedStageNum !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedStageNum(null)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '10px',
                    background: 'rgba(2, 132, 199, 0.15)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: '3px',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Clear stage focus and return to full matrix"
                >
                  Stage {selectedStageNum} Active ✕
                </button>
              )}
            </div>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              {selectedStageNum !== null
                ? `Isolated to Stage ${selectedStageNum} dwell checks across all channels`
                : 'Core Matrix: [Test Parameter, Stage/Condition, Measured Result, Expected Range/Spec, Pass/Fail Verdict]'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: '4px', padding: '2px', gap: '2px' }}>
              <button
                type="button"
                className={`cad-view-mode-btn ${inspectionMode === 'steady_state' ? 'active' : ''}`}
                onClick={() => setInspectionMode('steady_state')}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '3px',
                  border: 'none',
                  background: inspectionMode === 'steady_state' ? 'var(--bg-card)' : 'transparent',
                  color: inspectionMode === 'steady_state' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontWeight: inspectionMode === 'steady_state' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Steady-State (525s)
              </button>
              <button
                type="button"
                className={`cad-view-mode-btn ${inspectionMode === 'all_checks' ? 'active' : ''}`}
                onClick={() => setInspectionMode('all_checks')}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '3px',
                  border: 'none',
                  background: inspectionMode === 'all_checks' ? 'var(--bg-card)' : 'transparent',
                  color: inspectionMode === 'all_checks' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontWeight: inspectionMode === 'all_checks' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                All Stage Checks ({totalEvaluated})
              </button>
              <button
                type="button"
                className={`cad-view-mode-btn ${inspectionMode === 'failures' ? 'active' : ''}`}
                onClick={() => setInspectionMode('failures')}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '3px',
                  border: 'none',
                  background: inspectionMode === 'failures' ? 'var(--bg-card)' : 'transparent',
                  color: inspectionMode === 'failures' ? 'var(--danger-text)' : 'var(--text-muted)',
                  fontWeight: inspectionMode === 'failures' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Failed Only ({failedCount})
              </button>
            </div>

            {/* Subsystem Domain Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Domains</option>
              <option value="hydraulic">Hydraulic & DP</option>
              <option value="pump">Pumps & VFD</option>
              <option value="temperature">Temperatures</option>
              <option value="pressure">Pressures</option>
              <option value="environmental">Ambient</option>
              <option value="system">System / PLC</option>
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Filter channel or tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '4px 8px 4px 26px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  width: '160px'
                }}
              />
            </div>
          </div>
        </div>

        {/* The Strict 5-Column Table */}
        <table className="cad-data-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>1. Test Parameter / Channel</th>
              <th style={{ width: '26%' }}>2. Stage / Condition</th>
              <th style={{ width: '18%' }}>3. Measured Result</th>
              <th style={{ width: '18%' }}>4. Expected Range / Spec</th>
              <th style={{ width: '10%', textAlign: 'right' }}>5. Verdict</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                  No channels match the active filter criteria.
                </td>
              </tr>
            ) : (
              matrixRows.map(row => {
                const subLabel = SUBSYSTEM_LABELS[row.category as SubsystemCategory] || row.category;

                return (
                  <tr key={row.id} className={row.isPass ? 'row-pass' : 'row-fail'}>
                    {/* Col 1: Test Parameter / Channel (Friendly Name, No Register Badges) */}
                    <td>
                      <div>
                        <div 
                          style={{ 
                            cursor: 'pointer', 
                            color: 'var(--accent-cyan)', 
                            fontWeight: 700, 
                            display: 'inline-block' 
                          }}
                          onClick={() => onSelectSensor(row.sensorName)}
                          title={`Click to open scope for ${row.friendlyName}`}
                        >
                          {row.friendlyName}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{row.sensorName}</span>
                          <span style={{ margin: '0 4px' }}>•</span>
                          <span>{subLabel}</span>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Stage / Condition */}
                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {row.stageCondition}
                      </span>
                    </td>

                    {/* Col 3: Measured Result (Prominent Monospace Bold) */}
                    <td>
                      <span 
                        className="font-mono font-bold" 
                        style={{ 
                          fontSize: '12.5px', 
                          color: row.isPass ? 'var(--text-main)' : 'var(--danger-text)' 
                        }}
                      >
                        {row.measuredResult}
                      </span>
                    </td>

                    {/* Col 4: Expected Range / Spec */}
                    <td>
                      <span className="font-mono text-dim" style={{ fontSize: '11px' }}>
                        {row.expectedRange}
                      </span>
                    </td>

                    {/* Col 5: Pass/Fail Verdict & [⋯ Details] Action Button */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <span className={`cad-stage-badge ${row.isPass ? 'pass' : 'fail'}`}>
                          {row.isPass ? 'PASS' : 'FAIL'}
                        </span>

                        <button
                          type="button"
                          className="cad-details-btn"
                          onClick={() => setSelectedMetricSensor(row.sensorName)}
                          title={`Open Advanced Metrology Modal for ${row.friendlyName} (μ, σ, ±3σ, Z-scores)`}
                        >
                          ⋯ Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* On-Demand Advanced SPC Metrology Modal */}
      <CadAdvancedMetricsModal
        isOpen={selectedMetricSensor !== null}
        onClose={() => setSelectedMetricSensor(null)}
        initialSensor={selectedMetricSensor || ''}
        dataset={dataset}
        onSelectSensor={onSelectSensor}
      />
    </section>
  );
};

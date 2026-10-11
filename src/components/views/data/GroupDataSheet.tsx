import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { StageCards } from '../../StageCards';
import { 
  CheckCircle2, 
  XCircle, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Activity, 
  Thermometer, 
  Search,
  Layers 
} from '../../Icons';
import { getFriendlyChannelName } from '../../../engine/registers';
import { getProgrammedStage } from '../../../engine/excitation';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';

export interface GroupDataSheetProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

type GroupInspectionViewMode = 'steady_state' | 'all_checks' | 'failures';

export const GroupDataSheet: React.FC<GroupDataSheetProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectionMode, setInspectionMode] = useState<GroupInspectionViewMode>('steady_state');
  const [selectedMetricSensor, setSelectedMetricSensor] = useState<string | null>(null);
  const [selectedStageNum, setSelectedStageNum] = useState<number | null>(null);

  const { 
    metadata, 
    failedCount, 
    passedCount, 
    totalEvaluated, 
    categoryCounts, 
    failures, 
    parameterStats, 
    stages, 
    unitMap, 
    measurements,
    evaluatedChecks 
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  const subName = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;

  // Active channels belonging exclusively to this subsystem
  const activeChannels = useMemo(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, selectedSubsystem]);

  // Active failures in this subsystem
  const activeFailures = useMemo(() => {
    return failures.filter(f => f.category === selectedSubsystem);
  }, [failures, selectedSubsystem]);

  // Unique failing sensor names in this subsystem
  const activeFailingSensors = useMemo(() => {
    const set = new Set<string>();
    activeFailures.forEach(f => set.add(f.parameter));
    return Array.from(set);
  }, [activeFailures]);

  // Subsystem evaluation totals
  const subCatCount = categoryCounts[selectedSubsystem];
  const activeFailCount = subCatCount ? subCatCount.fail : 0;
  const activePassCount = subCatCount ? subCatCount.pass : 0;
  const activeTotalEvaluated = activePassCount + activeFailCount;
  const activePassRate = activeTotalEvaluated > 0 
    ? Number(((activePassCount / activeTotalEvaluated) * 100).toFixed(1)) 
    : 100;
  const isScopePass = activeFailCount === 0;

  // Subsystem category icon helper
  const getSubsystemIcon = (cat: SubsystemCategory) => {
    switch (cat) {
      case 'hydraulic':
        return <Droplets size={16} className="text-cyan-400" />;
      case 'pump':
        return <Activity size={16} className="text-blue-400" />;
      case 'temperature':
        return <Thermometer size={16} className="text-amber-400" />;
      case 'pressure':
        return <Gauge size={16} className="text-sky-400" />;
      case 'environmental':
        return <Wind size={16} className="text-indigo-400" />;
      case 'system':
        return <Cpu size={16} className="text-purple-400" />;
      default:
        return <Activity size={16} className="text-cyan-400" />;
    }
  };

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

  // Subsystem evaluated checks
  const subsystemEvaluatedChecks = useMemo(() => {
    return evaluatedChecks.filter(c => c.category === selectedSubsystem);
  }, [evaluatedChecks, selectedSubsystem]);

  // 5-Column Core Matrix Rows for Subsystem
  const matrixRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Mode A: Steady-State Dwell (1 row per subsystem channel at 525s settling) when no stage is selected
    if (inspectionMode === 'steady_state' && selectedStageNum === null) {
      return activeChannels
        .filter(({ name, stat }) => {
          if (!q) return true;
          const friendly = getFriendlyChannelName(name).toLowerCase();
          return name.toLowerCase().includes(q) || friendly.includes(q);
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
            id: `grp-ch-${name}`,
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
        ? subsystemEvaluatedChecks.filter(c => c.timeSec === stageTime)
        : subsystemEvaluatedChecks;

      if (inspectionMode === 'failures') {
        checksToDisplay = checksToDisplay.filter(c => c.status === 'fail');
      }

      return checksToDisplay
        .filter(chk => {
          if (!q) return true;
          const friendly = getFriendlyChannelName(chk.parameter).toLowerCase();
          return chk.parameter.toLowerCase().includes(q) || friendly.includes(q);
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
            id: `grp-chk-stg-${chk.parameter}-${chk.timeSec}-${idx}`,
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
    let checksToDisplay = subsystemEvaluatedChecks;
    if (inspectionMode === 'failures') {
      checksToDisplay = subsystemEvaluatedChecks.filter(c => c.status === 'fail');
    }

    return checksToDisplay
      .filter(chk => {
        if (!q) return true;
        const friendly = getFriendlyChannelName(chk.parameter).toLowerCase();
        return chk.parameter.toLowerCase().includes(q) || friendly.includes(q);
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
          id: `grp-chk-${chk.parameter}-${chk.timeSec}-${idx}`,
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
  }, [activeChannels, subsystemEvaluatedChecks, inspectionMode, searchQuery, stages, selectedStageNum]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem Filter Announcement Banner */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info">
          <span>FILTERED BY SUBSYSTEM:</span>
          <strong className="text-cyan-400">{subName.toUpperCase()}</strong>
          <span style={{ opacity: 0.7 }}>— Showing telemetry & operating matrix for this domain only</span>
        </div>
        {onResetSubsystem && (
          <button 
            type="button"
            className="reset-subsystem-btn"
            onClick={onResetSubsystem}
            title="Click to view the entire unit overview"
          >
            <Layers size={11} />
            <span>Show Whole Unit</span>
          </button>
        )}
      </div>

      {/* Row Header Bar */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            {getSubsystemIcon(selectedSubsystem)}
          </div>
          <div>
            <h2 className="sensor-main-title">
              {subName} Subsystem Data Sheet & Stages
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

          <div className={`status-badge-prominent ${isScopePass ? 'pass' : 'fail'}`}>
            {isScopePass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>SUBSYSTEM VERDICT: {isScopePass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">({activePassRate}% Compliance)</span>
          </div>
        </div>
      </div>

      {/* 4 High-Signal Subsystem KPI Cards */}
      <div className="datasheet-metrics-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* Card 1: Hardware Unit & WO */}
        <div className="spec-metric-card">
          <span className="spec-label">Hardware Unit & WO</span>
          <span className="spec-value text-cyan-500 font-mono font-bold">
            Serial: {metadata.serialNumber || 'N/A'} | {metadata.workOrderNumber ? (metadata.workOrderNumber.startsWith('WO') ? metadata.workOrderNumber : `WO${metadata.workOrderNumber}`) : 'WO-N/A'}
          </span>
          <span className="spec-sub">
            Subsystem Domain: {subName}
          </span>
        </div>

        {/* Card 2: Subsystem Checks */}
        <div className="spec-metric-card">
          <span className="spec-label">Subsystem Evaluated Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {activeTotalEvaluated.toLocaleString()} Checks
          </span>
          <span className="spec-sub">
            {activeChannels.length} Channels × {stages.length} Operating Stages
          </span>
        </div>

        {/* Card 3: Subsystem Yield */}
        <div className="spec-metric-card">
          <span className="spec-label">Subsystem Yield</span>
          <span className="spec-value text-emerald-500 font-mono font-bold">
            {activePassRate}% Pass Rate
          </span>
          <span className="spec-sub">
            {activePassCount.toLocaleString()} Passed • {activeFailCount} Violations
          </span>
        </div>

        {/* Card 4: Subsystem Acceptance Verdict */}
        <div className={`spec-metric-card ${isScopePass ? 'highlight' : ''}`} style={{ borderLeft: `3px solid ${isScopePass ? 'var(--success)' : 'var(--danger)'}` }}>
          <span className="spec-label">Subsystem Verdict</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px' }}>
            <span className={`cad-stage-badge ${isScopePass ? 'pass' : 'fail'}`} style={{ fontSize: '12px', padding: '2px 8px' }}>
              {isScopePass ? 'PASS' : 'FAIL'}
            </span>
            <span className="font-mono text-xs" style={{ color: isScopePass ? 'var(--success)' : 'var(--danger)' }}>
              {isScopePass ? 'All Channels Passed' : `${activeFailCount} Failed`}
            </span>
          </div>
          <span className="spec-sub">
            {isScopePass ? 'Zero subsystem anomalies' : `Across ${activeFailingSensors.length} channel(s)`}
          </span>
        </div>
      </div>

      {/* 10-Stage Operating Conditions Matrix Scoped to Subsystem */}
      <div style={{ padding: '0 14px' }}>
        <StageCards 
          title={`10-Stage Operating Conditions — ${subName} Domain Focus (15s – 525s)`}
          stages={stages} 
          measurements={measurements} 
          selectedSubsystem={selectedSubsystem} 
          subsystemChannels={activeChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
          selectedStageNum={selectedStageNum}
          onSelectStageNum={setSelectedStageNum}
        />
      </div>

      {/* Strict 5-Column Core Matrix for Subsystem */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        {/* Table Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
                {selectedStageNum !== null
                  ? `${subName} Verification Matrix — Stage ${selectedStageNum} Dwell Checks (${matrixRows.length} Rows)`
                  : `${subName} Verification Matrix — 5-Column Core Matrix (${matrixRows.length} Rows)`}
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
                ? `Isolated to Stage ${selectedStageNum} dwell checks for ${subName}`
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
                All Checks ({activeTotalEvaluated})
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
                Failed ({activeFailCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder={`Filter ${subName}...`}
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
                          <span>{subName}</span>
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

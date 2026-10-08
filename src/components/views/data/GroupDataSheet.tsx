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
  ChevronRight, 
  Search,
  Layers 
} from '../../Icons';
import { CadRegisterBadge } from '../../cad/CadRegisterBadge';

export interface GroupDataSheetProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

export const GroupDataSheet: React.FC<GroupDataSheetProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
    measurements
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

  // Filtered channel directory
  const filteredDirectoryChannels = useMemo(() => {
    if (!searchQuery.trim()) return activeChannels;
    const q = searchQuery.toLowerCase();
    return activeChannels.filter(({ name, stat }) => 
      name.toLowerCase().includes(q) || 
      stat.category.toLowerCase().includes(q) ||
      (stat.unit && stat.unit.toLowerCase().includes(q))
    );
  }, [activeChannels, searchQuery]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem Filter Announcement Banner */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info">
          <span>FILTERED BY SUBSYSTEM:</span>
          <strong className="text-cyan-400">{subName.toUpperCase()}</strong>
          <span style={{ opacity: 0.7 }}>— Showing telemetry & operating matrix for this subsystem only</span>
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

      {/* 6 Subsystem KPI Metric Cards */}
      <div className="datasheet-metrics-strip">
        <div className="spec-metric-card">
          <span className="spec-label">Subsystem Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {activeTotalEvaluated.toLocaleString()}
          </span>
          <span className="spec-sub">{activeChannels.length} channels × {stages.length} stages</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Passed Checks</span>
          <span className="spec-value text-emerald-400 font-mono font-bold">
            {activePassCount.toLocaleString()}
          </span>
          <span className="spec-sub">{activePassRate}% First Pass Yield</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Out of Tolerance</span>
          <span className={`spec-value ${activeFailCount > 0 ? 'text-rose-400' : 'text-emerald-400'} font-mono font-bold`}>
            {activeFailCount}
          </span>
          <span className="spec-sub">
            {activeFailCount > 0 ? `Across ${activeFailingSensors.length} test channel(s)` : 'Zero anomalies detected'}
          </span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Monitored Channels</span>
          <span className="spec-value text-cyan-400 font-mono font-bold">
            {activeChannels.length} Channels
          </span>
          <span className="spec-sub">In {subName} Domain</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Hardware Serial</span>
          <span className="spec-value text-purple-300 font-mono font-bold">
            {metadata.serialNumber || 'N/A'}
          </span>
          <span className="spec-sub">WO: {metadata.workOrderNumber || 'N/A'}</span>
        </div>

        <div className="spec-metric-card highlight">
          <span className="spec-label">Operating Stages</span>
          <span className="spec-value text-amber-300 font-mono">
            {stages.length} Tested Steps
          </span>
          <span className="spec-sub">
            {stages[0]?.timeSec ?? 0}s to {stages[stages.length - 1]?.timeSec ?? 525}s timeline
          </span>
        </div>
      </div>

      {/* 10-Stage Operating Condition Cards Scoped to Subsystem */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '6px' }}>
          <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
            10-Stage Operating Conditions — {subName} Domain Focus (15s – 525s)
          </h3>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Target Flow ({flowSpUnit}), DP ({dpSpUnit}), Supply Temp ({tempSpUnit}) & Pump Command (%)
          </span>
        </div>
        <StageCards 
          stages={stages} 
          measurements={measurements} 
          selectedSubsystem={selectedSubsystem} 
          subsystemChannels={activeChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
        />
      </div>

      {/* Subsystem Monitored Channels Directory Table (11 Columns) */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              {subName} Telemetry Channels Directory ({filteredDirectoryChannels.length} Channels)
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              11-column statistical directory with nominal mean (μ), process sigma (σ), steady-state settling at 525s, and worst margin buffer
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder={`Filter ${subName} channels...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '4px 8px 4px 26px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  width: '180px'
                }}
              />
            </div>
          </div>
        </div>

        <table className="cad-data-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Subsystem</th>
              <th>Settling (525s)</th>
              <th>Process Mean (μ)</th>
              <th>Std Dev (σ)</th>
              <th>Lower 3σ (μ - 3σ)</th>
              <th>Upper 3σ (μ + 3σ)</th>
              <th>Worst Margin</th>
              <th>Violations</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDirectoryChannels.map(({ name, stat }) => {
              const isFail = stat.failCount > 0;
              const meanStr = stat.nominalMean !== null ? `${stat.nominalMean.toFixed(2)} ${stat.unit}` : '--';
              const sigmaStr = stat.processSigma !== null ? stat.processSigma.toFixed(3) : '--';
              const settlingStr = stat.settling !== null ? `${stat.settling.toFixed(2)} ${stat.unit}` : '--';
              const lowStr = stat.low3Sigma !== null ? `${stat.low3Sigma.toFixed(2)} ${stat.unit}` : '--';
              const highStr = stat.high3Sigma !== null ? `${stat.high3Sigma.toFixed(2)} ${stat.unit}` : '--';
              const marginStr = stat.worstMargin !== null ? `${stat.worstMargin >= 0 ? '+' : ''}${stat.worstMargin.toFixed(2)} ${stat.unit}` : '--';
              const subLabel = SUBSYSTEM_LABELS[stat.category] || stat.category;

              return (
                <tr key={name} className={isFail ? 'row-fail' : 'row-pass'}>
                  <td className="font-bold">
                    <span 
                      style={{ cursor: 'pointer', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '5px' }} 
                      onClick={() => onSelectSensor(name)}
                      title={`Click to open scope for ${name}`}
                    >
                      <CadRegisterBadge channelName={name} />
                      {name}
                    </span>
                  </td>
                  <td className="font-mono text-dim" style={{ fontSize: '10px' }}>{subLabel}</td>
                  <td className="font-mono font-bold text-cyan">{settlingStr}</td>
                  <td className="font-mono">{meanStr}</td>
                  <td className="font-mono text-dim">{sigmaStr}</td>
                  <td className="font-mono text-dim">{lowStr}</td>
                  <td className="font-mono text-dim">{highStr}</td>
                  <td className={`font-mono font-bold ${isFail ? 'text-red' : 'text-green'}`}>
                    {marginStr}
                  </td>
                  <td className="font-mono font-bold">
                    <span className={stat.failCount > 0 ? 'text-red' : 'text-green'}>
                      {stat.failCount}
                    </span>
                  </td>
                  <td>
                    <span className={`cad-stage-badge ${isFail ? 'fail' : 'pass'}`}>
                      {isFail ? 'FAIL' : 'PASS'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="cad-view-btn-sm"
                      onClick={() => onSelectSensor(name)}
                      title={`Open detailed telemetry scope for ${name}`}
                    >
                      <span>Open Scope</span>
                      <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Subsystem 10-Stage Dwell Check Matrix Table */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              {subName} 10-Stage Dwell Check Matrix
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Step-by-step steady-state dwell values (15s – 525s) for {activeChannels.length} {subName} channel(s) with 3σ tolerance verification
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            [Normal: Compliant | <span className="text-red font-bold">Highlighted: 3σ Excursion</span>]
          </div>
        </div>

        <div className="dwell-matrix-scroll-wrapper">
          <table className="dwell-matrix-table">
            <thead>
              <tr>
                <th>Parameter Tag</th>
                <th>Subsystem</th>
                <th>Unit</th>
                {stages.map(stg => (
                  <th key={stg.stageNum} title={`Stage ${stg.stageNum} at t = ${stg.timeSec}s`}>
                    S{stg.stageNum} ({stg.timeSec}s)
                  </th>
                ))}
                <th>Violations</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {activeChannels.map(({ name, stat }) => {
                const isChFail = stat.failCount > 0;
                const subLabel = SUBSYSTEM_LABELS[stat.category] || stat.category;

                return (
                  <tr key={name} className={isChFail ? 'row-fail' : 'row-pass'}>
                    <td className="font-bold">
                      <span 
                        style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }} 
                        onClick={() => onSelectSensor(name)}
                        title={`Click to open scope for ${name}`}
                      >
                        {name}
                      </span>
                    </td>
                    <td className="text-dim" style={{ fontSize: '10px' }}>{subLabel}</td>
                    <td className="text-dim">{stat.unit || '--'}</td>
                    {stages.map(stg => {
                      const mRow = measurements.find(m => m['Time'] === stg.timeSec);
                      const val = mRow ? mRow[name] : null;
                      const isPointFailed = stg.failedSensors.includes(name);
                      const valStr = typeof val === 'number' ? val.toFixed(2) : (val !== null && val !== undefined ? String(val) : '--');

                      return (
                        <td key={stg.stageNum}>
                          <span 
                            className={`dwell-cell ${isPointFailed ? 'fail' : 'pass'}`}
                            title={`${name} at Stage ${stg.stageNum} (${stg.timeSec}s): ${valStr} ${stat.unit}${isPointFailed ? ' [3σ EXCURSION]' : ''}`}
                          >
                            {valStr}
                            {isPointFailed && <span style={{ marginLeft: '2px' }}>⚠️</span>}
                          </span>
                        </td>
                      );
                    })}
                    <td className="font-mono font-bold">
                      <span className={stat.failCount > 0 ? 'text-red' : 'text-green'}>
                        {stat.failCount}
                      </span>
                    </td>
                    <td>
                      <span className={`cad-stage-badge ${isChFail ? 'fail' : 'pass'}`}>
                        {isChFail ? 'FAIL' : 'PASS'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

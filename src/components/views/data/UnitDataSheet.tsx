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
  Search 
} from '../../Icons';
import { CadRegisterBadge } from '../../cad/CadRegisterBadge';

export interface UnitDataSheetProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

export const UnitDataSheet: React.FC<UnitDataSheetProps> = ({
  dataset,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
    measurements
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  const isOverallPass = metadata.finalResult === 'Pass' || failedCount === 0;
  const totalChannels = headers.length > 1 ? headers.length - 1 : Object.keys(parameterStats).length;

  // All 50 channels list
  const allChannels = useMemo(() => {
    return Object.entries(parameterStats).map(([name, stat]) => ({ name, stat }));
  }, [parameterStats]);

  // Unique failing sensor names
  const failingSensors = useMemo(() => {
    const set = new Set<string>();
    failures.forEach(f => set.add(f.parameter));
    return Array.from(set);
  }, [failures]);

  // Subsystem health category cards
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
      }
    ];
  }, [categoryCounts, failures, headers, parameterStats]);

  // Filtered channel directory
  const filteredDirectoryChannels = useMemo(() => {
    if (!searchQuery.trim()) return allChannels;
    const q = searchQuery.toLowerCase();
    return allChannels.filter(({ name, stat }) => 
      name.toLowerCase().includes(q) || 
      stat.category.toLowerCase().includes(q) ||
      (stat.unit && stat.unit.toLowerCase().includes(q))
    );
  }, [allChannels, searchQuery]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Row Header Bar: Executive Summary */}
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

      {/* 6 Executive KPI Metric Cards */}
      <div className="datasheet-metrics-strip">
        <div className="spec-metric-card">
          <span className="spec-label">Total Evaluated Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {totalEvaluated.toLocaleString()}
          </span>
          <span className="spec-sub">{totalChannels} channels × {stages.length} stages</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Passed Checks</span>
          <span className="spec-value text-emerald-400 font-mono font-bold">
            {passedCount.toLocaleString()}
          </span>
          <span className="spec-sub">{passRate}% First Pass Yield</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Out of Tolerance</span>
          <span className={`spec-value ${failedCount > 0 ? 'text-rose-400' : 'text-emerald-400'} font-mono font-bold`}>
            {failedCount}
          </span>
          <span className="spec-sub">
            {failedCount > 0 ? `Across ${failingSensors.length} test channel(s)` : 'Zero anomalies detected'}
          </span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Hardware Serial</span>
          <span className="spec-value text-cyan-400 font-mono font-bold">
            {metadata.serialNumber || 'N/A'}
          </span>
          <span className="spec-sub">{metadata.customer ? `Customer: ${metadata.customer}` : metadata.filename}</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">FW / Build Revision</span>
          <span className="spec-value text-purple-300 font-mono">
            {metadata.frameworkBuildVersion !== '-' ? metadata.frameworkBuildVersion : metadata.softwareVersion}
          </span>
          <span className="spec-sub">Software v{metadata.softwareVersion}</span>
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

      {/* Subsystem Health Overview Grid (Whole Unit Mode) */}
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

      {/* 10-Stage Operating Condition Cards */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '6px' }}>
          <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
            10-Stage Operating Conditions & Setpoint Profiles (15s – 525s)
          </h3>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Target Flow ({flowSpUnit}), DP ({dpSpUnit}), Supply Temp ({tempSpUnit}) & Pump Command (%)
          </span>
        </div>
        <StageCards 
          stages={stages} 
          measurements={measurements} 
          subsystemChannels={allChannels} 
          onSelectSensor={onSelectSensor}
          flowSpUnit={flowSpUnit}
          dpSpUnit={dpSpUnit}
          tempSpUnit={tempSpUnit}
        />
      </div>

      {/* Complete Unit Monitored Channels Directory Table (11 Columns) */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              Complete Unit Telemetry Channels Directory ({filteredDirectoryChannels.length} Channels)
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
                placeholder="Filter channel tag or unit..."
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

      {/* Aggregated 10-Stage Multi-Channel Dwell Check Matrix Table */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              Aggregated 10-Stage Multi-Channel Dwell Check Matrix
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Step-by-step steady-state dwell values (15s – 525s) across all {allChannels.length} channels with 3σ tolerance verification
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
              {allChannels.map(({ name, stat }) => {
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

import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Droplets, 
  Wind, 
  Cpu, 
  Gauge, 
  Activity, 
  Thermometer, 
  ArrowLeft,
  Layers,
  BarChart2
} from '../../Icons';
import { getFriendlyChannelName } from '../../../engine/registers';
import { 
  getProgrammedStage, 
  calculateStageTransientMetrics, 
  calculateChannelTransientProfile 
} from '../../../engine/excitation';
import { TransientBadge } from '../common/TransientBadge';
import { CadAdvancedMetricsModal } from '../../cad/CadAdvancedMetricsModal';

export interface TestDataSheetProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

export const TestDataSheet: React.FC<TestDataSheetProps> = ({
  dataset,
  selectedSensor,
  onSelectSubsystem,
  onBackToOverview,
  onSelectSensor
}) => {
  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [selectedModalStage, setSelectedModalStage] = useState<number | null>(null);

  const { 
    metadata, 
    evaluatedChecks, 
    parameterStats, 
    stages, 
    unitMap, 
    measurements
  } = dataset;

  const stats = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subName = SUBSYSTEM_LABELS[category] || category;
  const friendlyName = getFriendlyChannelName(selectedSensor);

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const tempSpUnit = unitMap['Secondary Temperature Setpoint'] || '°C';

  // Evaluated points for this specific sensor
  const sensorEvaluations = useMemo(() => {
    return evaluatedChecks.filter(c => c.parameter === selectedSensor);
  }, [evaluatedChecks, selectedSensor]);

  // Failure points for this sensor
  const failures = useMemo(() => {
    return sensorEvaluations.filter(c => c.status === 'fail');
  }, [sensorEvaluations]);

  const hasFail = failures.length > 0;
  const isPass = !hasFail;
  const totalChecks = sensorEvaluations.length > 0 ? sensorEvaluations.length : (stats?.totalChecks ?? stages.length);
  const passRate = totalChecks > 0 
    ? Number((((totalChecks - failures.length) / totalChecks) * 100).toFixed(1))
    : 100;

  // Subsystem icon helper
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

  // Dynamic transient profile across all 10 stages
  const transientProfile = useMemo(() => {
    return calculateChannelTransientProfile(selectedSensor, dataset);
  }, [selectedSensor, dataset]);

  // Check 10-stage evaluations specifically for this sensor
  const stageEvaluations = useMemo(() => {
    return stages.map(stg => {
      const mRow = measurements.find(m => m['Time'] === stg.timeSec);
      const val = mRow ? mRow[selectedSensor] : null;
      const pt = sensorEvaluations.find(e => e.timeSec === stg.timeSec);
      const isFailed = stg.failedSensors.includes(selectedSensor) || (pt ? pt.status === 'fail' : false);
      const progStage = getProgrammedStage(stg.stageNum);
      const transientMetrics = (progStage && typeof val === 'number')
        ? calculateStageTransientMetrics(selectedSensor, progStage, val, unit)
        : null;

      // Condition text
      let conditionText = `Stage ${stg.stageNum} (${stg.timeSec}s)`;
      if (stg.timeSec === 525 || stg.stageNum === 10) {
        conditionText = `Steady-State (525s) — ${progStage?.dpSp ?? 25} psi DP Dwell`;
      } else if (progStage?.dpSp !== undefined) {
        conditionText = `Stage ${stg.stageNum} (${stg.timeSec}s) — ${progStage.dpSp} psi DP Dwell`;
      } else if (stg.dpSp !== null && stg.dpSp !== undefined) {
        conditionText = `Stage ${stg.stageNum} (${stg.timeSec}s) — ${stg.dpSp} psi DP Dwell`;
      }

      // Range text
      let rangeText = '--';
      const lowLimit = pt?.lowLimit ?? stats?.low3Sigma;
      const highLimit = pt?.highLimit ?? stats?.high3Sigma;
      if (typeof lowLimit === 'number' && typeof highLimit === 'number') {
        rangeText = `[${lowLimit.toFixed(2)} ~ ${highLimit.toFixed(2)} ${unit}]`;
      } else if (typeof lowLimit === 'number') {
        rangeText = `[≥ ${lowLimit.toFixed(2)} ${unit}]`;
      } else if (typeof highLimit === 'number') {
        rangeText = `[≤ ${highLimit.toFixed(2)} ${unit}]`;
      } else if (stats?.requiredRangeSample) {
        rangeText = stats.requiredRangeSample;
      }

      const valStr = typeof val === 'number' 
        ? `${val.toFixed(2)} ${unit}`
        : (val !== null && val !== undefined ? `${String(val)} ${unit}` : '--');

      return {
        stage: stg,
        stageNum: stg.stageNum,
        timeSec: stg.timeSec,
        measured: val,
        measuredStr: valStr,
        conditionText,
        rangeText,
        evalPoint: pt,
        isFailed,
        transientMetrics
      };
    });
  }, [stages, measurements, sensorEvaluations, selectedSensor, unit, stats]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem & Channel Navigation Banner (Clean: No Register Badges) */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.7 }}>TELEMETRY CHANNEL:</span>
          <strong className="text-cyan-400 font-mono" style={{ fontSize: '13px' }}>{friendlyName}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>({selectedSensor})</span>
          <span className="cad-badge-unit" style={{ padding: '1px 6px', fontSize: '10px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
            {unit || '--'}
          </span>
          <span style={{ opacity: 0.6, fontSize: '11px' }}>• {subName} Domain</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSelectSubsystem && (
            <button
              type="button"
              className="reset-subsystem-btn"
              onClick={() => onSelectSubsystem(category)}
              title={`Filter to all ${subName} channels`}
            >
              {getSubsystemIcon(category)}
              <span>{subName} Group</span>
            </button>
          )}

          {onBackToOverview && (
            <button
              type="button"
              className="reset-subsystem-btn"
              onClick={onBackToOverview}
              title="Return to Whole Unit Data Sheet"
            >
              <Layers size={11} />
              <span>Whole Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Row Header Bar */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            {getSubsystemIcon(category)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="sensor-main-title" style={{ margin: 0 }}>
                {friendlyName}
              </h2>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                color: 'var(--accent-cyan)', 
                background: 'rgba(2, 132, 199, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '3px',
                border: '1px solid rgba(2, 132, 199, 0.2)'
              }}>
                Tag: {selectedSensor}
              </span>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                color: 'var(--success)', 
                background: 'rgba(5, 150, 105, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '3px',
                border: '1px solid rgba(5, 150, 105, 0.2)'
              }}>
                {unit || '--'}
              </span>
            </div>
            <span className="unit-metadata-sub">
              Domain: <strong>{subName}</strong> | Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | Work Order: <strong>{metadata.workOrderNumber || 'N/A'}</strong> | Tested by: <strong>{metadata.testedBy || 'N/A'}</strong> | Date: <strong>{metadata.dateTested || 'N/A'}</strong>
            </span>
          </div>
        </div>

        <div className="row-actions-group">
          <div className="spc-rule-badge" title="Statistical Process Control (SPC) 3-Sigma Acceptance Standard">
            <span className="spc-icon">3σ</span>
            <span>Rule: μ - 3σ ≤ V ≤ μ + 3σ (|Z| ≤ 3.0σ)</span>
          </div>

          <div className={`status-badge-prominent ${isPass ? 'pass' : 'fail'}`}>
            {isPass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            <span>3σ VERDICT: {isPass ? 'PASS' : 'FAIL'}</span>
            <span className="pass-rate-text">
              ({hasFail ? `${failures.length} Violations` : '100% In Tolerance'})
            </span>
          </div>
        </div>
      </div>

      {/* 4 High-Signal Channel KPI Cards */}
      <div className="datasheet-metrics-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* Card 1: Hardware Unit & WO */}
        <div className="spec-metric-card">
          <span className="spec-label">Hardware Unit & WO</span>
          <span className="spec-value text-cyan-500 font-mono font-bold">
            Serial: {metadata.serialNumber || 'N/A'} | {metadata.workOrderNumber ? (metadata.workOrderNumber.startsWith('WO') ? metadata.workOrderNumber : `WO${metadata.workOrderNumber}`) : 'WO-N/A'}
          </span>
          <span className="spec-sub">
            Channel: {selectedSensor} ({subName})
          </span>
        </div>

        {/* Card 2: Channel Checks */}
        <div className="spec-metric-card">
          <span className="spec-label">Total Evaluated Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {totalChecks} Checks
          </span>
          <span className="spec-sub">
            Across {stages.length} Operating Stages (15s – 525s)
          </span>
        </div>

        {/* Card 3: First-Pass Yield */}
        <div className="spec-metric-card">
          <span className="spec-label">Compliance Yield</span>
          <span className="spec-value text-emerald-500 font-mono font-bold">
            {passRate}% In-Spec
          </span>
          <span className="spec-sub">
            {totalChecks - failures.length} Passed • {failures.length} Violations
          </span>
        </div>

        {/* Card 4: Channel Verdict */}
        <div className={`spec-metric-card ${isPass ? 'highlight' : ''}`} style={{ borderLeft: `3px solid ${isPass ? 'var(--success)' : 'var(--danger)'}` }}>
          <span className="spec-label">Channel Acceptance Verdict</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px' }}>
            <span className={`cad-stage-badge ${isPass ? 'pass' : 'fail'}`} style={{ fontSize: '12px', padding: '2px 8px' }}>
              {isPass ? 'PASS' : 'FAIL'}
            </span>
            <span className="font-mono text-xs" style={{ color: isPass ? 'var(--success)' : 'var(--danger)' }}>
              {isPass ? 'All Checks Passed' : `${failures.length} Failed`}
            </span>
          </div>
          <span className="spec-sub">
            {isPass ? 'Zero failures detected' : 'Requires engineering review / tuning'}
          </span>
        </div>
      </div>

      {/* Single-Channel 10-Stage Operating Progression & Verification Matrix */}
      <div style={{ padding: '0 14px' }}>
        <div className="stage-matrix-container">
          <div className="stage-matrix-toolbar">
            <div className="stage-matrix-title-wrap">
              <span className="stage-matrix-title">
                10-Stage Operating Progression & Verification Matrix — {friendlyName} (15s – 525s)
              </span>
              <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.28)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
                Invariant 13 Compliant
              </span>
              <div className="stage-matrix-counts">
                <span className="count-pill all">{stages.length} Stages</span>
                <span className={`count-pill ${stageEvaluations.filter(e => e.isFailed).length > 0 ? 'fail' : 'pass'}`}>
                  {stageEvaluations.filter(e => e.isFailed).length} Failed
                </span>
                <span className="count-pill pass">
                  {stages.length - stageEvaluations.filter(e => e.isFailed).length} Nominal
                </span>
              </div>
            </div>

            <div className="stage-matrix-actions">
              <button
                type="button"
                className="cad-details-btn"
                onClick={() => {
                  setSelectedModalStage(null);
                  setShowMetricsModal(true);
                }}
                title="Open 11-column statistical process control ledger and distribution"
              >
                <BarChart2 size={12} />
                <span>⋯ Advanced SPC Details</span>
              </button>
            </div>
          </div>

          <div className="stage-matrix-scroll-wrap">
            <table className="stage-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>Stage & Dwell</th>
                  <th style={{ width: '10%' }}>Verdict</th>
                  <th style={{ width: '15%' }}>Transient Stability</th>
                  <th style={{ width: '9%' }}>Flow Sp</th>
                  <th style={{ width: '8%' }}>DP Sp</th>
                  <th style={{ width: '8%' }}>Temp Sp</th>
                  <th style={{ width: '15%' }}>Measured Dwell</th>
                  <th style={{ width: '14%' }}>Expected Range / Spec</th>
                  <th style={{ width: '8%', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {stageEvaluations.map(({ stage, measuredStr, isFailed, transientMetrics, rangeText }) => {
                  return (
                    <tr 
                      key={`sensor-stage-${stage.stageNum}`}
                      className={`stage-matrix-row ${isFailed ? 'row-fail' : 'row-pass'}`}
                    >
                      <td className="stage-cell-stage">
                        <div className="stage-primary-id">
                          <span className="stage-name">Stage {stage.stageNum}</span>
                          {stage.stageNum === 10 && (
                            <span className="stage-steady-tag">Steady</span>
                          )}
                        </div>
                        <span className="stage-dwell-sub">{stage.timeSec}s dwell</span>
                      </td>

                      <td className="stage-cell-verdict">
                        <span className={`status-badge-mini ${isFailed ? 'fail' : 'pass'}`}>
                          {isFailed ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                          <span>{isFailed ? 'FAILED' : 'PASS'}</span>
                        </span>
                      </td>

                      <td className="stage-cell-transient">
                        {transientMetrics ? (
                          <TransientBadge metrics={transientMetrics} compact showDelta />
                        ) : (
                          <span className="text-muted font-mono" style={{ fontSize: '10px' }}>--</span>
                        )}
                      </td>

                      <td className="stage-cell-sp">
                        <span className="sp-v font-mono text-cyan-400">
                          {stage.flowSp !== null ? `${stage.flowSp} ${flowSpUnit}` : '--'}
                        </span>
                      </td>

                      <td className="stage-cell-sp">
                        <span className="sp-v font-mono text-emerald-400">
                          {stage.dpSp !== null ? `${stage.dpSp} ${dpSpUnit}` : '--'}
                        </span>
                      </td>

                      <td className="stage-cell-sp">
                        <span className="sp-v font-mono text-amber-300">
                          {stage.tempSp !== null ? `${stage.tempSp} ${tempSpUnit}` : '--'}
                        </span>
                      </td>

                      <td className="stage-cell-sp">
                        <strong className={`font-mono ${isFailed ? 'text-red' : 'text-cyan-400'}`} style={{ fontSize: '12px' }}>
                          {measuredStr}
                        </strong>
                      </td>

                      <td>
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {rangeText}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="cad-details-btn"
                          onClick={() => {
                            setSelectedModalStage(stage.stageNum);
                            setShowMetricsModal(true);
                          }}
                          title={`Open Advanced Metrology Modal for ${friendlyName} focusing on Stage ${stage.stageNum}`}
                        >
                          ⋯ Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Integrated SPC Metrology Footer (Merged with 10-Stage Matrix) */}
          <div className="stage-matrix-spc-footer">
            <div className="stage-matrix-spc-summary">
              <span className="spc-summary-title">Statistical Process Control (SPC):</span>
              <span className="spc-stat-pill">
                <span className="spc-stat-label">Nominal Mean (μ):</span>
                <strong className="spc-stat-val font-mono text-cyan-400">
                  {stats?.nominalMean?.toFixed(2) ?? '--'} {unit}
                </strong>
              </span>
              <span className="spc-stat-divider">•</span>
              <span className="spc-stat-pill">
                <span className="spc-stat-label">Std Dev (σ):</span>
                <strong className="spc-stat-val font-mono text-amber-300">
                  {stats?.processSigma?.toFixed(3) ?? '--'} {unit}
                </strong>
              </span>
              <span className="spc-stat-divider">•</span>
              <span className="spc-stat-pill">
                <span className="spc-stat-label">Worst Margin:</span>
                <strong className={`spc-stat-val font-mono ${stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0 ? 'text-red' : 'text-emerald-400'}`}>
                  {stats?.worstMargin !== null && stats?.worstMargin !== undefined ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}` : '--'}
                </strong>
              </span>
              {stats?.low3Sigma !== undefined && stats?.high3Sigma !== undefined && (
                <>
                  <span className="spc-stat-divider">•</span>
                  <span className="spc-stat-pill">
                    <span className="spc-stat-label">3σ Tolerance Gate:</span>
                    <span className="spc-stat-val font-mono text-dim">
                      [{stats.low3Sigma.toFixed(2)} ~ {stats.high3Sigma.toFixed(2)} {unit}]
                    </span>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className="cad-details-btn spc-footer-btn"
              onClick={() => {
                setSelectedModalStage(null);
                setShowMetricsModal(true);
              }}
              title="Open full 11-column statistical process control ledger, tolerance gates, and distribution in details menu"
            >
              <BarChart2 size={12} />
              <span>⋯ Advanced SPC Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* On-Demand Advanced SPC Metrology Modal */}
      <CadAdvancedMetricsModal
        isOpen={showMetricsModal}
        onClose={() => {
          setShowMetricsModal(false);
          setSelectedModalStage(null);
        }}
        initialSensor={selectedSensor}
        dataset={dataset}
        onSelectSensor={onSelectSensor}
        highlightStageNum={selectedModalStage}
      />
    </section>
  );
};

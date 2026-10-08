import React, { useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS, EvaluatedPoint } from '../../../types';
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
  Cpu as ModbusIcon,
  Sliders,
  BarChart2
} from '../../Icons';
import { CadRegisterBadge } from '../../cad/CadRegisterBadge';
import { getRegisterByName } from '../../../engine/registers';

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
  const { 
    metadata, 
    evaluatedChecks, 
    parameterStats, 
    stages, 
    unitMap, 
    measurements,
    limits 
  } = dataset;

  const stats = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subName = SUBSYSTEM_LABELS[category] || category;

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

  // Mean value fallback from raw measurements if nominalMean is missing
  const meanValue = useMemo(() => {
    const validVals = measurements
      .map(m => m[selectedSensor])
      .filter((v): v is number => typeof v === 'number');
    if (validVals.length === 0) return null;
    return validVals.reduce((a, b) => a + b, 0) / validVals.length;
  }, [measurements, selectedSensor]);

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

  // Authoritative Modbus register definition
  const regDef = useMemo(() => getRegisterByName(selectedSensor), [selectedSensor]);
  const modbusAddress = useMemo(() => {
    if (regDef) return `Address ${regDef.address} (${regDef.displayName})`;
    return 'Standard PLC Holding Register';
  }, [regDef]);

  // Check 10-stage evaluations specifically for this sensor
  const stageEvaluations = useMemo(() => {
    return stages.map(stg => {
      const mRow = measurements.find(m => m['Time'] === stg.timeSec);
      const val = mRow ? mRow[selectedSensor] : null;
      const pt = sensorEvaluations.find(e => e.timeSec === stg.timeSec);
      const isFailed = stg.failedSensors.includes(selectedSensor) || (pt ? pt.status === 'fail' : false);

      return {
        stage: stg,
        measured: val,
        evalPoint: pt,
        isFailed
      };
    });
  }, [stages, measurements, sensorEvaluations, selectedSensor]);

  return (
    <section className="cad-tab-focused-card row-data-sheet">
      {/* Subsystem & Channel Navigation Banner */}
      <div className="cad-subsystem-filter-banner">
        <div className="filter-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.7 }}>TELEMETRY CHANNEL:</span>
          <CadRegisterBadge channelName={selectedSensor} showPrefix style={{ fontSize: '11px', padding: '2px 6px' }} />
          <strong className="text-cyan-400 font-mono" style={{ fontSize: '13px' }}>{selectedSensor}</strong>
          <span className="cad-badge-unit" style={{ padding: '1px 6px', fontSize: '10px', background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '3px', color: 'var(--accent-cyan)' }}>
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

      {/* Row Header Bar: Single-Channel Specifications */}
      <div className="row-header-bar">
        <div className="row-title-group">
          <div className="overview-icon-badge">
            {getSubsystemIcon(category)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="sensor-main-title" style={{ margin: 0 }}>
                {selectedSensor}
              </h2>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '11px', 
                color: 'var(--accent-cyan)', 
                background: 'rgba(0, 210, 255, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '3px',
                border: '1px solid rgba(0, 210, 255, 0.2)'
              }}>
                {unit}
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

      {/* 6 Single-Test KPI Metric Cards */}
      <div className="datasheet-metrics-strip">
        <div className="spec-metric-card">
          <span className="spec-label">Total Evaluated Checks</span>
          <span className="spec-value text-slate-100 font-mono font-bold">
            {stats?.totalChecks ?? sensorEvaluations.length}
          </span>
          <span className="spec-sub">{stages.length} Operating Stages</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Out of Tolerance</span>
          <span className={`spec-value ${hasFail ? 'text-rose-400' : 'text-emerald-400'} font-mono font-bold`}>
            {failures.length}
          </span>
          <span className="spec-sub">
            {hasFail && stats?.maxZScore !== null && stats?.maxZScore !== undefined 
              ? `Max Deviation: |Z| = ${stats.maxZScore.toFixed(2)}σ` 
              : 'Zero statistical excursions'}
          </span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Settling Value (525s)</span>
          <span className="spec-value text-emerald-400 font-mono font-bold">
            {stats?.settling !== null && stats?.settling !== undefined 
              ? `${typeof stats.settling === 'number' ? stats.settling.toFixed(2) : stats.settling} ${unit}` 
              : '--'}
          </span>
          <span className="spec-sub">Steady-state final reading</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Process Mean (μ)</span>
          <span className="spec-value text-cyan-400 font-mono font-bold">
            {stats?.nominalMean !== null && stats?.nominalMean !== undefined 
              ? `${stats.nominalMean.toFixed(2)} ${unit}` 
              : (meanValue !== null ? `${meanValue.toFixed(2)} ${unit}` : '--')}
          </span>
          <span className="spec-sub">Nominal distribution center</span>
        </div>

        <div className="spec-metric-card">
          <span className="spec-label">Process Sigma (σ)</span>
          <span className="spec-value text-amber-300 font-mono font-bold">
            {stats?.processSigma !== null && stats?.processSigma !== undefined 
              ? `${stats.processSigma.toFixed(3)} ${unit}` 
              : '--'}
          </span>
          <span className="spec-sub">
            {stats?.threeSigmaSpan !== null && stats?.threeSigmaSpan !== undefined 
              ? `Tolerance: ±${stats.threeSigmaSpan.toFixed(2)} ${unit} (±3σ)` 
              : '1-Sigma process std dev'}
          </span>
        </div>

        <div className="spec-metric-card highlight">
          <span className="spec-label">Worst Margin Buffer</span>
          <span className={`spec-value ${stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'} font-mono`}>
            {stats?.worstMargin !== null && stats?.worstMargin !== undefined 
              ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}` 
              : '--'}
          </span>
          <span className="spec-sub">
            {stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0 
              ? 'Deficit below required 3σ limit' 
              : 'Safety clearance buffer'}
          </span>
        </div>
      </div>

      {/* Single-Channel 10-Stage Operating Progression Cards */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '6px' }}>
          <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
            10-Stage Operating Progression for {selectedSensor} (15s – 525s)
          </h3>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Stage-by-stage measured dwell value vs target setpoints and 3-sigma tolerance boundaries
          </span>
        </div>

        <div className="stages-cards-wrapper">
          <div className="stages-grid-compact">
            {stageEvaluations.map(({ stage, measured, evalPoint, isFailed }) => {
              const valStr = typeof measured === 'number' 
                ? measured.toFixed(2) 
                : (measured !== null && measured !== undefined ? String(measured) : '--');
              
              const lowLimitStr = evalPoint?.lowLimit !== null && evalPoint?.lowLimit !== undefined 
                ? evalPoint.lowLimit.toFixed(2) 
                : (stats?.low3Sigma !== null && stats?.low3Sigma !== undefined ? stats.low3Sigma.toFixed(2) : '--');

              const highLimitStr = evalPoint?.highLimit !== null && evalPoint?.highLimit !== undefined 
                ? evalPoint.highLimit.toFixed(2) 
                : (stats?.high3Sigma !== null && stats?.high3Sigma !== undefined ? stats.high3Sigma.toFixed(2) : '--');

              const zScoreStr = evalPoint?.zScore !== null && evalPoint?.zScore !== undefined 
                ? `${evalPoint.zScore > 0 ? '+' : ''}${evalPoint.zScore.toFixed(2)}σ` 
                : null;

              const marginStr = evalPoint?.marginBuffer !== null && evalPoint?.marginBuffer !== undefined 
                ? `${evalPoint.marginBuffer >= 0 ? '+' : ''}${evalPoint.marginBuffer.toFixed(2)} ${unit}` 
                : null;

              return (
                <div 
                  key={`sensor-stage-${stage.stageNum}`}
                  className={`stage-card-compact ${isFailed ? 'fail' : 'pass'}`}
                >
                  <div className="stage-card-header">
                    <span className="stage-num-title">Stage {stage.stageNum} ({stage.timeSec}s)</span>
                    <span className={`status-badge-mini ${isFailed ? 'fail' : 'pass'}`}>
                      {isFailed ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                      <span>{isFailed ? 'EXCURSION' : 'PASS'}</span>
                    </span>
                  </div>

                  {/* Setpoint Reference */}
                  <div className="stage-sp-info">
                    <div className="stage-sp-line">
                      <span className="sp-item" title="Secondary Flow Setpoint">
                        <span className="sp-k">Flow:</span> <strong className="sp-v text-cyan-400">{stage.flowSp !== null ? `${stage.flowSp} ${flowSpUnit}` : '--'}</strong>
                      </span>
                      <span className="sp-item" title="Secondary DP Setpoint">
                        <span className="sp-k">DP:</span> <strong className="sp-v text-emerald-400">{stage.dpSp !== null ? `${stage.dpSp} ${dpSpUnit}` : '--'}</strong>
                      </span>
                    </div>
                    <div className="stage-sp-line">
                      <span className="sp-item" title="Secondary Temperature Setpoint">
                        <span className="sp-k">Temp:</span> <strong className="sp-v text-amber-300">{stage.tempSp !== null ? `${stage.tempSp} ${tempSpUnit}` : '--'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Measured Dwell Value Prominent Box */}
                  <div style={{ 
                    marginTop: '6px', 
                    padding: '6px 8px', 
                    borderRadius: '4px', 
                    background: isFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 210, 255, 0.05)',
                    border: `1px solid ${isFailed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 210, 255, 0.15)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                        Measured Dwell:
                      </span>
                      <span className={`font-mono font-bold ${isFailed ? 'text-red' : 'text-cyan'}`} style={{ fontSize: '13px' }}>
                        {valStr} {unit}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontSize: '10px' }}>
                      <span className="text-dim" style={{ fontSize: '9.5px' }}>3σ Bounds:</span>
                      <span className="font-mono text-dim" style={{ fontSize: '9.5px' }}>
                        [{lowLimitStr} ~ {highLimitStr}]
                      </span>
                    </div>

                    {(zScoreStr || marginStr) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontSize: '9.5px' }}>
                        {zScoreStr && (
                          <span className={`font-mono font-bold ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {zScoreStr}
                          </span>
                        )}
                        {marginStr && (
                          <span className={`font-mono ${isFailed ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                            Δ {marginStr}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hardware & Modbus Specifications Grid */}
      <div style={{ padding: '0 14px', marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              Hardware Architecture & Modbus Register Specifications
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              PLC telemetry channel mapping, engineering unit normalization, and hardware sentinel verification
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ModbusIcon size={13} className="text-purple-400" />
            <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Link-Local PLC: 169.254.244.6:502
            </span>
          </div>
        </div>

        <div className="cad-property-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {/* Card 1: Channel Identity & Physical Transducer */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Channel Identity & Physical Transducer</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Tag Name</td>
                  <td className="cad-prop-val font-mono font-bold text-cyan">{selectedSensor}</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Subsystem Domain</td>
                  <td className="cad-prop-val">{subName} ({category.toUpperCase()})</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Engineering Unit</td>
                  <td className="cad-prop-val font-mono font-bold text-green">{unit || '--'}</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Required Envelope</td>
                  <td className="cad-prop-val font-mono">{stats?.requiredRangeSample || '±3σ Dynamic SPC'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 2: Modbus TCP & Signal Conditioning */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Modbus TCP & Signal Conditioning</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Register Source</td>
                  <td className="cad-prop-val font-mono">Modbus TCP : 502</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Holding Register</td>
                  <td className="cad-prop-val font-mono">{modbusAddress}</td>
                </tr>
                <tr>
                  <td className="cad-prop-key">0–10V Scaling</td>
                  <td className="cad-prop-val">
                    {category === 'pump' || selectedSensor.includes('FCV') ? (
                      <span className="cad-active-tag">10× Normalized (0–100%)</span>
                    ) : (
                      <span className="cad-dim-tag">Standard Physical</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Two's Complement</td>
                  <td className="cad-prop-val">
                    {selectedSensor.includes('DP') ? (
                      <span className="cad-active-tag">Signed 16-Bit Rollover Active</span>
                    ) : (
                      <span className="cad-dim-tag">Unsigned 16-Bit</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Sentinel Check (0xFFFF)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.peak === 6553.5 ? (
                      <span className="text-red font-bold">0xFFFF Open-Circuit Fault</span>
                    ) : (
                      <span className="text-green">Clean Transducer Bus</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 3: Statistical SPC 3-Sigma Limits */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Statistical SPC 3-Sigma Limits</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Process Mean (μ)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.nominalMean !== null && stats?.nominalMean !== undefined 
                      ? `${stats.nominalMean.toFixed(2)} ${unit}` 
                      : (meanValue !== null ? `${meanValue.toFixed(2)} ${unit}` : '--')}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Process Sigma (σ)</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.processSigma !== null && stats?.processSigma !== undefined 
                      ? `${stats.processSigma.toFixed(3)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Lower 3σ (μ - 3σ)</td>
                  <td className="cad-prop-val font-mono text-cyan">
                    {stats?.low3Sigma !== null && stats?.low3Sigma !== undefined 
                      ? `${stats.low3Sigma.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Upper 3σ (μ + 3σ)</td>
                  <td className="cad-prop-val font-mono text-cyan">
                    {stats?.high3Sigma !== null && stats?.high3Sigma !== undefined 
                      ? `${stats.high3Sigma.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">3σ Tolerance Band</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.threeSigmaSpan !== null && stats?.threeSigmaSpan !== undefined 
                      ? `±${stats.threeSigmaSpan.toFixed(2)} ${unit} (Span: ${(stats.threeSigmaSpan * 2).toFixed(2)})` 
                      : '--'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 4: Parametric Extremes (Triad) */}
          <div className="cad-prop-group">
            <div className="cad-prop-group-header">
              <span className="cad-prop-chevron">▾</span>
              <span className="cad-prop-group-title">Parametric Extremes (Triad)</span>
            </div>
            <table className="cad-prop-table">
              <tbody>
                <tr>
                  <td className="cad-prop-key">Recorded Peak (Max)</td>
                  <td className="cad-prop-val font-mono text-blue font-bold">
                    {stats?.peak !== null && stats?.peak !== undefined 
                      ? `${stats.peak.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Recorded Minimum (Min)</td>
                  <td className="cad-prop-val font-mono text-sky">
                    {stats?.min !== null && stats?.min !== undefined 
                      ? `${stats.min.toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Settling (at 525s)</td>
                  <td className="cad-prop-val font-mono font-bold text-green">
                    {stats?.settling !== null && stats?.settling !== undefined 
                      ? `${typeof stats.settling === 'number' ? stats.settling.toFixed(2) : stats.settling} ${unit}` 
                      : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Worst Margin Buffer</td>
                  <td className="cad-prop-val font-mono">
                    <span className={`cad-margin-pill ${stats?.worstMargin !== null && stats?.worstMargin !== undefined && stats.worstMargin < 0 ? 'margin-deficit' : 'margin-healthy'}`}>
                      {stats?.worstMargin !== null && stats?.worstMargin !== undefined 
                        ? `${stats.worstMargin > 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${unit}` 
                        : '--'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="cad-prop-key">Observed Span</td>
                  <td className="cad-prop-val font-mono">
                    {stats?.min !== null && stats?.peak !== null && stats?.min !== undefined && stats?.peak !== undefined 
                      ? `${(stats.peak - stats.min).toFixed(2)} ${unit}` 
                      : '--'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Single-Channel 10-Stage Dwell Check Table */}
      <div className="cad-table-container-card" style={{ margin: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 className="cad-card-subtitle" style={{ margin: 0 }}>
              10-Stage Dwell Check Table & Tolerance Limit Ledger ({selectedSensor})
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Step-by-step dwell values, excitation setpoints, statistical boundaries, Z-scores, and margin deltas
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            [Evaluating Rows 5 to 32 | Tolerance: μ ± 3.00σ]
          </div>
        </div>

        <div className="datasheet-table-wrapper">
          <table className="datasheet-table">
            <thead>
              <tr>
                <th>Time (Stage)</th>
                <th>Flow SP</th>
                <th>DP SP</th>
                <th>Measured Value</th>
                <th>Lower 3σ (μ - 3σ)</th>
                <th>Process Mean (μ)</th>
                <th>Upper 3σ (μ + 3σ)</th>
                <th>Process Sigma (σ)</th>
                <th>Sigma Dev (Z)</th>
                <th>Margin Buffer</th>
                <th>3σ Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sensorEvaluations.map((pt, idx) => {
                const isPtFail = pt.status === 'fail';
                const isPtWarn = pt.status === 'warn';

                return (
                  <tr 
                    key={`${pt.timeSec}-${idx}`} 
                    className={isPtFail ? 'row-failed' : (isPtWarn ? 'row-warn' : '')}
                  >
                    <td className="time-col font-mono">
                      <span>{pt.timeSec}s</span>
                      <span className="stage-num-tag">Stage {Math.min(10, Math.floor(idx / 3) + 1)}</span>
                    </td>
                    <td className="sp-col font-mono">{pt.flowSp !== null ? `${pt.flowSp} ${flowSpUnit}` : '-'}</td>
                    <td className="sp-col font-mono">{pt.dpSp !== null ? `${pt.dpSp} ${dpSpUnit}` : '-'}</td>
                    <td className="val-col font-mono font-bold">
                      {typeof pt.measured === 'number' ? pt.measured.toFixed(2) : (pt.measured ?? '-')} {pt.unit}
                    </td>
                    <td className="limit-col font-mono">
                      {typeof pt.lowLimit === 'number' ? `${pt.lowLimit.toFixed(2)} ${pt.unit}` : (pt.lowLimit ?? '-')}
                    </td>
                    <td className="mean-col font-mono">
                      {typeof pt.nominalMean === 'number' ? `${pt.nominalMean.toFixed(2)} ${pt.unit}` : '-'}
                    </td>
                    <td className="limit-col font-mono">
                      {typeof pt.highLimit === 'number' ? `${pt.highLimit.toFixed(2)} ${pt.unit}` : (pt.highLimit ?? '-')}
                    </td>
                    <td className="sigma-col font-mono text-xs">
                      {typeof pt.processSigma === 'number' ? (
                        <span>
                          {pt.processSigma.toFixed(3)} <span className="text-slate-400 font-normal">(±{pt.threeSigmaSpan?.toFixed(2)})</span>
                        </span>
                      ) : '-'}
                    </td>
                    <td className="z-col font-mono">
                      {typeof pt.zScore === 'number' ? (
                        <span className={`z-score-pill ${Math.abs(pt.zScore) > 3.0 ? 'fail' : (Math.abs(pt.zScore) > 2.5 ? 'warn' : 'pass')}`}>
                          {pt.zScore > 0 ? '+' : ''}{pt.zScore.toFixed(2)}σ
                        </span>
                      ) : '-'}
                    </td>
                    <td className="margin-col font-mono">
                      {pt.marginBuffer !== null ? (
                        <span className={pt.marginBuffer < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {pt.marginBuffer >= 0 ? '+' : ''}{pt.marginBuffer.toFixed(2)} {pt.unit}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="status-col">
                      <span className={`status-pill-small ${pt.status}`}>
                        {isPtFail ? 'FAIL (>3σ)' : (isPtWarn ? 'WARN' : 'PASS (≤3σ)')}
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

import React from 'react';
import { OperatingStage, SubsystemCategory, ParameterSummary } from '../types';
import { CheckCircle2, AlertTriangle } from './Icons';

interface StageCardsProps {
  stages: OperatingStage[];
  onSelectSensor: (sensorName: string) => void;
  selectedSubsystem?: SubsystemCategory | null;
  subsystemChannels?: { name: string; stat: ParameterSummary }[];
  measurements?: Record<string, any>[];
  flowSpUnit?: string;
  dpSpUnit?: string;
  tempSpUnit?: string;
}

export const StageCards: React.FC<StageCardsProps> = ({
  stages,
  onSelectSensor,
  selectedSubsystem = null,
  subsystemChannels = [],
  measurements = [],
  flowSpUnit = 'LPM',
  dpSpUnit = 'psi',
  tempSpUnit = '°C'
}) => {
  return (
    <div className="stages-cards-wrapper">
      <div className="stages-grid-compact">
        {stages.map(s => {
          const isSubsystemActive = !!selectedSubsystem && subsystemChannels.length > 0;
          const mRow = measurements.find(m => m['Time'] === s.timeSec);

          // Get pump command if available from P31 or P41 Speed %
          const pumpVal = mRow ? (mRow['P31 Speed %'] ?? mRow['P41 Speed %']) : null;
          const pumpStr = typeof pumpVal === 'number' ? `${Math.round(pumpVal)}%` : null;

          // Failing sensors scoped to active subsystem (or all if whole unit)
          const scopedFailedSensors = isSubsystemActive
            ? s.failedSensors.filter(sens => subsystemChannels.some(ch => ch.name === sens))
            : s.failedSensors;

          const isScopedPass = scopedFailedSensors.length === 0;

          return (
            <div 
              key={`stage-${s.stageNum}`} 
              className={`stage-card-compact ${isScopedPass ? 'pass' : 'fail'}`}
            >
              <div className="stage-card-header">
                <span className="stage-num-title">Stage {s.stageNum} ({s.timeSec}s)</span>
                <span className={`status-badge-mini ${isScopedPass ? 'pass' : 'fail'}`}>
                  {isScopedPass ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  <span>{isScopedPass ? 'PASS' : `${scopedFailedSensors.length} FAIL`}</span>
                </span>
              </div>

              {/* Setpoints & Operating Conditions */}
              <div className="stage-sp-info">
                <div className="stage-sp-line">
                  <span className="sp-item" title="Secondary Flow Setpoint">
                    <span className="sp-k">Flow:</span> <strong className="sp-v text-cyan-400">{s.flowSp !== null ? `${s.flowSp} ${flowSpUnit}` : '--'}</strong>
                  </span>
                  <span className="sp-item" title="Secondary DP Setpoint">
                    <span className="sp-k">DP:</span> <strong className="sp-v text-emerald-400">{s.dpSp !== null ? `${s.dpSp} ${dpSpUnit}` : '--'}</strong>
                  </span>
                </div>
                <div className="stage-sp-line">
                  <span className="sp-item" title="Secondary Temperature Setpoint">
                    <span className="sp-k">Temp:</span> <strong className="sp-v text-amber-300">{s.tempSp !== null ? `${s.tempSp} ${tempSpUnit}` : '--'}</strong>
                  </span>
                  {pumpStr && (
                    <span className="sp-item" title="Circulation Pump Command">
                      <span className="sp-k">Pump:</span> <strong className="sp-v text-purple-300">{pumpStr}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Subsystem specific telemetry snapshot if isolated */}
              {isSubsystemActive && (
                <div className="stage-subsystem-snapshot">
                  {subsystemChannels.slice(0, 3).map(({ name, stat }) => {
                    const val = mRow ? mRow[name] : null;
                    const isFailed = s.failedSensors.includes(name);
                    const valStr = typeof val === 'number' ? val.toFixed(1) : (val !== null && val !== undefined ? String(val) : '--');
                    return (
                      <span
                        key={name}
                        className={`snapshot-channel ${isFailed ? 'failed' : ''}`}
                        title={`${name}: ${valStr} ${stat.unit}${isFailed ? ' (3σ Excursion)' : ''}`}
                      >
                        <span className="snap-name">{name}:</span>{' '}
                        <strong className="snap-val">{valStr}</strong>
                      </span>
                    );
                  })}
                  {subsystemChannels.length > 3 && (
                    <span className="snapshot-more">+{subsystemChannels.length - 3}</span>
                  )}
                </div>
              )}

              {/* Failing sensor clickable jump pills */}
              {scopedFailedSensors.length > 0 && (
                <div className="failed-sensors-pills">
                  {scopedFailedSensors.map(sens => (
                    <button 
                      key={sens} 
                      type="button"
                      className="fail-sensor-tag"
                      onClick={() => onSelectSensor(sens)}
                      title={`Click to inspect 3σ waveform and excursions for ${sens}`}
                    >
                      <AlertTriangle size={9} />
                      <span>{sens}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { EagleEyeDataset, ParameterSummary, SubsystemCategory, SUBSYSTEM_LABELS } from '../../types';
import {
  Sliders,
  X,
  Info
} from '../Icons';
import { CadInspectorStandby } from './CadInspectorStandby';
import { CadRegisterBadge } from './CadRegisterBadge';
import { getRegisterByName } from '../../engine/registers';
import { CduModelId } from '../../engine/models/modelTypes';
import { getModelProfile } from '../../engine/models/modelRegistry';

interface CadParameterInspectorProps {
  dataset: EagleEyeDataset | null;
  selectedSensor: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  activeModelId?: CduModelId;
  onClose: () => void;
  onSelectSensor: (sensorName: string | null) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
}

export const CadParameterInspector: React.FC<CadParameterInspectorProps> = ({
  dataset,
  selectedSensor,
  selectedSubsystem,
  activeModelId = 'CHx2000',
  onClose,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const modelProfile = getModelProfile(activeModelId);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    spc: true,
    telemetry: true,
    modbus: true,
    diagnostic: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const summary: ParameterSummary | undefined = (dataset && selectedSensor)
    ? dataset.parameterStats[selectedSensor]
    : undefined;

  const isFailed = summary ? summary.failCount > 0 : false;

  return (
    <aside className="cad-dock-panel cad-parameter-inspector-dock" aria-label="Parameter Inspector">
      {/* Inspector Dock Header */}
      <div className="cad-dock-header">
        <div className="cad-dock-title">
          <Sliders size={14} className="cad-dock-icon" />
          <span>Parameter Inspector</span>
        </div>
        <div className="cad-dock-actions">
          <span className="cad-dock-pill-docked">Docked</span>
          <button
            className="cad-dock-btn cad-dock-btn-close"
            title="Close Inspector (Ctrl+2)"
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Inspector Scroll Body */}
      <div className="cad-inspector-scroll-body">
        {!dataset ? (
          <CadInspectorStandby />
        ) : selectedSensor && summary ? (
          /* Parameter Details Property Grid */
          <div className="cad-property-grid">
            {/* Selected Parameter Header Card */}
            <div className={`cad-inspector-target-card ${isFailed ? 'failed' : 'passed'}`}>
              <div className="cad-target-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CadRegisterBadge channelName={selectedSensor} showPrefix style={{ fontSize: '10.5px' }} />
                  <span className="cad-target-param-tag">{selectedSensor}</span>
                </div>
                <span className={`cad-target-verdict-badge ${isFailed ? 'fail' : 'pass'}`}>
                  {isFailed ? `${summary.failCount} FAIL` : 'PASS'}
                </span>
              </div>
              <div className="cad-target-card-sub">
                <span>Unit: <strong>{summary.unit}</strong></span>
                <span>Category: <strong>{summary.category}</strong></span>
              </div>
            </div>

            {/* SECTION 1: IDENTITY */}
            <div className="cad-prop-group">
              <div
                className="cad-prop-group-header"
                onClick={() => toggleSection('identity')}
              >
                <span className="cad-prop-chevron">{expandedSections.identity ? '▾' : '▸'}</span>
                <span className="cad-prop-group-title">Channel Identity</span>
              </div>
              {expandedSections.identity && (
                <table className="cad-prop-table">
                  <tbody>
                    <tr>
                      <td className="cad-prop-key">Tag Name</td>
                      <td className="cad-prop-val font-mono">{selectedSensor}</td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Modbus Address</td>
                      <td className="cad-prop-val font-mono">
                        {(() => {
                          const reg = getRegisterByName(selectedSensor);
                          return reg ? (
                            <span className="cad-reg-badge" style={{ padding: '1px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '3px', color: '#C084FC' }}>
                              Reg {reg.address} (0x{reg.address.toString(16).toUpperCase().padStart(4, '0')})
                            </span>
                          ) : '--';
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Subsystem</td>
                      <td className="cad-prop-val">{summary.category.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Engineering Unit</td>
                      <td className="cad-prop-val font-mono font-bold text-cyan">{summary.unit}</td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Required Envelope</td>
                      <td className="cad-prop-val font-mono">{summary.requiredRangeSample || '±3σ Dynamic'}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 2: STATISTICAL PROCESS CONTROL (3-SIGMA) */}
            <div className="cad-prop-group">
              <div
                className="cad-prop-group-header"
                onClick={() => toggleSection('spc')}
              >
                <span className="cad-prop-chevron">{expandedSections.spc ? '▾' : '▸'}</span>
                <span className="cad-prop-group-title">Statistical SPC 3-Sigma</span>
              </div>
              {expandedSections.spc && (
                <table className="cad-prop-table">
                  <tbody>
                    <tr>
                      <td className="cad-prop-key">Process Mean (μ)</td>
                      <td className="cad-prop-val font-mono">
                        {summary.nominalMean !== null ? `${summary.nominalMean.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Process Sigma (σ)</td>
                      <td className="cad-prop-val font-mono">
                        {summary.processSigma !== null ? `${summary.processSigma.toFixed(3)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Lower 3σ (μ - 3σ)</td>
                      <td className="cad-prop-val font-mono text-cyan">
                        {summary.low3Sigma !== null ? `${summary.low3Sigma.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Upper 3σ (μ + 3σ)</td>
                      <td className="cad-prop-val font-mono text-cyan">
                        {summary.high3Sigma !== null ? `${summary.high3Sigma.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">3σ Half-Span (3σ)</td>
                      <td className="cad-prop-val font-mono">
                        {summary.threeSigmaSpan !== null ? `±${summary.threeSigmaSpan.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Max |Z| Deviation</td>
                      <td className="cad-prop-val font-mono">
                        <span className={`cad-z-badge ${summary.maxZScore && summary.maxZScore > 3.0 ? 'z-breach' : 'z-ok'}`}>
                          {summary.maxZScore !== null ? `${summary.maxZScore.toFixed(2)} σ` : '--'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 3: MEASURED TELEMETRY */}
            <div className="cad-prop-group">
              <div
                className="cad-prop-group-header"
                onClick={() => toggleSection('telemetry')}
              >
                <span className="cad-prop-chevron">{expandedSections.telemetry ? '▾' : '▸'}</span>
                <span className="cad-prop-group-title">Measured Telemetry</span>
              </div>
              {expandedSections.telemetry && (
                <table className="cad-prop-table">
                  <tbody>
                    <tr>
                      <td className="cad-prop-key">Settling (at 525s)</td>
                      <td className="cad-prop-val font-mono font-bold text-green">
                        {summary.settling !== null ? `${summary.settling.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Peak (Maximum)</td>
                      <td className="cad-prop-val font-mono text-blue">
                        {summary.peak !== null ? `${summary.peak.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Minimum (Min)</td>
                      <td className="cad-prop-val font-mono text-sky">
                        {summary.min !== null ? `${summary.min.toFixed(2)} ${summary.unit}` : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Worst Margin Buffer</td>
                      <td className="cad-prop-val font-mono">
                        <span className={`cad-margin-pill ${summary.worstMargin !== null && summary.worstMargin < 0 ? 'margin-deficit' : 'margin-healthy'}`}>
                          {summary.worstMargin !== null ? `${summary.worstMargin > 0 ? '+' : ''}${summary.worstMargin.toFixed(2)} ${summary.unit}` : '--'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Evaluated Steps</td>
                      <td className="cad-prop-val font-mono">{summary.totalChecks} stages</td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Violations</td>
                      <td className="cad-prop-val font-mono font-bold">
                        <span className={summary.failCount > 0 ? 'text-red' : 'text-green'}>
                          {summary.failCount} of {summary.totalChecks} ({((summary.failCount / summary.totalChecks) * 100).toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 4: MODBUS & HARDWARE SIGNALS */}
            <div className="cad-prop-group">
              <div
                className="cad-prop-group-header"
                onClick={() => toggleSection('modbus')}
              >
                <span className="cad-prop-chevron">{expandedSections.modbus ? '▾' : '▸'}</span>
                <span className="cad-prop-group-title">Modbus & Signal Conditioning</span>
              </div>
              {expandedSections.modbus && (
                <table className="cad-prop-table">
                  <tbody>
                    <tr>
                      <td className="cad-prop-key">Modbus Address</td>
                      <td className="cad-prop-val font-mono">
                        {(() => {
                          const reg = getRegisterByName(selectedSensor);
                          return reg ? `Reg ${reg.address} (PLC Bus 502)` : 'Modbus TCP : 502';
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Register Scaling</td>
                      <td className="cad-prop-val font-mono">
                        {(() => {
                          const reg = getRegisterByName(selectedSensor);
                          return reg ? (reg.scaling === 1 ? '1.0× (Raw/Unscaled)' : reg.scaling === 100 ? '0.01× (100 Divisor)' : `0.1× (${reg.scaling} Divisor)`) : '1.0×';
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">0–10V Scaling</td>
                      <td className="cad-prop-val">
                        {summary.category === 'pump' || selectedSensor.includes('FCV') ? (
                          <span className="cad-active-tag">10× Normalized (0–100%)</span>
                        ) : (
                          <span className="cad-dim-tag">Standard Physical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Word Representation</td>
                      <td className="cad-prop-val">
                        {(() => {
                          const reg = getRegisterByName(selectedSensor);
                          if (reg?.isSigned || selectedSensor.includes('DP')) {
                            return <span className="cad-active-tag">Signed 16-Bit (Two's Comp)</span>;
                          }
                          return <span className="cad-dim-tag">Unsigned 16-Bit Word</span>;
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="cad-prop-key">Sentinel Check</td>
                      <td className="cad-prop-val font-mono">
                        {summary.peak === 6553.5 ? (
                          <span className="text-red font-bold">0xFFFF Disconnect</span>
                        ) : (
                          <span className="text-green">Clean (No 0xFFFF)</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* SECTION 5: DIAGNOSTIC ROOT CAUSE */}
            {isFailed && (
              <div className="cad-prop-group">
                <div
                  className="cad-prop-group-header"
                  onClick={() => toggleSection('diagnostic')}
                >
                  <span className="cad-prop-chevron">{expandedSections.diagnostic ? '▾' : '▸'}</span>
                  <span className="cad-prop-group-title text-red">Diagnostic Action</span>
                </div>
                {expandedSections.diagnostic && (
                  <div className="cad-prop-diagnostic-content">
                    <p className="cad-diag-instruction">
                      {summary.category === 'hydraulic' && 'Hydraulic differential pressure breach. Inspect bypass valve FCV61 calibration and verify flow loop balance.'}
                      {summary.category === 'environmental' && 'Ambient test bay condition discrepancy (relative humidity/temperature). Non-mechanical environmental factor.'}
                      {summary.category === 'system' && 'Firmware build or discrete status discrepancy. Verify PLC program configuration.'}
                      {summary.category === 'pressure' && 'Transmitter impulse line or vacuum condition. Verify transducer wiring and manifold valves.'}
                      {summary.category === 'temperature' && 'RTD transmitter temperature delta out of tolerance band.'}
                      {summary.category === 'pump' && 'Pump speed command to feedback speed delta exceeds process capability.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedSubsystem && dataset ? (
          /* Subsystem-Level Properties when a subsystem is selected */
          <div className="cad-property-grid">
            {(() => {
              const subMeta = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;
              const subChannels = Object.entries(dataset.parameterStats).filter(([_, s]) => s.category === selectedSubsystem);
              const subFailures = dataset.failures.filter(f => f.category === selectedSubsystem);
              const subTotalChecks = subChannels.length * dataset.stages.length;
              const subFailCount = subFailures.length;
              const subPassCount = subTotalChecks - subFailCount;
              const subPassRate = subTotalChecks > 0 ? ((subPassCount / subTotalChecks) * 100).toFixed(1) : '100.0';
              const hasFail = subFailCount > 0;

              return (
                <>
                  <div className={`cad-inspector-target-card ${hasFail ? 'failed' : 'passed'}`}>
                    <div className="cad-target-card-top">
                      <span className="cad-target-param-tag">
                        {subMeta.toUpperCase()}
                      </span>
                      <span className={`cad-target-verdict-badge ${hasFail ? 'fail' : 'pass'}`}>
                        {hasFail ? `${subFailCount} FAIL` : 'PASS'}
                      </span>
                    </div>
                    <div className="cad-target-card-sub">
                      <span>Channels: <strong>{subChannels.length} Active</strong></span>
                      <span>Yield: <strong>{subPassRate}%</strong></span>
                    </div>
                  </div>

                  {/* Section 1: Subsystem Performance */}
                  <div className="cad-prop-group">
                    <div
                      className="cad-prop-group-header"
                      onClick={() => toggleSection('subsystem_perf')}
                    >
                      <span className="cad-prop-chevron">{expandedSections.subsystem_perf !== false ? '▾' : '▸'}</span>
                      <span className="cad-prop-group-title">Subsystem Performance Metrics</span>
                    </div>
                    {expandedSections.subsystem_perf !== false && (
                      <table className="cad-prop-table">
                        <tbody>
                          <tr>
                            <td className="cad-prop-key">Subsystem</td>
                            <td className="cad-prop-val font-bold text-cyan">{subMeta}</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Total Channels</td>
                            <td className="cad-prop-val font-mono">{subChannels.length} test channels</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Checks Evaluated</td>
                            <td className="cad-prop-val font-mono">{subTotalChecks} checks ({subChannels.length} × {dataset.stages.length})</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Passed Checks</td>
                            <td className="cad-prop-val font-mono text-green">{subPassCount} ({subPassRate}%)</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Out of Tolerance</td>
                            <td className="cad-prop-val font-mono text-red">{subFailCount} violations</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Primary Transducer</td>
                            <td className="cad-prop-val font-mono">{subChannels[0]?.[0] || 'None'}</td>
                          </tr>
                          <tr>
                            <td className="cad-prop-key">Active Filter Scope</td>
                            <td className="cad-prop-val font-mono text-cyan">Isolated Subsystem</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 2: Channel Directory */}
                  <div className="cad-prop-group">
                    <div
                      className="cad-prop-group-header"
                      onClick={() => toggleSection('subsystem_channels')}
                    >
                      <span className="cad-prop-chevron">{expandedSections.subsystem_channels !== false ? '▾' : '▸'}</span>
                      <span className="cad-prop-group-title">Subsystem Channels ({subChannels.length})</span>
                    </div>
                    {expandedSections.subsystem_channels !== false && (
                      <div className="cad-inspector-channel-list" style={{ padding: '6px 8px' }}>
                        {subChannels.map(([name, s]) => {
                          const chFailed = s.failCount > 0;
                          return (
                            <div
                              key={name}
                              onClick={() => onSelectSensor(name)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 6px',
                                marginBottom: '3px',
                                borderRadius: '4px',
                                background: chFailed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                                border: `1px solid ${chFailed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                              title={`Click to inspect channel ${name}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: chFailed ? '#ef4444' : '#10b981', flexShrink: 0 }}></span>
                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span className="font-mono text-dim" style={{ fontSize: '10px' }}>{s.settling !== null ? `${s.settling.toFixed(1)} ${s.unit}` : '--'}</span>
                                <span className={`cad-tab-badge-count ${chFailed ? 'fail' : 'pass'}`} style={{ fontSize: '8.5px', padding: '0 4px' }}>
                                  {chFailed ? `${s.failCount} FAIL` : 'PASS'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Diagnostic & Shopfloor Directive */}
                  <div className="cad-prop-group">
                    <div
                      className="cad-prop-group-header"
                      onClick={() => toggleSection('subsystem_diag')}
                    >
                      <span className="cad-prop-chevron">{expandedSections.subsystem_diag !== false ? '▾' : '▸'}</span>
                      <span className="cad-prop-group-title">Shopfloor Directive</span>
                    </div>
                    {expandedSections.subsystem_diag !== false && (
                      <div style={{ padding: '8px 12px', fontSize: '11px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        {selectedSubsystem === 'hydraulic' && (
                          <span>Verify primary/secondary filter differential pressures, inspect loop restriction, and check modulating bypass valve FCV61 calibration.</span>
                        )}
                        {selectedSubsystem === 'pump' && (
                          <span>Inspect inverter drive parameters, speed feedback signal, and motor 3-phase wiring.</span>
                        )}
                        {selectedSubsystem === 'temperature' && (
                          <span>Inspect cooling loop RTD probes, thermowell seating, and heat exchanger bypass loop.</span>
                        )}
                        {selectedSubsystem === 'pressure' && (
                          <span>Purge impulse sensing tubing, inspect transducer 4-20mA/0-10V harness, and check zero calibration.</span>
                        )}
                        {selectedSubsystem === 'environmental' && (
                          <span>Environmental test bay factor. Non-mechanical. Verify cleanroom test bay ambient HVAC humidity controls.</span>
                        )}
                        {selectedSubsystem === 'system' && (
                          <span>Verify PLC configuration, controller firmware revision, and discrete digital I/O states.</span>
                        )}
                        {!['hydraulic', 'pump', 'temperature', 'pressure', 'environmental', 'system'].includes(selectedSubsystem) && (
                          <span>Perform standard calibration checks on subsystem sensors and wiring.</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="cad-inspector-hint-box">
                    <Info size={14} className="text-cyan flex-shrink-0" />
                    <span>Viewing only <strong>{subMeta}</strong>. Click <strong>Unit: {dataset.metadata.serialNumber}</strong> in the left window to view the whole system.</span>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          /* Unit-Level Properties when no sensor is selected */
          <div className="cad-property-grid">
            <div className="cad-inspector-target-card passed">
              <div className="cad-target-card-top">
                <span className="cad-target-param-tag">
                  {dataset.metadata.serialNumber || 'UNIT OVERVIEW'}
                </span>
                <span className={`cad-target-verdict-badge ${dataset.metadata.finalResult === 'Pass' ? 'pass' : 'fail'}`}>
                  {dataset.metadata.finalResult}
                </span>
              </div>
              <div className="cad-target-card-sub">
                <span>WO: <strong>{dataset.metadata.workOrderNumber}</strong></span>
                <span>Pass Rate: <strong>{dataset.passRate}%</strong></span>
              </div>
            </div>

            <div className="cad-prop-group">
              <div className="cad-prop-group-header">
                <span className="cad-prop-chevron">▾</span>
                <span className="cad-prop-group-title">Unit Test Run Properties</span>
              </div>
              <table className="cad-prop-table">
                <tbody>
                  <tr>
                    <td className="cad-prop-key">Serial Number</td>
                    <td className="cad-prop-val font-mono font-bold text-cyan">{dataset.metadata.serialNumber}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">CDU Architecture</td>
                    <td className="cad-prop-val font-mono font-bold text-cyan">
                      {modelProfile.shortName} ({modelProfile.series === 'air-to-liquid' ? 'Air-Cooled' : 'Liquid-to-Liquid'})
                    </td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Cooling Capacity</td>
                    <td className="cad-prop-val font-mono">{modelProfile.nominalCapacityKw} kW Nominal</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Work Order</td>
                    <td className="cad-prop-val font-mono">{dataset.metadata.workOrderNumber}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Software Version</td>
                    <td className="cad-prop-val font-mono">{dataset.metadata.softwareVersion}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Framework Build</td>
                    <td className="cad-prop-val font-mono">{dataset.metadata.frameworkBuildVersion}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Tested By</td>
                    <td className="cad-prop-val">{dataset.metadata.testedBy}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Date Tested</td>
                    <td className="cad-prop-val font-mono">{dataset.metadata.dateTested}</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Total Evaluated</td>
                    <td className="cad-prop-val font-mono">{dataset.totalEvaluated} data points</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Passed Checks</td>
                    <td className="cad-prop-val font-mono text-green">{dataset.passedCount} ({dataset.passRate}%)</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Failed Checks</td>
                    <td className="cad-prop-val font-mono text-red">{dataset.failedCount} violations</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Active Channels</td>
                    <td className="cad-prop-val font-mono">{Object.keys(dataset.parameterStats).length} channels</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Operating Stages</td>
                    <td className="cad-prop-val font-mono">10 stages (15s – 525s)</td>
                  </tr>
                  <tr>
                    <td className="cad-prop-key">Decision Model</td>
                    <td className="cad-prop-val">Statistical Process Control (±3σ)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="cad-inspector-hint-box">
              <Info size={14} className="text-cyan" />
              <span>Select any channel from the left <strong>Workspace Tree</strong> to inspect its statistical 3σ parameters, peak/settling values, and Modbus registers.</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { X, BarChart2, Copy, Check, Activity, Search } from '../../Icons';
import { getFriendlyChannelName } from '../../../engine/registers';
import { CadAdvancedMetricsModalProps, MetrologyStageRow } from './advancedMetricsTypes';
import { buildMetrologyStageRows, generateMetrologyTsv } from './metrologyCalc';
import { MetrologyMetricCards } from './MetrologyMetricCards';
import { MetrologyLedgerTable } from './MetrologyLedgerTable';

export const CadAdvancedMetricsModal: React.FC<CadAdvancedMetricsModalProps> = ({
  isOpen,
  onClose,
  initialSensor,
  dataset,
  onSelectSensor,
  highlightStageNum,
}) => {
  const [selectedSensor, setSelectedSensor] = useState<string>(initialSensor || '');
  const [channelSearch, setChannelSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialSensor) {
      setSelectedSensor(initialSensor);
    }
  }, [initialSensor]);

  const {
    headers,
    parameterStats,
    stages,
    unitMap,
    measurements,
    evaluatedChecks,
    metadata,
  } = dataset;

  const allChannels = useMemo(() => headers.slice(1), [headers]);
  const activeSensor = selectedSensor || allChannels[0] || '';
  const stats = parameterStats[activeSensor];
  const unit = stats?.unit || unitMap[activeSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subLabel = SUBSYSTEM_LABELS[category] || category;
  const friendlyName = getFriendlyChannelName(activeSensor);

  const sensorEvaluations = useMemo(
    () => evaluatedChecks.filter((c) => c.parameter === activeSensor),
    [evaluatedChecks, activeSensor]
  );

  const failures = useMemo(
    () => sensorEvaluations.filter((c) => c.status === 'fail'),
    [sensorEvaluations]
  );
  const hasFail = failures.length > 0;

  const meanValue = useMemo(() => {
    const validVals = measurements
      .map((m) => m[activeSensor])
      .filter((v): v is number => typeof v === 'number');
    if (validVals.length === 0) return null;
    return validVals.reduce((a, b) => a + b, 0) / validVals.length;
  }, [measurements, activeSensor]);

  const nominalMean = stats?.nominalMean ?? meanValue;
  const processSigma = stats?.processSigma;
  const low3Sigma = stats?.low3Sigma;
  const high3Sigma = stats?.high3Sigma;
  const threeSigmaSpan = stats?.threeSigmaSpan;

  const stageRows: MetrologyStageRow[] = useMemo(() => {
    return buildMetrologyStageRows(
      stages,
      measurements,
      sensorEvaluations,
      activeSensor,
      unit,
      low3Sigma,
      nominalMean,
      high3Sigma,
      processSigma
    );
  }, [stages, measurements, sensorEvaluations, activeSensor, unit, low3Sigma, nominalMean, high3Sigma, processSigma]);

  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) return allChannels;
    const q = channelSearch.toLowerCase();
    return allChannels.filter(
      (c) => c.toLowerCase().includes(q) || getFriendlyChannelName(c).toLowerCase().includes(q)
    );
  }, [allChannels, channelSearch]);

  const handleCopyToClipboard = () => {
    const tsv = generateMetrologyTsv(
      friendlyName,
      activeSensor,
      unit,
      subLabel,
      metadata,
      nominalMean,
      processSigma,
      threeSigmaSpan,
      stageRows
    );

    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="cad-modal-backdrop" onClick={onClose} style={{ padding: '12px' }}>
      <div
        className="cad-modal-dialog cad-modal-fullscreen"
        style={{
          width: '98vw',
          maxWidth: 'calc(100vw - 28px)',
          height: '93vh',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cad-modal-header" style={{ flexShrink: 0 }}>
          <div className="cad-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--accent-cyan)' }}>
              <BarChart2 size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>
                  Advanced Statistical Metrology & SPC Tolerance Engine
                </span>
                <span className="cad-badge-unit" style={{ padding: '1px 6px', fontSize: '10px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '3px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  ANSI/ISA-101 SPC
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                11-Column Metrology Matrix: μ, σ, ±3σ Dual Envelopes, Z-Scores & Parametric Buffers
              </div>
            </div>
          </div>
          <button className="cad-modal-close" onClick={onClose} aria-label="Close Metrology Modal">
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '10px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Inspect Channel:
            </span>
            <select
              value={activeSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{ padding: '5px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600, borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', minWidth: '260px' }}
            >
              {filteredChannels.map((ch) => {
                const fn = getFriendlyChannelName(ch);
                const isChFail = parameterStats[ch]?.failCount > 0;
                return (
                  <option key={ch} value={ch}>
                    {fn !== ch ? `${fn} [${ch}]` : ch} {isChFail ? '⚠️ (Violations)' : '✓ (Pass)'}
                  </option>
                );
              })}
            </select>
            <span className={`cad-stage-badge ${hasFail ? 'fail' : 'pass'}`} style={{ fontSize: '10px' }}>
              {hasFail ? `${failures.length} VIOLATIONS` : '100% IN-TOLERANCE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Filter channels..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                style={{ padding: '4px 8px 4px 26px', fontSize: '11px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: '150px' }}
              />
            </div>
            <button type="button" className="cad-details-btn" onClick={handleCopyToClipboard} title="Copy entire 11-column SPC data table to clipboard (TSV format)">
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy SPC Table'}</span>
            </button>
          </div>
        </div>

        <div className="cad-modal-body" style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{friendlyName}</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', background: 'rgba(2, 132, 199, 0.08)', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>
                  Tag: {activeSensor}
                </span>
                <span className="cad-badge-unit" style={{ padding: '1px 6px', fontSize: '10px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.3)', borderRadius: '3px', color: 'var(--success)' }}>
                  {unit || '--'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px', display: 'inline-block' }}>
                Subsystem Domain: <strong>{subLabel}</strong> | Hardware Serial: <strong>{metadata.serialNumber || 'N/A'}</strong> | WO: <strong>{metadata.workOrderNumber || 'N/A'}</strong>
              </span>
            </div>
            <div className="spc-rule-badge" style={{ fontSize: '11px' }}>
              <span className="spc-icon">3σ</span>
              <span>Dual Envelope: μ ± 3.00σ</span>
            </div>
          </div>

          <MetrologyMetricCards
            stats={stats}
            unit={unit}
            nominalMean={nominalMean}
            processSigma={processSigma}
            low3Sigma={low3Sigma}
            high3Sigma={high3Sigma}
            threeSigmaSpan={threeSigmaSpan}
          />

          <MetrologyLedgerTable stageRows={stageRows} unit={unit} highlightStageNum={highlightStageNum} />
        </div>

        <div className="cad-modal-footer" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {onSelectSensor && (
              <button
                type="button"
                className="cad-btn-secondary"
                onClick={() => {
                  onSelectSensor(activeSensor);
                  onClose();
                }}
                style={{ padding: '6px 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '4px', cursor: 'pointer' }}
              >
                <Activity size={13} />
                <span>Open in Telemetry Oscilloscope</span>
              </button>
            )}
          </div>
          <button className="cad-btn-primary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '11.5px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

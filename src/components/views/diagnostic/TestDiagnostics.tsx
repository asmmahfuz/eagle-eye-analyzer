import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { runCanonicalDiagnostics, getFaultsForSensor } from '../../../engine/diagnostics/diagnosticsEngine';
import { CanonicalFaultsSection } from './CanonicalFaultsSection';
import { ChronologicalBreachTable } from './ChronologicalBreachTable';
import { QaSignoffCard, QaItem } from './QaSignoffCard';
import { 
  getExcursionDeficitInfo, 
  getSubsystemRootCauseAction, 
  getChannelCorrectiveSteps 
} from '../common/diagnosticUtils';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  ArrowLeft,
  Wrench,
  ShieldAlert
} from '../../Icons';

export interface TestDiagnosticsProps {
  dataset: EagleEyeDataset;
  selectedSensor: string;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onBackToOverview?: () => void;
  onSelectSensor?: (sensorName: string) => void;
}

const TEST_QA_ITEMS: QaItem[] = [
  { id: 'wiring_connection', label: 'Transducer terminal wiring & shield grounding inspected' },
  { id: 'zero_calibration', label: 'Atmospheric zero and span calibration verified against reference' },
  { id: 'operating_reproduction', label: 'Operating excursion reproduced and retested under steady-state conditions' },
  { id: 'channel_signoff', label: 'Transducer QA traveler verified and approved by test technician' }
];

export const TestDiagnostics: React.FC<TestDiagnosticsProps> = ({
  dataset,
  selectedSensor,
  onSelectSubsystem,
  onBackToOverview,
  onSelectSensor
}) => {
  const [qaChecklist, setQaChecklist] = useState<Record<string, boolean>>({
    wiring_connection: false,
    zero_calibration: false,
    operating_reproduction: false,
    channel_signoff: false
  });
  const [qaLeadSigned, setQaLeadSigned] = useState(false);

  const {
    metadata,
    evaluatedChecks,
    parameterStats,
    stages,
    unitMap
  } = dataset;

  const stats = parameterStats[selectedSensor];
  const unit = stats?.unit || unitMap[selectedSensor] || '';
  const category: SubsystemCategory = stats?.category || 'other';
  const subName = SUBSYSTEM_LABELS[category] || category;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';

  // Run authoritative canonical 20-fault diagnostics
  const allCanonicalFaults = useMemo(() => {
    return runCanonicalDiagnostics(dataset);
  }, [dataset]);

  const sensorFaults = useMemo(() => {
    return getFaultsForSensor(allCanonicalFaults, selectedSensor);
  }, [allCanonicalFaults, selectedSensor]);

  // Evaluated points strictly for this channel
  const sensorEvaluations = useMemo(() => {
    return evaluatedChecks.filter(c => c.parameter === selectedSensor);
  }, [evaluatedChecks, selectedSensor]);

  const failures = useMemo(() => {
    return sensorEvaluations.filter(c => c.status === 'fail');
  }, [sensorEvaluations]);

  const hasFail = failures.length > 0;
  const passCount = sensorEvaluations.length - failures.length;
  const passRate = sensorEvaluations.length > 0 
    ? Number(((passCount / sensorEvaluations.length) * 100).toFixed(1)) 
    : 100;

  const rootCause = useMemo(() => {
    return getSubsystemRootCauseAction(category, selectedSensor, metadata.softwareVersion);
  }, [category, selectedSensor, metadata.softwareVersion]);

  const correctiveSteps = useMemo(() => {
    return getChannelCorrectiveSteps(category, selectedSensor, stats);
  }, [category, selectedSensor, stats]);

  const firstFail = failures[0];
  const firstFailStage = firstFail && firstFail.mIdx !== undefined
    ? Math.min(stages.length, Math.floor((firstFail.mIdx - 2) / 3) + 1)
    : 1;

  const toggleQaItem = (key: string) => {
    setQaChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="three-rows-container cad-tab-single-view">
      <section className="cad-tab-focused-card row-explanation">
        {/* Identity & Scope Navigation Bar */}
        <div className="cad-subsystem-filter-banner" style={{ margin: 0, marginBottom: '8px' }}>
          <div className="filter-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBackToOverview && (
              <button
                className="reset-subsystem-btn"
                onClick={onBackToOverview}
                title="Return to Whole Unit Overview"
                style={{ padding: '2px 8px', fontSize: '10.5px' }}
              >
                <ArrowLeft size={11} />
                <span>Overview</span>
              </button>
            )}

            <span>DIAGNOSTIC SCOPE:</span>
            <strong className="text-cyan-400">{selectedSensor}</strong>

            {onSelectSubsystem && (
              <button
                className="cad-view-btn-sm"
                onClick={() => onSelectSubsystem(category)}
                title={`Scope to ${subName} Subsystem`}
                style={{ padding: '2px 6px', fontSize: '10px' }}
              >
                <span>{subName}</span>
                <ChevronRight size={10} />
              </button>
            )}

            <span style={{ opacity: 0.7 }}>
              — Single-channel breach audit & transducer corrective directives
            </span>
          </div>
        </div>

        {/* Channel Verdict Header Bar */}
        <div className="explanation-header-bar">
          <div className="explanation-title-group">
            <ShieldAlert size={16} className={hasFail ? "text-rose-400" : "text-emerald-400"} />
            <span className="explanation-title">
              {selectedSensor} Channel Tolerance Verdict & Transducer Remediation
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="excursion-count-tag">
              {hasFail ? `${failures.length} Limit Breaches` : '100% Tolerance Margin Compliance'}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              ({passRate}% Compliance)
            </span>
          </div>
        </div>

        <div className="explanation-content-body">
          {/* Verdict Banner */}
          {!hasFail ? (
            <div className="pass-explanation-layout">
              <div className="pass-banner">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div className="pass-banner-text">
                  <div className="pass-title">{selectedSensor} Passed 100% of Checks</div>
                  <div className="pass-desc">
                    Sensor maintained required statistical tolerance envelopes across all evaluated test stages.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="failure-explanation-layout">
              <div className="root-cause-banner">
                <div className="banner-icon-col">
                  <AlertTriangle size={20} className="text-rose-400" />
                </div>
                <div className="banner-text-col">
                  <div className="banner-title">
                    Root Cause Diagnosis — {selectedSensor} ({failures.length} Out-of-Tolerance Breaches)
                  </div>
                  <div className="banner-desc">
                    Initial breach observed at <strong>Stage {firstFailStage} (t={firstFail?.timeSec}s)</strong> under setpoints{' '}
                    <span className="font-mono text-cyan-400">
                      Flow: {firstFail?.flowSp ?? '--'} {flowSpUnit}, DP: {firstFail?.dpSp ?? '--'} {dpSpUnit}
                    </span>.
                  </div>
                </div>
              </div>

              {/* Corrective Steps Panel */}
              <div className="action-recommendation-box">
                <div className="action-title">
                  <Wrench size={13} className="text-amber-400" />
                  <span>Targeted Remediation & Physical Inspection Directives ({selectedSensor})</span>
                </div>
                <ol className="action-steps-list">
                  {correctiveSteps.map((step, idx) => (
                    <li key={idx}><strong>Step {idx + 1}:</strong> {step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Canonical Faults Associated with this Sensor */}
          <CanonicalFaultsSection
            faultResults={allCanonicalFaults}
            selectedSensor={selectedSensor}
            onSelectSensor={onSelectSensor}
          />

          {/* Chronological Breaches Table for this Channel */}
          {hasFail && (
            <ChronologicalBreachTable
              excursions={failures}
              softwareVersion={metadata.softwareVersion}
              flowSpUnit={flowSpUnit}
              dpSpUnit={dpSpUnit}
              searchQuery=""
              onSearchChange={() => {}}
              onSelectSensor={onSelectSensor || (() => {})}
              title={`${selectedSensor} Out-of-Tolerance Breaches (${failures.length} Excursions)`}
            />
          )}

          {/* Channel QA Sign-off */}
          <QaSignoffCard
            title={`${selectedSensor} Transducer Quality & Verification Sign-Off`}
            items={TEST_QA_ITEMS}
            checklistState={qaChecklist}
            onToggleItem={toggleQaItem}
            testerName={metadata.testedBy}
            dateTested={metadata.dateTested}
            isSigned={qaLeadSigned}
            onToggleSigned={() => setQaLeadSigned(!qaLeadSigned)}
          />
        </div>
      </section>
    </div>
  );
};

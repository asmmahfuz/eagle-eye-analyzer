import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory } from '../../../types';
import { runCanonicalDiagnostics } from '../../../engine/diagnostics/diagnosticsEngine';
import { CanonicalFaultsSection } from './CanonicalFaultsSection';
import { ChronologicalBreachTable } from './ChronologicalBreachTable';
import { QaSignoffCard, QaItem } from './QaSignoffCard';
import { getExcursionDeficitInfo } from '../common/diagnosticUtils';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  ShieldAlert
} from '../../Icons';

export interface UnitDiagnosticsProps {
  dataset: EagleEyeDataset;
  onSelectSensor: (sensorName: string) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory) => void;
}

const UNIT_QA_ITEMS: QaItem[] = [
  { id: 'hydraulic_integrity', label: 'Hydraulic loop integrity & secondary circuit pressure leak check passed' },
  { id: 'bypass_valve_seating', label: 'Bypass control valve FCV61 full travel & closed seating verified' },
  { id: 'vfd_pump_parameters', label: 'VFD drive parameters P054/P055 verified within operational frequency limits' },
  { id: 'transducer_calibration', label: 'Pressure and temperature transducer zero & span offsets validated' },
  { id: 'ambient_hvac_log', label: 'Ambient test bay temperature and humidity verified against baseline limits' },
  { id: 'final_traveler_signoff', label: 'All 20 Canonical Fault Code rules audited against CoolIT CHx2000 specification' }
];

export const UnitDiagnostics: React.FC<UnitDiagnosticsProps> = ({
  dataset,
  onSelectSensor,
  onSelectSubsystem
}) => {
  const [excursionSearch, setExcursionSearch] = useState('');
  const [qaChecklist, setQaChecklist] = useState<Record<string, boolean>>({
    hydraulic_integrity: false,
    bypass_valve_seating: false,
    vfd_pump_parameters: false,
    transducer_calibration: false,
    ambient_hvac_log: false,
    final_traveler_signoff: false
  });
  const [qaLeadSigned, setQaLeadSigned] = useState(false);

  const {
    metadata,
    totalEvaluated,
    passedCount,
    passRate,
    failures,
    parameterStats,
    stages,
    headers,
    unitMap
  } = dataset;

  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';
  const totalChannels = headers.length > 1 ? headers.length - 1 : Object.keys(parameterStats).length;

  // Run authoritative canonical 20-fault diagnostics
  const canonicalFaults = useMemo(() => {
    return runCanonicalDiagnostics(dataset);
  }, [dataset]);

  const activeFailures = failures;

  // Unique failing sensor names
  const activeFailingSensors = useMemo(() => {
    const set = new Set<string>();
    activeFailures.forEach(f => set.add(f.parameter));
    return Array.from(set);
  }, [activeFailures]);

  // Chronologically sorted excursions
  const chronologicalExcursions = useMemo(() => {
    const list = [...activeFailures].sort((a, b) => {
      if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
      return a.parameter.localeCompare(b.parameter);
    });

    if (!excursionSearch.trim()) return list;
    const q = excursionSearch.toLowerCase();
    return list.filter(item =>
      item.parameter.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      String(item.timeSec).includes(q) ||
      (item.failureReason && item.failureReason.toLowerCase().includes(q))
    );
  }, [activeFailures, excursionSearch]);

  const toggleQaItem = (key: string) => {
    setQaChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="three-rows-container cad-tab-single-view">
      <section className="cad-tab-focused-card row-explanation">
        {/* Header Bar */}
        <div className="explanation-header-bar">
          <div className="explanation-title-group">
            <ShieldAlert size={16} className={activeFailures.length === 0 ? "text-emerald-400" : "text-rose-400"} />
            <span className="explanation-title">
              Overall Test Verdict & Root-Cause Diagnostic Analysis
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="excursion-count-tag">
              {activeFailures.length === 0
                ? 'Verification Complete: PASS'
                : `${activeFailures.length} Tolerance Excursions`}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              ({passRate}% Compliance)
            </span>
          </div>
        </div>

        <div className="explanation-content-body">
          {activeFailures.length === 0 ? (
            <div className="pass-explanation-layout">
              <div className="pass-banner">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div className="pass-banner-text">
                  <div className="pass-title">Unit Passed 100% of Evaluated Checks</div>
                  <div className="pass-desc">
                    All {totalChannels} sensor channels maintained required 3-sigma tolerance margins across all {stages.length} operating stages. Zero statistical envelope excursions were recorded.
                  </div>
                </div>
              </div>

              <div className="action-recommendation-box">
                <div className="action-title">
                  <Info size={13} className="text-cyan-400" />
                  <span>Quality Sign-Off & Verification Status</span>
                </div>
                <ul className="action-steps-list">
                  <li><strong>Acceptance Status:</strong> Unit {metadata.serialNumber} (WO {metadata.workOrderNumber}) meets all factory EOL quality acceptance criteria.</li>
                  <li><strong>Next Action:</strong> Unit is ready for final traveler sign-off and packaging dispatch.</li>
                </ul>
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
                    Executive Root-Cause Diagnosis (Unit {metadata.serialNumber})
                  </div>
                  <div className="banner-desc">
                    The unit achieved {passRate}% tolerance compliance ({passedCount} of {totalEvaluated} checks passed). A total of {failures.length} excursions were identified across {activeFailingSensors.length} test channel(s):
                  </div>
                  <ol className="overview-findings-list">
                    {activeFailingSensors.map(name => {
                      const s = parameterStats[name];
                      const firstFail = activeFailures.find(f => f.parameter === name);
                      const deficitInfo = firstFail ? getExcursionDeficitInfo(firstFail) : null;
                      return (
                        <li key={name}>
                          <strong>{name} ({s?.failCount} excursion{s?.failCount !== 1 ? 's' : ''}):</strong>{' '}
                          {firstFail?.failureReason || `Measured value exceeded allowable 3σ tolerance envelope.`}
                          {deficitInfo && deficitInfo.deltaVal !== 0 && (
                            <span style={{ marginLeft: '6px', color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
                              [Worst Deficit: {deficitInfo.formatted}]
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Failing Channel Quick-Jump Navigation Pills */}
              <div className="excursions-list-wrapper">
                <div className="excursions-header-label">
                  Failing Test Channels — Select to inspect transient scope:
                </div>
                <div className="failing-channels-pills-row">
                  {activeFailingSensors.map(name => {
                    const s = parameterStats[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        className="failing-sensor-pill-btn"
                        onClick={() => onSelectSensor(name)}
                        title={`Open detailed telemetry view & 3σ envelopes for ${name}`}
                      >
                        <AlertTriangle size={12} className="text-rose-400" />
                        <span className="failing-name">{name}</span>
                        <span className="failing-count">{s?.failCount} failures</span>
                        <ChevronRight size={11} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Canonical 20-Fault Diagnostics Registry Section */}
          <CanonicalFaultsSection
            faultResults={canonicalFaults}
            onSelectSensor={onSelectSensor}
            onSelectSubsystem={onSelectSubsystem}
          />

          {/* Chronological Out-of-Tolerance Excursions Ledger Table */}
          {activeFailures.length > 0 && (
            <ChronologicalBreachTable
              excursions={chronologicalExcursions}
              softwareVersion={metadata.softwareVersion}
              flowSpUnit={flowSpUnit}
              dpSpUnit={dpSpUnit}
              searchQuery={excursionSearch}
              onSearchChange={setExcursionSearch}
              onSelectSensor={onSelectSensor}
              onSelectSubsystem={onSelectSubsystem}
            />
          )}

          {/* Subsystem Channel Quality & Sign-Off Checklist */}
          <QaSignoffCard
            title="Whole Unit QA Traveler & Acceptance Sign-Off Checklist"
            items={UNIT_QA_ITEMS}
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

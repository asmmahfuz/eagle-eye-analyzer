import React, { useState, useMemo } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { runCanonicalDiagnostics, getFaultsForSubsystem } from '../../../engine/diagnostics/diagnosticsEngine';
import { CanonicalFaultsSection } from './CanonicalFaultsSection';
import { ChronologicalBreachTable } from './ChronologicalBreachTable';
import { QaSignoffCard, QaItem } from './QaSignoffCard';
import { getExcursionDeficitInfo } from '../common/diagnosticUtils';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  Layers,
  ShieldAlert
} from '../../Icons';

export interface GroupDiagnosticsProps {
  dataset: EagleEyeDataset;
  selectedSubsystem: SubsystemCategory;
  onSelectSensor: (sensorName: string) => void;
  onResetSubsystem?: () => void;
}

const GROUP_QA_ITEMS: QaItem[] = [
  { id: 'subsystem_integrity', label: 'Subsystem component mounting, wiring continuity and line tightness verified' },
  { id: 'component_seating', label: 'Valves, strainers, and actuators verified for free mechanical travel' },
  { id: 'calibration_offset', label: 'Transducer zero-offset checked against atmospheric reference conditions' },
  { id: 'traveler_signoff', label: 'Subsystem QA traveler inspected and signed off for final unit assembly' }
];

export const GroupDiagnostics: React.FC<GroupDiagnosticsProps> = ({
  dataset,
  selectedSubsystem,
  onSelectSensor,
  onResetSubsystem
}) => {
  const [excursionSearch, setExcursionSearch] = useState('');
  const [qaChecklist, setQaChecklist] = useState<Record<string, boolean>>({
    subsystem_integrity: false,
    component_seating: false,
    calibration_offset: false,
    traveler_signoff: false
  });
  const [qaLeadSigned, setQaLeadSigned] = useState(false);

  const {
    metadata,
    categoryCounts,
    failures,
    parameterStats,
    unitMap
  } = dataset;

  const subName = SUBSYSTEM_LABELS[selectedSubsystem] || selectedSubsystem;
  const flowSpUnit = unitMap['Secondary Flow Setpoint'] || 'LPM';
  const dpSpUnit = unitMap['Secondary DP Setpoint'] || 'psi';

  // Run authoritative canonical 20-fault diagnostics
  const allCanonicalFaults = useMemo(() => {
    return runCanonicalDiagnostics(dataset);
  }, [dataset]);

  const subsystemFaults = useMemo(() => {
    return getFaultsForSubsystem(allCanonicalFaults, selectedSubsystem);
  }, [allCanonicalFaults, selectedSubsystem]);

  // Subsystem channels & failures
  const activeChannels = useMemo(() => {
    return Object.entries(parameterStats)
      .filter(([_, stat]) => stat.category === selectedSubsystem)
      .map(([name, stat]) => ({ name, stat }));
  }, [parameterStats, selectedSubsystem]);

  const activeFailures = useMemo(() => {
    return failures.filter(f => f.category === selectedSubsystem);
  }, [failures, selectedSubsystem]);

  const activeFailingSensors = useMemo(() => {
    const set = new Set<string>();
    activeFailures.forEach(f => set.add(f.parameter));
    return Array.from(set);
  }, [activeFailures]);

  const subCatCount = categoryCounts[selectedSubsystem];
  const activeFailCount = subCatCount ? subCatCount.fail : activeFailures.length;
  const activePassCount = subCatCount ? subCatCount.pass : Math.max(0, activeChannels.length * 28 - activeFailCount);
  const activeTotalEvaluated = activePassCount + activeFailCount;
  const activePassRate = activeTotalEvaluated > 0 
    ? Number(((activePassCount / activeTotalEvaluated) * 100).toFixed(1)) 
    : 100;

  const chronologicalExcursions = useMemo(() => {
    const list = [...activeFailures].sort((a, b) => {
      if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
      return a.parameter.localeCompare(b.parameter);
    });

    if (!excursionSearch.trim()) return list;
    const q = excursionSearch.toLowerCase();
    return list.filter(item =>
      item.parameter.toLowerCase().includes(q) ||
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
        {/* Subsystem Filter Banner */}
        <div className="cad-subsystem-filter-banner">
          <div className="filter-info">
            <span>FILTERED BY SUBSYSTEM:</span>
            <strong className="text-cyan-400">{subName.toUpperCase()}</strong>
            <span style={{ opacity: 0.7 }}>— Diagnostics, failure ledger & QA checklist isolated to {subName}</span>
          </div>
          {onResetSubsystem && (
            <button 
              className="reset-subsystem-btn"
              onClick={onResetSubsystem}
              title="Click to view the entire unit overview"
            >
              <Layers size={11} />
              <span>Show Whole Unit</span>
            </button>
          )}
        </div>

        {/* Diagnostics Header Bar */}
        <div className="explanation-header-bar">
          <div className="explanation-title-group">
            <ShieldAlert size={16} className={activeFailures.length === 0 ? "text-emerald-400" : "text-rose-400"} />
            <span className="explanation-title">
              {subName} Subsystem Diagnostic Analysis & Shopfloor Rework Punch-List
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="excursion-count-tag">
              {activeFailures.length === 0
                ? `${subName}: Verified PASS`
                : `${activeFailures.length} ${subName} Excursions`}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              ({activePassRate}% Subsystem Compliance)
            </span>
          </div>
        </div>

        <div className="explanation-content-body">
          {activeFailures.length === 0 ? (
            <div className="pass-explanation-layout">
              <div className="pass-banner">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div className="pass-banner-text">
                  <div className="pass-title">{subName} Passed 100% of Checks</div>
                  <div className="pass-desc">
                    All {activeChannels.length} test channels in this subsystem maintained required 3-sigma tolerance envelopes.
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
                    {subName} Diagnostic Ledger (Unit {metadata.serialNumber})
                  </div>
                  <div className="banner-desc">
                    Subsystem achieved {activePassRate}% compliance ({activePassCount} of {activeTotalEvaluated} checks passed). Excursions detected on {activeFailingSensors.length} channel(s):
                  </div>
                  <ol className="overview-findings-list">
                    {activeFailingSensors.map(name => {
                      const s = parameterStats[name];
                      const firstFail = activeFailures.find(f => f.parameter === name);
                      const deficitInfo = firstFail ? getExcursionDeficitInfo(firstFail) : null;
                      return (
                        <li key={name}>
                          <strong>{name} ({s?.failCount} excursion{s?.failCount !== 1 ? 's' : ''}):</strong>{' '}
                          {firstFail?.failureReason || `Measured reading breached statistical tolerance limits.`}
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
                  Failing {subName} Channels — Select to inspect transient scope:
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

          {/* Subsystem Canonical Faults */}
          <CanonicalFaultsSection
            faultResults={allCanonicalFaults}
            selectedSubsystem={selectedSubsystem}
            onSelectSensor={onSelectSensor}
          />

          {/* Chronological Breach Table for this Subsystem */}
          {activeFailures.length > 0 && (
            <ChronologicalBreachTable
              excursions={chronologicalExcursions}
              softwareVersion={metadata.softwareVersion}
              flowSpUnit={flowSpUnit}
              dpSpUnit={dpSpUnit}
              searchQuery={excursionSearch}
              onSearchChange={setExcursionSearch}
              onSelectSensor={onSelectSensor}
              title={`${subName} Out-of-Tolerance Excursions Ledger (${chronologicalExcursions.length} Breaches)`}
            />
          )}

          {/* Subsystem QA Sign-Off Checklist */}
          <QaSignoffCard
            title={`${subName} Quality & Assembly Sign-Off Checklist`}
            items={GROUP_QA_ITEMS}
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

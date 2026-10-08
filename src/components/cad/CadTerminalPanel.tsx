import React, { useState, useMemo, useRef } from 'react';
import { EagleEyeDataset, SubsystemCategory, SUBSYSTEM_LABELS } from '../../types';
import { 
  TerminalIcon, 
  X, 
  Copy, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Search, 
  RefreshCw, 
  Cpu 
} from '../Icons';

interface LogMessage {
  id: string;
  time?: string;
  level: 'info' | 'warn' | 'error' | 'modbus';
  category: string;
  text: string;
  parameter?: string;
  stageNum?: number;
}

interface CadTerminalPanelProps {
  dataset: EagleEyeDataset | null;
  selectedSensor?: string | null;
  selectedSubsystem?: SubsystemCategory | null;
  onSelectSensor: (sensorName: string | null) => void;
  onSelectSubsystem?: (subsystem: SubsystemCategory | null) => void;
  onRunAudit: () => void;
  onExport: () => void;
  onClose: () => void;
}

export const CadTerminalPanel: React.FC<CadTerminalPanelProps> = ({
  dataset,
  selectedSensor = null,
  selectedSubsystem = null,
  onSelectSensor,
  onSelectSubsystem,
  onRunAudit,
  onExport,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'build' | 'modbus' | 'console' | 'raw'>('build');
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [searchText, setSearchText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [cmdInput, setCmdInput] = useState('');
  const [customConsoleLogs, setCustomConsoleLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Generate messages based on real dataset evaluation and selected scope (Sensor or Subsystem)
  const messages: LogMessage[] = useMemo(() => {
    if (!dataset) {
      return [
        {
          id: 'boot-1',
          level: 'info',
          category: 'ENGINE',
          text: 'Eagle Eye Diagnostics Engine online. Modbus TCP telemetry pipeline initialized.'
        },
        {
          id: 'boot-ready',
          level: 'info',
          category: 'SYSTEM',
          text: "System ready for workbook ingestion. Use 'File > Open' or drag and drop a CDU test workbook (.xlsx)."
        }
      ];
    }

    const list: LogMessage[] = [];

    // CASE A: A specific test / channel is selected
    if (selectedSensor) {
      const summary = dataset.parameterStats[selectedSensor];
      const categoryStr = (summary?.category || 'DIAGNOSTIC').toUpperCase();
      const unitStr = summary?.unit || '';

      list.push({
        id: 'scope-focus',
        level: 'info',
        category: 'CHANNEL',
        text: `Diagnostic scope focused on test parameter: '${selectedSensor}' [${categoryStr}]. Measured unit: ${unitStr || 'none'}.`,
        parameter: selectedSensor
      });

      if (summary) {
        const meanStr = summary.nominalMean !== null ? `${summary.nominalMean.toFixed(2)} ${unitStr}` : '--';
        const spanStr = summary.threeSigmaSpan !== null ? `±${summary.threeSigmaSpan.toFixed(2)} ${unitStr}` : '--';
        list.push({
          id: 'spec-info',
          level: 'info',
          category: 'TOLERANCE',
          text: `Baseline process parameters: μ = ${meanStr}, 3σ limit half-span = ${spanStr}. Total evaluated sample points = ${summary.totalChecks}.`,
          parameter: selectedSensor
        });
      }

      // Check for specific modbus / signal conditioning notes
      if (selectedSensor.includes('PT11')) {
        list.push({
          id: 'modbus-pt11',
          level: 'modbus',
          category: 'MODBUS',
          text: 'PT11 Modbus rollover check: 6553.5 -> -0.10 psi decoded as valid reservoir vacuum (graded PASS in decision matrix).',
          parameter: selectedSensor
        });
      } else if (selectedSensor.includes('Primary DP')) {
        list.push({
          id: 'modbus-dp',
          level: 'modbus',
          category: 'MODBUS',
          text: "Primary DP Modbus unsigned 16-bit integer rollover check active: negative values decoded via two's complement.",
          parameter: selectedSensor
        });
      } else if (summary?.category === 'pump') {
        list.push({
          id: 'modbus-vfd',
          level: 'modbus',
          category: 'VFD',
          text: 'Automatic 0–10V analog scaling active on pump speeds and control valves (10x normalized to 0–100%).',
          parameter: selectedSensor
        });
      }

      // Excursions for this parameter
      const sensorFailures = dataset.failures.filter(f => f.parameter === selectedSensor);
      if (sensorFailures.length > 0) {
        sensorFailures.forEach((pt, idx) => {
          const lowStr = pt.lowLimit !== null ? pt.lowLimit.toFixed(2) : '-∞';
          const highStr = pt.highLimit !== null ? pt.highLimit.toFixed(2) : '+∞';
          const measStr = typeof pt.measured === 'number' ? pt.measured.toFixed(2) : String(pt.measured);
          const deltaStr = pt.marginBuffer !== null ? pt.marginBuffer.toFixed(2) : '0';

          list.push({
            id: `fail-${selectedSensor}-${idx}`,
            level: 'warn',
            category: pt.category.toUpperCase(),
            text: `[3σ EXCURSION] ${pt.parameter} at stage t = ${pt.timeSec}s (Flow ${pt.flowSp || '--'} LPM, DP ${pt.dpSp || '--'} psi): Measured ${measStr} ${pt.unit} vs [ ${lowStr} ~ ${highStr} ${pt.unit} ] (Deficit: ${deltaStr} ${pt.unit})`,
            parameter: pt.parameter,
            stageNum: pt.timeSec
          });
        });
      } else {
        list.push({
          id: 'pass-info',
          level: 'info',
          category: 'COMPLIANCE',
          text: `All 10 operating stages (15s – 525s) measured strictly within dual ±3σ statistical envelopes. Zero excursions detected.`,
          parameter: selectedSensor
        });
      }

      if (summary) {
        const peakStr = summary.peak !== null ? `${summary.peak.toFixed(2)} ${unitStr}` : '--';
        const minStr = summary.min !== null ? `${summary.min.toFixed(2)} ${unitStr}` : '--';
        const settlingStr = summary.settling !== null ? `${summary.settling.toFixed(2)} ${unitStr}` : '--';
        const verdict = summary.failCount === 0 ? 'PASS' : `FAIL (${summary.failCount} stage excursions)`;

        list.push({
          id: 'summary-info',
          level: summary.failCount === 0 ? 'info' : 'warn',
          category: 'VERDICT',
          text: `Test Verdict: ${verdict} | Steady-state Settling (525s): ${settlingStr} | Peak: ${peakStr} | Min: ${minStr}.`,
          parameter: selectedSensor
        });
      }

      return list;
    }

    // CASE B: Subsystem isolation is active (selectedSubsystem !== null && selectedSensor === null)
    if (selectedSubsystem) {
      const subLabel = SUBSYSTEM_LABELS[selectedSubsystem];
      const subChannels = Object.entries(dataset.parameterStats).filter(([_, s]) => s.category === selectedSubsystem);
      const subFailures = dataset.failures.filter(f => f.category === selectedSubsystem);
      const subTotalChecks = subChannels.reduce((sum, [_, s]) => sum + s.totalChecks, 0);
      const subPassedCount = subTotalChecks - subFailures.length;
      const subPassRate = subTotalChecks > 0 ? ((subPassedCount / subTotalChecks) * 100).toFixed(1) : '100.0';

      list.push({
        id: 'sub-scope-header',
        level: 'info',
        category: 'ENGINE',
        text: `Eagle Eye Diagnostics Engine — Modbus TCP Telemetry Pipeline isolated to '${subLabel}' [${selectedSubsystem}].`
      });

      list.push({
        id: 'sub-scope-file',
        level: 'info',
        category: 'FILE',
        text: `Workbook: ${dataset.metadata.filename || 'CDU_Test.xlsx'} | Unit: ${dataset.metadata.serialNumber} | WO: ${dataset.metadata.workOrderNumber}.`
      });

      list.push({
        id: 'sub-scope-channels',
        level: 'info',
        category: 'SUBSYSTEM',
        text: `[Scope: ${subLabel}] Monitored Channels: ${subChannels.length}, Total Evaluated Checks: ${subTotalChecks}.`
      });

      // Domain-specific protocol & conditioning notes
      if (selectedSubsystem === 'hydraulic') {
        list.push({
          id: 'sub-mod-1',
          level: 'modbus',
          category: 'MODBUS',
          text: 'Modbus TCP holding registers 201 (DP SP: 5.0–33.0 psi) & 202 (Flow SP: 100–560 LPM) active.'
        });
        list.push({
          id: 'sub-mod-2',
          level: 'modbus',
          category: 'MODBUS',
          text: "Primary DP Modbus unsigned 16-bit integer rollover check active: negative values decoded via two's complement."
        });
        list.push({
          id: 'sub-mod-3',
          level: 'info',
          category: 'FLOW',
          text: 'Secondary flow control loop monitored: FT01, FT61 flowmeters & FCV61 primary bypass modulating valve.'
        });
      } else if (selectedSubsystem === 'pump') {
        list.push({
          id: 'sub-vfd-1',
          level: 'modbus',
          category: 'VFD',
          text: 'Automatic 0–10V analog scaling active on pump speeds (P31 & P41 normalized 10x to 56%–99%).'
        });
        list.push({
          id: 'sub-vfd-2',
          level: 'modbus',
          category: 'MODBUS',
          text: 'Inverter parameter P054 minimum speed limit enforced at 56.00% (33.6 Hz).'
        });
        list.push({
          id: 'sub-vfd-3',
          level: 'info',
          category: 'PUMPS',
          text: 'Redundant centrifugal circulation pumps monitored across all 10 excitation stages.'
        });
      } else if (selectedSubsystem === 'temperature') {
        list.push({
          id: 'sub-temp-1',
          level: 'modbus',
          category: 'MODBUS',
          text: 'Modbus holding register 200 (Secondary Temperature SP: 21.0–27.0 °C, scale 0.1) active.'
        });
        list.push({
          id: 'sub-temp-2',
          level: 'info',
          category: 'THERMAL',
          text: '4-wire Class A RTD transmitter array active across primary and secondary loops (TT01..TT62).'
        });
      } else if (selectedSubsystem === 'pressure') {
        list.push({
          id: 'sub-press-1',
          level: 'modbus',
          category: 'MODBUS',
          text: 'Pressure transducer array (PT01..PT62) monitored for static, suction, discharge, and differential pressures.'
        });
        list.push({
          id: 'sub-press-2',
          level: 'modbus',
          category: 'MODBUS',
          text: 'PT11 Modbus rollover & sentinel check: 6553.5 (0xFFFF) flagged as valid reservoir vacuum or open-circuit transducer.'
        });
      } else if (selectedSubsystem === 'environmental') {
        list.push({
          id: 'sub-env-1',
          level: 'info',
          category: 'AMBIENT',
          text: 'Factory test bay ambient sensors active: Air Humidity (% RH) and Air Temperature (°C).'
        });
        list.push({
          id: 'sub-env-2',
          level: 'warn',
          category: 'ENVIRONMENTAL',
          text: 'Ambient test bay humidity variations correlate with external HVAC facility conditions rather than CDU hardware.'
        });
      } else if (selectedSubsystem === 'system') {
        list.push({
          id: 'sub-sys-1',
          level: 'info',
          category: 'SYSTEM',
          text: `PLC firmware version: v${dataset.metadata.softwareVersion} | Framework: ${dataset.metadata.frameworkBuildVersion}.`
        });
        list.push({
          id: 'sub-sys-2',
          level: 'info',
          category: 'STATUS',
          text: 'System health word: 0x0001 (PLC Normal Operational). Evaluated rows: 5–32 (28 stages).'
        });
      }

      // Populate failure excursions for this subsystem only
      if (subFailures.length > 0) {
        subFailures.forEach((pt, idx) => {
          const lowStr = pt.lowLimit !== null ? pt.lowLimit.toFixed(2) : '-∞';
          const highStr = pt.highLimit !== null ? pt.highLimit.toFixed(2) : '+∞';
          const measStr = typeof pt.measured === 'number' ? pt.measured.toFixed(2) : String(pt.measured);
          const deltaStr = pt.marginBuffer !== null ? pt.marginBuffer.toFixed(2) : '0';

          list.push({
            id: `sub-fail-${idx}`,
            level: 'warn',
            category: pt.category.toUpperCase(),
            text: `[3σ EXCURSION] ${pt.parameter} at t = ${pt.timeSec}s (Flow ${pt.flowSp || '--'} LPM, DP ${pt.dpSp || '--'} psi): Measured ${measStr} ${pt.unit} vs [ ${lowStr} ~ ${highStr} ${pt.unit} ] (Deficit: ${deltaStr} ${pt.unit})`,
            parameter: pt.parameter,
            stageNum: pt.timeSec
          });
        });
      } else {
        list.push({
          id: 'sub-pass-info',
          level: 'info',
          category: 'COMPLIANCE',
          text: `All ${subChannels.length} channels in ${subLabel} measured strictly within dual ±3σ statistical envelopes across all 10 stages. Zero excursions detected.`
        });
      }

      list.push({
        id: 'sub-verdict-info',
        level: subFailures.length === 0 ? 'info' : 'warn',
        category: 'VERDICT',
        text: `Subsystem '${subLabel}' Verdict: ${subFailures.length === 0 ? 'PASS (100% compliant)' : `FAIL (${subFailures.length} excursions across ${new Set(subFailures.map(f => f.parameter)).size} channels)`} | Compliance: ${subPassRate}%.`
      });

      return list;
    }

    // CASE C: Entire Unit Overview is selected (selectedSensor === null && selectedSubsystem === null)
    list.push({
      id: 'boot-1',
      level: 'info',
      category: 'ENGINE',
      text: 'Eagle Eye Diagnostics Engine online. Modbus TCP telemetry pipeline initialized.'
    });

    list.push({
      id: 'boot-2',
      level: 'info',
      category: 'FILE',
      text: `Loaded Workbook: ${dataset.metadata.filename || 'CDU_Test.xlsx'} (Unit: ${dataset.metadata.serialNumber}, WO: ${dataset.metadata.workOrderNumber}).`
    });

    list.push({
      id: 'boot-3',
      level: 'info',
      category: 'EVALUATOR',
      text: `Channel hierarchy verified. Total Channels: ${Object.keys(dataset.parameterStats).length}, Total Evaluated Points: ${dataset.totalEvaluated}.`
    });

    list.push({
      id: 'modbus-1',
      level: 'modbus',
      category: 'MODBUS',
      text: 'PT11 Modbus rollover check: 6553.5 -> -0.10 psi decoded as valid reservoir vacuum (graded PASS in decision matrix).',
      parameter: 'PT11'
    });

    list.push({
      id: 'modbus-2',
      level: 'modbus',
      category: 'MODBUS',
      text: "Primary DP Modbus unsigned 16-bit integer rollover check active: negative values decoded via two's complement.",
      parameter: 'Primary DP (Supply - Return)'
    });

    list.push({
      id: 'modbus-3',
      level: 'info',
      category: 'VFD',
      text: 'Automatic 0–10V analog scaling active on pump speeds and control valves (10x normalized to 0–100%).'
    });

    // Populate failure excursions as warnings
    dataset.failures.forEach((pt, idx) => {
      const lowStr = pt.lowLimit !== null ? pt.lowLimit.toFixed(2) : '-∞';
      const highStr = pt.highLimit !== null ? pt.highLimit.toFixed(2) : '+∞';
      const measStr = typeof pt.measured === 'number' ? pt.measured.toFixed(2) : String(pt.measured);
      const deltaStr = pt.marginBuffer !== null ? pt.marginBuffer.toFixed(2) : '0';

      list.push({
        id: `fail-${idx}`,
        level: 'warn',
        category: pt.category.toUpperCase(),
        text: `[3σ EXCURSION] ${pt.parameter} at t = ${pt.timeSec}s (Flow ${pt.flowSp || '--'} LPM, DP ${pt.dpSp || '--'} psi): Measured ${measStr} ${pt.unit} vs [ ${lowStr} ~ ${highStr} ${pt.unit} ] (Deficit: ${deltaStr} ${pt.unit})`,
        parameter: pt.parameter
      });
    });

    list.push({
      id: 'sim-done',
      level: 'info',
      category: 'EVALUATION',
      text: `Evaluation complete at t = 525.00s. Compliance: ${dataset.passRate}% (${dataset.passedCount} passed, ${dataset.failedCount} violations across unit).`
    });

    return list;
  }, [dataset, selectedSensor, selectedSubsystem]);

  // Modbus Telemetry Stream Entries scoped to active subsystem / sensor
  const modbusStreamEntries: LogMessage[] = useMemo(() => {
    if (!dataset) {
      return [
        {
          id: 'mb-0',
          level: 'modbus',
          category: 'MODBUS-TCP',
          text: 'Modbus TCP link 169.254.244.6:502 ready. Awaiting connection from PLC master...'
        }
      ];
    }

    const entries: LogMessage[] = [
      {
        id: 'mb-conn',
        level: 'modbus',
        category: 'MODBUS-TCP',
        text: `[00:00:00.000] TCP client connected to PLC @ 169.254.244.6:502 (Unit ID: 1, Timeout: 1000ms)`
      }
    ];

    // Subsystem or sensor-specific register traces
    const showHydraulic = !selectedSubsystem || selectedSubsystem === 'hydraulic' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'hydraulic');
    const showPump = !selectedSubsystem || selectedSubsystem === 'pump' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'pump');
    const showTemp = !selectedSubsystem || selectedSubsystem === 'temperature' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'temperature');
    const showPress = !selectedSubsystem || selectedSubsystem === 'pressure' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'pressure');
    const showEnv = !selectedSubsystem || selectedSubsystem === 'environmental' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'environmental');
    const showSys = !selectedSubsystem || selectedSubsystem === 'system' || (selectedSensor && dataset.parameterStats[selectedSensor]?.category === 'system');

    if (showHydraulic) {
      entries.push({
        id: 'mb-reg-201',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.010] FC03 Holding Reg 201 (Secondary DP SP) = 0x0096 (150 -> 15.0 psi, Scale: 0.1)'
      });
      entries.push({
        id: 'mb-reg-202',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.012] FC03 Holding Reg 202 (Secondary Flow SP) = 0x03E8 (1000 -> 100.0 LPM, Scale: 0.1)'
      });
      entries.push({
        id: 'mb-reg-104',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: "[00:00:15.014] FC04 Input Reg 104 (Primary DP) = 0xFFF7 -> -0.9 psi (Two's complement signed decoded)",
        parameter: 'Primary DP (Supply - Return)'
      });
      entries.push({
        id: 'mb-reg-105',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.016] FC04 Input Reg 105 (Secondary DP) = 0x0031 -> 4.9 psi',
        parameter: 'Secondary DP (Supply - Return)'
      });
      entries.push({
        id: 'mb-reg-110',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.018] FC04 Input Reg 110 (FT01 Primary Flow) = 0x028A -> 65.0 LPM',
        parameter: 'FT01'
      });
      entries.push({
        id: 'mb-reg-112',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.020] FC04 Input Reg 112 (FT61 Secondary Flow) = 0x03F2 -> 101.0 LPM',
        parameter: 'FT61'
      });
      entries.push({
        id: 'mb-reg-115',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.022] FC04 Input Reg 115 (FCV61 Actual Open%) = 0x0258 -> 60.0%',
        parameter: 'FCV61 Actual Open%'
      });
    }

    if (showPump) {
      entries.push({
        id: 'mb-reg-310',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.024] FC04 Input Reg 310 (P31 Speed %) = 0x003A (58 -> 58.0% [10x Analog Normalizer Active])',
        parameter: 'P31 Speed %'
      });
      entries.push({
        id: 'mb-reg-410',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.026] FC04 Input Reg 410 (P41 Speed %) = 0x003B (59 -> 59.0% [10x Analog Normalizer Active])',
        parameter: 'P41 Speed %'
      });
      entries.push({
        id: 'mb-reg-054',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.028] FC03 Holding Reg 054 (P054 Min Speed Limit) = 0x0230 (56.00% / 33.6 Hz locked)'
      });
    }

    if (showTemp) {
      entries.push({
        id: 'mb-reg-200',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.030] FC03 Holding Reg 200 (Secondary Temp SP) = 0x00D2 (210 -> 21.0 °C, Scale: 0.1)'
      });
      entries.push({
        id: 'mb-reg-120',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.032] FC04 Input Reg 120 (TT01 Primary Supply Temp) = 0x00CA (20.2 °C)',
        parameter: 'TT01'
      });
      entries.push({
        id: 'mb-reg-121',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.034] FC04 Input Reg 121 (TT02 Primary Return Temp) = 0x00D8 (21.6 °C)',
        parameter: 'TT02'
      });
      entries.push({
        id: 'mb-reg-126',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.036] FC04 Input Reg 126 (TT61 Secondary Supply Temp) = 0x00CE (20.6 °C)',
        parameter: 'TT61'
      });
      entries.push({
        id: 'mb-reg-127',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.038] FC04 Input Reg 127 (TT62 Secondary Return Temp) = 0x00DC (22.0 °C)',
        parameter: 'TT62'
      });
    }

    if (showPress) {
      entries.push({
        id: 'mb-reg-140',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.040] FC04 Input Reg 140 (PT01 Primary Supply) = 0x0154 (34.0 psi)',
        parameter: 'PT01'
      });
      entries.push({
        id: 'mb-reg-141',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.042] FC04 Input Reg 141 (PT02 Primary Return) = 0x0186 (39.0 psi)',
        parameter: 'PT02'
      });
      entries.push({
        id: 'mb-reg-151',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.044] FC04 Input Reg 151 (PT11 Reservoir) = 0xFFFF (6553.5 -> Open-Circuit / Vacuum Sentinel Decoded)',
        parameter: 'PT11'
      });
      entries.push({
        id: 'mb-reg-161',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.046] FC04 Input Reg 161 (PT61 Secondary Supply) = 0x01F4 (50.0 psi)',
        parameter: 'PT61'
      });
      entries.push({
        id: 'mb-reg-162',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.048] FC04 Input Reg 162 (PT62 Secondary Return) = 0x01A4 (42.0 psi)',
        parameter: 'PT62'
      });
    }

    if (showEnv) {
      entries.push({
        id: 'mb-reg-180',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.050] FC04 Input Reg 180 (Air Humidity % RH) = 0x0294 (66.0% RH [Bay Sensor])',
        parameter: 'Air Humidity'
      });
      entries.push({
        id: 'mb-reg-181',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.052] FC04 Input Reg 181 (Air Temperature °C) = 0x00EA (23.4 °C [Bay Sensor])',
        parameter: 'Air Temperature'
      });
    }

    if (showSys) {
      entries.push({
        id: 'mb-reg-001',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: `[00:00:15.054] FC03 Holding Reg 001 (Program Version) = 0x0017 (v${dataset.metadata.softwareVersion})`
      });
      entries.push({
        id: 'mb-reg-002',
        level: 'modbus',
        category: 'MODBUS-RX',
        text: '[00:00:15.056] FC04 Input Reg 002 (PLC Status Word) = 0x0001 (PLC Normal Operational)'
      });
    }

    return entries;
  }, [dataset, selectedSensor, selectedSubsystem]);

  // Filter messages based on tab, level, and search
  const filteredMessages = useMemo(() => {
    let result = activeTab === 'modbus' ? modbusStreamEntries : messages;

    if (filterLevel === 'info') {
      result = result.filter(m => m.level === 'info');
    } else if (filterLevel === 'warn') {
      result = result.filter(m => m.level === 'warn');
    } else if (filterLevel === 'error') {
      result = result.filter(m => m.level === 'error');
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(m => 
        m.text.toLowerCase().includes(q) || 
        m.category.toLowerCase().includes(q) ||
        (m.parameter && m.parameter.toLowerCase().includes(q))
      );
    }

    return result;
  }, [messages, modbusStreamEntries, activeTab, filterLevel, searchText]);

  const errorCount = useMemo(() => {
    const list = activeTab === 'modbus' ? modbusStreamEntries : messages;
    return list.filter(m => m.level === 'error').length;
  }, [messages, modbusStreamEntries, activeTab]);

  const warnCount = useMemo(() => {
    const list = activeTab === 'modbus' ? modbusStreamEntries : messages;
    return list.filter(m => m.level === 'warn').length;
  }, [messages, modbusStreamEntries, activeTab]);

  const infoCount = useMemo(() => {
    const list = activeTab === 'modbus' ? modbusStreamEntries : messages;
    return list.filter(m => m.level === 'info' || m.level === 'modbus').length;
  }, [messages, modbusStreamEntries, activeTab]);

  const handleCopyLogs = () => {
    const textToCopy = filteredMessages.map(m => `[${m.level.toUpperCase()}] [${m.category}] ${m.text}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = cmdInput.trim();
    const cmd = rawCmd.toLowerCase();
    if (!cmd) return;

    const newLogs = [...customConsoleLogs];
    newLogs.push(`> ${rawCmd}`);

    if (cmd === 'help') {
      newLogs.push('Available diagnostic commands:');
      newLogs.push('  status      - Print unit / subsystem / channel summary and compliance');
      newLogs.push('  failed      - List failing parameters and stage excursions in active scope');
      newLogs.push('  subsystem   - Display or set active subsystem filter (e.g. "subsystem hydraulic", "subsystem all")');
      newLogs.push('  audit       - Re-evaluate mathematical 3-sigma tolerance envelopes');
      newLogs.push('  export      - Trigger multi-sheet Excel report generation');
      newLogs.push('  clear       - Clear custom terminal history');
    } else if (cmd.startsWith('subsystem')) {
      const parts = cmd.split(/\s+/);
      if (parts.length > 1) {
        const target = parts[1];
        if (target === 'all' || target === 'reset' || target === 'none') {
          if (onSelectSubsystem) onSelectSubsystem(null);
          onSelectSensor(null);
          newLogs.push('Subsystem isolation cleared. Displaying whole unit data.');
        } else {
          const matchKey = Object.keys(SUBSYSTEM_LABELS).find(
            k => k.toLowerCase() === target || SUBSYSTEM_LABELS[k as SubsystemCategory].toLowerCase().includes(target)
          ) as SubsystemCategory | undefined;
          if (matchKey && onSelectSubsystem) {
            onSelectSubsystem(matchKey);
            newLogs.push(`Subsystem isolation set to: ${SUBSYSTEM_LABELS[matchKey]} [${matchKey}].`);
          } else {
            newLogs.push(`Unknown subsystem '${target}'. Valid subsystems: hydraulic, pump, temperature, pressure, environmental, system, all.`);
          }
        }
      } else {
        if (selectedSubsystem) {
          newLogs.push(`Active isolated subsystem: ${SUBSYSTEM_LABELS[selectedSubsystem]} [${selectedSubsystem}].`);
        } else {
          newLogs.push('Active subsystem: WHOLE UNIT (No filter applied).');
          if (dataset) {
            const domainCounts: Record<string, number> = {};
            dataset.failures.forEach(f => {
              domainCounts[f.category] = (domainCounts[f.category] || 0) + 1;
            });
            newLogs.push(`Subsystem violation breakdown: Hydraulic (${domainCounts.hydraulic || 0}), Pump (${domainCounts.pump || 0}), Temp (${domainCounts.temperature || 0}), Press (${domainCounts.pressure || 0}), Env (${domainCounts.environmental || 0}), Sys (${domainCounts.system || 0}).`);
          }
        }
      }
    } else if (cmd === 'status') {
      if (dataset) {
        if (selectedSensor && dataset.parameterStats[selectedSensor]) {
          const s = dataset.parameterStats[selectedSensor];
          newLogs.push(`Test Parameter: ${selectedSensor} [${s.category.toUpperCase()}] | Unit: ${s.unit} | Verdict: ${s.failCount === 0 ? 'PASS' : `FAIL (${s.failCount} excursions)`} | Settling: ${s.settling !== null ? s.settling.toFixed(2) : '--'} ${s.unit} | Peak: ${s.peak !== null ? s.peak.toFixed(2) : '--'} ${s.unit} (Unit: ${dataset.metadata.serialNumber})`);
        } else if (selectedSubsystem) {
          const label = SUBSYSTEM_LABELS[selectedSubsystem];
          const subChannels = Object.entries(dataset.parameterStats).filter(([_, s]) => s.category === selectedSubsystem);
          const subFailures = dataset.failures.filter(f => f.category === selectedSubsystem);
          const subChecks = subChannels.reduce((sum, [_, s]) => sum + s.totalChecks, 0);
          const subPass = subChecks - subFailures.length;
          const subRate = subChecks > 0 ? ((subPass / subChecks) * 100).toFixed(1) : '100.0';
          newLogs.push(`Subsystem: ${label} [${selectedSubsystem}] | Channels: ${subChannels.length} | Evaluated Checks: ${subChecks} | Violations: ${subFailures.length} | Pass Rate: ${subRate}% | Verdict: ${subFailures.length === 0 ? 'PASS' : 'FAIL'} (Unit: ${dataset.metadata.serialNumber})`);
        } else {
          newLogs.push(`Unit: ${dataset.metadata.serialNumber} | WO: ${dataset.metadata.workOrderNumber} | Result: ${dataset.metadata.finalResult} (${dataset.passRate}% passed across ${Object.keys(dataset.parameterStats).length} channels)`);
        }
      } else {
        newLogs.push('No workbook currently loaded. Use File > Open to load an Excel test file.');
      }
    } else if (cmd === 'audit') {
      if (dataset) {
        onRunAudit();
        newLogs.push(`Re-running 3-sigma SPC tolerance engine across ${dataset.totalEvaluated} evaluation points.`);
      } else {
        newLogs.push('No active dataset to audit.');
      }
    } else if (cmd === 'failed') {
      if (dataset) {
        if (selectedSensor) {
          const failures = dataset.failures.filter(f => f.parameter === selectedSensor);
          if (failures.length > 0) {
            newLogs.push(`Excursions for '${selectedSensor}': ${failures.length} stage points:`);
            failures.forEach(f => {
              newLogs.push(`  - Stage at t = ${f.timeSec}s: Measured ${f.measured} ${f.unit} vs [${f.lowLimit?.toFixed(2)} ~ ${f.highLimit?.toFixed(2)}] (Deficit: ${f.marginBuffer?.toFixed(2)} ${f.unit})`);
            });
          } else {
            newLogs.push(`No excursions found for '${selectedSensor}'. All stages within ±3σ limits.`);
          }
        } else if (selectedSubsystem) {
          const label = SUBSYSTEM_LABELS[selectedSubsystem];
          const subFailures = dataset.failures.filter(f => f.category === selectedSubsystem);
          if (subFailures.length > 0) {
            newLogs.push(`Failures in [${label}] — ${subFailures.length} excursions across ${new Set(subFailures.map(f => f.parameter)).size} channels:`);
            subFailures.forEach(f => {
              newLogs.push(`  - ${f.parameter} (t=${f.timeSec}s): Measured ${f.measured} ${f.unit} vs [${f.lowLimit?.toFixed(2)} ~ ${f.highLimit?.toFixed(2)}] (Deficit: ${f.marginBuffer?.toFixed(2)} ${f.unit})`);
            });
          } else {
            newLogs.push(`Zero excursions in [${label}]. All channels 100% compliant with ±3σ limits.`);
          }
        } else {
          newLogs.push(`Total Violations: ${dataset.failedCount} across ${dataset.failures.length} evaluation points:`);
          const uniqueFailed = Array.from(new Set(dataset.failures.map(f => f.parameter)));
          uniqueFailed.forEach(p => newLogs.push(`  - ${p}`));
        }
      } else {
        newLogs.push('No active dataset loaded.');
      }
    } else if (cmd === 'export') {
      if (dataset) {
        onExport();
        newLogs.push(`Exporting formatted quality workbook: EagleEye_Report_${dataset.metadata.serialNumber}.xlsx`);
      } else {
        newLogs.push('No active dataset to export.');
      }
    } else if (cmd === 'clear') {
      setCustomConsoleLogs([]);
      setCmdInput('');
      return;
    } else {
      newLogs.push(`Command not recognized: '${cmd}'. Type 'help' for available diagnostic commands.`);
    }

    setCustomConsoleLogs(newLogs);
    setCmdInput('');
  };

  return (
    <section 
      className={`cad-dock-panel cad-terminal-dock ${isExpanded ? 'expanded' : ''}`}
      aria-label="Diagnostic Terminal and Messages"
    >
      {/* Terminal Title Bar & Tabs */}
      <div className="cad-terminal-header">
        <div className="cad-terminal-tabs">
          <button 
            className={`cad-term-tab ${activeTab === 'build' ? 'active' : ''}`}
            onClick={() => setActiveTab('build')}
          >
            <TerminalIcon size={13} />
            <span>Messages</span>
          </button>
          <button 
            className={`cad-term-tab ${activeTab === 'modbus' ? 'active' : ''}`}
            onClick={() => setActiveTab('modbus')}
          >
            <Cpu size={13} />
            <span>Modbus Telemetry Stream</span>
          </button>
          <button 
            className={`cad-term-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <span>Diagnostic Console</span>
          </button>
          <button 
            className={`cad-term-tab ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            <span>Terminal Log</span>
          </button>
        </div>

        {/* Status Chips */}
        <div className="cad-terminal-status-chips">
          {selectedSensor ? (
            <>
              <span className={`cad-term-chip ${warnCount > 0 ? 'chip-warn' : 'chip-pass'}`}>
                {warnCount} Excursions
              </span>
              <span className="cad-term-chip chip-info">
                {messages.length} Messages
              </span>
              <span className="cad-term-chip chip-scope" title={`Filtered to test: ${selectedSensor}`}>
                Test: {selectedSensor}
              </span>
              <button 
                type="button"
                className="cad-term-chip-btn" 
                title="Show Entire Unit Logs"
                onClick={() => {
                  onSelectSensor(null);
                  if (onSelectSubsystem) onSelectSubsystem(null);
                }}
              >
                ✕ Show All Unit
              </button>
            </>
          ) : selectedSubsystem ? (
            <>
              <span className={`cad-term-chip ${warnCount > 0 ? 'chip-warn' : 'chip-pass'}`}>
                {warnCount} Excursions
              </span>
              <span className="cad-term-chip chip-info">
                {filteredMessages.length} Messages
              </span>
              <span className="cad-term-chip chip-scope" title={`Isolated Subsystem: ${SUBSYSTEM_LABELS[selectedSubsystem]}`}>
                Scope: {SUBSYSTEM_LABELS[selectedSubsystem]}
              </span>
              <button 
                type="button"
                className="cad-term-chip-btn" 
                title="Show Entire Unit Logs"
                onClick={() => {
                  if (onSelectSubsystem) onSelectSubsystem(null);
                }}
              >
                ✕ Show All Unit
              </button>
            </>
          ) : (
            <>
              <span className="cad-term-chip chip-error">
                {errorCount} Errors
              </span>
              <span className={`cad-term-chip ${warnCount > 0 ? 'chip-warn' : ''}`}>
                {warnCount} Warnings
              </span>
              <span className="cad-term-chip chip-info">
                {dataset ? dataset.totalEvaluated : 0} Messages
              </span>
              {dataset && (
                <span className="cad-term-chip chip-sheet">
                  Unit: {dataset.metadata.serialNumber}
                </span>
              )}
            </>
          )}
        </div>

        {/* Window Controls */}
        <div className="cad-terminal-actions">
          <button 
            className="cad-dock-btn" 
            title={isExpanded ? 'Restore Terminal' : 'Maximize Terminal'}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button 
            className="cad-dock-btn cad-dock-btn-close" 
            title="Close Terminal Panel (Ctrl+3)"
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Compiler Filter Bar */}
      <div className="cad-terminal-filterbar">
        <div className="cad-compiler-filters">
          <span className="cad-filter-label">Filter:</span>
          <button 
            className={`cad-cfilter-btn ${filterLevel === 'all' ? 'active' : ''}`}
            onClick={() => setFilterLevel('all')}
          >
            All ({(activeTab === 'modbus' ? modbusStreamEntries : messages).length})
          </button>
          <button 
            className={`cad-cfilter-btn ${filterLevel === 'info' ? 'active' : ''}`}
            onClick={() => setFilterLevel('info')}
          >
            Info ({infoCount})
          </button>
          <button 
            className={`cad-cfilter-btn cad-cfilter-warn ${filterLevel === 'warn' ? 'active' : ''}`}
            onClick={() => setFilterLevel('warn')}
          >
            {selectedSensor ? `Excursions (${warnCount})` : selectedSubsystem ? `Excursions (${warnCount})` : `Warnings (${warnCount})`}
          </button>
          <button 
            className={`cad-cfilter-btn cad-cfilter-error ${filterLevel === 'error' ? 'active' : ''}`}
            onClick={() => setFilterLevel('error')}
          >
            Errors ({errorCount})
          </button>
        </div>

        <div className="cad-terminal-search-wrap">
          <Search size={11} className="cad-tsearch-icon" />
          <input
            type="text"
            className="cad-terminal-search"
            placeholder="Filter Output (PT11, DP, 3σ)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button className="cad-tsearch-clear" onClick={() => setSearchText('')}>✕</button>
          )}
        </div>

        <div className="cad-terminal-tool-btns">
          <button 
            className="cad-ttool-btn" 
            onClick={handleCopyLogs}
            title="Copy Terminal Messages to Clipboard"
          >
            <Copy size={12} />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          {dataset && (
            <button 
              className="cad-ttool-btn" 
              onClick={onRunAudit}
              title="Re-run Diagnostics"
            >
              <RefreshCw size={12} />
              <span>Re-run</span>
            </button>
          )}
          <button 
            className="cad-ttool-btn" 
            onClick={() => {
              setSearchText('');
              setFilterLevel('all');
              setCustomConsoleLogs([]);
            }}
            title="Clear Filter / Logs"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Log Output Body */}
      <div className="cad-terminal-body" ref={logScrollRef}>
        {activeTab === 'raw' ? (
          <div className="cad-raw-log-view font-mono">
            {dataset ? (
              selectedSensor && dataset.parameterStats[selectedSensor] ? (
                <>
                  <div className="cad-raw-line">Channel Test: {selectedSensor} ({dataset.parameterStats[selectedSensor].category.toUpperCase()})</div>
                  <div className="cad-raw-line text-cyan">Unit: {dataset.parameterStats[selectedSensor].unit} | Process Mean μ: {dataset.parameterStats[selectedSensor].nominalMean !== null ? `${dataset.parameterStats[selectedSensor].nominalMean.toFixed(2)} ${dataset.parameterStats[selectedSensor].unit}` : '--'} | 3σ Span: ±{dataset.parameterStats[selectedSensor].threeSigmaSpan !== null ? `${dataset.parameterStats[selectedSensor].threeSigmaSpan.toFixed(2)} ${dataset.parameterStats[selectedSensor].unit}` : '--'}</div>
                  <div className={`cad-raw-line ${dataset.parameterStats[selectedSensor].failCount > 0 ? 'text-yellow' : 'text-green'}`}>
                    Excursions across 10 stages: {dataset.parameterStats[selectedSensor].failCount} out-of-tolerance
                  </div>
                  <div className="cad-raw-line">
                    Settling (525s): {dataset.parameterStats[selectedSensor].settling !== null ? `${dataset.parameterStats[selectedSensor].settling.toFixed(2)} ${dataset.parameterStats[selectedSensor].unit}` : '--'} | Peak: {dataset.parameterStats[selectedSensor].peak !== null ? `${dataset.parameterStats[selectedSensor].peak.toFixed(2)} ${dataset.parameterStats[selectedSensor].unit}` : '--'} | Min: {dataset.parameterStats[selectedSensor].min !== null ? `${dataset.parameterStats[selectedSensor].min.toFixed(2)} ${dataset.parameterStats[selectedSensor].unit}` : '--'}
                  </div>
                  <div className={`cad-raw-line ${dataset.parameterStats[selectedSensor].failCount === 0 ? 'text-green' : 'text-red'}`}>
                    Test Verdict: {dataset.parameterStats[selectedSensor].failCount === 0 ? 'Pass (100% compliant)' : `Fail (${dataset.parameterStats[selectedSensor].failCount} stage violations)`}
                  </div>
                </>
              ) : selectedSubsystem ? (
                <>
                  <div className="cad-raw-line">Diagnostic pipeline isolated to subsystem: {SUBSYSTEM_LABELS[selectedSubsystem]} ({dataset.metadata.serialNumber}, {dataset.metadata.workOrderNumber})</div>
                  <div className="cad-raw-line text-cyan">
                    Active channels: {Object.entries(dataset.parameterStats).filter(([_, s]) => s.category === selectedSubsystem).map(([n]) => n).join(', ')}
                  </div>
                  <div className="cad-raw-line text-yellow">
                    Subsystem excursions: {dataset.failures.filter(f => f.category === selectedSubsystem).length} points out-of-tolerance
                  </div>
                  <div className="cad-raw-line text-green">
                    Subsystem verdict: {dataset.failures.filter(f => f.category === selectedSubsystem).length === 0 ? 'PASS (100% compliant)' : 'FAIL (requires rework / physical inspection)'}
                  </div>
                </>
              ) : (
                <>
                  <div className="cad-raw-line">Diagnostic pipeline active for {dataset.metadata.serialNumber} ({dataset.metadata.workOrderNumber})</div>
                  <div className="cad-raw-line text-cyan">Evaluated {dataset.totalEvaluated} data points across {Object.keys(dataset.parameterStats).length} channels</div>
                  <div className="cad-raw-line text-yellow">Total out-of-tolerance excursions: {dataset.failedCount}</div>
                  <div className="cad-raw-line text-green">Final compliance rate: {dataset.passRate}% ({dataset.metadata.finalResult})</div>
                </>
              )
            ) : (
              <div className="cad-raw-line text-dim">Awaiting workbook ingestion. Open an .xlsx file to inspect telemetry log.</div>
            )}
          </div>
        ) : (
          <div className="cad-log-lines-container font-mono">
            {filteredMessages.map((msg) => {
              const isWarn = msg.level === 'warn';
              const isError = msg.level === 'error';
              const isModbus = msg.level === 'modbus';

              return (
                <div 
                  key={msg.id} 
                  className={`cad-log-line ${msg.level}`}
                >
                  <span className={`cad-log-level-badge badge-${msg.level}`}>
                    {isError ? 'ERR' : isWarn ? 'WARN' : isModbus ? 'MODBUS' : 'INFO'}
                  </span>
                  <span className="cad-log-cat">[{msg.category}]</span>
                  <span className="cad-log-text">
                    {msg.text}
                    {msg.parameter && (
                      <button 
                        className="cad-log-link-btn"
                        onClick={() => onSelectSensor(msg.parameter!)}
                        title={`Inspect ${msg.parameter} in Scope`}
                      >
                        [Inspect Channel]
                      </button>
                    )}
                  </span>
                </div>
              );
            })}

            {/* Custom interactive console logs */}
            {customConsoleLogs.map((cl, i) => (
              <div key={`cl-${i}`} className="cad-log-line info custom-cmd">
                <span className="cad-log-level-badge badge-info">CLI</span>
                <span className="cad-log-text text-cyan">{cl}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Command Input Prompt */}
      <form className="cad-terminal-prompt-bar" onSubmit={handleExecuteCommand}>
        <span className="cad-prompt-label">eagle-eye &gt;</span>
        <input
          type="text"
          className="cad-prompt-input font-mono"
          placeholder="Type diagnostic command ('help', 'status', 'subsystem', 'failed', 'audit', 'export')..."
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
        />
        <div className="cad-prompt-quick-tags">
          <button type="button" className="cad-qtag" onClick={() => setCmdInput('status')}>status</button>
          <button type="button" className="cad-qtag" onClick={() => setCmdInput('failed')}>failed</button>
          <button type="button" className="cad-qtag" onClick={() => setCmdInput('subsystem')}>subsystem</button>
          <button type="button" className="cad-qtag" onClick={() => setCmdInput('audit')}>audit</button>
          <button type="button" className="cad-qtag" onClick={() => setCmdInput('export')}>export</button>
        </div>
      </form>
    </section>
  );
};

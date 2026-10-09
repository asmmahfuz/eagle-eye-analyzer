import { EagleEyeDataset, EvaluatedPoint, ParameterSummary, OperatingStage, SubsystemCategory } from '../types';
import { getCategory } from './parser';
import { decodeModbusTwosComplement, isModbusSentinel } from './registers/modbusDecoder';

interface RawParsedInput {
  metadata: EagleEyeDataset['metadata'];
  headers: string[];
  units: string[];
  unitMap: Record<string, string>;
  measurements: Record<string, any>[];
  decisions: Record<string, any>[];
  limits: EagleEyeDataset['limits'];
}

export function analyzeDataset(raw: RawParsedInput): EagleEyeDataset {
  const { metadata, headers, units, unitMap, measurements, decisions, limits } = raw;

  // Operating stages (10 standard stages based on unique timestamps)
  const times = measurements.map(m => m['Time']).filter(t => typeof t === 'number');
  const uniqueTimes = [...new Set(times)];

  const stages: OperatingStage[] = uniqueTimes.map((t, idx) => {
    const stageRows = measurements.filter(m => m['Time'] === t);
    return {
      stageNum: idx + 1,
      timeSec: t,
      flowSp: stageRows[0]?.['Secondary Flow Setpoint'] ?? null,
      dpSp: stageRows[0]?.['Secondary DP Setpoint'] ?? null,
      tempSp: stageRows[0]?.['Secondary Temperature Setpoint'] ?? null,
      sampleCount: stageRows.length,
      failCount: 0,
      isPass: true,
      failedSensors: []
    };
  });

  const evaluatedChecks: EvaluatedPoint[] = [];
  const failures: EvaluatedPoint[] = [];
  let totalEvaluated = 0;
  let passedCount = 0;
  let failedCount = 0;

  const categoryCounts: Record<SubsystemCategory, { pass: number; fail: number }> = {
    hydraulic: { pass: 0, fail: 0 },
    pump: { pass: 0, fail: 0 },
    temperature: { pass: 0, fail: 0 },
    pressure: { pass: 0, fail: 0 },
    environmental: { pass: 0, fail: 0 },
    system: { pass: 0, fail: 0 },
    setpoint: { pass: 0, fail: 0 },
    other: { pass: 0, fail: 0 }
  };

  // 1. Automatic 10x Normalizer for 0-10V Analog Signals (Pump Speeds & FCV Flow Control Valve)
  // When pump speed or valve signals are logged on a 0-10V analog representation (peak <= 10.5%),
  // normalize both measurements and baseline tolerance limits to true physical 0-100% engineering scale.
  const analogPercentageCols = headers.filter(h => {
    const lower = h.toLowerCase();
    return (
      (lower.includes('speed') && h.includes('%')) ||
      (lower.includes('fcv') && h.includes('%'))
    );
  });

  analogPercentageCols.forEach(col => {
    const maxVal = Math.max(...measurements.map(m => typeof m[col] === 'number' ? m[col] : 0));
    if (maxVal > 0 && maxVal <= 10.5) {
      // Scale measurements from 0-10V to 0-100%
      measurements.forEach(m => {
        if (typeof m[col] === 'number') {
          m[col] = Math.round(m[col] * 10 * 10) / 10;
        }
      });
      // Scale baseline tolerance limits
      (['mean-3Sigma', 'mean+3Sigma', 'min', 'max'] as const).forEach(k => {
        limits[k]?.forEach(row => {
          if (typeof row[col] === 'number') {
            // Only scale genuine physical bounds (ignore unconstrained limits like 6551.2)
            if (row[col] > -100 && row[col] < 500) {
              row[col] = Math.round(row[col] * 10 * 100) / 100;
            }
          }
        });
      });
    }
  });

  // 2. Modbus Two's Complement Integer Rollover Decoder for Pressure & DP Transmitters
  // Uses modular modbusDecoder (Invariant 9)
  const pressureCols = headers.filter(h => h.includes('DP') || h.startsWith('PT') || h.includes('PT'));
  pressureCols.forEach(col => {
    measurements.forEach(m => {
      const v = m[col];
      if (typeof v === 'number') {
        m[col] = decodeModbusTwosComplement(v);
      }
    });
  });

  // 3. Normalizer for Program Version (Modbus Reg 61 scaled 100x -> e.g. 23 -> 0.23)
  const pvCols = headers.filter(h => h.trim().toLowerCase().includes('program version') || h.trim().toLowerCase() === 'software version');
  pvCols.forEach(col => {
    measurements.forEach(m => {
      const v = m[col];
      if (typeof v === 'number' && v > 1) {
        m[col] = Number((v / 100).toFixed(2));
      }
    });
    (['mean-3Sigma', 'mean+3Sigma', 'min', 'max'] as const).forEach(k => {
      limits[k]?.forEach(row => {
        const v = row[col];
        if (typeof v === 'number' && v > 1) {
          row[col] = Number((v / 100).toFixed(2));
        }
      });
    });
  });

  // Evaluated range: All 30 time steps (indices 0 to 29 in measurements, matching indices 0 to 27 in limits)
  for (let mIdx = 0; mIdx < measurements.length; mIdx++) {
    const limitIdx = mIdx >= 2 ? Math.min(limits['mean-3Sigma'].length - 1, mIdx - 2) : 0;
    const mRow = measurements[mIdx];
    const dRow = decisions[mIdx] || {};
    const lowRow = limits['mean-3Sigma']?.[limitIdx] || {};
    const highRow = limits['mean+3Sigma']?.[limitIdx] || {};
    const minRow = limits['min']?.[limitIdx] || {};
    const maxRow = limits['max']?.[limitIdx] || {};

    const timeSec = mRow['Time'];
    const flowSp = mRow['Secondary Flow Setpoint'] ?? null;
    const dpSp = mRow['Secondary DP Setpoint'] ?? null;
    const tempSp = mRow['Secondary Temperature Setpoint'] ?? null;

    // Check every parameter column (skip Time at index 0)
    for (let c = 1; c < headers.length; c++) {
      const col = headers[c];
      const val = mRow[col];
      const dec = dRow[col];
      const low = lowRow[col];
      const high = highRow[col];
      const absMin = minRow[col];
      const absMax = maxRow[col];
      const unit = unitMap[col] || '';
      const cat = getCategory(col);

      totalEvaluated++;

      // Modbus Sentinel Check (0xFFFF = 65535 raw -> 6553.5 scaled) via Invariant 8
      const hasSentinel = isModbusSentinel(val);
      const isProgramVersion = col.trim().toLowerCase().includes('program version') || col.trim().toLowerCase() === 'software version';

      let isPass = true;
      if (hasSentinel) {
        isPass = false;
      } else if (isProgramVersion) {
        // Program version (Modbus Reg 61) is the embedded PLC application software revision (e.g. 0.23).
        // It is an informational firmware identity register, NOT a statistical process variable.
        // Excel templates often retain obsolete legacy baselines (e.g. 15 for v0.15) causing Decision = 0.
        // A valid, non-zero, non-sentinel version is always valid and PASSES.
        isPass = typeof val === 'number' ? val > 0 : (val !== null && val !== undefined && val !== '' && val !== '-');
      } else if (dec !== undefined && dec !== null) {
        isPass = dec === 1;
      } else if (typeof val === 'number') {
        if (typeof low === 'number' && typeof high === 'number') {
          isPass = val >= low && val <= high;
        } else if (typeof low === 'number') {
          isPass = val >= low;
        } else if (typeof high === 'number') {
          isPass = val <= high;
        }
      }

      let deltaLower: number | null = null;
      let deltaUpper: number | null = null;
      let marginBuffer: number | null = null;
      let bufferPercent = 100;
      let nominalMean: number | null = null;
      let processSigma: number | null = null;
      let threeSigmaSpan: number | null = null;
      let zScore: number | null = null;

      if (!isProgramVersion && typeof low === 'number' && typeof high === 'number') {
        nominalMean = (high + low) / 2;
        processSigma = (high - low) / 6;
        threeSigmaSpan = (high - low) / 2;
        if (typeof val === 'number') {
          if (processSigma > 0.000001) {
            zScore = (val - nominalMean) / processSigma;
          } else {
            zScore = val === nominalMean ? 0 : (val > nominalMean ? 99 : -99);
          }
        }
      }

      if (!isProgramVersion && typeof val === 'number' && typeof low === 'number' && typeof high === 'number') {
        deltaLower = val - low;
        deltaUpper = high - val;
        marginBuffer = Math.min(deltaLower, deltaUpper);
        const span = high - low;
        if (span > 0) {
          bufferPercent = Math.max(0, Math.min(100, (marginBuffer / (span / 2)) * 100));
        }
      }

      let status: 'pass' | 'fail' | 'warn' = 'pass';
      if (!isPass) {
        status = 'fail';
        failedCount++;
        categoryCounts[cat].fail++;
      } else {
        passedCount++;
        categoryCounts[cat].pass++;
        if (!isProgramVersion && marginBuffer !== null && bufferPercent < 15) {
          status = 'warn';
        }
      }

      // Format required range string
      let requiredRangeStr = 'N/A';
      if (isProgramVersion) {
        const verStr = metadata.softwareVersion && metadata.softwareVersion !== '-'
          ? metadata.softwareVersion
          : (typeof val === 'number' ? val.toFixed(2) : String(val));
        requiredRangeStr = `v${verStr}`;
      } else if (typeof low === 'number' && typeof high === 'number') {
        requiredRangeStr = `[${low.toFixed(2)} ${unit} ~ ${high.toFixed(2)} ${unit}]`;
      } else if (typeof low === 'number') {
        requiredRangeStr = `[≥ ${low.toFixed(2)} ${unit}]`;
      } else if (typeof high === 'number') {
        requiredRangeStr = `[≤ ${high.toFixed(2)} ${unit}]`;
      }

      // Format explicit reason of failure dynamically
      let failureReason: string | undefined = undefined;
      if (!isPass) {
        const zStr = zScore !== null ? ` (Z = ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)}σ)` : '';
        if (hasSentinel) {
          failureReason = `Modbus Hardware Fault: Sentinel value 6553.5 (0xFFFF raw 16-bit register) detected on ${col}. Transducer is disconnected, open-circuit, or uninitialized on the PLC bus.`;
        } else if (isProgramVersion) {
          failureReason = `PLC Firmware Uninitialized: Logged program version is invalid or zero (${val}).`;
        } else if (col.toLowerCase().includes('humidity')) {
          const limitTxt = high !== null && high !== undefined ? `${high.toFixed(1)}%` : 'specification upper limit';
          const deficitTxt = typeof val === 'number' && typeof high === 'number' ? ` (Excursion: +${(val - high).toFixed(1)}%)` : '';
          failureReason = `Ambient Humidity (${val}%) exceeded test bay cleanroom threshold (${limitTxt})${deficitTxt}${zStr}.`;
        } else if (deltaLower !== null && deltaLower < 0) {
          failureReason = `Reading ${typeof val === 'number' ? val.toFixed(2) : val} ${unit} is ${Math.abs(deltaLower).toFixed(2)} ${unit} BELOW the required lower margin (${low !== null ? low.toFixed(2) : ''} ${unit}). Deficit: ${deltaLower.toFixed(2)} ${unit}${zStr}.`;
        } else if (deltaUpper !== null && deltaUpper < 0) {
          failureReason = `Reading ${typeof val === 'number' ? val.toFixed(2) : val} ${unit} is ${Math.abs(deltaUpper).toFixed(2)} ${unit} ABOVE the required upper margin (${high !== null ? high.toFixed(2) : ''} ${unit}). Deficit: ${deltaUpper.toFixed(2)} ${unit}${zStr}.`;
        } else {
          failureReason = `Parameter ${col} failed specification check at ${timeSec}s (measured: ${val ?? 'N/A'})${zStr}.`;
        }
      }

      const point: EvaluatedPoint = {
        mIdx,
        limitIdx,
        timeSec,
        flowSp,
        dpSp,
        tempSp,
        parameter: col,
        category: cat,
        unit,
        measured: val,
        lowLimit: low,
        highLimit: high,
        nominalMean,
        processSigma,
        threeSigmaSpan,
        zScore,
        absMin,
        absMax,
        deltaLower,
        deltaUpper,
        marginBuffer,
        bufferPercent,
        status,
        isPass,
        failureReason,
        requiredRangeStr
      };

      evaluatedChecks.push(point);

      if (!isPass) {
        failures.push(point);
        // Track on stage
        const stage = stages.find(s => s.timeSec === timeSec);
        if (stage) {
          stage.failCount++;
          stage.isPass = false;
          if (!stage.failedSensors.includes(col)) {
            stage.failedSensors.push(col);
          }
        }
      }
    }
  }

  // Calculate Parameter Summaries (Peak, Min, Settling, Range)
  const parameterStats: Record<string, ParameterSummary> = {};
  headers.slice(1).forEach(col => {
    const isPv = col.trim().toLowerCase().includes('program version') || col.trim().toLowerCase() === 'software version';
    const vals = measurements.map(m => m[col]).filter(v => typeof v === 'number');
    // Exclude 6553.5 Modbus sentinels (0xFFFF) so peak/min represent true physical values
    const validPhysicalVals = vals.filter(v => !isModbusSentinel(v));
    const statsVals = validPhysicalVals.length > 0 ? validPhysicalVals : vals;
    const peak = statsVals.length > 0 ? Math.max(...statsVals) : null;
    const min = statsVals.length > 0 ? Math.min(...statsVals) : null;
    let settling = measurements.length > 0 ? measurements[measurements.length - 1][col] : null;
    if (isModbusSentinel(settling) && validPhysicalVals.length > 0) {
      settling = validPhysicalVals[validPhysicalVals.length - 1];
    }

    const sensorChecks = evaluatedChecks.filter(c => c.parameter === col);

    if (isPv) {
      const verStr = metadata.softwareVersion && metadata.softwareVersion !== '-'
        ? metadata.softwareVersion
        : (settling !== null ? (typeof settling === 'number' ? settling.toFixed(2) : String(settling)) : '0.23');
      parameterStats[col] = {
        name: col,
        category: getCategory(col),
        unit: unitMap[col] || '',
        peak,
        min,
        settling,
        worstMargin: null,
        nominalMean: null,
        processSigma: null,
        low3Sigma: null,
        high3Sigma: null,
        threeSigmaSpan: null,
        maxZScore: null,
        totalChecks: sensorChecks.length,
        failCount: 0,
        warnCount: 0,
        status: 'pass',
        requiredRangeSample: `v${verStr}`
      };
      return;
    }

    let worstMargin: number | null = null;
    let failCount = 0;
    let warnCount = 0;

    sensorChecks.forEach(c => {
      if (c.status === 'fail') failCount++;
      if (c.status === 'warn') warnCount++;
      if (c.marginBuffer !== null) {
        if (worstMargin === null || c.marginBuffer < worstMargin) {
          worstMargin = c.marginBuffer;
        }
      }
    });

    const sampleCheck = sensorChecks[0];
    const sampleRange = sampleCheck ? sampleCheck.requiredRangeStr || 'N/A' : 'N/A';

    // Settling steady-state check (at 525s cooldown)
    const settlingCheck = sensorChecks[sensorChecks.length - 1] || sampleCheck;
    const nominalMean = settlingCheck?.nominalMean ?? null;
    const processSigma = settlingCheck?.processSigma ?? null;
    const low3Sigma = settlingCheck?.lowLimit ?? null;
    const high3Sigma = settlingCheck?.highLimit ?? null;
    const threeSigmaSpan = settlingCheck?.threeSigmaSpan ?? null;

    let maxZScore: number | null = null;
    sensorChecks.forEach(c => {
      if (c.zScore !== null) {
        const absZ = Math.abs(c.zScore);
        if (maxZScore === null || absZ > maxZScore) {
          maxZScore = absZ;
        }
      }
    });

    parameterStats[col] = {
      name: col,
      category: getCategory(col),
      unit: unitMap[col] || '',
      peak,
      min,
      settling,
      worstMargin,
      nominalMean,
      processSigma,
      low3Sigma,
      high3Sigma,
      threeSigmaSpan,
      maxZScore,
      totalChecks: sensorChecks.length,
      failCount,
      warnCount,
      status: failCount > 0 ? 'fail' : (warnCount > 0 ? 'warn' : 'pass'),
      requiredRangeSample: sampleRange
    };
  });

  const passRate = totalEvaluated > 0 ? ((passedCount / totalEvaluated) * 100).toFixed(2) : '0.00';

  return {
    metadata: {
      ...metadata,
      finalResult: failedCount === 0 ? 'Pass' : 'Fail'
    },
    headers,
    units,
    unitMap,
    measurements,
    decisions,
    limits,
    evaluatedChecks,
    failures,
    parameterStats,
    stages,
    totalEvaluated,
    passedCount,
    failedCount,
    passRate,
    categoryCounts
  };
}

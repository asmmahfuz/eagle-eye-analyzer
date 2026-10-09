import { CduModelId } from '../models/modelTypes';
import { CHX2000_READ_REGISTERS } from '../registers/chx2000Registers';
import { PROGRAMMED_EXCITATION_STAGES } from '../excitation/excitationSchedule';

/**
 * High-Fidelity Physics-Calibrated Simulation Engine for CoolIT CDU Test Bays
 * Models all 50 PLC channels based on model profile, stage excitation setpoints,
 * hydraulic loop impedance, and thermodynamic heat transfer.
 * Target size: 160-220 lines (Invariant 11 compliant)
 */

export interface SimulatedStageOutput {
  stageNum: number;
  timeSec: number;
  setpoints: { temp: number; dp: number; flow: number };
  readings: Record<string, number>;
  rawRegisters: Record<number, number>;
  logLines: string[];
}

export function simulateCduStageOutput(
  modelId: CduModelId,
  stageIndex: number,
  jitterSeed: number = 0
): SimulatedStageOutput {
  const stage = PROGRAMMED_EXCITATION_STAGES[Math.min(stageIndex, PROGRAMMED_EXCITATION_STAGES.length - 1)];
  const { tempSp, dpSp, flowSp, timeSec, stageNum } = stage;

  // Pseudo-random deterministic noise based on timeSec + seed
  const noise = (offset: number) => {
    const x = Math.sin(timeSec * 1.33 + offset * 7.77 + jitterSeed) * 10000;
    return (x - Math.floor(x) - 0.5) * 0.4;
  };

  const readings: Record<string, number> = {};
  const rawRegisters: Record<number, number> = {};
  const logLines: string[] = [];

  // 1. Basic Status & Discrete Inputs
  readings['Status (0-off 1-on)'] = 1;
  readings['Group (0-standalone 1-Group lead 2-Group follow)'] = 0;
  readings['Program version'] = 0.23;

  // 2. Hydraulic & Flow Channels
  // FT01: Primary secondary loop feedback tracking flowSp
  const ft01Val = flowSp > 0 ? Math.max(0, flowSp + noise(1) * 2.5) : 0;
  readings['FT01'] = Number(ft01Val.toFixed(1));

  // FT61: Primary facility water loop flow
  const ft61Val = flowSp > 0 ? Number((ft01Val * 0.94 + noise(2) * 3).toFixed(1)) : 0;
  readings['FT61'] = ft61Val;

  // Secondary DP: Loop differential pressure tracking dpSp
  const secDpVal = dpSp > 0 ? Math.max(0, dpSp + noise(3) * 0.3) : 0;
  readings['Secondary DP (Supply - Return)'] = Number(secDpVal.toFixed(1));

  // Primary DP: Encodes Modbus unsigned 16-bit negative DP rollover at low DP (6544.9 -> -8.7 psi)
  const isNegativeDpStage = stageNum === 1 || stageNum === 2 || stageNum === 10;
  const primDpVal = isNegativeDpStage ? -8.7 + noise(4) * 0.2 : Number((dpSp * 0.72 + noise(4) * 0.4).toFixed(1));
  readings['Primary DP (Supply - Return)'] = Number(primDpVal.toFixed(1));

  // Filter DPs
  readings['Pump 31 Filter DP'] = Number((0.8 + flowSp * 0.003 + noise(5) * 0.1).toFixed(2));
  readings['Pump 41 Filter DP'] = Number((0.75 + flowSp * 0.003 + noise(6) * 0.1).toFixed(2));
  readings['Primary Filter 53 DP'] = Number((1.2 + flowSp * 0.004 + noise(7) * 0.1).toFixed(2));

  // 3. Pump Speeds & VFD Actuators (Physical 56% - 99%)
  // In raw PLC registers, 0-10V analog is 5.7 to 9.9
  const baseSpeedPct = flowSp === 0 ? 0 : Math.min(99.0, Math.max(56.0, 56.0 + (flowSp / 560) * 43.0 + noise(8)));
  readings['P31 Speed %'] = Number(baseSpeedPct.toFixed(1));
  readings['P41 Speed %'] = modelId === 'CHx1000' ? 0 : Number((baseSpeedPct * 0.995 + noise(9) * 0.2).toFixed(1));

  // FCV61 Modulating bypass valve feedback
  const fcvOpen = flowSp > 0 ? Math.min(100, Math.max(20, (flowSp / 560) * 100 + noise(10) * 1.5)) : 0;
  readings['FCV61 Actual Open%'] = Number(fcvOpen.toFixed(1));
  readings['FCV61 Actual Flow%'] = Number((fcvOpen * 0.98 + noise(11)).toFixed(1));

  // 4. Thermal Loop Transmitters (TT01..TT62)
  const tt01Val = tempSp + noise(12) * 0.15;
  const tt02Val = tt01Val + (flowSp > 0 ? 3.5 + noise(13) * 0.2 : 0.2); // Heat load delta
  readings['TT01'] = Number(tt01Val.toFixed(1));
  readings['TT02'] = Number(tt02Val.toFixed(1));
  readings['TT31'] = Number((tt01Val + 0.4 + noise(14) * 0.1).toFixed(1));
  readings['TT41'] = Number((tt01Val + 0.5 + noise(15) * 0.1).toFixed(1));
  readings['TT61'] = Number((18.5 + (tempSp - 21) * 0.5 + noise(16) * 0.2).toFixed(1));
  readings['TT62'] = Number((readings['TT61'] + (flowSp > 0 ? 4.2 : 0.5) + noise(17) * 0.2).toFixed(1));
  readings['TT51'] = Number((tt01Val + 0.1 + noise(18) * 0.1).toFixed(1));
  readings['TT52'] = Number((tt01Val + 0.2 + noise(19) * 0.1).toFixed(1));
  readings['TT45'] = Number((24.2 + (tempSp - 21) * 0.4 + noise(20) * 0.2).toFixed(1));

  // Temperature Deltas
  readings['TT01/TT02'] = Number((readings['TT01'] - readings['TT02']).toFixed(2));
  readings['TT31/TT41'] = Number((readings['TT31'] - readings['TT41']).toFixed(2));
  readings['TT61/TT62'] = Number((readings['TT61'] - readings['TT62']).toFixed(2));
  readings['TT51/TT52'] = Number((readings['TT51'] - readings['TT52']).toFixed(2));

  // 5. Pressure Transmitters (PT01..PT62)
  const pt01Val = 45.0 + secDpVal * 0.6 + noise(21) * 0.4;
  const pt02Val = pt01Val - secDpVal;
  readings['PT01'] = Number(pt01Val.toFixed(1));
  readings['PT02'] = Number(pt02Val.toFixed(1));
  readings['PT31'] = Number((pt02Val - 1.2 + noise(22) * 0.2).toFixed(1));
  readings['PT41'] = Number((pt02Val - 1.1 + noise(23) * 0.2).toFixed(1));
  readings['PT32'] = Number((pt01Val + 2.5 + noise(24) * 0.3).toFixed(1));
  readings['PT42'] = Number((pt01Val + 2.4 + noise(25) * 0.3).toFixed(1));
  readings['PT21'] = Number((pt01Val - 0.5 + noise(26) * 0.2).toFixed(1));

  // PT11: Reservoir pressure (includes -0.1 psi vacuum or 6553.5 sentinel)
  readings['PT11'] = -0.1; // Normal physical vacuum

  readings['PT51'] = Number((38.0 + noise(27) * 0.3).toFixed(1));
  readings['PT52'] = Number((readings['PT51'] - readings['Primary Filter 53 DP']).toFixed(1));
  readings['PT53'] = Number((readings['PT52'] - 0.5 + noise(28) * 0.1).toFixed(1));
  readings['PT61'] = Number((42.0 + noise(29) * 0.3).toFixed(1));
  readings['PT62'] = Number((readings['PT61'] - Math.abs(primDpVal)).toFixed(1));

  readings['PT01/PT02'] = Number((readings['PT01'] - readings['PT02']).toFixed(2));
  readings['PT32/PT42'] = Number((readings['PT32'] - readings['PT42']).toFixed(2));
  readings['PT61/PT62'] = Number((readings['PT61'] - readings['PT62']).toFixed(2));
  readings['PT51/PT52'] = Number((readings['PT51'] - readings['PT52']).toFixed(2));

  // 6. Environmental & Ambient
  readings['Air Humidity'] = Number((44.5 + noise(30) * 1.2).toFixed(1));
  readings['Air Temperature'] = Number((22.4 + noise(31) * 0.3).toFixed(1));

  // 7. Write Setpoints
  readings['Secondary Temperature Setpoint'] = tempSp;
  readings['Secondary DP Setpoint'] = dpSp;
  readings['Secondary Flow Setpoint'] = flowSp;

  // 8. Convert to Raw 16-Bit Holding Registers matching Modbus Table
  CHX2000_READ_REGISTERS.forEach(reg => {
    const val = readings[reg.displayName] ?? 0;
    if (reg.displayName === 'Primary DP (Supply - Return)' && primDpVal < 0) {
      // Modbus unsigned 16-bit rollover: (val * 10) + 65536
      rawRegisters[reg.address] = Math.round(65536 + primDpVal * 10);
    } else {
      rawRegisters[reg.address] = Math.round(val * reg.scaling);
    }
  });

  // Write holding registers 200, 201, 202
  rawRegisters[200] = Math.round(tempSp * 10);
  rawRegisters[201] = Math.round(dpSp * 10);
  rawRegisters[202] = Math.round(flowSp * 10);

  logLines.push(
    `[PLC WRITE] Reg 200 (Temp SP) = ${tempSp}°C | Reg 201 (DP SP) = ${dpSp} psi | Reg 202 (Flow SP) = ${flowSp} LPM`,
    `[PLC READ] Modbus Holding Regs 0-61 polled (49 active channels)`,
    `[TELEMETRY] t=${timeSec}s: Flow=${readings['FT01']} LPM, DP=${readings['Secondary DP (Supply - Return)']} psi, P31=${readings['P31 Speed %']}%, Supply Temp=${readings['TT01']}°C`
  );

  return {
    stageNum,
    timeSec,
    setpoints: { temp: tempSp, dp: dpSp, flow: flowSp },
    readings,
    rawRegisters,
    logLines
  };
}

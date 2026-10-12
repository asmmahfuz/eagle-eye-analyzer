import React, { useState, useEffect, useMemo } from 'react';
import { EagleEyeDataset } from '../../../types';
import { StageDynamicsMetrics, formatDelta } from './dynamicsTypes';
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Power,
  Users,
  Menu,
  Bell,
  RotateCcw
} from '../../Icons';

export interface CduFlowSchematicProps {
  metrics: StageDynamicsMetrics;
  dataset?: EagleEyeDataset | null;
  selectedSensor?: string | null;
  onSelectSensor?: (sensor: string | null) => void;
}

export const CduFlowSchematic: React.FC<CduFlowSchematicProps> = ({
  metrics,
  dataset,
  selectedSensor,
  onSelectSensor
}) => {
  const [isPowerOn, setIsPowerOn] = useState<boolean>(true);
  const [animateFlow, setAnimateFlow] = useState<boolean>(true);

  // React to application-wide data-theme changes (Light vs Dark)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const updateTheme = () => {
      setCurrentTheme(document.documentElement.getAttribute('data-theme') || 'light');
    };
    updateTheme();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const isDark = currentTheme === 'dark';

  // Dynamic Theme Colors for SVG Canvas & Elements
  const c = {
    priStream: isDark ? '#38bdf8' : '#0284c7',
    secStream: isDark ? '#22d3ee' : '#0891b2',
    priTitle: isDark ? '#38bdf8' : '#0284c7',
    secTitle: isDark ? '#22d3ee' : '#0891b2',
    textMain: isDark ? '#ffffff' : '#0f172a',
    textDim: isDark ? '#cbd5e1' : '#334155',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    textAccentPri: isDark ? '#38bdf8' : '#0284c7',
    textAccentSec: isDark ? '#22d3ee' : '#0891b2',
    textFail: isDark ? '#f87171' : '#dc2626',
    pheShellStroke: isDark ? '#475569' : '#94a3b8',
    pheBadgeFill: isDark ? '#1e293b' : '#f1f5f9',
    pheBadgeStroke: isDark ? '#334155' : '#cbd5e1',
    pheBadgeText: isDark ? '#cbd5e1' : '#334155',
    pheBarrierFill: isDark ? '#64748b' : '#94a3b8',
    pheBarrierStroke: isDark ? '#94a3b8' : '#64748b',
    valveHousingFill: isDark ? '#0f172a' : '#ffffff',
    valveHousingStroke: isDark ? '#cbd5e1' : '#64748b',
    valveText: isDark ? '#cbd5e1' : '#334155',
    actuatorFill: isDark ? '#1e293b' : '#f1f5f9',
    actuatorStroke: isDark ? '#cbd5e1' : '#64748b',
    pumpHousingFill: isDark ? '#0f172a' : '#ffffff',
    pumpHousingStroke: isDark ? '#cbd5e1' : '#64748b',
    pumpHub: isDark ? '#e2e8f0' : '#64748b',
    tableBg: isDark ? '#0f172a' : '#ffffff',
    tableBorder: isDark ? '#475569' : '#cbd5e1',
    tableDivider: isDark ? '#334155' : '#e2e8f0',
    tableHeader: isDark ? '#94a3b8' : '#64748b',
    tableActualVal: isDark ? '#ffffff' : '#0f172a',
    tableSetpointVal: isDark ? '#cbd5e1' : '#334155',
    tableNaVal: isDark ? '#64748b' : '#94a3b8',
  };

  // Set of failed sensors for the active stage
  const stageFailedSensors = useMemo(() => {
    const failedSet = new Set<string>();
    if (!dataset) return failedSet;

    // 1. Check dataset.stages for the active stage
    const currentStage = dataset.stages?.find(
      s => s.stageNum === metrics.stageNum || s.timeSec === metrics.timeSec
    );
    if (currentStage?.failedSensors) {
      currentStage.failedSensors.forEach(s => {
        if (s) failedSet.add(s.trim());
      });
    }

    // 2. Check dataset.failures for evaluated failure points at this stage timestamp
    if (dataset.failures) {
      dataset.failures.forEach(f => {
        if (f.timeSec === metrics.timeSec && (f.status === 'fail' || !f.isPass)) {
          if (f.parameter) failedSet.add(f.parameter.trim());
        }
      });
    }

    return failedSet;
  }, [dataset, metrics.stageNum, metrics.timeSec]);

  // Helper to test if any candidate sensor key failed in this stage
  const isSensorFailed = (...keys: string[]): boolean => {
    if (stageFailedSensors.size === 0) return false;

    const normalize = (str: string) => str.toLowerCase().replace(/[\s_\-/%]/g, '');

    for (const key of keys) {
      if (stageFailedSensors.has(key)) return true;

      const normKey = normalize(key);
      for (const failed of stageFailedSensors) {
        if (failed === key) return true;
        const normFailed = normalize(failed);
        if (normKey === normFailed) return true;

        // If failed sensor is a compound (e.g. 'PT32/PT42' or 'TT31/TT41')
        if (failed.includes('/') || failed.includes(',')) {
          const parts = failed.split(/[/,]/).map(p => normalize(p));
          if (parts.includes(normKey)) return true;
        }
        // If key is a compound
        if (key.includes('/') || key.includes(',')) {
          const parts = key.split(/[/,]/).map(p => normalize(p));
          if (parts.includes(normFailed)) return true;
        }
      }
    }
    return false;
  };

  const handleNodeClick = (sensor: string) => {
    onSelectSensor?.(selectedSensor === sensor ? null : sensor);
  };

  // Safe metrics fallbacks
  const p31Speed = metrics.p31Speed ?? 0;
  const p41Speed = metrics.p41Speed ?? 0;
  const isPumpsRunning = (p31Speed > 0 || p41Speed > 0) && isPowerOn;
  const isFlowActive = (metrics.flow > 10 || metrics.primaryFlow > 10 || isPumpsRunning) && isPowerOn;

  // Pump impeller animation duration (faster when speed is higher)
  const p31Duration = p31Speed > 0 ? Math.max(0.4, 2.5 - (p31Speed / 100) * 2.0) : 0;
  const p41Duration = p41Speed > 0 ? Math.max(0.4, 2.5 - (p41Speed / 100) * 2.0) : 0;

  // Secondary Supply and Return temps
  const secSupplyT = metrics.secondarySupplyT ?? 21.9;
  const secReturnT = metrics.secondaryReturnT ?? 21.4;
  const priSupplyT = metrics.primarySupplyT ?? 21.6;
  const priReturnT = metrics.primaryReturnT ?? 21.6;

  // Deltas for secondary cards view
  const deltaDp = formatDelta(metrics.deltaDp, 'psi');
  const deltaPump = formatDelta(metrics.deltaPump, '%');
  const deltaFlow = formatDelta(metrics.deltaFlow, 'LPM');
  const deltaSuction = formatDelta(metrics.deltaSuction, 'psi');

  // Ambient & Unit ID
  const unitId = dataset?.metadata?.serialNumber || 'CD050L';
  const ambientT = metrics.ambientT && metrics.ambientT > 0 ? metrics.ambientT : 21.3;
  const ambientRh = metrics.ambientRh && metrics.ambientRh > 0 ? metrics.ambientRh : 44.2;
  const dewpoint = metrics.dewpoint ?? 8.6;

  return (
    <div className="cad-schematic-wrapper">
      {/* Compact Schematic Header Action Strip */}
      <div className="cad-schematic-header">
        <div className="cad-schematic-title-group">
          <Sliders size={12} className="text-cyan" />
          <span className="cad-schematic-compact-title font-bold">CoolIT Systems™ CDU Flow Schematic & Loop Mimic</span>
          <span className="cad-schematic-badge font-mono">Stage {metrics.stageNum} ({metrics.timeSec}s)</span>
        </div>

        <div className="cad-schematic-actions">
          {metrics.airBleedWarning ? (
            <div className="cad-schematic-alert-tag warning font-mono animate-pulse" title="Check Step 7 Air Bleed / Moneo Scaling">
              <AlertTriangle size={11} className="text-amber" />
              <span>Air Bleed Deficit</span>
            </div>
          ) : (
            <div className="cad-schematic-alert-tag safe font-mono">
              <CheckCircle2 size={11} className="text-emerald" />
              <span>Vented & Sealed</span>
            </div>
          )}

          <div className="cad-hmi-view-toggles">
            <button
              type="button"
              className={`cad-hmi-flow-toggle ${animateFlow ? 'active' : ''}`}
              onClick={() => setAnimateFlow(!animateFlow)}
              title={animateFlow ? "Pause Fluid & Pump Animation" : "Resume Fluid & Pump Animation"}
            >
              {animateFlow ? '🌊 Flowing' : '⏸ Paused'}
            </button>
          </div>
        </div>
      </div>

      {/* Main CoolIT CDU Flow Mimic Schematic */}
      <div className="coolit-hmi-enclosure">
          <div className="coolit-hmi-screen">
            {/* 1. Touchscreen Top Navigation Bar */}
            <div className="coolit-hmi-topbar">
              <div className="coolit-hmi-top-left">
                <button
                  type="button"
                  className={`coolit-power-btn ${isPowerOn ? 'power-on' : 'power-off'}`}
                  onClick={() => setIsPowerOn(!isPowerOn)}
                  title={isPowerOn ? "CDU Powered Online (Click to Standby)" : "CDU in Standby (Click to Energize)"}
                >
                  <Power size={14} />
                </button>
                <div className="coolit-control-modes font-mono">
                  <div className="control-mode-row">
                    <span className="mode-label">Pump Mode:</span>
                    <span className={`mode-val ${isPumpsRunning ? 'text-cyan font-bold' : ''}`}>
                      {isPumpsRunning ? 'Online (Diff. Press)' : 'Offline'}
                    </span>
                  </div>
                  <div className="control-mode-row">
                    <span className="mode-label">Temp Mode:</span>
                    <span className={`mode-val ${metrics.modulatingValve > 0 && isPowerOn ? 'text-cyan font-bold' : ''}`}>
                      {metrics.modulatingValve > 0 && isPowerOn ? 'Online (PI)' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="coolit-hmi-top-right">
                <div className="coolit-hmi-icon-btn" title="Multi-Operator Access">
                  <Users size={14} />
                </div>
                <div className="coolit-hmi-icon-btn" title="Diagnostics & System Menu">
                  <Menu size={14} />
                </div>
              </div>
            </div>

            {/* 2. Interactive Animated SVG P&ID Canvas */}
            <div className="coolit-pid-svg-container">
              <svg
                viewBox="0 0 1000 480"
                className="coolit-pid-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Fluid flow animation markers & gradients */}
                  <linearGradient id="coolit-pri-flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="coolit-sec-flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="coolit-tank-grad-normal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#0284c7" : "#38bdf8"} />
                    <stop offset="100%" stopColor={isDark ? "#0369a1" : "#0284c7"} />
                  </linearGradient>
                  <linearGradient id="coolit-tank-grad-fail" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                  <linearGradient id="coolit-phe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#1e293b" : "#f8fafc"} />
                    <stop offset="50%" stopColor={isDark ? "#0f172a" : "#e2e8f0"} />
                    <stop offset="100%" stopColor={isDark ? "#1e293b" : "#f8fafc"} />
                  </linearGradient>

                  {/* Flow Arrow Heads */}
                  <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c.priStream} />
                  </marker>
                  <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c.secStream} />
                  </marker>
                  <marker id="arrow-white" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c.textMuted} />
                  </marker>
                </defs>

                {/* ============================================================
                    STATIC BASE PIPING (Solid dark background pipes)
                    Hydraulically isolated: Primary is 100% on left, Secondary 100% on right
                   ============================================================ */}
                {/* Primary Loop U-Circuit (Facility Water: top-left into PHE, curves down, out bottom-left) */}
                <path
                  d="M 30,140 L 250,140 Q 272,140 272,165 L 272,345 Q 272,370 250,370 L 30,370"
                  className="cdu-pipe-base"
                  fill="none"
                />

                {/* Secondary Loop Counter-Current Circuit (IT Coolant: in bottom-right, curves UP, out top-right to pumps) */}
                <path
                  d="M 960,370 L 330,370 Q 308,370 308,345 L 308,165 Q 308,140 330,140 L 570,140"
                  className="cdu-pipe-base"
                  fill="none"
                />

                {/* Dual Redundant Pumps Manifold Pipes */}
                {/* Branch split up to P41 */}
                <path d="M 570,140 L 590,140 L 590,85 L 680,85 L 680,140 L 710,140" className="cdu-pipe-base" fill="none" />
                {/* Branch split down to P31 */}
                <path d="M 570,140 L 590,140 L 590,195 L 680,195 L 680,140 L 710,140" className="cdu-pipe-base" fill="none" />

                {/* Secondary Supply to Server Racks */}
                <line x1="710" y1="140" x2="960" y2="140" className="cdu-pipe-base" />

                {/* Expansion Tank vertical branch & drain */}
                <line x1="440" y1="140" x2="440" y2="215" className="cdu-pipe-base" />
                <line x1="440" y1="295" x2="440" y2="330" className="cdu-pipe-base" />
                <line x1="440" y1="330" x2="530" y2="330" className="cdu-pipe-base" />

                {/* ============================================================
                    ANIMATED FLUID STREAMS (Overlay dashes with CSS flow animation)
                   ============================================================ */}
                {animateFlow && isFlowActive && (
                  <g className="cdu-animated-fluid-layer">
                    {/* Primary Loop Flow (Top-left in -> down PHE primary channel -> bottom-left out) */}
                    <path
                      d="M 30,140 L 250,140 Q 272,140 272,165 L 272,345 Q 272,370 250,370 L 30,370"
                      className="cdu-fluid-stream primary-loop-stream"
                      fill="none"
                    />

                    {/* Secondary Loop Flow (Bottom-right in -> UP PHE secondary channel -> top-right out to pumps) */}
                    <path
                      d="M 960,370 L 330,370 Q 308,370 308,345 L 308,165 Q 308,140 330,140 L 570,140"
                      className="cdu-fluid-stream secondary-loop-stream"
                      fill="none"
                    />

                    {/* Secondary Pump P41 Branch Flow */}
                    {p41Speed > 0 && (
                      <path
                        d="M 570,140 L 590,140 L 590,85 L 680,85 L 680,140 L 710,140"
                        className="cdu-fluid-stream secondary-pump-stream"
                        fill="none"
                      />
                    )}

                    {/* Secondary Pump P31 Branch Flow */}
                    {p31Speed > 0 && (
                      <path
                        d="M 570,140 L 590,140 L 590,195 L 680,195 L 680,140 L 710,140"
                        className="cdu-fluid-stream secondary-pump-stream"
                        fill="none"
                      />
                    )}

                    {/* Secondary Supply Flow to IT Load (Left to Right) */}
                    <line
                      x1="710" y1="140" x2="960" y2="140"
                      className="cdu-fluid-stream secondary-pump-stream"
                    />
                  </g>
                )}

                {/* ============================================================
                    FLOW DIRECTION ARROWS
                   ============================================================ */}
                {/* Primary Supply Arrow (-->) */}
                <line x1="60" y1="140" x2="160" y2="140" stroke={c.priStream} strokeWidth="2.5" markerEnd="url(#arrow-blue)" />
                {/* Primary Return Arrow (<--) */}
                <line x1="160" y1="370" x2="60" y2="370" stroke={c.priStream} strokeWidth="2.5" markerEnd="url(#arrow-blue)" />

                {/* Secondary Supply Load Arrow (-->) */}
                <line x1="860" y1="140" x2="945" y2="140" stroke={c.secStream} strokeWidth="2.5" markerEnd="url(#arrow-cyan)" />
                {/* Secondary Return Hex Arrow (<--) */}
                <line x1="945" y1="370" x2="860" y2="370" stroke={c.secStream} strokeWidth="2.5" markerEnd="url(#arrow-cyan)" />

                {/* ============================================================
                    CENTRAL COMPONENT 1: PLATE HEAT EXCHANGER (PHE)
                    Solid internal barrier with counter-current channels and conductive thermal waves
                   ============================================================ */}
                <g className="coolit-phe-group" transform="translate(245, 95)">
                  {/* Rounded Outer Shell */}
                  <rect
                    x="0" y="0" width="90" height="300" rx="22" ry="22"
                    fill="url(#coolit-phe-grad)"
                    stroke={c.pheShellStroke} strokeWidth="3.5"
                    className="coolit-phe-shell"
                  />

                  {/* PHE Title Header Badge */}
                  <rect x="12" y="8" width="66" height="15" rx="3" fill={c.pheBadgeFill} stroke={c.pheBadgeStroke} strokeWidth="1" />
                  <text x="45" y="19" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.pheBadgeText} fontSize="8" fontWeight="700">PHE HEX</text>

                  {/* Left Channel Tint (Primary Side) */}
                  <rect x="6" y="27" width="35" height="255" rx="4" fill={isDark ? "rgba(2, 132, 199, 0.12)" : "rgba(2, 132, 199, 0.08)"} />
                  {/* Right Channel Tint (Secondary Side) */}
                  <rect x="49" y="27" width="35" height="255" rx="4" fill={isDark ? "rgba(6, 182, 212, 0.12)" : "rgba(8, 145, 178, 0.08)"} />

                  {/* Solid Central Stainless Steel Barrier Wall (Zero Fluid Crossing) */}
                  <rect x="42" y="26" width="6" height="257" rx="2" fill={c.pheBarrierFill} stroke={c.pheBarrierStroke} strokeWidth="1" />

                  {/* Internal Thermal Conduction Chevron Fins (Conducts Heat Only, Not Coolant) */}
                  <g className="coolit-phe-thermal-fins" opacity={isDark ? "0.6" : "0.75"}>
                    <line x1="12" y1="50" x2="42" y2="60" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="60" x2="78" y2="50" stroke={c.secStream} strokeWidth="1.5" />

                    <line x1="12" y1="90" x2="42" y2="100" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="100" x2="78" y2="90" stroke={c.secStream} strokeWidth="1.5" />

                    <line x1="12" y1="130" x2="42" y2="140" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="140" x2="78" y2="130" stroke={c.secStream} strokeWidth="1.5" />

                    <line x1="12" y1="170" x2="42" y2="180" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="180" x2="78" y2="170" stroke={c.secStream} strokeWidth="1.5" />

                    <line x1="12" y1="210" x2="42" y2="220" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="220" x2="78" y2="210" stroke={c.secStream} strokeWidth="1.5" />

                    <line x1="12" y1="250" x2="42" y2="260" stroke={c.priStream} strokeWidth="1.5" />
                    <line x1="48" y1="260" x2="78" y2="250" stroke={c.secStream} strokeWidth="1.5" />
                  </g>

                  {/* Conductive Thermal Transfer Indicator Wave across Barrier */}
                  <g className="coolit-thermal-transfer-wave">
                    <text x="45" y="152" textAnchor="middle" className="cdu-svg-text font-mono" fill={isDark ? "#f87171" : "#dc2626"} fontSize="9" fontWeight="800">
                      ↔
                    </text>
                    <text x="45" y="163" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.textMuted} fontSize="6.5" fontWeight="700">
                      HEAT
                    </text>
                  </g>

                  {/* Flow Direction Indicator Tags inside the channels */}
                  <text x="24" y="278" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.priStream} fontSize="8" fontWeight="700">↓ PRI</text>
                  <text x="66" y="38" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.secStream} fontSize="8" fontWeight="700">↑ SEC</text>
                </g>

                {/* ============================================================
                    CENTRAL COMPONENT 2: EXPANSION TANK / RESERVOIR
                   ============================================================ */}
                <g className="coolit-tank-group">
                  {/* Valve P11 */}
                  <g
                    className={`coolit-interactive-valve ${selectedSensor === 'P11' ? 'selected' : ''}`}
                    onClick={() => handleNodeClick('P11')}
                    cursor="pointer"
                  >
                    <circle cx="440" cy="180" r="7" fill={c.valveHousingFill} stroke={c.valveHousingStroke} strokeWidth="2" />
                    <text x="455" y="184" className="cdu-svg-text font-mono" fill={c.valveText} fontSize="11" fontWeight="600">P11: OFF</text>
                  </g>

                  {/* Tank Body (Red when PT11 fails or pressure deficit, Coolant Blue/Cyan when passed) */}
                  <rect
                    x="410" y="215" width="60" height="85" rx="3"
                    fill={isSensorFailed('PT11', 'PT_11', 'Reservoir Pressure') ? "url(#coolit-tank-grad-fail)" : "url(#coolit-tank-grad-normal)"}
                    stroke={isSensorFailed('PT11', 'PT_11', 'Reservoir Pressure') ? (isDark ? "#f87171" : "#ef4444") : (isDark ? "#38bdf8" : "#0284c7")}
                    strokeWidth="2.5"
                    className="coolit-tank-vessel"
                  />
                  <text
                    x="440" y="262"
                    textAnchor="middle"
                    className="cdu-svg-text font-mono"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="700"
                  >
                    {isSensorFailed('PT11', 'PT_11', 'Reservoir Pressure') ? 'Fault' : 'Normal'}
                  </text>

                  {/* PT11 Callout */}
                  <g
                    className={`coolit-sensor-callout ${isSensorFailed('PT11', 'PT_11') ? 'sensor-failed' : ''} ${selectedSensor === 'PT11' ? 'selected' : ''}`}
                    onClick={() => handleNodeClick('PT11')}
                    cursor="pointer"
                  >
                    <text x="360" y="322" className="cdu-svg-text font-mono" fill={isSensorFailed('PT11', 'PT_11') ? c.textFail : c.textMuted} fontSize="11">PT11:</text>
                    <text x="398" y="322" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT11', 'PT_11') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT11', 'PT_11') ? c.textFail : c.textMain} fontSize="11.5">
                      {metrics.reservoirPressure.toFixed(1)} psi
                    </text>
                  </g>

                  {/* Valve P12 Drain */}
                  <g
                    className={`coolit-interactive-valve ${selectedSensor === 'P12' ? 'selected' : ''}`}
                    onClick={() => handleNodeClick('P12')}
                    cursor="pointer"
                  >
                    <circle cx="490" cy="330" r="7" fill={c.valveHousingFill} stroke={c.valveHousingStroke} strokeWidth="2" />
                    <path d="M 520 323 L 535 330 L 520 337 Z" fill={c.textMuted} />
                    <text x="470" y="316" className="cdu-svg-text font-mono" fill={c.valveText} fontSize="11" fontWeight="600">P12: OFF</text>
                  </g>
                </g>

                {/* ============================================================
                    CENTRAL COMPONENT 3: DUAL REDUNDANT PUMPS (P41 & P31)
                   ============================================================ */}
                {/* Upper Pump P41 */}
                <g
                  className={`coolit-pump-assembly ${selectedSensor === 'P41 Speed %' ? 'selected' : ''}`}
                  transform="translate(635, 85)"
                  onClick={() => handleNodeClick('P41 Speed %')}
                  cursor="pointer"
                >
                  {/* Outer Housing */}
                  <circle cx="0" cy="0" r="16" fill={c.pumpHousingFill} stroke={c.pumpHousingStroke} strokeWidth="3" />
                  {/* Tangential Nozzles */}
                  <line x1="-16" y1="0" x2="-22" y2="0" stroke={c.pumpHousingStroke} strokeWidth="4" />
                  <line x1="16" y1="0" x2="22" y2="0" stroke={c.pumpHousingStroke} strokeWidth="4" />

                  {/* Animated Rotating Impeller */}
                  <g
                    className="coolit-pump-impeller"
                    style={{
                      transformOrigin: '0px 0px',
                      animation: animateFlow && p41Speed > 0
                        ? `cdu-spin ${p41Duration}s linear infinite`
                        : 'none'
                    }}
                  >
                    <line x1="-9" y1="0" x2="9" y2="0" stroke={c.priStream} strokeWidth="3" strokeLinecap="round" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke={c.priStream} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill={c.pumpHub} />
                  </g>

                  {/* P41 Label */}
                  <text x="0" y="-22" textAnchor="middle" className="cdu-svg-text font-mono">
                    <tspan fill={isSensorFailed('P41', 'P41 Speed %', 'P41_Speed') ? c.textFail : c.textMuted} fontSize="11">P41: </tspan>
                    <tspan fill={isSensorFailed('P41', 'P41 Speed %', 'P41_Speed') ? c.textFail : c.textMain} className={isSensorFailed('P41', 'P41 Speed %', 'P41_Speed') ? 'cdu-val-failed' : ''} fontSize="12" fontWeight="bold">{p41Speed.toFixed(2)} %</tspan>
                  </text>
                </g>

                {/* Lower Pump P31 */}
                <g
                  className={`coolit-pump-assembly ${selectedSensor === 'P31 Speed %' ? 'selected' : ''}`}
                  transform="translate(635, 195)"
                  onClick={() => handleNodeClick('P31 Speed %')}
                  cursor="pointer"
                >
                  {/* Outer Housing */}
                  <circle cx="0" cy="0" r="16" fill={c.pumpHousingFill} stroke={c.pumpHousingStroke} strokeWidth="3" />
                  <line x1="-16" y1="0" x2="-22" y2="0" stroke={c.pumpHousingStroke} strokeWidth="4" />
                  <line x1="16" y1="0" x2="22" y2="0" stroke={c.pumpHousingStroke} strokeWidth="4" />

                  {/* Animated Rotating Impeller */}
                  <g
                    className="coolit-pump-impeller"
                    style={{
                      transformOrigin: '0px 0px',
                      animation: animateFlow && p31Speed > 0
                        ? `cdu-spin ${p31Duration}s linear infinite`
                        : 'none'
                    }}
                  >
                    <line x1="-9" y1="0" x2="9" y2="0" stroke={c.secStream} strokeWidth="3" strokeLinecap="round" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke={c.secStream} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="3.5" fill={c.pumpHub} />
                  </g>

                  {/* P31 Label */}
                  <text x="0" y="-22" textAnchor="middle" className="cdu-svg-text font-mono">
                    <tspan fill={isSensorFailed('P31', 'P31 Speed %', 'P31_Speed') ? c.textFail : c.textMuted} fontSize="11">P31: </tspan>
                    <tspan fill={isSensorFailed('P31', 'P31 Speed %', 'P31_Speed') ? c.textFail : c.textMain} className={isSensorFailed('P31', 'P31 Speed %', 'P31_Speed') ? 'cdu-val-failed' : ''} fontSize="12" fontWeight="bold">{p31Speed.toFixed(2)} %</tspan>
                  </text>
                </g>

                {/* ============================================================
                    PRIMARY LOOP MODULATING VALVE: FCV61
                   ============================================================ */}
                <g
                  className={`coolit-valve-assembly ${selectedSensor === 'FCV61 Actual Flow%' ? 'selected' : ''}`}
                  transform="translate(165, 370)"
                  onClick={() => handleNodeClick('FCV61 Actual Flow%')}
                  cursor="pointer"
                >
                  {/* Opposing Triangles Valve Symbol */}
                  <polygon points="-16,-9 0,0 -16,9" fill={c.valveHousingFill} stroke={c.valveHousingStroke} strokeWidth="2.5" />
                  <polygon points="16,-9 0,0 16,9" fill={c.valveHousingFill} stroke={c.valveHousingStroke} strokeWidth="2.5" />

                  {/* Stem & Motor Actuator [M] Box */}
                  <line x1="0" y1="0" x2="0" y2="-14" stroke={c.valveHousingStroke} strokeWidth="2.5" />
                  <rect x="-9" y="-28" width="18" height="14" rx="2" fill={c.actuatorFill} stroke={c.actuatorStroke} strokeWidth="2" />
                  <text x="0" y="-18" textAnchor="middle" className="cdu-svg-text font-mono font-bold" fill={c.textAccentPri} fontSize="9.5">M</text>

                  {/* FCV61 Status Text */}
                  <text x="0" y="-34" textAnchor="middle" className="cdu-svg-text font-mono" fill={isSensorFailed('FCV61', 'FCV61 Actual Flow%', 'FCV61 Actual Open%') ? c.textFail : c.textMuted} fontSize="10">FCV61</text>
                  <text x="0" y="24" textAnchor="middle" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('FCV61', 'FCV61 Actual Flow%', 'FCV61 Actual Open%') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('FCV61', 'FCV61 Actual Flow%', 'FCV61 Actual Open%') ? c.textFail : c.textAccentPri} fontSize="11">
                    {metrics.modulatingValve.toFixed(0)} %
                  </text>
                </g>

                {/* ============================================================
                    PRIMARY LOOP SENSOR LABELS & PIPING CALLOUTS (LEFT)
                   ============================================================ */}
                {/* Primary Supply Title */}
                <text x="50" y="120" className="cdu-svg-text" fill={c.priTitle} fontSize="12" fontWeight="700">Primary Supply</text>

                {/* PT51/52 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('PT51', 'PT52', 'PT51/PT52', 'PT51/52') ? 'sensor-failed' : ''} ${selectedSensor === 'PT51' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('PT51')}
                  cursor="pointer"
                >
                  <text x="40" y="90" className="cdu-svg-text font-mono" fill={isSensorFailed('PT51', 'PT52', 'PT51/PT52', 'PT51/52') ? c.textFail : c.textMuted} fontSize="11">PT51/52:</text>
                  <text x="100" y="90" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT51', 'PT52', 'PT51/PT52', 'PT51/52') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT51', 'PT52', 'PT51/PT52', 'PT51/52') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.primarySupplyP.toFixed(1)} psi
                  </text>
                </g>

                {/* TT51/52 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('TT51', 'TT52', 'TT51/TT52', 'TT51/52') ? 'sensor-failed' : ''} ${selectedSensor === 'TT51' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('TT51')}
                  cursor="pointer"
                >
                  <text x="40" y="172" className="cdu-svg-text font-mono" fill={isSensorFailed('TT51', 'TT52', 'TT51/TT52', 'TT51/52') ? c.textFail : c.textMuted} fontSize="11">TT51/52:</text>
                  <text x="100" y="172" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT51', 'TT52', 'TT51/TT52', 'TT51/52') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT51', 'TT52', 'TT51/TT52', 'TT51/52') ? c.textFail : c.textMain} fontSize="11.5">
                    {priSupplyT.toFixed(1)} °C
                  </text>
                </g>

                {/* Primary Return Title */}
                <text x="50" y="405" className="cdu-svg-text" fill={c.priTitle} fontSize="12" fontWeight="700">Primary Return</text>

                {/* PT61/62 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('PT61', 'PT62', 'PT61/PT62', 'PT61/62') ? 'sensor-failed' : ''} ${selectedSensor === 'PT61' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('PT61')}
                  cursor="pointer"
                >
                  <text x="40" y="325" className="cdu-svg-text font-mono" fill={isSensorFailed('PT61', 'PT62', 'PT61/PT62', 'PT61/62') ? c.textFail : c.textMuted} fontSize="11">PT61/62:</text>
                  <text x="100" y="325" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT61', 'PT62', 'PT61/PT62', 'PT61/62') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT61', 'PT62', 'PT61/PT62', 'PT61/62') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.primaryReturnP.toFixed(1)} psi
                  </text>
                </g>

                {/* FT61/61v */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('FT61', 'FT61v', 'FT61/61v', 'FT61/FT61v', 'Primary Flow') ? 'sensor-failed' : ''} ${selectedSensor === 'FT61' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('FT61')}
                  cursor="pointer"
                >
                  <text x="40" y="347" className="cdu-svg-text font-mono" fill={isSensorFailed('FT61', 'FT61v', 'FT61/61v', 'FT61/FT61v', 'Primary Flow') ? c.textFail : c.textMuted} fontSize="11">FT61/61v:</text>
                  <text x="100" y="347" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('FT61', 'FT61v', 'FT61/61v', 'FT61/FT61v', 'Primary Flow') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('FT61', 'FT61v', 'FT61/61v', 'FT61/FT61v', 'Primary Flow') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.primaryFlow.toFixed(0)} l/m
                  </text>
                </g>

                {/* TT61/62 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('TT61', 'TT62', 'TT61/TT62', 'TT61/62') ? 'sensor-failed' : ''} ${selectedSensor === 'TT61' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('TT61')}
                  cursor="pointer"
                >
                  <text x="40" y="428" className="cdu-svg-text font-mono" fill={isSensorFailed('TT61', 'TT62', 'TT61/TT62', 'TT61/62') ? c.textFail : c.textMuted} fontSize="11">TT61/62:</text>
                  <text x="100" y="428" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT61', 'TT62', 'TT61/TT62', 'TT61/62') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT61', 'TT62', 'TT61/TT62', 'TT61/62') ? c.textFail : c.textMain} fontSize="11.5">
                    {priReturnT.toFixed(1)} °C
                  </text>
                </g>

                {/* ============================================================
                    SECONDARY LOOP SENSOR LABELS & PIPING CALLOUTS (RIGHT)
                   ============================================================ */}
                {/* Secondary Supply Title */}
                <text x="350" y="120" className="cdu-svg-text" fill={c.secTitle} fontSize="12" fontWeight="700">Secondary Supply</text>

                {/* PT21 (Suction) */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('PT21', 'PT_21', 'Suction Pressure') ? 'sensor-failed' : ''} ${selectedSensor === 'PT21' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('PT21')}
                  cursor="pointer"
                >
                  <text x="475" y="120" className="cdu-svg-text font-mono" fill={isSensorFailed('PT21', 'PT_21', 'Suction Pressure') ? c.textFail : c.textMuted} fontSize="11">PT21:</text>
                  <text x="515" y="120" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT21', 'PT_21', 'Suction Pressure') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT21', 'PT_21', 'Suction Pressure') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.suctionPressure.toFixed(1)} psi
                  </text>
                </g>

                {/* PT32 / PT42 (Discharge) */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('PT32', 'PT42', 'PT32/PT42') ? 'sensor-failed' : ''} ${selectedSensor === 'PT32' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('PT32')}
                  cursor="pointer"
                >
                  <text x="740" y="120" className="cdu-svg-text font-mono" fill={isSensorFailed('PT32', 'PT42', 'PT32/PT42') ? c.textFail : c.textMuted} fontSize="11">PT32 / PT42:</text>
                  <text x="835" y="120" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT32', 'PT42', 'PT32/PT42') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT32', 'PT42', 'PT32/PT42') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.dischargePressure.toFixed(1)} psi
                  </text>
                </g>

                {/* TT31 / TT41 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('TT31', 'TT41', 'TT31/TT41') ? 'sensor-failed' : ''} ${selectedSensor === 'TT31' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('TT31')}
                  cursor="pointer"
                >
                  <text x="740" y="165" className="cdu-svg-text font-mono" fill={isSensorFailed('TT31', 'TT41', 'TT31/TT41') ? c.textFail : c.textMuted} fontSize="11">TT31 / TT41:</text>
                  <text x="835" y="165" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT31', 'TT41', 'TT31/TT41') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT31', 'TT41', 'TT31/TT41') ? c.textFail : c.textMain} fontSize="11.5">
                    {secSupplyT.toFixed(1)} °C
                  </text>
                </g>

                {/* TT45 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('TT45') ? 'sensor-failed' : ''} ${selectedSensor === 'TT45' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('TT45')}
                  cursor="pointer"
                >
                  <text x="760" y="185" className="cdu-svg-text font-mono" fill={isSensorFailed('TT45') ? c.textFail : c.textMuted} fontSize="11">TT45:</text>
                  <text x="835" y="185" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT45') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT45') ? c.textFail : c.textMain} fontSize="11.5">
                    {(metrics.cabinetT && metrics.cabinetT > 0 ? metrics.cabinetT : secSupplyT).toFixed(1)} °C
                  </text>
                </g>

                {/* Secondary Return Title */}
                <text x="350" y="405" className="cdu-svg-text" fill={c.secTitle} fontSize="12" fontWeight="700">Secondary Return</text>

                {/* FT01 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('FT01', 'FT_01', 'Secondary Flow') ? 'sensor-failed' : ''} ${selectedSensor === 'FT01' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('FT01')}
                  cursor="pointer"
                >
                  <text x="560" y="405" className="cdu-svg-text font-mono" fill={isSensorFailed('FT01', 'FT_01', 'Secondary Flow') ? c.textFail : c.textMuted} fontSize="11">FT01:</text>
                  <text x="600" y="405" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('FT01', 'FT_01', 'Secondary Flow') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('FT01', 'FT_01', 'Secondary Flow') ? c.textFail : c.textMain} fontSize="11.5">
                    {metrics.flow.toFixed(1)} l/m
                  </text>
                </g>

                {/* PT01 / PT02 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('PT01', 'PT02', 'PT01/PT02') ? 'sensor-failed' : ''} ${selectedSensor === 'PT01' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('PT01')}
                  cursor="pointer"
                >
                  <text x="740" y="350" className="cdu-svg-text font-mono" fill={isSensorFailed('PT01', 'PT02', 'PT01/PT02') ? c.textFail : c.textMuted} fontSize="11">PT01 / PT02:</text>
                  <text x="840" y="350" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('PT01', 'PT02', 'PT01/PT02') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('PT01', 'PT02', 'PT01/PT02') ? c.textFail : c.textMain} fontSize="11.5">
                    {(metrics.secondaryReturnP != null && metrics.secondaryReturnP > 0 ? metrics.secondaryReturnP : metrics.suctionPressure * 0.05).toFixed(1)} psi
                  </text>
                </g>

                {/* TT01 / TT02 */}
                <g
                  className={`coolit-sensor-callout ${isSensorFailed('TT01', 'TT02', 'TT01/TT02') ? 'sensor-failed' : ''} ${selectedSensor === 'TT01' ? 'selected' : ''}`}
                  onClick={() => handleNodeClick('TT01')}
                  cursor="pointer"
                >
                  <text x="740" y="428" className="cdu-svg-text font-mono" fill={isSensorFailed('TT01', 'TT02', 'TT01/TT02') ? c.textFail : c.textMuted} fontSize="11">TT01 / TT02:</text>
                  <text x="840" y="428" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT01', 'TT02', 'TT01/TT02') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT01', 'TT02', 'TT01/TT02') ? c.textFail : c.textMain} fontSize="11.5">
                    {secReturnT.toFixed(1)} °C
                  </text>
                </g>

                {/* ============================================================
                    BOTTOM-RIGHT METROLOGY PROCESS HUD TABLE
                   ============================================================ */}
                <g className="coolit-hud-table-group" transform="translate(680, 230)">
                  {/* Table Container Rect */}
                  <rect
                    x="0" y="0" width="240" height="84" rx="8"
                    fill={c.tableBg} stroke={c.tableBorder} strokeWidth="2"
                    className="coolit-table-box"
                  />
                  {/* Divider Lines */}
                  <line x1="75" y1="0" x2="75" y2="84" stroke={c.tableDivider} strokeWidth="1.5" />
                  <line x1="130" y1="0" x2="130" y2="84" stroke={c.tableDivider} strokeWidth="1.5" />
                  <line x1="185" y1="0" x2="185" y2="84" stroke={c.tableDivider} strokeWidth="1.5" />
                  <line x1="0" y1="28" x2="240" y2="28" stroke={c.tableDivider} strokeWidth="1.5" />
                  <line x1="0" y1="56" x2="240" y2="56" stroke={c.tableDivider} strokeWidth="1.5" />

                  {/* Header Row */}
                  <text x="102" y="19" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.tableHeader} fontSize="10.5" fontWeight="700">TEMP</text>
                  <text x="157" y="19" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.tableHeader} fontSize="10.5" fontWeight="700">DP</text>
                  <text x="212" y="19" textAnchor="middle" className="cdu-svg-text font-mono" fill={c.tableHeader} fontSize="10.5" fontWeight="700">FLOW</text>

                  {/* Row 1: ACTUAL */}
                  <text x="12" y="47" className="cdu-svg-text font-mono" fill={c.tableHeader} fontSize="10.5" fontWeight="700">ACTUAL</text>
                  <text x="102" y="47" textAnchor="middle" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('TT31', 'TT41', 'TT31/TT41', 'TT01') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('TT31', 'TT41', 'TT31/TT41', 'TT01') ? c.textFail : c.tableActualVal} fontSize="11">
                    {secSupplyT.toFixed(1)} °C
                  </text>
                  <text x="157" y="47" textAnchor="middle" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('Secondary DP (Supply - Return)', 'Secondary DP', 'DP_01') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('Secondary DP (Supply - Return)', 'Secondary DP', 'DP_01') ? c.textFail : c.tableActualVal} fontSize="11">
                    {metrics.measuredDp.toFixed(1)} psi
                  </text>
                  <text x="212" y="47" textAnchor="middle" className={`cdu-svg-text font-mono font-bold ${isSensorFailed('FT01', 'Secondary Flow') ? 'cdu-val-failed' : ''}`} fill={isSensorFailed('FT01', 'Secondary Flow') ? c.textFail : c.tableActualVal} fontSize="11">
                    {metrics.flow.toFixed(0)} l/m
                  </text>

                  {/* Row 2: SETPOINT (Machine Control Targets / Reference Inputs) */}
                  <text x="12" y="74" className="cdu-svg-text font-mono" fill={c.tableHeader} fontSize="10" fontWeight="700">SETPOINT</text>
                  <text x="102" y="74" textAnchor="middle" className="cdu-svg-text font-mono font-medium" fill={c.tableSetpointVal} fontSize="11">
                    {metrics.tempSp != null ? `${metrics.tempSp.toFixed(1)} °C` : '40.0 °C'}
                  </text>
                  <text x="157" y="74" textAnchor="middle" className="cdu-svg-text font-mono font-medium" fill={c.tableSetpointVal} fontSize="11">
                    {metrics.dpSp != null ? `${metrics.dpSp.toFixed(1)} psi` : '15.0 psi'}
                  </text>
                  <text x="212" y="74" textAnchor="middle" className="cdu-svg-text font-mono font-medium" fill={metrics.flowSp != null ? c.tableSetpointVal : c.tableNaVal} fontSize="11">
                    {metrics.flowSp != null ? `${metrics.flowSp.toFixed(0)}` : 'na'}
                  </text>
                </g>
              </svg>
            </div>

            {/* 3. Touchscreen Bottom Status Ribbon */}
            <div className="coolit-hmi-bottombar">
              <div className="coolit-hmi-bottom-left">
                <div className={`coolit-alarm-badge ${metrics.airBleedWarning || !metrics.suctionCavitationSafe ? 'alarm-active' : ''}`}>
                  <Bell size={13} />
                </div>
                <div className="coolit-hmi-unit-id font-mono">
                  <span className="label">Unit:</span>
                  <span className="val">{unitId}</span>
                </div>
              </div>

              <div className="coolit-hmi-ambient-hud font-mono">
                <div className="ambient-item">
                  <span className="label">Ambient:</span>
                  <span className="val">{ambientT}°C &nbsp; {ambientRh}%</span>
                </div>
                <div className="ambient-item">
                  <span className="label">Dewpoint:</span>
                  <span className="val">{dewpoint}°C</span>
                </div>
              </div>

              <div className="coolit-hmi-bottom-right font-mono">
                <div className="clock-time">00:0{metrics.stageNum}:15</div>
                <div className="clock-date">01/01/2026</div>
              </div>
            </div>
          </div>

          {/* 4. Realistic CoolIT systems™ Physical Bezel Branding */}
          <div className="coolit-bezel-branding">
            <span className="coolit-brand-main">Cool<span className="brand-one">1</span>T</span>
            <span className="coolit-brand-sub">systems™</span>
          </div>
        </div>
    </div>
  );
};

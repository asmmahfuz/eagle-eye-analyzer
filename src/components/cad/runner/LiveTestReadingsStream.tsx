import React, { useRef, useEffect } from 'react';
import { TerminalIcon, Droplets, Activity, Gauge, Flame } from '../../Icons';

interface LiveTestReadingsStreamProps {
  readings: Record<string, number>;
  logStream: string[];
}

export const LiveTestReadingsStream: React.FC<LiveTestReadingsStreamProps> = ({
  readings,
  logStream
}) => {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom on updates
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logStream]);

  const cards = [
    { label: 'Secondary Flow (FT01)', val: readings['FT01'], unit: 'LPM', icon: <Droplets size={12} className="text-emerald" /> },
    { label: 'Secondary DP', val: readings['Secondary DP (Supply - Return)'], unit: 'psi', icon: <Gauge size={12} className="text-amber" /> },
    { label: 'Primary DP (Facility)', val: readings['Primary DP (Supply - Return)'], unit: 'psi', icon: <Gauge size={12} className="text-cyan" /> },
    { label: 'Pump 31 Speed', val: readings['P31 Speed %'], unit: '%', icon: <Activity size={12} className="text-purple" /> },
    { label: 'Pump 41 Speed', val: readings['P41 Speed %'], unit: '%', icon: <Activity size={12} className="text-purple" /> },
    { label: 'Supply Temp (TT01)', val: readings['TT01'], unit: '°C', icon: <Flame size={12} className="text-red" /> },
    { label: 'Return Temp (TT02)', val: readings['TT02'], unit: '°C', icon: <Flame size={12} className="text-amber" /> },
    { label: 'Reservoir Vacuum (PT11)', val: readings['PT11'], unit: 'psi', icon: <Gauge size={12} className="text-cyan" /> }
  ];

  return (
    <div className="cad-live-readings-stream">
      {/* Real-Time Live Channel Values Grid */}
      <div className="cad-live-grid-title">
        <Activity size={12} className="text-cyan" />
        <span>Live Transducer Readings & Modbus Registers</span>
      </div>

      <div className="cad-live-cards-grid">
        {cards.map((c, i) => {
          const hasVal = c.val !== undefined && c.val !== null;
          return (
            <div key={i} className="cad-live-sensor-chip">
              <div className="cad-lsc-top">
                {c.icon}
                <span className="cad-lsc-label" title={c.label}>{c.label}</span>
              </div>
              <div className="cad-lsc-val font-mono">
                {hasVal ? (
                  <>
                    <span className="cad-lsc-num">{Number(c.val).toFixed(1)}</span>
                    <span className="cad-lsc-unit">{c.unit}</span>
                  </>
                ) : (
                  <span className="cad-lsc-pending">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Streaming Modbus Console */}
      <div className="cad-live-console-wrap">
        <div className="cad-console-header">
          <div className="cad-ch-left">
            <TerminalIcon size={12} className="text-cyan" />
            <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>
              Modbus TCP Activity Stream (169.254.244.6:502)
            </span>
          </div>
          <span className="cad-ch-count text-dim font-mono">{logStream.length} packets</span>
        </div>

        <div className="cad-live-log-body font-mono" ref={logRef}>
          {logStream.length === 0 ? (
            <div className="cad-log-empty text-dim">Awaiting connection to PLC...</div>
          ) : (
            logStream.map((line, idx) => (
              <div key={idx} className="cad-log-entry">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

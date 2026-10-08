import React from 'react';
import { AlertTriangle, Gauge, Sliders, Cpu } from '../../Icons';

export const ModbusSentinelGuide: React.FC = () => {
  return (
    <div className="cad-modbus-subview">
      <div className="cad-guide-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        
        {/* CARD 1: 0xFFFF Sentinel */}
        <div className="cad-guide-card" style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={15} style={{ color: '#EF4444' }} />
            <strong style={{ fontSize: '12px', color: '#EF4444' }}>Invariant 8: 0xFFFF Hardware Sentinel (6553.5)</strong>
          </div>
          <p style={{ fontSize: '11px', margin: '0 0 6px 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
            When an analog pressure or temperature transducer reports <code>6553.5</code> (0xFFFF unscaled), the PLC bus has detected an electrical open-circuit or uninitialized channel (e.g. <code>PT11</code> reservoir vacuum).
          </p>
          <div style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)', fontFamily: 'monospace' }}>
            <div>• Raw Register: <code>0xFFFF (65535)</code></div>
            <div>• Scaled Reading: <code>6553.5</code> (×0.1 factor)</div>
            <div>• Handling: Flagged as electrical hardware fault; strictly excluded from physical Peak/Min pressure calculations.</div>
          </div>
        </div>

        {/* CARD 2: Two's Complement Rollover */}
        <div className="cad-guide-card" style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Gauge size={15} style={{ color: '#00D2FF' }} />
            <strong style={{ fontSize: '12px', color: '#00D2FF' }}>Invariant 9: Signed 16-Bit Rollover (Two's Complement)</strong>
          </div>
          <p style={{ fontSize: '11px', margin: '0 0 6px 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
            Pressure transducers and differential pressure registers transmit negative values as unsigned 16-bit integers (e.g. reverse primary DP under suction or vacuum):
          </p>
          <div style={{ fontSize: '10.5px', background: 'rgba(0, 210, 255, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(0, 210, 255, 0.2)', fontFamily: 'monospace' }}>
            <div>• Rollover Range: <code>[6500.0, 6553.4]</code></div>
            <div>• Formula: <code>V_corr = (V × 10 - 65536) / 10</code></div>
            <div>• Example: <code>6544.9</code> decodes to <strong>-8.70 psi</strong> reverse differential pressure.</div>
          </div>
        </div>

        {/* CARD 3: 0-10V Normalization */}
        <div className="cad-guide-card" style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sliders size={15} style={{ color: '#EAB308' }} />
            <strong style={{ fontSize: '12px', color: '#EAB308' }}>Invariant 7: 0–10V Analog Register Normalization</strong>
          </div>
          <p style={{ fontSize: '11px', margin: '0 0 6px 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
            CDU circulation pumps operate at $\ge 25\%$ (min speed P054 = 56.0% / 33.6 Hz). Raw Excel logs export 0–10V analog command voltages:
          </p>
          <div style={{ fontSize: '10.5px', background: 'rgba(234, 179, 8, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(234, 179, 8, 0.2)', fontFamily: 'monospace' }}>
            <div>• Observed Range: <code>5.6</code> to <code>9.9</code> Volts</div>
            <div>• Normalization: Scaled by <strong>10×</strong></div>
            <div>• Physical Telemetry: <strong>56% to 99%</strong> pump inverter command.</div>
          </div>
        </div>

        {/* CARD 4: Modbus TCP Protocol Specs */}
        <div className="cad-guide-card" style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cpu size={15} style={{ color: '#A855F7' }} />
            <strong style={{ fontSize: '12px', color: '#A855F7' }}>Modbus TCP Physical & Transport Architecture</strong>
          </div>
          <p style={{ fontSize: '11px', margin: '0 0 6px 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
            Deterministic PLC communication parameters used during test bay sequence execution:
          </p>
          <div style={{ fontSize: '10.5px', background: 'rgba(168, 85, 247, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.2)', fontFamily: 'monospace' }}>
            <div>• IP Endpoint: <code>169.254.244.6:502</code> (Direct Ethernet)</div>
            <div>• Unit Identifier: <code>1</code> (PLC CPU Master)</div>
            <div>• Byte Ordering: Big-Endian (Most Significant Byte First)</div>
          </div>
        </div>

      </div>
    </div>
  );
};

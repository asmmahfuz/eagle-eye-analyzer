import React from 'react';
import { CHX2000_WRITE_REGISTERS, ModbusRegisterDef } from '../../../engine/registers';

export const ModbusWriteSetpointsTable: React.FC = () => {
  return (
    <div className="cad-modbus-subview">
      <div className="cad-instruction-callout" style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '4px', marginBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-main)' }}>
          <strong>Automated Excitation Control:</strong> Eagle Eye software drives the CDU test bay through 10 calibrated operating stages by writing setpoints to Holding Registers 200–202 via Modbus Function Code <code>0x06</code> (Preset Single Register) or <code>0x10</code> (Preset Multiple Registers).
        </p>
      </div>

      <div className="cad-table-scroll-wrap" style={{ border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        <table className="cad-shortcuts-table font-mono" style={{ fontSize: '11px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Register</th>
              <th style={{ width: '190px' }}>Target Setpoint</th>
              <th style={{ width: '75px' }}>Scale</th>
              <th style={{ width: '70px' }}>Unit</th>
              <th style={{ width: '120px' }}>Physical Span</th>
              <th style={{ width: '110px' }}>Modbus FC</th>
              <th>Programmed Excitation Step Values</th>
            </tr>
          </thead>
          <tbody>
            {CHX2000_WRITE_REGISTERS.map((reg: ModbusRegisterDef) => (
              <tr key={reg.address}>
                <td className="text-cyan font-bold">
                  <span className="cad-reg-badge" style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: '3px' }}>
                    Reg {reg.address}
                  </span>
                </td>
                <td className="font-bold text-main" style={{ fontFamily: 'inherit' }}>
                  {reg.displayName}
                </td>
                <td className="text-dim">×0.1</td>
                <td className="text-amber font-bold">{reg.engineeringUnit}</td>
                <td className="text-green font-bold">
                  {reg.address === 200 ? '21.0 – 27.0 °C' : reg.address === 201 ? '0.0 – 33.0 psi' : '0.0 – 560.0 LPM'}
                </td>
                <td className="text-dim" style={{ fontSize: '10.5px' }}>
                  0x06 / 0x10
                </td>
                <td style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {reg.notes || reg.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cad-modbus-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px' }}>
        <div className="cad-card-mini" style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Temperature Slew (Reg 200)</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#F97316', margin: '4px 0' }}>21.0°C → 27.0°C</div>
          <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Modulates primary cooling water bypass to assess heat exchanger thermal dissipation response.
          </p>
        </div>

        <div className="cad-card-mini" style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Differential Pressure (Reg 201)</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#00D2FF', margin: '4px 0' }}>0.0 → 33.0 psi</div>
          <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Steps secondary loop pressure demand through minimum (5 psi), nominal (20 psi), and peak (33 psi).
          </p>
        </div>

        <div className="cad-card-mini" style={{ padding: '10px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Coolant Flow Rate (Reg 202)</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', margin: '4px 0' }}>0 → 560 LPM</div>
          <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Commands VFD inverter frequencies (P31/P41) from 160 LPM idle to 560 LPM maximum capacity.
          </p>
        </div>
      </div>
    </div>
  );
};

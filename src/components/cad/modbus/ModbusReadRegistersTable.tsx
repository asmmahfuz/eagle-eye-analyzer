import React, { useState, useMemo } from 'react';
import { CHX2000_READ_REGISTERS, ModbusRegisterDef } from '../../../engine/registers';
import { SubsystemCategory } from '../../../types';
import { Search } from '../../Icons';

export const ModbusReadRegistersTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredRegisters = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return CHX2000_READ_REGISTERS.filter(reg => {
      const matchesCat = selectedCat === 'all' || reg.category === selectedCat;
      const matchesSearch =
        term === '' ||
        reg.address.toString().includes(term) ||
        reg.displayName.toLowerCase().includes(term) ||
        reg.description.toLowerCase().includes(term) ||
        reg.engineeringUnit.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [searchTerm, selectedCat]);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: `All (${CHX2000_READ_REGISTERS.length})` },
    { id: 'pressure', label: 'Pressure' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'hydraulic', label: 'Hydraulic' },
    { id: 'pump', label: 'Pumps' },
    { id: 'system', label: 'System' },
    { id: 'setpoint', label: 'Setpoints' }
  ];

  return (
    <div className="cad-modbus-subview">
      <div className="cad-modbus-filter-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search address (e.g. 11, PT, TT)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '4px 8px 4px 26px',
              fontSize: '11px',
              borderRadius: '4px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              width: '210px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`cad-filter-chip ${selectedCat === c.id ? 'active' : ''}`}
              style={{ fontSize: '10.5px', padding: '2px 8px' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cad-table-scroll-wrap" style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        <table className="cad-shortcuts-table font-mono" style={{ fontSize: '11px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '85px' }}>Address</th>
              <th>Signal / Parameter</th>
              <th style={{ width: '90px' }}>Category</th>
              <th style={{ width: '70px' }}>Scale</th>
              <th style={{ width: '65px' }}>Unit</th>
              <th style={{ width: '95px' }}>Decoding</th>
              <th>PLC Engineering Purpose</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegisters.map((reg: ModbusRegisterDef) => (
              <tr key={reg.address}>
                <td className="text-cyan font-bold">
                  <span className="cad-reg-badge" style={{ padding: '1px 5px', background: 'rgba(0, 210, 255, 0.1)', border: '1px solid rgba(0, 210, 255, 0.3)', borderRadius: '3px' }}>
                    Reg {reg.address}
                  </span>
                </td>
                <td className="font-bold text-main" style={{ fontFamily: 'inherit' }}>
                  {reg.displayName}
                </td>
                <td>
                  <span className="cad-subsystem-pill" style={{ fontSize: '9.5px', textTransform: 'uppercase', opacity: 0.85 }}>
                    {reg.category}
                  </span>
                </td>
                <td className="text-dim">
                  {reg.scaling === 1 ? '×1.0' : reg.scaling === 100 ? '×0.01' : '×0.1'}
                </td>
                <td className="text-amber font-bold">
                  {reg.engineeringUnit || '--'}
                </td>
                <td className="text-dim" style={{ fontSize: '10px' }}>
                  {reg.isSigned ? "Signed 16-Bit" : "Unsigned 16"}
                </td>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {reg.description}
                </td>
              </tr>
            ))}
            {filteredRegisters.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                  No Modbus holding registers matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '6px', textAlign: 'right' }}>
        Displaying {filteredRegisters.length} of {CHX2000_READ_REGISTERS.length} Read Holding Registers (PLC Addresses 0–61, 200–202)
      </div>
    </div>
  );
};

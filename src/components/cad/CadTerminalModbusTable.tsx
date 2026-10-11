import React, { useState, useMemo } from 'react';
import { CHX2000_READ_REGISTERS, CHX2000_WRITE_REGISTERS, ModbusRegisterDef } from '../../engine/registers';
import { Search } from '../Icons';

interface CadTerminalModbusTableProps {
  selectedSensor?: string | null;
  onSelectSensor: (sensorName: string | null) => void;
}

export const CadTerminalModbusTable: React.FC<CadTerminalModbusTableProps> = ({
  selectedSensor,
  onSelectSensor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const allRegisters: (ModbusRegisterDef & { isWriteOnly?: boolean })[] = useMemo(() => {
    const list: (ModbusRegisterDef & { isWriteOnly?: boolean })[] = [...CHX2000_READ_REGISTERS];
    CHX2000_WRITE_REGISTERS.forEach(w => {
      if (!list.some(r => r.address === w.address)) {
        list.push({ ...w, isWriteOnly: true });
      }
    });
    return list.sort((a, b) => a.address - b.address);
  }, []);

  const filteredRegisters = useMemo(() => {
    return allRegisters.filter(reg => {
      const matchesCat = selectedCat === 'all'
        ? true
        : selectedCat === 'write'
        ? reg.address >= 200 && reg.address <= 202
        : reg.category === selectedCat;

      if (!matchesCat) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        reg.address.toString().includes(term) ||
        reg.displayName.toLowerCase().includes(term) ||
        reg.description.toLowerCase().includes(term) ||
        reg.engineeringUnit.toLowerCase().includes(term) ||
        `0x${reg.address.toString(16).toLowerCase()}`.includes(term)
      );
    });
  }, [allRegisters, selectedCat, searchTerm]);

  const activeReg = useMemo(() => {
    if (!selectedSensor) return null;
    return allRegisters.find(
      r => r.displayName.toLowerCase() === selectedSensor.toLowerCase() ||
      selectedSensor.toLowerCase().includes(r.displayName.toLowerCase())
    );
  }, [allRegisters, selectedSensor]);

  const categories = [
    { id: 'all', label: `All (${allRegisters.length})` },
    { id: 'hydraulic', label: 'Hydraulic' },
    { id: 'pump', label: 'Pumps' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'pressure', label: 'Pressure' },
    { id: 'environmental', label: 'Env' },
    { id: 'system', label: 'System' },
    { id: 'write', label: 'Write Setpoints (200–202)' }
  ];

  return (
    <div className="cad-terminal-modbus-container font-mono" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Banner / Filter Toolbar */}
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'var(--bg-subtle, rgba(0,0,0,0.02))'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginRight: '4px' }}>Category:</span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                fontSize: '10.5px',
                padding: '2px 7px',
                borderRadius: '3px',
                border: '1px solid',
                borderColor: selectedCat === cat.id ? 'var(--accent-cyan, #00D2FF)' : 'var(--border-subtle)',
                background: selectedCat === cat.id ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
                color: selectedCat === cat.id ? 'var(--accent-cyan, #00D2FF)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: selectedCat === cat.id ? 600 : 400
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input & Scope Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeReg && (
            <div style={{
              fontSize: '10.5px',
              padding: '2px 8px',
              borderRadius: '3px',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#C084FC',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Focused: <strong>{activeReg.displayName}</strong></span>
              <span>(Reg {activeReg.address})</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '2px 6px' }}>
            <Search size={11} className="text-muted" />
            <input
              type="text"
              placeholder="Search Reg / Tag / Hex..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '11px',
                width: '140px',
                fontFamily: 'var(--font-mono)'
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '11px' }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Modbus Monospace Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}>
              <th style={{ padding: '6px 10px', width: '90px' }}>Register</th>
              <th style={{ padding: '6px 10px', width: '70px' }}>Hex</th>
              <th style={{ padding: '6px 10px', width: '130px' }}>Parameter Tag</th>
              <th style={{ padding: '6px 10px', width: '100px' }}>Subsystem</th>
              <th style={{ padding: '6px 10px', width: '70px' }}>Scale</th>
              <th style={{ padding: '6px 10px', width: '60px' }}>Unit</th>
              <th style={{ padding: '6px 10px', width: '90px' }}>Word Type</th>
              <th style={{ padding: '6px 10px' }}>Authoritative Description &amp; PLC Mapping</th>
              <th style={{ padding: '6px 10px', width: '65px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegisters.map((reg) => {
              const isSelected = selectedSensor && (
                reg.displayName.toLowerCase() === selectedSensor.toLowerCase() ||
                selectedSensor.toLowerCase().includes(reg.displayName.toLowerCase())
              );
              const hexAddr = `0x${reg.address.toString(16).toUpperCase().padStart(4, '0')}`;
              const isSetpoint = reg.address >= 200 && reg.address <= 202;

              return (
                <tr
                  key={reg.address}
                  style={{
                    borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.05))',
                    background: isSelected
                      ? 'rgba(0, 210, 255, 0.08)'
                      : isSetpoint
                      ? 'rgba(168, 85, 247, 0.04)'
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease'
                  }}
                  onClick={() => onSelectSensor(reg.displayName)}
                  className="cad-terminal-reg-row"
                >
                  <td style={{ padding: '5px 10px', fontWeight: 700, color: isSetpoint ? '#C084FC' : 'var(--accent-cyan)' }}>
                    Reg {reg.address}
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>
                    {hexAddr}
                  </td>
                  <td style={{ padding: '5px 10px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {reg.displayName}
                  </td>
                  <td style={{ padding: '5px 10px' }}>
                    <span style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '2px',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)'
                    }}>
                      {reg.category}
                    </span>
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>
                    {reg.scaling === 1 ? '1.0×' : reg.scaling === 100 ? '0.01×' : '0.1×'}
                  </td>
                  <td style={{ padding: '5px 10px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {reg.engineeringUnit || '--'}
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--text-muted)', fontSize: '10.5px' }}>
                    {reg.isSigned ? 'Signed 16' : 'Unsigned 16'}
                  </td>
                  <td style={{ padding: '5px 10px', color: 'var(--text-main)' }}>
                    {reg.description}
                    {reg.notes && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '10px' }}>
                        [{reg.notes}]
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSensor(reg.displayName);
                      }}
                      style={{
                        padding: '1px 6px',
                        fontSize: '10px',
                        borderRadius: '2px',
                        border: '1px solid var(--border-color)',
                        background: isSelected ? 'var(--accent-cyan)' : 'var(--bg-subtle)',
                        color: isSelected ? '#000000' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                      title={`Inspect ${reg.displayName} in Scope`}
                    >
                      {isSelected ? 'Focused' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredRegisters.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No Modbus holding registers matching "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Footer */}
      <div style={{
        padding: '5px 12px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '10.5px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-subtle)'
      }}>
        <span>Displaying {filteredRegisters.length} of {allRegisters.length} PLC Modbus Holding Registers (Port 502: Addresses 0–61, 200–202)</span>
        <span>Click any row to focus channel in Scope &amp; Inspector</span>
      </div>
    </div>
  );
};

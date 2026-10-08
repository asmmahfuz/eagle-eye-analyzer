import React from 'react';
import { getRegisterByName, getRegisterByAddress } from '../../engine/registers';

export interface CadRegisterBadgeProps {
  channelName?: string;
  address?: number;
  className?: string;
  style?: React.CSSProperties;
  showPrefix?: boolean; // if true renders "[Reg 2]" else "R2"
}

/**
 * Compact Modbus Hardware Register Badge
 * Displays authoritative PLC Modbus Address overlays for channel nodes
 */
export const CadRegisterBadge: React.FC<CadRegisterBadgeProps> = ({
  channelName,
  address,
  className = '',
  style,
  showPrefix = false
}) => {
  const regDef = address !== undefined
    ? getRegisterByAddress(address)
    : (channelName ? getRegisterByName(channelName) : undefined);

  if (!regDef) return null;

  const label = showPrefix ? `Reg ${regDef.address}` : `R${regDef.address}`;

  return (
    <span
      className={`cad-reg-badge font-mono ${className}`}
      title={`PLC Modbus Register Address ${regDef.address}: ${regDef.displayName} (${regDef.engineeringUnit || 'raw'})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '9.5px',
        fontWeight: 600,
        padding: '1px 4px',
        borderRadius: '3px',
        background: 'rgba(168, 85, 247, 0.14)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        color: '#C084FC',
        lineHeight: 1.1,
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style
      }}
    >
      {label}
    </span>
  );
};

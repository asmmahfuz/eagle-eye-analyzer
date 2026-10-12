import React from 'react';
import { SubsystemCategory, SUBSYSTEM_LABELS } from '../../../types';
import { MatrixRowItem } from './useCoreMatrixRows';

export interface CoreInspectionRowProps {
  row: MatrixRowItem;
  onSelectSensor: (sensorName: string) => void;
  onOpenMetricsModal: (sensorName: string) => void;
}

export const CoreInspectionRow: React.FC<CoreInspectionRowProps> = ({
  row,
  onSelectSensor,
  onOpenMetricsModal
}) => {
  const subLabel = SUBSYSTEM_LABELS[row.category as SubsystemCategory] || row.category;

  return (
    <tr className={row.isPass ? 'row-pass' : 'row-fail'}>
      <td>
        <span
          style={{
            cursor: 'pointer',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            display: 'inline-block',
            lineHeight: 1.25,
            margin: 0
          }}
          onClick={() => onSelectSensor(row.sensorName)}
          title={`Click to open scope for ${row.friendlyName} (${row.sensorName} • ${subLabel})`}
        >
          {row.friendlyName}
        </span>
      </td>

      <td>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.25, margin: 0, display: 'inline-block' }}>
          {row.stageCondition}
        </span>
      </td>

      <td>
        <span
          className="font-mono font-bold"
          style={{
            fontSize: '11.5px',
            color: row.isPass ? 'var(--text-main)' : 'var(--danger-text)',
            lineHeight: 1.25,
            margin: 0,
            display: 'inline-block'
          }}
        >
          {row.measuredResult}
        </span>
      </td>

      <td>
        <span className="font-mono text-dim" style={{ fontSize: '11px', lineHeight: 1.25, margin: 0, display: 'inline-block' }}>
          {row.expectedRange}
        </span>
      </td>

      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', margin: 0, verticalAlign: 'middle' }}>
          <span className={`cad-stage-badge ${row.isPass ? 'pass' : 'fail'}`}>
            {row.isPass ? 'PASS' : 'FAIL'}
          </span>

          <button
            type="button"
            className="cad-details-btn"
            onClick={() => onOpenMetricsModal(row.sensorName)}
            title={`Open Advanced Metrology Modal for ${row.friendlyName}`}
          >
            ⋯ Details
          </button>
        </div>
      </td>
    </tr>
  );
};

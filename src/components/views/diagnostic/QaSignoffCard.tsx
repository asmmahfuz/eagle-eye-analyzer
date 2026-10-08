import React from 'react';
import { ClipboardCheck, CheckSquare, Square, Check } from '../../Icons';

export interface QaItem {
  id: string;
  label: string;
}

export interface QaSignoffCardProps {
  title: string;
  items: QaItem[];
  checklistState: Record<string, boolean>;
  onToggleItem: (id: string) => void;
  testerName: string;
  dateTested: string;
  isSigned: boolean;
  onToggleSigned: () => void;
}

export const QaSignoffCard: React.FC<QaSignoffCardProps> = ({
  title,
  items,
  checklistState,
  onToggleItem,
  testerName,
  dateTested,
  isSigned,
  onToggleSigned
}) => {
  const totalItems = items.length;
  const completedItems = items.filter(i => checklistState[i.id]).length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="qa-signoff-checklist-card">
      <div className="qa-checklist-header">
        <div className="qa-title-col">
          <ClipboardCheck size={14} className="text-cyan-400" />
          <span className="qa-title">{title}</span>
        </div>
        <div className="qa-progress-tag">
          {completedItems} of {totalItems} verified ({progressPercent}%)
        </div>
      </div>

      <div className="qa-checklist-items-grid">
        {items.map(item => {
          const checked = !!checklistState[item.id];
          return (
            <label
              key={item.id}
              className={`qa-checkbox-label ${checked ? 'is-checked' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onToggleItem(item.id);
              }}
            >
              {checked ? (
                <CheckSquare size={14} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Square size={14} className="text-dim flex-shrink-0" />
              )}
              <span className="qa-label-text">{item.label}</span>
            </label>
          );
        })}
      </div>

      <div className="qa-signoff-footer">
        <div className="qa-signoff-details">
          <span>Tester: <strong>{testerName}</strong></span>
          <span style={{ margin: '0 6px' }}>•</span>
          <span>Date: <strong>{dateTested}</strong></span>
        </div>

        <button
          type="button"
          className={`qa-signoff-btn ${isSigned ? 'is-signed' : ''}`}
          onClick={onToggleSigned}
          disabled={progressPercent < 100 && !isSigned}
          title={progressPercent < 100 ? 'Complete all QA checklist items before signing' : ''}
        >
          {isSigned ? (
            <>
              <Check size={13} />
              <span>QA Traveler Approved & Signed</span>
            </>
          ) : (
            <>
              <ClipboardCheck size={13} />
              <span>Sign Off & Approve QA Traveler</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

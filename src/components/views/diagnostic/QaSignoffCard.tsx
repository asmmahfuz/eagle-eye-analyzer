import React, { useState } from 'react';
import { ClipboardCheck, CheckSquare, Square, Check, ChevronDown, ChevronRight } from '../../Icons';

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
  defaultCollapsed?: boolean;
}

export const QaSignoffCard: React.FC<QaSignoffCardProps> = ({
  title,
  items,
  checklistState,
  onToggleItem,
  testerName,
  dateTested,
  isSigned,
  onToggleSigned,
  defaultCollapsed = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const totalItems = items.length;
  const completedItems = items.filter(i => checklistState[i.id]).length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  return (
    <div className={`qa-signoff-checklist-card ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
      {/* Collapsible Header Drawer Bar */}
      <div
        className="qa-checklist-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        title={isCollapsed ? "Click to expand QA sign-off traveler" : "Click to collapse drawer"}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="qa-title-col" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCollapsed ? (
            <ChevronRight size={14} className="text-dim flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-dim flex-shrink-0" />
          )}
          <ClipboardCheck size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="qa-title">{title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="qa-progress-tag">
            {completedItems} of {totalItems} verified ({progressPercent}%)
          </div>

          {isSigned && (
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '3px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}>
              ✓ Approved
            </span>
          )}

          <span style={{ fontSize: '10.5px', color: 'var(--accent-cyan)' }}>
            {isCollapsed ? 'Expand ▾' : 'Collapse ▴'}
          </span>
        </div>
      </div>

      {/* Expanded Drawer Body */}
      {!isCollapsed && (
        <>
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
        </>
      )}
    </div>
  );
};

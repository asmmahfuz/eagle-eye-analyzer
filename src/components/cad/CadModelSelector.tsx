import React, { useState, useRef, useEffect } from 'react';
import { CduModelId, CduModelProfile } from '../../engine/models/modelTypes';
import { getAllModelProfiles, getModelProfile } from '../../engine/models/modelRegistry';
import { Cpu, CheckCircle2, ChevronDown, Layers } from '../Icons';

interface CadModelSelectorProps {
  currentModelId: CduModelId;
  onSelectModel: (modelId: CduModelId) => void;
  detectedModelId?: CduModelId;
  disabled?: boolean;
}

export const CadModelSelector: React.FC<CadModelSelectorProps> = ({
  currentModelId,
  onSelectModel,
  detectedModelId,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profiles = getAllModelProfiles();
  const currentProfile = getModelProfile(currentModelId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: CduModelId) => {
    onSelectModel(id);
    setIsOpen(false);
  };

  return (
    <div className="cad-model-selector-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`cad-model-selector-btn ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        title={`Active CDU Model Profile: ${currentProfile.name} (${currentProfile.nominalCapacityKw} kW)`}
        aria-label="Select CDU Model Profile"
        aria-expanded={isOpen}
      >
        <span className="cad-model-btn-icon">
          <Cpu size={12} />
        </span>
        <span className="cad-model-btn-label">{currentProfile.shortName}</span>
        <span className="cad-model-btn-tag">
          {currentProfile.series === 'air-to-liquid' ? 'Air' : `${currentProfile.nominalCapacityKw}kW`}
        </span>
        <span className="cad-model-btn-arrow">
          <ChevronDown size={11} />
        </span>
      </button>

      {isOpen && (
        <div className="cad-model-dropdown-menu" role="menu">
          <div className="cad-model-dropdown-header">
            <span className="cad-model-dd-title">CDU Hardware Architecture</span>
            <span className="cad-model-dd-sub">Select engineering profile & register schema</span>
          </div>

          <div className="cad-model-list">
            {profiles.map((profile: CduModelProfile) => {
              const isSelected = profile.id === currentModelId;
              const isAutoDetected = detectedModelId === profile.id;

              return (
                <button
                  key={profile.id}
                  type="button"
                  className={`cad-model-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(profile.id)}
                  role="menuitem"
                >
                  <div className="cad-model-item-radio">
                    <span className={`cad-model-radio-dot ${isSelected ? 'checked' : ''}`} />
                  </div>
                  <div className="cad-model-item-content">
                    <div className="cad-model-item-head">
                      <span className="cad-model-item-name">{profile.shortName}</span>
                      <span className="cad-model-item-capacity">
                        {profile.nominalCapacityKw} kW • {profile.series === 'air-to-liquid' ? 'Air-Cooled' : 'Liquid-to-Liquid'}
                      </span>
                      {isAutoDetected && (
                        <span className="cad-model-detected-pill" title="Auto-detected from uploaded workbook">
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="cad-model-item-desc">
                      {profile.pumping.type === 'triplex_staged_vfd'
                        ? 'Triplex VFD Pumps • Fan Speed Array • Reservoir Level'
                        : 'Dual Circulating Pumps • Plate Heat Exchanger • Modbus TCP'}
                    </div>
                    <div className="cad-model-item-badges">
                      {profile.badges.slice(0, 3).map((badge, idx) => (
                        <span key={idx} className="cad-model-badge-chip">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="cad-model-check-icon">
                      <CheckCircle2 size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="cad-model-dropdown-footer">
            <Layers size={11} />
            <span>Switches channel taxonomies, register offsets & diagnostic rules</span>
          </div>
        </div>
      )}
    </div>
  );
};

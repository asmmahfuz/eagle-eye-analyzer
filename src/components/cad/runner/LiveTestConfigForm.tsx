import React from 'react';
import { LiveTestConfig } from '../../../engine/runner/runnerTypes';
import { CduModelId } from '../../../engine/models/modelTypes';
import { Cpu, RotateCcw } from '../../Icons';

interface LiveTestConfigFormProps {
  config: LiveTestConfig;
  onChange: (updated: Partial<LiveTestConfig>) => void;
  disabled?: boolean;
}

export const LiveTestConfigForm: React.FC<LiveTestConfigFormProps> = ({
  config,
  onChange,
  disabled = false
}) => {
  const handlePreloadDefaults = (serial: string, wo: string) => {
    onChange({
      serialNumber: serial,
      workOrderNumber: wo,
      partNumber: '900-02233',
      saleOrderNumber: 'SO26011',
      softwareVersion: '0.23',
      firmwareVersion: '1.41.329',
      testedBy: 'mdtahmid.jami',
      ipAddress: '169.254.244.6',
      port: 502,
      modelId: 'CHx2000'
    });
  };

  return (
    <div className="cad-live-config-form">
      {/* Traveler Identification */}
      <div className="cad-form-section">
        <div className="cad-form-section-title">
          <span>Factory Traveler & Unit Identity</span>
          <div className="cad-form-preset-actions">
            <button
              type="button"
              className="cad-btn-text-sm"
              disabled={disabled}
              onClick={() => handlePreloadDefaults('CD050L', 'WO2602286')}
            >
              Preset: CD050L
            </button>
            <button
              type="button"
              className="cad-btn-text-sm"
              disabled={disabled}
              onClick={() => handlePreloadDefaults('CD04XB', 'WO2601284')}
            >
              Preset: CD04XB
            </button>
          </div>
        </div>

        <div className="cad-form-grid-3">
          <div className="cad-form-group">
            <label className="cad-form-label">Serial Number</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.serialNumber}
              disabled={disabled}
              onChange={(e) => onChange({ serialNumber: e.target.value })}
              placeholder="e.g. CD050L"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Work Order Number</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.workOrderNumber}
              disabled={disabled}
              onChange={(e) => onChange({ workOrderNumber: e.target.value })}
              placeholder="e.g. WO2602286"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Tested By (Technician)</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.testedBy}
              disabled={disabled}
              onChange={(e) => onChange({ testedBy: e.target.value })}
              placeholder="e.g. mdtahmid.jami"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Software Version</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.softwareVersion}
              disabled={disabled}
              onChange={(e) => onChange({ softwareVersion: e.target.value })}
              placeholder="e.g. 0.23"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Firmware Version</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.firmwareVersion}
              disabled={disabled}
              onChange={(e) => onChange({ firmwareVersion: e.target.value })}
              placeholder="e.g. 1.41.329"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Part Number</label>
            <input
              type="text"
              className="cad-form-input"
              value={config.partNumber}
              disabled={disabled}
              onChange={(e) => onChange({ partNumber: e.target.value })}
              placeholder="e.g. 900-02233"
            />
          </div>
        </div>
      </div>

      {/* Hardware Communications & Rig Setup */}
      <div className="cad-form-section">
        <div className="cad-form-section-title">
          <span>Modbus TCP Hardware Rig Connection</span>
        </div>

        <div className="cad-form-grid-3">
          <div className="cad-form-group">
            <label className="cad-form-label">Target PLC IP Address</label>
            <input
              type="text"
              className="cad-form-input font-mono"
              value={config.ipAddress}
              disabled={disabled}
              onChange={(e) => onChange({ ipAddress: e.target.value })}
              placeholder="169.254.244.6"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">Modbus TCP Port</label>
            <input
              type="number"
              className="cad-form-input font-mono"
              value={config.port}
              disabled={disabled}
              onChange={(e) => onChange({ port: Number(e.target.value) })}
              placeholder="502"
            />
          </div>

          <div className="cad-form-group">
            <label className="cad-form-label">CDU Architecture Model</label>
            <select
              className="cad-form-select"
              value={config.modelId}
              disabled={disabled}
              onChange={(e) => onChange({ modelId: e.target.value as CduModelId })}
            >
              <option value="CHx2000">CoolIT CHx2000 (Liquid 2000 kW)</option>
              <option value="CHx1000">CoolIT CHx1000 (Liquid 1000 kW)</option>
              <option value="AHx180">CoolIT AHx180 (Air-Cooled 180 kW)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dwell Execution Mode & Speed */}
      <div className="cad-form-section">
        <div className="cad-form-section-title">
          <span>Excitation Profile Execution Speed</span>
        </div>

        <div className="cad-speed-grid">
          {[
            { mult: 10, label: '10× Rapid Bay Test (52s)', desc: 'Recommended for rapid shopfloor automated validation' },
            { mult: 5, label: '5× Dwell Test (105s)', desc: 'Standard high-speed dwell verification' },
            { mult: 1, label: '1× Real-Time Factory Pace (525s)', desc: 'Full 8.75 min factory EOL test pace matching test bench' },
            { mult: 0, label: 'Instant Audit (0s)', desc: 'Instant calculation and immediate QA report release' }
          ].map(opt => (
            <label 
              key={opt.mult} 
              className={`cad-speed-option ${config.speedMultiplier === opt.mult ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name="speedMultiplier"
                value={opt.mult}
                checked={config.speedMultiplier === opt.mult}
                disabled={disabled}
                onChange={() => onChange({ speedMultiplier: opt.mult })}
              />
              <div className="cad-speed-text">
                <span className="cad-speed-title">{opt.label}</span>
                <span className="cad-speed-desc">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

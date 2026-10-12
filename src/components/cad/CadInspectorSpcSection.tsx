import React from 'react';
import { ParameterSummary } from '../../types';

export interface CadInspectorSpcSectionProps {
  summary: ParameterSummary;
  isOpen: boolean;
  onToggle: () => void;
}

export const CadInspectorSpcSection: React.FC<CadInspectorSpcSectionProps> = ({
  summary,
  isOpen,
  onToggle
}) => {
  return (
    <div className="cad-prop-group">
      <div className="cad-prop-group-header" onClick={onToggle}>
        <span className="cad-prop-chevron">{isOpen ? '▾' : '▸'}</span>
        <span className="cad-prop-group-title">Statistical SPC 3-Sigma</span>
      </div>
      {isOpen && (
        <table className="cad-prop-table">
          <tbody>
            <tr>
              <td className="cad-prop-key">Process Mean (μ)</td>
              <td className="cad-prop-val font-mono">
                {summary.nominalMean !== null ? `${summary.nominalMean.toFixed(2)} ${summary.unit}` : '--'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Process Sigma (σ)</td>
              <td className="cad-prop-val font-mono">
                {summary.processSigma !== null ? `${summary.processSigma.toFixed(3)} ${summary.unit}` : '--'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Lower 3σ (μ - 3σ)</td>
              <td className="cad-prop-val font-mono text-cyan">
                {summary.low3Sigma !== null ? `${summary.low3Sigma.toFixed(2)} ${summary.unit}` : '--'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Upper 3σ (μ + 3σ)</td>
              <td className="cad-prop-val font-mono text-cyan">
                {summary.high3Sigma !== null ? `${summary.high3Sigma.toFixed(2)} ${summary.unit}` : '--'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">3σ Half-Span (3σ)</td>
              <td className="cad-prop-val font-mono">
                {summary.threeSigmaSpan !== null ? `±${summary.threeSigmaSpan.toFixed(2)} ${summary.unit}` : '--'}
              </td>
            </tr>
            <tr>
              <td className="cad-prop-key">Max |Z| Error</td>
              <td className="cad-prop-val font-mono">
                <span className={`cad-z-badge ${summary.maxZScore && summary.maxZScore > 3.0 ? 'z-breach' : 'z-ok'}`}>
                  {summary.maxZScore !== null ? `${summary.maxZScore.toFixed(2)} σ` : '--'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

import React from 'react';
import { AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface ExplainabilityCardProps {
  score: number;
  level: string;
  factors: string[];
  missDistanceKm?: number;
  relativeVelocityKms?: number;
  timeToTcaHours?: number;
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({
  score,
  level,
  factors,
  missDistanceKm,
  relativeVelocityKms,
  timeToTcaHours
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Risk Assessment</h3>
        </div>
        <RiskBadge level={level} size="sm" />
      </div>

      {/* Main Score Gauge Display */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-full border-4 border-orange-500/20 bg-orange-50/30">
          <div className="text-center">
            <span className="text-2xl font-black text-slate-900 leading-none">{Math.round(score)}</span>
            <span className="text-[10px] text-slate-500 block font-semibold">/100</span>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Hazard Level</div>
          <div className="text-base font-bold text-slate-900">
            {level} Risk Priority
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Prototype risk score based on orbital screening features
          </div>
        </div>
      </div>

      {/* "Why is this risky?" section */}
      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
          <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
          <span>Why is this risky?</span>
        </div>
        <ul className="space-y-1.5">
          {factors.map((factor, index) => (
            <li key={index} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Metrics footer */}
      {(missDistanceKm !== undefined || relativeVelocityKms !== undefined) && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
          <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
            <div className="text-[10px] text-slate-500">Miss Distance</div>
            <div className="text-xs font-bold text-slate-800">{missDistanceKm?.toFixed(2)} km</div>
          </div>
          <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
            <div className="text-[10px] text-slate-500">Rel. Velocity</div>
            <div className="text-xs font-bold text-slate-800">{relativeVelocityKms?.toFixed(2)} km/s</div>
          </div>
          <div className="bg-slate-50 rounded p-1.5 border border-slate-100">
            <div className="text-[10px] text-slate-500">Time to TCA</div>
            <div className="text-xs font-bold text-slate-800">{timeToTcaHours?.toFixed(1)} hrs</div>
          </div>
        </div>
      )}
    </div>
  );
};

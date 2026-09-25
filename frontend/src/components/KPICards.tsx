import React from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  Hourglass, 
  Zap, 
  Compass
} from 'lucide-react';
import type { TelemetryReading } from '../types/telemetry';

interface KPICardsProps {
  telemetry: TelemetryReading | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ telemetry }) => {
  const healthScore = telemetry?.health_score ?? (telemetry?.anomaly === 1 ? 58.2 : 94.8);
  const isAnomaly = telemetry?.anomaly === 1;
  const faultType = telemetry?.fault_type || 'none';
  const rulHours = telemetry?.rul_hours ?? 1150.0;
  const fidelityScore = ((telemetry?.twin_fidelity_score ?? 0.985) * 100).toFixed(1);

  // Health color logic
  const healthColor = healthScore >= 75 ? 'emerald' : healthScore >= 50 ? 'amber' : 'red';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* 1. Health Index Score */}
      <div className={`glass-panel p-4 rounded-xl border flex items-center justify-between transition-all ${isAnomaly ? 'glass-panel-danger' : 'border-blue-900/40'}`}>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Health Index
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className={`text-3xl font-extrabold tracking-tight ${healthColor === 'emerald' ? 'text-emerald-400' : healthColor === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
              {healthScore.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            {healthScore >= 75 ? 'Optimal Dynamics' : healthScore >= 50 ? 'Subsystem Degradation' : 'Imminent Failure Risk'}
          </span>
        </div>
        
        {/* Radial Progress Graphic */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={healthColor === 'emerald' ? 'text-emerald-400' : healthColor === 'amber' ? 'text-amber-400' : 'text-red-400'}
              strokeDasharray={`${healthScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-200">{healthScore.toFixed(0)}%</span>
        </div>
      </div>

      {/* 2. Remaining Useful Life (RUL) */}
      <div className="glass-panel p-4 rounded-xl border border-blue-900/40">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Hourglass className="w-4 h-4 text-amber-400" /> Remaining Useful Life
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-extrabold text-amber-300 tracking-tight">
            {rulHours.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-medium">Flight Hrs</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span>Confidence: ±23 hrs</span>
          <span className="text-slate-300">{(telemetry?.engine_operating_hours_cumulative ?? 1000).toFixed(0)}h Total</span>
        </div>
      </div>

      {/* 3. AI Diagnostics & Anomaly Status */}
      <div className={`glass-panel p-4 rounded-xl border ${isAnomaly ? 'border-red-500/70 bg-red-950/30' : 'border-blue-900/40'}`}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <AlertOctagon className={`w-4 h-4 ${isAnomaly ? 'text-red-400 animate-bounce' : 'text-emerald-400'}`} />
          AI Diagnostics
        </span>
        <div className="mt-2">
          {isAnomaly ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-red-400 uppercase tracking-wide">
                🚨 {faultType.replace(/_/g, ' ')}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              🟢 ALL SYSTEMS NOMINAL
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 block mt-1">
          {isAnomaly ? 'SHAP Root Cause Flagged' : 'Continuous Isolation Forest Scan'}
        </span>
      </div>

      {/* 4. Digital Twin State Fidelity */}
      <div className="glass-panel p-4 rounded-xl border border-blue-900/40">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-cyan-400" /> Twin Fidelity Score
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
            {fidelityScore}%
          </span>
          <span className="text-xs text-slate-400 font-medium">Kalman Sync</span>
        </div>
        <span className="text-[11px] text-slate-400 block mt-1">
          {telemetry?.is_virtual_reading_cht ? 'Virtual Redundancy Active' : 'EKF Residuals Within Bounds'}
        </span>
      </div>

      {/* 5. Mission Profile & Flight Phase */}
      <div className="glass-panel p-4 rounded-xl border border-blue-900/40">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-purple-400" /> Flight Profile
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-xl font-bold text-purple-300 uppercase tracking-tight">
            {telemetry?.flight_phase || 'Cruise'}
          </span>
          <span className="text-xs text-slate-400">@ {((telemetry?.altitude ?? 5000)).toFixed(0)}m</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span>Speed: {(telemetry?.airspeed ?? 120).toFixed(0)} km/h</span>
          <span className="text-cyan-400">{(telemetry?.rpm ?? 3000).toFixed(0)} RPM</span>
        </div>
      </div>

    </div>
  );
};

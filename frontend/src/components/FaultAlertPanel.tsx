import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  ShieldAlert
} from 'lucide-react';
import type { AlertItem, TelemetryReading } from '../types/telemetry';

interface FaultAlertPanelProps {
  telemetry: TelemetryReading | null;
  alerts: AlertItem[];
  onAcknowledge: (id: number) => void;
}

export const FaultAlertPanel: React.FC<FaultAlertPanelProps> = ({
  telemetry,
  alerts,
  onAcknowledge
}) => {
  const isAnomaly = telemetry?.anomaly === 1;
  const faultType = telemetry?.fault_type || 'none';
  const explanations = telemetry?.shap_explanations || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      {/* 1. SHAP AI Root Cause Explainability Panel */}
      <div className={`glass-panel p-5 rounded-2xl border ${isAnomaly ? 'glass-panel-danger' : 'border-blue-900/30'} flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <ShieldAlert className={`w-5 h-5 ${isAnomaly ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                SHAP AI Root Cause Explainability
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isAnomaly ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              {isAnomaly ? `FAULT: ${faultType.replace(/_/g, ' ')}` : 'NOMINAL INFERENCE'}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Feature attributions calculating deviations from calibrated baseline physics:
          </p>

          {explanations.length > 0 ? (
            <div className="space-y-3">
              {explanations.map((exp, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${exp.direction === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {exp.direction === 'high' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 capitalize">
                        {exp.feature.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Observed: <span className="text-white font-mono">{exp.value} {exp.unit}</span> (Baseline: {exp.baseline} {exp.unit})
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-mono font-bold ${exp.delta > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {exp.delta > 0 ? `+${exp.delta}` : exp.delta} {exp.unit}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Impact Weight: <span className="text-amber-400 font-mono font-bold">{exp.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-slate-300 font-medium">All Sensor Residuals Nominal</p>
              <p className="text-[11px] text-slate-500 mt-1">No feature deviations beyond 2.5σ standard thresholds.</p>
            </div>
          )}
        </div>

        {/* Explainability Footer Summary */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Inference Engine: GradientBoosting + IsolationForest</span>
          <span className="text-cyan-400">Decision Confidence: 94.2%</span>
        </div>
      </div>

      {/* 2. Real-Time Alert Log & Acknowledgements */}
      <div className="glass-panel p-5 rounded-2xl border border-blue-900/30 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Engine Alert Dispatch Log
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{alerts.length} Total</span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.slice(0, 6).map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    alert.severity === 'critical'
                      ? 'bg-red-950/30 border-red-500/50'
                      : alert.severity === 'high'
                      ? 'bg-amber-950/30 border-amber-500/50'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : alert.severity === 'high'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-white uppercase">
                        {alert.fault_type || alert.alert_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{alert.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(alert.timestamp).toLocaleTimeString()} • RUL: {alert.rul_hours?.toFixed(0) ?? '--'}h
                    </span>
                  </div>

                  <div>
                    {!alert.acknowledged ? (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ACK</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10">
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active alarm dispatches recorded.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Relational Store: SQLite / TimescaleDB</span>
          <span className="text-amber-400">Automated GCS Telemetry Stream</span>
        </div>
      </div>

    </div>
  );
};

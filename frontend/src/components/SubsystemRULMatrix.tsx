import React from 'react';
import { 
  Cpu, 
  Flame, 
  Droplet, 
  Zap, 
  Activity, 
  Clock
} from 'lucide-react';
import type { TelemetryReading } from '../types/telemetry';

interface SubsystemRULMatrixProps {
  telemetry: TelemetryReading | null;
}

export const SubsystemRULMatrix: React.FC<SubsystemRULMatrixProps> = ({ telemetry }) => {
  const subsystems = telemetry?.subsystem_health || {
    cylinder_heads: {
      name: 'Cylinder Head & Valves',
      health_score: 96.0,
      rul_hours: 1150.0,
      status: 'nominal',
      sensor_key: 'cht',
      sensor_value: 175.0,
      sensor_unit: '°C'
    },
    exhaust_system: {
      name: 'Exhaust & Turbocharger',
      health_score: 94.5,
      rul_hours: 1120.0,
      status: 'nominal',
      sensor_key: 'egt',
      sensor_value: 620.0,
      sensor_unit: '°C'
    },
    lubrication_circuit: {
      name: 'Lubrication Circuit & Sump',
      health_score: 98.0,
      rul_hours: 1180.0,
      status: 'nominal',
      sensor_key: 'oil_pressure',
      sensor_value: 5.5,
      sensor_unit: 'bar'
    },
    fuel_injection: {
      name: 'Fuel Injector Rail',
      health_score: 95.0,
      rul_hours: 1140.0,
      status: 'nominal',
      sensor_key: 'fuel_flow_rate',
      sensor_value: 18.0,
      sensor_unit: 'L/h'
    },
    core_block: {
      name: 'Engine Block & Crankcase',
      health_score: 99.0,
      rul_hours: 1200.0,
      status: 'nominal',
      sensor_key: 'vibration_rms',
      sensor_value: 0.20,
      sensor_unit: 'g'
    }
  };

  const getSubsystemIcon = (key: string) => {
    switch (key) {
      case 'cylinder_heads': return Cpu;
      case 'exhaust_system': return Flame;
      case 'lubrication_circuit': return Droplet;
      case 'fuel_injection': return Zap;
      default: return Activity;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-blue-900/30">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Subsystem Remaining Useful Life (RUL) & Degradation Breakdown
          </h3>
          <p className="text-xs text-slate-400">
            Per-component physical wear index and remaining operational flight hours
          </p>
        </div>
        <span className="text-xs text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
          Total Engine Life Limit: 1,500 Hrs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(subsystems).map(([key, sub]) => {
          const Icon = getSubsystemIcon(key);
          const isCritical = sub.health_score < 50;
          const isWarning = sub.health_score >= 50 && sub.health_score < 75;

          return (
            <div 
              key={key} 
              className={`bg-slate-900/80 border p-4 rounded-xl flex flex-col justify-between transition-all ${
                isCritical 
                  ? 'border-red-500/60 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : isWarning 
                  ? 'border-amber-500/40' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${
                    isCritical ? 'bg-red-500/20 text-red-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    isCritical ? 'bg-red-500/20 text-red-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {sub.status}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{sub.name}</h4>
                
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-xl font-extrabold text-white font-mono">{sub.rul_hours.toFixed(0)} <span className="text-xs font-sans text-slate-400 font-normal">hrs</span></span>
                  <span className={`text-xs font-bold font-mono ${
                    isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {sub.health_score.toFixed(0)}% Health
                  </span>
                </div>

                {/* Health Score Bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    }`}
                    style={{ width: `${sub.health_score}%` }}
                  />
                </div>
              </div>

              {/* Sensor State Footer */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{sub.sensor_key.toUpperCase()}:</span>
                <span className="text-white font-mono font-semibold">{sub.sensor_value} {sub.sensor_unit}</span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

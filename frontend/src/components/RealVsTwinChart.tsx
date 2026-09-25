import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import type { TelemetryReading } from '../types/telemetry';

interface RealVsTwinChartProps {
  history: TelemetryReading[];
  activeMetric: 'cht' | 'egt' | 'oil';
  setActiveMetric: (m: 'cht' | 'egt' | 'oil') => void;
}

export const RealVsTwinChart: React.FC<RealVsTwinChartProps> = ({
  history,
  activeMetric,
  setActiveMetric
}) => {
  // Format data for Recharts
  const chartData = history.slice(-40).map((r, index) => {
    const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : `${index}s`;
    return {
      time: timeStr,
      // CHT
      real_cht: r.cht ? parseFloat(r.cht.toFixed(1)) : 175,
      twin_cht: r.twin_predicted_cht ? parseFloat(r.twin_predicted_cht.toFixed(1)) : 174.5,
      res_cht: r.residual_cht ? parseFloat(r.residual_cht.toFixed(2)) : 0.5,
      // EGT
      real_egt: r.egt ? parseFloat(r.egt.toFixed(1)) : 620,
      twin_egt: r.twin_predicted_egt ? parseFloat(r.twin_predicted_egt.toFixed(1)) : 618,
      res_egt: r.residual_egt ? parseFloat(r.residual_egt.toFixed(2)) : 2.0,
      // Oil
      real_oil_p: r.oil_pressure ? parseFloat(r.oil_pressure.toFixed(2)) : 5.5,
      twin_oil_p: r.twin_predicted_oil_pressure ? parseFloat(r.twin_predicted_oil_pressure.toFixed(2)) : 5.48,
      res_oil_p: r.residual_oil_pressure ? parseFloat(r.residual_oil_pressure.toFixed(2)) : 0.02,
    };
  });

  return (
    <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 flex flex-col h-[400px]">
      
      {/* Header & Metric Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Physics Digital Twin Synchronization (Kalman State Filter)
          </h3>
          <p className="text-xs text-slate-400">
            Real sensor telemetry vs. thermodynamic ODE Extended Kalman state estimate
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'cht', label: 'CHT Cylinder (°C)' },
            { id: 'egt', label: 'EGT Exhaust (°C)' },
            { id: 'oil', label: 'Oil Pressure (bar)' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeMetric === m.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis 
              stroke="#64748b" 
              tick={{ fontSize: 10 }} 
              domain={
                activeMetric === 'cht' 
                  ? [100, 260] 
                  : activeMetric === 'egt' 
                  ? [450, 850] 
                  : [2, 8]
              } 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#00f0ff',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff',
                boxShadow: '0 0 15px rgba(0,240,255,0.2)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {/* CHT Lines */}
            {activeMetric === 'cht' && (
              <>
                <Line
                  type="monotone"
                  dataKey="real_cht"
                  name="Physical CHT Sensor (°C)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="twin_cht"
                  name="Digital Twin ODE State (°C)"
                  stroke="#00f0ff"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="res_cht"
                  name="Kalman Residual Δ (°C)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}

            {/* EGT Lines */}
            {activeMetric === 'egt' && (
              <>
                <Line
                  type="monotone"
                  dataKey="real_egt"
                  name="Physical EGT Sensor (°C)"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="twin_egt"
                  name="Digital Twin ODE State (°C)"
                  stroke="#00f0ff"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="res_egt"
                  name="Kalman Residual Δ (°C)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}

            {/* Oil Pressure Lines */}
            {activeMetric === 'oil' && (
              <>
                <Line
                  type="monotone"
                  dataKey="real_oil_p"
                  name="Physical Oil Pressure (bar)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="twin_oil_p"
                  name="Digital Twin ODE State (bar)"
                  stroke="#00f0ff"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="res_oil_p"
                  name="Kalman Residual Δ (bar)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                />
              </>
            )}

          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

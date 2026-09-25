import React from 'react';
import type { TelemetryReading } from '../types/telemetry';

interface GaugesProps {
  telemetry: TelemetryReading | null;
}

interface GaugeItemProps {
  title: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  precision?: number;
  color?: string;
  virtual?: boolean;
}

const CircularGauge: React.FC<GaugeItemProps> = ({
  title,
  value,
  min,
  max,
  unit,
  warningThreshold,
  criticalThreshold,
  precision = 1,
  color = '#00f0ff',
  virtual = false
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const strokeDash = 251.2; // Circumference of radius 40
  const offset = strokeDash - percentage * strokeDash * 0.75; // 270 degree arc

  const isCritical = value >= criticalThreshold;
  const isWarning = value >= warningThreshold && !isCritical;
  
  const statusColor = isCritical 
    ? '#ef4444' 
    : isWarning 
    ? '#f59e0b' 
    : color;

  return (
    <div className={`glass-panel p-3.5 rounded-xl border flex flex-col items-center justify-between relative overflow-hidden ${isCritical ? 'border-red-500/50 bg-red-950/20 animate-pulse' : 'border-blue-900/30'}`}>
      
      {virtual && (
        <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
          VIRTUAL TWIN
        </span>
      )}

      <div className="w-full flex justify-between items-center mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCritical ? 'bg-red-500/20 text-red-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {isCritical ? 'CRIT' : isWarning ? 'WARN' : 'OK'}
        </span>
      </div>

      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-135" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="rgba(30, 41, 59, 0.7)"
            strokeWidth="8"
            strokeDasharray={`${strokeDash * 0.75} ${strokeDash}`}
            fill="none"
          />
          {/* Active Arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={statusColor}
            strokeWidth="8"
            strokeDasharray={strokeDash}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s' }}
          />
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white tracking-tight" style={{ color: statusColor }}>
            {value.toFixed(precision)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase">{unit}</span>
        </div>
      </div>

      <div className="w-full flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
        <span>{min}</span>
        <span>{max} {unit}</span>
      </div>

    </div>
  );
};

export const Gauges: React.FC<GaugesProps> = ({ telemetry }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      
      {/* 1. RPM */}
      <CircularGauge
        title="Engine RPM"
        value={telemetry?.rpm ?? 3000}
        min={0}
        max={4000}
        unit="RPM"
        warningThreshold={3500}
        criticalThreshold={3800}
        precision={0}
        color="#00f0ff"
      />

      {/* 2. CHT */}
      <CircularGauge
        title="Cylinder CHT"
        value={telemetry?.cht ?? 175}
        min={0}
        max={300}
        unit="°C"
        warningThreshold={210}
        criticalThreshold={240}
        precision={1}
        color="#38bdf8"
        virtual={telemetry?.is_virtual_reading_cht}
      />

      {/* 3. EGT */}
      <CircularGauge
        title="Exhaust EGT"
        value={telemetry?.egt ?? 620}
        min={0}
        max={900}
        unit="°C"
        warningThreshold={750}
        criticalThreshold={820}
        precision={1}
        color="#fb923c"
        virtual={telemetry?.is_virtual_reading_egt}
      />

      {/* 4. Oil Pressure */}
      <CircularGauge
        title="Oil Pressure"
        value={telemetry?.oil_pressure ?? 5.5}
        min={0}
        max={8}
        unit="bar"
        warningThreshold={6.8}
        criticalThreshold={3.2} // low oil pressure is critical
        precision={2}
        color="#a855f7"
        virtual={telemetry?.is_virtual_reading_oil_pressure}
      />

      {/* 5. Oil Temperature */}
      <CircularGauge
        title="Oil Temp"
        value={telemetry?.oil_temperature ?? 85}
        min={0}
        max={150}
        unit="°C"
        warningThreshold={110}
        criticalThreshold={130}
        precision={1}
        color="#facc15"
      />

      {/* 6. Vibration RMS */}
      <CircularGauge
        title="Vibration RMS"
        value={telemetry?.vibration_rms ?? 0.20}
        min={0}
        max={1.5}
        unit="g"
        warningThreshold={0.55}
        criticalThreshold={0.85}
        precision={3}
        color="#ec4899"
      />

    </div>
  );
};

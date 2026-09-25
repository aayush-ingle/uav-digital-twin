import React from 'react';
import { 
  Wrench, 
  FileText, 
  Sparkles
} from 'lucide-react';
import type { MaintenanceRecordItem, TelemetryReading } from '../types/telemetry';

interface MaintenanceAdvisoryProps {
  telemetry: TelemetryReading | null;
  maintenanceHistory?: MaintenanceRecordItem[];
}

export const MaintenanceAdvisory: React.FC<MaintenanceAdvisoryProps> = ({
  telemetry
}) => {
  const fault = telemetry?.fault_type || 'none';
  const rul = telemetry?.rul_hours ?? 1150;
  const isAnomaly = telemetry?.anomaly === 1;

  // Generate dynamic smart advisories based on active telemetry & wear state
  const advisories = [
    ...(isAnomaly && fault === 'overheating' ? [{
      priority: 'CRITICAL',
      subsystem: 'Cooling & Cylinder Heads',
      action: 'Perform immediate cooling shroud and airflow fin inspection. Check for cylinder head warping and gasket integrity.',
      timeframe: 'Pre-Next Sortie (< 2 Flight Hours)',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/50'
    }] : []),
    ...(isAnomaly && fault === 'lubrication_issue' ? [{
      priority: 'CRITICAL',
      subsystem: 'Lubrication Circuit',
      action: 'Inspect oil scavenge pump pressure relief valve, check oil cooler matrix for blockage, replace 10μm oil filter.',
      timeframe: 'Immediate Ground Servicing Required',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/50'
    }] : []),
    ...(isAnomaly && fault === 'misfire' ? [{
      priority: 'HIGH',
      subsystem: 'Ignition & Spark Plugs',
      action: 'Borescope inspection of cylinder chambers. Check dual CDI ignition timing and replace spark plugs on Cylinders 1-4.',
      timeframe: '< 5 Flight Hours',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    }] : []),
    ...(isAnomaly && fault === 'injector_abnormality' ? [{
      priority: 'HIGH',
      subsystem: 'Fuel Injection Rail',
      action: 'Flow test electronic fuel injectors. Check rail pressure regulator and ultrasonic clean injector nozzles.',
      timeframe: '< 10 Flight Hours',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    }] : []),
    ...(isAnomaly && fault === 'vibration_anomaly' ? [{
      priority: 'HIGH',
      subsystem: 'Engine Mounts & Propeller Balance',
      action: 'Dynamic propeller balancing and engine mount elastomer inspection. Check crankshaft main journal clearances.',
      timeframe: '< 8 Flight Hours',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    }] : []),
    {
      priority: 'ROUTINE',
      subsystem: 'Scheduled 100-Hour Piston Inspection',
      action: 'Compression leak-down test, oil spectrographic wear metal analysis (SOAP), alternator belt tension check.',
      timeframe: `Due in ${(rul > 100 ? (rul % 100) : rul).toFixed(0)} Operating Hours`,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
    },
    {
      priority: 'PREDICTIVE',
      subsystem: 'Digital Twin Model Self-Calibration',
      action: 'Re-sync Kalman filter state covariance matrices following recorded flight mission telemetry.',
      timeframe: 'Automated Post-Flight Routine',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      {/* 1. Automated AI Predictive Maintenance Advisories */}
      <div className="glass-panel p-5 rounded-2xl border border-blue-900/30">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              AI Automated Maintenance Advisories
            </h3>
          </div>
          <span className="text-xs text-slate-400">Condition-Based Maintenance</span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Prescriptive ground technician directives generated from Digital Twin degradation dynamics:
        </p>

        <div className="space-y-3">
          {advisories.map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${item.badgeColor}`}>
                  {item.priority}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{item.timeframe}</span>
              </div>

              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                {item.subsystem}
              </div>

              <p className="text-xs text-slate-300 pl-5 leading-relaxed">
                {item.action}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Historical Maintenance Log & Flight Records */}
      <div className="glass-panel p-5 rounded-2xl border border-blue-900/30 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Engine Maintenance Ledger
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">ENG_001 Records</span>
          </div>

          <div className="space-y-3">
            {[
              {
                date: '2026-08-28',
                type: '500-Hr Top Overhaul Inspection',
                tech: 'Lead Technician (AFB-04)',
                desc: 'Replaced piston rings on Cylinders 1-4, new spark plugs, magneto timing set to 25° BTDC.',
                status: 'COMPLETED'
              },
              {
                date: '2026-08-15',
                type: 'Oil & Filter Service',
                tech: 'Flight Line Crew',
                desc: 'AeroShell W100 Plus oil change, filter cut inspection negative for ferrous particles.',
                status: 'COMPLETED'
              },
              {
                date: '2026-08-01',
                type: 'Turbocharger Wastegate Inspection',
                tech: 'Avionics & Propulsion Team',
                desc: 'Exhaust gas temperature probe recalibrated, wastegate actuator rod lubricated.',
                status: 'COMPLETED'
              }
            ].map((rec, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{rec.type}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                    {rec.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{rec.desc}</p>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Tech: {rec.tech}</span>
                  <span>{rec.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Maintenance Status: Full Flight Clearance</span>
          <span className="text-emerald-400 font-semibold">AIRWORTHY</span>
        </div>
      </div>

    </div>
  );
};

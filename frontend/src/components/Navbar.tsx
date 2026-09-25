import React from 'react';
import { 
  Activity, 
  Play, 
  Square, 
  AlertTriangle, 
  Radio, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  Plane
} from 'lucide-react';
import type { SimulationStatus } from '../services/api';

interface NavbarProps {
  status: SimulationStatus | null;
  isConnected: boolean;
  faultTypes: string[];
  currentFault: string;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onSelectFault: (fault: string) => void;
  activeTab: 'overview' | '3d-twin' | 'analytics' | 'replay' | 'maintenance';
  setActiveTab: (tab: 'overview' | '3d-twin' | 'analytics' | 'replay' | 'maintenance') => void;
  isReplayMode?: boolean;
  setIsReplayMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  isConnected,
  faultTypes,
  currentFault,
  onStartSimulation,
  onStopSimulation,
  onSelectFault,
  activeTab,
  setActiveTab,
  setIsReplayMode
}) => {
  return (
    <header className="w-full border-b border-blue-900/40 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Branding & UAV Status */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-blue-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Plane className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-wider text-white uppercase flex items-center gap-2">
                AREON <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">MALE UAV</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">Piston Engine AI Digital Twin • Mission Command</p>
          </div>
        </div>

        {/* Middle: Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'overview', label: 'Command Overview', icon: Activity },
            { id: '3d-twin', label: '3D Hologram Twin', icon: Radio },
            { id: 'analytics', label: 'AI & SHAP Analytics', icon: AlertTriangle },
            { id: 'replay', label: 'Mission Replay', icon: RotateCcw },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'replay') setIsReplayMode(true);
                  else setIsReplayMode(false);
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Controls & Fault Injector */}
        <div className="flex items-center space-x-3">
          
          {/* WebSocket Status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-xs">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold">LIVE LINK</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-semibold">DISCONNECTED</span>
              </>
            )}
          </div>

          {/* Fault Injector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Inject:
            </span>
            <select
              value={currentFault}
              onChange={(e) => onSelectFault(e.target.value)}
              className="bg-slate-900 border border-amber-500/40 text-amber-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {faultTypes.map((f) => (
                <option key={f} value={f} className="bg-slate-900 text-slate-200">
                  {f === 'none' ? '🟢 None (Nominal)' : `🚨 ${f.replace(/_/g, ' ').toUpperCase()}`}
                </option>
              ))}
            </select>
          </div>

          {/* Start/Stop Simulation Button */}
          {status?.is_running ? (
            <button
              onClick={onStopSimulation}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 transition shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>HALT SIM</span>
            </button>
          ) : (
            <button
              onClick={onStartSimulation}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START SIM</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};

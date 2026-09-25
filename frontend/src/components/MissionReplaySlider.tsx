import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Sliders,
  PlaneTakeoff,
  PlaneLanding
} from 'lucide-react';
import type { TelemetryReading } from '../types/telemetry';

interface MissionReplaySliderProps {
  replayData: TelemetryReading[];
  onSelectReading: (reading: TelemetryReading) => void;
  isReplayMode: boolean;
  setIsReplayMode: (v: boolean) => void;
}

export const MissionReplaySlider: React.FC<MissionReplaySliderProps> = ({
  replayData,
  onSelectReading,
  isReplayMode,
  setIsReplayMode
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const totalPoints = replayData.length > 0 ? replayData.length : 100;

  // Auto-play loop in replay mode
  useEffect(() => {
    let interval: number;
    if (isPlaying && isReplayMode && replayData.length > 0) {
      interval = window.setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= replayData.length) {
            setIsPlaying(false);
            return 0;
          }
          onSelectReading(replayData[next]);
          return next;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isReplayMode, playbackSpeed, replayData, onSelectReading]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    setCurrentIndex(idx);
    if (replayData[idx]) {
      onSelectReading(replayData[idx]);
    }
  };

  const currentReading = replayData[currentIndex];

  return (
    <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 flex flex-col space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Mission Replay & Historical Timeline Scrubbing
            </h3>
            <p className="text-xs text-slate-400">
              Scrub, analyze, and replay past UAV sorties with full physics-twin reconstruction
            </p>
          </div>
        </div>

        {/* Mode Toggle Button */}
        <button
          onClick={() => {
            setIsReplayMode(!isReplayMode);
            setIsPlaying(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            isReplayMode 
              ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {isReplayMode ? '⏸ EXIT REPLAY MODE' : '▶ ACTIVATE REPLAY MODE'}
        </button>
      </div>

      {/* Scrub Bar & Phase Markers */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <PlaneTakeoff className="w-3.5 h-3.5 text-cyan-400" /> T-00:00 (Takeoff)
          </span>
          <span className="text-purple-300 font-bold">
            POINT {currentIndex + 1} / {totalPoints} • {currentReading?.flight_phase?.toUpperCase() ?? 'CRUISE'}
          </span>
          <span className="flex items-center gap-1">
            <PlaneLanding className="w-3.5 h-3.5 text-amber-400" /> T-End (Landing)
          </span>
        </div>

        {/* Timeline Slider */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={totalPoints - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            disabled={!isReplayMode}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400 disabled:opacity-40"
          />
        </div>
      </div>

      {/* Playback Controls & Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
        
        {/* Left: Play/Pause/Reset */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!isReplayMode}
            className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30'
            } disabled:opacity-40`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => {
              setCurrentIndex(0);
              if (replayData[0]) onSelectReading(replayData[0]);
            }}
            disabled={!isReplayMode}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-40"
            title="Rewind to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase px-2 font-bold flex items-center gap-1">
            <FastForward className="w-3 h-3" /> Speed:
          </span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition ${
                playbackSpeed === s
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Current Replay Status Badge */}
        <div className="text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
          RPM: <span className="text-cyan-400 font-bold">{currentReading?.rpm?.toFixed(0) ?? '--'}</span> • CHT: <span className="text-amber-400 font-bold">{currentReading?.cht?.toFixed(1) ?? '--'}°C</span> • Oil P: <span className="text-purple-400 font-bold">{currentReading?.oil_pressure?.toFixed(2) ?? '--'} bar</span>
        </div>

      </div>

    </div>
  );
};

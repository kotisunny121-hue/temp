import React from 'react';
import {
  Waves,
  Brain,
  Layers,
  Sparkles,
  Download,
  Activity,
  Compass,
  BarChart3,
  Cpu,
  FileCode2,
} from 'lucide-react';
import { SynopticEventPreset } from '../types';
import { PRESET_EVENTS } from '../utils/oceanEngine';

interface HeaderProps {
  activeTab: 'map' | 'transect' | 'benchmark' | 'pipeline' | 'architecture';
  setActiveTab: (tab: 'map' | 'transect' | 'benchmark' | 'pipeline' | 'architecture') => void;
  currentPreset: SynopticEventPreset;
  onSelectPreset: (preset: SynopticEventPreset) => void;
  onOpenCopilot: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentPreset,
  onSelectPreset,
  onOpenCopilot,
  onOpenExport,
}) => {
  return (
    <header className="bg-white border-b-[3px] border-black sticky top-0 z-40 px-4 lg:px-6 py-3.5 shadow-[0px_4px_0px_#000000]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-black text-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#FF3B30]">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-black tracking-tighter uppercase flex items-center gap-2 font-display">
                NIO DeepOcean-Transformer
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#FF3B30] text-white font-black border border-black tracking-wider">
                PyTorch v2.4 • NIO 0.25°
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide">
              3D Ocean Subsurface Reconstruction • 7 Satellite Channels &rarr; 15 Depth Layers (0–1000m)
            </p>
          </div>
        </div>

        {/* Synoptic Scenario Preset & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 border-2 border-black px-3 py-1.5 text-xs shadow-[2px_2px_0px_#000000]">
            <Compass className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span className="text-zinc-700 font-mono font-black uppercase text-[10px] tracking-wider hidden sm:inline">Scenario:</span>
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = PRESET_EVENTS.find((p) => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-transparent text-black font-black uppercase tracking-tight focus:outline-none cursor-pointer pr-1 text-xs"
            >
              {PRESET_EVENTS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  className="bg-white text-black font-bold uppercase"
                >
                  {preset.title}
                </option>
              ))}
            </select>
          </div>

          {/* AI Oceanographer Copilot */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF3B30] hover:bg-black text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>AI Ocean Copilot</span>
          </button>

          {/* Export NetCDF / Data */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Export NetCDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t-2 border-black flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
            3D Spatial Map &amp; Layers
          </button>

          <button
            onClick={() => setActiveTab('transect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transect'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
            Vertical Transect Sections
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 stroke-[2.5]" />
            CNN-Transformer Architecture
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
            GLORYS &amp; Argo Benchmark
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 stroke-[2.5]" />
            NetCDF Preprocessing
          </button>
        </nav>

        {/* Live Status indicator */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono font-black uppercase text-black bg-zinc-100 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_#000000]">
          <span className="w-2.5 h-2.5 bg-[#FF3B30] border border-black animate-pulse"></span>
          <span>Inference Ready • NIO (5°N–30°N, 45°E–105°E)</span>
        </div>
      </div>
    </header>
  );
};

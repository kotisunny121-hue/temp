import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { OceanMapViewer } from './components/OceanMapViewer';
import { VerticalTransectViewer } from './components/VerticalTransectViewer';
import { VerticalProfileModal } from './components/VerticalProfileModal';
import { ArchitectureInspector } from './components/ArchitectureInspector';
import { EvaluationBenchmark } from './components/EvaluationBenchmark';
import { DataIngestionPipeline } from './components/DataIngestionPipeline';
import { OceanCopilotModal } from './components/OceanCopilotModal';
import { NetCDFExportModal } from './components/NetCDFExportModal';
import {
  SynopticEventPreset,
  OceanGridPoint,
  ArgoFloat,
  TransectPath,
  ColormapTheme,
} from './types';
import {
  PRESET_EVENTS,
  STANDARD_TRANSECTS,
  generateOceanField,
  getSampleArgoFloats,
} from './utils/oceanEngine';
import {
  Compass,
  Layers,
  Thermometer,
  Activity,
  Flame,
  Droplets,
  Wind,
  Navigation2,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'map' | 'transect' | 'benchmark' | 'pipeline' | 'architecture'
  >('map');

  const [currentPreset, setCurrentPreset] = useState<SynopticEventPreset>(PRESET_EVENTS[0]);
  const [activeTransect, setActiveTransect] = useState<TransectPath>(STANDARD_TRANSECTS[0]);
  const [colormap, setColormap] = useState<ColormapTheme>('turbo');

  // Interactive Inspection Modals
  const [selectedPoint, setSelectedPoint] = useState<OceanGridPoint | null>(null);
  const [selectedFloat, setSelectedFloat] = useState<ArgoFloat | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Generate Northern Indian Ocean Grid Data for selected synoptic scenario
  const { grid, lats, lons } = useMemo(() => {
    return generateOceanField(currentPreset.id);
  }, [currentPreset.id]);

  const argoFloats = useMemo(() => {
    return getSampleArgoFloats();
  }, []);

  const handleCustomTransectDrawn = (
    start: { lat: number; lon: number },
    end: { lat: number; lon: number }
  ) => {
    const customTransect: TransectPath = {
      id: `custom_${Date.now()}`,
      name: `Custom Section (${start.lat.toFixed(1)}°N &rarr; ${end.lat.toFixed(1)}°N)`,
      description: `User-defined vertical cross section from (${start.lat.toFixed(1)}°N, ${start.lon.toFixed(1)}°E) to (${end.lat.toFixed(1)}°N, ${end.lon.toFixed(1)}°E)`,
      start,
      end,
    };
    setActiveTransect(customTransect);
    setActiveTab('transect');
  };

  const handleAskAIAboutPoint = (pt: OceanGridPoint) => {
    setSelectedPoint(pt);
    setSelectedFloat(null);
    setIsCopilotOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-black flex flex-col font-sans selection:bg-[#FF3B30] selection:text-white">
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentPreset={currentPreset}
        onSelectPreset={setCurrentPreset}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Synoptic Scenario Quick Banner */}
        <div className="bg-white border-2 border-black p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#FF3B30] shrink-0">
              <Compass className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-[#FF3B30] uppercase tracking-wider font-mono">
                  ACTIVE OCEAN EVENT:
                </span>
                <span className="text-xs font-mono font-black text-black bg-zinc-100 px-2 py-0.5 border border-black uppercase">
                  {currentPreset.dateStr}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-black uppercase tracking-tight mt-0.5 font-display">
                {currentPreset.title}
              </h2>
            </div>
          </div>

          {/* Key Physics Features Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {currentPreset.keyFeatures.slice(0, 2).map((feat, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-zinc-100 text-black border-2 border-black font-black uppercase text-[11px] tracking-wide shadow-[2px_2px_0px_#000000]"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Tab Viewport Routing */}
        {activeTab === 'map' && (
          <OceanMapViewer
            grid={grid}
            lats={lats}
            lons={lons}
            argoFloats={argoFloats}
            selectedPreset={currentPreset}
            onSelectPoint={setSelectedPoint}
            onSelectFloat={setSelectedFloat}
            onSelectTransect={(t) => {
              setActiveTransect(t);
              setActiveTab('transect');
            }}
            activeTransect={activeTransect}
            onCustomTransectDrawn={handleCustomTransectDrawn}
          />
        )}

        {activeTab === 'transect' && (
          <VerticalTransectViewer
            grid={grid}
            activeTransect={activeTransect}
            onSelectTransect={setActiveTransect}
            colormap={colormap}
            onSelectCoordinate={setSelectedPoint}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureInspector />}

        {activeTab === 'benchmark' && (
          <EvaluationBenchmark
            onSelectFloat={(float) => {
              setSelectedFloat(float);
              setSelectedPoint(null);
            }}
          />
        )}

        {activeTab === 'pipeline' && <DataIngestionPipeline />}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-white py-4 px-4 lg:px-6 text-center text-xs text-black font-mono font-bold uppercase tracking-wider shadow-[0px_-2px_0px_#000000]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            NIO DeepOcean-Transformer • PyTorch CNN-Transformer (7 Channels &rarr; 15 Layers)
          </span>
          <span className="text-zinc-600">Spatial Domain: 5°N–30°N, 45°E–105°E • 0.25° Grid</span>
        </div>
      </footer>

      {/* Modals */}
      {(selectedPoint || selectedFloat) && (
        <VerticalProfileModal
          selectedPoint={selectedPoint}
          selectedFloat={selectedFloat}
          onClose={() => {
            setSelectedPoint(null);
            setSelectedFloat(null);
          }}
          onAskAIAboutPoint={handleAskAIAboutPoint}
        />
      )}

      {isCopilotOpen && (
        <OceanCopilotModal
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          activePreset={currentPreset}
          selectedPoint={selectedPoint}
        />
      )}

      {isExportOpen && (
        <NetCDFExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          activePreset={currentPreset}
          grid={grid}
        />
      )}
    </div>
  );
}

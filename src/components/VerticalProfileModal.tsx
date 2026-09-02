import React from 'react';
import {
  X,
  Thermometer,
  MapPin,
  Flame,
  Droplets,
  Layers,
  Sparkles,
  Download,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { OceanGridPoint, ArgoFloat, DEPTH_LEVELS } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface VerticalProfileModalProps {
  selectedPoint: OceanGridPoint | null;
  selectedFloat: ArgoFloat | null;
  onClose: () => void;
  onAskAIAboutPoint: (pt: OceanGridPoint) => void;
}

export const VerticalProfileModal: React.FC<VerticalProfileModalProps> = ({
  selectedPoint,
  selectedFloat,
  onClose,
  onAskAIAboutPoint,
}) => {
  if (!selectedPoint && !selectedFloat) return null;

  const lat = selectedFloat ? selectedFloat.lat : selectedPoint!.lat;
  const lon = selectedFloat ? selectedFloat.lon : selectedPoint!.lon;
  const basin =
    lon < 77 ? 'Arabian Sea' : lat < 8 ? 'Equatorial Indian Ocean' : 'Bay of Bengal';

  // Construct chart data across 15 depth levels
  const chartData = DEPTH_LEVELS.map((depth) => {
    let modelTemp = selectedPoint?.temperatures[depth] ?? 20;
    let glorysTemp = selectedPoint?.glorysTemperatures?.[depth] ?? modelTemp - 0.15;
    let argoObs: number | null = null;
    let salinity: number | null = null;

    if (selectedFloat) {
      const floatP = selectedFloat.profile.find((p) => p.depth === depth);
      if (floatP) {
        modelTemp = floatP.modelTemp;
        glorysTemp = floatP.glorysTemp;
        argoObs = floatP.obsTemp;
        salinity = floatP.salinity;
      }
    }

    return {
      depth: depth,
      invertedDepth: -depth,
      modelTemp,
      glorysTemp,
      argoObs,
      salinity,
    };
  });

  const tchp = selectedFloat ? selectedFloat.tchp : selectedPoint?.tchp ?? 0;
  const d20 = selectedPoint?.d20 ?? 110;
  const d26 = selectedPoint?.d26 ?? 45;
  const mld = selectedPoint?.mld ?? 30;
  const sst = selectedPoint?.sst ?? chartData[0]?.modelTemp ?? 29.5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border-[3px] border-black max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000000] overflow-hidden my-auto text-black">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-black flex items-start justify-between gap-3 bg-zinc-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black text-white border-2 border-black shadow-[2px_2px_0px_#FF3B30] flex items-center justify-center">
                <Thermometer className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 uppercase font-display">
                  Vertical Temperature Sounding Profile
                  {selectedFloat && (
                    <span className="text-xs px-2 py-0.5 bg-amber-400 text-black border border-black font-mono font-black">
                      Argo WMO {selectedFloat.wmo}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-700 font-mono font-bold uppercase">
                  <span className="flex items-center gap-1 text-black font-black">
                    <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
                    {lat.toFixed(2)}°N, {lon.toFixed(2)}°E
                  </span>
                  <span>•</span>
                  <span>{basin}</span>
                  {selectedFloat && (
                    <>
                      <span>•</span>
                      <span className="text-black font-black">{selectedFloat.platform}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedPoint && (
              <button
                onClick={() => onAskAIAboutPoint(selectedPoint)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3B30] text-white border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-black uppercase tracking-wider transition cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">AI Analysis</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 bg-white text-black border-2 border-black hover:bg-zinc-200 transition cursor-pointer shadow-[2px_2px_0px_#000000] active:shadow-none"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Key Oceanographic Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] text-zinc-600 block font-black uppercase font-mono tracking-wider">
                Surface Temperature
              </span>
              <span className="text-xl font-black text-black font-mono mt-1 block">
                {sst.toFixed(2)} °C
              </span>
              <span className="text-[10px] text-black font-bold uppercase font-mono">0m Sea Surface</span>
            </div>

            <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] text-zinc-600 block font-black uppercase font-mono tracking-wider">
                TCHP (Heat Potential)
              </span>
              <span
                className={`text-xl font-black font-mono mt-1 block ${
                  tchp > 80 ? 'text-[#FF3B30]' : 'text-black'
                }`}
              >
                {tchp.toFixed(1)} <span className="text-xs font-normal">kJ/cm²</span>
              </span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase font-mono">
                {tchp > 80 ? 'High Cyclone Fuel' : tchp > 50 ? 'Moderate Fuel' : 'Low Potential'}
              </span>
            </div>

            <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] text-zinc-600 block font-black uppercase font-mono tracking-wider">
                20°C Isotherm (D20)
              </span>
              <span className="text-xl font-black text-black font-mono mt-1 block">
                {d20.toFixed(0)} m
              </span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase font-mono">Main Thermocline</span>
            </div>

            <div className="bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_#000000]">
              <span className="text-[10px] text-zinc-600 block font-black uppercase font-mono tracking-wider">
                Mixed Layer (MLD)
              </span>
              <span className="text-xl font-black text-black font-mono mt-1 block">
                {mld.toFixed(0)} m
              </span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase font-mono">ΔT = 0.2°C Threshold</span>
            </div>
          </div>

          {/* Sounding Chart Plot (Depth vs Temp) */}
          <div className="bg-zinc-50 border-2 border-black p-4 shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center justify-between mb-3 text-xs border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black stroke-[2.5]" />
                <span className="font-black text-black uppercase tracking-wider font-mono">
                  Vertical Temperature Sounding (0m – 1000m)
                </span>
              </div>
              <span className="text-[11px] text-black font-mono font-bold uppercase bg-white px-2 py-0.5 border border-black">
                15 Discrete Model Output Layers
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#d4d4d8" />
                  <XAxis
                    type="number"
                    domain={[4, 32]}
                    tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                    unit="°C"
                  />
                  <YAxis
                    dataKey="invertedDepth"
                    type="number"
                    domain={[-1000, 0]}
                    tickFormatter={(val) => `${Math.abs(val)}m`}
                    tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '0px',
                      boxShadow: '4px 4px 0px #000000',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#000000',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'modelTemp') return [`${Number(value).toFixed(2)} °C`, 'DeepOcean-Transformer'];
                      if (name === 'glorysTemp') return [`${Number(value).toFixed(2)} °C`, 'GLORYS12V1 Reanalysis'];
                      if (name === 'argoObs') return [`${Number(value).toFixed(2)} °C`, 'In-Situ Argo CTD'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Depth: ${Math.abs(Number(label))} meters`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />

                  <ReferenceLine
                    x={26}
                    stroke="#FF3B30"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: '26°C Cyclone Thresh',
                      fill: '#FF3B30',
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />
                  <ReferenceLine
                    x={20}
                    stroke="#000000"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: '20°C Thermocline',
                      fill: '#000000',
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="modelTemp"
                    name="DeepOcean-Transformer"
                    stroke="#000000"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#000000', stroke: '#000000' }}
                  />

                  <Line
                    type="monotone"
                    dataKey="glorysTemp"
                    name="GLORYS12V1 (Target)"
                    stroke="#71717a"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3, fill: '#71717a' }}
                  />

                  {selectedFloat && (
                    <Line
                      type="monotone"
                      dataKey="argoObs"
                      name="Argo Float CTD (Obs)"
                      stroke="#FF3B30"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#FF3B30', stroke: '#000000' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 15 Depths Numerical Data Grid */}
          <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000000]">
            <h3 className="text-xs font-black text-black uppercase tracking-wider mb-2.5 font-mono">
              15 Vertical Layer Temperature Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b-2 border-black text-black font-black uppercase text-[11px]">
                    <th className="pb-1.5 px-2">Depth (m)</th>
                    <th className="pb-1.5 px-2 text-black">Transformer (°C)</th>
                    <th className="pb-1.5 px-2 text-zinc-600">GLORYS12V1 (°C)</th>
                    {selectedFloat && <th className="pb-1.5 px-2 text-[#FF3B30]">Argo CTD (°C)</th>}
                    <th className="pb-1.5 px-2 text-right">Error (ΔT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {chartData.map((row) => {
                    const diff = selectedFloat && row.argoObs
                      ? row.modelTemp - row.argoObs
                      : row.modelTemp - row.glorysTemp;
                    return (
                      <tr key={row.depth} className="hover:bg-zinc-100 font-medium">
                        <td className="py-1 px-2 font-black text-black">{row.depth}m</td>
                        <td className="py-1 px-2 text-black font-black">{row.modelTemp.toFixed(2)}</td>
                        <td className="py-1 px-2 text-zinc-700">{row.glorysTemp.toFixed(2)}</td>
                        {selectedFloat && (
                          <td className="py-1 px-2 text-[#FF3B30] font-black">
                            {row.argoObs !== null ? row.argoObs.toFixed(2) : '—'}
                          </td>
                        )}
                        <td
                          className={`py-1 px-2 text-right font-black ${
                            Math.abs(diff) < 0.25
                              ? 'text-black'
                              : Math.abs(diff) < 0.5
                              ? 'text-zinc-700'
                              : 'text-[#FF3B30]'
                          }`}
                        >
                          {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} °C
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

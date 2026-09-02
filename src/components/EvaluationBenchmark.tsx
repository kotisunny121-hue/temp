import React from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Activity,
  Award,
  Database,
  MapPin,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  getDepthEvaluationMetrics,
  getTrainingHistory,
  getSampleArgoFloats,
} from '../utils/oceanEngine';
import { ArgoFloat } from '../types';

interface EvaluationBenchmarkProps {
  onSelectFloat: (float: ArgoFloat) => void;
}

export const EvaluationBenchmark: React.FC<EvaluationBenchmarkProps> = ({
  onSelectFloat,
}) => {
  const depthMetrics = getDepthEvaluationMetrics();
  const lossHistory = getTrainingHistory();
  const argoFloats = getSampleArgoFloats();

  return (
    <div className="space-y-6">
      {/* Top Performance Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Mean Surface RMSE</span>
            <span className="p-1 bg-black text-white">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-black font-mono">0.18 °C</span>
            <span className="text-xs text-black font-bold uppercase font-mono">0–20m Depth</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-600 uppercase mt-1 font-bold">vs 0.62°C Statistical Climatology</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Thermocline RMSE</span>
            <span className="p-1 bg-black text-white">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-black font-mono">0.48 °C</span>
            <span className="text-xs text-black font-bold uppercase font-mono">50–200m Depth</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-600 uppercase mt-1 font-bold">Peak accuracy in D20 &amp; D26</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider">Mean Pearson Corr</span>
            <span className="p-1 bg-black text-white">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-black font-mono">0.968</span>
            <span className="text-xs text-black font-bold uppercase font-mono">All 15 Layers</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-600 uppercase mt-1 font-bold">Consistent spatial coherence</p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-black uppercase tracking-wider">TCHP Estimation Error</span>
            <span className="p-1 bg-[#FF3B30] text-white">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#FF3B30] font-mono">&plusmn; 4.2</span>
            <span className="text-xs text-black font-bold uppercase font-mono">kJ/cm²</span>
          </div>
          <p className="text-[11px] font-mono text-zinc-600 uppercase mt-1 font-bold">High fidelity for cyclone forecasting</p>
        </div>
      </div>

      {/* Depth-wise RMSE vs Climatology Benchmark Chart */}
      <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b-2 border-black">
          <div>
            <h3 className="text-sm font-black text-black flex items-center gap-2 uppercase font-display">
              <BarChart3 className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
              Vertical Depth-Wise RMSE Error (°C) Across All 15 Target Layers
            </h3>
            <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide">
              Comparing DeepOcean-Transformer vs Baseline Climatology against GLORYS12V1 Reanalysis
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={depthMetrics}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#d4d4d8" />
              <XAxis
                dataKey="depth"
                tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                tickFormatter={(d) => `${d}m`}
                label={{ value: 'DEPTH (M)', position: 'insideBottom', offset: -10, fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
              />
              <YAxis
                unit="°C"
                tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                domain={[0, 1.6]}
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
                formatter={(val: any, name: any) => [
                  `${Number(val).toFixed(2)} °C`,
                  name === 'rmse'
                    ? 'SatelliteTransformer RMSE'
                    : 'Climatology Baseline RMSE',
                ]}
                labelFormatter={(d) => `Target Depth: ${d} meters`}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar
                dataKey="rmse"
                name="DeepOcean-Transformer RMSE"
                fill="#000000"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="baselineRmse"
                name="Climatological Baseline RMSE"
                fill="#a1a1aa"
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 50-Epoch Training & Validation Loss History */}
      <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b-2 border-black">
          <div>
            <h3 className="text-sm font-black text-black flex items-center gap-2 uppercase font-display">
              <TrendingUp className="w-4 h-4 text-black stroke-[2.5]" />
              Training &amp; Validation MSE Loss Convergence (50 Epochs)
            </h3>
            <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide">
              Adam Optimizer with lr=1e-4 on PyTorch NIOFramework
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lossHistory}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#d4d4d8" />
              <XAxis
                dataKey="epoch"
                tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                label={{ value: 'EPOCH', position: 'insideBottom', offset: -10, fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
              />
              <YAxis
                tick={{ fill: '#000000', fontSize: 11, fontWeight: 'bold' }}
                domain={[0, 0.5]}
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
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Line
                type="monotone"
                dataKey="loss"
                name="Training Loss (MSE)"
                stroke="#000000"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="valLoss"
                name="Validation Loss (MSE)"
                stroke="#FF3B30"
                strokeWidth={2.5}
                strokeDasharray="4 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* In-Situ Argo Float Verification Table */}
      <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
        <h3 className="text-sm font-black text-black flex items-center gap-2 mb-1.5 uppercase font-display">
          <Database className="w-4 h-4 text-black stroke-[2.5]" />
          Indian Ocean Argo Float In-Situ Verification Match-ups
        </h3>
        <p className="text-xs font-mono font-bold text-zinc-600 uppercase mb-4 tracking-wide">
          Autonomous profiling floats deployed by INCOIS, CORIOLIS, and NOAA compared against reconstructed profiles.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black text-black font-black uppercase text-[11px]">
                <th className="pb-2 px-2">WMO ID</th>
                <th className="pb-2 px-2">Platform</th>
                <th className="pb-2 px-2">Location</th>
                <th className="pb-2 px-2">Basin</th>
                <th className="pb-2 px-2">Date</th>
                <th className="pb-2 px-2 text-black">Profile RMSE</th>
                <th className="pb-2 px-2 text-[#FF3B30]">TCHP (kJ/cm²)</th>
                <th className="pb-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {argoFloats.map((float) => (
                <tr key={float.id} className="hover:bg-zinc-100 transition font-medium">
                  <td className="py-2.5 px-2 font-black text-black">{float.wmo}</td>
                  <td className="py-2.5 px-2 text-zinc-800">{float.platform}</td>
                  <td className="py-2.5 px-2 text-zinc-700">
                    {float.lat}°N, {float.lon}°E
                  </td>
                  <td className="py-2.5 px-2 text-black font-bold">{float.basin}</td>
                  <td className="py-2.5 px-2 text-zinc-600">{float.date}</td>
                  <td className="py-2.5 px-2 font-black text-black">
                    {float.rmse.toFixed(2)} °C
                  </td>
                  <td className="py-2.5 px-2 font-black text-[#FF3B30]">
                    {float.tchp.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      onClick={() => onSelectFloat(float)}
                      className="px-3 py-1 bg-black text-white hover:bg-zinc-800 border-2 border-black text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-[2px_2px_0px_#FF3B30] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      Inspect Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

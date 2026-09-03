import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Layers,
  Cpu,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Search,
  HardDrive,
  GitBranch,
  Activity,
  AlertCircle,
  BarChart,
  Calendar,
  MapPin,
  Flame,
} from 'lucide-react';

interface DbOverview {
  datasets: number;
  gridPoints: number;
  samples: number;
  models: number;
  experiments: number;
  predictions: number;
  validationResults: number;
}

export const DatabaseExplorer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'datasets' | 'grid_points' | 'samples' | 'depth_levels' | 'models' | 'experiments' | 'predictions' | 'validation_results'
  >('overview');

  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [newSampleSuccess, setNewSampleSuccess] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/db/overview');
      const data = await res.json();
      if (data.success) {
        setOverview({
          datasets: data.datasets,
          gridPoints: data.gridPoints,
          samples: data.samples,
          models: data.models,
          experiments: data.experiments,
          predictions: data.predictions,
          validationResults: data.validationResults,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch DB overview:', err);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = `/api/db/${tableName.replace('_', '-')}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        const key = Object.keys(data).find((k) => Array.isArray(data[k]));
        setDataList(key ? data[key] : []);
      } else {
        setError(data.error || 'Failed to query table data.');
      }
    } catch (err: any) {
      setError(err.message || 'Database connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeSubTab !== 'overview') {
      fetchTableData(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/db/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchOverview();
        if (activeSubTab !== 'overview') {
          await fetchTableData(activeSubTab);
        }
      }
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtered rows for current active table
  const filteredData = dataList.filter((row) => {
    if (!searchFilter) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(searchFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Control Layer Card */}
      <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#FF3B30] shrink-0">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black uppercase tracking-tight font-display">
                  PostgreSQL Control &amp; Metadata Architecture
                </h2>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-[#FF3B30] text-white border border-black">
                  Cloud SQL • asia-southeast1
                </span>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 bg-zinc-100 text-black border border-black">
                  Drizzle ORM
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide mt-1">
                PostgreSQL coordinates 8 relational tables (metadata/models/experiments) while large scientific tensors reside in Zarr/NetCDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchOverview();
                if (activeSubTab !== 'overview') fetchTableData(activeSubTab);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-black border-2 border-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh DB</span>
            </button>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-[#FF3B30] text-white border-2 border-black text-xs font-mono font-black uppercase shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
            >
              {isSeeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>Verify / Seed Synthetic Data</span>
            </button>
          </div>
        </div>

        {/* Live Relational Metrics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">1. Datasets</div>
            <div className="text-xl font-black text-black font-display">{overview?.datasets ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">GLORYS, OSTIA, SMAP</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">2. Grid Points</div>
            <div className="text-xl font-black text-black font-display">{overview?.gridPoints ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">0.25° NIO Domain</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">3. Depth Layers</div>
            <div className="text-xl font-black text-[#FF3B30] font-display">15</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">0m to 1000m</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">4. Samples</div>
            <div className="text-xl font-black text-black font-display">{overview?.samples ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Surface Observations</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">5. AI Models</div>
            <div className="text-xl font-black text-black font-display">{overview?.models ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Transformer, CNN, ViT</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">6. Experiments</div>
            <div className="text-xl font-black text-black font-display">{overview?.experiments ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Training Runs</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">7. Predictions</div>
            <div className="text-xl font-black text-[#FF3B30] font-display">{overview?.predictions ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">3D Subsurface Outputs</div>
          </div>

          <div className="p-2.5 bg-zinc-50 border-2 border-black">
            <div className="text-[10px] font-mono font-black uppercase text-zinc-600">8. Argo Validations</div>
            <div className="text-xl font-black text-black font-display">{overview?.validationResults ?? '...'}</div>
            <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase">In-Situ Depth Matchups</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'overview', label: 'Architecture & Storage Guide' },
          { id: 'datasets', label: '1. datasets' },
          { id: 'grid_points', label: '2. grid_points' },
          { id: 'samples', label: '3. samples' },
          { id: 'depth_levels', label: '4. depth_levels' },
          { id: 'models', label: '5. models' },
          { id: 'experiments', label: '6. experiments' },
          { id: 'predictions', label: '7. predictions' },
          { id: 'validation_results', label: '8. validation_results' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              setSearchFilter('');
            }}
            className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Viewport */}
      {activeSubTab === 'overview' ? (
        <div className="space-y-6">
          {/* Dual-Tier Architecture Explainer Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-[#FF3B30] border border-black"></span>
                <h3 className="font-black text-base uppercase font-display">
                  PostgreSQL Metadata &amp; Control Layer
                </h3>
              </div>
              <p className="text-xs font-mono text-zinc-700 leading-relaxed">
                Stores relational indexes, observation timestamps, model hyperparameters, evaluation metrics, and pointers to tensor payloads.
              </p>
              <div className="mt-4 space-y-2 font-mono text-xs">
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">Database Engine:</span>
                  <span className="font-black text-[#FF3B30]">PostgreSQL (Cloud SQL)</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">ORM &amp; Migrations:</span>
                  <span className="font-black">Drizzle ORM &amp; Drizzle Kit</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">Connection Strategy:</span>
                  <span className="font-black">Lazy pg.Pool Connection Pool</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">Active Instance:</span>
                  <span className="font-black">ai-studio-c57c89a2 (asia-southeast1)</span>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 bg-black border border-black"></span>
                <h3 className="font-black text-base uppercase font-display">
                  Object Storage &amp; Scientific Tensors (Zarr / NetCDF)
                </h3>
              </div>
              <p className="text-xs font-mono text-zinc-700 leading-relaxed">
                Prevents database bloat from millions of raw grid cells. High-dimensional multidimensional arrays are chunked and stored as Zarr/NetCDF files.
              </p>
              <div className="mt-4 space-y-2 font-mono text-xs">
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">Satellite Payloads:</span>
                  <span className="font-black">/data/satellite/zarr/*.zarr</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">GLORYS Ground Truth:</span>
                  <span className="font-black">/data/glorys/zarr/*.zarr</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">3D Predictions:</span>
                  <span className="font-black">/data/predictions/*.zarr</span>
                </div>
                <div className="p-2 bg-zinc-50 border border-black flex justify-between">
                  <span className="font-bold">Array Framework:</span>
                  <span className="font-black text-[#FF3B30]">xarray + Dask + PyTorch</span>
                </div>
              </div>
            </div>
          </div>

          {/* Relational Schema Diagram */}
          <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
            <h3 className="font-black text-base uppercase font-display mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 stroke-[2.5]" />
              Relational Schema Mapping (8 Core Tables)
            </h3>
            <div className="bg-zinc-950 text-zinc-200 p-4 border-2 border-black font-mono text-xs overflow-x-auto">
              <pre className="leading-relaxed">
{`                    POSTGRESQL (Metadata Layer)
                               │
       ┌───────────────────────┼──────────────────────┐
       │                       │                      │
   datasets (7)           samples (8)           predictions (8)
  (GLORYS, OSTIA, SMAP)        │                      │
       │                       ├────── grid_points    │
       ▼                       │                      ▼
  experiments (3)              ▼                depth_levels (15)
  (EXP001, EXP002)     input/target paths             │
       │               (/data/*.zarr)                 ▼
       └────────────── validation_results (15) ◄──────┘
                       (Argo float WMO match-ups)`}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Data Table View */
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000000] overflow-hidden">
          {/* Table Header & Search */}
          <div className="p-4 border-b-2 border-black bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 stroke-[2.5]" />
              <span className="font-black text-sm font-mono uppercase">
                Table: <span className="text-[#FF3B30]">{activeSubTab}</span> ({filteredData.length} records)
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-black text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className="p-12 text-center font-mono text-xs font-bold text-zinc-600">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#FF3B30] mb-2" />
              <span>Querying PostgreSQL database...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center font-mono text-xs text-red-600">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <span>{error}</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center font-mono text-xs font-bold text-zinc-500">
              <span>No records found in table "{activeSubTab}".</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white border-b-2 border-black">
                    {Object.keys(filteredData[0] || {}).map((col) => (
                      <th key={col} className="p-3 font-black uppercase text-[11px] whitespace-nowrap border-r border-zinc-800 last:border-none">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-zinc-200 hover:bg-zinc-100/80 transition-colors"
                    >
                      {Object.entries(row).map(([key, val], cellIdx) => (
                        <td
                          key={cellIdx}
                          className="p-3 whitespace-nowrap text-zinc-900 border-r border-zinc-200 last:border-none font-medium text-xs max-w-xs truncate"
                          title={String(val)}
                        >
                          {key === 'inputDataPath' || key === 'targetDataPath' || key === 'predictionPath' || key === 'modelPath' ? (
                            <span className="bg-zinc-100 text-black px-1.5 py-0.5 border border-black font-bold text-[10px]">
                              {String(val)}
                            </span>
                          ) : key === 'predictedProfile' ? (
                            <span className="text-[#FF3B30] font-bold text-[10px]">
                              {String(val).slice(0, 32)}...
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="font-bold">{val}</span>
                          ) : (
                            String(val ?? 'NULL')
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

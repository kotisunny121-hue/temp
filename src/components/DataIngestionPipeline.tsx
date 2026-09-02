import React, { useState } from 'react';
import {
  FileCode2,
  Database,
  ArrowRight,
  Filter,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

export const DataIngestionPipeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      id: 0,
      title: '1. Multi-Source NetCDF Ingestion',
      subtitle: '5 Satellite + Reanalysis Feeds',
      description:
        'Ingests daily NetCDF files from Copernicus Marine Service (CMEMS) and ECMWF ERA5, reading SST, SSS, SSH, Geostrophic Currents (U, V), and 10m Winds (U, V).',
      code: `file_map = {
    'sst': 'sst_glo_nrt.nc',       # CMEMS OSTIA SST
    'sss': 'sss_glo_nrt.nc',       # SMOS/SMAP Salinity
    'ssh': 'ssh_glo_climate.nc',   # DUACS Altimetry
    'currents': 'currents_multiobs.nc', # GlobCurrent U/V
    'winds': 'winds_era5.nc'       # ERA5 10m Winds
}`,
      stats: [
        { label: 'Spatial Bounding', value: '5°N–30°N, 45°E–105°E' },
        { label: 'Temporal Resolution', value: 'Daily Resampled (1D.mean())' },
      ],
    },
    {
      id: 1,
      title: '2. Coordinate Standardization & Cropping',
      subtitle: 'Latitude / Longitude Harmonization',
      description:
        'Standardizes heterogeneous coordinate naming conventions (e.g., latitude -> lat, longitude -> lon) and crops bounding domain to the Northern Indian Ocean basin.',
      code: `# Standardize coord names
if 'latitude' in ds.coords:
    ds = ds.rename({'latitude': 'lat', 'longitude': 'lon'})

# Spatial crop & Temporal Daily Resample
ds = ds.sel(lat=slice(5, 30), lon=slice(45, 105)).resample(time='1D').mean()`,
      stats: [
        { label: 'Cropped Extent', value: '25° Lat × 60° Lon' },
        { label: 'Time Dim', value: 'Standardized ISO-8601 UTC' },
      ],
    },
    {
      id: 2,
      title: '3. Bilinear Regridding via xESMF',
      subtitle: '0.25° Target NIO Grid (101 × 241)',
      description:
        'Translates disparate sensor grids (0.05° OSTIA, 0.125° Altimetry, 0.25° ERA5) onto a unified 0.25° target grid with reuse_weights=True for optimal GPU/CPU throughput.',
      code: `target_grid = xr.Dataset({
    'lat': (['lat'], np.arange(5, 30.25, 0.25)), # 101 points
    'lon': (['lon'], np.arange(45, 105.25, 0.25)) # 241 points
})

regridder = xe.Regridder(ds, target_grid, 'bilinear', reuse_weights=True)
ds_regridded = regridder(ds)`,
      stats: [
        { label: 'Target Lat Points', value: '101 steps (5.00 to 30.00)' },
        { label: 'Target Lon Points', value: '241 steps (45.00 to 105.00)' },
      ],
    },
    {
      id: 3,
      title: '4. Coastal NaN Interpolation & Normalization',
      subtitle: 'Land-mask Boundary Handling',
      description:
        'Interpolates coastal missing values using 1D longitudinal linear interpolation followed by latitudinal forward/backward fill. Applies global Z-score standardization.',
      code: `# Fill NaNs using spatial interpolation
ds_filled = ds_regridded.interpolate_na(
    dim='lon', method='linear'
).ffill('lat').bfill('lat')

# Standard Z-Score Normalization
ds_norm = (ds_filled - ds_filled.mean()) / (ds_filled.std() + 1e-6)`,
      stats: [
        { label: 'Mean Value (μ)', value: '0.000 ± 1e-4' },
        { label: 'Variance (σ²)', value: '1.000 ± 1e-4' },
      ],
    },
    {
      id: 4,
      title: '5. PyTorch Dataset & Dataloader Tensor Batching',
      subtitle: '7 Channels -> 15 Target Depths',
      description:
        'Converts merged xarray Dataset into a 4D float32 PyTorch tensor [Batch, 7, 101, 241] paired with 15 depth target layers from GLORYS12V1 thetao.',
      code: `class OceanDataset(Dataset):
    def __init__(self, input_ds: xr.Dataset, target_ds: xr.Dataset):
        # Input features: [SST, SSS, SSH, U_curr, V_curr, U_wind, V_wind]
        self.inputs = input_ds.to_array().transpose(
            'time', 'variable', 'lat', 'lon'
        ).values.astype(np.float32)
        # Target: 3D Temperature [Time, Depth, Lat, Lon]
        self.targets = target_ds['thetao'].sel(
            depth=[0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
            method='nearest'
        ).values.astype(np.float32)`,
      stats: [
        { label: 'Input Batch Tensor', value: '[Batch, 7, 101, 241]' },
        { label: 'Target Batch Tensor', value: '[Batch, 15, 101, 241]' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline Header */}
      <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-black text-white border-2 border-black shadow-[2px_2px_0px_#FF3B30] flex items-center justify-center">
            <FileCode2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 uppercase font-display">
              NIOProcessor Data Ingestion &amp; Preprocessing Engine
              <span className="text-xs font-mono px-2 py-0.5 bg-black text-white border border-black font-black uppercase">
                xarray • xESMF • NetCDF4
              </span>
            </h2>
            <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide mt-1">
              Automated ingestion pipeline transforming raw satellite swath data into analysis-ready PyTorch tensors
            </p>
          </div>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(idx)}
            className={`text-left p-3.5 border-2 border-black transition cursor-pointer flex flex-col justify-between shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              activeStep === idx
                ? 'bg-black text-white ring-2 ring-black'
                : 'bg-white text-black hover:bg-zinc-100'
            }`}
          >
            <div>
              <span
                className={`text-[11px] font-mono font-black uppercase block ${
                  activeStep === idx ? 'text-[#FF3B30]' : 'text-zinc-600'
                }`}
              >
                Step 0{idx + 1}
              </span>
              <span className="text-xs font-black uppercase font-display block mt-1">
                {step.title.split('. ')[1]}
              </span>
            </div>
            <span className={`text-[10px] font-mono uppercase font-bold mt-3 block ${
              activeStep === idx ? 'text-zinc-300' : 'text-zinc-600'
            }`}>
              {step.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Active Step Detailed Inspector */}
      <div className="bg-white border-2 border-black p-5 space-y-4 shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-sm font-black text-black flex items-center gap-2 uppercase font-display">
              <Zap className="w-4 h-4 text-black stroke-[2.5]" />
              {steps[activeStep].title}
            </h3>
            <p className="text-xs font-mono font-bold text-zinc-600 uppercase mt-1 tracking-wide">{steps[activeStep].description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {steps[activeStep].stats.map((stat, i) => (
              <div
                key={i}
                className="bg-zinc-100 px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-mono"
              >
                <span className="text-[10px] font-black uppercase text-zinc-600 block">{stat.label}:</span>
                <span className="text-black font-black">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="bg-zinc-950 border-2 border-black overflow-hidden shadow-[2px_2px_0px_#000000]">
          <div className="bg-black px-4 py-2 border-b-2 border-zinc-800 flex items-center justify-between text-xs font-mono font-black uppercase text-white">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] inline-block" />
              Python Pipeline Execution
            </span>
            <span className="text-zinc-400">NIOProcessor.py</span>
          </div>
          <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-200">
            <pre>
              <code>{steps[activeStep].code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

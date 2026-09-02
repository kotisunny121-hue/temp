import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';
import { OceanGridPoint, SynopticEventPreset, DEPTH_LEVELS } from '../types';

interface NetCDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePreset: SynopticEventPreset;
  grid: OceanGridPoint[];
}

export const NetCDFExportModal: React.FC<NetCDFExportModalProps> = ({
  isOpen,
  onClose,
  activePreset,
  grid,
}) => {
  const [activeTab, setActiveTab] = useState<'netcdf' | 'csv' | 'python'>('netcdf');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const netcdfHeader = `netcdf nio_deepocean_transformer_${activePreset.id} {
dimensions:
    time = UNLIMITED ; // (1 currently)
    depth = 15 ;
    lat = 101 ;
    lon = 241 ;
variables:
    double time(time) ;
        time:units = "days since 2023-01-01 00:00:00" ;
        time:calendar = "proleptic_gregorian" ;
    float depth(depth) ;
        depth:units = "m" ;
        depth:positive = "down" ;
        depth:long_name = "Ocean Depth" ;
    float lat(lat) ;
        lat:units = "degrees_north" ;
        lat:long_name = "Latitude" ;
    float lon(lon) ;
        lon:units = "degrees_east" ;
        lon:long_name = "Longitude" ;
    float thetao(time, depth, lat, lon) ;
        thetao:units = "degC" ;
        thetao:long_name = "Sea Water Potential Temperature (CNN-Transformer Reconstructed)" ;
        thetao:_FillValue = 1.e+20f ;
    float tchp(time, lat, lon) ;
        tchp:units = "kJ cm-2" ;
        tchp:long_name = "Tropical Cyclone Heat Potential relative to 26C Isotherm" ;
    float d20(time, lat, lon) ;
        d20:units = "m" ;
        d20:long_name = "Depth of 20C Isotherm (Main Thermocline)" ;

// global attributes:
    :title = "Northern Indian Ocean 3D Temperature Reconstruction" ;
    :institution = "DeepOcean-Transformer AI Lab / INCOIS / CMEMS" ;
    :source = "SatelliteTransformer (CNN-Transformer Architecture, 7->15 channels)" ;
    :Conventions = "CF-1.8" ;
    :date_created = "${new Date().toISOString()}" ;
}`;

  const pythonInferenceScript = `# Python Standalone Inference with SatelliteTransformer
import torch
import xarray as xr
import numpy as np

# 1. Load Pretrained Weights
from model import SatelliteTransformer
model = SatelliteTransformer(in_channels=7, out_depths=15)
checkpoint = torch.load('model_checkpoint.pth', map_location='cpu')
model.load_state_dict(checkpoint)
model.eval()

# 2. Ingest 7 Surface Channels [SST, SSS, SSH, U_curr, V_curr, U_wind, V_wind]
# Input shape: [1, 7, 101, 241]
sample_input = torch.randn(1, 7, 101, 241)

with torch.no_grad():
    # 3. Predict 3D Temperature Field [1, 15, 101, 241]
    pred_3d_temp = model(sample_input).numpy()

print(f"Predicted Ocean Volume: {pred_3d_temp.shape}")
print(f"Surface (0m) Mean Temp: {pred_3d_temp[0, 0].mean():.2f} °C")
print(f"Deep (1000m) Mean Temp: {pred_3d_temp[0, 14].mean():.2f} °C")`;

  const csvPreview = `lat,lon,depth_0m,depth_50m,depth_100m,depth_200m,depth_500m,depth_1000m,tchp,d20,d26
15.00,65.00,28.85,27.90,24.12,18.50,9.20,5.40,64.2,115.0,42.0
15.00,88.00,30.40,29.80,26.50,19.80,9.10,5.40,112.5,135.0,78.0
10.00,51.50,23.50,21.20,18.40,14.80,8.90,5.40,0.0,38.0,0.0
8.50,83.50,27.80,26.10,21.50,16.20,9.00,5.40,42.8,75.0,28.0`;

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'netcdf'
        ? netcdfHeader
        : activeTab === 'csv'
        ? csvPreview
        : pythonInferenceScript;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content =
      activeTab === 'netcdf'
        ? netcdfHeader
        : activeTab === 'csv'
        ? csvPreview
        : pythonInferenceScript;

    const extension = activeTab === 'netcdf' ? 'cdl' : activeTab === 'csv' ? 'csv' : 'py';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nio_subsurface_${activePreset.id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-fade-in overflow-y-auto">
      <div className="bg-white border-2 border-black max-w-3xl w-full max-h-[85vh] flex flex-col shadow-[8px_8px_0px_#000000] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF3B30] text-white border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 uppercase font-display">
                Export Ocean Reconstruction Dataset
              </h2>
              <p className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">
                CF-1.8 NetCDF4 conventions, CSV profile tables, and PyTorch model script
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white hover:bg-[#FF3B30] border-2 border-transparent hover:border-black transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-3 bg-zinc-100 border-b-2 border-black flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('netcdf')}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                activeTab === 'netcdf'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              NetCDF4 (CDL Header)
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                activeTab === 'csv'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              CSV Profile Table
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase transition cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                activeTab === 'python'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              PyTorch Inference Script
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-black border-2 border-black text-xs font-mono font-black uppercase transition cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#FF3B30] stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF3B30] hover:bg-black text-white border-2 border-black text-xs font-mono font-black uppercase transition cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-zinc-950 overflow-y-auto flex-1 font-mono text-xs text-zinc-200 leading-relaxed">
          <pre>
            <code>
              {activeTab === 'netcdf'
                ? netcdfHeader
                : activeTab === 'csv'
                ? csvPreview
                : pythonInferenceScript}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

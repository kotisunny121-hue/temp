import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Layers,
  Thermometer,
  Eye,
  Sliders,
  Compass,
  Zap,
  Navigation2,
  Wind,
  Droplets,
  Gauge,
  Maximize2,
  Info,
  MapPin,
  Flame,
  ArrowUpRight,
  TrendingDown,
  RotateCw,
} from 'lucide-react';
import {
  OceanGridPoint,
  DisplayMetric,
  DepthLevel,
  DEPTH_LEVELS,
  ColormapTheme,
  ArgoFloat,
  TransectPath,
  SynopticEventPreset,
} from '../types';
import {
  LAT_MIN,
  LAT_MAX,
  LON_MIN,
  LON_MAX,
  getColormapColor,
  STANDARD_TRANSECTS,
  findNearestGridPoint,
} from '../utils/oceanEngine';

interface OceanMapViewerProps {
  grid: OceanGridPoint[];
  lats: number[];
  lons: number[];
  argoFloats: ArgoFloat[];
  selectedPreset: SynopticEventPreset;
  onSelectPoint: (point: OceanGridPoint) => void;
  onSelectFloat: (float: ArgoFloat) => void;
  onSelectTransect: (transect: TransectPath) => void;
  activeTransect: TransectPath | null;
  onCustomTransectDrawn: (start: { lat: number; lon: number }, end: { lat: number; lon: number }) => void;
}

export const OceanMapViewer: React.FC<OceanMapViewerProps> = ({
  grid,
  lats,
  lons,
  argoFloats,
  selectedPreset,
  onSelectPoint,
  onSelectFloat,
  onSelectTransect,
  activeTransect,
  onCustomTransectDrawn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Display configuration states
  const [selectedMetric, setSelectedMetric] = useState<DisplayMetric>('temp_layer');
  const [selectedDepth, setSelectedDepth] = useState<DepthLevel>(0);
  const [colormap, setColormap] = useState<ColormapTheme>('turbo');
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showArgoFloats, setShowArgoFloats] = useState<boolean>(true);
  const [showTransects, setShowTransects] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [isDrawingTransect, setIsDrawingTransect] = useState<boolean>(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [dragCurrentPoint, setDragCurrentPoint] = useState<{ lat: number; lon: number } | null>(null);

  // Interactive Hover Probe
  const [hoveredPoint, setHoveredPoint] = useState<OceanGridPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Dynamic Min / Max calculation for the active metric
  const { minVal, maxVal, unitLabel, metricTitle } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let unit = '°C';
    let title = 'Temperature';

    grid.forEach((pt) => {
      if (pt.isLand) return;
      let val = 0;
      if (selectedMetric === 'temp_layer') {
        val = pt.temperatures[selectedDepth] ?? 20;
        title = `Temperature @ ${selectedDepth}m Depth`;
        unit = '°C';
      } else if (selectedMetric === 'sst') {
        val = pt.sst;
        title = 'Sea Surface Temperature (SST)';
        unit = '°C';
      } else if (selectedMetric === 'sss') {
        val = pt.sss;
        title = 'Sea Surface Salinity (SSS)';
        unit = 'PSU';
      } else if (selectedMetric === 'ssh') {
        val = pt.ssh;
        title = 'Sea Surface Height Anomaly (SSH / SLA)';
        unit = 'm';
      } else if (selectedMetric === 'u_curr' || selectedMetric === 'v_curr') {
        val = Math.hypot(pt.u_curr, pt.v_curr);
        title = 'Surface Geostrophic Velocity Magnitude';
        unit = 'm/s';
      } else if (selectedMetric === 'u_wind' || selectedMetric === 'v_wind') {
        val = Math.hypot(pt.u_wind, pt.v_wind);
        title = '10m Surface Wind Speed';
        unit = 'm/s';
      } else if (selectedMetric === 'tchp') {
        val = pt.tchp;
        title = 'Tropical Cyclone Heat Potential (TCHP)';
        unit = 'kJ/cm²';
      } else if (selectedMetric === 'd20') {
        val = pt.d20;
        title = '20°C Isotherm Depth (D20)';
        unit = 'm';
      } else if (selectedMetric === 'd26') {
        val = pt.d26;
        title = '26°C Isotherm Depth (D26)';
        unit = 'm';
      } else if (selectedMetric === 'mld') {
        val = pt.mld;
        title = 'Mixed Layer Depth (MLD, ΔT=0.2°C)';
        unit = 'm';
      }

      if (val < min) min = val;
      if (val > max) max = val;
    });

    if (min === Infinity) {
      min = 0;
      max = 30;
    }

    // Fixed physical scale clamps for standard oceanographic layers
    if (selectedMetric === 'temp_layer') {
      if (selectedDepth === 0) {
        min = 22.0;
        max = 32.0;
      } else if (selectedDepth <= 50) {
        min = 20.0;
        max = 31.0;
      } else if (selectedDepth <= 150) {
        min = 14.0;
        max = 28.0;
      } else if (selectedDepth <= 300) {
        min = 11.0;
        max = 22.0;
      } else {
        min = 4.5;
        max = 14.0;
      }
    } else if (selectedMetric === 'sst') {
      min = 22.0;
      max = 32.0;
    } else if (selectedMetric === 'sss') {
      min = 28.5;
      max = 37.0;
    } else if (selectedMetric === 'ssh') {
      min = -0.3;
      max = 0.45;
    } else if (selectedMetric === 'tchp') {
      min = 0;
      max = 135;
    } else if (selectedMetric === 'd20') {
      min = 20;
      max = 175;
    } else if (selectedMetric === 'd26') {
      min = 0;
      max = 130;
    } else if (selectedMetric === 'mld') {
      min = 10;
      max = 95;
    }

    return { minVal: min, maxVal: max, unitLabel: unit, metricTitle: title };
  }, [grid, selectedMetric, selectedDepth]);

  // Coordinate projection conversions
  const projectLonToX = useCallback((lon: number, width: number) => {
    return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * width;
  }, []);

  const projectLatToY = useCallback((lat: number, height: number) => {
    // Invert Y so North is at the top
    return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height;
  }, []);

  const inverseXToLon = useCallback((x: number, width: number) => {
    return LON_MIN + (x / width) * (LON_MAX - LON_MIN);
  }, []);

  const inverseYToLat = useCallback((y: number, height: number) => {
    return LAT_MAX - (y / height) * (LAT_MAX - LAT_MIN);
  }, []);

  // Main Canvas Rendering Engine
  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Dark Abyssal Background
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, width, height);

    // 2. Render 2D Ocean Grid Heatmap cells
    const cellW = (width / (LON_MAX - LON_MIN)) * 0.5 + 0.6;
    const cellH = (height / (LAT_MAX - LAT_MIN)) * 0.5 + 0.6;

    grid.forEach((pt) => {
      const x = projectLonToX(pt.lon - 0.25, width);
      const y = projectLatToY(pt.lat + 0.25, height);

      if (pt.isLand) {
        // Render stylized topographic landmass
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, cellW, cellH);
        return;
      }

      let val = 0;
      if (selectedMetric === 'temp_layer') {
        val = pt.temperatures[selectedDepth] ?? 20;
      } else if (selectedMetric === 'sst') {
        val = pt.sst;
      } else if (selectedMetric === 'sss') {
        val = pt.sss;
      } else if (selectedMetric === 'ssh') {
        val = pt.ssh;
      } else if (selectedMetric === 'u_curr' || selectedMetric === 'v_curr') {
        val = Math.hypot(pt.u_curr, pt.v_curr);
      } else if (selectedMetric === 'u_wind' || selectedMetric === 'v_wind') {
        val = Math.hypot(pt.u_wind, pt.v_wind);
      } else if (selectedMetric === 'tchp') {
        val = pt.tchp;
      } else if (selectedMetric === 'd20') {
        val = pt.d20;
      } else if (selectedMetric === 'd26') {
        val = pt.d26;
      } else if (selectedMetric === 'mld') {
        val = pt.mld;
      }

      ctx.fillStyle = getColormapColor(val, minVal, maxVal, colormap);
      ctx.fillRect(x, y, cellW, cellH);
    });

    // 3. Grid Lines & Geographic Lat/Lon Labels
    if (showGridLines) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);

      // Parallels (Latitudes: 5°N, 10°N, 15°N, 20°N, 25°N, 30°N)
      for (let lat = 5; lat <= 30; lat += 5) {
        const y = projectLatToY(lat, height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${lat}°N`, 6, y - 4);
      }

      // Meridians (Longitudes: 50°E, 60°E, 70°E, 80°E, 90°E, 100°E)
      for (let lon = 50; lon <= 100; lon += 10) {
        const x = projectLonToX(lon, width);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${lon}°E`, x + 4, height - 6);
      }
      ctx.setLineDash([]);
    }

    // 4. Vector Field Arrows Overlay (Currents or Winds)
    if (showVectors) {
      const isWind = selectedMetric === 'u_wind' || selectedMetric === 'v_wind';
      ctx.strokeStyle = isWind ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.55)';
      ctx.fillStyle = isWind ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.75)';

      // Subsample vector arrows every 3 degrees for clean visibility
      for (let lat = 6; lat <= 28; lat += 2.5) {
        for (let lon = 48; lon <= 102; lon += 3.5) {
          const pt = findNearestGridPoint(grid, lat, lon);
          if (!pt || pt.isLand) continue;

          const cx = projectLonToX(pt.lon, width);
          const cy = projectLatToY(pt.lat, height);

          const u = isWind ? pt.u_wind : pt.u_curr;
          const v = isWind ? pt.v_wind : pt.v_curr;
          const speed = Math.hypot(u, v);
          if (speed < 0.05) continue;

          // Scale vector length
          const scale = isWind ? 1.2 : 14.0;
          const endX = cx + u * scale;
          const endY = cy - v * scale; // Inverted Y for North

          ctx.lineWidth = isWind ? 1.2 : 1.0;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(-v, u);
          const arrowLen = isWind ? 4.5 : 3.5;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLen * Math.cos(angle - Math.PI / 6),
            endY - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - arrowLen * Math.cos(angle + Math.PI / 6),
            endY - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.fill();
        }
      }
    }

    // 5. Standard Transect Lines
    if (showTransects) {
      STANDARD_TRANSECTS.forEach((transect) => {
        const isActive = activeTransect?.id === transect.id;
        const x1 = projectLonToX(transect.start.lon, width);
        const y1 = projectLatToY(transect.start.lat, height);
        const x2 = projectLonToX(transect.end.lon, width);
        const y2 = projectLatToY(transect.end.lat, height);

        ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = isActive ? 3.0 : 1.8;
        ctx.setLineDash(isActive ? [] : [4, 4]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint markers
        ctx.fillStyle = isActive ? '#0284c7' : '#0369a1';
        ctx.beginPath();
        ctx.arc(x1, y1, isActive ? 5 : 3.5, 0, 2 * Math.PI);
        ctx.arc(x2, y2, isActive ? 5 : 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label on midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        ctx.fillStyle = isActive ? '#f0f9ff' : 'rgba(224, 242, 254, 0.8)';
        ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
        ctx.fillText(transect.name.split(' ')[0], midX + 6, midY - 4);
      });
    }

    // 6. User Custom Transect In-Progress Drag Line
    if (dragStartPoint && dragCurrentPoint) {
      const x1 = projectLonToX(dragStartPoint.lon, width);
      const y1 = projectLatToY(dragStartPoint.lat, height);
      const x2 = projectLonToX(dragCurrentPoint.lon, width);
      const y2 = projectLatToY(dragCurrentPoint.lat, height);

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(x1, y1, 6, 0, 2 * Math.PI);
      ctx.arc(x2, y2, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 7. Argo Floats In-Situ Pins
    if (showArgoFloats) {
      argoFloats.forEach((float) => {
        const x = projectLonToX(float.lon, width);
        const y = projectLatToY(float.lat, height);

        // Halo
        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, 2 * Math.PI);
        ctx.fill();

        // Core Pin
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`Argo ${float.wmo}`, x + 7, y - 6);
      });
    }

    // 8. Basin Annotations (Arabian Sea, Bay of Bengal, Somali Coast, Sri Lanka)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '600 13px Plus Jakarta Sans, sans-serif';
    ctx.fillText('ARABIAN SEA', projectLonToX(63, width), projectLatToY(16, height));
    ctx.fillText('BAY OF BENGAL', projectLonToX(87, width), projectLatToY(15, height));
    ctx.fillText('EQUATORIAL INDIAN OCEAN', projectLonToX(68, width), projectLatToY(6.5, height));

    ctx.font = '500 10px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Somali Upwelling', projectLonToX(50.5, width), projectLatToY(9.5, height));
    ctx.fillText('Ganga Plume', projectLonToX(87.5, width), projectLatToY(21.2, height));
    ctx.fillText('Sri Lanka Dome', projectLonToX(82.5, width), projectLatToY(9.0, height));
  }, [
    grid,
    minVal,
    maxVal,
    colormap,
    selectedMetric,
    selectedDepth,
    showVectors,
    showGridLines,
    showTransects,
    showArgoFloats,
    activeTransect,
    dragStartPoint,
    dragCurrentPoint,
    argoFloats,
    projectLonToX,
    projectLatToY,
  ]);

  // Trigger re-render on state or resize changes
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = rect.width;
      // 2:1 aspect ratio for 60° lon by 25° lat span
      const displayHeight = Math.max(380, displayWidth * 0.48);

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderMap();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderMap]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  // Mouse Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const lon = inverseXToLon(clientX, rect.width);
    const lat = inverseYToLat(clientY, rect.height);

    setMousePos({ x: clientX, y: clientY });

    if (lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX) {
      const pt = findNearestGridPoint(grid, lat, lon);
      setHoveredPoint(pt);

      if (isDrawingTransect && dragStartPoint) {
        setDragCurrentPoint({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
      }
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingTransect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lon = inverseXToLon(e.clientX - rect.left, rect.width);
    const lat = inverseYToLat(e.clientY - rect.top, rect.height);

    setDragStartPoint({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
    setDragCurrentPoint({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
  };

  const handleMouseUp = () => {
    if (isDrawingTransect && dragStartPoint && dragCurrentPoint) {
      const dist = Math.hypot(
        dragCurrentPoint.lat - dragStartPoint.lat,
        dragCurrentPoint.lon - dragStartPoint.lon
      );
      if (dist > 0.5) {
        onCustomTransectDrawn(dragStartPoint, dragCurrentPoint);
      }
      setIsDrawingTransect(false);
      setDragStartPoint(null);
      setDragCurrentPoint(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingTransect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const lon = inverseXToLon(clientX, rect.width);
    const lat = inverseYToLat(clientY, rect.height);

    // Check if clicked near an Argo Float
    const clickedFloat = argoFloats.find((f) => {
      const d = Math.hypot(f.lat - lat, f.lon - lon);
      return d < 0.8;
    });

    if (clickedFloat) {
      onSelectFloat(clickedFloat);
      return;
    }

    // Otherwise select ocean grid point for deep sounding profile
    const pt = findNearestGridPoint(grid, lat, lon);
    if (pt && !pt.isLand) {
      onSelectPoint(pt);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Map Control Bar */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000000] flex flex-wrap items-center justify-between gap-3.5">
        {/* Layer Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-black stroke-[2.5]" />
            Active Channel:
          </span>

          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 p-1 border-2 border-black text-xs">
            <button
              onClick={() => setSelectedMetric('temp_layer')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'temp_layer'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              3D Temp @ Depth
            </button>

            <button
              onClick={() => setSelectedMetric('sst')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'sst'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              SST (Surface)
            </button>

            <button
              onClick={() => setSelectedMetric('sss')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'sss'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              SSS (Salinity)
            </button>

            <button
              onClick={() => setSelectedMetric('ssh')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'ssh'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              SSH (Altimetry)
            </button>

            <button
              onClick={() => setSelectedMetric('tchp')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1 border ${
                selectedMetric === 'tchp'
                  ? 'bg-[#FF3B30] text-white border-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-white text-[#FF3B30] border-black/40 hover:bg-red-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              TCHP (Cyclone Heat)
            </button>

            <button
              onClick={() => setSelectedMetric('d20')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'd20'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              D20 Thermocline
            </button>

            <button
              onClick={() => setSelectedMetric('mld')}
              className={`px-3 py-1.5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                selectedMetric === 'mld'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              MLD (Mixed Layer)
            </button>
          </div>
        </div>

        {/* View Toggles & Colormap */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Colormap selection */}
          <div className="flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 border-2 border-black text-xs shadow-[2px_2px_0px_#000000]">
            <span className="text-zinc-700 font-mono font-black uppercase text-[10px] tracking-wider">Palette:</span>
            <select
              value={colormap}
              onChange={(e) => setColormap(e.target.value as ColormapTheme)}
              className="bg-transparent text-black font-black uppercase tracking-tight focus:outline-none cursor-pointer text-xs"
            >
              <option value="turbo" className="bg-white text-black font-bold">
                Turbo (Standard Ocean)
              </option>
              <option value="thermal" className="bg-white text-black font-bold">
                Thermal (Isotherms)
              </option>
              <option value="viridis" className="bg-white text-black font-bold">
                Viridis (Scientific)
              </option>
              <option value="salinity" className="bg-white text-black font-bold">
                Halocline (Salinity)
              </option>
            </select>
          </div>

          {/* Vectors Toggle */}
          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              showVectors
                ? 'bg-black text-white'
                : 'bg-white text-zinc-600 hover:text-black'
            }`}
            title="Toggle geostrophic currents & wind vector field"
          >
            <Navigation2 className="w-3.5 h-3.5 stroke-[2.5]" />
            Vectors
          </button>

          {/* Argo Floats Toggle */}
          <button
            onClick={() => setShowArgoFloats(!showArgoFloats)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              showArgoFloats
                ? 'bg-amber-400 text-black'
                : 'bg-white text-zinc-600 hover:text-black'
            }`}
            title="Toggle Argo Float in-situ locations"
          >
            <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
            Argo CTDs
          </button>

          {/* Custom Transect Draw Button */}
          <button
            onClick={() => setIsDrawingTransect(!isDrawingTransect)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              isDrawingTransect
                ? 'bg-[#FF3B30] text-white animate-pulse'
                : 'bg-white text-black hover:bg-zinc-100'
            }`}
            title="Click and drag on map to draw a custom cross-sectional transect ray"
          >
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
            {isDrawingTransect ? 'Drag on Map...' : 'Draw Transect'}
          </button>
        </div>
      </div>

      {/* Vertical Depth Layer Slider (Visible when viewing 3D Temp layer) */}
      {selectedMetric === 'temp_layer' && (
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000000]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#FF3B30]">
                <Thermometer className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-black text-black uppercase tracking-wider font-mono">
                  VERTICAL RECONSTRUCTION LEVEL:
                </span>
                <span className="ml-2 font-mono text-white text-xs font-black bg-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_#FF3B30]">
                  {selectedDepth}M DEPTH
                </span>
                <span className="ml-2 text-xs font-bold text-zinc-600 uppercase">
                  {selectedDepth === 0
                    ? '(Sea Surface Layer)'
                    : selectedDepth <= 50
                    ? '(Mixed Layer / Euphotic)'
                    : selectedDepth <= 200
                    ? '(Main Thermocline Stratification)'
                    : selectedDepth <= 500
                    ? '(Intermediate Water)'
                    : '(Abyssal Deep Ocean)'}
                </span>
              </div>
            </div>

            {/* Quick depth level jump chips */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
              {DEPTH_LEVELS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDepth(d)}
                  className={`px-2.5 py-1 transition cursor-pointer font-black border uppercase ${
                    selectedDepth === d
                      ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                      : 'bg-zinc-100 text-black border-black/40 hover:bg-zinc-200'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Range Track */}
          <div className="mt-4 px-1">
            <input
              type="range"
              min={0}
              max={DEPTH_LEVELS.length - 1}
              step={1}
              value={DEPTH_LEVELS.indexOf(selectedDepth)}
              onChange={(e) => setSelectedDepth(DEPTH_LEVELS[Number(e.target.value)])}
              className="w-full accent-black bg-zinc-200 h-2.5 rounded-none cursor-pointer border border-black"
            />
            <div className="flex justify-between text-[11px] text-zinc-700 font-mono font-bold uppercase mt-1.5">
              <span>0m (Surface)</span>
              <span>100m (Thermocline Peak)</span>
              <span>300m (Base)</span>
              <span>1000m (Deep Target)</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-[#060d17] border-[3px] border-black overflow-hidden shadow-[6px_6px_0px_#000000]"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          className="w-full cursor-crosshair block"
        />

        {/* Hover Inspector Floating Overlay HUD */}
        {hoveredPoint && !hoveredPoint.isLand && mousePos && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(mousePos.x + 16, (containerRef.current?.clientWidth || 800) - 270),
              top: Math.max(10, mousePos.y - 120),
            }}
            className="pointer-events-none bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_#000000] w-64 z-30 text-xs transition-all text-black"
          >
            <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
              <span className="font-black text-black flex items-center gap-1 font-mono uppercase">
                <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
                {hoveredPoint.lat.toFixed(2)}°N, {hoveredPoint.lon.toFixed(2)}°E
              </span>
              <span className="font-mono text-[10px] font-black uppercase text-white bg-black px-1.5 py-0.5">
                {hoveredPoint.lon < 77
                  ? 'Arabian Sea'
                  : hoveredPoint.lat < 8
                  ? 'Equatorial IO'
                  : 'Bay of Bengal'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mt-2 font-mono text-[11px]">
              <div>
                <span className="text-zinc-600 block text-[10px] font-black uppercase">Temp @ {selectedDepth}m:</span>
                <span className="font-black text-black text-sm">
                  {hoveredPoint.temperatures[selectedDepth]?.toFixed(2)} °C
                </span>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] font-black uppercase">SST Surface:</span>
                <span className="text-black font-black">{hoveredPoint.sst.toFixed(2)} °C</span>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] font-black uppercase">Salinity (SSS):</span>
                <span className="text-black font-black">{hoveredPoint.sss.toFixed(2)} PSU</span>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] font-black uppercase">Altimetry (SSH):</span>
                <span className="text-black font-black">
                  {hoveredPoint.ssh > 0 ? `+${hoveredPoint.ssh.toFixed(3)}` : hoveredPoint.ssh.toFixed(3)} m
                </span>
              </div>
              <div>
                <span className="text-[#FF3B30] block text-[10px] font-black uppercase">TCHP Heat:</span>
                <span className="text-[#FF3B30] font-black">{hoveredPoint.tchp.toFixed(1)} kJ/cm²</span>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] font-black uppercase">D20 Depth:</span>
                <span className="text-black font-black">{hoveredPoint.d20.toFixed(0)} m</span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t-2 border-black text-[10px] text-black font-black uppercase flex items-center justify-between">
              <span>Click to view profile sounding</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        )}

        {/* Dynamic Colorbar Scale in bottom-left */}
        <div className="absolute bottom-3.5 left-3.5 bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000000] z-20 w-60 sm:w-68 text-black">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide mb-1.5 font-mono">
            <span className="truncate pr-1">{metricTitle}</span>
            <span className="text-white bg-black px-1.5 py-0.5 text-[10px]">{unitLabel}</span>
          </div>

          {/* Colorbar gradient strip */}
          <div
            className="w-full h-3.5 border-2 border-black"
            style={{
              background: `linear-gradient(to right, ${getColormapColor(
                minVal,
                minVal,
                maxVal,
                colormap
              )}, ${getColormapColor(
                (minVal + maxVal) / 2,
                minVal,
                maxVal,
                colormap
              )}, ${getColormapColor(maxVal, minVal, maxVal, colormap)})`,
            }}
          />

          <div className="flex items-center justify-between text-[11px] font-mono font-black text-black mt-1">
            <span>{minVal.toFixed(1)}</span>
            <span>{((minVal + maxVal) / 2).toFixed(1)}</span>
            <span>{maxVal.toFixed(1)}</span>
          </div>
        </div>

        {/* Quick Transects Drawer Selector in top-right */}
        <div className="absolute top-3.5 right-3.5 bg-white border-2 border-black p-2.5 shadow-[4px_4px_0px_#000000] z-20 flex flex-col gap-1.5 text-xs text-black">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black border-b border-black pb-1">
            Standard Transects:
          </span>
          {STANDARD_TRANSECTS.map((transect) => (
            <button
              key={transect.id}
              onClick={() => onSelectTransect(transect)}
              className={`text-left px-2.5 py-1 transition text-xs font-black uppercase tracking-wide cursor-pointer border ${
                activeTransect?.id === transect.id
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-zinc-100 text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              {transect.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

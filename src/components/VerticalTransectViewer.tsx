import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  Maximize2,
  Sliders,
  TrendingDown,
  Info,
  Layers,
  MapPin,
  ChevronRight,
  Compass,
} from 'lucide-react';
import {
  OceanGridPoint,
  TransectPath,
  DEPTH_LEVELS,
  ColormapTheme,
} from '../types';
import {
  sampleTransectProfile,
  getColormapColor,
  STANDARD_TRANSECTS,
} from '../utils/oceanEngine';

interface VerticalTransectViewerProps {
  grid: OceanGridPoint[];
  activeTransect: TransectPath;
  onSelectTransect: (transect: TransectPath) => void;
  colormap: ColormapTheme;
  onSelectCoordinate: (pt: OceanGridPoint) => void;
}

export const VerticalTransectViewer: React.FC<VerticalTransectViewerProps> = ({
  grid,
  activeTransect,
  onSelectTransect,
  colormap,
  onSelectCoordinate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [depthScale, setDepthScale] = useState<'stretched' | 'linear'>('stretched');
  const [showIsotherms, setShowIsotherms] = useState<boolean>(true);
  const [showMldLine, setShowMldLine] = useState<boolean>(true);
  const [showD20Line, setShowD20Line] = useState<boolean>(true);

  // Hover state on cross-section
  const [hoveredData, setHoveredData] = useState<{
    distKm: number;
    depth: number;
    temp: number;
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);

  // Sample the transect along 50 equidistant points
  const { points, maxDistKm } = useMemo(() => {
    return sampleTransectProfile(
      grid,
      activeTransect.start,
      activeTransect.end,
      55
    );
  }, [grid, activeTransect]);

  // Depth coordinate mapping function (stretched gives high resolution to top 200m)
  const mapDepthToY = (depth: number, height: number, topPad: number, botPad: number) => {
    const usableH = height - topPad - botPad;
    if (depthScale === 'stretched') {
      // Square root scaling: 0m to 1000m mapped nicely
      const norm = Math.sqrt(depth) / Math.sqrt(1000);
      return topPad + norm * usableH;
    } else {
      // Linear
      return topPad + (depth / 1000) * usableH;
    }
  };

  const inverseYToDepth = (y: number, height: number, topPad: number, botPad: number) => {
    const usableH = height - topPad - botPad;
    const norm = Math.max(0, Math.min(1, (y - topPad) / usableH));
    if (depthScale === 'stretched') {
      return Math.pow(norm * Math.sqrt(1000), 2);
    } else {
      return norm * 1000;
    }
  };

  // Interpolate temperature at any (distKm, depth)
  const getInterpolatedTemp = (distKm: number, depth: number): number => {
    if (points.length === 0) return 20;

    // 1. Find bounding distance points
    let idx1 = 0;
    let idx2 = points.length - 1;
    for (let i = 0; i < points.length - 1; i++) {
      if (distKm >= points[i].distKm && distKm <= points[i + 1].distKm) {
        idx1 = i;
        idx2 = i + 1;
        break;
      }
    }

    const p1 = points[idx1];
    const p2 = points[idx2];
    const spanDist = Math.max(0.01, p2.distKm - p1.distKm);
    const distFraction = (distKm - p1.distKm) / spanDist;

    // 2. Interpolate vertical column for both points
    const getColumnTemp = (p: typeof p1, d: number): number => {
      let d1: number = DEPTH_LEVELS[0];
      let d2: number = DEPTH_LEVELS[DEPTH_LEVELS.length - 1];
      for (let k = 0; k < DEPTH_LEVELS.length - 1; k++) {
        if (d >= DEPTH_LEVELS[k] && d <= DEPTH_LEVELS[k + 1]) {
          d1 = DEPTH_LEVELS[k];
          d2 = DEPTH_LEVELS[k + 1];
          break;
        }
      }
      const t1 = p.temperatures[d1] ?? 20;
      const t2 = p.temperatures[d2] ?? 5;
      const spanD = Math.max(1, d2 - d1);
      const fracD = (d - d1) / spanD;
      return t1 + fracD * (t2 - t1);
    };

    const tempCol1 = getColumnTemp(p1, depth);
    const tempCol2 = getColumnTemp(p2, depth);
    return tempCol1 + distFraction * (tempCol2 - tempCol1);
  };

  // Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = Math.max(380, width * 0.42);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    const topPad = 30;
    const botPad = 40;
    const leftPad = 60;
    const rightPad = 30;

    const plotW = width - leftPad - rightPad;
    const plotH = height - topPad - botPad;

    // Background
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, width, height);

    // Render 2D interpolated vertical temperature grid
    const xRes = Math.min(200, Math.floor(plotW / 3));
    const yRes = Math.min(120, Math.floor(plotH / 3));
    const cellW = plotW / xRes + 0.5;
    const cellH = plotH / yRes + 0.5;

    for (let xi = 0; xi < xRes; xi++) {
      const curDistKm = (xi / xRes) * maxDistKm;
      const screenX = leftPad + (xi / xRes) * plotW;

      for (let yi = 0; yi < yRes; yi++) {
        const screenY = topPad + (yi / yRes) * plotH;
        const curDepth = inverseYToDepth(screenY, height, topPad, botPad);

        const temp = getInterpolatedTemp(curDistKm, curDepth);
        ctx.fillStyle = getColormapColor(temp, 4.5, 31.5, colormap);
        ctx.fillRect(screenX, screenY, cellW, cellH);
      }
    }

    // Isotherm Contour Lines (28, 26, 24, 20, 15, 10, 6 °C)
    if (showIsotherms) {
      const targetIsotherms = [28, 26, 24, 20, 15, 10, 6];

      targetIsotherms.forEach((iso) => {
        ctx.beginPath();
        let started = false;

        for (let xi = 0; xi < xRes; xi++) {
          const curDistKm = (xi / xRes) * maxDistKm;
          const screenX = leftPad + (xi / xRes) * plotW;

          // Find depth where temp == iso
          let foundDepth: number | null = null;
          for (let d = 0; d <= 1000; d += 5) {
            const t = getInterpolatedTemp(curDistKm, d);
            if (t <= iso) {
              foundDepth = d;
              break;
            }
          }

          if (foundDepth !== null) {
            const screenY = mapDepthToY(foundDepth, height, topPad, botPad);
            if (!started) {
              ctx.moveTo(screenX, screenY);
              started = true;
            } else {
              ctx.lineTo(screenX, screenY);
            }
          }
        }

        ctx.strokeStyle = iso === 20 ? '#38bdf8' : iso === 26 ? '#f43f5e' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = iso === 20 || iso === 26 ? 2.0 : 1.0;
        ctx.setLineDash(iso === 20 || iso === 26 ? [] : [3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // MLD line (Mixed layer boundary)
    if (showMldLine) {
      ctx.beginPath();
      points.forEach((p, idx) => {
        const x = leftPad + (p.distKm / maxDistKm) * plotW;
        const y = mapDepthToY(p.mld, height, topPad, botPad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // D20 Thermocline Ridge line
    if (showD20Line) {
      ctx.beginPath();
      points.forEach((p, idx) => {
        const x = leftPad + (p.distKm / maxDistKm) * plotW;
        const y = mapDepthToY(p.d20, height, topPad, botPad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Axes and Depth Ticks
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftPad, topPad, plotW, plotH);

    // Depth Labels on Left
    const depthTicks = [0, 50, 100, 200, 300, 500, 750, 1000];
    depthTicks.forEach((d) => {
      const y = mapDepthToY(d, height, topPad, botPad);
      ctx.beginPath();
      ctx.moveTo(leftPad - 5, y);
      ctx.lineTo(leftPad, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${d}m`, leftPad - 8, y + 3);
    });

    // Distance Labels on Bottom
    for (let k = 0; k <= 5; k++) {
      const dist = (k / 5) * maxDistKm;
      const x = leftPad + (k / 5) * plotW;

      ctx.beginPath();
      ctx.moveTo(x, topPad + plotH);
      ctx.lineTo(x, topPad + plotH + 5);
      ctx.stroke();

      ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist.toFixed(0)} km`, x, topPad + plotH + 18);
    }

    // Transect endpoints labels
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Start: (${activeTransect.start.lat.toFixed(1)}°N, ${activeTransect.start.lon.toFixed(1)}°E)`,
      leftPad,
      topPad - 10
    );

    ctx.textAlign = 'right';
    ctx.fillText(
      `End: (${activeTransect.end.lat.toFixed(1)}°N, ${activeTransect.end.lon.toFixed(1)}°E)`,
      leftPad + plotW,
      topPad - 10
    );
  }, [
    points,
    maxDistKm,
    depthScale,
    showIsotherms,
    showMldLine,
    showD20Line,
    colormap,
    activeTransect,
  ]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const topPad = 30;
    const botPad = 40;
    const leftPad = 60;
    const rightPad = 30;
    const plotW = rect.width - leftPad - rightPad;
    const plotH = rect.height - topPad - botPad;

    if (x >= leftPad && x <= leftPad + plotW && y >= topPad && y <= topPad + plotH) {
      const normX = (x - leftPad) / plotW;
      const distKm = normX * maxDistKm;
      const depth = inverseYToDepth(y, rect.height, topPad, botPad);
      const temp = getInterpolatedTemp(distKm, depth);

      // Interpolate Lat / Lon along transect
      const curLat =
        activeTransect.start.lat + normX * (activeTransect.end.lat - activeTransect.start.lat);
      const curLon =
        activeTransect.start.lon + normX * (activeTransect.end.lon - activeTransect.start.lon);

      setHoveredData({
        distKm,
        depth,
        temp,
        lat: curLat,
        lon: curLon,
        x,
        y,
      });
    } else {
      setHoveredData(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls for Transect */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000000] flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-black text-black flex items-center gap-1.5 uppercase font-display">
              <Activity className="w-5 h-5 text-black stroke-[2.5]" />
              {activeTransect.name}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-black text-white font-black border border-black uppercase tracking-wider">
              Length: {maxDistKm.toFixed(0)} km
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-wide mt-0.5">{activeTransect.description}</p>
        </div>

        {/* Display Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Depth Scale Switch */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 border-2 border-black text-xs">
            <button
              onClick={() => setDepthScale('stretched')}
              className={`px-3 py-1 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                depthScale === 'stretched'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
              title="Stretches upper 200m to inspect thermocline and mixed layer in detail"
            >
              Upper-Stretched
            </button>
            <button
              onClick={() => setDepthScale('linear')}
              className={`px-3 py-1 font-black uppercase text-xs tracking-wider transition-all cursor-pointer border ${
                depthScale === 'linear'
                  ? 'bg-black text-white border-black shadow-[2px_2px_0px_#FF3B30]'
                  : 'bg-white text-black border-black/40 hover:bg-zinc-200'
              }`}
            >
              Linear Depth
            </button>
          </div>

          {/* Isotherm toggle */}
          <button
            onClick={() => setShowIsotherms(!showIsotherms)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              showIsotherms
                ? 'bg-[#FF3B30] text-white'
                : 'bg-white text-zinc-600 hover:text-black'
            }`}
          >
            Isotherms (26°C / 20°C)
          </button>

          {/* D20 line toggle */}
          <button
            onClick={() => setShowD20Line(!showD20Line)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              showD20Line
                ? 'bg-black text-white'
                : 'bg-white text-zinc-600 hover:text-black'
            }`}
          >
            D20 Ridge
          </button>
        </div>
      </div>

      {/* Main Cross Section Canvas */}
      <div
        ref={containerRef}
        className="relative bg-[#060d17] border-[3px] border-black overflow-hidden shadow-[6px_6px_0px_#000000]"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredData(null)}
          className="w-full block cursor-crosshair"
        />

        {/* Hover Tooltip on Transect */}
        {hoveredData && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hoveredData.x + 12, (containerRef.current?.clientWidth || 800) - 220),
              top: Math.max(10, hoveredData.y - 80),
            }}
            className="pointer-events-none bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000000] text-xs z-30 font-mono text-black w-52"
          >
            <div className="font-black text-black flex items-center justify-between border-b-2 border-black pb-1 mb-1.5">
              <span className="text-sm font-black">{hoveredData.temp.toFixed(2)} °C</span>
              <span className="text-[10px] font-black text-white bg-black px-1.5 py-0.5">@ {hoveredData.depth.toFixed(0)}M</span>
            </div>
            <div className="text-[11px] font-bold text-zinc-800 space-y-0.5 uppercase">
              <div>Distance: {hoveredData.distKm.toFixed(1)} km</div>
              <div>
                Location: {hoveredData.lat.toFixed(2)}°N, {hoveredData.lon.toFixed(2)}°E
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Oceanographic Physical Annotations for Active Transect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <span className="font-black text-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5 font-mono text-xs">
            <Compass className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            Upper Layer Dynamics
          </span>
          <p className="text-zinc-700 leading-relaxed font-medium">
            The white dashed line traces the <strong>Mixed Layer Depth (MLD)</strong>. Above this,
            turbulent wind mixing maintains uniform temperatures between 28.5°C and 30.5°C.
          </p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <span className="font-black text-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5 font-mono text-xs">
            <TrendingDown className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            Main Thermocline (D20 &amp; D26)
          </span>
          <p className="text-zinc-700 leading-relaxed font-medium">
            The cyan contour marks the <strong>20°C Isotherm (D20)</strong>. Notice shoaling in
            coastal upwelling zones (Somalia / Sri Lanka Dome) and deepening in warm pools.
          </p>
        </div>

        <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_#000000]">
          <span className="font-black text-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5 font-mono text-xs">
            <Layers className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            Deep Abyssal Layer (1000m)
          </span>
          <p className="text-zinc-700 leading-relaxed font-medium">
            Below 500m, temperature smoothly asymptotes to <strong>5.4°C – 6.2°C</strong>,
            validated against WOD23 &amp; GLORYS12V1 ocean reanalysis fields.
          </p>
        </div>
      </div>
    </div>
  );
};

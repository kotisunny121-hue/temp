export type SurfaceChannel =
  | 'sst'
  | 'sss'
  | 'ssh'
  | 'u_curr'
  | 'v_curr'
  | 'u_wind'
  | 'v_wind';

export type DisplayMetric =
  | SurfaceChannel
  | 'temp_layer'
  | 'tchp'
  | 'd20'
  | 'd26'
  | 'mld';

export type ColormapTheme = 'turbo' | 'thermal' | 'viridis' | 'salinity' | 'anomalies';

export const DEPTH_LEVELS = [
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000,
] as const;

export type DepthLevel = (typeof DEPTH_LEVELS)[number];

export interface OceanGridPoint {
  lat: number;
  lon: number;
  isLand: boolean;
  sst: number; // °C
  sss: number; // PSU
  ssh: number; // m
  u_curr: number; // m/s
  v_curr: number; // m/s
  u_wind: number; // m/s
  v_wind: number; // m/s
  temperatures: Record<number, number>; // depth -> temp °C
  glorysTemperatures?: Record<number, number>; // ground truth comparison
  d20: number; // 20°C isotherm depth (m)
  d26: number; // 26°C isotherm depth (m)
  mld: number; // Mixed layer depth (m)
  tchp: number; // Tropical Cyclone Heat Potential (kJ/cm²)
}

export interface ArgoFloat {
  id: string;
  wmo: string;
  platform: string;
  lat: number;
  lon: number;
  date: string;
  basin: 'Arabian Sea' | 'Bay of Bengal' | 'Equatorial IO' | 'Andaman Sea';
  profile: {
    depth: number;
    obsTemp: number;
    modelTemp: number;
    glorysTemp: number;
    salinity: number;
  }[];
  rmse: number;
  tchp: number;
}

export interface TransectPath {
  id: string;
  name: string;
  description: string;
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
}

export interface DepthEvaluationMetric {
  depth: number;
  rmse: number;
  mae: number;
  corr: number;
  baselineRmse: number;
}

export interface TrainingLossHistory {
  epoch: number;
  loss: number;
  valLoss: number;
  upperRmse: number; // 0-100m
  thermoRmse: number; // 100-300m
  deepRmse: number; // 300-1000m
}

export interface SynopticEventPreset {
  id: string;
  title: string;
  season: string;
  dateStr: string;
  description: string;
  keyFeatures: string[];
  cycloneActive?: boolean;
  somaliUpwellingIntensity: number; // 0-1
  bobRunoffIntensity: number; // 0-1
  warmPoolCenter: { lat: number; lon: number };
}

export interface ModelAttentionHead {
  headId: number;
  name: string;
  focus: string;
  weights: number[][]; // 16x16 grid attention pattern
}

import { db } from './index.ts';
import {
  depthLevels,
  datasets,
  gridPoints,
  models,
  experiments,
  samples,
  predictions,
  validationResults,
} from './schema.ts';

export async function seedDatabase() {
  try {
    // Check if datasets already exist
    const existingDatasets = await db.select().from(datasets).limit(1);
    if (existingDatasets.length > 0) {
      console.log('Database already populated. Skipping initial seed.');
      return { status: 'already_seeded' };
    }

    console.log('Seeding Northern Indian Ocean PostgreSQL database...');

    // 1. Depth Levels (15 layers)
    const depths = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000];
    const insertedDepths = await db
      .insert(depthLevels)
      .values(depths.map((d) => ({ depthM: d })))
      .returning();

    // 2. Datasets
    const datasetRows = [
      {
        name: 'GLORYS12V1',
        type: 'reanalysis',
        variable: 'temperature',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://marine.copernicus.eu/services-portfolio/access-to-products',
        version: 'v2025-NIO',
        description: 'Mercator Ocean global 1/12° reanalysis regridded to 0.25° NIO framework for 3D subsurface temperature ground truth (0–1000m).',
      },
      {
        name: 'OSTIA Foundation SST',
        type: 'satellite',
        variable: 'temperature',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://ghrsst.jpl.nasa.gov/data/ostia',
        version: 'v2.1',
        description: 'Operational Sea Surface Temperature and Sea Ice Analysis foundation SST multi-sensor infrared/microwave blend.',
      },
      {
        name: 'SMAP/SMOS SSS',
        type: 'satellite',
        variable: 'salinity',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://podaac.jpl.nasa.gov/SMAP',
        version: 'v5.0',
        description: 'L-band microwave radiometer sea surface salinity capturing Ganga-Brahmaputra freshwater plume and Arabian Sea high-salinity water.',
      },
      {
        name: 'DUACS SLA/ADT',
        type: 'satellite',
        variable: 'ssh',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://marine.copernicus.eu/duacs',
        version: 'vDT2021',
        description: 'Multi-satellite merged altimetry mapping Sea Level Anomaly and Absolute Dynamic Topography for mesoscale eddy detection.',
      },
      {
        name: 'OSCAR Ocean Currents',
        type: 'satellite',
        variable: 'currents',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://esr.org/oscar',
        version: 'v2.0',
        description: 'Ocean Surface Current Analysis Real-time geostrophic and Ekman velocity components (U, V).',
      },
      {
        name: 'CCMP/ERA5 Surface Winds',
        type: 'satellite',
        variable: 'winds',
        resolution: '0.25°',
        temporalResolution: 'daily',
        sourceUrl: 'https://remss.com/ccmp',
        version: 'v3.1',
        description: 'Cross-Calibrated Multi-Platform surface 10-meter wind vectors (U, V) driving coastal upwelling and monsoon reversal.',
      },
      {
        name: 'INCOIS-CORIOLIS Argo Network',
        type: 'insitu',
        variable: 'temperature',
        resolution: 'point-profile',
        temporalResolution: '10-day cycle',
        sourceUrl: 'https://incois.gov.in/portal/argo.jsp',
        version: 'v3.2',
        description: 'Autonomous CTD profiling floats deployed across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean.',
      },
    ];
    const insertedDatasets = await db.insert(datasets).values(datasetRows).returning();

    // 3. Grid Points (Representative points across 5°N–30°N, 45°E–105°E at 0.25° interval)
    const gridRows = [
      { latitude: 15.0, longitude: 88.0, gridIndex: 12450 }, // Central Bay of Bengal
      { latitude: 12.0, longitude: 84.5, gridIndex: 10214 }, // Southwestern BoB
      { latitude: 19.5, longitude: 89.0, gridIndex: 14502 }, // Northern BoB Freshwater plume
      { latitude: 8.5, longitude: 83.5, gridIndex: 8210 },  // Sri Lanka Dome
      { latitude: 15.0, longitude: 64.0, gridIndex: 12100 }, // Central Arabian Sea
      { latitude: 10.0, longitude: 72.0, gridIndex: 9140 },  // Lakshadweep Sea
      { latitude: 9.5, longitude: 54.0, gridIndex: 8920 },   // Somali Current / Great Whirl
      { latitude: 5.0, longitude: 78.0, gridIndex: 5120 },   // Equatorial Indian Ocean
      { latitude: 11.5, longitude: 93.0, gridIndex: 10040 }, // Andaman Sea
      { latitude: 21.0, longitude: 67.0, gridIndex: 15320 }, // Northern Arabian Sea
      { latitude: 17.25, longitude: 82.5, gridIndex: 13180 }, // Visakhapatnam Coast
      { latitude: 13.0, longitude: 58.0, gridIndex: 11040 }, // Oman Upwelling Zone
    ];
    const insertedGrids = await db.insert(gridPoints).values(gridRows).returning();

    // 4. Models
    const modelRows = [
      {
        modelName: 'SatelliteTransformer-v2',
        architecture: 'CNN-Transformer Hybrid',
        version: 'v2.4',
        trainingDataset: 'GLORYS12V1 (2010–2023)',
        modelPath: 'gs://nio-models-checkpoint/satellite_transformer_v2.pt',
      },
      {
        modelName: 'DeepOcean-3DCNN',
        architecture: '3D ResNet Encoder-Decoder',
        version: 'v1.2',
        trainingDataset: 'GLORYS12V1 (2010–2023)',
        modelPath: 'gs://nio-models-checkpoint/deepocean_cnn_v1.pt',
      },
      {
        modelName: 'Ocean-ViT-Patch16',
        architecture: 'Vision Transformer (ViT)',
        version: 'v1.0',
        trainingDataset: 'GLORYS12V1 (2010–2023)',
        modelPath: 'gs://nio-models-checkpoint/ocean_vit_v1.pt',
      },
      {
        modelName: 'Climatological-Baseline',
        architecture: 'Statistical Harmonic Spline',
        version: 'v1.0',
        trainingDataset: 'WOA23 Climatology',
        modelPath: 'models/climatology_baseline.pkl',
      },
    ];
    const insertedModels = await db.insert(models).values(modelRows).returning();

    // 5. Experiments
    const experimentRows = [
      {
        experimentCode: 'EXP001-TRANSFORMER',
        modelId: insertedModels[0].id,
        datasetId: insertedDatasets[0].id,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.0001,
        optimizer: 'AdamW (weight_decay=1e-2)',
        lossFunction: 'MSE + Physics-Thermocline Regularizer',
        bestValLoss: 0.042,
        startedAt: new Date(Date.now() - 86400000 * 3),
        completedAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        experimentCode: 'EXP002-3DCNN',
        modelId: insertedModels[1].id,
        datasetId: insertedDatasets[0].id,
        epochs: 50,
        batchSize: 32,
        learningRate: 0.0005,
        optimizer: 'Adam (beta1=0.9, beta2=0.999)',
        lossFunction: 'Weighted L1 + MSE',
        bestValLoss: 0.078,
        startedAt: new Date(Date.now() - 86400000 * 5),
        completedAt: new Date(Date.now() - 86400000 * 4),
      },
      {
        experimentCode: 'EXP003-OCEANVIT',
        modelId: insertedModels[2].id,
        datasetId: insertedDatasets[0].id,
        epochs: 45,
        batchSize: 16,
        learningRate: 0.00005,
        optimizer: 'AdamW + CosineAnnealing',
        lossFunction: 'MSE',
        bestValLoss: 0.059,
        startedAt: new Date(Date.now() - 86400000 * 7),
        completedAt: new Date(Date.now() - 86400000 * 6),
      },
    ];
    const insertedExperiments = await db.insert(experiments).values(experimentRows).returning();

    // 6. Samples (Real surface satellite inputs across locations)
    const sampleRows = [
      {
        sampleCode: 'NIO-SMP-20250115-01',
        date: '2025-01-15',
        latitude: 15.0,
        longitude: 88.0,
        gridId: insertedGrids[0].id,
        sst: 28.6,
        sss: 32.8,
        sla: 0.095,
        currentU: 0.28,
        currentV: 0.12,
        windU: -4.2,
        windV: 3.5,
        inputDataPath: '/data/satellite/zarr/20250115_bob_central_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_bob_central_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-02',
        date: '2025-01-15',
        latitude: 12.0,
        longitude: 84.5,
        gridId: insertedGrids[1].id,
        sst: 29.1,
        sss: 33.1,
        sla: 0.142,
        currentU: 0.42,
        currentV: 0.21,
        windU: -5.1,
        windV: 2.8,
        inputDataPath: '/data/satellite/zarr/20250115_sw_bob_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_sw_bob_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-03',
        date: '2025-01-15',
        latitude: 19.5,
        longitude: 89.0,
        gridId: insertedGrids[2].id,
        sst: 27.8,
        sss: 29.4,
        sla: 0.051,
        currentU: 0.15,
        currentV: -0.08,
        windU: -3.8,
        windV: 4.1,
        inputDataPath: '/data/satellite/zarr/20250115_north_bob_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_north_bob_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-04',
        date: '2025-01-15',
        latitude: 8.5,
        longitude: 83.5,
        gridId: insertedGrids[3].id,
        sst: 28.9,
        sss: 33.7,
        sla: 0.118,
        currentU: 0.35,
        currentV: 0.31,
        windU: -4.8,
        windV: 1.9,
        inputDataPath: '/data/satellite/zarr/20250115_srilanka_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_srilanka_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-05',
        date: '2025-01-15',
        latitude: 15.0,
        longitude: 64.0,
        gridId: insertedGrids[4].id,
        sst: 27.2,
        sss: 36.4,
        sla: -0.045,
        currentU: -0.22,
        currentV: 0.18,
        windU: 6.2,
        windV: -4.5,
        inputDataPath: '/data/satellite/zarr/20250115_arabian_sea_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_arabian_sea_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-06',
        date: '2025-01-15',
        latitude: 10.0,
        longitude: 72.0,
        gridId: insertedGrids[5].id,
        sst: 28.5,
        sss: 35.8,
        sla: 0.082,
        currentU: 0.18,
        currentV: 0.11,
        windU: -3.5,
        windV: 2.1,
        inputDataPath: '/data/satellite/zarr/20250115_lakshadweep_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_lakshadweep_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-07',
        date: '2025-01-15',
        latitude: 9.5,
        longitude: 54.0,
        gridId: insertedGrids[6].id,
        sst: 24.8,
        sss: 35.9,
        sla: -0.125,
        currentU: 1.15,
        currentV: 0.82,
        windU: 9.4,
        windV: 7.2,
        inputDataPath: '/data/satellite/zarr/20250115_somali_upwelling_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_somali_upwelling_target.zarr',
      },
      {
        sampleCode: 'NIO-SMP-20250115-08',
        date: '2025-01-15',
        latitude: 5.0,
        longitude: 78.0,
        gridId: insertedGrids[7].id,
        sst: 29.3,
        sss: 34.2,
        sla: 0.071,
        currentU: 0.65,
        currentV: 0.05,
        windU: 3.1,
        windV: 0.8,
        inputDataPath: '/data/satellite/zarr/20250115_equatorial_jet_input.zarr',
        targetDataPath: '/data/glorys/zarr/20250115_equatorial_jet_target.zarr',
      },
    ];
    const insertedSamples = await db.insert(samples).values(sampleRows).returning();

    // 7. Predictions (15 depth values: [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
    const profileBoBCentral = [28.6, 28.5, 28.4, 28.1, 27.6, 26.2, 23.8, 20.4, 17.5, 15.2, 12.8, 9.8, 7.5, 6.1, 5.2];
    const profileSWBoB = [29.1, 29.0, 28.9, 28.7, 28.2, 27.1, 24.8, 21.5, 18.2, 15.9, 13.2, 10.1, 7.8, 6.3, 5.3];
    const profileNorthBoB = [27.8, 27.7, 27.6, 27.3, 26.8, 25.1, 22.4, 19.5, 16.8, 14.7, 12.1, 9.4, 7.2, 5.9, 5.1];
    const profileSriLanka = [28.9, 28.8, 28.7, 28.4, 27.9, 26.8, 24.1, 21.0, 17.9, 15.4, 13.0, 9.9, 7.6, 6.2, 5.2];
    const profileArabianSea = [27.2, 27.1, 27.0, 26.6, 25.8, 23.5, 21.1, 18.8, 16.5, 14.6, 12.5, 9.6, 7.4, 6.0, 5.1];
    const profileLakshadweep = [28.5, 28.4, 28.3, 28.0, 27.4, 25.9, 23.2, 20.1, 17.3, 15.0, 12.7, 9.7, 7.5, 6.1, 5.2];
    const profileSomali = [24.8, 24.5, 24.1, 23.0, 21.5, 18.8, 16.2, 14.5, 13.2, 12.0, 10.5, 8.8, 7.1, 5.8, 4.9];
    const profileEquatorial = [29.3, 29.2, 29.1, 28.8, 28.3, 27.0, 24.5, 21.2, 18.0, 15.6, 13.1, 10.0, 7.7, 6.2, 5.2];

    const predictionRows = [
      {
        sampleId: insertedSamples[0].id,
        modelId: insertedModels[0].id, // SatelliteTransformer-v2
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-01.zarr',
        predictedProfile: JSON.stringify(profileBoBCentral),
        tchp: 86.4,
        d20: 104.2,
        d26: 52.8,
      },
      {
        sampleId: insertedSamples[1].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-02.zarr',
        predictedProfile: JSON.stringify(profileSWBoB),
        tchp: 112.5,
        d20: 118.0,
        d26: 62.4,
      },
      {
        sampleId: insertedSamples[2].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-03.zarr',
        predictedProfile: JSON.stringify(profileNorthBoB),
        tchp: 68.2,
        d20: 95.6,
        d26: 42.1,
      },
      {
        sampleId: insertedSamples[3].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-04.zarr',
        predictedProfile: JSON.stringify(profileSriLanka),
        tchp: 94.8,
        d20: 109.5,
        d26: 58.0,
      },
      {
        sampleId: insertedSamples[4].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-05.zarr',
        predictedProfile: JSON.stringify(profileArabianSea),
        tchp: 54.1,
        d20: 88.4,
        d26: 28.5,
      },
      {
        sampleId: insertedSamples[5].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-06.zarr',
        predictedProfile: JSON.stringify(profileLakshadweep),
        tchp: 82.3,
        d20: 101.0,
        d26: 49.6,
      },
      {
        sampleId: insertedSamples[6].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-07.zarr',
        predictedProfile: JSON.stringify(profileSomali),
        tchp: 18.2,
        d20: 38.0,
        d26: 0.0,
      },
      {
        sampleId: insertedSamples[7].id,
        modelId: insertedModels[0].id,
        predictionPath: '/data/predictions/EXP001_NIO-SMP-20250115-08.zarr',
        predictedProfile: JSON.stringify(profileEquatorial),
        tchp: 98.6,
        d20: 112.4,
        d26: 59.2,
      },
    ];
    const insertedPredictions = await db.insert(predictions).values(predictionRows).returning();

    // 8. Validation Results (ARGO Float Match-ups across depths)
    const valRows = [
      // Float WMO 2902264 (SW BoB)
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[0].id, rmse: 0.14, bias: 0.02, correlation: 0.99, mae: 0.11 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[3].id, rmse: 0.22, bias: -0.03, correlation: 0.98, mae: 0.17 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[5].id, rmse: 0.44, bias: 0.05, correlation: 0.95, mae: 0.35 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[7].id, rmse: 0.58, bias: -0.08, correlation: 0.92, mae: 0.46 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[10].id, rmse: 0.65, bias: 0.12, correlation: 0.89, mae: 0.52 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[12].id, rmse: 0.48, bias: 0.04, correlation: 0.84, mae: 0.38 },
      { predictionId: insertedPredictions[1].id, argoId: 'WMO 2902264', depthId: insertedDepths[14].id, rmse: 0.32, bias: 0.01, correlation: 0.76, mae: 0.25 },

      // Float WMO 2902088 (Central BoB)
      { predictionId: insertedPredictions[0].id, argoId: 'WMO 2902088', depthId: insertedDepths[0].id, rmse: 0.16, bias: 0.01, correlation: 0.99, mae: 0.12 },
      { predictionId: insertedPredictions[0].id, argoId: 'WMO 2902088', depthId: insertedDepths[5].id, rmse: 0.48, bias: 0.06, correlation: 0.94, mae: 0.39 },
      { predictionId: insertedPredictions[0].id, argoId: 'WMO 2902088', depthId: insertedDepths[7].id, rmse: 0.62, bias: -0.09, correlation: 0.91, mae: 0.48 },
      { predictionId: insertedPredictions[0].id, argoId: 'WMO 2902088', depthId: insertedDepths[10].id, rmse: 0.71, bias: 0.14, correlation: 0.88, mae: 0.56 },

      // Float WMO 2902190 (Arabian Sea)
      { predictionId: insertedPredictions[4].id, argoId: 'WMO 2902190', depthId: insertedDepths[0].id, rmse: 0.18, bias: -0.02, correlation: 0.98, mae: 0.14 },
      { predictionId: insertedPredictions[4].id, argoId: 'WMO 2902190', depthId: insertedDepths[5].id, rmse: 0.52, bias: 0.07, correlation: 0.93, mae: 0.41 },
      { predictionId: insertedPredictions[4].id, argoId: 'WMO 2902190', depthId: insertedDepths[7].id, rmse: 0.68, bias: 0.11, correlation: 0.90, mae: 0.54 },
      { predictionId: insertedPredictions[4].id, argoId: 'WMO 2902190', depthId: insertedDepths[10].id, rmse: 0.79, bias: 0.18, correlation: 0.86, mae: 0.62 },

      // Float WMO 2902341 (Equatorial IO)
      { predictionId: insertedPredictions[7].id, argoId: 'WMO 2902341', depthId: insertedDepths[0].id, rmse: 0.12, bias: 0.01, correlation: 0.99, mae: 0.09 },
      { predictionId: insertedPredictions[7].id, argoId: 'WMO 2902341', depthId: insertedDepths[5].id, rmse: 0.39, bias: 0.04, correlation: 0.96, mae: 0.31 },
      { predictionId: insertedPredictions[7].id, argoId: 'WMO 2902341', depthId: insertedDepths[7].id, rmse: 0.54, bias: -0.05, correlation: 0.93, mae: 0.43 },
    ];
    await db.insert(validationResults).values(valRows);

    console.log('Seeding completed successfully!');
    return { status: 'seeded', datasetsCount: insertedDatasets.length, samplesCount: insertedSamples.length };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

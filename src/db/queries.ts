import { db } from './index.ts';
import {
  datasets,
  gridPoints,
  depthLevels,
  samples,
  models,
  experiments,
  predictions,
  validationResults,
  users,
} from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';

export async function getDbOverview() {
  try {
    const [datasetCount] = await db.select({ count: sql<number>`count(*)` }).from(datasets);
    const [gridCount] = await db.select({ count: sql<number>`count(*)` }).from(gridPoints);
    const [sampleCount] = await db.select({ count: sql<number>`count(*)` }).from(samples);
    const [modelCount] = await db.select({ count: sql<number>`count(*)` }).from(models);
    const [experimentCount] = await db.select({ count: sql<number>`count(*)` }).from(experiments);
    const [predictionCount] = await db.select({ count: sql<number>`count(*)` }).from(predictions);
    const [validationCount] = await db.select({ count: sql<number>`count(*)` }).from(validationResults);

    return {
      datasets: Number(datasetCount?.count || 0),
      gridPoints: Number(gridCount?.count || 0),
      samples: Number(sampleCount?.count || 0),
      models: Number(modelCount?.count || 0),
      experiments: Number(experimentCount?.count || 0),
      predictions: Number(predictionCount?.count || 0),
      validationResults: Number(validationCount?.count || 0),
    };
  } catch (error) {
    console.error('Failed to get db overview:', error);
    throw new Error('Database overview query failed', { cause: error });
  }
}

export async function getAllDatasets() {
  try {
    return await db.select().from(datasets).orderBy(datasets.id);
  } catch (error) {
    console.error('Failed to query datasets:', error);
    throw new Error('Failed to retrieve datasets from PostgreSQL', { cause: error });
  }
}

export async function getAllGridPoints() {
  try {
    return await db.select().from(gridPoints).orderBy(gridPoints.id);
  } catch (error) {
    console.error('Failed to query grid points:', error);
    throw new Error('Failed to retrieve grid points from PostgreSQL', { cause: error });
  }
}

export async function getAllDepthLevels() {
  try {
    return await db.select().from(depthLevels).orderBy(depthLevels.depthM);
  } catch (error) {
    console.error('Failed to query depth levels:', error);
    throw new Error('Failed to retrieve depth levels from PostgreSQL', { cause: error });
  }
}

export async function getAllSamples() {
  try {
    return await db
      .select({
        id: samples.id,
        sampleCode: samples.sampleCode,
        date: samples.date,
        latitude: samples.latitude,
        longitude: samples.longitude,
        gridId: samples.gridId,
        sst: samples.sst,
        sss: samples.sss,
        sla: samples.sla,
        currentU: samples.currentU,
        currentV: samples.currentV,
        windU: samples.windU,
        windV: samples.windV,
        inputDataPath: samples.inputDataPath,
        targetDataPath: samples.targetDataPath,
        createdAt: samples.createdAt,
      })
      .from(samples)
      .orderBy(desc(samples.id));
  } catch (error) {
    console.error('Failed to query samples:', error);
    throw new Error('Failed to retrieve samples from PostgreSQL', { cause: error });
  }
}

export async function getAllModels() {
  try {
    return await db.select().from(models).orderBy(models.id);
  } catch (error) {
    console.error('Failed to query models:', error);
    throw new Error('Failed to retrieve models from PostgreSQL', { cause: error });
  }
}

export async function getAllExperiments() {
  try {
    return await db
      .select({
        id: experiments.id,
        experimentCode: experiments.experimentCode,
        modelId: experiments.modelId,
        datasetId: experiments.datasetId,
        modelName: models.modelName,
        architecture: models.architecture,
        datasetName: datasets.name,
        epochs: experiments.epochs,
        batchSize: experiments.batchSize,
        learningRate: experiments.learningRate,
        optimizer: experiments.optimizer,
        lossFunction: experiments.lossFunction,
        bestValLoss: experiments.bestValLoss,
        startedAt: experiments.startedAt,
        completedAt: experiments.completedAt,
      })
      .from(experiments)
      .leftJoin(models, eq(experiments.modelId, models.id))
      .leftJoin(datasets, eq(experiments.datasetId, datasets.id))
      .orderBy(desc(experiments.id));
  } catch (error) {
    console.error('Failed to query experiments:', error);
    throw new Error('Failed to retrieve experiments from PostgreSQL', { cause: error });
  }
}

export async function getAllPredictions() {
  try {
    return await db
      .select({
        id: predictions.id,
        sampleId: predictions.sampleId,
        modelId: predictions.modelId,
        modelName: models.modelName,
        sampleCode: samples.sampleCode,
        latitude: samples.latitude,
        longitude: samples.longitude,
        predictionPath: predictions.predictionPath,
        predictedProfile: predictions.predictedProfile,
        tchp: predictions.tchp,
        d20: predictions.d20,
        d26: predictions.d26,
        createdAt: predictions.createdAt,
      })
      .from(predictions)
      .leftJoin(models, eq(predictions.modelId, models.id))
      .leftJoin(samples, eq(predictions.sampleId, samples.id))
      .orderBy(desc(predictions.id));
  } catch (error) {
    console.error('Failed to query predictions:', error);
    throw new Error('Failed to retrieve predictions from PostgreSQL', { cause: error });
  }
}

export async function getValidationResults() {
  try {
    return await db
      .select({
        id: validationResults.id,
        predictionId: validationResults.predictionId,
        argoId: validationResults.argoId,
        depthM: depthLevels.depthM,
        rmse: validationResults.rmse,
        bias: validationResults.bias,
        correlation: validationResults.correlation,
        mae: validationResults.mae,
      })
      .from(validationResults)
      .leftJoin(depthLevels, eq(validationResults.depthId, depthLevels.id))
      .orderBy(depthLevels.depthM);
  } catch (error) {
    console.error('Failed to query validation results:', error);
    throw new Error('Failed to retrieve validation results from PostgreSQL', { cause: error });
  }
}

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Failed to get/create user:', error);
    throw new Error('Failed to register user in PostgreSQL', { cause: error });
  }
}

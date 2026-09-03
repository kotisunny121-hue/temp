import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, real, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

// 0. Users table (Firebase Auth linkage)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 1. Datasets table: tracks where observation and reanalysis data originate
export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'reanalysis', 'satellite', 'insitu'
  variable: text('variable').notNull(), // 'temperature', 'salinity', 'ssh', 'currents', 'winds'
  resolution: text('resolution').notNull(), // '0.25°'
  temporalResolution: text('temporal_resolution').notNull(), // 'daily'
  sourceUrl: text('source_url').notNull(),
  version: text('version').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Grid Points table: defining the 5°N–30°N, 45°E–105°E Northern Indian Ocean grid
export const gridPoints = pgTable('grid_points', {
  id: serial('id').primaryKey(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  gridIndex: integer('grid_index').notNull(),
});

// 3. Depth Levels table: 15 vertical depth layers (0m to 1000m)
export const depthLevels = pgTable('depth_levels', {
  id: serial('id').primaryKey(),
  depthM: integer('depth_m').notNull(),
});

// 4. Samples table: metadata for each spatial-temporal sample point referencing storage paths
export const samples = pgTable('samples', {
  id: serial('id').primaryKey(),
  sampleCode: text('sample_code').notNull().unique(),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  gridId: integer('grid_id').references(() => gridPoints.id),
  sst: real('sst'),
  sss: real('sss'),
  sla: real('sla'),
  currentU: real('current_u'),
  currentV: real('current_v'),
  windU: real('wind_u'),
  windV: real('wind_v'),
  inputDataPath: text('input_data_path').notNull(),
  targetDataPath: text('target_data_path').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Models table: AI model architectures and checkpoint locations
export const models = pgTable('models', {
  id: serial('id').primaryKey(),
  modelName: text('model_name').notNull(),
  architecture: text('architecture').notNull(),
  version: text('version').notNull(),
  trainingDataset: text('training_dataset').notNull(),
  modelPath: text('model_path').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Experiments table: training runs, hyperparams, and convergence metrics
export const experiments = pgTable('experiments', {
  id: serial('id').primaryKey(),
  experimentCode: text('experiment_code').notNull().unique(),
  modelId: integer('model_id').references(() => models.id).notNull(),
  datasetId: integer('dataset_id').references(() => datasets.id).notNull(),
  epochs: integer('epochs').notNull(),
  batchSize: integer('batch_size').notNull(),
  learningRate: real('learning_rate').notNull(),
  optimizer: text('optimizer').notNull(),
  lossFunction: text('loss_function').notNull(),
  bestValLoss: real('best_val_loss'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// 7. Predictions table: Model inferences mapping surface observations to subsurface profiles
export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  sampleId: integer('sample_id').references(() => samples.id).notNull(),
  modelId: integer('model_id').references(() => models.id).notNull(),
  predictionPath: text('prediction_path').notNull(),
  predictedProfile: text('predicted_profile').notNull(), // JSON stringified array of 15 temperatures
  tchp: real('tchp'),
  d20: real('d20'),
  d26: real('d26'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Validation Results table: In-situ ARGO float comparisons and depth-wise metrics
export const validationResults = pgTable('validation_results', {
  id: serial('id').primaryKey(),
  predictionId: integer('prediction_id').references(() => predictions.id).notNull(),
  argoId: text('argo_id').notNull(),
  depthId: integer('depth_id').references(() => depthLevels.id).notNull(),
  rmse: real('rmse').notNull(),
  bias: real('bias').notNull(),
  correlation: real('correlation').notNull(),
  mae: real('mae').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({}) => ({}));

export const datasetsRelations = relations(datasets, ({ many }) => ({
  experiments: many(experiments),
}));

export const gridPointsRelations = relations(gridPoints, ({ many }) => ({
  samples: many(samples),
}));

export const samplesRelations = relations(samples, ({ one, many }) => ({
  gridPoint: one(gridPoints, {
    fields: [samples.gridId],
    references: [gridPoints.id],
  }),
  predictions: many(predictions),
}));

export const modelsRelations = relations(models, ({ many }) => ({
  experiments: many(experiments),
  predictions: many(predictions),
}));

export const experimentsRelations = relations(experiments, ({ one }) => ({
  model: one(models, {
    fields: [experiments.modelId],
    references: [models.id],
  }),
  dataset: one(datasets, {
    fields: [experiments.datasetId],
    references: [datasets.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one, many }) => ({
  sample: one(samples, {
    fields: [predictions.sampleId],
    references: [samples.id],
  }),
  model: one(models, {
    fields: [predictions.modelId],
    references: [models.id],
  }),
  validationResults: many(validationResults),
}));

export const validationResultsRelations = relations(validationResults, ({ one }) => ({
  prediction: one(predictions, {
    fields: [validationResults.predictionId],
    references: [predictions.id],
  }),
  depthLevel: one(depthLevels, {
    fields: [validationResults.depthId],
    references: [depthLevels.id],
  }),
}));

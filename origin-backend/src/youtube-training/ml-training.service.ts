import { Injectable, Logger } from '@nestjs/common';
import { TrainingDataService, TrainingExample, VideoFeatures } from './training-data.service';
import { CacheService } from '../cache/cache.service';
import { RecommendationService } from '../recommendation/recommendation.service';

export interface MLModel {
  modelId: string;
  type: 'collaborative' | 'content_based' | 'hybrid';
  version: string;
  accuracy: number;
  trainingDate: Date;
  features: string[];
  weights: number[];
  biases: number[];
  hyperparameters: any;
}

export interface PredictionResult {
  videoId: string;
  predictedScore: number;
  confidence: number;
  factors: { [key: string]: number };
}

@Injectable()
export class MLTrainingService {
  private readonly logger = new Logger(MLTrainingService.name);
  private currentModels: Map<string, MLModel> = new Map();

  constructor(
    private trainingDataService: TrainingDataService,
    private cacheService: CacheService,
    private recommendationService: RecommendationService,
  ) {
    this.loadExistingModels();
  }

  async trainRecommendationModel(
    modelType: 'viral_prediction' | 'engagement_prediction' | 'retention_prediction' = 'viral_prediction',
    trainingSize = 10000
  ): Promise<MLModel> {
    this.logger.log(`Starting ${modelType} model training with ${trainingSize} examples`);

    // 1. Get training data
    const trainingData = await this.trainingDataService.getTrainingDataset(trainingSize);
    
    if (trainingData.length < 100) {
      throw new Error('Insufficient training data. Need at least 100 examples.');
    }

    // 2. Prepare features and labels
    const { features, labels } = this.prepareTrainingData(trainingData, modelType);

    // 3. Split data into training and validation sets
    const splitIndex = Math.floor(features.length * 0.8);
    const trainFeatures = features.slice(0, splitIndex);
    const trainLabels = labels.slice(0, splitIndex);
    const validFeatures = features.slice(splitIndex);
    const validLabels = labels.slice(splitIndex);

    // 4. Train the model (using simplified linear regression for demonstration)
    const model = await this.trainLinearRegression(trainFeatures, trainLabels, modelType);

    // 5. Validate the model
    const accuracy = await this.validateModel(model, validFeatures, validLabels);
    model.accuracy = accuracy;

    // 6. Save the model
    await this.saveModel(model);

    this.logger.log(`Model training completed. Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    
    return model;
  }

  private prepareTrainingData(
    trainingData: TrainingExample[],
    modelType: string
  ): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const example of trainingData) {
      // Extract numerical features
      const featureVector = this.extractFeatureVector(example.features);
      features.push(featureVector);

      // Extract target label based on model type
      let label: number;
      switch (modelType) {
        case 'viral_prediction':
          label = example.labels.viralScore;
          break;
        case 'engagement_prediction':
          label = example.labels.engagementScore;
          break;
        case 'retention_prediction':
          label = example.labels.retentionScore;
          break;
        default:
          label = example.labels.viralScore;
      }

      labels.push(label);
    }

    return { features, labels };
  }

  private extractFeatureVector(features: VideoFeatures): number[] {
    // Convert video features to numerical vector
    return [
      // Content features
      Math.log(features.titleLength + 1),
      Math.log(features.descriptionLength + 1),
      features.tagCount,
      
      // Engagement features
      Math.log(features.viewCount + 1),
      Math.log(features.likeCount + 1),
      Math.log(features.commentCount + 1),
      features.engagementRate,
      
      // Timing features
      features.durationMinutes,
      Math.sin(2 * Math.PI * features.publishHour / 24), // Cyclical hour encoding
      Math.cos(2 * Math.PI * features.publishHour / 24),
      Math.sin(2 * Math.PI * features.publishDayOfWeek / 7), // Cyclical day encoding
      Math.cos(2 * Math.PI * features.publishDayOfWeek / 7),
      
      // Sentiment features
      features.titleSentiment,
      features.descriptionSentiment,
      
      // Performance features
      Math.log(features.viewsPerHour + 1),
      
      // Category encoding (simplified - would use one-hot in production)
      parseInt(features.categoryId) || 0,
      
      // Tag popularity (average)
      features.tagsPopularity.length > 0 
        ? features.tagsPopularity.reduce((a, b) => a + b, 0) / features.tagsPopularity.length 
        : 0,
    ];
  }

  private async trainLinearRegression(
    features: number[][],
    labels: number[],
    modelType: string
  ): Promise<MLModel> {
    const featureCount = features[0].length;
    
    // Initialize weights and bias randomly
    let weights = Array(featureCount).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    let bias = 0;

    // Hyperparameters
    const learningRate = 0.01;
    const epochs = 1000;
    const regularization = 0.001;

    // Gradient descent training
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      const weightGradients = Array(featureCount).fill(0);
      let biasGradient = 0;

      // Forward pass and gradient computation
      for (let i = 0; i < features.length; i++) {
        const prediction = this.predict(features[i], weights, bias);
        const error = prediction - labels[i];
        
        totalLoss += error * error;

        // Compute gradients
        for (let j = 0; j < featureCount; j++) {
          weightGradients[j] += error * features[i][j];
        }
        biasGradient += error;
      }

      // Update weights and bias
      for (let j = 0; j < featureCount; j++) {
        weights[j] -= learningRate * (weightGradients[j] / features.length + regularization * weights[j]);
      }
      bias -= learningRate * (biasGradient / features.length);

      // Log progress every 100 epochs
      if (epoch % 100 === 0) {
        const avgLoss = totalLoss / features.length;
        this.logger.debug(`Epoch ${epoch}, Loss: ${avgLoss.toFixed(6)}`);
      }
    }

    return {
      modelId: `${modelType}_${Date.now()}`,
      type: 'content_based',
      version: '1.0',
      accuracy: 0, // Will be calculated during validation
      trainingDate: new Date(),
      features: this.getFeatureNames(),
      weights,
      biases: [bias],
      hyperparameters: {
        learningRate,
        epochs,
        regularization,
        modelType,
      },
    };
  }

  private predict(features: number[], weights: number[], bias: number): number {
    let result = bias;
    for (let i = 0; i < features.length; i++) {
      result += features[i] * weights[i];
    }
    // Apply sigmoid to constrain output between 0 and 1
    return 1 / (1 + Math.exp(-result));
  }

  private async validateModel(
    model: MLModel,
    validFeatures: number[][],
    validLabels: number[]
  ): Promise<number> {
    let correctPredictions = 0;
    let totalError = 0;

    for (let i = 0; i < validFeatures.length; i++) {
      const prediction = this.predict(validFeatures[i], model.weights, model.biases[0]);
      const actual = validLabels[i];
      
      // For binary classification (high/low performance)
      const predictedClass = prediction > 0.5 ? 1 : 0;
      const actualClass = actual > 0.5 ? 1 : 0;
      
      if (predictedClass === actualClass) {
        correctPredictions++;
      }

      totalError += Math.abs(prediction - actual);
    }

    const accuracy = correctPredictions / validFeatures.length;
    const mae = totalError / validFeatures.length;

    this.logger.log(`Model validation - Accuracy: ${(accuracy * 100).toFixed(2)}%, MAE: ${mae.toFixed(4)}`);
    
    return accuracy;
  }

  async predictVideoPerformance(features: VideoFeatures, modelType = 'viral_prediction'): Promise<PredictionResult> {
    const model = this.currentModels.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found. Please train the model first.`);
    }

    const featureVector = this.extractFeatureVector(features);
    const score = this.predict(featureVector, model.weights, model.biases[0]);
    
    // Calculate confidence based on feature similarity to training data
    const confidence = this.calculateConfidence(featureVector, model);

    // Identify important factors
    const factors = this.identifyFactors(featureVector, model.weights, model.features);

    return {
      videoId: features.videoId,
      predictedScore: score,
      confidence,
      factors,
    };
  }

  private calculateConfidence(features: number[], model: MLModel): number {
    // Simplified confidence calculation
    // In practice, you'd use techniques like prediction intervals
    let confidence = 0.7; // Base confidence
    
    // Adjust based on feature ranges (features within expected ranges get higher confidence)
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (feature < -5 || feature > 5) { // Features outside expected range
        confidence -= 0.1;
      }
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private identifyFactors(features: number[], weights: number[], featureNames: string[]): { [key: string]: number } {
    const factors: { [key: string]: number } = {};
    
    for (let i = 0; i < features.length; i++) {
      const contribution = features[i] * weights[i];
      factors[featureNames[i]] = contribution;
    }
    
    // Sort by absolute contribution
    const sortedFactors = Object.entries(factors)
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 5) // Top 5 factors
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as { [key: string]: number });

    return sortedFactors;
  }

  private getFeatureNames(): string[] {
    return [
      'log_title_length',
      'log_description_length', 
      'tag_count',
      'log_view_count',
      'log_like_count',
      'log_comment_count',
      'engagement_rate',
      'duration_minutes',
      'publish_hour_sin',
      'publish_hour_cos',
      'publish_day_sin',
      'publish_day_cos',
      'title_sentiment',
      'description_sentiment',
      'log_views_per_hour',
      'category_id',
      'avg_tag_popularity',
    ];
  }

  private async saveModel(model: MLModel): Promise<void> {
    try {
      // Save to cache for quick access
      const cacheKey = `ml_model:${model.modelId}`;
      await this.cacheService.set(cacheKey, model, 86400 * 7); // Cache for 1 week

      // Store in current models map
      this.currentModels.set(model.hyperparameters.modelType, model);

      // In production, you'd also save to database or file system
      this.logger.log(`Model ${model.modelId} saved successfully`);
    } catch (error) {
      this.logger.error('Error saving model:', error);
      throw error;
    }
  }

  private async loadExistingModels(): Promise<void> {
    // Load existing models from cache/database
    const modelTypes = ['viral_prediction', 'engagement_prediction', 'retention_prediction'];
    
    for (const modelType of modelTypes) {
      try {
        const cacheKey = `ml_model:latest:${modelType}`;
        const model = await this.cacheService.get<MLModel>(cacheKey);
        
        if (model) {
          this.currentModels.set(modelType, model);
          this.logger.log(`Loaded existing ${modelType} model (accuracy: ${(model.accuracy * 100).toFixed(2)}%)`);
        }
      } catch (error) {
        this.logger.warn(`Could not load ${modelType} model:`, error);
      }
    }
  }

  async getModelStats(): Promise<any> {
    const stats = {
      totalModels: this.currentModels.size,
      models: Array.from(this.currentModels.entries()).map(([type, model]) => ({
        type,
        modelId: model.modelId,
        accuracy: model.accuracy,
        trainingDate: model.trainingDate,
        version: model.version,
      })),
      trainingStats: await this.trainingDataService.getTrainingStats(),
    };

    return stats;
  }

  async retrainAllModels(): Promise<void> {
    this.logger.log('Starting retraining of all models');
    
    const modelTypes = ['viral_prediction', 'engagement_prediction', 'retention_prediction'];
    
    for (const modelType of modelTypes) {
      try {
        await this.trainRecommendationModel(modelType as any);
        this.logger.log(`Retrained ${modelType} model`);
      } catch (error) {
        this.logger.error(`Failed to retrain ${modelType} model:`, error);
      }
    }
    
    this.logger.log('Model retraining completed');
  }
}
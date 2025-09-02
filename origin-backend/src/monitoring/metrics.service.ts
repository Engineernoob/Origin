import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly videoViews: Counter<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly videoProcessingDuration: Histogram<string>;
  private readonly databaseConnections: Gauge<string>;
  private readonly cacheHitRatio: Gauge<string>;
  private readonly videoUploadSize: Histogram<string>;
  private readonly errorRate: Counter<string>;

  constructor() {
    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Video Metrics
    this.videoViews = new Counter({
      name: 'video_views_total',
      help: 'Total number of video views',
      labelNames: ['video_id', 'user_id'],
    });

    this.videoProcessingDuration = new Histogram({
      name: 'video_processing_duration_seconds',
      help: 'Duration of video processing in seconds',
      labelNames: ['quality'],
      buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600],
    });

    this.videoUploadSize = new Histogram({
      name: 'video_upload_size_bytes',
      help: 'Size of uploaded videos in bytes',
      buckets: [1e6, 10e6, 50e6, 100e6, 500e6, 1e9, 2e9, 5e9],
    });

    // System Metrics
    this.activeConnections = new Gauge({
      name: 'websocket_active_connections',
      help: 'Number of active WebSocket connections',
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
    });

    this.cacheHitRatio = new Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio percentage',
    });

    this.errorRate = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'service'],
    });

    // Register default metrics
    register.clear();
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.httpRequestTotal);
    register.registerMetric(this.videoViews);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.videoProcessingDuration);
    register.registerMetric(this.databaseConnections);
    register.registerMetric(this.cacheHitRatio);
    register.registerMetric(this.videoUploadSize);
    register.registerMetric(this.errorRate);
  }

  // HTTP Metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration / 1000);
    
    this.httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  // Video Metrics
  recordVideoView(videoId: string, userId?: string) {
    this.videoViews
      .labels(videoId, userId || 'anonymous')
      .inc();
  }

  recordVideoProcessing(quality: string, duration: number) {
    this.videoProcessingDuration
      .labels(quality)
      .observe(duration);
  }

  recordVideoUpload(sizeBytes: number) {
    this.videoUploadSize.observe(sizeBytes);
  }

  // System Metrics
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  setCacheHitRatio(ratio: number) {
    this.cacheHitRatio.set(ratio * 100);
  }

  recordError(type: string, service: string) {
    this.errorRate.labels(type, service).inc();
  }

  // Get metrics for Prometheus scraping
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Custom business metrics
  async recordCustomMetric(name: string, value: number, labels?: Record<string, string>) {
    // This would be used for custom business metrics
    // that don't fit into the standard categories
  }

  // Health check metrics
  recordHealthCheck(service: string, status: 'healthy' | 'unhealthy', responseTime: number) {
    const healthGauge = new Gauge({
      name: `health_check_${service}`,
      help: `Health status of ${service}`,
      labelNames: ['status'],
    });

    healthGauge.labels(status).set(status === 'healthy' ? 1 : 0);

    const responseTimeHistogram = new Histogram({
      name: `health_check_response_time_${service}`,
      help: `Response time for ${service} health check`,
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    responseTimeHistogram.observe(responseTime / 1000);
  }
}
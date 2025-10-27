import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from './metrics.service';
import { Video } from '../videos/videos.entity';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    elasticsearch?: ServiceHealth;
    videoProcessing: ServiceHealth;
    storage: ServiceHealth;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastChecked: string;
  details?: any;
}

@Controller('health')
export class HealthController {
  private startTime = Date.now();

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private cacheService: CacheService,
    private metricsService: MetricsService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkVideoProcessing(),
      this.checkStorage(),
    ]);

    const services = {
      database:
        checks[0].status === 'fulfilled'
          ? checks[0].value
          : this.createFailedHealth('Database check failed'),
      redis:
        checks[1].status === 'fulfilled'
          ? checks[1].value
          : this.createFailedHealth('Redis check failed'),
      videoProcessing:
        checks[2].status === 'fulfilled'
          ? checks[2].value
          : this.createFailedHealth('Video processing check failed'),
      storage:
        checks[3].status === 'fulfilled'
          ? checks[3].value
          : this.createFailedHealth('Storage check failed'),
    };

    const overallStatus = this.determineOverallStatus(Object.values(services));

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeConnections: 0, // Would be set by WebSocket gateway
      },
    };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: string }> {
    // Readiness check - is the application ready to serve traffic?
    try {
      await this.checkDatabase();
      await this.checkRedis();
      return { status: 'ready' };
    } catch (error) {
      return { status: 'not ready' };
    }
  }

  @Get('live')
  async getLiveness(): Promise<{ status: string; uptime: number }> {
    // Liveness check - is the application alive?
    return {
      status: 'alive',
      uptime: Date.now() - this.startTime,
    };
  }

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.videoRepository.query('SELECT 1');
      const responseTime = Date.now() - start;

      this.metricsService.recordHealthCheck(
        'database',
        'healthy',
        responseTime,
      );

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          query: 'SELECT 1',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.metricsService.recordHealthCheck(
        'database',
        'unhealthy',
        responseTime,
      );

      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const testKey = 'health_check';
      const testValue = Date.now().toString();

      await this.cacheService.set(testKey, testValue, 10);
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);

      if (retrieved !== testValue) {
        throw new Error('Redis value mismatch');
      }

      const responseTime = Date.now() - start;
      this.metricsService.recordHealthCheck('redis', 'healthy', responseTime);

      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          operation: 'set/get/del',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.metricsService.recordHealthCheck('redis', 'unhealthy', responseTime);

      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkVideoProcessing(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Check if video processing queue is accessible
      // This would check Bull queue health
      // const queueHealth = await this.videoProcessingService.getQueueHealth();

      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          queueSize: 0, // Would get actual queue size
          workers: 1, // Would get actual worker count
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;

      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  private async checkStorage(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      const testFile = path.join(uploadPath, 'health_check.txt');
      const testContent = Date.now().toString();

      await fs.writeFile(testFile, testContent);
      const readContent = await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile);

      if (readContent !== testContent) {
        throw new Error('Storage content mismatch');
      }

      const responseTime = Date.now() - start;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          path: uploadPath,
          operation: 'write/read/delete',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - start;

      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  private createFailedHealth(message: string): ServiceHealth {
    return {
      status: 'unhealthy',
      responseTime: -1,
      lastChecked: new Date().toISOString(),
      details: { error: message },
    };
  }

  private determineOverallStatus(
    services: ServiceHealth[],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    if (services.every((service) => service.status === 'healthy')) {
      return 'healthy';
    }

    if (services.some((service) => service.status === 'unhealthy')) {
      return 'unhealthy';
    }

    return 'degraded';
  }
}

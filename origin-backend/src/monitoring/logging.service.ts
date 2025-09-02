import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, Logger, format, transports } from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: Logger;

  constructor(private configService: ConfigService) {
    this.logger = createLogger({
      level: this.configService.get('LOG_LEVEL', 'info'),
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.colorize({ all: true })
      ),
      defaultMeta: {
        service: 'origin-backend',
        environment: this.configService.get('NODE_ENV', 'development'),
        version: process.env.npm_package_version,
      },
      transports: [
        // Console transport
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          ),
        }),
        
        // File transport for errors
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: format.json(),
        }),
        
        // File transport for all logs
        new transports.File({
          filename: 'logs/combined.log',
          format: format.json(),
        }),
      ],
    });

    // Add remote logging in production
    if (this.configService.get('NODE_ENV') === 'production') {
      // Add external log services like DataDog, Splunk, etc.
      // this.logger.add(new DatadogTransport({...}));
    }
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom methods for structured logging
  logApiRequest(req: any, res: any, responseTime: number) {
    this.logger.info('API Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  logVideoEvent(event: string, videoId: number, userId?: number, metadata?: any) {
    this.logger.info('Video Event', {
      event,
      videoId,
      userId,
      metadata,
    });
  }

  logSecurityEvent(event: string, details: any) {
    this.logger.warn('Security Event', {
      event,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  logPerformanceMetric(metric: string, value: number, tags?: any) {
    this.logger.info('Performance Metric', {
      metric,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }
}
import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger as PinoInstance } from 'pino';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: PinoInstance;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          '*.password',
          '*.temporary_password',
          '*.token',
          '*.secret',
          '*.SUPABASE_SERVICE_ROLE_KEY',
          '*.DATABASE_URL',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  log(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.info({ context, ...message });
    } else {
      this.logger.info({ context }, String(message));
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof message === 'object') {
      this.logger.error({ context, trace, ...message });
    } else {
      this.logger.error({ context, trace }, String(message));
    }
  }

  warn(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.warn({ context, ...message });
    } else {
      this.logger.warn({ context }, String(message));
    }
  }

  debug(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.debug({ context, ...message });
    } else {
      this.logger.debug({ context }, String(message));
    }
  }

  verbose(message: any, context?: string) {
    this.debug(message, context);
  }

  getPino(): PinoInstance {
    return this.logger;
  }
}

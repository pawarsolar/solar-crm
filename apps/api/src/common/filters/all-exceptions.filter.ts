import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PinoLoggerService } from '../logger/pino-logger.service';

let pinoLoggerInstance: PinoLoggerService | null = null;
try {
  pinoLoggerInstance = new PinoLoggerService();
} catch {
  // Graceful fallback to Nest Logger
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly fallbackLogger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: any = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as any;
      message = respObj.message || message;
      errors = respObj.errors || null;
      // Handle class-validator error array formatting
      if (Array.isArray(message)) {
        errors = message;
        message = 'Input validation failed. Please check your submission.';
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      // In production, do not leak raw stack traces or internal database driver details
      message =
        process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected server error occurred. Our team has been notified.'
          : exception.message;
    }

    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    const stack = exception instanceof Error ? exception.stack : undefined;
    const clientIp = request.headers['x-forwarded-for'] || request.ip || 'unknown';

    // Structured Error Logging
    const structuredLog = {
      errorId,
      method: request.method,
      url: request.url,
      ip: clientIp,
      statusCode: status,
      message,
      stack,
      user: (request as any).user ? { id: (request as any).user.id, role: (request as any).user.role } : undefined,
    };

    if (pinoLoggerInstance) {
      pinoLoggerInstance.error(structuredLog, stack, AllExceptionsFilter.name);
    } else {
      this.fallbackLogger.error(
        `[${errorId}] [${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(message)}`,
        stack,
      );
    }

    response.status(status).json({
      statusCode: status,
      errorId,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}

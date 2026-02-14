import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_MESSAGES } from '../constants';

type ErrorResponseBody = {
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
  };
};

type ParsedHttpError = {
  code: string;
  message: string | string[];
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const parsed = this.parseHttpException(exception);

      response.status(status).json({
        error: {
          code: parsed.code,
          message: parsed.message,
          ...(parsed.details !== undefined ? { details: parsed.details } : {}),
        },
      } satisfies ErrorResponseBody);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.INTERNAL.SERVER_ERROR,
        details: {
          path: request.url,
        },
      },
    } satisfies ErrorResponseBody);
  }

  private parseHttpException(exception: HttpException): ParsedHttpError {
    const response = exception.getResponse();
    const status = exception.getStatus();

    if (typeof response === 'string') {
      return {
        code: this.defaultCode(status),
        message: response,
      };
    }

    if (this.isRecord(response)) {
      const message = this.extractMessage(response);
      const code = this.extractCode(response, status);

      return {
        code,
        message,
        details: this.extractDetails(response),
      };
    }

    return {
      code: this.defaultCode(status),
      message: ERROR_MESSAGES.INTERNAL.SERVER_ERROR,
    };
  }

  private extractMessage(response: Record<string, unknown>): string | string[] {
    const message = response.message;

    if (typeof message === 'string') {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message;
    }

    return ERROR_MESSAGES.INTERNAL.SERVER_ERROR;
  }

  private extractCode(
    response: Record<string, unknown>,
    status: number,
  ): string {
    const code = response.code;
    if (typeof code === 'string' && code.length > 0) {
      return code;
    }

    return this.defaultCode(status);
  }

  private extractDetails(response: Record<string, unknown>): unknown {
    const details = response.details;
    if (details !== undefined) {
      return details;
    }

    if ('statusCode' in response || 'error' in response) {
      return response;
    }

    return undefined;
  }

  private defaultCode(status: number): string {
    if (status === 400) {
      return 'BAD_REQUEST';
    }
    if (status === 401) {
      return 'UNAUTHORIZED';
    }
    if (status === 403) {
      return 'FORBIDDEN';
    }
    if (status === 404) {
      return 'NOT_FOUND';
    }
    if (status === 409) {
      return 'CONFLICT';
    }
    if (status >= 500) {
      return 'INTERNAL_SERVER_ERROR';
    }

    return `HTTP_${status}`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

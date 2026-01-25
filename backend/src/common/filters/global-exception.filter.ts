import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode, ErrorMessage } from '../constants/error-code';
import { ErrorResponse } from '../interfaces/error-response.interface';

/**
 * 全局异常过滤器
 * 统一处理所有异常，返回标准化的错误响应
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_SERVER_ERROR';
        let message = 'Internal server error';
        let details: any = undefined;

        if (exception instanceof BusinessException) {
            // 业务异常
            status = exception.getStatus();
            const errorCode = exception.getErrorCode();
            code = ErrorCode[errorCode]; // 转换为字符串
            message = exception.message || ErrorMessage[errorCode];
        } else if (exception instanceof HttpException) {
            // HTTP 异常
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse as any;
                message = Array.isArray(responseObj.message)
                    ? responseObj.message.join(', ')
                    : responseObj.message || exception.message;
                code = this.getHttpErrorCode(status);
            } else {
                message = exceptionResponse as string || exception.message;
                code = this.getHttpErrorCode(status);
            }
        } else if (exception instanceof Error) {
            // 普通错误
            message = exception.message;
            code = 'INTERNAL_SERVER_ERROR';
            this.logger.error(`未处理的错误: ${exception.message}`, exception.stack);

            // 开发环境返回详细错误信息
            if (process.env.NODE_ENV === 'development') {
                details = {
                    stack: exception.stack,
                    name: exception.name,
                };
            }
        } else {
            // 未知异常
            this.logger.error('未知异常', JSON.stringify(exception));
            code = 'UNKNOWN_ERROR';
            message = '未知错误';

            if (process.env.NODE_ENV === 'development') {
                details = exception;
            }
        }

        // 构建符合 ErrorResponse 接口的响应
        const errorResponse: ErrorResponse = {
            success: false,
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                path: request.url,
                ...(details && { details }),
            },
        };

        response.status(status).json(errorResponse);
    }

    /**
     * 根据 HTTP 状态码获取错误代码
     */
    private getHttpErrorCode(status: number): string {
        const codeMap: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            500: 'INTERNAL_SERVER_ERROR',
        };
        return codeMap[status] || 'UNKNOWN_ERROR';
    }
}

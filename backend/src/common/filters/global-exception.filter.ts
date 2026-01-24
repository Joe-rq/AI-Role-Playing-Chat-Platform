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
import { ErrorCode } from '../constants/error-code';

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
        let code = ErrorCode.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof BusinessException) {
            // 业务异常
            status = exception.getStatus();
            code = exception.getErrorCode();
            message = exception.message;
        } else if (exception instanceof HttpException) {
            // HTTP 异常
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message || exception.message;
        } else if (exception instanceof Error) {
            // 普通错误
            message = exception.message;
            this.logger.error(`未处理的错误: ${exception.message}`, exception.stack);
        } else {
            // 未知异常
            this.logger.error('未知异常', JSON.stringify(exception));
        }

        response.status(status).json({
            success: false,
            code,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}

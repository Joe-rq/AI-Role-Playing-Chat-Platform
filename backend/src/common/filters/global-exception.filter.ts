import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
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
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let code: number;
        let message: string;
        let details: any;

        if (exception instanceof BusinessException) {
            // 业务异常
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse() as any;
            code = exceptionResponse.code;
            message = exceptionResponse.message;
            details = exceptionResponse.details;
        } else if (exception instanceof HttpException) {
            // HTTP 异常（如 NotFoundException、BadRequestException）
            status = exception.getStatus();
            code = status;
            const exceptionResponse = exception.getResponse();
            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : (exceptionResponse as any).message || '请求失败';
        } else {
            // 未知异常
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            code = ErrorCode.INTERNAL_SERVER_ERROR;
            message = '服务器内部错误';
            details = process.env.NODE_ENV === 'development' ? String(exception) : undefined;

            // 生产环境记录完整错误日志
            console.error('[全局异常]', exception);
        }

        // 统一响应格式
        const errorResponse = {
            statusCode: status,
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        // 移除 undefined 字段
        Object.keys(errorResponse).forEach(
            key => (errorResponse as any)[key] === undefined && delete (errorResponse as any)[key]
        );

        response.status(status).json(errorResponse);
    }
}

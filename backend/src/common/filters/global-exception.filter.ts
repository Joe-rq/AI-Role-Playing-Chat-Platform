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
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

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

            // 记录完整错误日志
            console.error('[全局异常]', exception);
        }

        // 统一响应格式
        const errorResponse: any = {
            statusCode: status,
            code,
            message,
            timestamp: new Date().toISOString(),
            path: req.url,
        };

        // 仅在有 details 时添加
        if (details !== undefined) {
            errorResponse.details = details;
        }

        res.status(status).json(errorResponse);
    }
}

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '../constants/error-code';

/**
 * 业务异常类
 * 继承自 HttpException，用于业务逻辑中抛出自定义错误
 */
export class BusinessException extends HttpException {
    constructor(
        private readonly errorCode: ErrorCode,
        message?: string,
        private readonly details?: any,
    ) {
        // 使用错误码对应的 HTTP 状态码
        const httpStatus = BusinessException.getHttpStatus(errorCode);

        // 使用自定义消息或默认消息
        const finalMessage = message || ErrorMessage[errorCode];

        super(
            {
                code: errorCode,
                message: finalMessage,
                details,
            },
            httpStatus,
        );
    }

    /**
     * 根据业务错误码映射到 HTTP 状态码
     */
    private static getHttpStatus(code: ErrorCode): HttpStatus {
        if (code >= 5000) return HttpStatus.INTERNAL_SERVER_ERROR;
        if (code >= 4000) return HttpStatus.BAD_REQUEST;
        if (code >= 400 && code < 500) return code as unknown as HttpStatus;
        if (code >= 500 && code < 600) return code as unknown as HttpStatus;
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    getErrorCode(): ErrorCode {
        return this.errorCode;
    }

    getDetails(): any {
        return this.details;
    }
}

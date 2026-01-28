/**
 * 统一错误响应接口
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string; // 错误代码，如 "INVALID_INPUT"
    message: string; // 用户友好的错误信息
    details?: any; // 详细错误信息（仅开发环境）
    timestamp: string; // 错误发生时间
    path: string; // 请求路径
  };
}

/**
 * 统一成功响应接口
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp?: string;
}

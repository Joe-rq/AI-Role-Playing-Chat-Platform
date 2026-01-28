/**
 * 业务错误码枚举
 * 采用 HTTP 状态码 + 业务子码的方式
 */
export enum ErrorCode {
  // ========== 2xx 成功 ==========
  SUCCESS = 200,

  // ========== 4xx 客户端错误 ==========
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,

  // 业务错误码（4xxx）
  CHARACTER_NOT_FOUND = 4001,
  SESSION_NOT_FOUND = 4002,
  CHARACTER_HAS_SESSIONS = 4003, // 角色有对话记录，不能删除
  INVALID_INPUT = 4004,
  MODEL_NOT_FOUND = 4005,
  MODEL_DISABLED = 4006,

  // ========== 5xx 服务器错误 ==========
  INTERNAL_SERVER_ERROR = 500,
  LLM_API_ERROR = 5001, // LLM API 调用失败
  DATABASE_ERROR = 5002,
  FILE_UPLOAD_ERROR = 5003,
}

/**
 * 错误码对应的默认消息
 */
export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',

  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',

  [ErrorCode.CHARACTER_NOT_FOUND]: '角色不存在',
  [ErrorCode.SESSION_NOT_FOUND]: '会话不存在',
  [ErrorCode.CHARACTER_HAS_SESSIONS]: '该角色已有对话记录，无法删除',
  [ErrorCode.INVALID_INPUT]: '输入数据无效',
  [ErrorCode.MODEL_NOT_FOUND]: '模型不存在',
  [ErrorCode.MODEL_DISABLED]: '模型已被禁用',

  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorCode.LLM_API_ERROR]: 'AI 服务调用失败',
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
};

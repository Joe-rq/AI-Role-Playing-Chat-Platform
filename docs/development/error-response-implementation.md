# 统一错误响应格式 - 实施完成

## 概述
已完成统一错误响应结构的实施，所有 API 错误现在返回标准化的格式。

## 错误响应格式

### 标准格式
```json
{
  "success": false,
  "error": {
    "code": "CHARACTER_NOT_FOUND",
    "message": "角色不存在",
    "timestamp": "2026-01-25T13:42:00.000Z",
    "path": "/characters/999",
    "details": {  // 仅在开发环境返回
      "stack": "Error: ...",
      "name": "NotFoundException"
    }
  }
}
```

### 字段说明
- `success`: 固定为 `false`
- `error.code`: 错误代码（字符串），如 `CHARACTER_NOT_FOUND`、`INVALID_INPUT`
- `error.message`: 用户友好的错误信息
- `error.timestamp`: 错误发生时间（ISO 8601 格式）
- `error.path`: 请求路径
- `error.details`: 详细错误信息（**仅在开发环境返回**）

## 错误代码列表

### 4xx 客户端错误
| 代码 | HTTP 状态 | 说明 |
|------|----------|------|
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 禁止访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CHARACTER_NOT_FOUND` | 404 | 角色不存在 |
| `SESSION_NOT_FOUND` | 404 | 会话不存在 |
| `MODEL_NOT_FOUND` | 404 | 模型不存在 |
| `CHARACTER_HAS_SESSIONS` | 400 | 角色有对话记录，无法删除 |
| `INVALID_INPUT` | 400 | 输入数据无效 |
| `MODEL_DISABLED` | 400 | 模型已被禁用 |

### 5xx 服务器错误
| 代码 | HTTP 状态 | 说明 |
|------|----------|------|
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |
| `LLM_API_ERROR` | 500 | AI 服务调用失败 |
| `DATABASE_ERROR` | 500 | 数据库操作失败 |
| `FILE_UPLOAD_ERROR` | 500 | 文件上传失败 |

## 示例

### 示例 1：角色不存在
**请求：**
```bash
GET /characters/999
```

**响应：**
```json
{
  "success": false,
  "error": {
    "code": "CHARACTER_NOT_FOUND",
    "message": "角色不存在",
    "timestamp": "2026-01-25T13:42:00.000Z",
    "path": "/characters/999"
  }
}
```

### 示例 2：参数验证失败
**请求：**
```bash
POST /characters
Content-Type: application/json

{
  "name": ""  // 空名称
}
```

**响应：**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "name should not be empty",
    "timestamp": "2026-01-25T13:42:00.000Z",
    "path": "/characters"
  }
}
```

### 示例 3：模型已禁用
**请求：**
```bash
POST /chat/stream
Content-Type: application/json

{
  "characterId": 1,
  "message": "Hello",
  "modelId": "disabled-model"
}
```

**响应：**
```json
{
  "success": false,
  "error": {
    "code": "MODEL_DISABLED",
    "message": "模型已被禁用",
    "timestamp": "2026-01-25T13:42:00.000Z",
    "path": "/chat/stream"
  }
}
```

## 前端处理建议

### 通用错误处理
```javascript
// services/api.js
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json();

    // 统一错误格式
    if (errorData.success === false && errorData.error) {
      const { code, message } = errorData.error;

      // 根据错误代码进行特殊处理
      switch (code) {
        case 'UNAUTHORIZED':
          // 跳转到登录页
          router.push('/login');
          break;
        case 'CHARACTER_NOT_FOUND':
          // 显示友好提示
          toast.error('角色不存在，可能已被删除');
          break;
        default:
          // 显示通用错误信息
          toast.error(message);
      }

      throw new Error(message);
    }
  }

  return response.json();
}
```

### Toast 显示
```javascript
// composables/useToast.js
export function useToast() {
  function error(message, duration = 3000) {
    // 显示错误提示
    showToast({
      type: 'error',
      message,
      duration,
    });
  }

  return { error, success, info };
}
```

## 开发环境 vs 生产环境

### 开发环境
- 返回 `details` 字段，包含详细的错误堆栈和调试信息
- 便于开发调试

### 生产环境
- **不返回** `details` 字段
- 保护敏感信息，避免泄露服务器内部细节

## 后续优化

### 1. 国际化支持
```typescript
// 根据请求头 Accept-Language 返回不同语言的错误信息
const lang = request.headers['accept-language'] || 'zh-CN';
const message = getErrorMessage(code, lang);
```

### 2. 错误追踪
```typescript
// 添加唯一的错误 ID，便于日志追踪
const errorResponse: ErrorResponse = {
  success: false,
  error: {
    code,
    message,
    errorId: generateUUID(),  // 唯一错误 ID
    timestamp: new Date().toISOString(),
    path: request.url,
  },
};
```

### 3. 错误统计
- 收集错误频率
- 分析常见错误类型
- 优化用户体验

## 测试

### 手动测试
1. 访问不存在的角色：`GET /characters/999`
2. 提交无效数据：`POST /characters` with empty name
3. 调用已禁用的模型：`POST /chat/stream` with disabled model

### 自动化测试
```typescript
// test/error-response.e2e-spec.ts
describe('Error Response Format', () => {
  it('should return standard error format for 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/characters/999')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        path: '/characters/999',
      },
    });
  });
});
```

## 完成状态

✅ 创建错误响应接口
✅ 更新全局异常过滤器
✅ 添加新的错误代码
✅ 编译测试通过
✅ 文档编写完成

## 下一步

继续实施第一阶段的其他功能：
1. ✅ 统一错误响应结构（已完成）
2. ⏭️ 聊天界面动态切换模型
3. ⏭️ 用户登录与认证系统

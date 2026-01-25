# 环境变量模型导入工具

## 功能说明

这个脚本可以将 `.env` 文件中的模型配置自动导入到数据库中，方便快速迁移和初始化。

## 使用方法

### 1. 确保 .env 文件包含以下配置

```bash
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### 2. 运行导入命令

```bash
cd backend
npm run build
node dist/import-env-model.js
```

或者使用快捷命令（需要先编译）：

```bash
npm run import-env-model
```

### 3. 查看导入结果

导入成功后，你会看到类似的输出：

```
🚀 开始从环境变量导入模型配置...

📋 读取到的环境变量配置：
  API Key: sk-c8cc6ce...
  Base URL: https://api.deepseek.com/v1
  Model ID: deepseek-chat

✅ 模型配置导入成功！

📊 导入的模型信息：
  ID: 1
  名称: DeepSeek Chat
  模型 ID: deepseek-chat
  厂商: deepseek
  Base URL: https://api.deepseek.com/v1
  状态: 已启用

💡 提示：
  1. 现在可以在模型管理页面查看和编辑该模型
  2. 可以在角色配置中选择该模型作为默认模型
  3. 建议在模型管理页面测试连接是否正常
```

## 支持的厂商自动识别

脚本会根据 Base URL 自动识别厂商：

| Base URL 包含 | 识别为厂商 | 默认名称 |
|--------------|----------|---------|
| `deepseek` | deepseek | DeepSeek Chat |
| `bigmodel.cn` | zhipu | GLM-4.7-Flash |
| `modelscope` | zhipu | GLM-4.7-Flash (ModelScope) |
| `anthropic` | anthropic | Claude |
| `google` | google | Gemini |
| 其他 | openai | (使用 modelId) |

## 注意事项

### 1. 重复导入检查

如果模型已存在于数据库中，脚本会提示：

```
⚠️  模型 "deepseek-chat" 已存在于数据库中
如需更新，请先在模型管理页面删除该模型
```

### 2. API Key 加密

导入时，API Key 会自动加密存储，确保安全性。

### 3. 配置不完整

如果 .env 文件缺少必要配置，脚本会报错：

```
❌ 环境变量配置不完整！
请确保 .env 文件中包含以下配置：
  - OPENAI_API_KEY
  - OPENAI_BASE_URL
  - OPENAI_MODEL
```

## 数据存储位置

### 数据库文件
```
backend/database.sqlite
```

### 表结构
```sql
CREATE TABLE "models" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" varchar(100) NOT NULL,
  "modelId" varchar(100) NOT NULL,
  "provider" varchar(50) NOT NULL,
  "apiKey" text NOT NULL,  -- 加密存储
  "baseURL" text NOT NULL,
  "isEnabled" boolean NOT NULL DEFAULT (1),
  "defaultTemperature" float DEFAULT (0.7),
  "defaultMaxTokens" integer DEFAULT (2000),
  "description" text,
  "sortOrder" integer NOT NULL DEFAULT (0),
  "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
  "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
);
```

### 查看数据

使用 SQLite 命令行工具：

```bash
cd backend
sqlite3 database.sqlite

# 查看所有模型
SELECT id, name, modelId, provider, isEnabled FROM models;

# 查看详细信息
SELECT * FROM models WHERE id = 1;

# 退出
.quit
```

## 导入后的操作

### 1. 在模型管理页面查看

访问：`http://localhost:5173/models`

你会看到刚导入的模型，可以：
- 查看模型详情
- 测试连接
- 编辑配置
- 启用/禁用
- 删除模型

### 2. 在角色配置中使用

创建或编辑角色时，可以在"首选模型"下拉框中选择导入的模型。

### 3. 测试连接

在模型管理页面，点击"测试连接"按钮，验证配置是否正确。

## 常见问题

### Q: 导入后还能使用环境变量吗？

A: 可以。系统有 Fallback 机制：
1. 优先使用数据库中的模型配置
2. 如果数据库中没有，则使用环境变量

### Q: 如何更新已导入的模型？

A: 两种方式：
1. 在模型管理页面直接编辑
2. 删除数据库中的模型，重新运行导入脚本

### Q: 可以导入多个模型吗？

A: 当前脚本只导入 .env 中的一个模型。如需导入多个模型，请：
1. 在模型管理页面手动添加
2. 或修改脚本支持多个环境变量

### Q: API Key 安全吗？

A: 是的。API Key 使用 AES-256-CBC 加密存储在数据库中，只有在调用 API 时才会解密。

## 相关文件

- 导入脚本：`src/import-env-model.ts`
- 模型服务：`src/models/models.service.ts`
- 加密工具：`src/models/encryption.util.ts`
- 模型实体：`src/models/entities/model.entity.ts`

## 下一步

✅ 模型已导入到数据库
⏭️ 在模型管理页面测试连接
⏭️ 在角色配置中选择该模型
⏭️ 开始使用！

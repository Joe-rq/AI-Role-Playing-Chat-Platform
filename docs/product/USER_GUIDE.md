# 多模型管理系统 - 快速使用指南

## 🚀 系统状态

### 服务运行
- ✅ 后端服务：http://localhost:3000
- ✅ 前端服务：http://localhost:5173
- ✅ 数据库：SQLite (database.sqlite)

### 已配置模型
| 模型名称 | Model ID | 厂商 | 状态 | API Key状态 |
|---------|----------|------|------|------------|
| DeepSeek Chat | deepseek-chat | DeepSeek | ✅ 已启用 | ⚠️ 需配置 |
| GPT-4o Mini | gpt-4o-mini | OpenAI | ✅ 已启用 | ⚠️ 需配置 |
| Claude Sonnet 4.5 | claude-sonnet-4-5-20250929 | Anthropic | ❌ 已禁用 | ⚠️ 需配置 |

## 📖 功能使用指南

### 1. 访问模型管理页面

**方式一：从首页进入**
1. 打开 http://localhost:5173
2. 点击页面右上角的 **"⚙️ 模型管理"** 按钮

**方式二：直接访问**
- 直接打开 http://localhost:5173/models

### 2. 查看模型列表

模型管理页面会显示所有已配置的模型，每个模型卡片包含：
- 📝 **显示名称**：如"DeepSeek Chat - 高性价比"
- 🏷️ **厂商标签**：如"DeepSeek"
- 🔑 **API Key**：脱敏显示（如：sk-c***351a）
- 🌐 **Base URL**：API端点地址
- 📊 **参数**：Temperature、Max Tokens
- 🎚️ **状态徽章**：已启用/已禁用
- 🔧 **操作按钮**：编辑、删除、启用/禁用

### 3. 添加新模型

#### 步骤：
1. 点击右上角 **"➕ 添加模型"** 按钮
2. 填写表单：

**必填字段：**
- **显示名称**：给模型起个易识别的名字
  - 示例：`GPT-4 Turbo - 高性能`
- **厂商**：从下拉框选择
  - 选项：OpenAI、Anthropic、Google、Alibaba、DeepSeek、Zhipu AI
- **模型ID**：实际调用API时使用的标识符
  - 示例：`gpt-4-turbo`、`claude-3-opus`
- **API Key**：从AI厂商获取的密钥
  - 示例：`sk-proj-xxxxxxxxxxxxx`
  - 💡 点击眼睛图标可显示/隐藏
- **Base URL**：API端点地址
  - OpenAI：`https://api.openai.com/v1`
  - DeepSeek：`https://api.deepseek.com/v1`
  - Anthropic：`https://api.anthropic.com/v1`

**可选字段：**
- **描述**：模型的特点和适用场景
- **默认Temperature**：0-2之间，控制随机性（默认0.7）
- **默认Max Tokens**：最大生成长度（默认2000）
- **启用此模型**：勾选后模型可在角色编辑时选择

3. 点击 **"保存"** 按钮

#### 示例配置：

**配置OpenAI GPT-4**
```
显示名称：GPT-4 Turbo - 高性能
厂商：OpenAI
模型ID：gpt-4-turbo
API Key：sk-proj-your-api-key-here
Base URL：https://api.openai.com/v1
描述：OpenAI最强大的模型，适合复杂任务
Temperature：0.7
Max Tokens：4000
✅ 启用此模型
```

**配置Anthropic Claude**
```
显示名称：Claude 3 Opus - 最强推理
厂商：Anthropic
模型ID：claude-3-opus-20240229
API Key：sk-ant-your-api-key-here
Base URL：https://api.anthropic.com/v1
描述：Anthropic最强模型，擅长复杂推理
Temperature：0.7
Max Tokens：4000
✅ 启用此模型
```

### 4. 编辑模型配置

1. 找到要编辑的模型卡片
2. 点击 **"编辑"** 按钮
3. 修改需要更新的字段
   - 💡 **API Key留空则不更新**（保持原值）
4. 点击 **"保存"** 按钮

**常见编辑场景：**
- 更新API Key（旧Key过期）
- 调整默认参数（Temperature、Max Tokens）
- 修改描述信息
- 更改Base URL（切换到代理服务）

### 5. 启用/禁用模型

**快速切换：**
- 点击模型卡片的 **"启用/禁用"** 按钮
- 状态会立即更新

**效果：**
- ✅ **已启用**：模型会出现在角色编辑的下拉框中
- ❌ **已禁用**：模型不会出现在角色选择中，现有使用该模型的角色会fallback到环境变量配置

**使用场景：**
- 临时禁用某个模型（如API额度用完）
- 测试新模型前先禁用
- 控制团队成员可用的模型

### 6. 删除模型

1. 点击模型卡片的 **"删除"** 按钮
2. 在确认对话框中点击 **"确认"**
3. 模型配置将永久删除

⚠️ **注意事项：**
- 删除操作不可恢复
- 如果有角色正在使用该模型，删除后角色会fallback到环境变量配置
- 建议先禁用模型测试影响，确认无问题后再删除

### 7. 在角色中使用模型

#### 创建新角色时选择模型：
1. 在首页点击 **"+ 创建角色"**
2. 填写角色信息
3. 在 **"首选模型"** 下拉框中选择已启用的模型
   - 选项会显示所有已启用的模型
   - 选择"使用默认模型"则使用环境变量配置
4. 保存角色

#### 编辑现有角色的模型：
1. 在角色卡片上点击 **"编辑"** 按钮（铅笔图标）
2. 在 **"首选模型"** 下拉框中选择新模型
3. 点击 **"保存"** 按钮

#### 对话时的模型使用：
- 系统会自动使用角色配置的模型
- 如果模型被禁用或不存在，会fallback到环境变量配置
- 每次对话都会使用最新的模型配置（5分钟缓存）

## 🔧 常见问题解决

### Q1: 对话时报错 "Model Not Exist"
**原因**：角色配置的模型不存在或已被禁用

**解决方案：**
1. 进入模型管理页面
2. 检查该模型是否存在且已启用
3. 如果模型已禁用，点击"启用"按钮
4. 或者编辑角色，选择其他已启用的模型

### Q2: 角色编辑后无法保存
**原因**：后端DTO验证失败（已修复）

**解决方案：**
- 确保后端服务已重启（应用最新的DTO修改）
- 检查浏览器控制台是否有错误信息
- 尝试刷新页面后重新编辑

### Q3: 模型列表为空
**原因**：数据库中没有模型配置

**解决方案：**
```bash
cd backend
npx ts-node src/seed-models.ts
```

### Q4: API Key显示为 "your***here"
**原因**：使用的是初始化脚本中的假API Key

**解决方案：**
1. 进入模型管理页面
2. 点击该模型的"编辑"按钮
3. 输入真实的API Key
4. 保存

### Q5: 对话响应很慢
**可能原因：**
- API Key无效或网络问题
- 模型服务器响应慢
- Base URL配置错误

**排查步骤：**
1. 检查API Key是否有效
2. 测试Base URL是否可访问
3. 查看后端日志（/tmp/backend.log）
4. 尝试切换到其他模型

## 📊 API接口文档

### 模型管理API

#### 获取所有模型
```bash
GET /models
```
响应：返回所有模型配置（API Key已脱敏）

#### 获取已启用的模型
```bash
GET /models/enabled
```
响应：返回已启用的模型列表

#### 获取单个模型
```bash
GET /models/:id
```

#### 创建模型
```bash
POST /models
Content-Type: application/json

{
  "name": "GPT-4 Turbo",
  "modelId": "gpt-4-turbo",
  "provider": "openai",
  "apiKey": "sk-proj-xxxxx",
  "baseURL": "https://api.openai.com/v1",
  "isEnabled": true,
  "defaultTemperature": 0.7,
  "defaultMaxTokens": 4000,
  "description": "高性能模型"
}
```

#### 更新模型
```bash
PUT /models/:id
Content-Type: application/json

{
  "isEnabled": false
}
```

#### 删除模型
```bash
DELETE /models/:id
```

## 🎯 最佳实践

### 1. API Key管理
- ✅ 定期轮换API Key
- ✅ 为不同环境使用不同的Key
- ✅ 监控API使用量和成本
- ❌ 不要在日志中打印API Key
- ❌ 不要将.env文件提交到代码库

### 2. 模型选择
- **日常对话**：DeepSeek Chat（性价比高）
- **复杂推理**：Claude 3 Opus、GPT-4
- **快速响应**：GPT-3.5 Turbo、GPT-4o Mini
- **多模态**：GPT-4 Vision、Claude 3

### 3. 参数调优
- **Temperature**：
  - 0.3-0.5：需要准确性的任务（翻译、代码）
  - 0.7-0.9：创意任务（写作、角色扮演）
  - 1.0+：高度随机性（头脑风暴）
- **Max Tokens**：
  - 500-1000：简短回复
  - 2000-3000：标准对话
  - 4000+：长文本生成

### 4. 成本优化
- 优先使用性价比高的模型（DeepSeek、GPT-4o Mini）
- 为不同场景配置不同模型
- 定期检查使用统计
- 设置合理的Max Tokens限制

## 🔐 安全注意事项

### ENCRYPTION_KEY管理
- ⚠️ **当前密钥**：`61cf3d4122519ffa52c097d05f000c4157185ee44c89c1340d253d7d3890893e`
- ⚠️ **生产环境必须更换**
- ⚠️ **密钥丢失将导致所有API Key无法解密**
- ✅ 定期备份数据库
- ✅ 使用环境变量管理密钥
- ❌ 不要将密钥提交到代码库

### 数据库备份
```bash
# 备份数据库
cp database.sqlite database.backup.$(date +%Y%m%d).sqlite

# 恢复数据库
cp database.backup.20260124.sqlite database.sqlite
```

## 📈 后续优化计划

### 短期（1-2周）
- [ ] 添加"测试连接"功能验证API Key
- [ ] 优化错误提示信息
- [ ] 添加模型使用统计

### 中期（1-2月）
- [ ] 实现多API Key负载均衡
- [ ] 添加成本管理功能
- [ ] 支持模型分组和搜索

### 长期（3-6月）
- [ ] 模型健康监控
- [ ] 自动降级机制
- [ ] 权限管理系统

## 🎉 开始使用

现在你可以：
1. 访问 http://localhost:5173 开始使用
2. 点击"⚙️ 模型管理"配置你的AI模型
3. 创建角色并选择合适的模型
4. 开始对话体验不同模型的效果

祝使用愉快！🚀

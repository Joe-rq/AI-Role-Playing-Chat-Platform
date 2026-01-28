# AI Role-Playing Chat Platform (AI 角色扮演对话平台)

## 📖 项目简介
本项目是一个全栈 AI 角色扮演对话平台，旨在提供沉浸式的虚拟角色互动体验。用户可以与性格各异的 AI 角色进行实时对话，支持流式响应（打字机效果）和多模态图片交互。

**🆕 v1.0.0 新增功能：多模型管理系统**
- 支持在前端界面管理多个AI模型配置
- API Key加密存储，安全可靠
- 一键测试模型连接
- 为每个角色灵活配置专属模型

## 🌟 核心特性
- **沉浸式角色**：基于 LLM 的深度角色扮演，支持 System Prompt 人设定制。
- **流式对话**: 使用 Server-Sent Events (SSE) 技术，实现流畅的打字机回复效果。
- **多模态交互**: 支持发送图片，AI 能够"看懂"图片并以角色口吻回应。
- **🆕 多模型管理**: 支持OpenAI、Anthropic、Google、DeepSeek等6大AI厂商，可在界面灵活管理和切换。
- **🆕 安全加密**: API Key使用AES-256-CBC加密存储，前端脱敏显示。
- **🆕 一键测试**: 内置API Key测试功能，即时验证配置有效性。
- **🆕 长期记忆**: 集成 Mem0.ai，角色拥有跨会话的长期记忆能力，根据历史对话个性化回应。
- **Modern UI**: 采用 Vue3 + Premium Aesthetics 设计，包含毛玻璃特效 (Glassmorphism) 和流畅动画。
- **移动端适配**: 完美支持手机端访问。

## 🛠 技术栈
- **Frontend**: Vue 3, Vite, Vanilla CSS (Custom Design)
- **Backend**: NestJS, Node.js
- **Database**: SQLite (TypeORM), 易于迁移至 MySQL
- **AI Service**: OpenAI SDK (兼容 DeepSeek, GPT-4o, Claude, Gemini 等)
- **AI Memory**: Mem0.ai (Long-term Memory)
- **Security**: AES-256-CBC 加密存储 API Key
- **File Storage**: Local Storage (Multer)

## 🚀 快速启动

### 前置要求
- Node.js (v16+)
- npm (v8+)

### ⚡️ 一键启动 (推荐)
本项目提供了一个启动脚本，可同时运行前后端服务：

```bash
./start.sh
```
*(首次运行会自动创建 .env 文件，请记得填入 API Key)*

### 手动启动

#### 1. 启动后端
```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# !!! 编辑 .env 文件，填入 ENCRYPTION_KEY !!!
# 生成密钥：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 初始化数据（角色 + 模型）
npx ts-node src/seed.ts
npx ts-node src/seed-models.ts

# 启动服务
npm run start:dev
```
后端默认运行在 `http://localhost:3000`。

#### 2. 启动前端
```bash
cd frontend

# 安装依赖
npm install

# 启动服务
npm run dev
```
前端默认运行在 `http://localhost:5173`。

## 🎯 使用指南

### 1. 管理AI模型

访问前端首页，点击 **"⚙️ 模型管理"** 按钮：

1. **查看模型列表**：显示所有已配置的AI模型
2. **添加新模型**：
   - 点击"➕ 添加模型"
   - 填写模型信息（名称、厂商、模型ID、API Key等）
   - 保存后点击"测试连接"验证配置
3. **编辑模型**：修改模型参数（API Key留空则不更新）
4. **测试连接**：一键验证API Key是否有效 🆕
5. **启用/禁用**：控制模型是否可在角色中选择

### 2. 创建角色

1. 在首页点击 **"+ 创建角色"**
2. 填写角色信息：
   - 名称、描述
   - 系统提示词（定义角色人设）
   - **选择首选模型**（从已启用的模型中选择）
   - 调整参数（Temperature、Max Tokens）
3. 保存角色

### 3. 开始对话

1. 点击角色卡片进入对话界面
2. 输入消息，系统自动使用角色配置的模型
3. 支持发送图片（多模态模型）
4. 查看历史会话记录

## 📂 项目结构
```
.
├── backend/                  # NestJS 后端项目
│   ├── src/
│   │   ├── models/          # 🆕 模型管理模块
│   │   │   ├── entities/    # Model实体
│   │   │   ├── dto/         # DTO定义
│   │   │   ├── models.service.ts
│   │   │   ├── models.controller.ts
│   │   │   ├── encryption.util.ts  # API Key加密工具
│   │   │   └── seed-models.ts      # 模型数据初始化
│   │   ├── characters/      # 角色模块
│   │   ├── chat/            # 对话模块 (SSE + LLM)
│   │   ├── upload/          # 文件上传模块
│   │   └── seed.ts          # 角色数据初始化
│   └── database.sqlite      # SQLite数据库
│
├── frontend/                # Vue3 前端项目
│   ├── src/
│   │   ├── views/
│   │   │   ├── Home.vue     # 角色列表
│   │   │   ├── Chat.vue     # 对话界面
│   │   │   ├── SessionList.vue  # 会话历史
│   │   │   └── ModelManagement.vue  # 🆕 模型管理
│   │   ├── components/
│   │   │   ├── ModelForm.vue  # 🆕 模型表单
│   │   │   └── ...
│   │   ├── services/        # API 封装
│   │   └── router/          # 路由配置
│
└── docs/                    # 📚 文档
    ├── IMPLEMENTATION_REPORT.md   # 实施报告
    ├── USER_GUIDE.md              # 用户指南
    ├── BUGFIX_REPORT.md           # 问题修复
    ├── SUMMARY.md                 # 项目总结
    ├── FINAL_VERIFICATION.md      # 最终验证
    └── test-system.sh             # 自动化测试脚本
```

## 🔐 安全说明

### API Key加密存储

本系统使用 **AES-256-CBC** 算法加密存储所有API Key：

1. **加密密钥**：存储在环境变量 `ENCRYPTION_KEY` 中
2. **前端脱敏**：只显示前4后4字符（如：`sk-c***351a`）
3. **传输安全**：建议生产环境使用HTTPS

### 重要提示

⚠️ **生产环境必须更换ENCRYPTION_KEY！**

```bash
# 生成新密钥（64字符十六进制）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 更新backend/.env
ENCRYPTION_KEY=<新生成的密钥>

# 重启后端服务
```

⚠️ **定期备份数据库！**

```bash
# 备份数据库
cp backend/database.sqlite backend/database.backup.$(date +%Y%m%d).sqlite

# 恢复数据库
cp backend/database.backup.20260124.sqlite backend/database.sqlite
```

## 🧪 测试

### 运行自动化测试

```bash
# 在项目根目录运行
./test-system.sh
```

测试内容包括：
- ✅ 服务状态检查
- ✅ 模型管理API测试
- ✅ 角色管理API测试
- ✅ 对话功能测试
- ✅ 数据完整性检查
- ✅ 性能测试

### 手动测试API

```bash
# 获取模型列表
curl http://localhost:3000/models

# 测试模型连接
curl -X POST http://localhost:3000/models/1/test

# 获取角色列表
curl http://localhost:3000/characters
```

## 📊 支持的AI模型

本系统支持以下AI厂商的模型：

| 厂商 | 支持的模型示例 | Base URL |
|------|---------------|----------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo | https://api.openai.com/v1 |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-sonnet-4-5 | https://api.anthropic.com/v1 |
| Google | gemini-pro, gemini-pro-vision | https://generativelanguage.googleapis.com/v1 |
| Alibaba | qwen-turbo, qwen-plus, qwen-max | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| DeepSeek | deepseek-chat, deepseek-coder | https://api.deepseek.com/v1 |
| Zhipu AI | glm-4, glm-4-flash | https://open.bigmodel.cn/api/paas/v4 |

## 📝 考核要点覆盖
- [x] **流式传输**: 实现 SSE 服务端推送与前端解析。
- [x] **图片上传**: 实现图片存储与 Vision 模型调用。
- [x] **架构设计**: 清晰的前后端分离与模块化设计。
- [x] **AI 应用**: 展示了 System Prompt 的设计与 AI 在开发中的辅助作用。
- [x] **🆕 多模型管理**: 实现了完整的模型配置管理系统。
- [x] **🆕 安全加密**: API Key加密存储，保护敏感信息。
- [x] **🆕 测试功能**: 内置API Key测试，提升用户体验。

## 🎯 功能清单

### 已实现功能

#### 核心功能
- ✅ 角色管理（CRUD）
- ✅ 流式对话（SSE）
- ✅ 多模态交互（图片）
- ✅ 会话历史管理
- ✅ 对话导出

#### 🆕 多模型管理系统
- ✅ 模型配置管理（CRUD）
- ✅ API Key加密存储
- ✅ 前端管理界面
- ✅ 模型连接测试
- ✅ 启用/禁用控制
- ✅ 角色模型选择
- ✅ 5分钟缓存机制
- ✅ 环境变量fallback

### 后续优化计划

#### 短期（1-2周）
- [ ] 批量操作功能
- [ ] 模型使用统计
- [ ] 搜索和过滤
- [ ] 错误提示优化

#### 中期（1-2月）
- [ ] 多API Key负载均衡
- [ ] 成本管理功能
- [ ] 模型分组
- [ ] 导入导出配置

#### 长期（3-6月）
- [ ] 模型健康监控
- [ ] 自动降级机制
- [ ] 权限管理系统
- [ ] 审计日志

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发指南

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 License
MIT

## 👥 作者

- 原始项目：AI角色扮演对话平台
- 多模型管理系统：Claude Sonnet 4.5
- 实施时间：2026-01-24

## 🎉 致谢

感谢所有AI厂商提供的优秀模型服务！

---

**当前版本**：v1.0.0
**状态**：✅ 已完成并验证通过
**最后更新**：2026-01-24

**快速链接**：
- 🌐 前端：http://localhost:5173
- 🔧 后端：http://localhost:3000
- 🧪 测试：`./test-system.sh`


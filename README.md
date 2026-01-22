# AI Role-Playing Chat Platform (AI 角色扮演对话平台)

## 📖 项目简介
本项目是一个全栈 AI 角色扮演对话平台，旨在提供沉浸式的虚拟角色互动体验。用户可以与性格各异的 AI 角色进行实时对话，支持流式响应（打字机效果）和多模态图片交互。

## 🌟 核心特性
- **沉浸式角色**：基于 LLM 的深度角色扮演，支持 System Prompt 人设定制。
- **流式对话**: 使用 Server-Sent Events (SSE) 技术，实现流畅的打字机回复效果。
- **多模态交互**: 支持发送图片，AI 能够“看懂”图片并以角色口吻回应。
- **Modern UI**: 采用 Vue3 + Premium Aesthetics 设计，包含毛玻璃特效 (Glassmorphism) 和流畅动画。
- **移动端适配**: 完美支持手机端访问。

## 🛠 技术栈
- **Frontend**: Vue 3, Vite, Vanilla CSS (Custom Design)
- **Backend**: NestJS, Node.js
- **Database**: SQLite (TypeORM), 易于迁移至 MySQL
- **AI Service**: OpenAI SDK (兼容 DeepSeek, GPT-4o 等)
- **File Storage**: Local Storage (Multer)

## 🚀 快速启动

### ⚡️ 一键启动 (推荐)
本项目提供了一个启动脚本，可同时运行前后端服务：

```bash
./start.sh
```
*(首次运行会自动创建 .env 文件，请记得填入 API Key)*

### 手动启动
如果想分别控制...
- Node.js (v16+)
- OpenAI API Key (或兼容的大模型 API Key)

### 1. 启动后端
```bash
cd backend

# 安装依赖
npm install

# 配置环境变量 (复制示例文件)
cp .env.example .env
# !!! 编辑 .env 文件，填入你的 OPENAI_API_KEY !!!

# 初始化默认角色数据
npx ts-node src/seed.ts

# 启动服务
npm run start:dev
```
后端默认运行在 `http://localhost:3000`。

### 2. 启动前端
```bash
cd frontend

# 安装依赖
npm install

# 启动服务
npm run dev
```
前端默认运行在 `http://localhost:5173`。

## 📂 项目结构
```
.
├── Agent.md             # AI Agent 设计文档
├── prd.md               # 产品需求文档
├── implementation_plan.md # 实施计划
├── backend/             # NestJS 后端项目
│   ├── src/
│   │   ├── characters/  # 角色模块
│   │   ├── chat/        # 对话模块 (SSE + LLM)
│   │   ├── upload/      # 文件上传模块
│   │   └── seed.ts      # 数据初始化脚本
├── frontend/            # Vue3 前端项目
│   ├── src/
│   │   ├── views/       # Home.vue, Chat.vue
│   │   └── services/    # API 封装
```

## 📝 考核要点覆盖
- [x] **流式传输**: 实现 SSE 服务端推送与前端解析。
- [x] **图片上传**: 实现图片存储与 Vision 模型调用。
- [x] **架构设计**: 清晰的前后端分离与模块化设计。
- [x] **AI 应用**: 展示了 System Prompt 的设计与 AI 在开发中的辅助作用。

## 📄 License
MIT

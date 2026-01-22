# 项目开发文档：AI 角色扮演对话平台

## 1. 需求分析 (Requirements Analysis)

### 1.1 项目背景与愿景
本项目旨在打造一个**角色扮演 AI 对话平台**，用户可以选择或创建虚拟角色（如动漫人物、历史名人、自定义OC），并进行沉浸式的对话互动。AI 模型将严格遵循角色的性格设定（Persona）、背景故事和说话风格，为用户提供拟人化的情感陪伴。

### 1.2 核心功能 (Core Features)

| 模块 | 功能点 | 详细说明 | 优先级 |
| :--- | :--- | :--- | :--- |
| **角色系统** | 角色配置 | 支持设置角色名称、头像、性格描述、背景故事、开场白。 | P0 |
| | 角色选择 | 用户可在首页浏览并选择想要对话的角色。 | P0 |
| | 角色管理 (CRUD) | 创建/编辑/删除角色，满足管理与维护需求。 | P0 |
| **对话系统** | 智能对话 | AI 基于设定进行回复，保持人设一致性 (Character Consistency)。 | P0 |
| | **流式回复** | 类似 ChatGPT 的打字机效果，提升交互实时感 (SSE/WebSocket)。 | P0 |
| | 历史记录 | 保存用户与角色的聊天记录，支持上下文记忆与历史列表展示。 | P1 |
| **多媒体** | **图片上传** | 用户可发送图片给 AI，AI 需具备视觉理解能力 (Vision Model)。 | P1 |
| | 图片预览 | 前端支持上传图片的压缩预览与查看。 | P1 |
| **工程规范** | 错误处理 | 统一异常处理与错误码规范，便于前后端协作与排查。 | P1 |

### 1.3 考核重点 (Assessment Criteria)
根据《AI + 开发培训 - 入门阶段考核要求》，本项目需重点关注：
1.  **流式传输 (Streaming)**: 必须实现逐字显示的打字机效果。
2.  **图片交互**: 支持图片上传与多模态理解。
3.  **技术架构**: 前后端分离，结构清晰。
4.  **AI 应用**: 展示如何利用 AI 辅助编码及 Prompt Engineering 技巧。

---

## 2. 技术架构选型 (Technical Architecture)

### 2.1 技术栈 (Tech Stack)

#### 前端 (Frontend)
*   **框架**: **Vue 3** (Composition API) - *响应式数据驱动，符合考核要求*
*   **构建工具**: **Vite** - *极速开发体验*
*   **样式方案**: **Vanilla CSS / CSS Variables** (或者 TailwindCSS，视用户偏好，建议使用精致的手写 CSS 以满足"Rich Aesthetics"要求)
*   **状态管理**: **Pinia** (可选，简单应用可用 Reactive/Ref)
*   **HTTP 客户端**: **Fetch API** (原生支持流式读取) 或 **Axios** (需配置流式)
*   **Markdown 渲染**: **markdown-it** - *用于渲染 AI 返回的 Markdown 格式内容*

#### 后端 (Backend)
*   **运行环境**: **Node.js**
*   **框架**: **NestJS** (推荐，架构更严谨，符合"企业级"考核加分项) 或 **Express** (轻量级)
*   **数据库**: **MySQL** (TypeORM/Prisma) 为考核标准选项，**SQLite** 作为开发/演示环境
*   **API 协议**: **RESTful API** + **Server-Sent Events (SSE)** (用于流式对话)
*   **模型服务**: 对接兼容 OpenAI 接口的大模型服务 (如 DeepSeek, Moonshot, OpenAI 等)，需支持 Vision 模型 (如 GPT-4o, Claude 3.5, Gemini 1.5 Pro)。
*   **异常处理**: 全局异常过滤器 + 统一错误响应结构 (code/message/details)

### 2.2 系统架构图 (System Architecture)

```mermaid
graph TD
    User[用户 (User)]
    
    subgraph Frontend [前端 (Vue3 SPA)]
        UI[界面层 (Views)]
        Store[状态管理 (Store)]
        Service[API服务层 (Fetch/SSE)]
    end
    
    subgraph Backend [后端 (Node.js/NestJS)]
        Gateway[API 网关/控制器]
        Auth[认证模块 (可选)]
        CharService[角色服务]
        ChatService[对话服务]
        FileService[文件服务]
        DB[(数据库 MySQL/Mongo)]
    end
    
    subgraph ThirdParty [第三方服务]
        LLM[大模型 API (LLM)]
        OSS[对象存储 (本地或云OSS)]
    end

    User <-->|HTTP/SSE| Frontend
    Frontend <-->|REST API| Backend
    Backend <-->|SQL/NoSQL| DB
    ChatService <-->|API Call| LLM
    FileService <-->|Upload| OSS
```

### 2.3 数据链路 (Data Flow)

1.  **流式对话链路**:
    *   前端发起 `POST /api/chat/stream` 请求，携带 `message`, `characterId`, `history`, `imageUrl`。
    *   后端接收请求，构建 Prompt (System Prompt + User Input + Context)。
    *   后端调用 LLM API (stream: true)。
    *   后端收到 LLM Chunk，通过 SSE (`text/event-stream`) 实时推送到前端。
    *   前端监听 SSE 事件，实时追加文本到 UI。

2.  **图片上传链路**:
    *   前端选择图片 -> 压缩 -> `POST /api/upload` (multipart/form-data)。
    *   后端 `FileService` 接收文件 -> 存储至本地/云端 -> 返回 URL。
    *   前端将 URL 包含在 Chat 消息中发给后端。
    *   后端将图片 URL 封装进 LLM 的 Vision 请求 payload 中。

3.  **历史记录链路**:
    *   前端初始化会话 -> 生成 sessionKey。
    *   前端保存消息 `POST /api/chat/messages`，后端写入数据库。
    *   前端通过 `GET /api/chat/sessions/:sessionKey/messages` 获取历史并渲染列表。

---

## 3. 开发计划 (Development Plan)

### 阶段一：项目初始化与基础设施 (Day 1)
*   [ ] 搭建 Vue3 + Vite 前端脚手架。
*   [ ] 搭建 NestJS/Express 后端脚手架。
*   [ ] 配置数据库连接。
*   [ ] 验证 LLM API 调用 (Hello World)。

### 阶段二：核心业务开发 (Day 2-3)
*   [ ] **角色管理**: 实现角色的列表展示、详情页与 CRUD 接口。
*   [ ] **对话核心**: 实现简单的文本对话接口。
*   [ ] **流式改造**: 将对话接口改造为 SSE 流式输出，前端实现打字机。
*   [ ] **图片功能**: 实现图片上传接口，打通多模态对话。
*   [ ] **历史记录**: 保存会话消息并提供历史列表展示。

### 阶段三：UI 优化与完善 (Day 4)
*   [ ] 美化聊天界面 (气泡样式、动画)。
*   [ ] 响应式适配 (移动端/桌面端)。
*   [ ] 增加 Markdown 渲染支持。
*   [ ] 错误处理与 Loading 状态优化。
*   [ ] 统一错误码规范与后端异常过滤器。

### 阶段四：验收与答辩准备 (Day 5)
*   [ ] 全链路测试。
*   [ ] 准备演示流程。
*   [ ] 编写回顾文档 (AI 使用心得)。

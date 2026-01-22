# 产品需求文档 (PRD) - AI 角色扮演对话平台

| 版本 | 日期 | 作者 | 说明 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-01-22 | Antigravity | 初稿：需求分析与技术选型 |

## 1. 项目概述 (Project Overview)

### 1.1 项目背景
本项目旨在开发一个沉浸式的**角色扮演 AI 对话平台**。通过大语言模型（LLM）的强大语境理解与生成能力，让用户能够与预设或自定义的虚拟角色（如动漫人物、历史名人、原创OC）进行深度互动。不仅要实现基本的文字对话，还需支持**流式响应**（打字机效果）和**多模态交互**（发送图片），提供视觉与情感的双重体验。

### 1.2 核心价值
- **沉浸感 (Immersion)**：通过严格的角色设定（Persona）和背景故事，让 AI 的回复极具代入感。
- **实时性 (Real-time)**：利用流式传输技术，减少等待焦虑，模拟真实人类的打字节奏。
- **多模态 (Multimodal)**：支持图片分享，让用户能与角色建立更丰富的连接（如分享风景、穿搭等）。

---

## 2. 功能需求 (Functional Requirements)

### 2.1 角色系统 (Character System)
*   **角色列表**：首页展示所有可用角色，包含头像、名称、简短描述。
*   **角色详情**：点击查看角色详细背景、性格关键词（Tags）。
*   **角色管理 (Admin)**：
    *   创建/编辑角色：设定名称、头像 URL、系统提示词 (System Prompt)、开场白。
    *   删除角色：支持移除不再使用的角色。
    *   *System Prompt* 是核心，需包含：性格特征、说话口癖、背景故事、对用户的称呼等。

### 2.2 对话系统 (Chat System)
*   **实时对话**：
    *   用户发送文本消息。
    *   AI **流式 (Streaming)** 回复，前端实时渲染增量内容。
    *   支持 Markdown 渲染（加粗、列表、代码块等）。
*   **上下文记忆**：
    *   对话需携带最近 N 轮历史记录，确保对话连贯性。
    *   需处理 Token 限制，进行历史记录的滑动窗口截断。
*   **图片交互**：
    *   用户可上传本地图片。
    *   后端接收图片并存储（本地或 OSS）。
    *   将图片传递给支持 Vision 的大模型（如 GPT-4o-mini 或 Claude-3.5-Sonnet），AI 需能描述或评价图片内容。
    *   前端支持图片预览与压缩，降低体积并保证上传成功率。
*   **对话历史管理**：
    *   会话历史列表展示（按角色或会话分组）。
    *   支持从服务器获取历史消息，恢复上一次会话上下文。

### 2.3 界面与交互 (UI/UX)
*   **风格**：现代、简洁、高质感（Premium）。避免廉价感，使用精心设计的配色和圆角。
*   **响应式**：完美适配 PC 和移动端。
*   **动画**：
    *   消息发送时的平滑上浮。
    *   流式输出时的光标闪烁效果。
    *   图片上传时的预览与进度提示。

### 2.4 接口与错误处理 (API & Error Handling)
*   **接口规范**：RESTful 设计，路径清晰、语义明确。
*   **错误码规范**：统一错误响应结构（code/message/details），前后端一致处理。
*   **统一异常处理**：后端全局异常过滤器或中间件，避免散落的 try/catch 风格。

---

## 3. 技术选型分析 (Technical Selection)

基于《入门阶段考核要求》及“全栈项目”的定位，以下是技术栈对比与最终决策。

### 3.1 核心框架 (Core Frameworks)

| 领域 | 选项 A | 选项 B | 最终选择 | 理由 |
| :--- | :--- | :--- | :--- | :--- |
| **前端** | **Vue 3** | React | **Vue 3** | 考核要求明确指定 Vue3；Composition API 适合逻辑复用。 |
| **构建** | **Vite** | Webpack | **Vite** | 启动快，开发体验极佳，现代前端标配。 |
| **后端** | **NestJS** | Express | **NestJS** | 企业级框架，结构严谨（Module/Controller/Service），TypeScript 支持完美，加分项。 |
| **样式** | **Vanilla CSS** | Tailwind | **Vanilla CSS** | 能够展现更扎实的 CSS 功底，便于定制高质感 UI 细节 (Tailwind 需额外配置且初学者易写出同质化 UI)。 |

### 3.2 关键技术点 (Key Technologies)

#### 3.2.1 流式通信 (Streaming Protocol)
*   **选项 1：WebSocket**
    *   *优点*：双向通信，实时性最强。
    *   *缺点*：有状态，连接维护成本高，不仅是发个消息那么简单。
*   **选项 2：Server-Sent Events (SSE)**
    *   *优点*：单向流（Server -> Client），轻量，基于 HTTP，天然适合 LLM 的流式输出场景。
    *   *缺点*：只支持文本（但足够）。
*   **决策**：**SSE**。实现简单，完美契合打字机效果需求，且更符合 HTTP 协议的无状态特性。

#### 3.2.2 数据库 (Database)
*   **选项 1：MySQL**
    *   *优点*：标准关系型数据库，生产环境首选。
    *   *缺点*：本地需安装 Server。
*   **选项 2：SQLite**
    *   *优点*：单文件，零配置，无需安装服务，极其适合演示和小型项目。
    *   *缺点*：并发写入能力弱（但本项目仅为单人演示，无此瓶颈）。
*   **决策**：**MySQL** 为考核标准选项，**SQLite** 作为开发/演示环境。通过 TypeORM/配置切换，保证可迁移性与演示便捷性。

#### 3.2.3 AI 模型 (LLM Provider)
*   **DeepSeek (V3)**: 性价比极高，中文能力强，支持 OpenAI 格式。
*   **OpenAI (GPT-4o)**: 综合能力最强，支持视觉 (Vision)。
*   **决策**：设计通用的 **LLM Service** 接口。默认配置支持 OpenAI SDK 格式，可灵活切换 DeepSeek 或 GPT-4o（需注意 DeepSeek 目前视觉能力需要专门的模型，或者暂用 GPT-4o-mini 做视觉）。

---

## 4. 接口设计初稿 (API Design Draft)

### 4.1 角色模块
- `GET /characters`: 获取角色列表
- `GET /characters/:id`: 获取角色详情
- `POST /characters`: 创建角色 (Admin)
- `PATCH /characters/:id`: 更新角色
- `DELETE /characters/:id`: 删除角色

### 4.2 对话模块
- `POST /chat`: 发送消息 (普通 HTTP)
- `POST /chat/stream`: 流式对话 (SSE Endpoint)
    - Body: `characterId`, `message`, `history`, `imageUrl`
- `POST /upload`: 图片上传
    - Return: `{ "url": "/uploads/xxx.jpg" }`
- `POST /chat/messages`: 保存消息
- `GET /chat/sessions/:sessionKey/messages`: 获取会话历史

---

## 5. 项目结构规划

```
project-root/
├── frontend/           # Vue3 + Vite
│   ├── src/
│   │   ├── components/ # UI 组件 (ChatBubble, CharacterCard)
│   │   ├── views/      # 页面 (Home, Chat)
│   │   ├── services/   # API 封装 (fetchStream)
│   │   └── style/      # 全局 CSS 变量
├── backend/            # NestJS
│   ├── src/
│   │   ├── characters/ # 角色模块
│   │   ├── chat/       # 对话模块 (含 LLM 集成)
│   │   ├── upload/     # 文件上传模块
│   │   └── common/     # 拦截器/异常过滤器 (Res format)
├── prd.md              # 需求文档
└── implementation_plan.md # 实施计划
```

## 6. 考核要求对齐 (Assessment Alignment)
*   **核心功能**：角色配置、智能对话、图片上传、流式回复、历史管理。
*   **前端**：Vue3 组件化、流式渲染、图片上传与预览/压缩。
*   **后端**：SSE/WebSocket 流式传输、文件上传服务、LLM API 对接、统一异常处理。
*   **数据与接口**：RESTful 规范、角色管理 CRUD、对话接口（流式）、历史记录接口、接口错误码规范。

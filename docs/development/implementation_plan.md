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

---

## 4. 优化方案（附录）

> 目标：提升稳定性、可维护性与答辩展示效果，优先改动小但收益高的点。

### 4.1 最高优先级（稳定性与成本控制）

#### 1. 多模型动态切换 🟡 单SDK已完成，多厂商未实现
- **问题**：单模型配置限制角色能力与成本控制。
- **已实现（单SDK方案）**：
  - ✅ `Character` 实体添加 `preferredModel`、`temperature`、`maxTokens` 字段
  - ✅ 后端按角色配置动态传入模型ID（由OpenAI SDK处理）
  - ✅ 前端展示13个模型选项（含6大厂商名称）
  - ✅ 温度滑块、最大token输入框
- **限制说明**：
  - ⚠️ **仅支持OpenAI SDK**，通过 `model` 参数切换OpenAI系列模型
  - ⚠️ 列表中的Claude、Gemini、Qwen等**仅为展示**，实际调用仍走OpenAI SDK
  - ❌ 多厂商真正接入需要：抽象 `LLMProvider` 接口 + 各厂商SDK适配
- **文件**：
  - `backend/src/characters/entities/character.entity.ts` - 模型字段
  - `backend/src/chat/chat.service.ts` - 模型配置 + 列表
  - `frontend/src/views/Home.vue` - 模型选择UI

### 4.2 体验打磨（答辩加分项）

#### 2. Markdown 渲染增强（部分完成）
- **问题**：基础渲染缺少高亮与公式，流式输出易抖动。
- **方案**：
  - 代码高亮：`highlight.js` 或 `prismjs`。
  - 数学公式：`KaTeX`（可选）。
  - 流式防抖：对未闭合标记进行缓冲再渲染。

#### 3. 移动端适配优化（未开始）
- **问题**：键盘弹起遮挡输入框。
- **方案**：
  - 监听 `visualViewport` 或 `resize` 动态调整输入区。
  - 发送成功增加轻微触感反馈（Haptic API）。

#### 4. 会话管理入口优化（未开始）
- **问题**：
  - 当前会话列表在独立页面，与角色对话脱节
  - 用户需要先退出当前对话 → 回到首页 → 点击"历史会话" → 查找特定角色的会话
  - 操作路径过长，影响使用效率
- **方案**：
  - **方案A（推荐）**：在对话页header添加"历史会话"按钮
    - 点击展开侧边栏或抽屉，显示当前角色的所有会话
    - 支持快速切换会话（无需多次跳转页面）
    - 新建会话、删除、重命名等操作集成
  - **方案B**：保留独立会话列表页，增加角色筛选
    - 默认显示全部会话，顶部提供角色筛选下拉框
    - 点击筛选后只显示该角色的会话
- **交互优化**：
  - 会话项显示：最后消息预览、时间戳、消息数量
  - 支持按时间倒序排列
  - 长按或右键菜单：重命名、导出、删除
  - 当前激活会话高亮显示
- **技术要点**：
  - 前端：侧边栏组件 + 会话切换逻辑
  - 后端：增加"按角色ID查询会话列表"接口（已有）
  - 优化会话加载性能（缓存、懒加载）

### 4.3 安全与运维（风险控制）

#### 5. API 鉴权与限流（未开始）
- **问题**：管理接口裸奔，LLM 成本易被刷爆。
- **方案**：
  - 后端增加 `X-Admin-Secret` 校验。
  - 接入 `@nestjs/throttler` 对请求限流。

#### 6. 错误恢复机制（未开始）
- **问题**：SSE 中断后用户无恢复路径。
- **方案**：
  - 前端增加重试按钮或自动重连逻辑。
  - 后端可返回"可恢复"的错误码。

### 4.4 执行建议（最小收益最大化）

1. 多模型动态切换（多厂商接入）
2. Markdown 渲染增强
3. 移动端适配优化
4. 会话管理入口优化
5. API 鉴权与限流 + 错误恢复机制

### 4.5 里程碑建议

- **M4（未开始）**：多模型（多厂商接入）

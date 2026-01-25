# 优化清单

## 后端与接口
- 补 `POST /chat` 非流式接口，完善 PRD API 设计
- 管理类接口加入 `X-Admin-Secret` 鉴权
- 增加限流机制（如基于 IP 或 API Key 的速率限制）
- 统一错误响应结构包含 `details` 字段
- SSE 错误响应也输出统一结构
- SSE 断线重试/恢复机制（基于 `lastEventId` 或 session 增量拉取）
- Token 使用量持久化/返回给前端或历史记录
- 数据库支持 MySQL/SQLite 配置切换

## 前端与体验
- 角色详情页（独立视图展示背景、标签、设定等）
- 流式 Markdown 防抖/缓冲渲染，避免未闭合抖动
- 打字机光标闪烁动效


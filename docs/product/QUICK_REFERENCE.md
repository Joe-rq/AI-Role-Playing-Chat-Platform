# 🚀 快速参考指南

## 一分钟快速上手

### 访问系统
```
前端: http://localhost:5173
后端: http://localhost:3000
```

### 核心操作

#### 1. 管理模型
```
首页 → 点击 "⚙️ 模型管理"
```

#### 2. 测试连接
```
找到模型卡片 → 点击 "测试连接"
```

#### 3. 添加模型
```
点击 "➕ 添加模型" → 填写表单 → 保存 → 测试
```

#### 4. 创建角色
```
首页 → "+ 创建角色" → 选择模型 → 保存
```

---

## 常用命令

### 启动服务
```bash
# 后端
cd backend && npm run start:dev

# 前端
cd frontend && npm run dev
```

### 数据库操作
```bash
# 初始化模型数据
cd backend && npx ts-node src/seed-models.ts

# 备份数据库
cp backend/database.sqlite backend/database.backup.$(date +%Y%m%d).sqlite
```

### 测试
```bash
# 运行自动化测试
./test-system.sh

# 测试API
curl http://localhost:3000/models
curl -X POST http://localhost:3000/models/1/test
```

---

## API快速参考

### 模型管理
```bash
GET    /models              # 获取所有模型
GET    /models/enabled      # 获取已启用模型
GET    /models/:id          # 获取单个模型
POST   /models              # 创建模型
PUT    /models/:id          # 更新模型
DELETE /models/:id          # 删除模型
POST   /models/:id/test     # 测试连接 🆕
```

### 角色管理
```bash
GET    /characters          # 获取所有角色
POST   /characters          # 创建角色
PUT    /characters/:id      # 更新角色
DELETE /characters/:id      # 删除角色
```

### 对话
```bash
POST   /chat/stream         # 流式对话
GET    /chat/sessions       # 获取会话列表
```

---

## 配置模板

### OpenAI模型
```json
{
  "name": "GPT-4 Turbo",
  "modelId": "gpt-4-turbo",
  "provider": "openai",
  "apiKey": "sk-proj-xxxxx",
  "baseURL": "https://api.openai.com/v1",
  "defaultTemperature": 0.7,
  "defaultMaxTokens": 4000
}
```

### Anthropic模型
```json
{
  "name": "Claude 3 Opus",
  "modelId": "claude-3-opus-20240229",
  "provider": "anthropic",
  "apiKey": "sk-ant-xxxxx",
  "baseURL": "https://api.anthropic.com/v1",
  "defaultTemperature": 0.7,
  "defaultMaxTokens": 4000
}
```

### DeepSeek模型
```json
{
  "name": "DeepSeek Chat",
  "modelId": "deepseek-chat",
  "provider": "deepseek",
  "apiKey": "sk-xxxxx",
  "baseURL": "https://api.deepseek.com/v1",
  "defaultTemperature": 0.7,
  "defaultMaxTokens": 2000
}
```

---

## 故障排查

### 问题：对话报错 "Model Not Exist"
**解决方案：**
1. 进入模型管理页面
2. 检查模型是否已启用
3. 点击"启用"按钮

### 问题：测试连接失败
**检查清单：**
- [ ] API Key是否正确
- [ ] Base URL是否可访问
- [ ] 网络连接是否正常
- [ ] 查看后端日志: `tail -f /tmp/backend.log`

### 问题：角色编辑无法保存
**解决方案：**
1. 刷新页面重试
2. 检查浏览器控制台错误
3. 确认后端服务正常运行

### 问题：前端显示空白
**解决方案：**
1. 检查前端服务是否启动
2. 访问 http://localhost:5173
3. 查看浏览器控制台错误

---

## 安全检查清单

### 生产环境部署前
- [ ] 更换ENCRYPTION_KEY为随机密钥
- [ ] 配置HTTPS
- [ ] 备份数据库
- [ ] 测试所有模型连接
- [ ] 检查API Key权限
- [ ] 设置CORS白名单

### 日常维护
- [ ] 每周备份数据库
- [ ] 监控API使用量
- [ ] 定期轮换API Key
- [ ] 检查日志异常

---

## 性能优化建议

### 当前配置
- 缓存TTL: 5分钟
- 最大历史轮数: 20轮
- 默认Max Tokens: 2000

### 优化建议
```env
# 增加缓存时间（适合稳定环境）
CACHE_TTL=600000  # 10分钟

# 减少历史轮数（节省Token）
MAX_HISTORY_TURNS=10

# 调整默认Token限制
DEFAULT_MAX_TOKENS=1500
```

---

## 文档索引

### 新手入门
1. [README.md](README.md) - 项目概览
2. [USER_GUIDE.md](USER_GUIDE.md) - 详细使用指南

### 技术文档
3. [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) - 实施细节
4. [BUGFIX_REPORT.md](BUGFIX_REPORT.md) - 问题修复

### 验证报告
5. [SUMMARY.md](SUMMARY.md) - 项目总结
6. [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md) - 最终验证

---

## 快速链接

### 在线访问
- 🌐 前端界面: http://localhost:5173
- ⚙️ 模型管理: http://localhost:5173/models
- 📜 会话历史: http://localhost:5173/sessions
- 🔧 后端API: http://localhost:3000

### 本地文件
- 📁 数据库: `backend/database.sqlite`
- 🔐 环境变量: `backend/.env`
- 📝 日志: `/tmp/backend.log`

---

## 支持的AI厂商

| 厂商 | 官网 | API文档 |
|------|------|---------|
| OpenAI | openai.com | platform.openai.com/docs |
| Anthropic | anthropic.com | docs.anthropic.com |
| Google | ai.google.dev | ai.google.dev/docs |
| DeepSeek | deepseek.com | platform.deepseek.com/docs |
| Alibaba | dashscope.aliyun.com | help.aliyun.com/document_detail/2400395.html |
| Zhipu AI | bigmodel.cn | open.bigmodel.cn/dev/api |

---

## 版本信息

**当前版本**: v1.0.0
**发布日期**: 2026-01-24
**状态**: ✅ 生产就绪

### 版本历史
- v1.0.0 (2026-01-24) - 多模型管理系统首次发布
  - ✅ 完整的CRUD功能
  - ✅ API Key加密存储
  - ✅ 模型连接测试
  - ✅ 前端管理界面

---

## 联系方式

### 问题反馈
- 📧 提交Issue到项目仓库
- 💬 查看文档获取帮助

### 贡献代码
- 🔀 Fork项目
- 📝 提交Pull Request

---

**最后更新**: 2026-01-24
**维护者**: Claude Sonnet 4.5

# 删除角色点击确认提示“网络错误”排查记录

> 目标：不改代码，仅排查导致“网络错误，请稍后再试”的原因。

## 现象
- 删除角色点击确认后，弹出 toast：“网络错误，请稍后再试”。
- DevTools Network 面板无请求记录。

## 代码定位（前端）
- 页面：`frontend/src/views/Home.vue`
- 删除确认：`ConfirmDialog` → `handleDelete()` / `handleClearHistoryAndDelete()`
- “网络错误”仅在 `catch` 中出现，说明：
  - JS 运行时异常（例如 `characterToDelete` 为 `null`），或
  - `fetch` 直接 reject（网络层失败、后端未启动、CORS 等）

## 快速排查步骤（不改代码）

### 1) 确认点击“确认”是否进入 `handleDelete`
- 在 DevTools Sources 中找到 `handleDelete`（Home.vue 编译产物）
- 在函数第一行打断点，点击“确认”按钮

判断：
- **断点不触发** → 事件未触发或被遮罩吞掉（事件路径问题）
- **断点触发** → 继续下一步

### 2) 检查 `characterToDelete.value`
- 在断点处查看 `characterToDelete.value`

判断：
- **为 null/undefined** → `characterToDelete.value.id` 抛错，进入 `catch`
- **有值** → 继续下一步

### 3) 手动验证 DELETE 请求是否可达
在浏览器控制台执行：
```js
await fetch('http://localhost:3000/characters/1', { method: 'DELETE' })
```
（将 `1` 替换为实际角色 ID）

判断：
- **Promise reject / 报错** → 网络层问题（后端未启动、端口不对、CORS 等）
- **正常返回** → 前端请求未发出或被提前中断

### 4) 后端是否收到请求
- 查看后端控制台日志是否出现 DELETE 相关记录

判断：
- **无日志** → 请求未到后端
- **有日志** → 检查后端返回内容与前端处理逻辑

### 5) Network 面板过滤确认
- 确保 Network 未被过滤（如仅显示 Fetch/XHR）

## 结论指向（基于现象的高概率项）
1) `characterToDelete` 在确认时为空 → JS 抛错 → catch → toast
2) `fetch` 直接 reject → 网络层问题（后端未启动、端口不匹配、CORS）

## 下一步需要的排查信息
- 断点是否触发
- `characterToDelete.value` 的值
- 控制台手动 `fetch` 的结果


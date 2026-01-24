const API_BASE = 'http://localhost:3000'

// 获取所有角色
export async function fetchCharacters() {
    const res = await fetch(`${API_BASE}/characters`)
    return res.json()
}

// 获取单个角色
export async function fetchCharacter(id) {
    const res = await fetch(`${API_BASE}/characters/${id}`)
    return res.json()
}

// 创建角色
export async function createCharacter(data) {
    const res = await fetch(`${API_BASE}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return res.json()
}

// 更新角色
export async function updateCharacter(id, data) {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return res.json()
}

// 删除角色
export async function deleteCharacter(id) {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
        method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
}

// 删除角色相关对话历史
export async function deleteCharacterHistory(characterId) {
    const res = await fetch(`${API_BASE}/chat/sessions/character/${characterId}`, {
        method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
}

// 上传图片
export async function uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
    })
    return res.json()
}

// 流式对话 (SSE)
export async function* streamChat(characterId, message, history = [], imageUrl = null, signal = null) {
    const payload = {
        characterId,
        message,
        history,
        ...(imageUrl && { imageUrl }),
    }

    const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal, // 传入 AbortSignal
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))
                if (data.done) return
                if (data.content) yield data.content
                if (data.error) throw new Error(data.error)
            }
        }
    }
}

// 保存消息到服务器
export async function saveMessage(sessionKey, characterId, role, content, imageUrl = null) {
    const payload = {
        sessionKey,
        characterId,
        role,
        content,
        ...(imageUrl && { imageUrl }),
    }

    const res = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    return res.json()
}

// 获取会话历史
export async function getHistory(sessionKey) {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionKey}/messages`)
    return res.json()
}

// 删除单个会话
export async function deleteSession(sessionKey) {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionKey}`, {
        method: 'DELETE',
    })
    return res.json()
}

// 获取会话列表
export async function getSessions(characterId, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (characterId) params.append('characterId', String(characterId))
    const res = await fetch(`${API_BASE}/chat/sessions?${params}`)
    return res.json()
}

// 导出会话数据
export async function exportSession(sessionKey) {
    const res = await fetch(`${API_BASE}/chat/sessions/${sessionKey}/export`)
    const data = await res.json()

    // 下载为JSON文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${sessionKey}.json`
    a.click()
    URL.revokeObjectURL(url)

    return data
}

// 获取可用的AI模型列表
export async function getAvailableModels() {
    const res = await fetch(`${API_BASE}/chat/models`)
    return res.json()
}

// ========== 模型管理 API ==========

// 获取所有模型配置
export async function getModels() {
    const res = await fetch(`${API_BASE}/models`)
    if (!res.ok) throw new Error('获取模型列表失败')
    return res.json()
}

// 获取已启用的模型（用于角色选择）
export async function getEnabledModels() {
    const res = await fetch(`${API_BASE}/models/enabled`)
    if (!res.ok) throw new Error('获取已启用模型失败')
    return res.json()
}

// 创建模型配置
export async function createModel(data) {
    const res = await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: '创建模型失败' }))
        throw new Error(error.message || '创建模型失败')
    }
    return res.json()
}

// 更新模型配置
export async function updateModel(id, data) {
    const res = await fetch(`${API_BASE}/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: '更新模型失败' }))
        throw new Error(error.message || '更新模型失败')
    }
    return res.json()
}

// 删除模型配置
export async function deleteModel(id) {
    const res = await fetch(`${API_BASE}/models/${id}`, {
        method: 'DELETE',
    })
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: '删除模型失败' }))
        throw new Error(error.message || '删除模型失败')
    }
    return res.json()
}


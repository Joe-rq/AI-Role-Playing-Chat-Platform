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
    return res.json()
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
export async function* streamChat(characterId, message, history = [], imageUrl = null) {
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

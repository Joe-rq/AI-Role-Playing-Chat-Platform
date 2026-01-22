import { ref } from 'vue'
import { saveMessage, getHistory } from '../services/api'

/**
 * 对话历史管理 Composable
 * 实现 localStorage 缓存 + 服务器同步的混合方案
 */
export function useChatHistory(characterId) {
    const storageKey = `chat_session_${characterId}`
    const sessionKey = ref(null)
    const messages = ref([])
    const isLoading = ref(false)

    /**
     * 生成UUID作为会话标识
     */
    function generateSessionKey() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }

    /**
     * 从 localStorage 加载缓存
     */
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(storageKey)
            if (cached) {
                const data = JSON.parse(cached)
                sessionKey.value = data.sessionKey
                messages.value = data.messages || []
                return true
            }
        } catch (error) {
            console.error('加载本地缓存失败:', error)
        }
        return false
    }

    /**
     * 保存到 localStorage
     */
    function saveToCache() {
        try {
            const data = {
                sessionKey: sessionKey.value,
                characterId,
                messages: messages.value,
                lastSync: Date.now(),
            }
            localStorage.setItem(storageKey, JSON.stringify(data))
        } catch (error) {
            console.error('保存本地缓存失败:', error)
        }
    }

    /**
     * 从服务器同步历史记录
     */
    async function syncFromServer() {
        if (!sessionKey.value) return

        try {
            const data = await getHistory(sessionKey.value)
            if (data.messages && data.messages.length > 0) {
                // 服务器有更多数据，合并到本地
                messages.value = data.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    imageUrl: msg.imageUrl,
                }))
                saveToCache()
            }
        } catch (error) {
            console.error('从服务器同步历史失败:', error)
        }
    }

    /**
     * 初始化：先加载缓存，再从服务器同步
     */
    async function init() {
        isLoading.value = true

        // 优先从缓存加载
        const hasCache = loadFromCache()

        if (!hasCache) {
            // 没有缓存，生成新会话
            sessionKey.value = generateSessionKey()
        }

        // 后台同步服务器数据
        await syncFromServer()

        isLoading.value = false
    }

    /**
     * 添加消息（用户或AI）
     */
    function addMessage(role, content, imageUrl = null) {
        const message = { role, content, imageUrl }
        messages.value.push(message)

        // 立即保存到 localStorage
        saveToCache()

        // 异步保存到服务器
        saveMessageToServer(role, content, imageUrl)
    }

    /**
     * 保存消息到服务器（后台异步）
     */
    async function saveMessageToServer(role, content, imageUrl) {
        try {
            await saveMessage(sessionKey.value, characterId, role, content, imageUrl)
        } catch (error) {
            console.error('保存消息到服务器失败:', error)
            // 失败了也不要紧，localStorage 已经保存了
        }
    }

    /**
     * 清空历史记录
     */
    function clearHistory() {
        messages.value = []
        sessionKey.value = generateSessionKey()
        saveToCache()
    }

    return {
        sessionKey,
        messages,
        isLoading,
        init,
        addMessage,
        clearHistory,
    }
}

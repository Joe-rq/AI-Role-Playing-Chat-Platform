import { ref } from 'vue'
import { saveMessage, getHistory, deleteCharacterHistory } from '../services/api'

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
            const serverMessages = data.messages || []
            if (serverMessages.length > messages.value.length) {
                // 服务器数据更多时才覆盖本地，避免丢失未同步内容
                messages.value = serverMessages.map(msg => ({
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
     * @param {string} externalSessionKey - 外部传入的sessionKey（如从会话列表跳转）
     */
    async function init(externalSessionKey = null) {
        isLoading.value = true

        // 如果外部传入sessionKey，则使用外部的
        if (externalSessionKey) {
            sessionKey.value = externalSessionKey
            // 直接从服务器加载该会话
            await syncFromServer()
        } else {
            // 优先从缓存加载
            const hasCache = loadFromCache()

            if (!hasCache) {
                // 没有缓存，生成新会话
                sessionKey.value = generateSessionKey()
            }

            // 后台同步服务器数据
            await syncFromServer()
        }

        isLoading.value = false
    }

    /**
     * 添加消息（用户或AI）
     */
    function addMessage(role, content, imageUrl = null, options = {}) {
        const message = { role, content, imageUrl }
        messages.value.push(message)

        // 立即保存到 localStorage
        saveToCache()

        // 异步保存到服务器（默认开启）
        if (options.saveServer !== false) {
            saveMessageToServer(role, content, imageUrl)
        }
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
     * 清空历史记录（前后端同步）
     */
    async function clearHistory() {
        // 1. 调用后端删除接口
        try {
            await deleteCharacterHistory(characterId)
        } catch (error) {
            console.error('后端清空失败:', error)
            // 继续执行前端清理
        }

        // 2. 清空本地状态
        messages.value = []
        sessionKey.value = generateSessionKey()

        // 3. 清除localStorage
        localStorage.removeItem(storageKey)

        // 4. 保存新会话到缓存
        saveToCache()
    }

    return {
        sessionKey,
        messages,
        isLoading,
        init,
        addMessage,
        clearHistory,
        saveToCache,  // 导出以便在流式更新后手动调用
    }
}

<template>
  <div class="session-sidebar">
    <div class="sidebar-header">
      <div class="header-content">
        <h2>{{ characterName || '角色' }}的会话</h2>
        <button @click="$emit('close')" class="close-btn" title="关闭">✕</button>
      </div>
      <button @click="handleNewSession" class="new-session-btn">
        ➕ 新建会话
      </button>
    </div>

    <div class="sessions-list">
      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="sessions.length === 0" class="empty-state">
        <p>暂无会话记录</p>
      </div>

      <div
        v-else
        v-for="session in sessions"
        :key="session.sessionKey"
        :class="['session-item', { active: session.sessionKey === currentSessionKey }]"
        @click="handleSwitchSession(session.sessionKey)"
      >
        <div class="session-preview">
          {{ session.lastMessage || '暂无消息' }}
        </div>
        <div class="session-meta">
          <span class="message-count">{{ session.messageCount }} 条消息</span>
          <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
        </div>
        <div class="session-actions" @click.stop>
          <button @click="handleExport(session.sessionKey)" class="action-btn" title="导出">
            📥
          </button>
          <button @click="openDeleteConfirm(session.sessionKey)" class="action-btn delete" title="删除">
            🗑️
          </button>
        </div>
      </div>

      <div v-if="hasMore" class="load-more">
        <button @click="loadMore" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="确认删除"
      message="确定要删除这个会话吗？此操作不可恢复！"
      @confirm="confirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getSessions, deleteSession, exportSession } from '../services/api'
import ConfirmDialog from './ConfirmDialog.vue'
import { useToast } from '../composables/useToast'

const props = defineProps({
  characterId: {
    type: Number,
    required: true
  },
  currentSessionKey: {
    type: String,
    default: ''
  },
  characterName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['switch-session', 'new-session', 'close'])

const sessions = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const pageSize = 20
const showDeleteConfirm = ref(false)
const sessionToDelete = ref(null)
const toast = useToast()

const hasMore = computed(() => sessions.value.length < totalCount.value)

onMounted(() => {
  loadSessions()
})

async function loadSessions() {
  loading.value = true
  try {
    const data = await getSessions(props.characterId, currentPage.value, pageSize)
    sessions.value = data.sessions || []
    totalCount.value = data.total || 0
  } catch (error) {
    console.error('加载会话列表失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++

  try {
    const data = await getSessions(props.characterId, currentPage.value, pageSize)
    sessions.value.push(...(data.sessions || []))
    totalCount.value = data.total || 0
  } catch (error) {
    console.error('加载更多会话失败:', error)
    currentPage.value--
  } finally {
    loadingMore.value = false
  }
}

function handleSwitchSession(sessionKey) {
  emit('switch-session', sessionKey)
}

function handleNewSession() {
  emit('new-session')
}

function openDeleteConfirm(sessionKey) {
  sessionToDelete.value = sessionKey
  showDeleteConfirm.value = true
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  sessionToDelete.value = null
}

async function confirmDelete() {
  if (!sessionToDelete.value) return

  try {
    await deleteSession(sessionToDelete.value)

    // 如果删除的是当前会话，触发新建会话
    if (sessionToDelete.value === props.currentSessionKey) {
      emit('new-session')
    }

    // 刷新会话列表
    currentPage.value = 1
    await loadSessions()
    toast.success('会话已删除')
  } catch (error) {
    console.error('删除会话失败:', error)
    toast.error('删除失败，请重试')
  } finally {
    closeDeleteConfirm()
  }
}

async function handleExport(sessionKey) {
  try {
    const data = await exportSession(sessionKey)

    // 下载为JSON文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${sessionKey}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('会话导出成功')
  } catch (error) {
    console.error('导出会话失败:', error)
    toast.error('导出失败，请重试')
  }
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }

  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }

  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }

  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }

  // 显示日期
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.session-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.sidebar-header {
  padding: 20px;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-header h2 {
  font-size: 1.25rem;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
  background: #f0f2f5;
  border-radius: 6px;
}

.new-session-btn {
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.new-session-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.session-item {
  background: white;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.session-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.session-item.active {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(238, 90, 111, 0.05));
}

.session-preview {
  font-size: 0.9rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.session-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 4px 8px;
  background: #f0f2f5;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e4e6ea;
}

.action-btn.delete:hover {
  background: #fee;
  color: #d63031;
}

.load-more {
  text-align: center;
  padding: 16px;
}

.load-more button {
  padding: 8px 24px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more button:hover:not(:disabled) {
  background: #f5f7fa;
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.load-more button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

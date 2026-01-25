<template>
  <div class="sessions-page">
    <header class="sessions-header">
      <button @click="goBack">返回</button>
      <h2>会话历史</h2>
    </header>

    <div class="sessions-container">
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else-if="sessions.length === 0" class="empty-state">
        <p>暂无会话记录</p>
      </div>

      <div v-else class="sessions-list">
        <div
          v-for="session in sessions"
          :key="session.sessionKey"
          class="session-card"
          @click="goToSession(session)"
        >
          <div class="session-avatar">
            <img :src="session.characterAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${session.characterName}`" :alt="session.characterName" />
          </div>
          
          <div class="session-info">
            <div class="session-header">
              <h3>{{ session.characterName }}</h3>
              <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
            </div>
            <p class="session-preview">{{ session.lastMessage || '暂无消息' }}</p>
            <div class="session-meta">
              <span>{{ session.messageCount }} 条消息</span>
            </div>
          </div>

          <div class="session-actions" @click.stop>
            <button @click="handleExport(session.sessionKey)" class="action-btn" title="导出">
              📥
            </button>
            <button @click="handleDelete(session.sessionKey)" class="action-btn delete" title="删除">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
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
import { useRouter } from 'vue-router'
import { getSessions, deleteSession, exportSession } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const sessions = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const pageSize = 20
const showDeleteConfirm = ref(false)
const sessionToDelete = ref(null)

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

function goBack() {
  router.push('/')
}

function goToSession(session) {
  // 传递sessionKey作为query参数，以便加载正确的历史会话
  router.push({
    path: `/chat/${session.characterId}`,
    query: { sessionKey: session.sessionKey }
  })
}

async function loadSessions() {
  loading.value = true
  try {
    const data = await getSessions(undefined, currentPage.value, pageSize)
    sessions.value = data.sessions || []
    totalCount.value = data.total || 0
  } catch (error) {
    console.error('加载会话列表失败:', error)
    toast.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

function handleDelete(sessionKey) {
  sessionToDelete.value = sessionKey
  showDeleteConfirm.value = true
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  sessionToDelete.value = null
}

async function confirmDelete() {
  try {
    await deleteSession(sessionToDelete.value)
    toast.success('删除成功')
    await loadSessions() // 重新加载列表
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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${sessionKey}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('导出成功')
  } catch (error) {
    console.error('导出会话失败:', error)
    toast.error('导出失败，请重试')
  }
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    loadSessions()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadSessions()
  }
}

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.sessions-page {
  min-height: 100vh;
  background: var(--bg-color);
  max-width: 900px;
  margin: 0 auto;
}

.sessions-header {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sessions-header button {
  color: var(--text-secondary);
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 12px;
  background: transparent;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  cursor: pointer;
}

.sessions-header button:hover {
  background: #f4f5f7;
  color: var(--text-primary);
}

.sessions-header h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 700;
}

.sessions-container {
  padding: 24px;
}

.loading, .empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.02);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.session-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  transform: translateY(-2px);
  border-color: rgba(100, 100, 255, 0.1);
}

.session-avatar img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.session-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--text-primary);
  font-weight: 600;
}

.session-time {
  font-size: 0.8rem;
  color: var(--text-light);
  font-weight: 500;
}

.session-preview {
  margin: 0 0 10px 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.session-meta {
  font-size: 0.8rem;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-meta::before {
  content: '💬';
  font-size: 0.9em;
}

.session-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.session-card:hover .session-actions {
  opacity: 1;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f4f5f7;
  font-size: 1.1rem;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.action-btn:hover {
  background: #e0e7ff;
  color: var(--primary-color);
  transform: scale(1.1);
}

.action-btn.delete:hover {
  background: #ffe4e6;
  color: #ff4757;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  padding: 16px;
}

.pagination button {
  padding: 10px 20px;
  border-radius: 12px;
  background: white;
  color: var(--text-primary);
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid transparent;
  cursor: pointer;
}

.pagination button:not(:disabled):hover {
  background: white;
  color: var(--primary-color);
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(100, 100, 255, 0.15);
  transform: translateY(-1px);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  background: #f9fafb;
}

.pagination span {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

@media (max-width: 640px) {
  .sessions-page { max-width: 100%; }
  .session-card { padding: 16px; gap: 12px; }
  .session-avatar img { width: 48px; height: 48px; }
  .session-actions { opacity: 1; } /* 移动端常驻显示 */
}
</style>

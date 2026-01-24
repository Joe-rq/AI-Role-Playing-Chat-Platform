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
            <img :src="session.characterAvatar || '/default-avatar.png'" :alt="session.characterName" />
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getSessions, deleteSession, exportSession } from '../services/api'

const router = useRouter()
const sessions = ref([])
const loading = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const pageSize = 20

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
    alert('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

async function handleDelete(sessionKey) {
  if (!confirm('确定要删除这个会话吗？此操作不可恢复！')) {
    return
  }

  try {
    await deleteSession(sessionKey)
    alert('删除成功')
    await loadSessions() // 重新加载列表
  } catch (error) {
    console.error('删除会话失败:', error)
    alert('删除失败，请重试')
  }
}

async function handleExport(sessionKey) {
  try {
    await exportSession(sessionKey)
    alert('导出成功')
  } catch (error) {
    console.error('导出会话失败:', error)
    alert('导出失败，请重试')
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
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 16px;
}

.sessions-header button {
  color: var(--text-secondary);
  font-weight: 500;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: #f0f2f5;
  transition: var(--transition);
}

.sessions-header button:hover {
  background: #e4e6ea;
  color: var(--text-primary);
}

.sessions-header h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0;
}

.sessions-container {
  padding: 24px;
}

.loading, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.2s;
  cursor: pointer;
}

.session-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.session-avatar img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.session-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.session-preview {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.session-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f0f2f5;
  font-size: 1.1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #e4e6ea;
  transform: scale(1.05);
}

.action-btn.delete:hover {
  background: #fee;
  color: #d63031;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
}

.pagination button {
  padding: 8px 16px;
  border-radius: 8px;
  background: white;
  color: var(--text-primary);
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.pagination button:not(:disabled):hover {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .sessions-page { max-width: 100%; }
  .session-card { padding: 12px; }
  .session-avatar img { width: 40px; height: 40px; }
}
</style>

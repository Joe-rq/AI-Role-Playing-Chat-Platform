<template>
  <div class="model-management">
    <header class="page-header">
      <h1>模型管理</h1>
      <button @click="openAddDialog" class="add-btn">+ 添加模型</button>
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载配置中...</p>
    </div>

    <div v-else-if="models.length === 0" class="empty-state">
      <div class="empty-icon">⚙️</div>
      <h3>还没有配置任何模型</h3>
      <p>添加模型后即可开始与不同个性的 AI 角色聊天</p>
      <button @click="openAddDialog" class="add-btn-large">配置第一个模型</button>
    </div>

    <div v-else class="models-list">
      <div v-for="model in models" :key="model.id" class="model-card">
        <div class="card-content">
          <div class="model-header">
            <div class="header-main">
              <h3>{{ model.name }}</h3>
              <span class="provider-badge">{{ getProviderName(model.provider) }}</span>
            </div>
            <span class="status-badge" :class="{ enabled: model.isEnabled }">
              {{ model.isEnabled ? '已启用' : '已禁用' }}
            </span>
          </div>
          
          <div class="model-details">
            <div class="detail-item">
              <span class="label">Model ID</span>
              <code class="value">{{ model.modelId }}</code>
            </div>
            <div class="detail-item">
              <span class="label">API Key</span>
              <code class="value">{{ model.apiKeyMasked }}</code>
            </div>
             <div class="detail-item full-width" v-if="model.description">
              <span class="label">描述</span>
              <p class="description-text">{{ model.description }}</p>
            </div>
          </div>

          <div class="model-params">
            <div class="param-tag">
              <span class="icon">🌡️</span>
              <span>Temp: {{ model.defaultTemperature }}</span>
            </div>
            <div class="param-tag">
              <span class="icon">📝</span>
              <span>Max: {{ model.defaultMaxTokens }}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button 
            @click="handleTest(model)" 
            class="action-btn test" 
            :disabled="testingModelId === model.id"
            :title="testingModelId === model.id ? '测试中...' : '测试连接'"
          >
            <span v-if="testingModelId === model.id" class="spinner-small"></span>
            <span v-else>🔌</span>
          </button>
          <button @click="handleEdit(model)" class="action-btn edit" title="编辑">
            ✏️
          </button>
          <button 
            @click="toggleEnabled(model)" 
            class="action-btn toggle"
            :class="{ active: model.isEnabled }"
            :title="model.isEnabled ? '禁用' : '启用'"
          >
            {{ model.isEnabled ? '⏸️' : '▶️' }}
          </button>
          <button @click="handleDelete(model.id)" class="action-btn delete" title="删除">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <Drawer :visible="showModelDialog" @close="closeModelDialog" width="480px">
      <ModelForm
        :model="editingModel"
        @save="handleSave"
        @cancel="closeModelDialog"
      />
    </Drawer>

    <ConfirmDialog
      :visible="showDeleteConfirm"
      title="确认删除"
      message="确定要删除这个模型配置吗？此操作不可恢复！"
      @confirm="confirmDelete"
      @cancel="closeDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getModels, createModel, updateModel, deleteModel, testModelConnection } from '../services/api'
import Drawer from '../components/Drawer.vue'
import ModelForm from '../components/ModelForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useToast } from '../composables/useToast'

const models = ref([])
const loading = ref(true)
const showModelDialog = ref(false)
const editingModel = ref(null)
const showDeleteConfirm = ref(false)
const modelToDelete = ref(null)
const testingModelId = ref(null)
const toast = useToast()

onMounted(async () => {
  await loadModels()
})

async function loadModels() {
  try {
    loading.value = true
    models.value = await getModels()
  } catch (error) {
    console.error('加载模型列表失败:', error)
    toast.error('加载失败：' + error.message)
  } finally {
    loading.value = false
  }
}

function getProviderName(provider) {
  const names = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    alibaba: 'Alibaba',
    deepseek: 'DeepSeek',
    zhipu: 'Zhipu AI',
  }
  return names[provider] || provider
}

function openAddDialog() {
  editingModel.value = null
  showModelDialog.value = true
}

function handleEdit(model) {
  editingModel.value = { ...model }
  showModelDialog.value = true
}

function closeModelDialog() {
  showModelDialog.value = false
  editingModel.value = null
}

async function handleSave(modelData) {
  try {
    if (editingModel.value?.id) {
      await updateModel(editingModel.value.id, modelData)
      toast.success('模型更新成功')
    } else {
      await createModel(modelData)
      toast.success('模型创建成功')
    }
    await loadModels()
    closeModelDialog()
  } catch (error) {
    console.error('保存模型失败:', error)
    toast.error('保存失败：' + error.message)
  }
}

function handleDelete(id) {
  modelToDelete.value = id
  showDeleteConfirm.value = true
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  modelToDelete.value = null
}

async function confirmDelete() {
  try {
    await deleteModel(modelToDelete.value)
    await loadModels()
    toast.success('模型删除成功')
  } catch (error) {
    console.error('删除模型失败:', error)
    toast.error('删除失败：' + error.message)
  } finally {
    closeDeleteConfirm()
  }
}

async function toggleEnabled(model) {
  try {
    await updateModel(model.id, { isEnabled: !model.isEnabled })
    await loadModels()
    toast.success(model.isEnabled ? '模型已禁用' : '模型已启用')
  } catch (error) {
    console.error('更新模型状态失败:', error)
    toast.error('更新失败：' + error.message)
  }
}

async function handleTest(model) {
  try {
    testingModelId.value = model.id
    const result = await testModelConnection(model.id)

    if (result.success) {
      const details = result.details?.model
        ? `\n模型: ${result.details.model}\nToken使用: ${JSON.stringify(result.details.usage || {})}`
        : ''
      toast.success(`${result.message}${details}`, 5000)
    } else {
      const errorDetail = result.details?.error ? `\n错误详情: ${result.details.error}` : ''
      toast.error(`${result.message}${errorDetail}`, 5000)
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    toast.error('测试失败：' + error.message)
  } finally {
    testingModelId.value = null
  }
}
</script>

<style scoped>
.model-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

/* Header Styles */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.add-btn, .add-btn-large {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(255, 100, 150, 0.3);
  transition: var(--transition);
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.add-btn:hover, .add-btn-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 100, 150, 0.4);
}

/* Loading State */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: var(--surface-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 30px;
}

/* Models List */
.models-list {
  display: grid;
  gap: 24px;
}

.model-card {
  background: var(--surface-color);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  border: 1px solid rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
}

.model-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.card-content {
  flex: 1;
}

.model-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.provider-badge {
  padding: 4px 10px;
  background: rgba(100, 100, 255, 0.1);
  color: var(--primary-color);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f0f2f5;
  color: var(--text-light);
}

.status-badge.enabled {
  background: #e0f2fe;
  color: #0284c7; /* Sky blue */
}

/* Details Grid */
.model-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px 24px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 0.75rem;
  color: var(--text-light);
  margin-bottom: 4px;
  font-weight: 500;
}

.detail-item .value {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 6px;
  width: fit-content;
}

.description-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Params */
.model-params {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.param-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: #f8f9ff;
  padding: 6px 12px;
  border-radius: 8px;
}

/* Actions */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  color: var(--text-secondary);
}

.action-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-btn.test:hover { color: var(--primary-color); background: #f0f0ff; }
.action-btn.edit:hover { color: #2563eb; background: #eff6ff; }
.action-btn.delete:hover { color: #dc2626; background: #fef2f2; }

.action-btn.toggle.active {
  color: #059669;
  background: #ecfdf5;
}

.action-btn.toggle:not(.active):hover {
  color: #059669;
  background: #d1fae5;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@media (max-width: 640px) {
  .model-card {
    flex-direction: column;
  }
  .card-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

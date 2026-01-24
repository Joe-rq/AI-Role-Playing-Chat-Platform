<template>
  <div class="model-management">
    <header class="page-header">
      <h1>模型管理</h1>
      <button @click="openAddDialog" class="add-btn">➕ 添加模型</button>
    </header>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="models.length === 0" class="empty-state">
      <p>还没有配置任何模型</p>
      <button @click="openAddDialog" class="add-btn-large">添加第一个模型</button>
    </div>

    <div v-else class="models-list">
      <div v-for="model in models" :key="model.id" class="model-card">
        <div class="model-info">
          <div class="model-header">
            <h3>{{ model.name }}</h3>
            <span class="status-badge" :class="{ enabled: model.isEnabled }">
              {{ model.isEnabled ? '已启用' : '已禁用' }}
            </span>
          </div>
          <p class="model-meta">
            <span class="provider-tag">{{ getProviderName(model.provider) }}</span>
            <span class="model-id">{{ model.modelId }}</span>
          </p>
          <p class="api-key">API Key: <code>{{ model.apiKeyMasked }}</code></p>
          <p class="base-url">Base URL: <code>{{ model.baseURL }}</code></p>
          <p v-if="model.description" class="description">{{ model.description }}</p>
          <div class="model-params">
            <span>Temperature: {{ model.defaultTemperature }}</span>
            <span>Max Tokens: {{ model.defaultMaxTokens }}</span>
          </div>
        </div>
        <div class="model-actions">
          <button @click="handleEdit(model)" class="edit-btn">编辑</button>
          <button @click="handleDelete(model.id)" class="delete-btn">删除</button>
          <button
            @click="toggleEnabled(model)"
            class="toggle-btn"
            :class="{ enabled: model.isEnabled }"
          >
            {{ model.isEnabled ? '禁用' : '启用' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <Drawer :visible="showModelDialog" @close="closeModelDialog">
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
import { getModels, createModel, updateModel, deleteModel } from '../services/api'
import Drawer from '../components/Drawer.vue'
import ModelForm from '../components/ModelForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const models = ref([])
const loading = ref(true)
const showModelDialog = ref(false)
const editingModel = ref(null)
const showDeleteConfirm = ref(false)
const modelToDelete = ref(null)

onMounted(async () => {
  await loadModels()
})

async function loadModels() {
  try {
    loading.value = true
    models.value = await getModels()
  } catch (error) {
    console.error('加载模型列表失败:', error)
    alert('加载失败：' + error.message)
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
    } else {
      await createModel(modelData)
    }
    await loadModels()
    closeModelDialog()
  } catch (error) {
    console.error('保存模型失败:', error)
    alert('保存失败：' + error.message)
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
  } catch (error) {
    console.error('删除模型失败:', error)
    alert('删除失败：' + error.message)
  } finally {
    closeDeleteConfirm()
  }
}

async function toggleEnabled(model) {
  try {
    await updateModel(model.id, { isEnabled: !model.isEnabled })
    await loadModels()
  } catch (error) {
    console.error('更新模型状态失败:', error)
    alert('更新失败：' + error.message)
  }
}
</script>

<style scoped>
.model-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.add-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #2563eb;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-state p {
  color: #6b7280;
  font-size: 16px;
  margin-bottom: 24px;
}

.add-btn-large {
  padding: 12px 32px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn-large:hover {
  background: #2563eb;
}

.models-list {
  display: grid;
  gap: 20px;
}

.model-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  transition: box-shadow 0.2s;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.model-info {
  flex: 1;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.model-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.enabled {
  background: #d1fae5;
  color: #065f46;
}

.model-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.provider-tag {
  padding: 2px 8px;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.model-id {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #6b7280;
}

.api-key,
.base-url {
  font-size: 13px;
  color: #6b7280;
  margin: 6px 0;
}

code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.description {
  margin: 12px 0;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
}

.model-params {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
}

.model-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 80px;
}

.model-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn {
  background: #f3f4f6;
  color: #374151;
}

.edit-btn:hover {
  background: #e5e7eb;
}

.delete-btn {
  background: #fee2e2;
  color: #991b1b;
}

.delete-btn:hover {
  background: #fecaca;
}

.toggle-btn {
  background: #f3f4f6;
  color: #374151;
}

.toggle-btn.enabled {
  background: #d1fae5;
  color: #065f46;
}

.toggle-btn:hover {
  opacity: 0.8;
}
</style>

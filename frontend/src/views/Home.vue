<template>
  <div class="home">
    <div class="header">
      <h1>选择角色</h1>
      <div class="header-actions">
        <button class="models-btn" @click="router.push('/models')">⚙️ 模型管理</button>
        <button class="create-btn" @click="showCreateForm = true">+ 创建角色</button>
      </div>
    </div>
    <div class="character-list">
      <div
        v-for="character in characters"
        :key="character.id"
        class="character-card"
        @click="startChat(character.id)"
      >
        <img :src="character.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${character.name}`" :alt="character.name" />
        <div class="info">
          <h3>{{ character.name }}</h3>
          <p>{{ character.description }}</p>
          
          <!-- Tags 展示 -->
          <div v-if="character.tags && character.tags.length" class="tags-display">
            <span v-for="tag in character.tags" :key="tag" class="tag-badge">
              {{ tag }}
            </span>
          </div>
        </div>
        <div class="card-actions" @click.stop>
          <button class="btn-edit" @click="handleEdit(character)" title="编辑">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-delete" @click="confirmDelete(character)" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div v-if="characters.length === 0" class="empty">
      <p>暂无角色，点击上方按钮创建你的第一个角色！</p>
    </div>

    <!-- 创建/编辑角色表单 -->
    <Transition name="modal">
      <div v-if="showCreateForm" class="modal-overlay" @click.self="cancelForm">
        <div class="modal-content">
        <h2>{{ isEditMode ? '编辑角色' : '创建新角色' }}</h2>

        <!-- 角色名称 -->
        <div class="form-field">
          <label class="field-label">
            角色名称
            <span class="required">*</span>
          </label>
          <input v-model="newCharacter.name" placeholder="例如：赛博朋克黑客" />
        </div>

        <!-- 头像URL -->
        <div class="form-field">
          <label class="field-label">头像URL（可选）</label>
          <input v-model="newCharacter.avatar" placeholder="例如：https://example.com/avatar.png" />
          <span class="field-hint">
            留空将根据名称自动生成。您可以去 
            <a href="https://www.dicebear.com/styles/" target="_blank" class="hint-link">DiceBear</a> 
            挑选喜欢的风格并复制链接。
          </span>
        </div>

        <!-- Tags 输入 -->
        <TagsInput v-model="newCharacter.tags" />

        <!-- 系统提示词 -->
        <div class="form-field">
          <label class="field-label">
            系统提示词（角色设定）
            <span class="required">*</span>
          </label>
          <textarea v-model="newCharacter.systemPrompt" placeholder="例如：你是一个来自2077年的顶尖黑客，说话冷淡，喜欢用技术术语..."></textarea>
          <span class="field-hint">定义角色的性格、背景、说话风格等，这是最重要的设定</span>
        </div>

        <!-- 开场白 -->
        <div class="form-field">
          <label class="field-label">开场白</label>
          <textarea v-model="newCharacter.greeting" placeholder="例如：链路已连接...正在扫描你的生物特征...认证通过。"></textarea>
          <span class="field-hint">角色在对话开始时说的第一句话</span>
        </div>

        <!-- 简介 -->
        <div class="form-field">
          <label class="field-label">简介</label>
          <textarea v-model="newCharacter.description" placeholder="例如：赛博世界的顶尖黑客，游走在数据洪流中的幽灵。"></textarea>
          <span class="field-hint">简短描述角色特点，显示在角色卡片上</span>
        </div>

        <!-- Few-shot 示例对话 -->
        <ExampleDialogues v-model="exampleDialogues" />
      
      <!-- 模型配置 -->
      <div class="model-config">
        <h3>AI模型配置（可选）</h3>
        
        <label>
          首选模型:
          <select v-model="newCharacter.preferredModel">
            <option value="">使用默认模型</option>
            <option v-for="model in availableModels" :key="model.id" :value="model.modelId">
              {{ model.name }}
            </option>
          </select>
        </label>
        
        <label>
          创造性 (Temperature): {{ newCharacter.temperature }}
          <input type="range" v-model.number="newCharacter.temperature" 
                 min="0" max="1" step="0.1" />
          <span class="hint">0=严谨客观 | 1=创造发散</span>
        </label>
        
        <label>
          最大回复长度:
          <input type="number" v-model.number="newCharacter.maxTokens" 
                 min="500" max="4000" step="100" placeholder="2000" />
          <span class="hint">建议1000-3000，过大会增加成本</span>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn-primary" @click="handleSubmit">{{ isEditMode ? '保存' : '创建' }}</button>
        <button class="btn-secondary" @click="cancelForm">取消</button>
      </div>
        </div>
      </div>
    </Transition>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      :visible="showDeleteDialog"
      title="确认删除"
      :message="deleteMessage"
      @confirm="handleDelete"
      @cancel="showDeleteDialog = false"
    />

    <!-- 清空历史确认对话框 -->
    <ConfirmDialog
      :visible="showClearHistoryDialog"
      title="清空历史记录"
      :message="clearHistoryMessage"
      @confirm="handleClearHistoryAndDelete"
      @cancel="showClearHistoryDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCharacters, createCharacter, updateCharacter, deleteCharacter, deleteCharacterHistory, getEnabledModels } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import TagsInput from '../components/TagsInput.vue'
import ExampleDialogues from '../components/ExampleDialogues.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const characters = ref([])
const showCreateForm = ref(false)
const isEditMode = ref(false)
const editingCharacterId = ref(null)
const availableModels = ref([])
const exampleDialogues = ref([])
const newCharacter = ref({
  name: '',
  avatar: '',
  systemPrompt: '',
  greeting: '',
  description: '',
  tags: [],
  preferredModel: '',
  temperature: 0.7,
  maxTokens: 2000,
})

const showDeleteDialog = ref(false)
const deleteMessage = ref('')
const characterToDelete = ref(null)
const showClearHistoryDialog = ref(false)
const clearHistoryMessage = ref('')

onMounted(async () => {
  characters.value = await fetchCharacters()

  // 加载已启用的模型列表
  try {
    availableModels.value = await getEnabledModels()
  } catch (error) {
    console.error('加载模型列表失败:', error)
  }
})

function startChat(characterId) {
  router.push(`/chat/${characterId}`)
}

function handleEdit(character) {
  isEditMode.value = true
  editingCharacterId.value = character.id
  newCharacter.value = {
    name: character.name,
    avatar: character.avatar || '',
    systemPrompt: character.systemPrompt,
    greeting: character.greeting || '',
    description: character.description || '',
    tags: character.tags || [],
    preferredModel: character.preferredModel || '',
    temperature: character.temperature ?? 0.7,
    maxTokens: character.maxTokens ?? 2000,
  }
  
  // 加载 Few-shot 示例
  try {
    exampleDialogues.value = character.exampleDialogues 
      ? JSON.parse(character.exampleDialogues)
      : []
  } catch (e) {
    exampleDialogues.value = []
  }
  
  showCreateForm.value = true
}

function confirmDelete(character) {
  characterToDelete.value = character
  deleteMessage.value = `确定要删除角色 "${character.name}" 吗？此操作不可恢复。`
  showDeleteDialog.value = true
}

async function handleDelete() {
  try {
    const { ok, data } = await deleteCharacter(characterToDelete.value.id)

    if (!ok) {
      const message = data.message || '删除失败'
      const hasHistory = data.statusCode === 400 && /对话记录/.test(message)
      if (hasHistory) {
        // 显示清空历史确认对话框
        clearHistoryMessage.value = `${message}\n是否清空该角色历史并继续删除？`
        showClearHistoryDialog.value = true
        return
      }

      toast.error(message)
      return
    }

    characters.value = await fetchCharacters()
    toast.success(data.message || '删除成功')
  } catch (error) {
    console.error('删除操作出错:', error)
    toast.error('网络错误，请稍后再试')
  } finally {
    showDeleteDialog.value = false
    characterToDelete.value = null
  }
}

async function handleClearHistoryAndDelete() {
  try {
    const clearResult = await deleteCharacterHistory(characterToDelete.value.id)
    if (!clearResult.ok) {
      toast.error(clearResult.data.message || '清空历史失败')
      return
    }

    const retry = await deleteCharacter(characterToDelete.value.id)
    if (!retry.ok) {
      toast.error(retry.data.message || '删除失败')
      return
    }

    characters.value = await fetchCharacters()
    toast.success(retry.data.message || '删除成功')
  } catch (error) {
    console.error('删除操作出错:', error)
    toast.error('网络错误，请稍后再试')
  } finally {
    showClearHistoryDialog.value = false
    showDeleteDialog.value = false
    characterToDelete.value = null
  }
}

async function handleSubmit() {
  if (!newCharacter.value.name || !newCharacter.value.systemPrompt) {
    toast.warning('请填写名称和系统提示词')
    return
  }

  try {
    // 序列化 Few-shot 示例（过滤空值）
    const validExamples = exampleDialogues.value.filter(
      ex => ex.user && ex.user.trim() && ex.assistant && ex.assistant.trim()
    )

    const characterData = {
      ...newCharacter.value,
      exampleDialogues: validExamples.length > 0
        ? JSON.stringify(validExamples)
        : null
    }

    // 保存编辑模式状态，因为 cancelForm 会重置它
    const wasEditMode = isEditMode.value

    if (isEditMode.value) {
      await updateCharacter(editingCharacterId.value, characterData)
    } else {
      await createCharacter(characterData)
    }
    characters.value = await fetchCharacters()
    cancelForm()

    // 表单关闭后再显示成功提示，使用保存的状态
    toast.success(wasEditMode ? '角色更新成功' : '角色创建成功')
  } catch (error) {
    toast.error(isEditMode.value ? '更新失败' : '创建失败')
  }
}

function cancelForm() {
  showCreateForm.value = false
  isEditMode.value = false
  editingCharacterId.value = null
  exampleDialogues.value = []
  newCharacter.value = { 
    name: '', 
    avatar: '', 
    systemPrompt: '', 
    greeting: '', 
    description: '', 
    tags: [],
    preferredModel: '',
    temperature: 0.7,
    maxTokens: 2000,
  }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.create-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(255, 100, 150, 0.3);
  transition: var(--transition);
  white-space: nowrap;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 100, 150, 0.4);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.models-btn {
  background: #fff;
  color: var(--text-primary);
  padding: 12px 20px;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.models-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: var(--primary-color);
}


/* Character Grid */
.character-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
  perspective: 1000px;
}

.character-card {
  background: var(--surface-color);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.8);
  position: relative;
  overflow: hidden;
}

.character-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 6px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  opacity: 0;
  transition: var(--transition);
}

.character-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-md);
}

.character-card:hover::before {
  opacity: 1;
}

.character-card img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 20px;
  border: 4px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: var(--transition);
}

.character-card:hover img {
  transform: scale(1.05) rotate(3deg);
}

.character-card h3 {
  font-size: 1.25rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.character-card p {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

/* Tags 展示 */
.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag-badge {
  display: inline-block;
  padding: 3px 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  transition: all 0.2s;
}

.tag-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(102, 126, 234, 0.4);
}

/* Card Actions */
.card-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: var(--transition);
}

.character-card:hover .card-actions {
  opacity: 1;
}

.card-actions button {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.btn-edit {
  color: var(--primary-color);
}

.btn-edit:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.btn-delete {
  color: #ff6b6b;
}

.btn-delete:hover {
  background: #ff6b6b;
  color: white;
  transform: scale(1.1);
}

/* Empty State */
.empty {
  text-align: center;
  padding: 60px;
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.empty p {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

button {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 12px 30px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(255, 100, 150, 0.3);
  transition: var(--transition);
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 100, 150, 0.4);
}

/* Modal Overlay & Content */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* 稍微加深的半透明遮罩 */
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px;
  padding: 32px 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.02);
  position: relative;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.1) transparent;
}

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content {
  animation: modalContentIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-content {
  animation: modalContentOut 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalContentIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modalContentOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

.modal-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 30px;
  color: var(--text-primary);
  text-align: center;
  position: relative;
}

.modal-content input,
.modal-content textarea,
.modal-content select {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 0;
  border: 2px solid transparent;
  border-radius: 12px;
  background: #f4f5f7;
  transition: all 0.2s ease;
  font-size: 1rem;
  color: var(--text-primary);
}

.modal-content input:hover,
.modal-content textarea:hover,
.modal-content select:hover {
  background: #ebedf0;
}

.modal-content input:focus,
.modal-content textarea:focus,
.modal-content select:focus {
  outline: none;
  background: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px var(--primary-weak);
}

.modal-content textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.6;
}

/* 表单字段 */
.form-field {
  margin-bottom: 24px;
}

.field-label {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.field-label .required {
  color: #ff4757;
  margin-left: 4px;
  font-size: 1.2em;
  line-height: 1;
}

.field-hint {
  display: block;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.hint-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.hint-link:hover {
  color: var(--secondary-color);
  text-decoration: underline;
}

.model-config {
  margin: 30px 0;
  padding: 24px;
  background: linear-gradient(to bottom right, #f8f9ff, #f3f4fa);
  border-radius: 16px;
  border: 1px solid rgba(100, 100, 255, 0.1);
}

.model-config h3 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-config h3::before {
  content: '⚙️';
  font-size: 1.2em;
}

.model-config label {
  display: block;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.model-config label:last-child {
  margin-bottom: 0;
}

.model-config select,
.model-config input[type="number"] {
  margin-top: 6px;
  background: #fff;
  border: 1px solid #e0e0e0;
}

.model-config input[type="range"] {
  width: 100%;
  margin: 12px 0 8px;
  accent-color: var(--primary-color);
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  -webkit-appearance: none;
}

.model-config .hint {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.form-actions button {
  padding: 12px 28px;
  font-size: 1rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.form-actions .btn-primary {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  box-shadow: 0 4px 12px rgba(100, 100, 255, 0.25);
}

.form-actions .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(100, 100, 255, 0.35);
}

.form-actions .btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  box-shadow: none;
}

.form-actions .btn-secondary:hover {
  background: #f0f2f5;
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .home { padding: 24px 16px; }
  h1 { font-size: 2rem; margin-bottom: 24px; }
  .character-grid { grid-template-columns: 1fr; }
}
</style>

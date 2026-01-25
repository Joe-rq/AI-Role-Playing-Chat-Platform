<template>
  <div class="model-form">
    <h2>{{ isEdit ? '编辑模型' : '添加模型' }}</h2>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>
          显示名称 <span class="required">*</span>
        </label>
        <input
          v-model="formData.name"
          required
          placeholder="如：GPT-4o Mini - 高性价比"
          maxlength="100"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>
          厂商 <span class="required">*</span>
        </label>
        <select v-model="formData.provider" required class="form-select">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="google">Google (Gemini)</option>
          <option value="alibaba">Alibaba (Qwen)</option>
          <option value="deepseek">DeepSeek</option>
          <option value="zhipu">Zhipu AI (GLM)</option>
        </select>
      </div>

      <div class="form-group">
        <label>
          模型ID <span class="required">*</span>
        </label>
        <input
          v-model="formData.modelId"
          required
          placeholder="如：gpt-4o-mini"
          maxlength="100"
          class="form-input"
        />
        <p class="hint">实际调用API时使用的模型标识符</p>
      </div>

      <div class="form-group">
        <label>
          API Key <span class="required">*</span>
        </label>
        <div class="api-key-input-wrapper">
          <input
            v-model="formData.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            :required="!isEdit"
            :placeholder="isEdit ? '•••••••••••••••• (已加密，留空不修改)' : '输入您的 API Key (sk-...)'"
            autocomplete="new-password"
            class="form-input api-key-input"
          />
          <button type="button" @click="showApiKey = !showApiKey" class="visibility-toggle" :title="showApiKey ? '隐藏' : '显示'">
            <span class="icon">{{ showApiKey ? '🙈' : '👁️' }}</span>
          </button>
        </div>
        <p class="hint" v-if="isEdit">出于安全考虑，系统不显示现有 Key。如需更换，请在此输入新 Key。</p>
      </div>

      <div class="form-group">
        <label>
          Base URL <span class="required">*</span>
        </label>
        <input
          v-model="formData.baseURL"
          required
          type="url"
          placeholder="https://api.openai.com/v1"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label>描述（可选）</label>
        <textarea
          v-model="formData.description"
          placeholder="模型的特点和适用场景"
          rows="3"
          maxlength="500"
          class="form-textarea"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>
            默认Temperature
          </label>
          <input
            type="number"
            v-model.number="formData.defaultTemperature"
            min="0"
            max="2"
            step="0.1"
            class="form-input"
          />
          <p class="hint">0-2之间，越高越随机</p>
        </div>

        <div class="form-group">
          <label>
            默认Max Tokens
          </label>
          <input
            type="number"
            v-model.number="formData.defaultMaxTokens"
            min="1"
            max="32000"
            step="100"
            class="form-input"
          />
          <p class="hint">最大生成长度</p>
        </div>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox">
          <input type="checkbox" v-model="formData.isEnabled" />
          <span>启用此模型</span>
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="save-btn">{{ isEdit ? '保存更改' : '立即添加' }}</button>
        <button type="button" @click="$emit('cancel')" class="cancel-btn">取消</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const isEdit = computed(() => !!props.model?.id)
const showApiKey = ref(false)

const formData = ref({
  name: props.model?.name || '',
  modelId: props.model?.modelId || '',
  provider: props.model?.provider || 'openai',
  apiKey: '', // 编辑时不显示原API Key，只有用户输入新的才更新
  baseURL: props.model?.baseURL || 'https://api.openai.com/v1',
  isEnabled: props.model?.isEnabled ?? true,
  defaultTemperature: props.model?.defaultTemperature ?? 0.7,
  defaultMaxTokens: props.model?.defaultMaxTokens ?? 2000,
  description: props.model?.description || '',
})

function handleSubmit() {
  // 如果是编辑且API Key为空，则不传apiKey字段（不更新）
  const data = { ...formData.value }
  if (isEdit.value && !data.apiKey) {
    delete data.apiKey
  }
  emit('save', data)
}
</script>

<style scoped>
.model-form {
  padding: 24px;
}

h2 {
  margin: 0 0 32px 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
}

.form-group {
  margin-bottom: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

label {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.required {
  color: #ff4757;
  margin-left: 4px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: #f4f5f7;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:hover,
.form-select:hover,
.form-textarea:hover {
  background: #ebedf0;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  background: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px var(--primary-weak);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
}

.api-key-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.api-key-input {
  padding-right: 48px !important; /* 为右侧按钮留出空间 */
}

.visibility-toggle {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 1.2rem;
}

.visibility-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

.form-input::placeholder {
  color: #a0aec0;
  font-size: 0.9rem;
}

.hint {
  margin: 8px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.checkbox-group {
  margin-top: 32px;
  background: #f8f9ff;
  padding: 16px;
  border-radius: 12px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.checkbox span {
  font-weight: 500;
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 40px;
}

button {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  box-shadow: 0 4px 12px rgba(100, 100, 255, 0.25);
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(100, 100, 255, 0.35);
}

.cancel-btn {
  background: transparent;
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background: #f0f2f5;
  color: var(--text-primary);
}
</style>


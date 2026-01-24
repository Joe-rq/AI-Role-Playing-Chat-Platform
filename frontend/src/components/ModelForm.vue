<template>
  <div class="model-form">
    <h2>{{ isEdit ? '编辑模型' : '添加模型' }}</h2>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>
          显示名称 <span class="required">*</span>
          <input
            v-model="formData.name"
            required
            placeholder="如：GPT-4o Mini - 高性价比"
            maxlength="100"
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          厂商 <span class="required">*</span>
          <select v-model="formData.provider" required>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="google">Google (Gemini)</option>
            <option value="alibaba">Alibaba (Qwen)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="zhipu">Zhipu AI (GLM)</option>
          </select>
        </label>
      </div>

      <div class="form-group">
        <label>
          模型ID <span class="required">*</span>
          <input
            v-model="formData.modelId"
            required
            placeholder="如：gpt-4o-mini"
            maxlength="100"
          />
        </label>
        <p class="hint">实际调用API时使用的模型标识符</p>
      </div>

      <div class="form-group">
        <label>
          API Key <span class="required">*</span>
          <div class="api-key-input">
            <input
              v-model="formData.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              :required="!isEdit"
              :placeholder="isEdit ? '留空则不修改' : 'sk-...'"
              minlength="10"
            />
            <button type="button" @click="showApiKey = !showApiKey" class="toggle-btn">
              {{ showApiKey ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>
        </label>
        <p class="hint" v-if="isEdit">留空则保持原API Key不变</p>
      </div>

      <div class="form-group">
        <label>
          Base URL <span class="required">*</span>
          <input
            v-model="formData.baseURL"
            required
            type="url"
            placeholder="https://api.openai.com/v1"
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          描述（可选）
          <textarea
            v-model="formData.description"
            placeholder="模型的特点和适用场景"
            rows="3"
            maxlength="500"
          ></textarea>
        </label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>
            默认Temperature
            <input
              type="number"
              v-model.number="formData.defaultTemperature"
              min="0"
              max="2"
              step="0.1"
            />
          </label>
          <p class="hint">0-2之间，越高越随机</p>
        </div>

        <div class="form-group">
          <label>
            默认Max Tokens
            <input
              type="number"
              v-model.number="formData.defaultMaxTokens"
              min="1"
              max="32000"
              step="100"
            />
          </label>
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
        <button type="button" @click="$emit('cancel')" class="cancel-btn">取消</button>
        <button type="submit" class="save-btn">保存</button>
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
  padding: 20px;
  max-width: 600px;
}

h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #333;
}

.required {
  color: #e74c3c;
}

input[type="text"],
input[type="password"],
input[type="url"],
input[type="number"],
select,
textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

textarea {
  resize: vertical;
  min-height: 60px;
}

.api-key-input {
  display: flex;
  gap: 8px;
}

.api-key-input input {
  flex: 1;
}

.toggle-btn {
  padding: 8px 12px;
  background: #f3f4f6;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: #e5e7eb;
}

.hint {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.checkbox-group {
  margin-top: 24px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.save-btn {
  background: #3b82f6;
  color: white;
}

.save-btn:hover {
  background: #2563eb;
}
</style>


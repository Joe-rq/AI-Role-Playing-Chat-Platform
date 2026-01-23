<template>
  <div class="tags-input-container">
    <label>性格标签</label>
    <div class="tags-list">
      <span v-for="(tag, index) in modelValue" :key="index" class="tag">
        {{ tag }}
        <button @click="removeTag(index)" class="remove-btn" type="button">×</button>
      </span>
      <input
        v-model="inputValue"
        @keydown.enter.prevent="addTag"
        @blur="addTag"
        placeholder="输入标签按回车添加"
        :disabled="modelValue.length >= maxTags"
        class="tag-input"
      />
    </div>
    <p class="hint">{{ modelValue.length }}/{{ maxTags }} 个标签</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxTags: {
    type: Number,
    default: 8
  },
  maxLength: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['update:modelValue'])

const inputValue = ref('')

function addTag() {
  const tag = inputValue.value.trim()
  
  // 验证：非空、不重复、不超长、不超数量
  if (!tag) return
  if (props.modelValue.includes(tag)) {
    alert('标签已存在')
    inputValue.value = ''
    return
  }
  if (tag.length > props.maxLength) {
    alert(`标签长度不能超过${props.maxLength}个字符`)
    return
  }
  if (props.modelValue.length >= props.maxTags) {
    alert(`最多只能添加${props.maxTags}个标签`)
    return
  }
  
  // 添加标签
  emit('update:modelValue', [...props.modelValue, tag])
  inputValue.value = ''
}

function removeTag(index) {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}
</script>

<style scoped>
.tags-input-container {
  margin-bottom: 16px;
}

.tags-input-container label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: var(--radius-sm);
  background: #fdfdfd;
  min-height: 60px;
  transition: var(--transition);
}

.tags-list:focus-within {
  border-color: var(--primary-color);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(100, 100, 255, 0.1);
}

.tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 28px 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
  transition: all 0.2s;
}

.tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.remove-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.remove-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: translateY(-50%) scale(1.15);
}

.tag-input {
  flex: 1;
  min-width: 120px;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
  padding: 4px;
}

.tag-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 6px;
  margin-bottom: 0;
}
</style>

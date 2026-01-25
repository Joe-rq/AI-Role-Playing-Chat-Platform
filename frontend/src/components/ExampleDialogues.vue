<template>
  <div class="example-dialogues">
    <h3>示例对话 (Few-shot)</h3>
    <p class="desc">帮助AI更好地理解角色说话方式和个性</p>
    
    <div v-for="(example, index) in examples" :key="index" class="example-item">
      <div class="example-num">示例 {{ index + 1 }}</div>
      <input 
        v-model="example.user" 
        placeholder="用户：你好" 
        class="example-input"
      />
      <textarea 
        v-model="example.assistant" 
        placeholder="角色：哼，本大小姐才不会因为你的问候就高兴呢！🌟"
        class="example-textarea"
      ></textarea>
      <button @click="removeExample(index)" class="btn-remove">删除</button>
    </div>
    
    <button @click="addExample" class="btn-add">+ 添加示例对话</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const examples = ref([...props.modelValue])

// 监听外部变化
watch(() => props.modelValue, (newVal) => {
  examples.value = [...newVal]
}, { deep: true })

// 监听内部变化并emit
watch(examples, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

function addExample() {
  examples.value.push({ user: '', assistant: '' })
}

function removeExample(index) {
  examples.value.splice(index, 1)
}
</script>

<style scoped>
.example-dialogues {
  margin: 30px 0;
  padding: 24px;
  background: #f8f9ff;
  border-radius: 16px;
  border: 1px solid rgba(100, 100, 255, 0.1);
}

.example-dialogues h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.example-dialogues .desc {
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.example-item {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.03);
  position: relative;
  transition: all 0.2s ease;
}

.example-item:hover {
  box-shadow: 0 6px 16px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.example-num {
  font-size: 0.8rem;
  color: var(--primary-color);
  margin-bottom: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-input,
.example-textarea {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 12px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #f4f5f7;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.example-textarea {
  min-height: 80px;
  resize: vertical;
  line-height: 1.6;
}

.example-input:focus,
.example-textarea:focus {
  outline: none;
  background: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px var(--primary-weak);
}

.btn-remove {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  font-size: 0.8rem;
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 600;
}

.btn-remove:hover {
  background: #ff4757;
  color: white;
}

.btn-add {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 2px dashed #cbd5e1;
  color: var(--text-secondary);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-add:hover {
  background: #fff;
  border-color: var(--primary-color);
  color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(100, 100, 255, 0.1);
}
</style>

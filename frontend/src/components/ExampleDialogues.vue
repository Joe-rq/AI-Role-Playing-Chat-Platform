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
  margin: 20px 0;
  padding: 16px;
  background: rgba(255, 193, 7, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.example-dialogues h3 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.example-dialogues .desc {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  color: #666;
}

.example-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #eee;
  position: relative;
}

.example-num {
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 8px;
  font-weight: 600;
}

.example-input {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.example-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 60px;
  resize: vertical;
  font-size: 0.9rem;
}

.example-input:focus,
.example-textarea:focus {
  outline: none;
  border-color: #ffc107;
}

.btn-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  font-size: 0.75rem;
  background: #fee;
  color: #d63031;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #d63031;
  color: white;
}

.btn-add {
  width: 100%;
  padding: 10px;
  background: white;
  border: 2px dashed #ffc107;
  color: #ffc107;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #fff9e6;
  border-style: solid;
}
</style>

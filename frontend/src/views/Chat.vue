<template>
  <div class="chat-page">
    <header class="chat-header">
      <button @click="goBack">返回</button>
      <div class="character-info" v-if="character">
        <img :src="character.avatar || '/default-avatar.png'" :alt="character.name" />
        <span>{{ character.name }}</span>
      </div>
    </header>

    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', msg.role]"
      >
        <div class="bubble">
          <div v-html="renderMarkdown(msg.content)"></div>
          <img v-if="msg.imageUrl" :src="msg.imageUrl" class="message-image" />
        </div>
      </div>
      <div v-if="isLoading" class="message assistant">
        <div class="bubble typing">
          <span class="cursor">▌</span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <div v-if="previewImage" class="image-preview">
        <img :src="previewImage" />
        <button @click="clearImage">✕</button>
      </div>
      <div class="input-row">
        <label class="upload-btn">
          📷
          <input type="file" accept="image/*" @change="handleImageSelect" hidden />
        </label>
        <input
          v-model="inputText"
          @keyup.enter="sendMessage"
          placeholder="输入消息..."
          :disabled="isLoading"
        />
        <button @click="sendMessage" :disabled="isLoading || !inputText.trim()">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { fetchCharacter, streamChat, uploadImage } from '../services/api'

const route = useRoute()
const router = useRouter()
const md = new MarkdownIt()

const character = ref(null)
const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const previewImage = ref(null)
const uploadedImageUrl = ref(null)

onMounted(async () => {
  const characterId = parseInt(route.params.characterId)
  character.value = await fetchCharacter(characterId)
  // 添加开场白
  if (character.value.greeting) {
    messages.value.push({
      role: 'assistant',
      content: character.value.greeting,
    })
  }
})

function goBack() {
  router.push('/')
}

function renderMarkdown(content) {
  return md.render(content || '')
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  // 预览
  previewImage.value = URL.createObjectURL(file)
  // 上传
  const result = await uploadImage(file)
  uploadedImageUrl.value = result.url
}

function clearImage() {
  previewImage.value = null
  uploadedImageUrl.value = null
}

async function sendMessage() {
  if (!inputText.value.trim() && !uploadedImageUrl.value) return
  if (isLoading.value) return

  const userMessage = {
    role: 'user',
    content: inputText.value,
    imageUrl: uploadedImageUrl.value,
  }
  messages.value.push(userMessage)
  await scrollToBottom()

  const history = messages.value.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }))

  const currentMessage = inputText.value
  const currentImage = uploadedImageUrl.value
  inputText.value = ''
  clearImage()
  isLoading.value = true

  // 添加空的 assistant 消息用于流式填充
  const assistantMessage = { role: 'assistant', content: '' }
  messages.value.push(assistantMessage)
  await scrollToBottom()

  try {
    for await (const chunk of streamChat(
      character.value.id,
      currentMessage,
      history,
      currentImage
    )) {
      assistantMessage.content += chunk
      await scrollToBottom()
    }
  } catch (error) {
    assistantMessage.content = `错误: ${error.message}`
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 0 50px rgba(0,0,0,0.05);
}

/* Header */
.chat-header {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10;
}

.chat-header button {
  color: var(--primary-color);
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: var(--primary-weak);
  transition: var(--transition);
}

.chat-header button:hover {
  background: rgba(100, 100, 255, 0.1);
}

.character-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.character-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary-color);
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 100px;
  scroll-behavior: smooth;
}

.message {
  display: flex;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 1rem;
  line-height: 1.6;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.message.user .bubble {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .bubble {
  background: white;
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0,0,0,0.05);
}

.message-image {
  max-width: 100%;
  border-radius: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Markdown Styles within Bubble */
.bubble :deep(p) { margin-bottom: 8px; }
.bubble :deep(p:last-child) { margin-bottom: 0; }
.bubble :deep(code) {
  background: rgba(0,0,0,0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
.message.user .bubble :deep(code) { background: rgba(255,255,255,0.2); }

/* Input Area */
.input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid rgba(0,0,0,0.05);
  position: relative;
}

.image-preview {
  position: absolute;
  top: -80px;
  left: 20px;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  animation: fadeIn 0.3s ease;
}

.image-preview img {
  height: 60px;
  width: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.image-preview button {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(255, 71, 87, 0.4);
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #f8fafe;
  padding: 8px;
  border-radius: 30px;
  border: 1px solid rgba(0,0,0,0.05);
  transition: var(--transition);
}

.input-row:focus-within {
  background: white;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(100, 100, 255, 0.05);
}

.upload-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  background: white;
  transition: var(--transition);
  color: var(--text-secondary);
}

.upload-btn:hover {
  background: #eee;
  color: var(--primary-color);
}

input[type="text"] {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 8px;
  font-size: 1rem;
  color: var(--text-primary);
}

.input-row button {
  background: var(--primary-color);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: var(--transition);
}

.input-row button:disabled {
  background: #ddd;
  cursor: not-allowed;
  transform: none !important;
}

.input-row button:not(:disabled):hover {
  transform: scale(1.1);
  background: var(--primary-hover);
}

/* Typing Cursor */
.cursor {
  display: inline-block;
  animation: blink 1s infinite;
  color: var(--primary-color);
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (max-width: 640px) {
  .chat-page { max-width: 100%; }
  .bubble { max-width: 90%; font-size: 0.95rem; }
  .chat-header { padding: 12px 16px; }
  .input-area { padding: 12px; }
}
</style>

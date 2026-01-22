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
      <!-- Image Preview -->
      <div v-if="previewImage" class="image-preview">
        <img :src="previewImage" />
        <button @click="clearImage" class="close-btn">✕</button>
      </div>

      <!-- Main Input Card -->
      <div class="input-card">
        <textarea
          v-model="inputText"
          @keydown.enter.prevent="sendMessage"
          placeholder="有问题，尽管问..."
          :disabled="isLoading"
          class="chat-textarea"
          rows="1"
          @input="autoResize"
        ></textarea>
        
        <div class="toolbar">
          <div class="left-tools">
            <label class="tool-btn" title="上传图片">
              <span class="icon">📷</span>
              <input type="file" accept="image/*" @change="handleImageSelect" hidden />
            </label>
          </div>
          
          <div class="right-tools">
            <button 
              @click="sendMessage" 
              class="send-btn"
              :disabled="isLoading || (!inputText.trim() && !uploadedImageUrl)"
            >
              <span v-if="isLoading" class="loader"></span>
              <span v-else>➤</span>
            </button>
          </div>
        </div>
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
  if (character.value.greeting) {
    messages.value.push({ role: 'assistant', content: character.value.greeting })
  }
})

function goBack() { router.push('/') }
function renderMarkdown(content) { return md.render(content || '') }

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  previewImage.value = URL.createObjectURL(file)
  const result = await uploadImage(file)
  uploadedImageUrl.value = result.url
}

function clearImage() {
  previewImage.value = null
  uploadedImageUrl.value = null
}

function autoResize(event) {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
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
  // Reset height
  const textarea = document.querySelector('.chat-textarea');
  if(textarea) textarea.style.height = 'auto';

  clearImage()
  isLoading.value = true

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
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 0 50px rgba(0,0,0,0.05);
}

.chat-header {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10;
}

.chat-header button {
  color: var(--text-secondary);
  font-weight: 500;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: #f0f2f5;
  transition: var(--transition);
}

.chat-header button:hover { background: #e4e6ea; color: var(--text-primary); }

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
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  padding-bottom: 40px;
  scroll-behavior: smooth;
}

.message { display: flex; margin-bottom: 24px; animation: fadeIn 0.3s ease; }
.message.user { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  padding: 16px 24px;
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
}

/* Input Area Redesign */
.input-area {
  padding: 24px;
  background: transparent;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.input-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  padding: 16px 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.3s ease;
}

.input-card:focus-within {
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  border-color: var(--primary-color);
}

.chat-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 1.1rem;
  color: var(--text-primary);
  min-height: 28px;
  max-height: 200px;
  line-height: 1.5;
  font-family: inherit;
  background: transparent;
}

.chat-textarea::placeholder { color: #9ca3af; }

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-tools {
  display: flex;
  gap: 16px;
  align-items: center;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 500;
}

.tool-btn:hover {
  background: #f3f4f6;
  color: var(--primary-color);
}

.tool-btn .icon { font-size: 1.2rem; }

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #111827; /* Dark black/grey like image */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #e5e7eb;
  cursor: not-allowed;
  color: #9ca3af;
}

/* Image Preview */
.image-preview {
  position: absolute;
  top: -90px;
  left: 24px;
  background: white;
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  animation: fadeIn 0.3s ease;
  z-index: 5;
}

.image-preview img {
  height: 80px;
  border-radius: 12px;
}

.close-btn {
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.loader {
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .chat-page { max-width: 100%; box-shadow: none; }
  .input-area { padding: 16px; max-width: 100%; }
  .bubble { max-width: 90%; }
}

</style>

<template>
  <div class="home">
    <h1>选择角色</h1>
    <div class="character-list">
      <div
        v-for="character in characters"
        :key="character.id"
        class="character-card"
        @click="startChat(character.id)"
      >
        <img :src="character.avatar || '/default-avatar.png'" :alt="character.name" />
        <div class="info">
          <h3>{{ character.name }}</h3>
          <p>{{ character.description }}</p>
        </div>
      </div>
    </div>
    <div v-if="characters.length === 0" class="empty">
      <p>暂无角色，请先创建</p>
      <button @click="showCreateForm = true">创建角色</button>
    </div>

    <!-- 创建角色表单 -->
    <div v-if="showCreateForm" class="create-form">
      <h2>创建新角色</h2>
      <input v-model="newCharacter.name" placeholder="角色名称" />
      <input v-model="newCharacter.avatar" placeholder="头像URL（可选）" />
      <textarea v-model="newCharacter.systemPrompt" placeholder="系统提示词（角色设定）"></textarea>
      <textarea v-model="newCharacter.greeting" placeholder="开场白"></textarea>
      <textarea v-model="newCharacter.description" placeholder="简介"></textarea>
      <div class="form-actions">
        <button @click="handleCreate">创建</button>
        <button @click="showCreateForm = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCharacters, createCharacter } from '../services/api'

const router = useRouter()
const characters = ref([])
const showCreateForm = ref(false)
const newCharacter = ref({
  name: '',
  avatar: '',
  systemPrompt: '',
  greeting: '',
  description: '',
})

onMounted(async () => {
  characters.value = await fetchCharacters()
})

function startChat(characterId) {
  router.push(`/chat/${characterId}`)
}

async function handleCreate() {
  if (!newCharacter.value.name || !newCharacter.value.systemPrompt) {
    alert('请填写名称和系统提示词')
    return
  }
  await createCharacter(newCharacter.value)
  characters.value = await fetchCharacters()
  showCreateForm.value = false
  newCharacter.value = { name: '', avatar: '', systemPrompt: '', greeting: '', description: '' }
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 40px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
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
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

/* Create Form Modal */
.create-form {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  width: 90%;
  max-width: 500px;
  z-index: 100;
  border: 1px solid rgba(255,255,255,0.5);
  animation: fadeIn 0.3s ease;
}

.create-form h2 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

.create-form input,
.create-form textarea {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid #eee;
  border-radius: var(--radius-sm);
  background: #fdfdfd;
  transition: var(--transition);
  font-size: 1rem;
}

.create-form input:focus,
.create-form textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(100, 100, 255, 0.1);
}

.create-form textarea {
  min-height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.form-actions button:last-child {
  background: #f0f2f5;
  color: var(--text-secondary);
  box-shadow: none;
}
.form-actions button:last-child:hover {
  background: #e4e6ea;
  color: var(--text-primary);
}

/* Backdrop for modal */
.create-form::after {
  content: '';
  position: fixed;
  top: -100vh; left: -100vw; right: -100vw; bottom: -100vh;
  background: rgba(0,0,0,0.3);
  z-index: -1;
  pointer-events: all;
}

@media (max-width: 640px) {
  .home { padding: 24px 16px; }
  h1 { font-size: 2rem; margin-bottom: 24px; }
  .character-grid { grid-template-columns: 1fr; }
}
</style>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['toast-item', `toast-${msg.type}`]"
          @click="remove(msg.id)"
        >
          <div class="toast-icon">
            <svg v-if="msg.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg v-else-if="msg.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <svg v-else-if="msg.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div class="toast-message">{{ msg.message }}</div>
          <button class="toast-close" @click.stop="remove(msg.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast'

const { messages, remove } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: fit-content;
  min-width: 320px;
  max-width: 90vw;
  padding: 14px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.toast-item:hover {
  transform: translateY(2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
}

.toast-success {
  border-bottom: 4px solid #10b981;
  background: linear-gradient(to bottom, white, rgba(16, 185, 129, 0.05));
}

.toast-success .toast-icon {
  color: #10b981;
}

.toast-error {
  border-bottom: 4px solid #ef4444;
  background: linear-gradient(to bottom, white, rgba(239, 68, 68, 0.05));
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning {
  border-bottom: 4px solid #f59e0b;
  background: linear-gradient(to bottom, white, rgba(245, 158, 11, 0.05));
}

.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info {
  border-bottom: 4px solid #3b82f6;
  background: linear-gradient(to bottom, white, rgba(59, 130, 246, 0.05));
}

.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-message {
  flex: 1;
  font-size: 0.95rem;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
  font-weight: 500;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  padding: 0;
  border: none;
  cursor: pointer;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

/* Toast 动画 */
.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    transform: translateY(-40px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes toastOut {
  from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateY(-20px) scale(0.8);
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .toast-container {
    top: 20px;
    width: 90%;
  }

  .toast-item {
    min-width: auto;
    width: 100%;
  }
}
</style>

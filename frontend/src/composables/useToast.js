import { ref } from 'vue'

const messages = ref([])
let messageId = 0

export function useToast() {
  const show = (message, type = 'info', duration = 3000) => {
    const id = messageId++
    messages.value.push({
      id,
      message,
      type,
      duration
    })

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  const remove = (id) => {
    const index = messages.value.findIndex(m => m.id === id)
    if (index > -1) {
      messages.value.splice(index, 1)
    }
  }

  const success = (message, duration) => show(message, 'success', duration)
  const error = (message, duration) => show(message, 'error', duration)
  const warning = (message, duration) => show(message, 'warning', duration)
  const info = (message, duration) => show(message, 'info', duration)

  return {
    messages,
    show,
    remove,
    success,
    error,
    warning,
    info
  }
}

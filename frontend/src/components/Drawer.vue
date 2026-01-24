<template>
  <Transition name="fade">
    <div v-if="visible" class="drawer-overlay" @click="$emit('close')">
      <Transition name="slide">
        <div
          v-if="visible"
          class="drawer-panel"
          @click.stop
          :class="position"
          :style="{ width }"
        >
          <slot />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value)
  },
  width: {
    type: String,
    default: '360px'
  }
})

const emit = defineEmits(['close'])
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.drawer-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.drawer-panel.right {
  right: 0;
}

.drawer-panel.left {
  left: 0;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from.right,
.slide-leave-to.right {
  transform: translateX(100%);
}

.slide-enter-from.left,
.slide-leave-to.left {
  transform: translateX(-100%);
}
</style>

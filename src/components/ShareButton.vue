<template>
  <button
    type="button"
    class="footer-link share-button"
    :title="copied ? $t('share-copied') : title"
    :aria-label="title"
    @click="share"
  >
    <img src="/assets/share.svg" alt="" class="footer-icon" />
    <span v-if="copied" class="copied-tooltip">{{ $t('share-copied') }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  // What is shared (card or section name), quoted in the copied text
  name: { type: String, required: true },
  // Absolute link to what is shared
  url: { type: String, required: true },
  // Hover label
  title: { type: String, default: '' },
})

const { t } = useI18n()
const settings = useSettingsStore()
const copied = ref(false)

async function share() {
  const user = settings.wikimediaUsername.trim() || 'Guest'
  try {
    await navigator.clipboard.writeText(t('share-text', { name: props.name, user, url: props.url }))
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}
</script>

<style scoped>
.share-button {
  border: none;
  background: none;
  cursor: pointer;
}

.copied-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  margin-bottom: 0.5rem;
  pointer-events: none;
  animation: fadeIn 0.2s ease;
}

.copied-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>

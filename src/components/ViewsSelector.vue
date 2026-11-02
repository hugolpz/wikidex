<template>
  <button class="views-selector" :title="title" @click="cycleView">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="views-selector-icon"
    >
      <template v-if="mode === 'compact'">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </template>
      <!-- Open paths: `fill="none"` on each, because the CSS below fills the icon by default -->
      <template v-else-if="mode === 'carousel'">
        <path fill="none" stroke-width="4" d="m15 5.2 6.2 6.2v1.2l-6.1 6.1" />
        <path fill="none" stroke-width="4" d="m8.6 5.2-6.2 6.2v1.2l6.1 6.1" />
      </template>
      <template v-else>
        <rect x="2" y="2" width="20" height="7" />
        <rect x="2" y="14" width="20" height="7" />
      </template>
    </svg>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Three views, cycled by the button: expanded --> compact --> carousel --> expanded.
// Expanded/compact is a saved setting; the carousel is the ?carousel URL parameter.
const inCarousel = computed(() => {
  const value = route.query.carousel
  return value !== undefined && !['0', 'false', 'off'].includes(String(value))
})
const mode = computed(() => {
  if (inCarousel.value) return 'carousel'
  return settings.compactView ? 'compact' : 'expanded'
})
const title = computed(() =>
  t({ compact: 'view-compact', carousel: 'view-carousel', expanded: 'view-expand' }[mode.value]),
)

function setCarousel(on) {
  const query = { ...route.query }
  if (on) query.carousel = null
  else delete query.carousel
  router.replace({ query })
}

function cycleView() {
  // The carousel only exists on gallery pages
  const canCarousel = route.name !== 'settings'
  if (mode.value === 'expanded') {
    settings.compactView = true
  } else if (mode.value === 'compact' && canCarousel) {
    setCarousel(true)
  } else {
    if (inCarousel.value) setCarousel(false)
    settings.compactView = false
  }
}
</script>

<style scoped>
.views-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border: none;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}
.views-selector:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
.views-selector-icon {
  fill: currentColor;
}
@media (max-width: 480px) {
  .views-selector {
    padding: 0.4rem;
  }
  .views-selector-icon {
    width: 18px;
    height: 18px;
  }
}
</style>

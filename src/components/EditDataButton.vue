<template>
  <a
    :href="editUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="footer-link edit-data-button"
    :title="hasUsername ? $t('link-edit-list-logged-in') : $t('link-edit-list-logged-out')"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      width="24"
      height="24"
      viewBox="0 0 20 20"
      class="footer-icon edit-icon"
    >
      <g v-html="cdxIconEdit"></g>
    </svg>
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { cdxIconEdit } from '@wikimedia/codex-icons'

const props = defineProps({
  page: {
    type: String,
    required: false,
    default: '',
  },
  section: {
    type: String,
    required: false,
    default: '',
  },
  editintro: {
    type: String,
    required: false,
    default: '',
  },
  preload: {
    type: String,
    required: false,
    default: '',
  },
})

const settings = useSettingsStore()

const hasUsername = computed(
  () => settings.wikimediaUsername && settings.wikimediaUsername.trim() !== '',
)

const editUrl = computed(() => {
  const baseUrl = `https://meta.wikimedia.org/w/index.php?title=Special:UserLogin&returnto=`
  const returntoQuery = `action=edit&section=${props.section}&veswitched=1&editintro=${props.editintro}&preload=${props.preload}`
  //if (pageExists.value === true ) {
  return `${baseUrl}${encodeURIComponent(props.page)}&returntoquery=${encodeURIComponent(returntoQuery)}`
})
</script>

<style scoped>
.edit-data-button {
  color: inherit;
}

.edit-icon {
  fill: currentColor;
}
</style>

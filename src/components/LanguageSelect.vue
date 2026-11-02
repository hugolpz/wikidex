<template>
  <div class="language-selector">
    <select id="language-select" v-model="locale" class="language-select" @change="changeLanguage">
      <option v-for="locale in Object.keys(languagesMenu)" :key="locale" :value="locale">
        {{ getLanguageName(locale) }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

// `locale` is the single source of truth, shared with the ?uselang= URL parameter
const { locale } = useI18n()
const route = useRoute()
const router = useRouter()

const languagesMenu = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  pl: 'Polski',
  zh: '中文',
}

function getLanguageName(localeCode) {
  return languagesMenu[localeCode] || localeCode
}

// The saved language is applied at startup (see i18n/index.js); here the user picks one:
// remember it, and mirror it in the URL.
function changeLanguage() {
  localStorage.setItem('preferred-locale', locale.value)
  router.replace({ query: { ...route.query, uselang: locale.value } })
}
</script>

<style scoped>
.language-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.language-label {
  font-weight: 600;
  font-size: 14px;
  color: white;
}

.language-select {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 14px;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.language-select option {
  background-color: #2c3e50;
  color: white;
}

.language-select:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.language-select:focus {
  outline: none;
  border-color: white;
  box-shadow: 0 0 0 1px white;
}

@media (max-width: 768px) {
  .language-select {
    padding: 0.4rem 0.8rem;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .language-select {
    padding: 0.35rem 0.6rem;
    font-size: 12px;
  }
}
</style>

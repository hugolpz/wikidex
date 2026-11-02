<template>
  <header class="topbar" :class="{ 'topbar--compact': settings.compactView }">
    <div class="topbar-container">
      <router-link :to="homeRoute" class="topbar-title">
        <h1 v-if="subdomainType === 'wikidex'">WikiDex</h1>
        <h1 v-else>WikiDex</h1>
        <p class="tagline">{{ $t('app-tagline') }}</p>
      </router-link>

      <div class="topbar-actions">
        <UsernameInput />
        <LanguageSelect />
        <InstallButton />
        <SearchButton />
        <ViewsSelector />
        <EditDataButton
          page="Special:MyPage/WikiDex"
          editintro="WikiDex/Guideline"
          preload="WikiDex/Preload"
        />

        <router-link to="/settings" class="settings-button" :title="$t('settings-title')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            class="settings-icon"
          >
            <g v-html="cdxIconSettings"></g>
          </svg>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import LanguageSelect from './LanguageSelect.vue'
import UsernameInput from './UsernameInput.vue'
import EditDataButton from './EditDataButton.vue'
import InstallButton from './InstallButton.vue'
import ViewsSelector from './ViewsSelector.vue'
import SearchButton from './SearchButton.vue'
import { useSettingsStore } from '@/stores/settings'
import { cdxIconSettings } from '@wikimedia/codex-icons'

const settings = useSettingsStore()

const homeRoute = computed(() => {
  if (settings.wikimediaUsername && settings.wikimediaUsername.trim() !== '') {
    return `/User:${settings.wikimediaUsername}`
  }
  return '/'
})

/**
 * Detects which subdomain type the app is running on
 * @returns {'wikidex' | 'wikidex' | 'none'}
 */
const detectSubdomain = () => {
  const hostname = window.location.hostname.toLowerCase()

  if (hostname.includes('wikidex')) {
    return 'wikidex'
  } else if (hostname.includes('wikidex')) {
    return 'wikidex'
  } else {
    return 'none'
  }
}

// Get current subdomain type
const subdomainType = detectSubdomain()
console.log('[TopBar] Detected subdomain type:', subdomainType)
</script>

<style scoped>
.topbar {
  background-color: #2c3e50;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}
.topbar * {
  color: inherit;
}

.topbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.topbar-title {
  text-decoration: none;
}

.topbar-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  transition: opacity 0.2s;
}

.topbar-title .tagline {
  font-size: 0.875rem;
  font-weight: 400;
  margin: 0;
  opacity: 0.8;
  font-style: italic;
}

.topbar-title:hover h1 {
  opacity: 0.8;
}

.topbar--compact .topbar-title {
  display: none;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transition: background-color 0.2s;
  text-decoration: none;
}

.settings-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.settings-icon {
  fill: currentColor;
}

.topbar .has-username {
  text-align: right;
  font-weight: 900;
}

@media (max-width: 768px) {
  .topbar-container {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .topbar-title h1 {
    font-size: 1.25rem;
  }

  .topbar-title .tagline {
    font-size: 0.8rem;
  }

  .topbar-actions {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .topbar-container {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .topbar-title h1 {
    font-size: 1.1rem;
    text-align: center;
  }

  .topbar-title .tagline {
    font-size: 0.75rem;
    text-align: center;
  }

  .topbar-actions {
    gap: 0.5rem;
    justify-content: space-between;
  }

  .settings-button {
    padding: 0.4rem;
  }

  .settings-icon {
    width: 18px;
    height: 18px;
  }
}
</style>

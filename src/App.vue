<script setup>
import TopBar from '@/components/TopBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useFullscreenControl, useFullscreenParam } from '@/utils/fullscreen'

const fullscreen = useFullscreenParam()
const { needsGesture, exit } = useFullscreenControl(fullscreen)
</script>

<template>
  <div id="app" :class="{ fullscreen }">
    <TopBar v-if="!fullscreen" />
    <main>
      <router-view />
    </main>
    <AppFooter v-if="!fullscreen" />
    <button v-if="fullscreen" class="fullscreen-exit" :title="$t('fullscreen-exit')" @click="exit">
      ✕
    </button>
    <p v-if="needsGesture" class="fullscreen-hint">{{ $t('fullscreen-hint') }}</p>
  </div>
</template>

<style>
/* Round-cornered icon buttons shared by the card footer, the share and the edit buttons */
.footer-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem;
  border-radius: 4px;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
  text-decoration: none;
  position: relative;
}

.footer-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}

.footer-link:focus {
  outline: 2px solid #36c;
  outline-offset: 2px;
}

.footer-icon {
  width: 24px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.footer-link:hover .footer-icon {
  opacity: 1;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Helvetica Neue', sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

/* Fullscreen mode (?fullscreen): the carousel takes the whole screen */
.fullscreen .carousel {
  height: 100dvh;
}

.fullscreen-exit {
  position: fixed;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 200;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: rgba(44, 62, 80, 0.5);
  color: white;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.fullscreen-exit:hover,
.fullscreen-exit:focus-visible {
  opacity: 1;
}

/* Browsers need a click/tap before allowing fullscreen */
.fullscreen-hint {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  background: rgba(44, 62, 80, 0.85);
  color: white;
  font-size: 0.875rem;
  pointer-events: none;
}
</style>

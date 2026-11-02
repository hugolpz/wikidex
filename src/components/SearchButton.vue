<template>
  <button
    v-if="route.name !== 'settings'"
    class="search-button"
    :class="{ 'search-button--active': filters.isActive }"
    :title="$t('filters-title')"
    :aria-expanded="filters.expanded"
    @click="filters.expanded = !filters.expanded"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      class="search-icon"
    >
      <g v-html="cdxIconSearch"></g>
    </svg>
  </button>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useFiltersStore } from '@/stores/filters'
import { cdxIconSearch } from '@wikimedia/codex-icons'

const route = useRoute()
const filters = useFiltersStore()
</script>

<style scoped>
.search-button {
  position: relative;
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

.search-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* A filter is on: dot, like a notification badge */
.search-button--active::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffc107;
  border: 1px solid #2c3e50;
}

.search-icon {
  fill: currentColor;
}

@media (max-width: 480px) {
  .search-button {
    padding: 0.4rem;
  }

  .search-icon {
    width: 18px;
    height: 18px;
  }
}
</style>

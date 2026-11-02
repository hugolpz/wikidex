<template>
  <section v-show="filters.expanded" class="card-filters" @keydown.esc="filters.expanded = false">
    <input
      ref="nameInput"
      v-model="filters.name"
      class="filters-name"
      type="search"
      :placeholder="$t('filters-name-placeholder')"
      :aria-label="$t('filters-name')"
    />

    <select v-model="filters.type" :aria-label="$t('filters-type')">
      <option value="">{{ $t('filters-type') }}</option>
      <option v-for="c in categories" :key="c.category" :value="c.category">
        {{ c.emoji }} {{ c.category.replace('_', ' ') }} ({{ typeCounts.counts[c.category] || 0 }})
      </option>
      <option v-if="typeCounts.pending" disabled>
        ⏳ {{ $t('filters-pending') }} ({{ typeCounts.pending }})
      </option>
    </select>

    <select v-model="filters.section" :aria-label="$t('filters-section')">
      <option value="">{{ $t('filters-section') }}</option>
      <option v-for="c in collections" :key="c.collectionTitle" :value="c.collectionTitle">
        {{ c.collectionTitle }} ({{ sectionCounts[c.collectionTitle] }})
      </option>
    </select>

    <span class="filters-count" :title="$t('filters-count')">
      {{ shownCount }}<template v-if="filters.isActive"> / {{ totalCount }}</template>
    </span>

    <div class="filters-actions">
      <button
        v-if="filters.isActive"
        class="filters-pill"
        :title="$t('filters-clear')"
        @click="filters.reset()"
      >
        ✕
      </button>
      <button class="filters-pill" :title="$t('filters-close')" @click="filters.expanded = false">
        ▴
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFiltersStore } from '@/stores/filters'
import { useI18n } from 'vue-i18n'
import { validCategories } from '@/utils/assessCategory'
import { countByType, filterItems, matchesItem } from '@/utils/filterItems'

const props = defineProps({
  collections: { type: Array, default: () => [] },
})

const filters = useFiltersStore()
const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const nameInput = ref(null)

// Item counts, as in the collection nav (type counts only know already-cached cards)
const totalCount = computed(() => props.collections.reduce((n, c) => n + c.list.length, 0))
const shownCount = computed(() => filterItems(props.collections, filters, locale.value).length)
const typeCounts = computed(() => countByType(props.collections, filters, locale.value))
const sectionCounts = computed(() =>
  Object.fromEntries(
    props.collections.map((c) => [
      c.collectionTitle,
      c.list.filter((item) => matchesItem(item, filters, locale.value)).length,
    ]),
  ),
)
const categories = validCategories

// Focus the name field when the panel is opened from the top bar
watch(
  () => filters.expanded,
  async (open) => {
    if (!open) return
    await nextTick()
    nameInput.value?.focus()
  },
)

// filters --> URL (replace, so the back button isn't flooded while typing)
let timer
watch(
  () => [filters.name, filters.type, filters.section],
  ([q, type, section]) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const query = { ...route.query }
      for (const [key, value] of Object.entries({ q: q.trim(), type, section })) {
        if (value) query[key] = value
        else delete query[key]
      }
      router.replace({ query })
    }, 300)
  },
)
</script>

<style scoped>
/* Purple gradient strip with glass pills */
.card-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.5rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-filters input,
.card-filters select {
  min-width: 0;
  max-width: 220px;
  padding: 0.35rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.filters-name {
  flex: 2 1 180px;
  max-width: 320px !important;
}

.card-filters select {
  flex: 1 1 120px;
}

.card-filters input::placeholder {
  color: rgba(255, 255, 255, 0.75);
}

.card-filters input:hover,
.card-filters select:hover,
.card-filters input:focus,
.card-filters select:focus {
  background: rgba(255, 255, 255, 0.25);
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
}

/* Native dropdown lists are drawn by the OS: keep them legible */
.card-filters select option {
  color: #2c3e50;
  background: #fff;
}

/* Count badge */
.filters-count {
  background: rgba(255, 255, 255, 0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.filters-actions {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}

.filters-pill {
  padding: 0.3rem 0.8rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.filters-pill:hover {
  background: rgba(255, 255, 255, 0.25);
}

@media (max-width: 768px) {
  .card-filters {
    padding: 0.5rem 0.75rem;
    gap: 0.4rem 0.5rem;
  }

  .filters-name {
    flex-basis: 100%;
    max-width: none !important;
  }
}
</style>

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** Lowercase and strip diacritics so "Muña" matches "muna" */
const normalize = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Card filters. An empty field means "no filter".
 * Mirrored in the URL as ?q=…&type=…&section=… (see CardFilters.vue).
 */
export const useFiltersStore = defineStore('filters', () => {
  const name = ref('') // free text, matched against scientific, taxon and common names
  const type = ref('') // category key from validCategories (bird, insect, tree, …)
  const section = ref('') // collection (section) title
  const expanded = ref(false)

  // Category of each card loaded in this session (binomial --> category). Reactive, so counts
  // and type filtering follow the cards as they load, even those missing from the local cache.
  const categories = ref({})
  function setCategory(binomial, category) {
    if (categories.value[binomial] !== category) categories.value[binomial] = category
  }

  const isActive = computed(() => !!(name.value.trim() || type.value || section.value))

  function reset() {
    name.value = ''
    type.value = ''
    section.value = ''
  }

  /** Name filter: matches scientific, taxon and common names (unknown ones are skipped) */
  function matchesName({ binomial, taxonName, commonName }) {
    const query = normalize(name.value.trim())
    if (!query) return true
    return normalize([binomial, taxonName, commonName].filter(Boolean).join(' ')).includes(query)
  }

  /** Whether a card passes the name and type filters (the section filter hides whole sections) */
  function matches(card) {
    return matchesName(card) && (!type.value || card.category === type.value)
  }

  return {
    name,
    type,
    section,
    expanded,
    categories,
    setCategory,
    isActive,
    reset,
    matches,
    matchesName,
  }
})

<template>
  <div
    class="card"
    :class="{ 'card--compact': compact }"
    :id="`${binomialName.replace(/ /g, '_')}`"
    :style="{ borderColor: categoryColor, backgroundColor: categoryBackgroundColor }"
  >
    <div v-if="loading" class="card-loading">
      <p>{{ $t('status-loading') }}</p>
    </div>

    <div v-else-if="error" class="card-error">
      <div class="ribbon" :style="{ backgroundColor: categoryColor }">
        {{ binomialName }}
      </div>
      <p class="error-message">{{ error }}</p>
    </div>

    <div v-else class="card-content">
      <!-- Item Name Ribbon -->
      <div class="ribbon ribbon-with-emoji" :style="{ backgroundColor: categoryColor }">
        <StatusIUCN :binomial="`${binomialName}`" :icon="true" />
        <span class="item-name">{{ cardData.taxonName }}</span>
        <span class="category-emoji">{{ categoryEmoji }}</span>
      </div>

      <!-- Common Name Row -->
      <div v-if="cardData.commonName" class="common-name-row">
        {{ cardData.commonName }}
      </div>

      <!-- Image Section -->
      <div v-if="settings.showTaxonImage && cardData.image" class="image-section">
        <div class="ribbon ribbon-label" :style="{ backgroundColor: categoryColor }">
          {{ $t('settings-visibility-item-image') }}
        </div>
        <img :src="cardData.image" :alt="cardData.taxonName" class="image" />
      </div>

      <!-- Range Map Section -->
      <div v-if="settings.showTaxonRange && cardData.rangeMap" class="image-section">
        <div class="ribbon ribbon-label" :style="{ backgroundColor: categoryColor }">
          {{ $t('settings-visibility-item-range') }}
        </div>
        <img :src="cardData.rangeMap" :alt="`Range of ${cardData.taxonName}`" class="image" />

        <RangeMap
          v-if="settings.showRangeMap"
          :binomial="`${binomialName}`"
          :title="`${binomialName}`"
          :maxOccurrences="10000"
        />
      </div>

      <!-- Short Description -->
      <div
        v-if="
          settings.showShortDescription && (cardData.shortDescription || cardData.mediumDescription)
        "
        class="short-description"
      >
        <div class="ribbon ribbon-label" :style="{ backgroundColor: categoryColor }">
          {{ $t('settings-visibility-description-short') }}
        </div>
        <div class="description-content">
          {{ cardData.shortDescription ? 'wd: ' + cardData.shortDescription : '' }}
          {{ cardData.shortDescription && cardData.mediumDescription ? '<br />':'' }}
          {{ cardData.mediumDescription ? 'wp: ' + cardData.mediumDescription : '' }}
        </div>
      </div>

      <!-- Long Description -->
      <div v-if="settings.showLongDescription && cardData.longDescription" class="long-description">
        <div class="ribbon ribbon-label" :style="{ backgroundColor: categoryColor }">
          {{ $t('settings-visibility-description-long') }}
        </div>
        <div class="description-content" v-html="cardData.longDescription"></div>
      </div>

      <!-- IUCN Status -->
      <div v-if="settings.showConservationStatus" class="uicn-image">
        <StatusIUCN :binomial="`${binomialName}`" />
      </div>

      <!-- Card Footer -->
      <div v-if="settings.showCardFooter" class="card-footer">
        <a
          :href="wikipediaUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
          :title="$t('link-wikipedia')"
        >
          <img src="/assets/wikipedia.svg" alt="Wikipedia" class="footer-icon" />
        </a>

        <a
          v-if="cardData.wikidataId"
          :href="`https://www.wikidata.org/wiki/${cardData.wikidataId}`"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
          :title="$t('link-wikidata')"
        >
          <img src="/assets/wikidata.svg" alt="Wikidata" class="footer-icon" />
        </a>

        <a
          v-if="cardData.gbifId"
          :href="`https://www.gbif.org/species/${cardData.gbifId}`"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
          title="GBIF Species Page"
        >
          <img src="/assets/gbif.svg" alt="GBIF" class="footer-icon" />
        </a>

        <a
          :href="`https://mol.org/dashboard/species/info/${binomialName}`"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
          title="Map of Life Species Page"
        >
          <img src="/assets/mapoflife.svg" alt="MapOfLife" class="footer-icon" />
        </a>

        <button
          @click="copyShareLink"
          class="footer-link footer-button"
          :title="showCopiedTooltip ? 'Share link copied!' : 'Share this card'"
        >
          <img src="/assets/share.svg" alt="Share" class="footer-icon" />
          <span v-if="showCopiedTooltip" class="copied-tooltip">Share link copied!</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCardData } from '@/utils/fetchCardData'
import {
  getCategoryColor,
  getCategoryBackgroundColor,
  getCategoryEmoji,
} from '@/utils/assessCategory'
import { useSettingsStore } from '@/stores/settings'
import RangeMap from './RangeMap.vue'
import StatusIUCN from './StatusIUCN.vue'

const props = defineProps({
  binomialName: {
    type: String,
    required: true,
  },
  qid: {
    type: String,
    default: null,
  },
  group: {
    type: String,
    default: 'plant',
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const { locale, t } = useI18n()
const settings = useSettingsStore()
const cardData = ref(null)
const loading = ref(true)
const error = ref(null)
const showCopiedTooltip = ref(false)

// Use assessed category from API data when available, otherwise fall back to prop
const currentCategory = computed(() => {
  return cardData.value?.assessedGroup || props.group || 'unknown'
})

const categoryColor = computed(() => getCategoryColor(currentCategory.value))
const categoryBackgroundColor = computed(() => getCategoryBackgroundColor(currentCategory.value))
const categoryEmoji = computed(() => getCategoryEmoji(currentCategory.value))

const wikipediaUrl = computed(() => {
  if (!cardData.value?.binomialName) return '#'
  const lang = locale.value || 'en'
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(cardData.value.binomialName.replace(/ /g, '_'))}`
})

const shareUrl = computed(() => {
  const baseUrl = window.location.origin + window.location.pathname
  const username = settings.wikimediaUsername.replace(/ /g, '_') || 'Guest'
  const cardId = `${props.binomialName.replace(/ /g, '_')}`
  return `${baseUrl}#/User:${username}#${cardId}`
})

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    showCopiedTooltip.value = true
    setTimeout(() => {
      showCopiedTooltip.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

async function loadData() {
  loading.value = true
  error.value = null

  try {
    const data = await fetchCardData(props.binomialName, locale.value, props.qid)
    cardData.value = data
  } catch (err) {
    error.value = t('status-loading-list-error')
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// Reload data when locale changes
watch(locale, () => {
  loadData()
})
</script>

<style scoped>
.card {
  background-color: white;
  border: 3px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background-color 0.3s;
  display: flex;
  flex-direction: column;
  max-width: 400px;
  height: 100%;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Compact view styles */
.card--compact {
  max-width: 300px;
}

.card--compact .ribbon {
  padding: 0.5rem 0.75rem;
  font-size: 14px;
}

.card--compact .common-name-row {
  padding: 0.5rem 0.75rem;
  font-size: 12px;
}

.card--compact .image {
  max-height: 200px;
}

.card--compact .description-content {
  padding: 0.75rem;
  font-size: 12px;
  line-height: 1.5;
}

.card--compact .card-footer {
  padding: 0.5rem 0.75rem;
}

.card--compact .footer-icon {
  width: 20px;
}

.card--compact .category-emoji {
  width: 1.5em;
  height: 1.5em;
  font-size: 1em;
}

.card--compact .ribbon-label {
  padding: 0.375rem 0.75rem;
  font-size: 12px;
}

.card-loading,
.card-error {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: #d33;
  margin-top: 1rem;
}

.card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ribbon {
  color: black;
  background-color: rgb(180, 250, 180);
  border-collapse: separate;
  display: block;
  font-family: sans-serif;
  font-size: 16px;
  font-weight: 700;
  padding: 0.75rem 1rem;
  text-align: center;
}

.ribbon-with-emoji {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.item-name {
  flex: 1;
  text-align: center;
}

.category-emoji {
  font-size: 1.2em;
  margin-left: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ffffffbb;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
}

.ribbon-label {
  font-size: 14px;
  padding: 0.5rem 1rem;
}

.common-name-row {
  padding: 0.75rem 1rem;
  font-size: 14px;
  font-weight: 400;
  font-style: italic;
  text-align: center;
  background-color: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
  color: #666;
}

.image-section {
  display: flex;
  flex-direction: column;
}

.image {
  width: 100%;
  max-height: 330px;
  object-fit: cover;
}

.short-description,
.medium-description,
.long-description {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.description-content {
  padding: 1rem;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background-color: #f9f9f9;
  flex-grow: 1;
}

.short-description .description-content {
  font-style: italic;
  font-weight: 500;
  text-transform: capitalize;
}

.description-content p {
  margin: 0;
}

.description-content :deep(a) {
  color: #36c;
  text-decoration: none;
}

.description-content :deep(a:hover) {
  text-decoration: underline;
}

.description-content :deep(b),
.description-content :deep(strong) {
  font-weight: 700;
}

.description-content :deep(i),
.description-content :deep(em) {
  font-style: italic;
}

.description-content :deep(sup) {
  font-size: 0.75em;
  vertical-align: super;
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: #f0f0f0;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
  margin-top: auto;
  min-height: 48px;
}

@media (max-width: 380px) {
  .card-footer {
    gap: 0.5rem;
    padding: 0.5rem;
  }
}

.card--compact .card-footer {
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  min-height: 40px;
}

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

.footer-button {
  background: none;
  border: none;
  cursor: pointer;
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

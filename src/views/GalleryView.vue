<template>
  <div class="gallery-view">
    <div v-if="loading" class="gallery-loading">
      <p>{{ $t('status-loading-list') }}</p>
    </div>

    <div v-else-if="error" class="gallery-error">
      <p>{{ error }}</p>
    </div>

    <div v-else>
      <!-- Sticky Collection Navigation -->
      <CollectionNav :collections="collectionsData" />

      <div class="collections-container">
        <div
          v-for="(collection, index) in collectionsData"
          :key="collection.collectionTitle"
          :id="`collection-${index + 1}`"
          class="collection-section"
        >
          <!-- collection Header -->
          <div class="collection-header">
            <div class="collection-title-group">
              <h2 class="collectionTitle">{{ collection.collectionTitle }}</h2>
              <EditDataButton
                style="color: grey"
                :section="`${index + 1}`"
                page="Special:MyPage/WikiDex"
                editintro="WikiDex/Guideline"
                preload="WikiDex/Placeholder"
              />
            </div>
            <div v-if="collection.lat && collection.lon" class="collection-coordinates">
              <span class="coordinates">
                📍 {{ collection.lat.toFixed(2) }}, {{ collection.lon.toFixed(2) }}
              </span>
              <GlobeLocalisator
                :lat="collection.lat"
                :lon="collection.lon"
                :title="collection.collectionTitle"
                :width="64"
                class="collection-globe-wp"
              />
            </div>
          </div>

          <!-- Items Grid for this collection -->
          <div class="gallery-grid" :class="{ 'gallery-grid--compact': settings.compactView }">
            <ItemCard
              v-for="item in collection.list"
              :key="item.binomial"
              :binomial-name="item.binomial"
              :qid="item.qid"
              :group="item.category || item.group || 'unknown'"
              :compact="settings.compactView"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchDatalist } from '@/utils/fetchDatalist'
import { useSettingsStore } from '@/stores/settings'
import ItemCard from '@/components/ItemCard.vue'
import EditDataButton from '@/components/EditDataButton.vue'
import GlobeLocalisator from '@/components/GlobeLocalisator.vue'
import CollectionNav from '@/components/CollectionNav.vue'

const route = useRoute()
const { t } = useI18n()
const settings = useSettingsStore()
const collectionsData = ref([])
const loading = ref(true)
const error = ref(null)

let scrollAttempts = 0
const MAX_SCROLL_ATTEMPTS = 30 // Increased to allow more time for card data loading

function scrollToHash() {
  const hash = window.location.hash.slice(1) // Remove the # symbol
  if (!hash) return false

  console.log(`Attempting to scroll to: ${hash}`)
  const element = document.getElementById(hash)

  if (element) {
    console.log(`Element found: ${hash}, checking if loaded...`)

    // Check if the card has finished loading (has card-content or card-loading class)
    const cardContent = element.querySelector('.card-content')
    const cardLoading = element.querySelector('.card-loading')

    if (cardContent || (!cardLoading && scrollAttempts > 3)) {
      // Card is loaded or we've waited enough
      console.log(`Card loaded, scrolling to: ${hash}`)
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        console.log(`Scrolled to: ${hash}`)
      }, 500) // Longer delay to allow for images/content to render
      return true
    } else {
      console.log(`Card still loading: ${hash}`)
      return false
    }
  }

  console.log(`Element not found yet: ${hash}, attempts: ${scrollAttempts}`)
  return false
}

function setupHashObserver() {
  const hash = window.location.hash.slice(1)
  if (!hash) return

  console.log(`Setting up hash observer for: ${hash}`)

  // Wait a bit before starting to give cards time to mount
  setTimeout(() => {
    // Try immediate scroll first
    if (scrollToHash()) return

    // Set up interval-based checking
    const intervalId = setInterval(() => {
      scrollAttempts++

      if (scrollToHash()) {
        clearInterval(intervalId)
        scrollAttempts = 0
      } else if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
        console.warn(`Failed to scroll after ${MAX_SCROLL_ATTEMPTS} attempts: ${hash}`)
        // Try one final scroll anyway
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        clearInterval(intervalId)
        scrollAttempts = 0
      }
    }, 300) // Check every 300ms

    // Fallback: stop checking after 15 seconds
    setTimeout(() => {
      clearInterval(intervalId)
      scrollAttempts = 0
    }, 15000)
  }, 500) // Initial delay to let cards start mounting
}

async function loadGalleryData() {
  loading.value = true
  error.value = null
  scrollAttempts = 0

  try {
    console.log('Loading gallery data for user:', settings.wikimediaUsername || 'Guest')
    collectionsData.value = await fetchDatalist()

    // Wait for next tick to ensure DOM is updated
    await nextTick()

    // Setup hash observer after data is loaded
    setupHashObserver()
  } catch (err) {
    error.value = t('status-loading-list-error')
    console.error('Error loading gallery data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGalleryData()
})

// Watch for route changes and reload data
watch(
  () => route.path,
  (newPath, oldPath) => {
    if (newPath !== oldPath) {
      console.log(`Route changed from ${oldPath} to ${newPath}, reloading gallery data`)
      loadGalleryData()
    }
  },
)
</script>

<style scoped>
.gallery-view {
  margin: 0 auto;
}

.gallery-loading,
.gallery-error {
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.2rem;
  color: #666;
}

.gallery-error {
  color: #d33;
}

.collections-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  color: #2c3e50;
}

.collection-section {
  background-color: #f8f9fa;
  /* border-radius: 12px; */
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  scroll-margin-top: 100px; /* Space for sticky nav */
}

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.7rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px solid #e9ecef;
}

.collection-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.collectionTitle {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.collection-location {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.collection-coordinates {
  margin-bottom: -1em;
  z-index: 4;
  position: sticky;
}
.collection-globe {
  flex-shrink: 0;
}

.collection-globe-wp {
  flex-shrink: 0;
}

.coordinates {
  background-color: #e9ecef;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
}

.gallery-grid--compact ~ .collection-header .coordinates,
.gallery-view:has(.gallery-grid--compact) .coordinates {
  display: none;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.gallery-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .gallery-view {
    padding: 0;
  }

  .collection-section {
    padding: 1.5rem;
    scroll-margin-top: 80px;
  }

  .collection-header {
    align-items: flex-start;
    gap: 1rem;
  }

  .collection-location {
    gap: 0.75rem;
  }

  .collectionTitle {
    font-size: 1.5rem;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .gallery-grid--compact {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .gallery-view {
    padding: 0;
  }

  .collection-section {
    padding: 1rem;
    border-radius: 8px;
    scroll-margin-top: 70px;
  }

  .collectionTitle {
    font-size: 1.25rem;
  }

  .coordinates {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .gallery-grid--compact {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }
}
</style>

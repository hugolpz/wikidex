<!-- eslint-disable vue/multi-word-component-names -- file name requested in todo.md -->
<template>
  <section
    class="carousel"
    tabindex="0"
    @keydown.left.prevent="go(-1)"
    @keydown.right.prevent="go(1)"
  >
    <p v-if="items.length === 0" class="carousel-empty">{{ $t('carousel-empty') }}</p>

    <template v-else>
      <div class="carousel-stage">
        <button class="carousel-arrow" :title="$t('carousel-prev')" @click="go(-1)">‹</button>

        <!-- One continuous strip of cards, moving one card per step. Only the visible cards and
             one on each side are mounted, so data is fetched just before a card slides in. -->
        <div
          class="carousel-pages"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerEnd"
          @pointercancel="onPointerEnd"
        >
          <!-- Hidden grid with the expanded view's rules: its column count is the cards per screen -->
          <div ref="probe" class="gallery-grid carousel-probe" aria-hidden="true"></div>
          <div
            v-for="slot in slots"
            :key="slot.k"
            class="carousel-slide"
            :class="{ 'carousel-slide--dragging': dragging }"
            :style="{
              width: `${100 / visible}%`,
              transform: `translateX(calc(${slot.k - pos} * 100% + ${dragX}px))`,
            }"
          >
            <ItemCard
              :binomial-name="slot.item.binomial"
              :qid="slot.item.qid"
              :collection="slot.item.collection"
              :group="slot.item.category || slot.item.group || 'unknown'"
              :compact="false"
              ignore-filters
            />
          </div>
        </div>

        <button class="carousel-arrow" :title="$t('carousel-next')" @click="go(1)">›</button>
      </div>

      <div class="carousel-footer">
        <button
          v-if="duration > 0"
          class="carousel-pill"
          :title="playing ? $t('carousel-pause') : $t('carousel-play')"
          @click="playing = !playing"
        >
          {{ playing ? '⏸' : '▶' }}
        </button>
        <span class="carousel-counter">{{ rangeLabel }} / {{ items.length }}</span>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ItemCard from './ItemCard.vue'

import { useFiltersStore } from '@/stores/filters'
import { filterItems } from '@/utils/filterItems'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  collections: { type: Array, default: () => [] },
  // Seconds before rolling to the next page; 0 disables autoplay
  duration: { type: Number, default: 30 },
})

const filters = useFiltersStore()
const { locale } = useI18n()

// Flat list of the cards to show: the active filters decide which ones are in
const items = computed(() => filterItems(props.collections, filters, locale.value))

// Cards visible at once: as many as the expanded view fits in a row. The probe is an empty
// `.gallery-grid`, so its resolved columns follow the same CSS rules and breakpoints.
const probe = ref(null)
const visible = ref(1)
let resizeObserver = null
function measure() {
  if (!probe.value) return
  const columns = getComputedStyle(probe.value).gridTemplateColumns.split(' ').filter(Boolean)
  visible.value = Math.max(1, columns.length)
}
// The probe only exists once there are cards to show
watch(probe, (el) => {
  resizeObserver?.disconnect()
  if (!el) return
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(el)
  measure()
})

// `pos` is the virtual, ever-moving index of the first visible card: going next always slides
// left, even when wrapping from the last card to the first. The real index is `pos` modulo n.
const pos = ref(0)
const mod = (n, m) => ((n % m) + m) % m
const count = computed(() => items.value.length)
const canSlide = computed(() => count.value > visible.value)

// Cards to mount: the visible ones plus one on each side (all of them when everything fits)
const slots = computed(() => {
  if (!canSlide.value) return items.value.map((item, k) => ({ k, item }))
  const slots = []
  for (let k = pos.value - 1; k <= pos.value + visible.value; k++) {
    slots.push({ k, item: items.value[mod(k, count.value)] })
  }
  return slots
})

const rangeLabel = computed(() => {
  if (!canSlide.value) return count.value > 1 ? `1–${count.value}` : 1
  const first = mod(pos.value, count.value) + 1
  const last = mod(pos.value + visible.value - 1, count.value) + 1
  return visible.value > 1 ? `${first}–${last}` : first
})

function go(step) {
  if (canSlide.value) pos.value += step
}

// Autoplay: restarts on every page change, so manual navigation resets the countdown
const playing = ref(true)
let timer = null
function schedule() {
  clearTimeout(timer)
  if (props.duration > 0 && playing.value && canSlide.value) {
    timer = setTimeout(() => go(1), props.duration * 1000)
  }
}
watch([pos, playing, canSlide, () => props.duration], schedule)

// Swipe: the pages follow the finger, then snap to the next/previous page or back
const dragX = ref(0)
const dragging = ref(false)
let drag = null
function onPointerDown(e) {
  if (e.pointerType === 'mouse') return // touch and pen only: keeps text selection with a mouse
  drag = { x: e.clientX, y: e.clientY, active: false, id: e.pointerId }
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.id) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  if (!drag.active) {
    // Wait for a clearly horizontal gesture, so vertical scrolling inside a card still works
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    drag.active = true
    dragging.value = true
    clearTimeout(timer)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  dragX.value = dx
}
function onPointerEnd(e) {
  if (!drag || e.pointerId !== drag.id) return
  const dx = dragX.value
  const width = e.currentTarget.clientWidth / visible.value // one card
  const wasActive = drag.active
  drag = null
  dragging.value = false
  dragX.value = 0
  if (wasActive && Math.abs(dx) > Math.min(80, width / 4)) go(dx < 0 ? 1 : -1)
  else schedule()
}

onMounted(schedule)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearTimeout(timer)
})
</script>

<style scoped>
.carousel {
  display: flex;
  flex-direction: column;
  /* Fill the screen below the top bar */
  height: calc(100dvh - 120px);
  min-height: 420px;
  background: #f8f9fa;
  outline: none;
}

.carousel-empty {
  margin: auto;
  color: #666;
}

.carousel-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.75rem;
}

.carousel-pages {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  /* vertical scrolling stays native, horizontal gestures are handled by the carousel */
  touch-action: pan-y;
}

.carousel-probe {
  position: absolute;
  inset: 0 0 auto;
  height: 0;
  visibility: hidden;
  pointer-events: none;
}

.carousel-slide {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  padding: 0 0.5rem;
  overflow-y: auto;
  transition: transform 0.675s cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}

/* No easing while the strip is held by a finger */
.carousel-slide--dragging {
  transition: none;
}

.carousel-slide :deep(.card) {
  max-width: 720px;
  margin: 0 auto;
}

@media (prefers-reduced-motion: reduce) {
  .carousel-slide {
    transition: none;
  }
}

.carousel-arrow {
  align-self: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: #2c3e50;
  color: white;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.carousel-arrow:hover {
  opacity: 1;
}

.carousel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem;
  color: #2c3e50;
  font-weight: 600;
}

.carousel-pill {
  padding: 0.3rem 0.9rem;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
}

/* Phones: swipe instead of arrows, the card takes the whole width */
@media (max-width: 768px) {
  .carousel-stage {
    padding: 0.5rem;
  }

  .carousel-arrow {
    display: none;
  }
}
</style>

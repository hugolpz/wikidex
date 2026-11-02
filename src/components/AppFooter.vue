<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-left">
        <span class="footer-credit">
          {{ $t('footer-made-by') }}
          <img src="/assets/profile-yug.png" alt="Hugo Lopez profile" class="profile-image" />
        </span>
      </div>

      <div ref="counterEl" class="footer-center">
        <span id="tc-views"></span>
        <span id="tc-sessions"></span>
      </div>

      <div class="footer-right">
        <a
          href="https://github.com/hugolpz/wikidex/"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
          :title="$t('link-github')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 480 512"
            class="github-icon"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M186.1 328.7c0 20.9-10.9 55.1-36.7 55.1s-36.7-34.2-36.7-55.1 10.9-55.1 36.7-55.1 36.7 34.2 36.7 55.1zM480 278.2c0 31.9-3.2 65.7-17.5 95-37.9 76.6-142.1 74.8-216.7 74.8-75.8 0-186.2 2.7-225.6-74.8-14.6-29-20.2-63.1-20.2-95 0-41.9 13.9-81.5 41.5-113.6-5.2-15.8-7.7-32.4-7.7-48.8 0-21.5 4.9-32.3 14.6-51.8 45.3 0 74.3 9 108.8 36 29-6.9 58.8-10 88.7-10 27 0 54.2 2.9 80.4 9.2 34-26.7 63-35.2 107.8-35.2 9.8 19.5 14.6 30.3 14.6 51.8 0 16.4-2.6 32.7-7.7 48.2 27.5 32.4 39 72.3 39 114.2zm-64.3 50.5c0-43.9-26.7-82.6-73.5-82.6-18.9 0-37 3.4-56 6-14.9 2.3-29.8 3.2-45.1 3.2-15.2 0-30.1-.9-45.1-3.2-18.7-2.6-37-6-56-6-46.8 0-73.5 38.7-73.5 82.6 0 87.8 80.4 101.3 150.4 101.3h48.2c70.3 0 150.6-13.4 150.6-101.3zm-82.6-55.1c-25.8 0-36.7 34.2-36.7 55.1s10.9 55.1 36.7 55.1 36.7-34.2 36.7-55.1-10.9-55.1-36.7-55.1z"
            />
          </svg>
          <span class="sr-only">{{ $t('link-github-sr') }}</span>
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
// Component name: AppFooter (multi-word as required)
import { ref, onMounted } from 'vue'

const counterEl = ref(null)

// Vue templates can't hold <script> tags, so inject the Toolforge counter at mount
onMounted(() => {
  const script = document.createElement('script')
  script.src =
    'https://toolcounter.toolforge.org/embed.js.php?tool=wikidex&page=home&style=badge'
  counterEl.value?.appendChild(script)
})
</script>

<style scoped>
.app-footer {
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  padding: 1rem 0;
  margin-top: auto; /* Push footer to bottom when using flexbox */
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.footer-left {
  display: flex;
  align-items: center;
}

.footer-credit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.profile-image {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
  transition: transform 0.2s ease;
}

.profile-image:hover {
  transform: scale(1.05);
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.footer-right {
  display: flex;
  align-items: center;
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 50%;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
  color: #666;
  text-decoration: none;
}

.github-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
  color: #333;
}

.github-link:focus {
  outline: 2px solid #36c;
  outline-offset: 2px;
}

.github-icon {
  width: 32px;
  height: 32px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .footer-container {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    padding: 1rem;
  }

  .footer-credit {
    justify-content: center;
  }
}
</style>

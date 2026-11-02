/**
 * fetch() wrapper for Wikimedia APIs: limits concurrency, retries on rate limiting
 * and dedupes identical in-flight/completed GET requests.
 *
 * Wikimedia answers HTTP 429 without CORS headers, so the browser reports it as a
 * network error (TypeError) rather than a readable 429; both are retried.
 */
const MAX_CONCURRENT = 2
const MIN_GAP_MS = 250 // minimum delay between two request starts
const MAX_RETRIES = 4
const BASE_DELAY_MS = 1500

let nextStart = 0
let active = 0
const queue = []
const cache = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function acquire() {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  return new Promise((resolve) => queue.push(resolve))
}

function release() {
  const next = queue.shift()
  if (next) next()
  else active--
}

async function fetchWithRetry(url, options) {
  for (let attempt = 0; ; attempt++) {
    await acquire()
    try {
      const wait = nextStart - Date.now()
      nextStart = Math.max(Date.now(), nextStart) + MIN_GAP_MS
      if (wait > 0) await sleep(wait)
      const response = await fetch(url, options)
      if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error
      // Rate limited: pause the whole queue, not just this request
      const delay = BASE_DELAY_MS * 2 ** attempt * (0.75 + Math.random() / 2)
      nextStart = Math.max(nextStart, Date.now() + delay)
    } finally {
      release()
    }
  }
}

/**
 * @param {string|URL} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>} A response that can be read independently by each caller
 */
export async function throttledFetch(url, options) {
  const key = String(url)
  if (!cache.has(key)) {
    const promise = fetchWithRetry(url, options)
    cache.set(key, promise)
    // Don't keep failures or error statuses cached
    promise.then(
      (r) => r.ok || cache.delete(key),
      () => cache.delete(key),
    )
  }
  return (await cache.get(key)).clone()
}

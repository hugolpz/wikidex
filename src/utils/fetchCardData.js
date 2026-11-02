/**
 * Fetches item data from Wikidata and Wikipedia
 * @param {string} binomialName - The binomial name of the item
 * @param {string} locale - The language code (en, fr, es, zh)
 * @returns {Promise<Object>} Item data including taxon name, images, and descriptions
 */
import { assessCategoryMembershipWP } from './assessCategoryNLP.js'
import { throttledFetch } from './throttledFetch.js'

const CACHE_PREFIX = 'wikidex:card:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function readCache(key) {
  try {
    const entry = JSON.parse(localStorage.getItem(key))
    return entry && Date.now() - entry.time < CACHE_TTL_MS ? entry.data : null
  } catch {
    return null
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ time: Date.now(), data }))
  } catch {
    // storage full or unavailable: ignore
  }
}

/**
 * Synchronously reads a card from the local cache, without any network request
 * @returns {Object|null} The cached card data, or null if not cached / expired
 */
export function peekCardCache(binomialName, locale = 'en') {
  return readCache(`${CACHE_PREFIX}${locale}:${binomialName}`)
}

export async function fetchCardData(binomialName, locale = 'en', qid = null) {
  const cacheKey = `${CACHE_PREFIX}${locale}:${binomialName}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  try {
    // Clean binomial name (remove parenthetical notes)
    const cleanName = binomialName.replace(/\s*\([^)]*\)/, '').trim()

    // Fetch data from Wikidata
    const wikidataData = await fetchWikidataInfo(cleanName, locale, qid)

    // Fetch long description from Wikipedia
    const wikipediaData = await fetchWikipediaDescription(cleanName, locale)

    // Assess the category
    const assessedCategory = await assessCategoryMembershipWP(cleanName, 'en')

    const result = {
      binomialName: cleanName,
      taxonName: wikidataData.taxonName || cleanName,
      commonName: wikidataData.commonName || null,
      image: wikidataData.image || null,
      rangeMap: wikidataData.rangeMap || null,
      shortDescription: wikidataData.description || null,
      mediumDescription: wikipediaData?.mediumDescription || null,
      longDescription: wikipediaData?.firstParagraph || null,
      infobox: wikipediaData?.infobox || null,
      wikidataId: wikidataData.id || null,
      gbifId: wikidataData.gbifId || null,
      assessedGroup: assessedCategory, // Add the assessed category
    }
    // Only cache complete results, not the empty ones produced by failed requests
    if (result.wikidataId) writeCache(cacheKey, result)
    return result
  } catch (error) {
    console.error(`Error fetching data for ${binomialName}:`, error)
    return {
      binomialName,
      taxonName: binomialName,
      commonName: null,
      image: null,
      rangeMap: null,
      shortDescription: null,
      mediumDescription: null,
      longDescription: null,
      infobox: null,
      wikidataId: null,
      gbifId: null,
      assessedGroup: 'unknown', // Default fallback
    }
  }
}

/**
 * Fetches Wikidata information for an item
 */
async function fetchWikidataInfo(binomialName, locale = 'en', qid = null) {
  try {
    const wd = 'https://www.wikidata.org/w/api.php'
    let entityId = null
    let shortDescription = null
    let entityData = null

    if (qid) {
      // Known Wikidata id: single request, no name ambiguity
      const idUrl = `${wd}?action=wbgetentities&ids=${qid}&props=claims|labels|descriptions&languages=${locale}&format=json&origin=*`
      const idData = await (await throttledFetch(idUrl)).json()
      const known = idData.entities?.[qid]
      if (known && !known.missing) {
        entityId = qid
        shortDescription = known.descriptions?.[locale]?.value || null
        entityData = idData
      }
    }

    // Fast path: resolve through the Wikipedia sitelink, in a single request
    const sitelinkUrl = `${wd}?action=wbgetentities&sites=${locale}wiki&titles=${encodeURIComponent(binomialName)}&props=claims|labels|descriptions&languages=${locale}&format=json&origin=*`
    const sitelinkData = entityId ? null : await (await throttledFetch(sitelinkUrl)).json()
    const found = sitelinkData
      ? Object.values(sitelinkData.entities || {}).find((e) => e.id && !e.missing)
      : null
    if (entityId) {
      // already resolved from the qid
    } else if (found) {
      entityId = found.id
      shortDescription = found.descriptions?.[locale]?.value || null
      entityData = sitelinkData
    } else {
      // Fallback: search the entity by name, then fetch its claims
      const searchUrl = `${wd}?action=wbsearchentities&search=${encodeURIComponent(binomialName)}&language=${locale}&format=json&origin=*`
      const searchData = await (await throttledFetch(searchUrl)).json()

      if (!searchData.search || searchData.search.length === 0) {
        return {
          taxonName: binomialName,
          commonName: null,
          image: null,
          rangeMap: null,
          description: null,
          gbifId: null,
        }
      }

      entityId = searchData.search[0].id
      shortDescription = searchData.search[0].description || null

      const entityUrl = `${wd}?action=wbgetentities&ids=${entityId}&props=claims|labels&languages=${locale}&format=json&origin=*`
      entityData = await (await throttledFetch(entityUrl)).json()
    }

    const entity = entityData.entities[entityId]
    const claims = entity.claims || {}

    // P225: Taxon name
    const taxonName =
      claims.P225 && claims.P225[0] ? claims.P225[0].mainsnak.datavalue.value : binomialName

    // P18: Image
    let image = null
    if (claims.P18 && claims.P18[0]) {
      const imageFilename = claims.P18[0].mainsnak.datavalue.value
      image = getCommonsImageUrl(imageFilename)
    }

    // P181: Taxon range map
    let rangeMap = null
    if (claims.P181 && claims.P181[0]) {
      const rangeFilename = claims.P181[0].mainsnak.datavalue.value
      rangeMap = getCommonsImageUrl(rangeFilename)
    }

    // P1843: Taxon common name
    let commonName = null
    if (claims.P1843 && claims.P1843.length > 0) {
      // Find common name in the requested locale
      const commonNameClaim = claims.P1843.find(
        (claim) =>
          claim.mainsnak &&
          claim.mainsnak.datavalue &&
          claim.mainsnak.datavalue.value &&
          claim.mainsnak.datavalue.value.language === locale,
      )

      if (commonNameClaim) {
        commonName = commonNameClaim.mainsnak.datavalue.value.text
      } else if (claims.P1843[0].mainsnak && claims.P1843[0].mainsnak.datavalue) {
        // Fallback to first available common name if locale-specific not found
        commonName = claims.P1843[0].mainsnak.datavalue.value.text
      }
    }

    // P846: GBIF taxon ID
    let gbifId = null
    if (claims.P846 && claims.P846[0]) {
      gbifId = claims.P846[0].mainsnak.datavalue.value
    }

    return {
      id: entityId,
      taxonName,
      commonName,
      image,
      rangeMap,
      description: shortDescription,
      gbifId,
    }
  } catch (error) {
    console.error('Error fetching Wikidata info:', error)
    return {
      taxonName: binomialName,
      commonName: null,
      image: null,
      rangeMap: null,
      description: null,
      gbifId: null,
    }
  }
}

/**
 * Converts Wikimedia Commons filename to URL
 */
function getCommonsImageUrl(filename) {
  const normalizedFilename = filename.replace(/ /g, '_')
  // Use Wikimedia Commons thumbnail service (width=400px)
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalizedFilename)}?width=400`
}

/**
 * Edits href attributes in DOM elements that match a pattern
 * @param {Element} element - The DOM element to search within
 * @param {RegExp} match - The regex pattern to match against href values
 * @param {string} replacement - The replacement string for matching hrefs
 */
function editHrefs(element, match, replacement) {
  if (!element) return

  const links = element.querySelectorAll('a[href]')
  links.forEach((link) => {
    const href = link.getAttribute('href')
    if (href && match.test(href)) {
      link.setAttribute('href', href.replace(match, replacement))
    }
  })
}

/**
 * Fetches Wikipedia article introduction with HTML formatting
 */
export async function fetchWikipediaDescription(binomialName, locale = 'en') {
  try {
    const url = `https://${locale}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(binomialName)}`

    const response = await throttledFetch(url)
    if (!response.ok) {
      return null
    }

    const html = await response.text()

    // Parse HTML and extract first paragraph
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    // Remove .noexcerpt elements
    const toRemove = doc.querySelectorAll('.noexcerpt, .mw-empty-elt')
    toRemove.forEach((element) => element.remove())
    const mediumDescription =
      doc.querySelector('#pcs-edit-section-title-description')?.textContent ?? ''
    const introduction = doc.querySelector('[data-mw-section-id="0"]')

    // Fix relative links in the introduction section
    editHrefs(introduction, /^\.\//, `https://${locale}.wikipedia.org/wiki/`)

    const firstParagraph = introduction?.querySelector('.mw-parser-output section > p')?.innerHTML,
      infobox = introduction?.querySelector('.infobox')?.textContent?.trim() ?? ''

    return {
      mediumDescription,
      firstParagraph,
      infobox,
    }
  } catch (error) {
    console.error('Error fetching Wikipedia description:', error)
    return null
  }
}

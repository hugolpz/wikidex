import { useSettingsStore } from '@/stores/settings'
import i18n from '@/i18n'

const defaultDatalist = `
== Spain ==
# { lat: 43.0, lon: 1.17 }
# Quercus robur
# Erinaceus europaeus
# Pica pica
# Podarcis muralis
# Hyla arborea

== Indonesia ==
# { lat: 0.27, lon: 115.03 }
# Polypedates otilophus
# Draco quinquefasciatus
# Pongo pygmaeus
# Helarctos malayanus
# Neofelis diardi
# Tragulus kanchil
# Hylobates muelleri
# Hydrornis baudii
# Hydrornis schwaneri
# Trogonoptera brookiana
`

/**
 * Fetches the user's custom datalist from Wikimedia if available, or returns default
 * This function consolidates the logic for checking existence and fetching data
 * @param {string} username - Optional username to fetch datalist for. If not provided, uses settings store
 * @returns {Promise<Array>} The datalist array
 */
export async function fetchDatalist(username = null) {
  const settings = useSettingsStore()

  // Determine which username to use
  const targetUsername = username || settings.wikimediaUsername

  // If no username, use default datalist from WikiDex/Preload
  if (!targetUsername || targetUsername.trim() === '') {
    console.log('No Wikimedia username found, using default datalist from WikiDex/Preload')
    settings.setHasDatalist(false)
    return parseWikitextDatalist(defaultDatalist)
  }

  console.log(`Fetching datalist for username: ${targetUsername}`)

  try {
    const pageTitle = `User:${targetUsername.replace(/"/g, '')}/WikiDex`

    // Get current locale from i18n
    const currentLocale = i18n.global.locale.value
    console.log(`[fetchDatalist] Current locale: ${currentLocale}`)

    const sites = ['meta.wikimedia.org', `${currentLocale}.wikipedia.org`]
    console.log(`[fetchDatalist] Checking WikiDex pages on sites: ${sites.join(', ')}`)
    const urls = sites.map(
      (item) =>
        `https://${item}/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`,
    )

    let wikitexts = ''
    let pagesExist = []

    for (const url of urls) {
      try {
        const response = await fetch(url)
        const data = await response.json()
        // Check if page exists
        const page = Object.values(data.query.pages)[0]
        const pageExists = !page.missing && !page.invalid
        pagesExist.push(pageExists)

        // Only add wikitext if page exists and has revisions
        if (pageExists && page.revisions && page.revisions[0]) {
          wikitexts += `\n\n{ source: ${currentLocale} }-->\n${page.revisions[0].slots.main['*']}\n`
          console.log(`Fetched datalist from ${url}, page exists: true`)
        } else {
          console.log(`Fetched datalist from ${url}, page exists: false`)
        }
      } catch (err) {
        console.warn(`Failed to fetch from ${url}:`, err)
        pagesExist.push(false)
      }
    }

    // Update hasDatalist state - true if at least one page exists
    const hasAnyPage = pagesExist.some((exists) => exists === true)
    settings.setHasDatalist(hasAnyPage)

    if (!hasAnyPage || !wikitexts.trim()) {
      console.log(`No WikiDex pages found for ${pageTitle}, using default datalist`)
      return parseWikitextDatalist(defaultDatalist)
    }

    // Extract wikitext content
    const filteredLines = wikitextFilter(wikitexts)
    const listsData = parseWikitextDatalist(filteredLines)

    if (listsData && listsData.length > 0) {
      console.log('Using custom collection-based datalist from Wikimedia')
      return listsData
    }

    console.log('Custom datalist is empty, using default')
    return parseWikitextDatalist(defaultDatalist)
  } catch (error) {
    console.error('Error fetching datalist:', error)
    settings.setHasDatalist(false)
    return parseWikitextDatalist(defaultDatalist)
  }
}

/**
 * Check if a wiki page exists on Meta Wikimedia
 * This function is now a convenience wrapper that uses the settings store
 * @param {string} pageTitle - The full page title (e.g., "User:Username/WikiDex")
 * @returns {Promise<boolean>} True if page exists, false otherwise
 */
export async function checkWikipageExists(pageTitle) {
  const settings = useSettingsStore()

  try {
    const url = `https://meta.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`

    const response = await fetch(url)
    const data = await response.json()

    // Page exists if it's not marked as "missing"
    const page = Object.values(data.query.pages)[0]
    const exists = !page.missing

    // Update state if checking current user's WikiDex page
    const currentUserPage = `User:${settings.wikimediaUsername}/WikiDex`
    if (pageTitle === currentUserPage) {
      settings.setHasDatalist(exists)
    }

    return exists
  } catch (error) {
    console.error('Error checking page existence:', error)
    return false
  }
}

/**
 * Filters wikitext to only keep lines starting with =, *, or #
 * @param {string} wikitext - The raw wikitext content
 * @returns {string} Filtered wikitext with only relevant lines
 */
export function wikitextFilter(wikitext) {
  return wikitext
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed.startsWith('=') || trimmed.startsWith('*') || trimmed.startsWith('#')
    })
    .join('\n')
}

/**
 * Parses one list item: `[Annotation] Binomial name (Qid)`
 * Anything in square brackets (e.g. a common name) is ignored. The `[...]` and `(Qid)`
 * parts are optional and may appear in any order; a binomial wrapped in parentheses,
 * e.g. `[Common] (Binomial) (Qid)`, is accepted too.
 * @param {string} item - The item text, without its leading list marker
 * @returns {{binomial: string, qid?: string}}
 */
export function parseListItem(item) {
  let rest = item.trim()
  const result = {}

  const qid = rest.match(/\s*\((Q\d+)\)/)
  if (qid) {
    result.qid = qid[1]
    rest = rest.replace(qid[0], ' ')
  }
  rest = rest.replace(/\s*\[[^\]]*\]/g, ' ')
  rest = rest.trim()
  const wrapped = rest.match(/^\((.+)\)$/)
  result.binomial = wrapped ? wrapped[1].trim() : rest
  return result
}

/**
 * Parses wikitext in collection-based format to extract collection-based datalist data
 * Expected format:
 * == collection Name 1 ==
 * * { lat: 04.8 , lon: 86.8 }
 * * Metepeira labyrinthea
 * * Canis lupus familiaris
 *
 * == collection Name 2 ==
 * * { lat: 04.8 , lon: 86.8 }
 * * Vulpes vulpes
 * * Pica pica
 *
 * @param {string} wikitext - The raw wikitext content
 * @returns {Array|null} Array of collection objects with structure: { collection, lat, lon, list } or null if invalid
 */
export function parseWikitextDatalist(wikitext) {
  try {
    const lists = []

    // Split by == headers to get sections but preserve the matching strings
    const sections = wikitext.split(/^==+\s*(.+?)\s*==+$/gm)

    // Process sections (skip first empty element)
    for (let i = 1; i < sections.length; i += 2) {
      const collectionName = sections[i].trim()
      const content = sections[i + 1]

      if (!content) continue

      // Extract list items (lines starting with *)
      const listItems = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('*') || line.startsWith('#'))
        .map((line) => line.substring(1).trim()) // remove leading '*'
        .filter((line) => line.length > 0)

      if (listItems.length === 0) continue

      // Detect coordinates anywhere in the items and remove any items that are coordinate objects { ... }
      let lat = null
      let lon = null
      const coordRegex = /\{\s*lat\s*:\s*([0-9.-]+)\s*,\s*lon\s*:\s*([0-9.-]+)\s*\}/

      // If any list item contains coordinate object, extract first match
      for (const itm of listItems) {
        const m = itm.match(coordRegex)
        if (m) {
          lat = parseFloat(m[1])
          lon = parseFloat(m[2])
          break
        }
      }
      // Filter out any items that look like "{ ... }" so only species names remain
      const itemList = listItems.filter((item) => !item.match(/^\{.+\}$/))

      // Convert item list to datalist format
      const names = itemList.filter((item) => item.length > 0).map((item) => parseListItem(item))

      // Only add collection if it has items
      if (names.length > 0) {
        lists.push({
          collectionTitle: collectionName,
          lat: lat,
          lon: lon,
          list: names,
        })
      }
    }

    return lists.length > 0 ? lists : null
  } catch (error) {
    console.error('Error parsing collection-based wikitext datalist:', error)
    return null
  }
}

/**
 * Fetches all taxa observed by a user from iNaturalist
 * @param {string} username - The iNaturalist username
 * @returns {Promise<Array<string>>} Array of scientific names
 */
export async function fetchINaturalistUserTaxa(username) {
  let page = 1
  const perPage = 500
  let hasMore = true
  const names = []

  while (hasMore) {
    const url = `https://api.inaturalist.org/v1/observations/species_counts?user_id=${username}&per_page=${perPage}&page=${page}`
    const res = await fetch(url)
    const data = await res.json()
    // Extract scientific names
    data.results.forEach((item) => {
      if (item.taxon && item.taxon.name) {
        names.push(item.taxon.name)
      }
    })
    hasMore = data.results.length === perPage
    page++
  }
  return {
    collectionTitle: 'iNaturalist Observations',
    list: names,
  }
}

/**
 * GBIF API utilities
 * Shared functions for interacting with the GBIF (Global Biodiversity Information Facility) API
 */

// Base URL for the GBIF API. On Toolforge the CSP forbids api.gbif.org, so the build
// (.env.toolforge) points this to the same-origin proxy implemented in server.js.
const GBIF_API_ROOT = import.meta.env.VITE_GBIF_API_BASE || 'https://api.gbif.org/v1'
const GBIF_API_BASE = `${GBIF_API_ROOT}/species`

/**
 * Matches a species binomial name to a GBIF Backbone taxonKey.
 * @param {string} binomialName - The species binomial name (e.g., 'Panthera tigris')
 * @returns {Promise<number | null>} The GBIF taxonKey (usageKey) or null if no match
 */
export async function getTaxonKey(binomialName) {
  const matchUrl = `${GBIF_API_BASE}/match?name=${encodeURIComponent(binomialName)}`

  try {
    const response = await fetch(matchUrl)
    if (!response.ok) throw new Error(`GBIF Match API error: ${response.statusText}`)

    const data = await response.json()

    // Check if a confident match was found
    if (data.confidence > 90 && data.status === 'ACCEPTED' && data.usageKey) {
      console.log(`Found GBIF key ${data.usageKey} for "${binomialName}"`)
      return data.usageKey
    }

    console.warn(`No confident GBIF match found for: ${binomialName}`)
    return null
  } catch (error) {
    console.error(`Error in GBIF Taxon Key lookup for ${binomialName}:`, error)
    return null
  }
}

/**
 * Fetches the IUCN Red List status using the GBIF taxonKey.
 * @param {number} taxonKey - The GBIF taxonKey
 * @returns {Promise<string | null>} The two-letter IUCN status code (e.g., 'LC') or null
 */
export async function getIucnStatus(taxonKey) {
  const statusUrl = `${GBIF_API_BASE}/${taxonKey}/iucnRedListCategory`

  try {
    const response = await fetch(statusUrl)
    if (!response.ok) throw new Error(`GBIF Status API error: ${response.statusText}`)

    const data = await response.json()

    return data.code || null
  } catch (error) {
    console.error(`Error fetching IUCN status for key ${taxonKey}:`, error)
    return null
  }
}

/**
 * Fetches species occurrence data from GBIF API
 * @param {number} taxonKey - GBIF species usage key
 * @param {number} limit - Maximum number of occurrences to fetch
 * @returns {Promise<Array>} - Array of occurrence objects with coordinates
 */
export async function fetchOccurrences(taxonKey, limit = 300) {
  const url = `${GBIF_API_ROOT}/occurrence/search?taxonKey=${taxonKey}&hasCoordinate=true&limit=${limit}`

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`GBIF API error: ${response.statusText}`)

    const data = await response.json()

    // Extract coordinates and convert to GeoJSON format
    const occurrences = data.results
      .filter((result) => result.decimalLatitude && result.decimalLongitude)
      .map((result) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [result.decimalLongitude, result.decimalLatitude],
        },
        properties: {
          country: result.country || 'Unknown',
          year: result.year || null,
          basisOfRecord: result.basisOfRecord || 'Unknown',
        },
      }))

    console.log(`Fetched ${occurrences.length} occurrences for taxonKey ${taxonKey}`)
    return occurrences
  } catch (error) {
    console.error('Error fetching GBIF occurrences:', error)
    return []
  }
}

import { peekCardCache } from './fetchCardData.js'

/** Category of an item when known: from the local cache or from a card loaded in this session */
function categoryOf(item, known, filters) {
  return known?.assessedGroup ?? filters.categories[item.binomial] ?? null
}

/**
 * Whether a list item passes the name and type filters. Only what is known without network
 * is used (binomial, cached card data, cards loaded in this session): an item whose type is not
 * known yet is kept.
 */
export function matchesItem(item, filters, locale) {
  const known = peekCardCache(item.binomial, locale)
  if (!filters.matchesName({ binomial: item.binomial, ...known })) return false
  const category = categoryOf(item, known, filters)
  return !filters.type || !category || category === filters.type
}

/** Flat list of the items passing all filters, each tagged with its collection title. */
export function filterItems(collections, filters, locale) {
  return collections
    .filter((c) => !filters.section || filters.section === c.collectionTitle)
    .flatMap((c) => c.list.map((item) => ({ ...item, collection: c.collectionTitle })))
    .filter((item) => matchesItem(item, filters, locale))
}

/**
 * Items per type (category), among those passing the section and name filters.
 * `pending` counts the items whose type is not known yet (card not loaded), so that
 * the counts and `pending` add up to the number of items.
 * @returns {{counts: Record<string, number>, pending: number}}
 */
export function countByType(collections, filters, locale) {
  const counts = {}
  let pending = 0
  for (const c of collections) {
    if (filters.section && filters.section !== c.collectionTitle) continue
    for (const item of c.list) {
      const known = peekCardCache(item.binomial, locale)
      if (!filters.matchesName({ binomial: item.binomial, ...known })) continue
      const category = categoryOf(item, known, filters)
      if (category) counts[category] = (counts[category] || 0) + 1
      else pending++
    }
  }
  return { counts, pending }
}

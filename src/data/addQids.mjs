#!/usr/bin/env node
/**
 * addQids.mjs - Append Wikidata ids to WikiDex list items.
 *
 *   `# [Magpie] Pica pica`  -->  `# [Magpie] Pica pica (Q25375)`
 *
 * Names are resolved in batches by exact taxon name (P225) with one SPARQL query per
 * batch, so it is gentle on the Wikimedia APIs. Lines that already have a (Qxxx),
 * headers and coordinates are left untouched. Unresolved or ambiguous names are
 * left as-is and reported on stderr.
 *
 * Usage:
 *   node src/data/addQids.mjs src/data/legacy.md > legacy.qid.md
 *   node src/data/addQids.mjs --write src/data/legacy.md   # edit in place
 */
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const BATCH = 100
const UA = 'WikiDex-addQids/1.0 (https://wikidex.toolforge.org)'

const args = process.argv.slice(2)
const write = args.includes('--write')
const file = args.find((a) => !a.startsWith('--'))
if (!file) {
  console.error('Usage: node addQids.mjs [--write] FILE')
  process.exit(1)
}

const lines = readFileSync(file, 'utf8').split('\n')
const itemRe = /^(\s*[*#]\s*)(?![{=\s])(.+?)\s*$/ // list item, not a coordinate object or header

/** Binomial name of a list item, without `[common name]`; null if it already has a qid. */
function binomialOf(line) {
  const m = line.match(itemRe)
  if (!m || /\(Q\d+\)/.test(m[2])) return null
  const name = m[2].replace(/\s*\[[^\]]*\]/, '').trim()
  return name.replace(/^\((.+)\)$/, '$1').trim() || null
}

const names = [...new Set(lines.map(binomialOf).filter(Boolean))]

const found = new Map() // name -> Set of QIDs
for (let i = 0; i < names.length; i += BATCH) {
  const values = names
    .slice(i, i + BATCH)
    .map((n) => `"${n.replace(/["\\]/g, '')}"`)
    .join(' ')
  const query = `SELECT ?name ?item WHERE { VALUES ?name { ${values} } ?item wdt:P225 ?name }`
  const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
  })
  if (!res.ok) throw new Error(`SPARQL error ${res.status} (wait a few minutes if 429)`)
  for (const b of (await res.json()).results.bindings) {
    const qid = b.item.value.split('/').pop()
    if (!found.has(b.name.value)) found.set(b.name.value, new Set())
    found.get(b.name.value).add(qid)
  }
  await new Promise((r) => setTimeout(r, 1000))
}

const missing = []
const out = lines.map((line) => {
  const name = binomialOf(line)
  if (!name) return line
  const qids = found.get(name)
  if (qids?.size === 1) return `${line.trimEnd()} (${[...qids][0]})`
  missing.push(qids ? `${name}: ambiguous ${[...qids].join(', ')}` : `${name}: not found`)
  return line
})

if (write) writeFileSync(file, out.join('\n'))
else process.stdout.write(out.join('\n'))
console.error(`${names.length - missing.length}/${names.length} resolved`)
for (const m of missing) console.error(`  ! ${m}`)

/**
 * Minimal production server for Toolforge (Node webservice, no dependencies).
 * - Serves the built app from ./dist (SPA fallback to index.html)
 * - Proxies a whitelist of GBIF API endpoints under /gbif/*, because the Toolforge
 *   Content-Security-Policy (connect-src) does not allow https://api.gbif.org.
 *
 * Run: node server.js   (PORT defaults to 8000; Toolforge sets PORT itself)
 */
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('./dist/', import.meta.url))
const PORT = process.env.PORT || 8000
const GBIF_API = 'https://api.gbif.org/v1'

// Only these GBIF endpoints are forwarded (path after /gbif)
const GBIF_ALLOWED = [
  /^\/species\/match$/,
  /^\/species\/\d+\/iucnRedListCategory$/,
  /^\/occurrence\/search$/,
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

async function proxyGbif(url, res) {
  const path = url.pathname.slice('/gbif'.length)
  if (!GBIF_ALLOWED.some((re) => re.test(path))) {
    res.writeHead(403).end('Forbidden')
    return
  }
  try {
    const upstream = await fetch(`${GBIF_API}${path}${url.search}`, {
      headers: { 'User-Agent': 'WikiDex/1.0 (https://wikidex.toolforge.org)' },
      signal: AbortSignal.timeout(15000),
    })
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    console.error('GBIF proxy error:', error)
    res.writeHead(502).end('Bad gateway')
  }
}

async function serveStatic(url, res) {
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)))
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden')
    return
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    // Unknown path: SPA fallback for navigation, 404 for missing files with an extension
    if (extname(file)) {
      res.writeHead(404).end('Not found')
      return
    }
    file = join(DIST, 'index.html')
  }
  try {
    const body = await readFile(file)
    const isSw = file.endsWith('sw.js')
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': isSw || file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end('Method not allowed')
    } else if (url.pathname.startsWith('/gbif/')) {
      proxyGbif(url, res)
    } else {
      serveStatic(url, res)
    }
  })
  .listen(PORT, () => console.log(`WikiDex listening on :${PORT}`))

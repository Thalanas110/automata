/**
 * Merges dist/client/ into dist/ so Netlify serves static assets
 * from the same publish directory as the Nitro-generated _redirects.
 */
import { cpSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'dist/client')
const dest = resolve(root, 'dist')

if (!existsSync(src)) {
  console.error(`[merge-dist] Source "${src}" not found — skipping.`)
  process.exit(0)
}

cpSync(src, dest, { recursive: true })
console.log(`[merge-dist] Merged dist/client → dist`)

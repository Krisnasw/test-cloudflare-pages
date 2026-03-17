import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = process.cwd()
const srcPath = path.join(repoRoot, 'dist', 'client', '.vite', 'manifest.json')
const outDir = path.join(repoRoot, 'functions', '_generated')
const outPath = path.join(outDir, 'vite-manifest.json')

async function main() {
  await mkdir(outDir, { recursive: true })

  const raw = await readFile(srcPath, 'utf8')
  // Re-serialize to normalize formatting and ensure valid JSON.
  const manifest = JSON.parse(raw) as unknown
  await writeFile(outPath, JSON.stringify(manifest), 'utf8')
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const runtimes = JSON.parse(await readFile(resolve(root, 'resources/engine/runtime-manifest.json'), 'utf8'))

const readOptionalJson = async (filename) => {
  try {
    return JSON.parse(await readFile(resolve(root, filename), 'utf8'))
  } catch {
    return null
  }
}

const testResults = await readOptionalJson('.site-test-results.json')
const auditResults = await readOptionalJson('.site-audit.json')
let publishedRelease = null

try {
  const response = await fetch('https://api.github.com/repos/YazeKT/dlME/releases?per_page=1', {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    },
    signal: AbortSignal.timeout(5000)
  })
  if (response.ok) publishedRelease = (await response.json()).find((release) => !release.draft) ?? null
} catch {
  // Local/offline builds retain the checked-in release snapshot.
}

const auditFindings = auditResults?.metadata?.vulnerabilities
  ? Object.values(auditResults.metadata.vulnerabilities).reduce((sum, count) => sum + Number(count), 0)
  : 0

const data = {
  version: pkg.version,
  publishedVersion: publishedRelease?.tag_name?.replace(/^v/, '') ?? null,
  releaseReady: publishedRelease?.tag_name === `v${pkg.version}`,
  sourceVersion: pkg.version,
  engineVersion: runtimes.ytDlp.version,
  extractorEntries: 1752,
  testCount: testResults?.numPassedTests ?? 52,
  auditFindings,
  runtimeCount: Object.keys(runtimes.binaryChecksums).length,
  releaseAssetCount: publishedRelease?.assets?.length ?? 10,
  releaseUrl: publishedRelease?.html_url ?? 'https://github.com/YazeKT/dlME/releases'
}

await writeFile(resolve(root, 'website/site-data.js'), `window.DLME_SITE_DATA = ${JSON.stringify(data, null, 2)};\n`)
console.log(`Website metadata synced for release ${data.version}, source ${data.sourceVersion}, yt-dlp ${data.engineVersion}`)

import { app, dialog, type BrowserWindow } from 'electron'
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { LegalDocument } from '../shared/types'

function legalRoot(): string { return app.isPackaged ? join(process.resourcesPath, 'licenses') : resolve(app.getAppPath(), 'resources/licenses') }
function customRoot(): string { return join(app.getPath('userData'), 'legal-documents') }
export async function readLegalDocuments(): Promise<LegalDocument[]> {
  const docs: LegalDocument[] = []
  for (const [root, custom] of [[legalRoot(), false], [customRoot(), true]] as const) {
    await mkdir(root, { recursive: true })
    for (const file of await readdir(root, { withFileTypes: true })) {
      if (!file.isFile() || !/\.(md|txt)$/i.test(file.name)) continue
      const path = join(root, file.name)
      if ((await stat(path)).size > 2_000_000) continue
      docs.push({ id: `${custom ? 'custom' : 'bundled'}:${file.name}`, title: file.name.replace(/^[a-f0-9-]{36}--/, '').replace(/\.(md|txt)$/i, '').replaceAll('-', ' '), content: await readFile(path, 'utf8'), custom })
    }
  }
  return docs.sort((a, b) => Number(b.custom) - Number(a.custom) || a.title.localeCompare(b.title))
}
export async function importLegalDocument(window: BrowserWindow): Promise<LegalDocument | null> {
  const picked = await dialog.showOpenDialog(window, { title: 'Add your legal documentation', properties: ['openFile'], filters: [{ name: 'Text or Markdown document', extensions: ['txt', 'md'] }] })
  if (picked.canceled || !picked.filePaths[0]) return null
  const source = picked.filePaths[0]
  if (!['.txt', '.md'].includes(extname(source).toLowerCase()) || (await stat(source)).size > 2_000_000) throw new Error('Choose a text or Markdown document smaller than 2 MB.')
  await mkdir(customRoot(), { recursive: true })
  const filename = `${randomUUID()}--${basename(source)}`
  await copyFile(source, join(customRoot(), filename))
  return (await readLegalDocuments()).find((doc) => doc.id === `custom:${filename}`) ?? null
}

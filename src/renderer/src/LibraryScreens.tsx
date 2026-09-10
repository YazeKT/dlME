import { useEffect, useMemo, useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react/dist/csr/ArrowClockwise'
import { FolderOpen } from '@phosphor-icons/react/dist/csr/FolderOpen'
import { Play } from '@phosphor-icons/react/dist/csr/Play'
import type { FileCategory, FileLibrary, LegalDocument, SupportedDirectory } from '../../shared/types'

const categories: FileCategory[] = ['Audio', 'Video', 'Image', 'Application', 'Zip', 'Others']
function errorText(error: unknown): string { return (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '') }
function bytes(value: number): string { if (!value) return '0 B'; const index = Math.min(4, Math.floor(Math.log(value) / Math.log(1024))); return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${['B', 'KB', 'MB', 'GB', 'TB'][index]}` }

function useFitCount(grid: boolean): number {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => { const resize = (): void => setViewport({ width: window.innerWidth, height: window.innerHeight }); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize) }, [])
  return Math.max(4, Math.floor((viewport.height - (grid ? 350 : 390)) / 49)) * (grid ? viewport.width <= 1000 ? 2 : 3 : 1)
}

function Pager({ page, pages, total, size, sizeChoice, setPage, setSize }: { page: number; pages: number; total: number; size: number; sizeChoice: number; setPage: (page: number) => void; setSize: (size: number) => void }): React.JSX.Element {
  return <div className="pager"><span>{total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${total.toLocaleString()}` : '0 results'}</span><label>Per page <select aria-label="Results per page" value={sizeChoice} onChange={(event) => { setSize(Number(event.target.value)); setPage(1) }}><option value={0}>Fit window</option>{[12, 24, 48].map((value) => <option key={value}>{value}</option>)}</select></label><button className="secondary" disabled={page <= 1} onClick={() => setPage(1)} aria-label="First page">First</button><button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><label>Page <select aria-label="Page number" value={page} onChange={(event) => setPage(Number(event.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select> of {pages}</label><button className="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button><button className="secondary" disabled={page >= pages} onClick={() => setPage(pages)} aria-label="Last page">Last</button></div>
}

export function SupportedSitesScreen(): React.JSX.Element {
  const [directory, setDirectory] = useState<SupportedDirectory>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [letter, setLetter] = useState('all')
  const [page, setPage] = useState(1)
  const [sizeChoice, setSize] = useState(0)
  const fitted = useFitCount(true); const size = sizeChoice || fitted
  async function load(): Promise<void> { setLoading(true); setError(''); try { setDirectory(await window.dime.getSupportedSites()) } catch (error) { setError(errorText(error)) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => (directory?.sites ?? []).filter((site) => site.name.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || (status === 'broken') === site.broken) && (type === 'all' || site.type === type) && (letter === 'all' || (letter === '#' ? !/^[a-z]/i.test(site.name) : site.name.toUpperCase().startsWith(letter)))), [directory, query, status, type, letter])
  const pages = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(page, pages)
  return <div className="content-stack directory-page"><div className="compact-heading"><div><p className="eyebrow">OFFICIAL ENGINE DIRECTORY</p><h1>Supported sites</h1><p>{directory ? `${directory.sites.length.toLocaleString()} extractors · yt-dlp ${directory.version}` : 'Loading the installed engine’s complete list…'}</p></div><button className="secondary" disabled={loading} onClick={() => void load()}><ArrowClockwise /> Refresh</button></div>
    <div className="filter-toolbar card"><label className="search-field">Search sites<input type="search" placeholder="YouTube, BBC, SoundCloud…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="all">All statuses</option><option value="listed">Listed</option><option value="broken">Currently broken</option></select></label><label>Type<select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}><option value="all">All types</option>{['Site', 'Collection', 'Live', 'Search', 'Generic'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Starts with<select value={letter} onChange={(event) => { setLetter(event.target.value); setPage(1) }}><option value="all">A–Z / all</option>{['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <p className="table-note">Each entry is an extractor; a website may have several. Type filters group names for browsing. “Listed” is not a live availability test. <a href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md" target="_blank" rel="noreferrer">Official documentation ↗</a></p>
    {error && <p role="alert" className="inline-error">{error}</p>}
    <div className="directory-grid" aria-busy={loading}>{filtered.slice((current - 1) * size, current * size).map((site) => <div className="directory-entry" key={site.name}><div><strong title={site.name}>{site.name}</strong><small>{site.type} · {site.family}</small></div><span className={`site-status ${site.broken ? 'broken' : ''}`}>{site.broken ? 'Broken' : 'Listed'}</span></div>)}</div>
    {!loading && !filtered.length && <p className="table-empty">No matching sites. Try a different search or filter.</p>}
    <Pager page={current} pages={pages} total={filtered.length} size={size} sizeChoice={sizeChoice} setPage={setPage} setSize={setSize} />
  </div>
}

export function FilesScreen({ revision }: { revision: string }): React.JSX.Element {
  const [library, setLibrary] = useState<FileLibrary>()
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('all'); const [sort, setSort] = useState('newest'); const [availability, setAvailability] = useState('all')
  const [page, setPage] = useState(1); const [sizeChoice, setSize] = useState(0); const fitted = useFitCount(false); const size = sizeChoice || fitted
  async function load(): Promise<void> { setLoading(true); setError(''); try { setLibrary(await window.dime.listDownloadedFiles()) } catch (error) { setError(errorText(error)) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [revision])
  async function act(action: () => Promise<void>): Promise<void> { try { await action() } catch (error) { setError(errorText(error)) } }
  const filtered = useMemo(() => (library?.files ?? []).filter((file) => `${file.name} ${file.folder}`.toLowerCase().includes(query.toLowerCase()) && (category === 'all' || file.category === category) && (availability === 'all' || file.missing === (availability === 'missing'))).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'size' ? b.size - a.size : b.modifiedAt.localeCompare(a.modifiedAt)), [library, query, category, availability, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / size)); const current = Math.min(page, pages)
  return <div className="content-stack files-page"><div className="compact-heading"><div><p className="eyebrow">YOUR DOWNLOADS</p><h1>Files</h1><p>Find saved files, open them, or jump to their folder.</p></div><div className="heading-actions"><button className="secondary" onClick={() => void act(() => window.dime.openDownloadFolder())}><FolderOpen /> Download folder</button><button className="secondary" disabled={loading} onClick={() => void load()}><ArrowClockwise /> {loading ? 'Scanning…' : 'Refresh'}</button></div></div>
    <div className="category-strip" role="group" aria-label="File category">{['all', ...categories].map((value) => <button key={value} className={category === value ? 'active' : ''} onClick={() => { setCategory(value); setPage(1) }}><strong>{value === 'all' ? 'All files' : value}</strong><span>{(library?.files ?? []).filter((file) => value === 'all' || file.category === value).length}</span></button>)}</div>
    <div className="filter-toolbar card"><label className="search-field">Search files<input type="search" value={query} placeholder="Search filename or folder…" onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label><label>Sort by<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="size">Largest first</option></select></label><label>Availability<select value={availability} onChange={(event) => { setAvailability(event.target.value); setPage(1) }}><option value="all">All files</option><option value="present">On disk</option><option value="missing">Missing</option></select></label></div>
    <p className="table-note folder-note" title={library?.root}>Download folder: {library?.root ?? 'Loading…'}</p>
    {error && <p role="alert" className="inline-error">{error}</p>}{library?.warnings.map((warning) => <p className="table-note" key={warning}>{warning}</p>)}
    <div className="file-table-wrap card"><table className="file-table"><thead><tr><th scope="col">File name / folder</th><th scope="col">Type</th><th scope="col">Size</th><th scope="col">Modified</th><th scope="col">Actions</th></tr></thead><tbody>{filtered.slice((current - 1) * size, current * size).map((file) => <tr key={file.path}><td><strong title={file.name}>{file.name}</strong><small title={file.folder}>{file.missing ? 'Missing · ' : ''}{file.folder}</small></td><td><span className={`file-type ${file.category.toLowerCase()}`}>{file.extension}</span><small>{file.category}</small></td><td>{bytes(file.size)}</td><td>{new Date(file.modifiedAt).toLocaleDateString()}</td><td><div className="row-actions"><button disabled={file.missing} title={file.category === 'Application' ? 'Reveal application in folder' : 'Open file'} aria-label={`Open ${file.name}`} onClick={() => void act(() => file.category === 'Application' ? window.dime.revealFile(file.path) : window.dime.openFile(file.path))}><Play /></button><button disabled={file.missing} title="Show in folder" aria-label={`Show ${file.name} in folder`} onClick={() => void act(() => window.dime.revealFile(file.path))}><FolderOpen /></button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="table-empty">{loading ? 'Scanning download folders…' : library?.files.length ? 'No matching files. Try another filter.' : 'Your saved files will appear here. Start a download or add files to the download folder.'}</p>}</div>
    <Pager page={current} pages={pages} total={filtered.length} size={size} sizeChoice={sizeChoice} setPage={setPage} setSize={setSize} />
  </div>
}

export function LegalPanel(): React.JSX.Element {
  const [documents, setDocuments] = useState<LegalDocument[]>([]); const [selected, setSelected] = useState(''); const [error, setError] = useState('')
  useEffect(() => { void window.dime.getLegalDocuments().then(setDocuments).catch((error) => setError(errorText(error))) }, [])
  async function add(): Promise<void> { try { const doc = await window.dime.importLegalDocument(); if (doc) { setDocuments((current) => [doc, ...current]); setSelected(doc.id) } } catch (error) { setError(errorText(error)) } }
  const document = documents.find((doc) => doc.id === selected) ?? documents.find((doc) => doc.title === 'dlME LICENSE') ?? documents[0]
  return <section className="card legal-panel"><div className="section-heading"><div><h2>Licenses & legal documents</h2><p className="table-note">Application license, engine notices, and your own documents.</p></div><button className="secondary" onClick={() => void add()}>Add document</button></div><div className="legal-document-picker"><label>Document<select aria-label="Legal document" value={document?.id ?? ''} onChange={(event) => setSelected(event.target.value)}>{documents.map((doc) => <option value={doc.id} key={doc.id}>{doc.custom ? 'Your document · ' : ''}{doc.title}</option>)}</select></label><span>Import .txt or .md · saved locally</span></div>{error && <p className="inline-error" role="alert">{error}</p>}<pre className="legal-content" tabIndex={0}>{document?.content ?? 'Loading license documents…'}</pre></section>
}

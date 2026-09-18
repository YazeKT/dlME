import { useEffect, useMemo, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { FolderOpen } from '@phosphor-icons/react/dist/csr/FolderOpen'
import { X } from '@phosphor-icons/react/dist/csr/X'
import type { AppSettings, JobRecord, TorrentInput } from '../../shared/types'
import { JobCard } from './App'

export function TorrentsScreen({ jobs, settings, showError, initialMagnet, clearMagnet }: { jobs: JobRecord[]; settings: AppSettings; showError: (error: unknown) => void; initialMagnet: string; clearMagnet: () => void }): React.JSX.Element {
  const [inputs, setInputs] = useState<TorrentInput[]>([])
  const [magnet, setMagnet] = useState('')
  const [destination, setDestination] = useState(`${settings.outputDirectory.replace(/[\\/]$/, '')}\\Torrents`)
  const [selected, setSelected] = useState<number[]>([])
  const [fileSearch, setFileSearch] = useState('')
  const [filePage, setFilePage] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const [details, setDetails] = useState<string>()
  const [association, setAssociation] = useState<boolean>()
  const current = inputs[0]
  function merge(input: TorrentInput): void { setInputs((items) => { const index = items.findIndex((item) => item.id === input.id); return index < 0 ? [...items, input] : items.map((item) => item.id === input.id ? input : item) }) }
  useEffect(() => {
    void window.dime.getTorrentInputs().then(setInputs).catch(showError)
    void window.dime.torrentAssociation().then(setAssociation).catch(showError)
    return window.dime.onTorrentInput(merge)
  }, [])
  useEffect(() => { if (initialMagnet) { void add(initialMagnet); clearMagnet() } }, [initialMagnet])
  useEffect(() => {
    setFileSearch(''); setFilePage(0); setSelected(current?.details?.files.map((file) => file.index) ?? [])
    if (current?.status === 'pending') void window.dime.resolveTorrent(current.id).then(merge).catch((error) => { if (!String(error).includes('cancelled')) showError(error) })
  }, [current?.id, current?.status])
  async function add(source: string): Promise<void> { try { merge(await window.dime.addTorrentInput(source)); setMagnet('') } catch (error) { showError(error) } }
  async function close(): Promise<void> { if (!current) return; try { await window.dime.cancelTorrentInput(current.id); setInputs((items) => items.filter((item) => item.id !== current.id)) } catch (error) { showError(error) } }
  async function start(): Promise<void> { if (!current) return; setBusy(true); try { await window.dime.enqueueTorrent({ id: current.id, files: selected, destination }); setInputs((items) => items.filter((item) => item.id !== current.id)) } catch (error) { showError(error) } finally { setBusy(false) } }
  const torrents = jobs.filter((job) => job.options.torrent)
  const filtered = useMemo(() => torrents.filter((job) => job.title.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || filter === 'downloading' && ['queued', 'downloading', 'postprocessing'].includes(job.state) || filter === 'attention' && job.state === 'blocked' || job.state === filter)), [jobs, query, filter])
  const files = current?.details?.files.filter((file) => file.path.toLowerCase().includes(fileSearch.toLowerCase())) ?? []
  const chosenBytes = current?.details?.files.filter((file) => selected.includes(file.index)).reduce((sum, file) => sum + file.length, 0) ?? 0
  return <div className="screen torrents-screen" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDrop={(event) => { event.preventDefault(); for (const file of Array.from(event.dataTransfer.files)) { const path = window.dime.getDroppedTorrentPath(file); if (path) void add(path) } }}>
    <div className="page-heading"><div><h1>Torrents</h1><p>Magnet links and torrent files. Your files, kept intact.</p></div><button className="secondary" onClick={() => void window.dime.importTorrent().then((input) => { if (input) merge(input) }).catch(showError)}><FolderOpen /> Add torrent file</button></div>
    <form className="torrent-magnet" onSubmit={(event) => { event.preventDefault(); void add(magnet) }}><input aria-label="Magnet link" placeholder="Paste a magnet link, or drop a .torrent file here" value={magnet} onChange={(event) => setMagnet(event.target.value)} /><button className="primary" disabled={!magnet.trim()}><DownloadSimple /> Add magnet</button></form>
    <div className="association-row"><span>{association ? 'Browser magnet links open in dlME.' : 'Set dlME as your torrent app to open browser magnet links here.'}</span><button onClick={() => void window.dime.torrentAssociation(true).then(setAssociation).catch(showError)}>Make dlME my default torrent app</button><button onClick={() => void window.dime.torrentAssociation().then(setAssociation).catch(showError)}>Refresh status</button></div>
    <div className="torrent-toolbar"><input type="search" aria-label="Search torrents" placeholder="Search torrents" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} /><select aria-label="Torrent status" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0) }}><option value="all">All torrents</option><option value="downloading">Downloading</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="attention">Needs attention</option><option value="cancelled">Cancelled</option></select></div>
    {!filtered.length && <div className="torrent-empty">No torrents in this view. Add a magnet or a torrent file to begin.</div>}
    {filtered.slice(page * 8, page * 8 + 8).map((job) => <section className="torrent-entry" key={job.id}><JobCard job={job} showError={showError} /><div className="torrent-entry-tools"><button onClick={() => setDetails(details === job.id ? undefined : job.id)}>{details === job.id ? 'Hide details' : 'Files & peers'}</button><button onClick={() => void window.dime.openTorrentFolder(job.id).catch(showError)}><FolderOpen /> Open folder</button>{['completed', 'cancelled'].includes(job.state) && <button onClick={() => void window.dime.removeHistoryRecord(job.id).then(() => window.dispatchEvent(new Event('dlme-history-refresh'))).catch(showError)}>Remove from history</button>}</div>{details === job.id && <div className="torrent-details"><p>{job.progress.peers ?? 0} peers · {job.progress.seeders ?? 0} seeders · Upload {bytes(job.progress.uploadSpeed ?? 0)}/s</p><p>Info hash: <code>{job.options.torrent!.infoHash}</code></p><p>Trackers: {job.options.torrent!.trackers?.map((tracker) => { try { return new URL(tracker).hostname } catch { return 'Invalid tracker' } }).join(', ') || 'DHT / peer exchange'}</p><div className="torrent-detail-files">{job.options.torrent!.files.filter((file) => file.selected).map((file) => <div key={file.index}><span>{file.path}</span><small>{bytes(file.completed ?? 0)} / {bytes(file.length)}</small></div>)}</div></div>}</section>)}
    <Pagination page={page} count={filtered.length} size={8} change={setPage} />
    {current && <div className="modal-backdrop"><section className="torrent-dialog" role="dialog" aria-modal="true" aria-labelledby="torrent-dialog-title" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) void close(); if (event.key === 'Tab') { const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')); const first = elements[0], last = elements[elements.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } } }}>
      <div className="torrent-dialog-heading"><div><h2 id="torrent-dialog-title">Add Torrent</h2><p>{inputs.length > 1 ? `${inputs.length} torrents waiting · ` : ''}{current.name}</p></div><button autoFocus disabled={busy} aria-label="Close Add Torrent" onClick={() => void close()}><X /></button></div>
      {current.status === 'resolving' || current.status === 'pending' ? <p className="metadata-status" role="status">Retrieving torrent metadata… No payload files are downloading yet.</p> : current.status === 'error' ? <div role="alert"><p>{current.error}</p><button onClick={() => void window.dime.resolveTorrent(current.id).then(merge).catch((error) => { if (!String(error).includes('cancelled')) showError(error) })}>Retry metadata</button></div> : <>
        <div className="torrent-destination"><label htmlFor="torrent-destination">Save to</label><input id="torrent-destination" value={destination} onChange={(event) => setDestination(event.target.value)} /><button onClick={() => void window.dime.selectDownloadFolder().then((folder) => { if (folder) setDestination(folder) }).catch(showError)}>Browse</button></div>
        <div className="torrent-file-toolbar"><input type="search" aria-label="Search torrent files" placeholder="Search files" value={fileSearch} onChange={(event) => { setFileSearch(event.target.value); setFilePage(0) }} /><button onClick={() => setSelected(current.details!.files.map((file) => file.index))}>Select all</button><button onClick={() => setSelected([])}>Select none</button></div>
        <div className="torrent-file-list">{files.slice(filePage * 20, filePage * 20 + 20).map((file) => <label key={file.index}><input type="checkbox" checked={selected.includes(file.index)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, file.index] : items.filter((index) => index !== file.index))} /><span>{file.path}</span><small>{bytes(file.length)}</small></label>)}</div>
        <Pagination page={filePage} count={files.length} size={20} change={setFilePage} />
      </>}
      <div className="torrent-dialog-footer"><span>{selected.length} files · {bytes(chosenBytes)}<small>Uploading can occur during download. Transfer stops at completion.</small></span><button disabled={busy} onClick={() => void close()}>Cancel</button><button className="primary" disabled={busy || current.status !== 'ready' || !selected.length} onClick={() => void start()}>{busy ? 'Adding…' : 'Download'}</button></div>
    </section></div>}
  </div>
}
function Pagination({ page, count, size, change }: { page: number; count: number; size: number; change: (page: number) => void }): React.JSX.Element { const last = Math.max(0, Math.ceil(count / size) - 1); return <div className="torrent-pagination"><button disabled={!page} onClick={() => change(page - 1)}>Previous</button><span>{count} items · Page {Math.min(page, last) + 1} of {last + 1}</span><button disabled={page >= last} onClick={() => change(page + 1)}>Next</button></div> }
function bytes(value: number): string { const units = ['B', 'KB', 'MB', 'GB', 'TB']; let index = 0; while (value >= 1024 && index < 4) { value /= 1024; index++ } return `${value.toFixed(index ? 1 : 0)} ${units[index]}` }

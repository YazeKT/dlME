# Changelog

All notable public changes to dlME are recorded here. The project uses semantic versioning while it is practical; versions below 1.0 may change workflows as the beta develops.

## [Unreleased]

### Planned

- Broader torrent protocol compatibility and continued website testing.
- Signed Windows releases when a code-signing certificate is available.

## [1.1.0] - 2026-09-25

### Added

- Added search and phase filters to the current-download view and type/status filters to History.
- Added creator-aware filenames, embedded metadata, cover artwork, chapters, cleaned JSON sidecars, and source artwork sidecars.
- Added installed-app update checks, downloads, and restart-to-install through official public GitHub releases.

### Fixed

- Current downloading and converting work now leads Downloader; completed items stay in History.
- Torrent cancellation now preserves payload and resume files regardless of media partial-cleanup settings.
- Product-site and in-app media images preserve their source aspect ratio.

## [1.0.0] - 2026-09-18

### Added — desktop torrent downloading

- Added a dedicated Torrents workspace with magnets, torrent-file import, drag-and-drop, search, status filters, and queue pagination.
- Added Windows installer associations for browser magnet links and `.torrent` files. Links open Add Torrent whether dlME is closed, running, minimized, or in the tray; a second launch forwards to the existing instance.
- Added metadata-only lookup before Download, destination selection, and a searchable, paginated file checklist. All files are initially selected; users can choose a subset.
- Added torrent support for every file category, including games, applications, documents, media, archives, and disk images. Files retain their contents, extensions, and folder structure; dlME does not execute, install, extract, convert, or stream them automatically.
- Added the bundled aria2 1.37.0 engine with authenticated local RPC, piece integrity checking, persistent resume metadata, and real speed, peer, seeder, upload, and progress reporting.
- Added explicit waiting-for-peers states, duplicate protection, safe Windows path validation, and prevention of unrelated-file overwrites.
- Torrent transfers stop at completion. Uploading may occur while downloading; continued post-download seeding is disabled.

### Fixed — media output, progress, and stopping

- Explicitly enabled yt-dlp progress when final-path printing activates quiet mode; previously the progress bar could remain empty throughout a transfer.
- Buffered and parsed complete structured lines from stdout and stderr, including messages split between chunks. Unknown totals now use indeterminate progress instead of a misleading empty bar.
- Preserved the `none` video/audio codec markers in analysis. Previously these markers were removed, hiding which exact streams lacked audio or video.
- Paired exact video-only selections with available audio and required the expected output streams during FFprobe validation. A container with only a video stream can no longer pass normal video-with-audio completion checks.
- Replaced ignored Windows stop failures with checked process-tree termination, including forced descendant termination. Pause and Cancel show pending feedback and actionable errors.
- Prevented stopped jobs from being revived by late progress, retry scheduling, or output-validation callbacks.
- Made muting effective for running downloads by reading the current preference at playback time instead of retaining the startup value.

### Changed — defaults and interface

- Changed new audio defaults from MP3 / 192 kbps to Original / Best and Best quality. Explicit conversion formats remain available, and Best conversion uses the highest encoder quality rather than yt-dlp's default quality.
- Kept 1080p MP4 as the default video output; existing jobs and explicit saved output preferences are preserved.
- Added a persistent Mute app sounds preference and speaker toggle. Visual completion notifications remain separately configurable and are silent while muted.
- Enlarged live logs, added adjustable terminal height and an expanded view, and retained diagnostic export.
- Moved active downloads above logs and added queue pagination so jobs beyond the first six remain reachable.
- Set the current product identity to 1.0.0 Stable while retaining historical beta release entries and existing upgrade identifiers.

### Compatibility and limitations

- Windows 10/11 x64, installer and portable editions. Browser/file associations require the installed edition; Windows or the browser may ask users to select or approve dlME.
- BitTorrent v1 and hybrid torrents containing v1 metadata are supported. Pure v2, website scraping, torrent search, embedded playback, and continued seeding are not included.
- Peer availability determines whether a torrent can transfer. Metadata lookup times out with retry guidance if peers cannot supply it.
- Pause preserves resumable data; resume may check existing pieces or restart interrupted media conversion. Clearing history does not delete downloads.
- The Windows executables remain unsigned. Stable does not imply Authenticode signing or universal website/swarm availability.
- This local release candidate has not been published to GitHub. Verification evidence is recorded separately in `docs/VERIFICATION-1.0.0.md`.

## [0.9.1] - 2026-09-11

### Fixed: Chromium cookie recovery

- Recognized yt-dlp's `Could not copy Chrome cookie database` failure and contextual cookie-database permission errors.
- Retried public analysis and downloads once without browser access when Chrome, Edge, or Brave cookies are unavailable.
- Reset the temporary fallback on manual Retry so an authenticated browser session can be attempted again.

### Minor: clearer and safer diagnostics

- Replaced raw cookie-access tracebacks with one actionable live-log message.
- Removed Windows profile names and credential-shaped values from engine log messages.
- Expanded Settings, the user guide, and troubleshooting guidance for locked Chromium profiles and Firefox recovery.

## [0.9.0] - 2026-09-10

### Major: a complete Open Beta workspace

- Added a Files browser with search, category, availability, sorting, and pagination.
- Added the full extractor directory reported by the installed yt-dlp engine, with compact search and filters.
- Added `Audio`, `Video`, `Image`, `Application`, `Zip`, and `Others` download folders.
- Added local legal-document import and a structured About area for release notes and licenses.

### Major: reliable media output

- Made MP4 the normal video output instead of leaving WebM files behind.
- Applied FFmpeg conversion arguments even when a user selects an exact stream.
- Added FFprobe validation before a job is marked complete.
- Preserved partial downloads for supported retries and resume operations.

### Minor: denser interface

- Corrected the visible brand to dlME and set the public version to 0.9.0 Open Beta.
- Removed the unused downloader defaults panel and title-bar status counters.
- Removed the duplicated local-engine footer entry.
- Enlarged live logs and reduced unused spacing throughout Downloader, Supported, Files, and About.

### Minor: release engineering

- Pinned downloadable engines to release-specific URLs and SHA-256 checksums.
- Added public documentation, repository templates, CI, security guidance, and release checks.
- Added third-party license inventories and engine provenance records.

### Fixed

- Kept the file browser useful after history is cleared.
- Prevented stale or escaped filesystem paths from being opened through the app.
- Marked missing historical outputs instead of presenting them as available.
- Classified site challenges and outdated-engine failures without claiming a successful download.

## Earlier development builds

Internal builds from 2026-09-01 used 1.x labels. Those builds were not public releases. Public Open Beta numbering begins at 0.9.0.

[Unreleased]: https://github.com/YazeKT/dlME/compare/v1.0.0...HEAD
[0.9.1]: https://github.com/YazeKT/dlME/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/YazeKT/dlME/releases/tag/v0.9.0

[1.0.0]: https://github.com/YazeKT/dlME/compare/v0.9.1...v1.0.0

# Changelog

All notable public changes to dlME are recorded here. The project uses semantic versioning while it is practical; versions below 1.0 may change workflows as the beta develops.

## [Unreleased]

### Planned

- Continue compatibility testing as supported websites change.
- Add signed Windows releases when a code-signing certificate is available.

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

[Unreleased]: https://github.com/YazeKT/dlME/compare/v0.9.1...HEAD
[0.9.1]: https://github.com/YazeKT/dlME/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/YazeKT/dlME/releases/tag/v0.9.0

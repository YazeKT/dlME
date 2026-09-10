# dlME 0.9.0 Open Beta

## Scope and phases

1. Reviewed the existing Electron/React app and installed six GitHub skills.
2. Corrected visible branding, removed the downloader defaults panel, removed
   titlebar counters and duplicate local-engine footer, and enlarged logs.
3. Kept MP4 as the default, fixed exact-stream conversion, verified containers
   using FFprobe, and introduced category folders.
4. Added Files with search, counts, sorting, availability filters, pagination,
   and open/reveal actions. Fit window keeps page controls visible.
5. Replaced the 12-site showcase with the complete installed-engine list,
   including broken flags, search, type/initial filters, and pagination.
6. Added About sections, detailed release notes, licenses, and custom documents.
7. Built and exercised Electron with an isolated test profile.

## GitHub skills applied

Installed into the user's Codex skills folder; available automatically on the
next turn. Read and applied during this update:

- anthropics/skills — frontend-design: compact intentional hierarchy.
- vercel-labs/agent-skills — react-best-practices: memoized filtering,
  independent parallel reads, direct icon imports (88 modules instead of 4,573).
- vercel-labs/agent-skills — web-design-guidelines: labelled controls, semantic
  tables, focus, reduced motion, bounded lists, and dark/light states.
- mindrally/skills — electron-development: typed preload and main-process I/O.
- ComposioHQ/awesome-claude-skills — file-organizer: categories and file preservation.
- digitalsamba/claude-code-video-toolkit — ffmpeg: H.264/AAC and FFprobe checks.

## Storage and compatibility

New profiles use Downloads/dlME with Audio, Video, Image, Application, Zip,
and Others subfolders. Existing configured paths remain valid. Existing
files are discovered without being moved, renamed, converted, or overwritten.
Remembered output folders persist independently of download history.

The downloader saves supported video/audio media. Image, Application, Zip,
and Others are file-browser categories; this release does not introduce a
general-purpose installer/archive downloading engine.

The profile directory and app ID retain their legacy identifiers for upgrade
compatibility. Earlier development releases used 1.x; the approved beta version
is 0.9.0. Release output is versioned so previous builds remain available.

Custom documents: About → Licenses & documents → Add document. Import
Markdown or plain text up to 2 MB; files are copied locally and displayed as
text. The user's final legal wording has not yet been supplied.

## Licensing status

The existing MIT license is preserved. Actual dependency licenses, GPL/LGPL
texts, engine hashes/configuration, Electron/Chromium notices, and matching
yt-dlp notices are included. The final section of
resources/licenses/THIRD-PARTY-NOTICES.md records the complete corresponding
source work still required before public redistribution. This build is for
local review and has not been published.

## Validation

Run `npm run verify` for TypeScript, unit checks, and production build.
Run `node scripts/smoke-beta.mjs` with DLME_PLAYWRIGHT_PATH pointing to an
installed Playwright package for the isolated Electron integration workflow.
Set DLME_TEST_EXE to an unpacked executable to exercise packaged resources.
Screenshots and results are written under verification/0.9.0.

The previous source snapshot is in backups/before-0.9.0.

### Final results

- 28 unit checks passed across six files; TypeScript and production build passed.
- Packaged Electron loaded 1,752 extractors from yt-dlp 2026.08.19.
- Exact WebM stream downloaded through HTTP, converted to H.264 MP4 with audio,
  and verified by FFprobe; MP3 extraction also passed.
- Search, category/status/type filters, pagination, minimum-size layout,
  dark/light rendering, history-independent file browsing, path authorization,
  and custom-document import passed. OS launch and dialog-selection boundaries
  were stubbed in the automated test; the actual IPC and copy logic ran.
- Public download: 5,510,872-byte MP4 from the MediaElement sample repository,
  saved and verified under Video by the packaged app.
- W3's sample host returned an anti-bot challenge; a second sample host timed
  out. Neither was bypassed. The app now reports anti-bot errors accurately.
- Packaged workflow reported no renderer errors.

### Installed review build

- Installer exited with code 0. The installed executable reported product version `0.9.0.0`.
- Desktop dlME shortcut targets the new installed executable. The old diME
  desktop shortcut was archived in backups/before-0.9.0; the old installation
  remains available for recovery.
- All three original completed history records were retained. Files reports
  one present MP4 and two missing historical sample outputs. No existing
  downloaded media was moved or deleted.
- Native Windows check confirmed Files navigation and Show in folder opens
  Explorer at the existing download folder. The beta is left open for review.

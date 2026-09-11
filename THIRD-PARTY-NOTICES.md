# Third-party software notices

dlME invokes several separately maintained tools. Their names identify their projects and do not imply endorsement of dlME.

## yt-dlp 2026.08.19

- Project: <https://github.com/yt-dlp/yt-dlp>
- Matching tag: <https://github.com/yt-dlp/yt-dlp/tree/2026.08.19>
- Source archive: <https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.tar.gz>

yt-dlp source uses the Unlicense. The official PyInstaller Windows executable includes third-party GPLv3+ code and is distributed as GPLv3+. Its license and generated third-party notices are bundled with dlME.

## FFmpeg and FFprobe

- Version: `N-126374-g089a48eb36-20260831`
- Revision: `089a48eb36`
- Build release: `autobuild-2026-08-31-20-15`
- Project: <https://ffmpeg.org/>
- Build recipes: <https://github.com/yt-dlp/FFmpeg-Builds/tree/autobuild-2026-08-31-20-15>

The bundled static build enables GPL and version 3 components, including libx264. It is GPL-3.0-or-later and is not part of dlME's MIT license. A public binary release must distribute matching source and build materials beside the Windows binaries in version-matched corresponding-source release assets.

## Deno 2.9.6

Deno is distributed under the MIT License and includes other third-party components. The Deno license and notices are included in the packaged licenses directory. Source: <https://github.com/denoland/deno/tree/v2.9.6>.

## Electron and Chromium

Electron 44.1.0 is MIT-licensed. Electron and Chromium license texts are included in the packaged application. Source: <https://github.com/electron/electron/tree/v44.1.0>.

## JavaScript and native dependencies

`resources/licenses/APPLICATION-DEPENDENCIES.txt` records installed production packages, versions, source locations, and available license texts. Each dependency remains under its own terms.

## Corresponding source

Every public binary release that contains GPL-covered engines must include matching source and build materials in the same GitHub Release. A tag, upstream link, license text, or source snapshot for a different version is not a substitute for the matching source package.

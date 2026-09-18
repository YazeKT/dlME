# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Windows users who have permission to save online video, audio, or playlists and want a clear, inspectable path from a media URL to a local file.

## Product Purpose

dlME is a focused Windows media and torrent downloader. It analyzes a URL, exposes practical video and audio choices, reports the real download job, validates completed media, and keeps files browsable on the user's computer.

## Positioning

dlME joins the complete workflow in one local Windows interface: source analysis, output choice, live engine feedback, recovery, FFprobe completion validation, organized folders, and history-independent filesystem browsing.

## Operating Context

Users paste public or account-authorized media URLs, choose video or audio output, monitor progress and sanitized engine logs, and open or reveal completed files in Windows. Setup and portable x64 editions are provided through GitHub Releases.

## Capabilities and Constraints

- Video defaults to MP4; audio choices include MP3, M4A, Opus, WAV, and original/best.
- dlME can preserve supported partial transfers and retry temporary or browser-cookie access failures.
- Public media retries once without browser access when Chromium cookies are unavailable.
- FFprobe checks the final media before completion is reported.
- Files are organized into Audio, Video, Image, Application, Zip, and Others categories.
- The Supported directory reports extractor entries from the installed yt-dlp engine; it does not guarantee that every URL works.
- dlME does not bypass DRM, paywalls, access controls, regional restrictions, or site challenges.
- The current Windows executables are unsigned.

## Brand Commitments

- The visible brand is exactly `dlME`.
- The official logo and electric mint primary color are preserved.
- The product voice is direct, practical, technically honest, and calm.
- Public credit: created by Kirsten Trimaley and published by Yaze Media.

## Evidence on Hand

- Real product screenshots in `docs/assets/`.
- Product behavior and claims documented in `README.md`, `CHANGELOG.md`, and `docs/`.
- Automated behavior tests in `tests/` and Windows CI workflows in `.github/workflows/`.
- Runtime origins, versions, and hashes in `resources/engine/runtime-manifest.json`.
- Public release assets and checksums on the official `YazeKT/dlME` GitHub repository.
- No testimonials, customer logos, pricing claims, or usage totals are available and must not be fabricated.

## Product Principles

- Show the real job and its real state.
- Verify completion instead of assuming it.
- Keep user data and downloaded files local.
- Recover safely and explain failures clearly.
- Describe support honestly and require responsible use.

## Accessibility & Inclusion

The product website must remain keyboard accessible, readable at narrow widths, high contrast in dark mode, and fully understandable with reduced motion enabled.

## Stable torrent capability

Arbitrary payload categories, original structure, browser magnet handoff, file selection, resume, and piece verification. No advertising, promoted-game feed, or embedded player. Installed associations are separate from portable use.

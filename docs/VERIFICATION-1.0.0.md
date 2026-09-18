# dlME 1.0.0 Stable — local verification

Verified on Windows x64 on 2026-09-18. This report records the local checks for the 1.0.0 Stable release; GitHub CI and uploaded-asset verification are recorded separately in the release notes.

| Area | Evidence |
| --- | --- |
| Automated checks | TypeScript, behavior tests, and production renderer/main/preload builds pass. Tests include progress framing, format selection, torrent paths/metadata, and real Windows descendant termination. |
| Video with audio | Packaged separate-track DASH downloads produce MP4 H.264/AAC, MKV H.264/AAC, and WebM VP9/Opus. Exact video-only selection includes audio. FFprobe verifies expected streams. |
| Audio | Original/Best retains AAC; MP3, M4A, Opus, and WAV produce audio-only streams in their requested formats. |
| Stop controls | Throttled HTTP transfer tests confirm Pause ends the connection, Resume continues, and Cancel ends the connection without automatic restart. |
| Controlled torrents | Magnet metadata, mixed executable/document/archive fixtures, selected-file transfer, live progress, Pause, application restart, Resume, and byte-for-byte integrity pass. |
| External torrent inputs | Packaged cold-start and second-instance magnets open Add Torrent. Installed Windows ShellExecute tests pass for magnet links and `.torrent` files. Windows currently points magnets to dlME. |
| Public media | The packaged Big Buck Bunny download completes and is validated. |
| Public torrent | The permitted Sintel torrent completes a selected subtitle download; piece verification, size, and subtitle contents pass. |
| UI | Screenshots inspected for Add Torrent, completion/details, OLED/charcoal/light minimum windows, expanded terminal, and media progress. |
| Sound preference | Speaker toggle changes the saved preference immediately; muting survives renderer reload. Sound paths read current preferences, and notifications request silence while muted. |
| Upgrade preservation | Installed 0.9.1 → 1.0.0 upgrade returned exit code 0; all 116 existing profile files remained present and unchanged immediately after installation. A local backup was taken first. |
| Portable launch | The final portable executable extracts and opens a dlME window. Full transfer tests run against the packaged and installed application; Playwright cannot attach directly through the portable launcher. |
| Dependency audit | Production npm audit reports zero vulnerabilities. This does not audit every bundled native engine. |
| Source materials | Version-matched torrent-engine and documented static-library sources are checksum-pinned. The corresponding-source core is generated and the binary source gate passes using the verified FFmpeg source-audit run. The stable release supplies the required FFmpeg source companion parts alongside the binaries. |

Local reports and screenshots are in ignored `verification/1.0.0/`. Reproducible smoke commands are `npm run smoke:stable`, `npm run smoke:media`, and `node scripts/smoke-public-torrent.mjs`; set `DLME_PLAYWRIGHT_PATH` to an available Playwright installation and `DLME_TEST_EXE` to the build under test. The public torrent test first requires its small `sintel.torrent` fixture in the verification directory.

## Limits

- BitTorrent v1 and hybrid torrents with v1 metadata; pure v2 is unsupported.
- Torrent transfer still depends on reachable trackers/peers or web seeds. One public test cannot establish every swarm's availability.
- Installed Windows associations and browser permission prompts govern external links. Portable builds do not register temporary executable paths.
- No advertising, promoted games, or embedded player. Game/application payloads are supported and never automatically run.
- Windows executables remain unsigned. No byte-for-byte rebuild of upstream engine executables is claimed.
- Tests verify preference/state changes; subjective speaker audibility was not measured.

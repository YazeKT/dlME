# Engine provenance

dlME 0.9.0 uses the following pinned Windows x64 runtimes.

| Component | Version | Release artifact SHA-256 |
| --- | --- | --- |
| yt-dlp.exe | 2026.08.19 | `66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a` |
| Deno ZIP | v2.9.6 | `15e5300b0ba3c3695a7621d90160a746ec9e710228cee639afa9d580f6e3cd11` |
| FFmpeg ZIP | N-126374-g089a48eb36-20260831 | `fc496061ed2cc5264d7c9c4ec929365f15267aeb40c94fd34ce637a0ea6ce229` |

The exact URLs are recorded in `resources/engine/runtime-manifest.json`. `npm run fetch:runtimes` verifies these hashes before installing the files.

The FFmpeg build is from `yt-dlp/FFmpeg-Builds` release `autobuild-2026-08-31-20-15`. Its configuration enables GPL and version 3, including libx264, and the binary is GPL-3.0-or-later. The public release must include `dlME-0.9.0-corresponding-source.zip` alongside the executable artifacts.

An engine update changes executable code and may change licensing. Each dlME release must regenerate its manifest, dependency notices, corresponding-source package, smoke results, and checksums.

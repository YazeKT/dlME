# dlME

**dlME** is a local Windows desktop app for downloading media you are allowed to save. It combines a compact Electron interface with yt-dlp, FFmpeg, FFprobe, and Deno, and keeps download history and settings on your computer.

> **Open Beta:** dlME 0.9.0 is functional and tested, but its Windows executables are currently unsigned. Windows may display an unknown-publisher warning.

Created by **Kirsten Trimaley** and published by **Yaze Media**.

## What it does

- Downloads video as MP4 and extracts audio as MP3, M4A, FLAC, WAV, or OPUS.
- Uses FFprobe before marking completed media as playable.
- Shows real-time progress, speed, ETA, retries, and live engine logs.
- Organizes files into `Audio`, `Video`, `Image`, `Application`, `Zip`, and `Others`.
- Browses downloaded files independently of the download-history database.
- Searches and filters the extractor list reported by the installed yt-dlp engine.
- Supports optional browser cookies for media that requires an authenticated session.
- Keeps partial files when a download is stopped so supported transfers can resume.

Site support changes as websites change. A listed extractor does not guarantee that every URL will work. dlME does not bypass DRM, paywalls, access controls, or anti-bot challenges.

## Requirements

- Windows 10 or Windows 11, 64-bit
- Internet access for downloads and engine update checks
- Enough free space for the requested media and temporary merge files

## Install

Download the installer or portable build from [GitHub Releases](https://github.com/YazeKT/dlME/releases). Compare the file hash with the published `SHA256SUMS.txt` before running it.

- **Setup:** installs per user and creates normal Windows shortcuts.
- **Portable:** keeps its settings and history in `dlME-data` beside the executable.

See [Installation](docs/INSTALLATION.md) for detailed steps and the unsigned-beta warning.

## Build from source

```powershell
git clone https://github.com/YazeKT/dlME.git
cd dlME
npm ci
npm run fetch:runtimes
npm run licenses
npm run verify
npm run dev
```

Create Windows packages with:

```powershell
npm run package:win
```

Runtime downloads are pinned and checksum-verified for each dlME release. The executables themselves are excluded from Git.

## Documentation

- [User guide](docs/USER-GUIDE.md)
- [Installation](docs/INSTALLATION.md)
- [Downloads and file browser](docs/DOWNLOADS-AND-FILES.md)
- [Supported sites](docs/SUPPORTED-SITES.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Build guide](docs/BUILDING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Legal and licensing](docs/LEGAL.md)
- [Engine provenance](docs/ENGINE-PROVENANCE.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Privacy

dlME has no account system, advertising SDK, analytics, or telemetry. Settings, history, logs, and custom legal documents stay on the local computer. Network requests go to the media URL, the services required by yt-dlp, and official GitHub endpoints used for engine update checks. See [Privacy](docs/PRIVACY.md).

## License

The dlME application source is licensed under the [MIT License](LICENSE). Bundled and downloaded engines retain their own licenses. The official yt-dlp Windows executable and the included FFmpeg build contain GPL-covered software; they are not MIT-licensed. See [Third-party notices](THIRD-PARTY-NOTICES.md) and [Engine provenance](docs/ENGINE-PROVENANCE.md).

Use dlME only for media you own or have permission to download. You are responsible for following applicable law and the terms of the source website.

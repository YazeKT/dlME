# Architecture

dlME is an Electron 44 and React 19 desktop application written in TypeScript.

```text
Renderer (React)
    │ narrow typed preload API
Preload bridge
    │ validated IPC
Electron main process
    ├── SQLite settings and history
    ├── filesystem library
    ├── yt-dlp process controller
    ├── FFmpeg and FFprobe validation
    └── engine update service
```

The renderer runs with context isolation, sandboxing, Node integration disabled, and navigation restricted. Filesystem, process, SQLite, dialog, and shell operations remain in the main process.

The application retains `dime-downloader`, `com.dime.downloader`, and several internal `dime` identifiers for compatibility with existing profiles and installations. They are implementation identifiers; the visible product name is dlME.

Downloads and settings remain local. The Files browser reads authorized download roots independently of history and rejects canonical paths that escape those roots.

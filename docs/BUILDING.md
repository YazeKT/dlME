# Building dlME

## Prerequisites

- Windows 10 or 11 x64
- Git
- Node.js 24 or a compatible current LTS release
- PowerShell 7 or Windows PowerShell 5.1

## Development build

```powershell
npm ci
npm run fetch:runtimes
npm run licenses
npm run verify
npm run dev
```

`fetch:runtimes` downloads release-pinned Windows executables and rejects checksum mismatches. Do not replace those files without updating the version, provenance, notices, and release source package together.

## Package

```powershell
npm run package:win
```

Artifacts are written to the versioned directory under `release` (currently `release/0.9.1`). Run `npm run release:check` before upload.

## Corresponding source

```powershell
npm run release:source
```

This creates a release-source workspace and packages the upstream source and build materials identified by the runtime manifest. Inspect its generated report before publishing GPL-covered binaries.

## Native dependency

`better-sqlite3` must match the Electron ABI. Use `npm ci` on Windows and let electron-builder rebuild native modules for the packaged runtime.

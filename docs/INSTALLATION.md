# Installation

## Windows requirements

dlME 1.0.0 supports 64-bit Windows 10 and Windows 11.

## Verify the download

Download release files only from <https://github.com/YazeKT/dlME/releases>. In PowerShell, compare the installer hash with `SHA256SUMS.txt`:

```powershell
Get-FileHash -Algorithm SHA256 .\dlME-Setup-1.0.0-x64.exe
```

## Setup build

Run `dlME-Setup-1.0.0-x64.exe`, choose the installation location, and complete the per-user install. The uninstaller removes the application but preserves downloads and local settings unless you remove those folders yourself.

## Portable build

Place `dlME-Portable-1.0.0-x64.exe` in a writable folder and run it. Portable settings and history are stored in `diME-data` beside the executable. Move that folder together with the executable to preserve the portable profile.

## Unsigned Stable

The 1.0.0 executables are not Authenticode-signed. Windows may display an unknown-publisher warning or require an additional confirmation. Verify the GitHub source and SHA-256 checksum before deciding to run dlME.

## Updates

dlME can check for stable yt-dlp engine updates. Application releases are downloaded manually from GitHub. Downloaded files are never removed during an application update.

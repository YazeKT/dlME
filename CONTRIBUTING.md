# Contributing to dlME

Thank you for helping improve dlME. Bug reports, reproducible site-compatibility reports, documentation fixes, accessibility improvements, and focused pull requests are welcome.

## Before opening an issue

- Update to the newest dlME beta and stable yt-dlp engine offered by the app.
- Search existing issues.
- Remove private URLs, cookies, usernames, tokens, and personal file paths from logs.
- Confirm you have permission to test the supplied media URL.

## Development setup

Use Windows 10 or 11 with Node.js 24 or a compatible current LTS release.

```powershell
npm ci
npm run fetch:runtimes
npm run licenses
npm run verify
npm run dev
```

The renderer must not receive unrestricted Node.js or filesystem access. Add filesystem and process operations in the Electron main process and expose narrow typed methods through the preload bridge.

## Pull requests

1. Create a focused branch.
2. Preserve existing settings, history, downloaded files, and legacy application identifiers unless the change includes a tested migration.
3. Add meaningful tests for engine, storage, path-authorization, or state behavior.
4. Run `npm run verify` and `npm run release:check`.
5. Explain the user-visible change and the validation performed.

Do not commit runtime executables, downloaded media, databases, cookies, logs, release packages, or verification profiles.

By contributing, you agree that your contribution may be distributed under the project's MIT License.

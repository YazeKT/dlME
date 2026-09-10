# Downloads and file browser

New profiles default to the Windows Downloads folder under `dlME`:

```text
Downloads\dlME\
├── Audio\
├── Video\
├── Image\
├── Application\
├── Zip\
└── Others\
```

Video jobs go to `Video`; audio-only jobs go to `Audio`. The remaining categories let the Files table classify items found in remembered download roots. dlME 0.9.0 is a media downloader and does not provide a general application or archive download engine.

Existing custom output paths remain valid. dlME does not move, rename, convert, or delete existing files during migration. A history record may be marked missing when its output was moved outside the app.

Filesystem access is handled by the Electron main process. Open and reveal operations require a canonical path inside an authorized download root; symlink and junction escapes are rejected.

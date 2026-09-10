# User guide

## Download media

1. Paste a media URL into Downloader.
2. Select **Analyze URL**.
3. Review the detected item or playlist.
4. Choose video or audio and a format.
5. Select the items you want and start the download.

Video defaults to MP4. dlME may merge or convert streams with FFmpeg, then checks the result with FFprobe before marking it complete.

## Live activity

The activity area shows information reported by yt-dlp and dlME. Progress, speed, ETA, retries, and log lines are live values. A remote server can stop responding or change its behavior at any time.

**Stop & keep partial** stops the process and retains supported partial files. **Reset form** clears the current inputs; it does not delete completed downloads.

## Browser sessions

Browser cookies are disabled by default. Use them only when a site requires a session and you have permission to save the media. Firefox is usually the most reliable option on Windows because Chromium-profile encryption can block cookie access. Never attach cookie files to public issues.

## Files

Files searches the selected download roots directly, so clearing history does not hide existing files. Use search, category, availability, sort, and pagination controls to narrow the table. **Open** launches the file with Windows; **Show in folder** reveals it in Explorer.

## Supported

Supported displays the extractor directory reported by the installed yt-dlp engine. Search and filter it rather than treating the list as a guarantee. Login rules, regional limits, DRM, rate limits, anti-bot systems, and website changes can still prevent a download.

## About and legal documents

About shows the dlME version, changelog, bundled notices, and locally imported Markdown or text documents. Imported documents are copied to the local profile and are not uploaded by dlME.

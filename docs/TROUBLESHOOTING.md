# Troubleshooting

## A video did not finish as MP4

Check that FFmpeg and FFprobe are available in Settings, update yt-dlp, and retry. Include the selected format and sanitized final log lines in a bug report. Completed video should not be reported until FFprobe recognizes a playable media stream and MP4 container.

## Chrome cookie database could not be copied or decrypted

dlME 0.9.1 automatically retries public media once without browser access. For media that requires an account, fully exit Chrome, Edge, or Brave, including background processes, then select Retry. If the profile remains unavailable, use a signed-in Firefox profile. Windows can lock or restrict Chromium cookie databases while the browser is running.

## Site challenge or access denied

Open the URL in your normal browser and confirm it is available to you. Update yt-dlp. dlME does not bypass anti-bot pages, DRM, paywalls, or access controls.

## A history item is missing

The file may have been moved, renamed, or deleted outside dlME. Use the Files tab to search current download roots. Missing history records remain visible so the app does not pretend the file still exists.

## Downloads stopped when the window closed

When active jobs exist, choose **Keep Running** to leave dlME in the system tray. **Stop & Exit** preserves partial files before closing.

## Report a problem

Follow [Support](../SUPPORT.md). Remove cookies, credentials, private URLs, downloaded content, and identifying local paths from diagnostics.

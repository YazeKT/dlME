# Privacy

Effective: 10 September 2026

dlME is a local desktop application published by Yaze Media.

## Data stored locally

dlME may store settings, download history, remembered output folders, engine metadata, logs, partial-download state, and legal documents that the user imports. Installer profiles use the user's application-data folder. Portable profiles use `dlME-data` beside the portable executable.

## Network activity

dlME sends requests needed to analyze and download the URL supplied by the user. yt-dlp and supported JavaScript runtimes may contact the media service and related content-delivery or challenge endpoints. The engine updater contacts official GitHub release endpoints. The application does not operate an analytics or telemetry service.

## Browser cookies

When the user explicitly enables browser-session access, yt-dlp reads cookies from the selected local browser profile for the requested operation. dlME does not upload those cookies to Yaze Media. Cookies are still sent to the relevant website as part of authenticated requests.

## User control

Users can clear history from the app, remove logs and imported legal documents from their local profile, and delete the portable data folder. Clearing history does not delete downloaded media. Uninstalling the setup build preserves user data and downloads by default.

## Third parties

Websites contacted for downloads apply their own privacy terms. GitHub applies its terms to release and update-check requests. Yaze Media does not control those services.

Questions can be raised through the repository's GitHub issue tracker without posting cookies, private URLs, credentials, or personal media.

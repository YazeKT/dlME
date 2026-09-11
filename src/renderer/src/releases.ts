export const releases = [
  { version: '0.9.1', date: '2026-09-11', label: 'Open Beta hotfix', title: 'Browser access that gets out of the way', groups: [
    { title: 'Fixed', items: ['Recognizes the Chrome cookie-database lock that previously stopped public downloads.', 'Automatically retries public media once without browser access when Chromium cookies are unavailable.', 'Applies the same recovery while analyzing a URL, before a download is created.'] },
    { title: 'Recovery & privacy', items: ['Manual Retry checks the selected browser again after you fully exit it.', 'Live logs show one clear recovery message instead of a traceback.', 'Local Windows profile names and credential-shaped values are removed from engine log messages.'] },
    { title: 'Guidance', items: ['Settings explains how to fully exit Chrome, Edge, or Brave, including background processes.', 'Firefox remains the recommended Windows option for authenticated downloads.'] }
  ] },
  { version: '0.9.0', date: '2026-09-02', label: 'Major beta update', title: 'A home for every download', groups: [
    { title: 'Major updates', items: ['New Files browser with category counts, search, sorting, pagination, and open-folder actions.', 'Complete supported-site directory from the installed yt-dlp engine, with search, filters, and page controls.', 'Organized download folders: Audio, Video, Image, Application, Zip, and Others.'] },
    { title: 'Improvements', items: ['Correct dlME branding and an explicit Open Beta version.', 'Wider live logs, tighter layouts, and simpler window and status bars.', 'In-app licenses and a local importer for your own legal documents.', 'Download defaults are available in Settings.'] },
    { title: 'Fixes', items: ['Exact-stream downloads now honor the selected output container.', 'Non-MP4 sources can be converted with FFmpeg; FFprobe checks the final MP4 container.', 'Files remain browsable after clearing history; missing outputs are marked clearly.'] }
  ] },
  { version: 'Earlier development builds', date: '2026-09-01', label: 'Foundation & minor updates', title: 'The download essentials', groups: [
    { title: 'Download engine', items: ['Pause, resume, retry, playlist selection, and local download history.', 'Bundled yt-dlp, FFmpeg, FFprobe, and Deno.', 'Unicode filename recovery and browser-session error guidance.'] },
    { title: 'Desktop experience', items: ['OLED, charcoal, and light themes with configurable accents.', 'Completion notifications, diagnostics export, tray mode, and onboarding.', 'Engine update checks, checksum verification, and rollback support.'] }
  ] }
]

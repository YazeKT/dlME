# dlME product website plan

## Outcome

Make the product page feel like the dlME app opened outward into a product story: OLED black, compact charcoal panels, electric mint status energy, real interface proof, and motion that behaves like a download job.

## Visitor path

1. Understand the promise: a link becomes a verified local file.
2. See a purpose-built dlME product visual in the first viewport, without stretching application UI.
3. Learn the three standout differences in depth: verified completion, resilient recovery, and filesystem-backed browsing.
4. Understand the complete Link → Choose → Follow → Keep workflow.
5. Inspect the real Windows interface in a dedicated uncropped screenshot gallery.
6. Inspect honest engine, build, privacy, compatibility, and unsigned-beta evidence.
7. Download the official Setup or Portable release from GitHub.

## Visual system

- Background: OLED Black `#000000`
- Primary surface: `#080B09`
- Raised surface: `#0D1210`
- Border: `#1B211E`
- Primary text: `#F4F7F5`
- Muted text: `#A4AFA9`
- Primary brand color: Electric Mint `#00F5A0`
- Typography: Segoe UI Variable / Segoe UI for all display and reading text; Cascadia Mono only for product states and build evidence.
- Density: 62–88px major section rhythm, 20–34px internal rhythm, compact evidence panels.
- Imagery: three 3:2 editorial product renders use dlME's black/charcoal/mint material language; real app captures are kept at their native 1120 × 760 proportions in a separate proof strip.

## Signature interaction

The page behaves like an active dlME job. A mint scroll-status line tracks the page, the hero exposes a live progress card, the workflow rail draws through each real stage, and release stats count in once. All motion completes rather than looping, and reduced-motion visitors receive the final static state.

## Standout feature hierarchy

1. Verified before complete: FFmpeg prepares the output and FFprobe checks the final container and playable streams.
2. Recovery without starting over: preserve partial transfers, retry temporary failures, and recover public media from locked Chromium cookies.
3. Files that outlive history: scan approved folders directly with search, categories, availability, sorting, pagination, Open, and Show in folder.
4. Inspectable engine: search the installed extractor directory and apply checksum-verified updates with rollback protection.
5. Local-first privacy: no dlME account, ads, analytics, or telemetry.

## Build evidence

The proof dashboard shows only current, defensible evidence: 1,752 extractor entries, 32/32 tests, zero current npm-audit findings, two Windows builds, four checksummed runtime executables, six file categories, SHA-256 release verification, and ten published 0.9.1 assets. The publishing workflow runs the app verification suite and npm audit before deployment, and the unsigned Open Beta warning remains adjacent.

## App-to-site update path

`scripts/sync-website.mjs` derives the source version and yt-dlp engine version locally, then resolves the newest published GitHub release during deployment so download buttons never point at an unreleased tag. The workflow also feeds current test, audit, runtime, and release-asset totals into the site. It runs on every push to `main`, so normal app updates redeploy the product site. Feature claims and the extractor snapshot still require a human release review because code cannot responsibly invent product copy.

## Hosting

The static `/website` bundle is deployed by `.github/workflows/pages.yml` to GitHub Pages. It requires no paid service, framework runtime, analytics, or third-party font request.

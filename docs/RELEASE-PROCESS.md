# Release process

1. Choose the dlME version and freeze all runtime versions.
2. Update changelog, bundled documentation, and runtime provenance.
3. Run `npm ci`, `npm run fetch:runtimes`, and `npm run licenses`.
4. Run `npm run verify` and the packaged smoke workflow.
5. Build the corresponding-source archive and inspect its report.
6. Run `npm run package:win` and `npm run release:check`.
7. Generate `SHA256SUMS.txt` for every release asset.
8. Verify installer, portable data behavior, and uninstall data preservation.
9. Tag the exact tested source commit.
10. Create a GitHub stable release for 1.0.0 and later and upload executables, checksums, SBOM/license report, and corresponding source.
11. Download the uploaded assets and verify their checksums again.

For 1.0.0, the FFmpeg source-audit artifact has expired. The source-cache publishing workflow can recover the identical cache from an existing release, verifies all three pinned hashes, and downloads the newly uploaded parts again before publication. After the old beta releases are removed, use `v1.0.0` as the source release for this unchanged cache. A different FFmpeg runtime requires a new matching audit and hash inventory.

Remove superseded release pages and downloads only after the replacement is public and verified. Keep historical source tags and changelog entries so old builds remain auditable.

Do not move a draft to public release if required source, license texts, hashes, or build instructions are missing.

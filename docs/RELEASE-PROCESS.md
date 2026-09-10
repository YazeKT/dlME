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
10. Create a GitHub prerelease and upload executables, checksums, SBOM/license report, and corresponding source.
11. Download the uploaded assets and verify their checksums again.

Do not move a draft to public release if required source, license texts, hashes, or build instructions are missing.

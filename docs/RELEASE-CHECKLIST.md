# Release checklist

## Source

- [ ] Version, changelog, README, and About information agree.
- [ ] Working tree contains no secrets, local media, profiles, logs, or runtime binaries.
- [ ] CI passes from a clean checkout.
- [ ] Tag points to the tested commit.

## Runtime and licenses

- [ ] Runtime downloads use exact URLs and checksums.
- [ ] Runtime executable hashes match the generated build details.
- [ ] Application dependency notices are current.
- [ ] GPL and other required license texts are packaged.
- [ ] Complete matching corresponding source and build materials are available beside the binaries.

## Windows packages

- [ ] Setup installation succeeds.
- [ ] Portable profile stays beside the executable.
- [ ] Real MP4 download and FFprobe validation pass.
- [ ] Audio extraction passes.
- [ ] Update, file browsing, and Show in folder work.
- [ ] Uninstall preserves downloads and user data.
- [ ] Authenticode status is recorded in release notes.

## GitHub

- [ ] Release is marked prerelease while dlME is below 1.0.
- [ ] `SHA256SUMS.txt` covers every uploaded asset.
- [ ] Uploaded assets match local hashes after re-download.
- [ ] README and documentation links render correctly.
- [ ] Private vulnerability reporting and dependency alerts are enabled.

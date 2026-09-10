param(
  [string]$OutputRoot = (Join-Path (Get-Location) 'release-source'),
  [string]$DependencyArtifactDirectory = (Join-Path (Join-Path (Get-Location) 'release-source') 'source-audit-artifact'),
  [string]$SourceAuditRunId = ''
)

$ErrorActionPreference = 'Stop'
function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}

$release = '0.9.0'
$packageRoot = Join-Path $OutputRoot "dlME-$release-corresponding-source"
$downloads = Join-Path $packageRoot 'upstream-source'
$dependencies = Join-Path $downloads 'ffmpeg-dependencies'
$workspace = (Resolve-Path '.').Path
$resolvedOutput = [IO.Path]::GetFullPath($OutputRoot)
if (-not $resolvedOutput.StartsWith($workspace, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The source-package output must remain inside the dlME workspace.'
}
if (Test-Path -LiteralPath $packageRoot) { Remove-Item -LiteralPath $packageRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $downloads | Out-Null

$items = @(
  @{ Name = 'yt-dlp-2026.08.19.tar.gz'; Url = 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.tar.gz'; Sha256 = '072aad4f2a7604e92155f61a275a4752dc64046c8f6d90df3710525d94cd37c1' },
  @{ Name = 'FFmpeg-089a48eb36.zip'; Url = 'https://github.com/FFmpeg/FFmpeg/archive/089a48eb36.zip'; Sha256 = '' },
  @{ Name = 'FFmpeg-Builds-ea2ec3c0e0dfb11069729b7df5cb234bb2145956.zip'; Url = 'https://github.com/yt-dlp/FFmpeg-Builds/archive/ea2ec3c0e0dfb11069729b7df5cb234bb2145956.zip'; Sha256 = '' }
)

$manifest = @()
foreach ($item in $items) {
  $target = Join-Path $downloads $item.Name
  Invoke-WebRequest -UseBasicParsing -Uri $item.Url -OutFile $target
  $hash = Get-Sha256 $target
  if ($item.Sha256 -and $hash -ne $item.Sha256) { throw "Checksum mismatch for $($item.Name)" }
  $manifest += [pscustomobject]@{ file = "upstream-source/$($item.Name)"; sha256 = $hash; source = $item.Url }
}

$dependencyTar = Join-Path $DependencyArtifactDirectory 'ffmpeg-dependency-sources.tar'
$dependencyChecksums = Join-Path $DependencyArtifactDirectory 'ffmpeg-dependency-source-checksums.txt'
$hasLocalArtifact = (Test-Path -LiteralPath $dependencyTar) -and (Test-Path -LiteralPath $dependencyChecksums)
$hasVerifiedRemoteArtifact = $false
$sourceAuditUrl = ''
if ($SourceAuditRunId) {
  $run = gh run view $SourceAuditRunId --repo YazeKT/dlME --json status,conclusion,url | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or $run.status -ne 'completed' -or $run.conclusion -ne 'success') {
    throw "Source audit run $SourceAuditRunId has not completed successfully."
  }
  $hasVerifiedRemoteArtifact = $true
  $sourceAuditUrl = $run.url
}
$isComplete = $hasLocalArtifact -or $hasVerifiedRemoteArtifact
if ($hasLocalArtifact) {
  New-Item -ItemType Directory -Force -Path $dependencies | Out-Null
  Copy-Item -LiteralPath $dependencyTar -Destination $dependencies -Force
  Copy-Item -LiteralPath $dependencyChecksums -Destination $dependencies -Force
  $listedFiles = @(Get-Content -LiteralPath $dependencyChecksums | Where-Object { $_ -match '^[0-9a-fA-F]{64}\s+' })
  if ($listedFiles.Count -lt 1) { throw 'The FFmpeg dependency checksum inventory is empty.' }
  $archiveFiles = @(tar -tf $dependencyTar)
  if ($LASTEXITCODE -ne 0) { throw 'The FFmpeg dependency source archive cannot be read.' }
  foreach ($line in $listedFiles) {
    $relativePath = ($line -replace '^[0-9a-fA-F]{64}\s+\*?', '').Replace('\', '/')
    if ($archiveFiles -notcontains $relativePath) { throw "The dependency archive is missing $relativePath" }
  }
  $manifest += [pscustomobject]@{ file = 'upstream-source/ffmpeg-dependencies/ffmpeg-dependency-sources.tar'; sha256 = Get-Sha256 (Join-Path $dependencies 'ffmpeg-dependency-sources.tar'); source = if ($sourceAuditUrl) { $sourceAuditUrl } else { 'GitHub Actions FFmpeg source-audit artifact' } }
  $manifest += [pscustomobject]@{ file = 'upstream-source/ffmpeg-dependencies/ffmpeg-dependency-source-checksums.txt'; sha256 = Get-Sha256 (Join-Path $dependencies 'ffmpeg-dependency-source-checksums.txt'); source = 'yt-dlp/FFmpeg-Builds download.sh at ea2ec3c0e0dfb11069729b7df5cb234bb2145956' }
} elseif ($hasVerifiedRemoteArtifact) {
  $manifest += [pscustomobject]@{ file = 'companion release assets: dlME-0.9.0-corresponding-source-ffmpeg.tar.part-*'; sha256 = 'See dlME-0.9.0-corresponding-source-part-checksums.txt in the release'; source = $sourceAuditUrl }
}

Copy-Item -LiteralPath 'resources\licenses\GPL-3.0.txt' -Destination $packageRoot -Force
Copy-Item -LiteralPath 'resources\licenses\yt-dlp-THIRD-PARTY-LICENSES.txt' -Destination $packageRoot -Force
Copy-Item -LiteralPath 'resources\licenses\RUNTIME-BUILD-DETAILS.txt' -Destination $packageRoot -Force
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $packageRoot 'SOURCE-MANIFEST.json') -Encoding utf8

if ($isComplete) {
  @'
# dlME 0.9.0 corresponding source

This package accompanies the dlME 0.9.0 Windows binaries. It contains the
matching yt-dlp release source, FFmpeg revision, and pinned FFmpeg-Builds
recipes. The dependency-source cache assembled by those recipes is supplied in
the same GitHub release as numbered `corresponding-source-ffmpeg.tar.part-*`
companion assets because it exceeds the per-file release size limit.

`SOURCE-MANIFEST.json` records each top-level artifact and SHA-256 digest. The
nested FFmpeg inventory records every source archive in the dependency cache.
`RUNTIME-BUILD-DETAILS.txt` records the shipped runtime versions, binary hashes,
FFmpeg configuration, and upstream locations.

The companion cache was produced by `download.sh` from yt-dlp/FFmpeg-Builds commit
ea2ec3c0e0dfb11069729b7df5cb234bb2145956. Use the included recipes and source
inputs to study, modify, or rebuild the GPL runtime. dlME application source is
available from https://github.com/YazeKT/dlME.
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Encoding utf8
  @"
dlME $release corresponding-source package
Completed: $([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))
FFmpeg dependency cache: supplied as checksummed companion release parts
Pinned FFmpeg-Builds commit: ea2ec3c0e0dfb11069729b7df5cb234bb2145956
Verified source-audit run: $sourceAuditUrl
"@ | Set-Content -LiteralPath (Join-Path $packageRoot 'SOURCE-PACKAGE-COMPLETE.txt') -Encoding utf8
  $archive = Join-Path $OutputRoot "dlME-$release-corresponding-source-core.zip"
} else {
  @'
# Corresponding-source package status

This workspace contains the exact yt-dlp source release, matching FFmpeg
revision, and pinned FFmpeg-Builds recipes used for dlME 0.9.0.

Download the artifact produced by `ffmpeg-source-audit.yml` into
`release-source/source-audit-artifact` and run this script again. Binary
publication remains blocked until the dependency archive is present.
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Encoding utf8
  $archive = Join-Path $OutputRoot "dlME-$release-corresponding-source-INCOMPLETE.zip"
}

if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -Path "$packageRoot\*" -DestinationPath $archive -CompressionLevel Optimal
Write-Host "Created corresponding-source package: $archive"
if (-not $isComplete) { throw 'Binary publication remains blocked: the FFmpeg dependency source artifact is missing.' }

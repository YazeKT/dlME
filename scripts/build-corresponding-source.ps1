param(
  [string]$OutputRoot = (Join-Path (Get-Location) 'release-source')
)

$ErrorActionPreference = 'Stop'

function Get-Sha256([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
  }
  finally { $stream.Dispose() }
}

$release = '0.9.0'
$packageRoot = Join-Path $OutputRoot "dlME-$release-corresponding-source"
$downloads = Join-Path $packageRoot 'upstream-source'
$workspace = (Resolve-Path '.').Path
$resolvedOutput = [IO.Path]::GetFullPath($OutputRoot)
if (-not $resolvedOutput.StartsWith($workspace, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The source-package output must remain inside the dlME workspace.'
}

New-Item -ItemType Directory -Force -Path $downloads | Out-Null

$items = @(
  @{
    Name = 'yt-dlp-2026.08.19.tar.gz'
    Url = 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.tar.gz'
    Sha256 = '072aad4f2a7604e92155f61a275a4752dc64046c8f6d90df3710525d94cd37c1'
  },
  @{
    Name = 'FFmpeg-089a48eb36.zip'
    Url = 'https://github.com/FFmpeg/FFmpeg/archive/089a48eb36.zip'
    Sha256 = ''
  },
  @{
    Name = 'FFmpeg-Builds-ea2ec3c0e0dfb11069729b7df5cb234bb2145956.zip'
    Url = 'https://github.com/yt-dlp/FFmpeg-Builds/archive/ea2ec3c0e0dfb11069729b7df5cb234bb2145956.zip'
    Sha256 = ''
  }
)

$manifest = @()
foreach ($item in $items) {
  $target = Join-Path $downloads $item.Name
  if (-not (Test-Path -LiteralPath $target)) {
    Invoke-WebRequest -UseBasicParsing -Uri $item.Url -OutFile $target
  }
  $hash = Get-Sha256 $target
  if ($item.Sha256 -and $hash -ne $item.Sha256) { throw "Checksum mismatch for $($item.Name)" }
  $manifest += [pscustomobject]@{ file = $item.Name; sha256 = $hash; source = $item.Url }
}

Copy-Item -LiteralPath 'resources\licenses\GPL-3.0.txt' -Destination $packageRoot -Force
Copy-Item -LiteralPath 'resources\licenses\yt-dlp-THIRD-PARTY-LICENSES.txt' -Destination $packageRoot -Force
Copy-Item -LiteralPath 'resources\licenses\RUNTIME-BUILD-DETAILS.txt' -Destination $packageRoot -Force
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $packageRoot 'SOURCE-MANIFEST.json') -Encoding utf8

@'
# Corresponding-source package status

This workspace contains the exact yt-dlp source release, the matching FFmpeg
revision, and the FFmpeg-Builds recipes used for dlME 0.9.0.

The bundled FFmpeg executable is statically linked with additional libraries.
Their exact source archives must be collected from the FFmpeg-Builds download
cache produced by the pinned build recipes before this package can be marked
complete. Run the pinned repository's `download.sh` in its documented Docker
environment, copy `.cache/downloads` into `upstream-source/ffmpeg-dependencies`,
record every hash in SOURCE-MANIFEST.json, and verify a rebuild.

Do not create SOURCE-PACKAGE-COMPLETE.txt until that audit succeeds. dlME's
binary-release check treats the absence of that marker as a hard failure.
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Encoding utf8

$archive = Join-Path $OutputRoot "dlME-$release-corresponding-source-INCOMPLETE.zip"
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -Path "$packageRoot\*" -DestinationPath $archive -CompressionLevel Optimal
Write-Host "Created incomplete audit workspace: $archive"
Write-Host 'Binary publication remains blocked until the dependency source cache is complete and independently verified.'

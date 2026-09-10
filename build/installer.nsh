!macro customInit
  SetDetailsPrint both
  DetailPrint "dlME by Yaze Media"
  DetailPrint "Preparing the verified media engine and local documentation..."
!macroend

!macro customInstall
  SetDetailsPrint both
  DetailPrint "Installed dlME application files"
  DetailPrint "Installed yt-dlp, FFmpeg, FFprobe, and Deno"
  DetailPrint "Installed User Guide, Troubleshooting, Changelog, and third-party notices"
  DetailPrint "Your downloaded media and existing settings are never removed by an upgrade"
!macroend

!macro customUnInit
  SetDetailsPrint both
  DetailPrint "Downloaded media will not be removed"
!macroend

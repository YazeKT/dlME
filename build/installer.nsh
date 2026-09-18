!macro customInit
  SetDetailsPrint both
  DetailPrint "dlME by Yaze Media"
  DetailPrint "Preparing the verified media and torrent engines and local documentation..."
!macroend

!macro customInstall
  ; Make dlME available in Windows Default apps without repeatedly replacing
  ; another client's user choice. Settings offers the explicit default action.
  WriteRegStr SHCTX "Software\Classes\dlME.magnet" "" "dlME magnet link"
  WriteRegStr SHCTX "Software\Classes\dlME.magnet" "URL Protocol" ""
  WriteRegStr SHCTX "Software\Classes\dlME.magnet\shell\open\command" "" '$\"$INSTDIR\dlME.exe$\" $\"%1$\"'
  WriteRegStr SHCTX "Software\Classes\dlME.torrent" "" "dlME torrent file"
  WriteRegStr SHCTX "Software\Classes\dlME.torrent\shell\open\command" "" '$\"$INSTDIR\dlME.exe$\" $\"%1$\"'
  WriteRegStr SHCTX "Software\Classes\.torrent\OpenWithProgids" "dlME.torrent" ""
  WriteRegStr SHCTX "Software\dlME\Capabilities" "ApplicationName" "dlME"
  WriteRegStr SHCTX "Software\dlME\Capabilities" "ApplicationDescription" "Media and torrent downloader"
  WriteRegStr SHCTX "Software\dlME\Capabilities\URLAssociations" "magnet" "dlME.magnet"
  WriteRegStr SHCTX "Software\dlME\Capabilities\FileAssociations" ".torrent" "dlME.torrent"
  WriteRegStr SHCTX "Software\RegisteredApplications" "dlME" "Software\dlME\Capabilities"
  ReadRegStr $0 SHCTX "Software\Classes\.torrent" ""
  StrCmp $0 "" dlme_set_torrent_default
  StrCmp $0 "dlME.torrent" dlme_set_torrent_default
  StrCmp $0 "BitTorrent metadata" 0 dlme_torrent_default_done
  ReadRegStr $1 SHCTX "Software\Classes\BitTorrent metadata\shell\open\command" ""
  StrCmp $1 "" dlme_set_torrent_default
  StrCmp $1 '$INSTDIR\dlME.exe $\"%1$\"' 0 dlme_torrent_default_done
  DeleteRegKey SHCTX "Software\Classes\BitTorrent metadata"
  dlme_set_torrent_default:
  WriteRegStr SHCTX "Software\Classes\.torrent" "" "dlME.torrent"
  dlme_torrent_default_done:
  SetDetailsPrint both
  DetailPrint "Installed dlME application files"
  DetailPrint "Installed yt-dlp, FFmpeg, FFprobe, Deno, and aria2"
  DetailPrint "Installed User Guide, Troubleshooting, Changelog, and third-party notices"
  DetailPrint "Your downloaded media and existing settings are never removed by an upgrade"
!macroend

!macro customUnInit
  SetDetailsPrint both
  DetailPrint "Downloaded media will not be removed"
!macroend

!macro customUnInstall
  ReadRegStr $0 SHCTX "Software\Classes\.torrent" ""
  StrCmp $0 "dlME.torrent" 0 +2
  DeleteRegValue SHCTX "Software\Classes\.torrent" ""
  DeleteRegValue SHCTX "Software\RegisteredApplications" "dlME"
  DeleteRegKey SHCTX "Software\dlME\Capabilities"
  DeleteRegValue SHCTX "Software\Classes\.torrent\OpenWithProgids" "dlME.torrent"
  DeleteRegKey SHCTX "Software\Classes\dlME.magnet"
  DeleteRegKey SHCTX "Software\Classes\dlME.torrent"
  ReadRegStr $0 SHCTX "Software\Classes\magnet\shell\open\command" ""
  StrCmp $0 '$\"$INSTDIR\dlME.exe$\" $\"%1$\"' 0 +2
  DeleteRegKey SHCTX "Software\Classes\magnet"
!macroend

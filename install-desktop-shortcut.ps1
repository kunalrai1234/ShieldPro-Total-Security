# PowerShell script to create Desktop shortcut for Aegis Antivirus
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Aegis Antivirus.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "D:\project\Antivirus\launch.bat"
$Shortcut.WorkingDirectory = "D:\project\Antivirus"
$Shortcut.Description = "Aegis Modern Desktop Cybersecurity Suite"
$Shortcut.IconLocation = "shell32.dll,48" # Shield icon
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $ShortcutPath" -ForegroundColor Green


# PowerShell script to create Desktop shortcut for ShieldPro Total Security
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "ShieldPro Total Security.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "D:\project\Antivirus\launch.bat"
$Shortcut.WorkingDirectory = "D:\project\Antivirus"
$Shortcut.Description = "ShieldPro Total Security Desktop Application"
$Shortcut.IconLocation = "D:\project\Antivirus\assets\icons\icon.ico"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully at: $ShortcutPath" -ForegroundColor Green

Set-Location E:\SurfGame

$ErrorActionPreference = 'Continue'

Write-Host "`n=== Killing any locked processes ===" -ForegroundColor Yellow
Get-Process -Name "electron","CuunSurf","cuunsurf","app-builder","app-builder.exe" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

Write-Host "`n=== Clearing stale release folder (cmd rmdir) ===" -ForegroundColor Yellow
if (Test-Path release) {
  cmd /c "rmdir /s /q E:\SurfGame\release" 2>$null
  Start-Sleep -Seconds 2
  # If still there, try takeown + rmdir
  if (Test-Path release) {
    cmd /c "takeown /f E:\SurfGame\release /r /d y" 2>$null
    cmd /c "icacls E:\SurfGame\release /grant administrators:F /t" 2>$null
    cmd /c "rmdir /s /q E:\SurfGame\release" 2>$null
    Start-Sleep -Seconds 1
  }
}

Write-Host "`n=== Vite build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Vite build FAILED" -ForegroundColor Red; exit 1 }
Write-Host "Vite build OK" -ForegroundColor Green

Write-Host "`n=== Electron portable exe ===" -ForegroundColor Cyan
npx electron-builder --win portable
if ($LASTEXITCODE -ne 0) { Write-Host "Electron build FAILED" -ForegroundColor Red; exit 1 }

# Find exe
$exe = Get-ChildItem release-build -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
  Write-Host "`nBuilt: release\$($exe.Name)  ($([math]::Round($exe.Length/1MB,1)) MB)" -ForegroundColor Green
} else {
  Write-Host "Warning: no exe found in release\" -ForegroundColor Yellow
}

Write-Host "`n=== Git commit + push ===" -ForegroundColor Cyan
git add -A
git commit -m "CuunSurf v1.0.0: Electron exe, longer maps, N Games integration, radio, polish"

$ghToken = (gh auth token 2>&1)
if ($ghToken -and "$ghToken" -notmatch "error|not logged") {
  git push "https://$($ghToken.Trim())@github.com/ktdtech223dev/surf-game.git" master
} else {
  git push origin master
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "`nAll done! exe + repo pushed." -ForegroundColor Green
} else {
  Write-Host "`nGit push failed (exit $LASTEXITCODE)" -ForegroundColor Red
}

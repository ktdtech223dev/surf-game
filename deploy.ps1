Set-Location E:\SurfGame

Write-Host "=== Building ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED" -ForegroundColor Red; exit 1 }

Write-Host "=== Git commit + push ===" -ForegroundColor Cyan
git add -A
git commit -m "AAA polish: EffectsSystem, PlayerTrail, KillStreaks, CrosshairSystem, StatTracker, WeaponBob, sounds, loading splash, speed HUD"
$ghToken = (gh auth token 2>&1)
if ($ghToken -and "$ghToken" -notmatch "error|not logged") {
  git push "https://$($ghToken.Trim())@github.com/ktdtech223dev/surf-game.git" master
} else {
  git push origin master
}
Write-Host "Git push exit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { 'Green' } else { 'Red' })

Write-Host "=== Railway deploy ===" -ForegroundColor Cyan
$cfg = Get-Content "C:\Users\kesha\.railway\config.json" | ConvertFrom-Json
$refreshToken = $cfg.user.refreshToken

$refreshResp = try {
  Invoke-RestMethod -Method POST `
    -Uri "https://backboard.railway.app/graphql/v2" `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body (ConvertTo-Json @{ query = "mutation { authTokenRefresh(refreshToken: `"$refreshToken`") { accessToken expiresAt } }" })
} catch { $null }

$token = $null
if ($refreshResp -and $refreshResp.data -and $refreshResp.data.authTokenRefresh) {
  $token = $refreshResp.data.authTokenRefresh.accessToken
}
if ($token) {
  Write-Host "Token refreshed!" -ForegroundColor Green
  $cfg.user.accessToken = $token
  $cfg | ConvertTo-Json -Depth 10 | Set-Content "C:\Users\kesha\.railway\config.json"
} else {
  $token = $cfg.user.accessToken
  Write-Host "Using existing token" -ForegroundColor Yellow
}

$resp = Invoke-RestMethod -Method POST -Uri "https://backboard.railway.app/graphql/v2" `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"query":"mutation { serviceInstanceDeploy(serviceId: \"ee082310-0de8-4381-952e-7cf1e3063c8f\", environmentId: \"8d394e42-906e-4272-b5fc-8adba34f7f8c\") }"}'

if ($resp.data) {
  Write-Host "Railway deploy triggered!" -ForegroundColor Green
} else {
  Write-Host ($resp | ConvertTo-Json) -ForegroundColor Red
  Write-Host ""
  Write-Host "If Railway auth keeps failing, go to:" -ForegroundColor Yellow
  Write-Host "https://railway.app/project/01c66726-0785-4b07-915c-3140e603ff2c" -ForegroundColor Cyan
  Write-Host "and click Deploy manually." -ForegroundColor Yellow
}

Write-Host "=== Done ===" -ForegroundColor Green

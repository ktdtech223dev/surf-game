Set-Location E:\SurfGame

Write-Host "=== Building ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED" -ForegroundColor Red; exit 1 }

Write-Host "=== Git commit ===" -ForegroundColor Cyan
git add -A
git commit -m "Pause menu redesign + quick respawn + death hint"

Write-Host "=== Git push (using gh token) ===" -ForegroundColor Cyan
$ghToken = (gh auth token 2>&1)
if ($ghToken -and $ghToken -notlike "*error*") {
  $remote = "https://$ghToken@github.com/ktdtech223dev/surf-game.git"
  git push $remote master
} else {
  Write-Host "gh token not found, trying push anyway..." -ForegroundColor Yellow
  git push origin master
}

Write-Host "=== Triggering Railway deploy ===" -ForegroundColor Cyan
$cfg = Get-Content "C:\Users\kesha\.railway\config.json" | ConvertFrom-Json
$token = $cfg.user.accessToken
Write-Host "Using accessToken: $($token.Substring(0,8))..." -ForegroundColor Gray
$body = '{"query":"mutation { serviceInstanceDeploy(serviceId: \"ee082310-0de8-4381-952e-7cf1e3063c8f\", environmentId: \"8d394e42-906e-4272-b5fc-8adba34f7f8c\") }"}'
$resp = Invoke-RestMethod -Method POST -Uri "https://backboard.railway.app/graphql/v2" `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
Write-Host "Railway response: $($resp | ConvertTo-Json)" -ForegroundColor Green
Write-Host "=== All done! ===" -ForegroundColor Green

Set-Location E:\SurfGame

Write-Host "=== Building ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED" -ForegroundColor Red; exit 1 }

Write-Host "=== Git commit + push ===" -ForegroundColor Cyan
git add -A
git commit -m "Pause menu redesign + quick respawn + death hint"
git push origin master

Write-Host "=== Triggering Railway deploy ===" -ForegroundColor Cyan
$cfg = Get-Content "C:\Users\kesha\.railway\config.json" | ConvertFrom-Json
$token = $cfg.token
$body = '{"query":"mutation { serviceInstanceDeploy(serviceId: \"ee082310-0de8-4381-952e-7cf1e3063c8f\", environmentId: \"8d394e42-906e-4272-b5fc-8adba34f7f8c\") }"}'
$resp = Invoke-RestMethod -Method POST -Uri "https://backboard.railway.app/graphql/v2" `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
Write-Host "Railway response: $($resp | ConvertTo-Json)" -ForegroundColor Green
Write-Host "=== Done ===" -ForegroundColor Green

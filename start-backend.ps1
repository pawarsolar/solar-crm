$Host.UI.RawUI.WindowTitle = "Kyros Solar CRM - Backend API (Port 3002)"
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Kyros Solar EPC CRM - NestJS Backend API" -ForegroundColor Yellow
Write-Host "  Port: 3002 | Memory Budget: 256MB | Watch Mode: Active" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Set-Location "e:\solar_crm\apps\api"
npm run start:dev

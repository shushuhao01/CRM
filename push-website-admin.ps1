# ============================================
# 快速推送官网和Admin到独立仓库
# 不包含完整Git历史，只推送当前代码
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  快速推送官网和Admin" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# 推送官网
Write-Host "[1/2] 推送官网到 crm-website..." -ForegroundColor Yellow

$websiteTempDir = "temp-website-push"
if (Test-Path $websiteTempDir) {
    Remove-Item $websiteTempDir -Recurse -Force
}

Write-Host "  复制website目录..." -ForegroundColor Gray
Copy-Item -Path website -Destination $websiteTempDir -Recurse

Push-Location $websiteTempDir

Write-Host "  初始化Git仓库..." -ForegroundColor Gray
git init 2>&1 | Out-Null
git add . 2>&1 | Out-Null
git commit -m "Initial commit: Website project" 2>&1 | Out-Null

Write-Host "  推送到GitHub..." -ForegroundColor Gray
git remote add origin https://github.com/shushuhao01/crm-website.git 2>&1 | Out-Null
git branch -M main 2>&1 | Out-Null
git push -f origin main 2>&1

if ($?) {
    Write-Host "  ✓ 官网推送成功！" -ForegroundColor Green
} else {
    Write-Host "  ✗ 官网推送失败" -ForegroundColor Red
}

Pop-Location
Remove-Item $websiteTempDir -Recurse -Force

# 推送Admin
Write-Host "`n[2/2] 推送Admin到 crm-admin..." -ForegroundColor Yellow

$adminTempDir = "temp-admin-push"
if (Test-Path $adminTempDir) {
    Remove-Item $adminTempDir -Recurse -Force
}

Write-Host "  复制admin目录..." -ForegroundColor Gray
Copy-Item -Path admin -Destination $adminTempDir -Recurse

Push-Location $adminTempDir

Write-Host "  初始化Git仓库..." -ForegroundColor Gray
git init 2>&1 | Out-Null
git add . 2>&1 | Out-Null
git commit -m "Initial commit: Admin project" 2>&1 | Out-Null

Write-Host "  推送到GitHub..." -ForegroundColor Gray
git remote add origin https://github.com/shushuhao01/crm-admin.git 2>&1 | Out-Null
git branch -M main 2>&1 | Out-Null
git push -f origin main 2>&1

if ($?) {
    Write-Host "  ✓ Admin推送成功！" -ForegroundColor Green
} else {
    Write-Host "  ✗ Admin推送失败" -ForegroundColor Red
}

Pop-Location
Remove-Item $adminTempDir -Recurse -Force

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  推送完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "验证结果:" -ForegroundColor Gray
Write-Host "  官网: https://github.com/shushuhao01/crm-website" -ForegroundColor Gray
Write-Host "  Admin: https://github.com/shushuhao01/crm-admin" -ForegroundColor Gray

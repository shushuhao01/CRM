# ============================================
# 快速推送移动端APP到独立仓库
# 不包含完整Git历史，只推送当前代码
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  快速推送移动端APP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# 推送移动端APP
Write-Host "[1/1] 推送移动端APP到 crm-app..." -ForegroundColor Yellow

$appTempDir = "temp-app-push"
if (Test-Path $appTempDir) {
    Remove-Item $appTempDir -Recurse -Force
}

Write-Host "  复制h5目录..." -ForegroundColor Gray
Copy-Item -Path h5 -Destination $appTempDir -Recurse

Push-Location $appTempDir

Write-Host "  初始化Git仓库..." -ForegroundColor Gray
git init 2>&1 | Out-Null
git add . 2>&1 | Out-Null
git commit -m "Initial commit: Mobile APP project" 2>&1 | Out-Null

Write-Host "  推送到GitHub..." -ForegroundColor Gray
git remote add origin https://github.com/shushuhao01/crm-app.git 2>&1 | Out-Null
git branch -M main 2>&1 | Out-Null
git push -f origin main 2>&1

if ($?) {
    Write-Host "  ✓ 移动端APP推送成功！" -ForegroundColor Green
} else {
    Write-Host "  ✗ 移动端APP推送失败" -ForegroundColor Red
}

Pop-Location
Remove-Item $appTempDir -Recurse -Force

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  推送完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "验证结果:" -ForegroundColor Gray
Write-Host "  移动端APP: https://github.com/shushuhao01/crm-app" -ForegroundColor Gray

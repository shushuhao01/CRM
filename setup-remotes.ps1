# ============================================
# 配置GitHub远程仓库
# 用途: 首次设置时配置多个远程仓库
# 使用: .\setup-remotes.ps1
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  配置GitHub远程仓库" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 检查是否在Git仓库中
if (-not (Test-Path .git)) {
    Write-Host "错误: 当前目录不是Git仓库！" -ForegroundColor Red
    exit 1
}

# 使用固定的GitHub用户名
$githubOrg = "shushuhao01"

Write-Host "GitHub用户名: $githubOrg" -ForegroundColor Green
Write-Host "`n开始配置远程仓库...`n" -ForegroundColor Green

# 配置CRM系统仓库（主仓库origin已存在，保持不变）
Write-Host "[1/4] CRM主系统仓库..." -ForegroundColor Yellow
Write-Host "  使用现有的origin: https://github.com/$githubOrg/CRM.git" -ForegroundColor Gray
Write-Host "  ✓ CRM主系统配置完成" -ForegroundColor Green

# 配置官网仓库
Write-Host "`n[2/4] 配置crm-website..." -ForegroundColor Yellow
$existingWebsite = git remote | Select-String "^crm-website$"
if ($existingWebsite) {
    Write-Host "  crm-website已存在，删除旧配置..." -ForegroundColor Gray
    git remote remove crm-website
}
git remote add crm-website "https://github.com/$githubOrg/crm-website.git"
Write-Host "  ✓ crm-website配置完成" -ForegroundColor Green

# 配置Admin仓库
Write-Host "`n[3/4] 配置crm-admin..." -ForegroundColor Yellow
$existingAdmin = git remote | Select-String "^crm-admin$"
if ($existingAdmin) {
    Write-Host "  crm-admin已存在，删除旧配置..." -ForegroundColor Gray
    git remote remove crm-admin
}
git remote add crm-admin "https://github.com/$githubOrg/crm-admin.git"
Write-Host "  ✓ crm-admin配置完成" -ForegroundColor Green

# 配置移动端仓库
Write-Host "`n[4/4] 配置crm-app..." -ForegroundColor Yellow
$existingApp = git remote | Select-String "^crm-app$"
if ($existingApp) {
    Write-Host "  crm-app已存在，删除旧配置..." -ForegroundColor Gray
    git remote remove crm-app
}
git remote add crm-app "https://github.com/$githubOrg/CRMapp.git"
Write-Host "  ✓ crm-app配置完成" -ForegroundColor Green

# 显示所有远程仓库
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  配置完成！当前远程仓库:" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

git remote -v

Write-Host "`n下一步:" -ForegroundColor Yellow
Write-Host "运行首次同步:" -ForegroundColor Gray
Write-Host "   .\sync-repos.ps1 -message 'Repository separation - initial sync'`n" -ForegroundColor Gray

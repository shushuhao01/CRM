# ============================================
# CRM项目多仓库同步脚本
# 用途: 将本地Monorepo同步到GitHub多个独立仓库
# 使用: .\sync-repos.ps1 -message "你的提交信息"
# ============================================

param(
    [string]$message = "Update",
    [switch]$skipMain,
    [switch]$onlyCRM,
    [switch]$onlyWebsite,
    [switch]$onlyAdmin,
    [switch]$onlyApp
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CRM 多仓库同步工具" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 检查是否在Git仓库中
if (-not (Test-Path .git)) {
    Write-Host "错误: 当前目录不是Git仓库！" -ForegroundColor Red
    exit 1
}

# 检查是否有未提交的更改
$status = git status --porcelain
if ($status -and -not $skipMain) {
    Write-Host "发现未提交的更改，正在提交..." -ForegroundColor Yellow
    git add .
    git commit -m $message
    if ($?) {
        Write-Host "✓ 本地提交成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 本地提交失败" -ForegroundColor Red
        exit 1
    }
}

# 推送到主仓库
if (-not $skipMain) {
    Write-Host "`n推送到主仓库..." -ForegroundColor Yellow
    git push origin main
    if ($?) {
        Write-Host "✓ 主仓库推送成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 主仓库推送失败" -ForegroundColor Red
        exit 1
    }
}

# 同步CRM系统
if (-not $onlyWebsite -and -not $onlyAdmin -and -not $onlyApp) {
    Write-Host "`n[1/4] 同步CRM系统..." -ForegroundColor Yellow
    
    # 检查远程仓库是否存在
    $remoteCRM = git remote | Select-String "crm-system"
    if (-not $remoteCRM) {
        Write-Host "警告: crm-system远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        # 创建临时目录
        $tempDir = "temp-crm-system-sync"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        
        # CRM系统就是主仓库，直接推送到origin
        Write-Host "  推送到origin (CRM主系统)..." -ForegroundColor Gray
        git push origin main 2>&1 | Out-Null
        
        if ($?) {
            Write-Host "  ✓ CRM系统同步成功" -ForegroundColor Green
        } else {
            Write-Host "  ✗ CRM系统同步失败，尝试查看错误..." -ForegroundColor Red
            git push origin main
        }
    }
}

# 同步官网
if (-not $onlyCRM -and -not $onlyAdmin -and -not $onlyApp) {
    Write-Host "`n[2/4] 同步官网..." -ForegroundColor Yellow
    
    $remoteWebsite = git remote | Select-String "crm-website"
    if (-not $remoteWebsite) {
        Write-Host "警告: crm-website远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path website) {
            git subtree push --prefix=website crm-website main 2>&1 | Out-Null
            if ($?) {
                Write-Host "  ✓ 官网同步成功" -ForegroundColor Green
            } else {
                Write-Host "  ✗ 官网同步失败" -ForegroundColor Red
            }
        } else {
            Write-Host "  警告: website目录不存在" -ForegroundColor Yellow
        }
    }
}

# 同步Admin
if (-not $onlyCRM -and -not $onlyWebsite -and -not $onlyApp) {
    Write-Host "`n[3/4] 同步Admin后台..." -ForegroundColor Yellow
    
    $remoteAdmin = git remote | Select-String "crm-admin"
    if (-not $remoteAdmin) {
        Write-Host "警告: crm-admin远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path admin) {
            git subtree push --prefix=admin crm-admin main 2>&1 | Out-Null
            if ($?) {
                Write-Host "  ✓ Admin同步成功" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Admin同步失败" -ForegroundColor Red
            }
        } else {
            Write-Host "  警告: admin目录不存在" -ForegroundColor Yellow
        }
    }
}

# 同步移动端
if (-not $onlyCRM -and -not $onlyWebsite -and -not $onlyAdmin) {
    Write-Host "`n[4/4] 同步移动端APP..." -ForegroundColor Yellow
    
    $remoteApp = git remote | Select-String "crm-app"
    if (-not $remoteApp) {
        Write-Host "警告: crm-app远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path crmAPP) {
            git subtree push --prefix=crmAPP crm-app main 2>&1 | Out-Null
            if ($?) {
                Write-Host "  ✓ 移动端同步成功" -ForegroundColor Green
            } else {
                Write-Host "  ✗ 移动端同步失败" -ForegroundColor Red
            }
        } else {
            Write-Host "  警告: crmAPP目录不存在" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  同步完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 使用说明
Write-Host "使用说明:" -ForegroundColor Gray
Write-Host "  基本用法: .\sync-repos.ps1 -message '提交信息'" -ForegroundColor Gray
Write-Host "  只同步CRM: .\sync-repos.ps1 -onlyCRM" -ForegroundColor Gray
Write-Host "  只同步官网: .\sync-repos.ps1 -onlyWebsite" -ForegroundColor Gray
Write-Host "  跳过主仓库: .\sync-repos.ps1 -skipMain`n" -ForegroundColor Gray

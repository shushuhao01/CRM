# ============================================
# CRM项目多仓库同步脚本 V2
# 用途: 将本地Monorepo同步到GitHub多个独立仓库
# 使用: .\sync-repos-v2.ps1 -message "你的提交信息"
# ============================================

param(
    [string]$message = "Update",
    [switch]$skipMain,
    [switch]$onlyCRM,
    [switch]$onlyWebsite,
    [switch]$onlyAdmin,
    [switch]$onlyApp,
    [switch]$dryRun
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CRM 多仓库同步工具 V2" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($dryRun) {
    Write-Host "【测试模式】不会实际推送到远程仓库`n" -ForegroundColor Yellow
}

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
if (-not $skipMain -and -not $dryRun) {
    Write-Host "`n推送到主仓库..." -ForegroundColor Yellow
    git push origin main 2>&1 | Out-Null
    if ($?) {
        Write-Host "✓ 主仓库推送成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 主仓库推送失败（可能是网络问题或权限问题）" -ForegroundColor Red
    }
}

# 同步CRM系统（根目录，排除website、admin、crmAPP）
if (-not $onlyWebsite -and -not $onlyAdmin -and -not $onlyApp) {
    Write-Host "`n[1/4] 同步CRM系统..." -ForegroundColor Yellow
    
    $remoteCRM = git remote | Select-String "^crm-system$"
    if (-not $remoteCRM) {
        Write-Host "  ⚠ crm-system远程仓库未配置，跳过" -ForegroundColor Yellow
        Write-Host "  提示: 运行 .\setup-remotes.ps1 配置远程仓库" -ForegroundColor Gray
    } else {
        try {
            Write-Host "  准备CRM系统代码..." -ForegroundColor Gray
            
            # 获取当前分支
            $currentBranch = git branch --show-current
            
            # 创建临时分支
            $tempBranch = "temp-crm-sync-$(Get-Date -Format 'yyyyMMddHHmmss')"
            git checkout -b $tempBranch 2>&1 | Out-Null
            
            # 删除不需要的目录（只从索引中删除，不删除实际文件）
            Write-Host "  移除website、admin、crmAPP目录..." -ForegroundColor Gray
            git rm -rf website/ --cached --quiet 2>&1 | Out-Null
            git rm -rf admin/ --cached --quiet 2>&1 | Out-Null
            git rm -rf crmAPP/ --cached --quiet 2>&1 | Out-Null
            
            # 提交更改
            git commit -m "Prepare CRM system for separate repo" --quiet 2>&1 | Out-Null
            
            if (-not $dryRun) {
                # 推送到crm-system仓库
                Write-Host "  推送到crm-system仓库..." -ForegroundColor Gray
                git push -f crm-system ${tempBranch}:main 2>&1 | Out-Null
                
                if ($?) {
                    Write-Host "  ✓ CRM系统同步成功" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ CRM系统同步失败" -ForegroundColor Red
                    Write-Host "  提示: 检查GitHub仓库是否已创建，网络是否正常" -ForegroundColor Gray
                }
            } else {
                Write-Host "  [测试模式] 跳过推送" -ForegroundColor Gray
            }
            
            # 切回原分支并删除临时分支
            git checkout $currentBranch --quiet 2>&1 | Out-Null
            git branch -D $tempBranch --quiet 2>&1 | Out-Null
            
        } catch {
            Write-Host "  ✗ 处理CRM系统时出错: $_" -ForegroundColor Red
            # 确保切回原分支
            git checkout main --quiet 2>&1 | Out-Null
        }
    }
}

# 同步官网
if (-not $onlyCRM -and -not $onlyAdmin -and -not $onlyApp) {
    Write-Host "`n[2/4] 同步官网..." -ForegroundColor Yellow
    
    $remoteWebsite = git remote | Select-String "^crm-website$"
    if (-not $remoteWebsite) {
        Write-Host "  ⚠ crm-website远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path website) {
            Write-Host "  推送website目录..." -ForegroundColor Gray
            if (-not $dryRun) {
                git subtree push --prefix=website crm-website main 2>&1 | Out-Null
                if ($?) {
                    Write-Host "  ✓ 官网同步成功" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ 官网同步失败" -ForegroundColor Red
                }
            } else {
                Write-Host "  [测试模式] 跳过推送" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ⚠ website目录不存在" -ForegroundColor Yellow
        }
    }
}

# 同步Admin
if (-not $onlyCRM -and -not $onlyWebsite -and -not $onlyApp) {
    Write-Host "`n[3/4] 同步Admin后台..." -ForegroundColor Yellow
    
    $remoteAdmin = git remote | Select-String "^crm-admin$"
    if (-not $remoteAdmin) {
        Write-Host "  ⚠ crm-admin远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path admin) {
            Write-Host "  推送admin目录..." -ForegroundColor Gray
            if (-not $dryRun) {
                git subtree push --prefix=admin crm-admin main 2>&1 | Out-Null
                if ($?) {
                    Write-Host "  ✓ Admin同步成功" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ Admin同步失败" -ForegroundColor Red
                }
            } else {
                Write-Host "  [测试模式] 跳过推送" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ⚠ admin目录不存在" -ForegroundColor Yellow
        }
    }
}

# 同步移动端
if (-not $onlyCRM -and -not $onlyWebsite -and -not $onlyAdmin) {
    Write-Host "`n[4/4] 同步移动端APP..." -ForegroundColor Yellow
    
    $remoteApp = git remote | Select-String "^crm-app$"
    if (-not $remoteApp) {
        Write-Host "  ⚠ crm-app远程仓库未配置，跳过" -ForegroundColor Yellow
    } else {
        if (Test-Path crmAPP) {
            Write-Host "  推送crmAPP目录..." -ForegroundColor Gray
            if (-not $dryRun) {
                git subtree push --prefix=crmAPP crm-app main 2>&1 | Out-Null
                if ($?) {
                    Write-Host "  ✓ 移动端同步成功" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ 移动端同步失败" -ForegroundColor Red
                }
            } else {
                Write-Host "  [测试模式] 跳过推送" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ⚠ crmAPP目录不存在" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  同步完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 显示远程仓库状态
Write-Host "当前配置的远程仓库:" -ForegroundColor Gray
git remote -v | Select-String "crm-"

Write-Host "`n使用说明:" -ForegroundColor Gray
Write-Host "  基本用法: .\sync-repos-v2.ps1 -message '提交信息'" -ForegroundColor Gray
Write-Host "  测试模式: .\sync-repos-v2.ps1 -dryRun" -ForegroundColor Gray
Write-Host "  只同步CRM: .\sync-repos-v2.ps1 -onlyCRM" -ForegroundColor Gray
Write-Host "  只同步官网: .\sync-repos-v2.ps1 -onlyWebsite" -ForegroundColor Gray
Write-Host "  跳过主仓库: .\sync-repos-v2.ps1 -skipMain`n" -ForegroundColor Gray

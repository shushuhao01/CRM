# ============================================
# CRM 一键同步全部仓库脚本
# 用法: .\sync-all.ps1 -message "提交信息"
# 功能:
#   1. 提交本地更改 → 推送到 origin (主仓库)
#   2. 推送到 backup (备份仓库，含 docs/ 和 重要文档/)
#   3. subtree 同步到 crm-admin / crm-website
#   4. temp-branch 同步到 crm-system
# ============================================

param(
    [string]$message = "Update",
    [switch]$skipSubtree,
    [switch]$onlyBackup,
    [switch]$dryRun
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CRM 一键同步全部仓库" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($dryRun) {
    Write-Host "[测试模式] 不会实际推送`n" -ForegroundColor Yellow
}

# ---- 检查环境 ----
if (-not (Test-Path .git)) {
    Write-Host "错误: 当前目录不是Git仓库" -ForegroundColor Red
    exit 1
}

$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "错误: 当前不在 main 分支 (当前: $currentBranch)" -ForegroundColor Red
    exit 1
}

# ============================================================
# 第一步: 提交本地更改并推送到主仓库
# ============================================================
Write-Host "[1/5] 提交并推送到主仓库 (origin)..." -ForegroundColor Yellow

$status = git status --porcelain
if ($status) {
    Write-Host "  发现未提交的更改，正在提交..." -ForegroundColor Gray
    git add .
    git commit -m $message
    if ($?) {
        Write-Host "  [OK] 本地提交成功" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] 本地提交失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  没有未提交的更改" -ForegroundColor Gray
}

if (-not $onlyBackup -and -not $dryRun) {
    git push origin main 2>&1 | Out-Null
    if ($?) {
        Write-Host "  [OK] origin 推送成功" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] origin 推送失败" -ForegroundColor Red
    }
}

# ============================================================
# 第二步: 推送到备份仓库（含 docs/ 和 重要文档/）
# ============================================================
Write-Host "`n[2/5] 推送到备份仓库 (backup，含文档)..." -ForegroundColor Yellow

if (-not $dryRun) {
    $backupBranch = "backup-with-docs-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    try {
        # 创建临时分支
        git checkout -b $backupBranch --quiet 2>&1 | Out-Null
        
        # 强制添加被 .gitignore 排除的文档目录
        $docsAdded = $false
        if (Test-Path docs) {
            # 机密文件列表 - 即使备份也不包含
            $excludePatterns = @(
                "docs/重要文件/部署模式许可证管理-运营方完整操作手册（机密）.md",
                "docs/机密文件管理清单.md",
                "docs/商业合同/*",
                "docs/发布指南/*",
                "docs/配置备份/*"
            )
            
            git add -f docs/ 2>&1 | Out-Null
            
            # 移除机密文件（如果存在）
            foreach ($pattern in $excludePatterns) {
                $files = git ls-files --cached -- $pattern 2>$null
                if ($files) {
                    git rm --cached --quiet -- $pattern 2>&1 | Out-Null
                }
            }
            $docsAdded = $true
        }
        if (Test-Path "重要文档") {
            git add -f "重要文档/" 2>&1 | Out-Null
            $docsAdded = $true
        }
        
        if ($docsAdded) {
            git commit -m "backup: $message (含文档)" --quiet 2>&1 | Out-Null
        }
        
        # 推送到备份仓库
        git push -f backup ${backupBranch}:main 2>&1 | Out-Null
        if ($?) {
            Write-Host "  [OK] backup 推送成功（含文档）" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] backup 推送失败" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [FAIL] 备份过程出错: $_" -ForegroundColor Red
    } finally {
        # 切回 main 并删除临时分支
        git checkout -f main --quiet 2>&1 | Out-Null
        git branch -D $backupBranch --quiet 2>&1 | Out-Null
    }
} else {
    Write-Host "  [测试模式] 跳过备份推送" -ForegroundColor Gray
}

if ($onlyBackup) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  备份完成！" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit 0
}

# ============================================================
# 第三步: subtree 同步到 crm-admin
# ============================================================
if (-not $skipSubtree) {
    Write-Host "`n[3/5] 同步 Admin 后台 → crm-admin..." -ForegroundColor Yellow
    
    if (-not $dryRun) {
        git subtree split --prefix=admin -b admin-split 2>&1 | Out-Null
        git push -f crm-admin admin-split:main 2>&1 | Out-Null
        if ($?) {
            Write-Host "  [OK] crm-admin 同步成功" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] crm-admin 同步失败" -ForegroundColor Red
        }
        git branch -D admin-split --quiet 2>&1 | Out-Null
    }

    # ============================================================
    # 第四步: subtree 同步到 crm-website
    # ============================================================
    Write-Host "`n[4/5] 同步官网 → crm-website..." -ForegroundColor Yellow
    
    if (-not $dryRun) {
        git subtree split --prefix=website -b website-split 2>&1 | Out-Null
        git push -f crm-website website-split:main 2>&1 | Out-Null
        if ($?) {
            Write-Host "  [OK] crm-website 同步成功" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] crm-website 同步失败" -ForegroundColor Red
        }
        git branch -D website-split --quiet 2>&1 | Out-Null
    }

    # ============================================================
    # 第五步: temp-branch 同步到 crm-system
    # ============================================================
    Write-Host "`n[5/5] 同步 CRM 系统 → crm-system..." -ForegroundColor Yellow
    
    if (-not $dryRun) {
        $tempBranch = "temp-crm-sync-$(Get-Date -Format 'yyyyMMddHHmmss')"
        git checkout -b $tempBranch --quiet 2>&1 | Out-Null
        git rm -rf website/ --cached --quiet 2>&1 | Out-Null
        git rm -rf admin/ --cached --quiet 2>&1 | Out-Null
        git commit -m "crm-system sync" --quiet 2>&1 | Out-Null
        git push -f crm-system ${tempBranch}:main 2>&1 | Out-Null
        if ($?) {
            Write-Host "  [OK] crm-system 同步成功" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] crm-system 同步失败" -ForegroundColor Red
        }
        git checkout -f main --quiet 2>&1 | Out-Null
        git branch -D $tempBranch --quiet 2>&1 | Out-Null
    }
} else {
    Write-Host "`n[3-5/5] 跳过子仓库同步 (-skipSubtree)" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  全部同步完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "使用说明:" -ForegroundColor Gray
Write-Host "  基本用法: .\sync-all.ps1 -message '提交信息'" -ForegroundColor Gray
Write-Host "  仅备份:   .\sync-all.ps1 -message '备份' -onlyBackup" -ForegroundColor Gray
Write-Host "  跳过子库: .\sync-all.ps1 -message '更新' -skipSubtree" -ForegroundColor Gray
Write-Host "  测试模式: .\sync-all.ps1 -dryRun`n" -ForegroundColor Gray

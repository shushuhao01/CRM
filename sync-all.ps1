# ============================================
# CRM Sync All Repositories
# Usage: .\sync-all.ps1 -message "commit message"
# Repos: origin + backup(with docs) + crm-admin + crm-website + crm-system
# ============================================

param(
    [string]$message = "Update",
    [switch]$skipSubtree,
    [switch]$onlyBackup,
    [switch]$dryRun
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRM Sync All Repositories" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($dryRun) { Write-Host "[DRY RUN] No actual push" -ForegroundColor Yellow; Write-Host "" }

# Check environment
if (-not (Test-Path .git)) { Write-Host "ERROR: Not a git repo" -ForegroundColor Red; exit 1 }
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") { Write-Host "ERROR: Not on main branch (current: $currentBranch)" -ForegroundColor Red; exit 1 }

# ==== STEP 1: Commit and push to origin ====
Write-Host "[1/5] Push to origin (main repo)..." -ForegroundColor Yellow

$status = git status --porcelain
if ($status) {
    Write-Host "  Committing local changes..." -ForegroundColor Gray
    git add .
    git commit -m $message
    if (-not $?) { Write-Host "  [FAIL] Commit failed" -ForegroundColor Red; exit 1 }
    Write-Host "  [OK] Committed" -ForegroundColor Green
} else {
    Write-Host "  No changes to commit" -ForegroundColor Gray
}

if (-not $onlyBackup -and -not $dryRun) {
    $null = git push origin main 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] origin pushed" -ForegroundColor Green }
    else { Write-Host "  [FAIL] origin push failed (exit: $LASTEXITCODE)" -ForegroundColor Red }
}

# ==== STEP 2: Push to backup (with docs) ====
Write-Host ""
Write-Host "[2/5] Push to backup (with docs)..." -ForegroundColor Yellow

if (-not $dryRun) {
    $backupBranch = "backup-docs-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $backupOK = $false

    git checkout -b $backupBranch --quiet 2>&1 | Out-Null

    $docsAdded = $false
    if (Test-Path docs) {
        git add -f docs/ 2>&1 | Out-Null

        # Remove confidential files even from backup
        $secrets = @(
            "docs/商业合同",
            "docs/发布指南",
            "docs/配置备份"
        )
        foreach ($s in $secrets) {
            if (Test-Path $s) {
                git rm -r --cached --quiet -- $s 2>&1 | Out-Null
            }
        }
        $docsAdded = $true
    }
    if (Test-Path "重要文档") {
        git add -f "重要文档/" 2>&1 | Out-Null
        $docsAdded = $true
    }

    if ($docsAdded) {
        git commit -m "backup: $message" --quiet --allow-empty 2>&1 | Out-Null
    }

    # Save backup commit SHA before switching branches
    $backupSHA = git rev-parse HEAD 2>$null

    $null = git push -f backup ${backupBranch}:main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] backup pushed (with docs)" -ForegroundColor Green
        $backupOK = $true
    } else {
        Write-Host "  [FAIL] backup push failed (exit: $LASTEXITCODE)" -ForegroundColor Red
    }

    # Switch back to main (this deletes docs from working tree because they are
    # tracked on the backup branch but not on main)
    git checkout -f main --quiet 2>&1 | Out-Null
    git branch -D $backupBranch --quiet 2>&1 | Out-Null

    # Restore docs from the backup commit (they were deleted during checkout)
    if ($backupSHA -and $docsAdded) {
        Write-Host "  Restoring local docs..." -ForegroundColor Gray
        if (Test-Path docs) {} else {
            git checkout $backupSHA -- docs/ 2>&1 | Out-Null
        }
        if (Test-Path "重要文档") {} else {
            git checkout $backupSHA -- "重要文档/" 2>&1 | Out-Null
        }
        # Unstage restored files (they should stay untracked on main)
        git reset HEAD --quiet -- docs/ "重要文档/" 2>&1 | Out-Null
        $docsCount = (Get-ChildItem docs -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host "  [OK] docs restored ($docsCount files)" -ForegroundColor Green
    }
} else {
    Write-Host "  [DRY RUN] skipped" -ForegroundColor Gray
}

if ($onlyBackup) {
    Write-Host ""
    Write-Host "========================================"  -ForegroundColor Cyan
    Write-Host "  Backup done!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# ==== STEP 3: Subtree sync to crm-admin ====
if (-not $skipSubtree) {
    Write-Host ""
    Write-Host "[3/5] Sync admin -> crm-admin..." -ForegroundColor Yellow

    if (-not $dryRun) {
        $null = git subtree split --prefix=admin -b admin-split 2>&1
        $null = git push -f crm-admin admin-split:main 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] crm-admin synced" -ForegroundColor Green }
        else { Write-Host "  [FAIL] crm-admin sync failed" -ForegroundColor Red }
        git branch -D admin-split --quiet 2>&1 | Out-Null
    }

    # ==== STEP 4: Subtree sync to crm-website ====
    Write-Host ""
    Write-Host "[4/5] Sync website -> crm-website..." -ForegroundColor Yellow

    if (-not $dryRun) {
        $null = git subtree split --prefix=website -b website-split 2>&1
        $null = git push -f crm-website website-split:main 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] crm-website synced" -ForegroundColor Green }
        else { Write-Host "  [FAIL] crm-website sync failed" -ForegroundColor Red }
        git branch -D website-split --quiet 2>&1 | Out-Null
    }

    # ==== STEP 5: Temp-branch sync to crm-system ====
    Write-Host ""
    Write-Host "[5/5] Sync system -> crm-system..." -ForegroundColor Yellow

    if (-not $dryRun) {
        $tempBranch = "temp-crm-sync-$(Get-Date -Format 'yyyyMMddHHmmss')"
        git checkout -b $tempBranch --quiet 2>&1 | Out-Null
        git rm -rf website/ --cached --quiet 2>&1 | Out-Null
        git rm -rf admin/ --cached --quiet 2>&1 | Out-Null
        git commit -m "crm-system sync" --quiet 2>&1 | Out-Null
        $null = git push -f crm-system ${tempBranch}:main 2>&1
        if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] crm-system synced" -ForegroundColor Green }
        else { Write-Host "  [FAIL] crm-system sync failed" -ForegroundColor Red }
        git checkout -f main --quiet 2>&1 | Out-Null
        git branch -D $tempBranch --quiet 2>&1 | Out-Null
    }
} else {
    Write-Host ""
    Write-Host "[3-5/5] Skipped subtree sync (-skipSubtree)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All sync complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage:" -ForegroundColor Gray
Write-Host "  Full sync:     .\sync-all.ps1 -message 'msg'" -ForegroundColor Gray
Write-Host "  Backup only:   .\sync-all.ps1 -message 'msg' -onlyBackup" -ForegroundColor Gray
Write-Host "  Skip subtrees: .\sync-all.ps1 -message 'msg' -skipSubtree" -ForegroundColor Gray
Write-Host "  Dry run:       .\sync-all.ps1 -dryRun" -ForegroundColor Gray
Write-Host ""

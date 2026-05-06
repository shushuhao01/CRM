# =============================================
# 云客 CRM 社区版导出脚本
# 从主仓库生成开源版代码并推送到 GitHub
# 用法: .\scripts\build-community.ps1 [-PushToGit]
# =============================================

param(
    [string]$OutputDir = "d:\kaifa\yunke-crm-build",
    [switch]$PushToGit
)

$ErrorActionPreference = "Stop"
$SourceDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$GitHubRepo = "https://github.com/shushuhao01/yunke-crm.git"

Write-Host ""
Write-Host "========== 云客 CRM 社区版导出 ==========" -ForegroundColor Cyan
Write-Host "  源目录: $SourceDir"
Write-Host "  输出目录: $OutputDir"
Write-Host ""

# ========== 步骤 1：清理并创建输出目录 ==========
Write-Host "[1/9] 清理并创建输出目录..." -ForegroundColor Yellow
if (Test-Path $OutputDir) {
    # 保留 .git 目录（如果已初始化过）
    $gitDir = "$OutputDir\.git"
    $hasGit = Test-Path $gitDir
    if ($hasGit) {
        $tempGitDir = "$env:TEMP\yunke-crm-git-backup"
        if (Test-Path $tempGitDir) { Remove-Item -Recurse -Force $tempGitDir }
        Copy-Item -Recurse $gitDir $tempGitDir
    }
    # 删除旧内容（排除 .git）
    Get-ChildItem $OutputDir -Exclude ".git" | Remove-Item -Recurse -Force
    if ($hasGit -and (Test-Path $tempGitDir)) {
        if (!(Test-Path $gitDir)) {
            Copy-Item -Recurse $tempGitDir $gitDir
        }
        Remove-Item -Recurse -Force $tempGitDir
    }
} else {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# ========== 步骤 2：复制需要的目录 ==========
Write-Host "[2/9] 复制源代码目录..." -ForegroundColor Yellow
$copyDirs = @("backend", "src", "h5", "public", "database", "docker")
foreach ($dir in $copyDirs) {
    $srcPath = "$SourceDir\$dir"
    if (Test-Path $srcPath) {
        Copy-Item -Recurse $srcPath "$OutputDir\$dir"
        Write-Host "  [复制] $dir/" -ForegroundColor Green
    } else {
        Write-Host "  [跳过] $dir/ (不存在)" -ForegroundColor DarkYellow
    }
}

# 复制根目录配置文件
$copyFiles = @("package.json", "package-lock.json", "tsconfig.json", "tsconfig.app.json",
               "tsconfig.node.json", "vite.config.ts", "vitest.config.ts",
               "eslint.config.ts", "index.html", "env.d.ts",
               ".editorconfig", ".gitignore")
foreach ($f in $copyFiles) {
    if (Test-Path "$SourceDir\$f") {
        Copy-Item "$SourceDir\$f" "$OutputDir\$f"
    }
}
Write-Host "  [复制] 根目录配置文件" -ForegroundColor Green

# ========== 步骤 3：删除后端付费模块 ==========
Write-Host "[3/9] 删除后端付费模块..." -ForegroundColor Yellow

$backendDeleteDirs = @(
    "backend\src\routes\wecom",
    "backend\src\routes\calls",
    "backend\src\routes\admin",
    "backend\src\routes\miniprogram",
    "backend\src\routes\valueAdded",
    "backend\src\services\wecom"
)

$backendDeleteFiles = @(
    # 路由文件
    "backend\src\routes\wecom.ts.backup",
    "backend\src\routes\callConfig.ts",
    "backend\src\routes\callWebhook.ts",
    "backend\src\routes\sms.ts",
    "backend\src\routes\smsAutoSend.ts",
    "backend\src\routes\smsQuota.ts",
    "backend\src\routes\finance.ts",
    "backend\src\routes\codCollection.ts",
    "backend\src\routes\codApplication.ts",
    "backend\src\routes\tenantLicense.ts",
    "backend\src\routes\tenantData.ts",
    "backend\src\routes\onlineSeat.ts",
    "backend\src\routes\mobileApp.ts",
    "backend\src\routes\virtualInventory.ts",
    "backend\src\routes\virtualDelivery.ts",
    "backend\src\routes\virtualClaim.ts",
    "backend\src\routes\virtualSettings.ts",
    "backend\src\routes\sensitiveInfoPermissions.ts",
    "backend\src\routes\customerServicePermissions.ts",
    "backend\src\routes\performanceReport.ts",
    # 服务文件
    "backend\src\services\WecomApiService.ts",
    "backend\src\services\WecomAddressBookService.ts",
    "backend\src\services\WecomAiService.ts",
    "backend\src\services\WecomAiInspectService.ts",
    "backend\src\services\WecomAutoMatchService.ts",
    "backend\src\services\WecomChatArchiveService.ts",
    "backend\src\services\WecomContactWayService.ts",
    "backend\src\services\WecomGroupTemplateService.ts",
    "backend\src\services\WecomSyncScheduler.ts",
    "backend\src\services\WecomTimelineService.ts",
    "backend\src\services\AliyunCallService.ts",
    "backend\src\services\AliyunSmsService.ts",
    "backend\src\services\SmsAutoSendService.ts",
    "backend\src\services\RecordingStorageService.ts",
    "backend\src\services\OnlineSeatService.ts",
    "backend\src\services\MobileWebSocketService.ts",
    "backend\src\services\SubscriptionService.ts",
    "backend\src\services\PaymentService.ts",
    "backend\src\services\AlipayService.ts",
    "backend\src\services\WechatPayService.ts",
    "backend\src\services\TenantExportService.ts",
    "backend\src\services\TenantImportService.ts",
    "backend\src\services\PerformanceReportScheduler.ts",
    "backend\src\services\VasExpiryCheckService.ts",
    "backend\src\services\AdminUserService.ts",
    "backend\src\services\CapacityService.ts",
    "backend\src\services\PackageService.ts",
    "backend\src\services\PrivateCustomerService.ts",
    "backend\src\controllers\PerformanceReportController.ts",
    "backend\src\controllers\admin\PrivateCustomerController.ts",
    # SaaS 专属公开路由（社区版不需要支付/会员/订阅/扩容）
    "backend\src\routes\public\payment.ts",
    "backend\src\routes\public\subscription.ts",
    "backend\src\routes\public\capacity.ts",
    "backend\src\routes\public\member.ts",
    "backend\src\routes\public\member-sms-quota.ts",
    "backend\src\routes\public\member-wecom.ts"
)

$deletedCount = 0
foreach ($d in $backendDeleteDirs) {
    $fullPath = "$OutputDir\$d"
    if (Test-Path $fullPath) {
        $count = (Get-ChildItem -Recurse -File $fullPath).Count
        Remove-Item -Recurse -Force $fullPath
        $deletedCount += $count
        Write-Host "  [删除目录] $d ($count 个文件)" -ForegroundColor Red
    }
}
foreach ($f in $backendDeleteFiles) {
    $fullPath = "$OutputDir\$f"
    if (Test-Path $fullPath) {
        Remove-Item -Force $fullPath
        $deletedCount++
    }
}
Write-Host "  后端共删除 $deletedCount 个文件" -ForegroundColor Red

# ========== 步骤 4：删除前端付费模块 ==========
Write-Host "[4/9] 删除前端付费模块..." -ForegroundColor Yellow

$frontendDeleteDirs = @(
    "src\views\Wecom",
    "src\views\WecomSidebar",
    "src\views\Finance",
    "src\views\ServiceManagement"
)

$frontendDeleteFiles = @(
    "src\views\VirtualClaim.vue",
    "src\views\MobileAppDownload.vue",
    "src\views\MobileSDKInstall.vue",
    "src\views\Product\CardKeyManage.vue",
    "src\views\Product\ResourceManage.vue",
    "src\views\System\SmsTemplates.vue",
    "src\views\System\SmsApproval.vue",
    "src\views\System\SmsSendRecords.vue",
    "src\views\System\SmsStatistics.vue",
    "src\views\System\SmsConfig.vue",
    "src\views\System\CallTest.vue",
    "src\views\System\MobileSDK.vue",
    "src\views\System\ApiManagement.vue",
    "src\views\System\PermissionManagement.vue"
)

$frontDeletedCount = 0
foreach ($d in $frontendDeleteDirs) {
    $fullPath = "$OutputDir\$d"
    if (Test-Path $fullPath) {
        $count = (Get-ChildItem -Recurse -File $fullPath).Count
        Remove-Item -Recurse -Force $fullPath
        $frontDeletedCount += $count
        Write-Host "  [删除目录] $d ($count 个文件)" -ForegroundColor Red
    }
}
foreach ($f in $frontendDeleteFiles) {
    $fullPath = "$OutputDir\$f"
    if (Test-Path $fullPath) {
        Remove-Item -Force $fullPath
        $frontDeletedCount++
    }
}
Write-Host "  前端共删除 $frontDeletedCount 个文件" -ForegroundColor Red

# ========== 步骤 5：修改 app.ts（删除付费路由） ==========
Write-Host "[5/9] 修改后端 app.ts（移除付费路由）..." -ForegroundColor Yellow

$appTs = "$OutputDir\backend\src\app.ts"
if (Test-Path $appTs) {
    $content = Get-Content $appTs -Raw -Encoding UTF8

    # 删除付费模块的 import 行
    $paidImportPatterns = @(
        "import\s+callRoutes\s+from\s+.*",
        "import\s+callWebhookRoutes\s+from\s+.*",
        "import\s+callConfigRoutes\s+from\s+.*",
        "import\s+financeRoutes\s+from\s+.*",
        "import\s+codCollectionRoutes\s+from\s+.*",
        "import\s+codApplicationRoutes\s+from\s+.*",
        "import\s+valueAddedRoutes\s+from\s+.*",
        "import\s+wecomRoutes\s+from\s+.*",
        "import\s+adminRoutes\s+from\s+.*",
        "import\s+smsRoutes\s+from\s+.*",
        "import\s+smsAutoSendRoutes\s+from\s+.*",
        "import\s+smsQuotaRoutes\s+from\s+.*",
        "import\s+tenantLicenseRoutes\s+from\s+.*",
        "import\s+tenantDataRoutes\s+from\s+.*",
        "import\s+virtualInventoryRoutes\s+from\s+.*",
        "import\s+virtualDeliveryRoutes\s+from\s+.*",
        "import\s+virtualClaimRoutes\s+from\s+.*",
        "import\s+virtualSettingsRoutes\s+from\s+.*",
        "import\s+onlineSeatRoutes\s+from\s+.*",
        "import\s+mobileAppRoutes\s+from\s+.*",
        "import\s+miniprogramRoutes\s+from\s+.*",
        "import\s+performanceReportRoutes\s+from\s+.*",
        "import\s+customerServicePermissionRoutes\s+from\s+.*",
        "import\s+sensitiveInfoPermissionRoutes\s+from\s+.*"
    )
    foreach ($pattern in $paidImportPatterns) {
        $content = $content -replace "(?m)^\s*$pattern\s*;?\s*\r?\n", ""
    }

    # 删除付费模块的 app.use 行
    $paidRouteUsePatterns = @(
        ".*calls/webhook.*callWebhookRoutes.*",
        ".*[`'\x22]/calls[`'\x22].*callRoutes.*",
        ".*call-config.*callConfigRoutes.*",
        ".*finance.*financeRoutes.*",
        ".*cod-collection.*codCollectionRoutes.*",
        ".*cod-application.*codApplicationRoutes.*",
        ".*value-added.*valueAddedRoutes.*",
        ".*[`'\x22]/wecom[`'\x22].*wecomRoutes.*",
        ".*[`'\x22]/admin[`'\x22].*adminRoutes.*",
        ".*sms/auto-send.*smsAutoSendRoutes.*",
        ".*[`'\x22]/sms[`'\x22].*sms(Routes|QuotaRoutes).*",
        ".*tenant-license.*tenantLicenseRoutes.*",
        ".*tenant-data.*tenantDataRoutes.*",
        ".*virtual-inventory.*virtualInventoryRoutes.*",
        ".*virtual-delivery.*virtualDeliveryRoutes.*",
        ".*virtual-claim.*virtualClaimRoutes.*",
        ".*virtualSettingsRoutes.*",
        ".*online-seat.*onlineSeatRoutes.*",
        ".*mobile-app.*mobileAppRoutes.*",
        ".*[`'\x22]/mp[`'\x22].*miniprogramRoutes.*",
        ".*performance-report.*performanceReportRoutes.*",
        ".*customer-service-permissions.*customerServicePermissionRoutes.*",
        ".*sensitive-info-permissions.*sensitiveInfoPermissionRoutes.*"
    )
    foreach ($pattern in $paidRouteUsePatterns) {
        $content = $content -replace "(?m)^\s*app\.use\($pattern\s*\);\s*\r?\n", ""
    }

    # 修改 public/index.ts：移除被删除路由的 import 和 router.use
    $publicIndexTs = "$OutputDir\backend\src\routes\public\index.ts"
    if (Test-Path $publicIndexTs) {
        $pubContent = [System.IO.File]::ReadAllText($publicIndexTs, [System.Text.Encoding]::UTF8)
        # 删除 import 行
        $pubContent = $pubContent -replace "(?m)^\s*import\s+paymentRoutes\s+from\s+.*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*import\s+subscriptionRoutes\s+from\s+.*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*import\s+capacityRoutes\s+from\s+.*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*import\s+memberRoutes\s+from\s+.*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*import\s+memberSmsQuotaRoutes\s+from\s+.*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*import\s+memberWecomRoutes\s+from\s+.*\r?\n", ""
        # 删除 router.use 行
        $pubContent = $pubContent -replace "(?m)^\s*router\.use\([^)]*payment[^)]*\);\s*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*router\.use\([^)]*subscription[^)]*\);\s*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*router\.use\([^)]*capacity[^)]*\);\s*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*router\.use\([^)]*member[^)]*\);\s*\r?\n", ""
        $pubContent = $pubContent -replace "(?m)^\s*router\.use\([^)]*requireSaaSMode\);\s*\r?\n", ""
        # 删除支付/会员限流
        $pubContent = $pubContent -replace "(?ms)const\s+paymentLimiter\s*=\s*rateLimit\(\{.*?\}\);\s*\r?\n", ""
        $pubContent = $pubContent -replace "(?ms)const\s+memberLoginLimiter\s*=\s*rateLimit\(\{.*?\}\);\s*\r?\n", ""
        # 删除 SaaS 守卫 import（如果不再使用）
        $pubContent = $pubContent -replace "(?m)^\s*import\s+\{\s*requireSaaSMode\s*\}\s+from\s+.*\r?\n", ""
        [System.IO.File]::WriteAllText($publicIndexTs, $pubContent, [System.Text.Encoding]::UTF8)
        Write-Host "  [修改] backend/src/routes/public/index.ts (移除SaaS路由)" -ForegroundColor Magenta
    }

    # 删除录音存储和移动WebSocket初始化
    $content = $content -replace "(?ms)const\s*\{\s*recordingStorageService\s*\}.*?await\s+recordingStorageService\.initialize\(\);\s*\r?\n", ""
    $content = $content -replace "(?m)^\s*mobileWebSocketService\.initialize\(.*?\);\s*\r?\n", ""

    [System.IO.File]::WriteAllText($appTs, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  [修改] backend/src/app.ts" -ForegroundColor Magenta
}

# ========== 步骤 5.5：重写前端路由（将付费模块路由指向升级页） ==========
Write-Host "[5.5/9] 重写前端路由（付费模块 → 升级引导页）..." -ForegroundColor Yellow

$routerFile = "$OutputDir\src\router\index.ts"
if (Test-Path $routerFile) {
    $routerContent = [System.IO.File]::ReadAllText($routerFile, [System.Text.Encoding]::UTF8)

    # 1. 删除 import { getTenantPackage } from '@/api/wecom' （社区版无此API）
    $routerContent = $routerContent -replace "(?m)^\s*import\s+\{[^}]*getTenantPackage[^}]*\}\s+from\s+[`'""]@/api/wecom[`'""]\s*;?\s*\r?\n", ""

    # 2. 将被删除目录的组件 import 重写为 Upgrade.vue
    # 匹配 import('../views/Wecom/...') → import('../views/Upgrade.vue')
    $paidViewPatterns = @(
        "import\([`'""]\.\.\/views\/Wecom\/[^)]+\)",
        "import\([`'""]\.\.\/views\/WecomSidebar\/[^)]+\)",
        "import\([`'""]\.\.\/views\/Finance\/[^)]+\)",
        "import\([`'""]\.\.\/views\/ServiceManagement\/[^)]+\)",
        "import\([`'""]\.\.\/views\/VirtualClaim\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/MobileAppDownload\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/MobileSDKInstall\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/Product\/CardKeyManage\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/Product\/ResourceManage\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/SmsTemplates\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/SmsApproval\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/SmsSendRecords\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/SmsStatistics\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/SmsConfig\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/CallTest\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/MobileSDK\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/ApiManagement\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/System\/PermissionManagement\.vue[`'""]\)",
        "import\([`'""]@\/components\/System\/PermissionManagementGuide\.vue[`'""]\)",
        # 业绩模块：保留 Personal.vue，其他付费子页面指向 Upgrade
        "import\([`'""]\.\.\/views\/Performance\/Team\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/Performance\/Analysis\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/Performance\/Share\.vue[`'""]\)",
        "import\([`'""]\.\.\/views\/Settings\/PerformanceShare\.vue[`'""]\)"
    )
    $rewriteCount = 0
    foreach ($pat in $paidViewPatterns) {
        $matches = [regex]::Matches($routerContent, $pat)
        $rewriteCount += $matches.Count
        $routerContent = [regex]::Replace($routerContent, $pat, "import('../views/Upgrade.vue')")
    }

    # 3. 注释掉 getTenantPackage 调用的整个代码块（企微权限检查）
    # 简单方式：将 getTenantPackage() 调用替换为 null 返回
    $routerContent = $routerContent -replace "const res: any = await getTenantPackage\(\)", "const res: any = null // community: removed"
    # 不需要 getTenantPackage，也不需要 wecom 权限检查，直接跳过
    $routerContent = $routerContent -replace "if \(requiredWecomPerm && !userStore\.isAdmin\)", "if (false /* community: wecom removed */)"

    [System.IO.File]::WriteAllText($routerFile, $routerContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [重写] src/router/index.ts ($rewriteCount 个路由指向 Upgrade.vue)" -ForegroundColor Magenta
}

# 处理 api/wecom.ts 依赖（可能在其他地方有引用，创建空导出桩文件）
$wecomApiFile = "$OutputDir\src\api\wecom.ts"
if (Test-Path $wecomApiFile) {
    # 保留文件但清空为空导出桩，避免其他文件 import 报错
    $stubContent = @"
/**
 * 社区版：企微 API 已移除，此文件为空桩，防止 import 报错
 */
export const getTenantPackage = () => Promise.resolve(null)
export default {}
"@
    [System.IO.File]::WriteAllText($wecomApiFile, $stubContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [桩文件] src/api/wecom.ts (空导出桩)" -ForegroundColor Magenta
}

# 处理客户详情页中的 WecomInfoCard 引用（企微组件已删除）
$customerDetailVue = "$OutputDir\src\views\Customer\Detail.vue"
if (Test-Path $customerDetailVue) {
    $detailContent = [System.IO.File]::ReadAllText($customerDetailVue, [System.Text.Encoding]::UTF8)
    # 删除 WecomInfoCard 模板引用
    $detailContent = $detailContent -replace '(?m)^\s*<WecomInfoCard[^/]*/>\s*\r?\n', ""
    # 删除 WecomInfoCard import
    $detailContent = $detailContent -replace "(?m)^\s*import\s+WecomInfoCard\s+from\s+[`'""][^`'""]+[`'""]\s*;?\s*\r?\n", ""
    [System.IO.File]::WriteAllText($customerDetailVue, $detailContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [清理] Customer/Detail.vue (移除 WecomInfoCard)" -ForegroundColor Magenta
}

# 删除 WecomInfoCard 组件文件
$wecomCardFile = "$OutputDir\src\views\Customer\components\WecomInfoCard.vue"
if (Test-Path $wecomCardFile) { Remove-Item -Force $wecomCardFile }

# 处理 App.vue 中的企微独立布局引用
$appVue = "$OutputDir\src\App.vue"
if (Test-Path $appVue) {
    $appVueContent = [System.IO.File]::ReadAllText($appVue, [System.Text.Encoding]::UTF8)
    # 删除 WecomStandaloneLayout 模板引用
    $appVueContent = $appVueContent -replace '(?m)^\s*<WecomStandaloneLayout[^/]*/>\s*\r?\n', ""
    # 保留 v-else-if 条件行但不渲染（改为永远不匹配）
    $appVueContent = $appVueContent -replace '(?m)^\s*<!-- Phase 8: 企微独立窗口布局 -->\s*\r?\n', ""
    # 删除 import WecomStandaloneLayout
    $appVueContent = $appVueContent -replace "(?m)^\s*import\s+WecomStandaloneLayout\s+from\s+[`'""][^`'""]+[`'""]\s*;?\s*\r?\n", ""
    [System.IO.File]::WriteAllText($appVue, $appVueContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [清理] App.vue (移除 WecomStandaloneLayout)" -ForegroundColor Magenta
}

# 删除企微布局文件
$wecomLayoutDir = "$OutputDir\src\layouts"
if (Test-Path $wecomLayoutDir) { Remove-Item -Recurse -Force $wecomLayoutDir }

# 修改菜单配置：删除付费模块菜单项
$menuConfigFile = "$OutputDir\src\config\menu.ts"
if (Test-Path $menuConfigFile) {
    $menuContent = [System.IO.File]::ReadAllText($menuConfigFile, [System.Text.Encoding]::UTF8)

    # 删除付费一级菜单项（连同整个对象块）: service-management, finance, wecom
    # 注意：performance（基础业绩）保留在社区版中
    $paidMenuIds = @('service-management', 'finance', 'wecom')
    foreach ($menuId in $paidMenuIds) {
        # 匹配 { id: 'xxx', ... children: [ ... ] },  (含嵌套大括号)
        $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]$menuId[`'""].*?^\s*\},?\s*\r?\n", "`n", [System.Text.RegularExpressions.RegexOptions]::Multiline)
    }

    # 删除订单管理中的付费子菜单：取消代收申请、取消代收审核
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]order-my-cod-application[`'""].*?\},?\s*\r?\n", "`n")
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]order-cod-application-review[`'""].*?\},?\s*\r?\n", "`n")

    # 删除商品管理中的虚拟商品子菜单：卡密库存、资源库存
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]virtual-card-keys[`'""].*?\},?\s*\r?\n", "`n")
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]virtual-resources[`'""].*?\},?\s*\r?\n", "`n")

    # 删除系统管理中的付费子菜单：客服管理、接口管理
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]system-customer-service-permissions[`'""].*?\},?\s*\r?\n", "`n")
    $menuContent = [regex]::Replace($menuContent, "(?ms)\s*\{\s*\r?\n\s*id:\s*[`'""]system-api-management[`'""].*?\},?\s*\r?\n", "`n")

    # 清理 rolePermissions 中的付费模块权限
    $menuContent = $menuContent -replace "'wecom[^']*',?\s*", ""
    $menuContent = $menuContent -replace "'finance[^']*',?\s*", ""
    $menuContent = $menuContent -replace "'communication[^']*',?\s*", ""
    $menuContent = $menuContent -replace "'customer_service:manage',?\s*", ""
    $menuContent = $menuContent -replace "'product\.virtual[^']*',?\s*", ""

    [System.IO.File]::WriteAllText($menuConfigFile, $menuContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [修改] src/config/menu.ts (移除付费模块菜单和权限)" -ForegroundColor Magenta
}

# ========== 步骤 6：注入升级引导页 ==========
Write-Host "[6/9] 注入社区版专属文件..." -ForegroundColor Yellow

$templatesDir = "$SourceDir\scripts\community-templates"

# 复制 Upgrade.vue
Copy-Item "$templatesDir\Upgrade.vue" "$OutputDir\src\views\Upgrade.vue" -Force
Write-Host "  [注入] src/views/Upgrade.vue" -ForegroundColor Green

# 复制根目录文件
$rootTemplates = @("LICENSE", "docker-compose.yml", ".env.example", "CHANGELOG.md")
foreach ($tmpl in $rootTemplates) {
    $src = "$templatesDir\$tmpl"
    if (Test-Path $src) {
        Copy-Item $src "$OutputDir\$tmpl" -Force
        Write-Host "  [注入] $tmpl" -ForegroundColor Green
    }
}

# 生成社区版 README.md
$readmeSrc = "$templatesDir\README.md"
if (Test-Path $readmeSrc) {
    Copy-Item $readmeSrc "$OutputDir\README.md" -Force
    Write-Host "  [注入] README.md" -ForegroundColor Green
}

# 复制客服二维码到 public/uploads（Upgrade.vue 引用路径）
$qrSrc = "$SourceDir\backend\uploads\admin\general\3cb6dc5d-8f84-4fba-a4e2-4668e3729acc.png"
if (Test-Path $qrSrc) {
    $uploadDir = "$OutputDir\public\uploads"
    if (!(Test-Path $uploadDir)) { New-Item -ItemType Directory -Path $uploadDir | Out-Null }
    Copy-Item $qrSrc "$uploadDir\contact-service-qr.png" -Force
    Write-Host "  [注入] public/uploads/contact-service-qr.png (客服二维码)" -ForegroundColor Green
}

# 复制截图目录（如果有的话）
$screenshotsSrc = "$templatesDir\screenshots"
if (Test-Path $screenshotsSrc) {
    $docsDir = "$OutputDir\docs\screenshots"
    if (!(Test-Path $docsDir)) { New-Item -ItemType Directory -Path $docsDir -Force | Out-Null }
    Copy-Item "$screenshotsSrc\*" $docsDir -Recurse -Force
    Write-Host "  [注入] docs/screenshots/ (功能截图)" -ForegroundColor Green
}

# ========== 步骤 7：清理敏感信息 ==========
Write-Host "[7/9] 清理敏感信息..." -ForegroundColor Yellow

$envFiles = @(
    "$OutputDir\.env",
    "$OutputDir\.env.development",
    "$OutputDir\.env.production",
    "$OutputDir\backend\.env",
    "$OutputDir\backend\.env.development",
    "$OutputDir\backend\.env.production"
)
foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Remove-Item -Force $envFile
        Write-Host "  [删除] $(Split-Path -Leaf $envFile)" -ForegroundColor Red
    }
}

# 删除私有部署文档
if (Test-Path "$OutputDir\private-deploy") { Remove-Item -Recurse -Force "$OutputDir\private-deploy" }
# 删除主仓库脚本（社区版不需要）
if (Test-Path "$OutputDir\scripts") { Remove-Item -Recurse -Force "$OutputDir\scripts" }
# 删除测试中的敏感数据文件
if (Test-Path "$OutputDir\backend\__tests__") { Remove-Item -Recurse -Force "$OutputDir\backend\__tests__" -ErrorAction SilentlyContinue }

Write-Host "  敏感信息清理完成" -ForegroundColor Green

# ========== 步骤 8：验证构建完整性 ==========
Write-Host "[8/9] 验证构建完整性..." -ForegroundColor Yellow

$requiredFiles = @(
    "package.json",
    "index.html",
    "vite.config.ts",
    "src\main.ts",
    "src\router\index.ts",
    "backend\package.json",
    "backend\src\app.ts",
    "backend\src\server.ts",
    "database\schema.sql",
    "LICENSE",
    ".env.example"
)

$allOk = $true
foreach ($f in $requiredFiles) {
    if (!(Test-Path "$OutputDir\$f")) {
        Write-Host "  [缺失] $f" -ForegroundColor Red
        $allOk = $false
    }
}
if ($allOk) {
    Write-Host "  所有必要文件验证通过" -ForegroundColor Green
} else {
    Write-Host "  警告：有缺失文件，请检查" -ForegroundColor Red
}

# ========== 步骤 9：统计输出 ==========
$totalFiles = (Get-ChildItem -Recurse -File $OutputDir -Exclude ".git").Count
Write-Host ""
Write-Host "========== 导出完成 ==========" -ForegroundColor Cyan
Write-Host "  输出目录: $OutputDir"
Write-Host "  总文件数: $totalFiles"
Write-Host "  后端删除: $deletedCount 个文件"
Write-Host "  前端删除: $frontDeletedCount 个文件"
Write-Host ""

# ========== 可选：自动推送到 GitHub ==========
if ($PushToGit) {
    Write-Host "[推送] 推送到 GitHub..." -ForegroundColor Yellow
    Push-Location $OutputDir

    if (!(Test-Path ".git")) {
        git init
        git remote add origin $GitHubRepo
        git branch -M main
    }

    git add -A
    $commitMsg = "chore: update community edition $(Get-Date -Format 'yyyy-MM-dd')"
    git commit -m $commitMsg
    git push -u origin main --force

    Pop-Location
    Write-Host "  [推送完成] 已推送到 $GitHubRepo" -ForegroundColor Green
} else {
    Write-Host "下一步："
    Write-Host "  1. cd $OutputDir"
    Write-Host "  2. 检查代码完整性"
    Write-Host "  3. npm install && npm run dev  # 本地测试"
    Write-Host "  4. .\scripts\build-community.ps1 -PushToGit  # 推送到 GitHub"
}

Write-Host ""

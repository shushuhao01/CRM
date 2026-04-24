# 三系统启动脚本 - IDE终端专用
# 先终止所有 node 进程
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "=== All node processes killed ===" -ForegroundColor Yellow

# 1. 启动后端 (端口 3000)
Write-Host "[1/4] Starting Backend on port 3000..." -ForegroundColor Cyan
$backendDir = "D:\kaifa\CRM - 1.8.0\backend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$backendDir`" && npm run dev > `"$backendDir\logs\start-stdout.log`" 2> `"$backendDir\logs\start-stderr.log`"" -WindowStyle Hidden
Start-Sleep -Seconds 3

# 2. 启动 CRM 前端 (端口 5173)
Write-Host "[2/4] Starting CRM Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"D:\kaifa\CRM - 1.8.0`" && npm run dev" -WindowStyle Hidden
Start-Sleep -Seconds 2

# 3. 启动 Admin 后台 (端口 5174)
Write-Host "[3/4] Starting Admin on port 5174..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"D:\kaifa\CRM - 1.8.0\admin`" && npm run dev" -WindowStyle Hidden
Start-Sleep -Seconds 2

# 4. 启动 Website 官网 (端口 8080)
Write-Host "[4/4] Starting Website on port 8080..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"D:\kaifa\CRM - 1.8.0\website`" && npm run dev" -WindowStyle Hidden

# 轮询检查
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
$timeout = 90
$elapsed = 0
$backendOk = $false
$crmOk = $false
$adminOk = $false
$webOk = $false

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 5
    $elapsed += 5

    $ports = netstat -ano 2>$null | findstr "LISTENING"

    if (!$backendOk -and ($ports | findstr ":3000 ")) {
        Write-Host "  [OK] Backend :3000 started (${elapsed}s)" -ForegroundColor Green
        $backendOk = $true
    }
    if (!$crmOk -and ($ports | findstr ":5173 ")) {
        Write-Host "  [OK] CRM Frontend :5173 started (${elapsed}s)" -ForegroundColor Green
        $crmOk = $true
    }
    if (!$adminOk -and ($ports | findstr ":5174 ")) {
        Write-Host "  [OK] Admin :5174 started (${elapsed}s)" -ForegroundColor Green
        $adminOk = $true
    }
    if (!$webOk -and ($ports | findstr ":8080 ")) {
        Write-Host "  [OK] Website :8080 started (${elapsed}s)" -ForegroundColor Green
        $webOk = $true
    }

    if ($backendOk -and $crmOk -and $adminOk -and $webOk) {
        Write-Host "`n=== All services started! ===" -ForegroundColor Green
        break
    }

    if ($elapsed % 15 -eq 0) {
        Write-Host "  Waiting... ${elapsed}s" -ForegroundColor Gray
    }
}

if (!$backendOk) {
    Write-Host "  [FAIL] Backend :3000 not started" -ForegroundColor Red
    Write-Host "  Checking backend error log..." -ForegroundColor Yellow
    $errLog = "$backendDir\logs\start-stderr.log"
    if (Test-Path $errLog) {
        Get-Content $errLog | Select-Object -First 20
    }
}
if (!$crmOk) { Write-Host "  [FAIL] CRM :5173" -ForegroundColor Red }
if (!$adminOk) { Write-Host "  [FAIL] Admin :5174" -ForegroundColor Red }
if (!$webOk) { Write-Host "  [FAIL] Website :8080" -ForegroundColor Red }

Write-Host "`n=== Service URLs ===" -ForegroundColor Cyan
Write-Host "  CRM:     http://localhost:5173"
Write-Host "  Admin:   http://localhost:5174"
Write-Host "  Website: http://localhost:8080"
Write-Host "  API:     http://localhost:3000"


# CRM三系统启动脚本

Write-Host "=== CRM三系统启动脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 终止所有node进程
Write-Host "[1/5] 终止现有node进程..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✓ 完成" -ForegroundColor Green
Write-Host ""

# 2. 启动后端服务
Write-Host "[2/5] 启动后端服务 (端口 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 5
Write-Host "✓ 后端服务已启动" -ForegroundColor Green
Write-Host ""

# 3. 启动CRM前端
Write-Host "[3/5] 启动CRM前端 (端口 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "✓ CRM前端已启动" -ForegroundColor Green
Write-Host ""

# 4. 启动Admin管理后台
Write-Host "[4/5] 启动Admin管理后台 (端口 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\admin'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "✓ Admin管理后台已启动" -ForegroundColor Green
Write-Host ""

# 5. 启动Website官网
Write-Host "[5/5] 启动Website官网 (端口 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\website'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "✓ Website官网已启动" -ForegroundColor Green
Write-Host ""

# 等待服务完全启动
Write-Host "等待服务完全启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 检查端口
Write-Host ""
Write-Host "=== 端口检查 ===" -ForegroundColor Cyan
$ports = @(
    @{Port=3000; Name="后端API"},
    @{Port=5173; Name="CRM前端"},
    @{Port=5174; Name="Admin管理后台"},
    @{Port=8080; Name="Website官网"}
)

foreach($item in $ports) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $item.Port)
        Write-Host "✓ $($item.Name) (端口 $($item.Port)) - 运行中" -ForegroundColor Green
        $client.Close()
    } catch {
        Write-Host "✗ $($item.Name) (端口 $($item.Port)) - 未启动" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== 访问地址 ===" -ForegroundColor Cyan
Write-Host "后端API:        http://localhost:3000"
Write-Host "CRM前端:        http://localhost:5173"
Write-Host "Admin管理后台:  http://localhost:5174"
Write-Host "Website官网:    http://localhost:8080"
Write-Host ""
Write-Host "Tip: Each service runs in a separate PowerShell window" -ForegroundColor Yellow

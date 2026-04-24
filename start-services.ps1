# CRM System Startup Script

Write-Host "=== Starting CRM System ===" -ForegroundColor Cyan

# Stop existing node processes
Write-Host "Stopping existing node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Backend (Port 3000)
Write-Host "Starting Backend API (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
Start-Sleep -Seconds 8

# Start CRM Frontend (Port 5173)
Write-Host "Starting CRM Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"
Start-Sleep -Seconds 5

# Start Admin (Port 5174)
Write-Host "Starting Admin Panel (Port 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\admin'; npm run dev"
Start-Sleep -Seconds 5

# Start Website (Port 8080)
Write-Host "Starting Website (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\website'; npm run dev"
Start-Sleep -Seconds 5

# Wait for services to start
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check ports
Write-Host ""
Write-Host "=== Port Status ===" -ForegroundColor Cyan

$ports = @(3000, 5173, 5174, 8080)
$names = @("Backend API", "CRM Frontend", "Admin Panel", "Website")

for ($i = 0; $i -lt $ports.Length; $i++) {
    $port = $ports[$i]
    $name = $names[$i]

    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $port)
        Write-Host "[OK] $name (Port $port)" -ForegroundColor Green
        $client.Close()
    }
    catch {
        Write-Host "[FAIL] $name (Port $port)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Access URLs ===" -ForegroundColor Cyan
Write-Host "Backend API:   http://localhost:3000"
Write-Host "CRM Frontend:  http://localhost:5173"
Write-Host "Admin Panel:   http://localhost:5174"
Write-Host "Website:       http://localhost:8080"
Write-Host ""

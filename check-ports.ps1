$ports = @(
    @{Name='Backend'; Port=3000},
    @{Name='CRM Frontend'; Port=5173},
    @{Name='Admin Frontend'; Port=5174},
    @{Name='Website Frontend'; Port=5175}
)
Write-Host ""
Write-Host "========== Service Status ==========" -ForegroundColor Cyan
foreach ($svc in $ports) {
    $r = netstat -ano | Select-String ":$($svc.Port) " | Select-String "LISTENING"
    if ($r) {
        Write-Host "[OK] $($svc.Name) - port $($svc.Port) RUNNING" -ForegroundColor Green
    } else {
        Write-Host "[..] $($svc.Name) - port $($svc.Port) not ready" -ForegroundColor Yellow
    }
}
Write-Host "====================================" -ForegroundColor Cyan


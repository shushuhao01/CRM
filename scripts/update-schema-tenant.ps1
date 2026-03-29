$file = "D:\kaifa\CRM - 1.8.0\database\schema.sql"
$lines = [System.IO.File]::ReadAllLines($file)
$tables = @('call_lines','work_phones','device_bind_logs','global_call_config','outbound_tasks','call_recordings','phone_blacklist','phone_configs','user_line_assignments','notification_templates','message_cleanup_history','improvement_goals','logistics_api_configs','wecom_chat_records','rejection_reasons')
$count = 0

foreach ($t in $tables) {
    $inBlock = $false
    $blockStart = -1
    $hasTenantId = $false
    $engineLine = -1

    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "CREATE TABLE ``$t``") {
            $inBlock = $true
            $blockStart = $i
            $hasTenantId = $false
        }
        if ($inBlock) {
            if ($lines[$i] -match 'tenant_id') {
                $hasTenantId = $true
            }
            if ($lines[$i] -match '^\) ENGINE=') {
                $engineLine = $i
                $inBlock = $false

                if (-not $hasTenantId -and $blockStart -ge 0) {
                    # Insert tenant_id column before the ) ENGINE= line
                    # Find the last column/index line before ) ENGINE= and add comma if needed
                    $prevLine = $lines[$engineLine - 1]
                    if ($prevLine -notmatch ',\s*$') {
                        $lines[$engineLine - 1] = $prevLine + ","
                    }
                    $newLines = New-Object System.Collections.ArrayList
                    $newLines.AddRange($lines[0..($engineLine - 1)])
                    $newLines.Add("  ``tenant_id`` VARCHAR(36) NULL COMMENT '租户ID',")
                    $newLines.Add("  INDEX ``idx_${t}_tenant`` (``tenant_id``)")
                    $newLines.AddRange($lines[$engineLine..($lines.Length - 1)])
                    $lines = $newLines.ToArray()
                    $count++
                    Write-Host "ADDED tenant_id to $t (was at line $($blockStart+1))"
                } else {
                    Write-Host "SKIP $t - already has tenant_id or not found"
                }
                break
            }
        }
    }

    if ($blockStart -eq -1) {
        Write-Host "NOT FOUND: $t"
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Host "`nDone. Updated $count tables in schema.sql"


@echo off
echo Deleting orphan Vue files...
echo.

del "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\VasConfig.vue"
if %errorlevel% equ 0 (
    echo [SUCCESS] VasConfig.vue deleted
) else (
    echo [ERROR] Failed to delete VasConfig.vue
)

del "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\PackageTemplate.vue"
if %errorlevel% equ 0 (
    echo [SUCCESS] PackageTemplate.vue deleted
) else (
    echo [ERROR] Failed to delete PackageTemplate.vue
)

del "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\ChatArchiveManagement.vue"
if %errorlevel% equ 0 (
    echo [SUCCESS] ChatArchiveManagement.vue deleted
) else (
    echo [ERROR] Failed to delete ChatArchiveManagement.vue
)

echo.
echo Verifying deletions...
echo.

if exist "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\VasConfig.vue" (
    echo [FAILED] VasConfig.vue still exists
) else (
    echo [CONFIRMED] VasConfig.vue deleted
)

if exist "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\PackageTemplate.vue" (
    echo [FAILED] PackageTemplate.vue still exists
) else (
    echo [CONFIRMED] PackageTemplate.vue deleted
)

if exist "D:\kaifa\CRM - 1.8.0\admin\src\views\wecom\ChatArchiveManagement.vue" (
    echo [FAILED] ChatArchiveManagement.vue still exists
) else (
    echo [CONFIRMED] ChatArchiveManagement.vue deleted
)

pause

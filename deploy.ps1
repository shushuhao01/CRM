# CRM系统一键部署脚本 (PowerShell版本)
# 适用于Windows服务器

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 CRM系统一键部署脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查Node.js版本
Write-Host "📋 检查环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未找到Node.js，请先安装Node.js 22.x或更高版本" -ForegroundColor Red
    exit 1
}

# 检查是否存在.env文件
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  未找到backend\.env文件" -ForegroundColor Yellow
    Write-Host "正在从.env.example创建..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "⚠️  请编辑 backend\.env 文件配置数据库等信息" -ForegroundColor Yellow
    Write-Host "按任意键继续..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# 1. 安装前端依赖
Write-Host ""
Write-Host "📦 步骤1/6: 安装前端依赖..." -ForegroundColor Yellow
npm install --production
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}

# 2. 安装后端依赖
Write-Host ""
Write-Host "📦 步骤2/6: 安装后端依赖..." -ForegroundColor Yellow
Set-Location backend
npm install --production
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "❌ 后端依赖安装失败" -ForegroundColor Red
    exit 1
}
Set-Location ..

# 3. 构建前端
Write-Host ""
Write-Host "🔨 步骤3/6: 构建前端..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 前端构建完成" -ForegroundColor Green
} else {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}

# 4. 构建后端
Write-Host ""
Write-Host "🔨 步骤4/6: 构建后端..." -ForegroundColor Yellow
Set-Location backend
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 后端构建完成" -ForegroundColor Green
} else {
    Write-Host "❌ 后端构建失败" -ForegroundColor Red
    exit 1
}
Set-Location ..

# 5. 检查PM2
Write-Host ""
Write-Host "🔍 步骤5/6: 检查PM2..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 -v
    Write-Host "✅ PM2已安装: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PM2未安装，正在安装..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "✅ PM2安装完成" -ForegroundColor Green
}

# 6. 启动/重启服务
Write-Host ""
Write-Host "🚀 步骤6/6: 启动服务..." -ForegroundColor Yellow
Set-Location backend

# 检查服务是否已存在
$pm2List = pm2 list
if ($pm2List -match "crm-backend") {
    Write-Host "重启现有服务..." -ForegroundColor Yellow
    pm2 restart crm-backend
} else {
    Write-Host "首次启动服务..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
}

# 保存PM2配置
pm2 save

Set-Location ..
Write-Host "✅ 服务启动完成" -ForegroundColor Green

# 显示服务状态
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 服务状态:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "📝 常用命令:" -ForegroundColor Yellow
Write-Host "  查看日志: pm2 logs crm-backend"
Write-Host "  重启服务: pm2 restart crm-backend"
Write-Host "  停止服务: pm2 stop crm-backend"
Write-Host "  查看状态: pm2 status"
Write-Host ""
Write-Host "🌐 访问地址:" -ForegroundColor Yellow
Write-Host "  前端: http://你的域名"
Write-Host "  API: http://你的域名/api/v1/health"
Write-Host ""
Write-Host "🎉 部署成功！" -ForegroundColor Green

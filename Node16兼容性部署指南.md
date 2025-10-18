# 🔧 Node.js 16版本兼容性部署指南

## ⚠️ 版本兼容性说明

您的宝塔面板环境：
- **Node.js版本**：16.20.2
- **NPM版本**：8.19.4
- **V8版本**：9.4.146.26

项目要求：
- **前端项目**：Node.js 20+ （需要调整）
- **后端项目**：Node.js 16+ （兼容）

## 🛠️ 解决方案

### 方案一：升级Node.js版本（推荐）

#### 在宝塔面板中升级Node.js
1. 登录宝塔面板
2. 进入 **软件商店** → **运行环境**
3. 找到 **Node.js项目管理器**
4. 安装 **Node.js 18.x** 或 **Node.js 20.x** 版本
5. 设置为默认版本

#### 验证升级
```bash
node --version  # 应显示 18.x 或 20.x
npm --version   # 应显示 9.x 或 10.x
```

### 方案二：修改项目配置兼容Node.js 16

如果无法升级Node.js版本，可以修改项目配置：

#### 1. 修改前端package.json
```json
{
  "engines": {
    "node": ">=16.20.0"
  }
}
```

#### 2. 创建.nvmrc文件
```bash
# 在项目根目录创建
echo "16.20.2" > .nvmrc
```

#### 3. 修改构建脚本
```json
{
  "scripts": {
    "build": "vite build --target es2020",
    "build-only": "vite build --target es2020"
  }
}
```

## 🚀 Node.js 16版本部署步骤

### 第一步：准备兼容性文件

#### 1. 更新前端配置
```bash
# 在本地修改package.json
# 将 "node": "^20.19.0 || >=22.12.0" 
# 改为 "node": ">=16.20.0"
```

#### 2. 重新构建前端（如需要）
```bash
# 如果遇到构建问题，使用兼容性构建
npm run build -- --target es2020
```

### 第二步：上传和配置

#### 1. 上传项目文件
- 将整个CRM目录上传到：`/www/wwwroot/crm`
- 确保文件权限正确

#### 2. 配置Node.js项目
```bash
# 项目配置
项目路径: /www/wwwroot/crm/backend
启动文件: dist/app.js
端口: 3000
Node版本: 16.20.2
```

#### 3. 安装依赖（兼容性安装）
```bash
cd /www/wwwroot/crm/backend

# 使用npm 8.x安装依赖
npm install --production --legacy-peer-deps

# 如果遇到权限问题
npm install --production --legacy-peer-deps --unsafe-perm
```

### 第三步：启动服务

#### 1. 直接启动测试
```bash
cd /www/wwwroot/crm/backend
node dist/app.js
```

#### 2. 使用PM2启动
```bash
# 修改ecosystem.config.js中的node版本要求
pm2 start ecosystem.config.js --env production

# 或者直接启动
pm2 start dist/app.js --name crm-backend
```

## 🔍 常见问题解决

### 1. 前端构建失败
```bash
# 错误：Node.js版本不兼容
# 解决：使用兼容性构建命令
npm run build -- --target es2020 --legacy-peer-deps
```

### 2. 后端依赖安装失败
```bash
# 错误：某些包需要Node.js 18+
# 解决：使用legacy模式
npm install --legacy-peer-deps --production
```

### 3. TypeScript编译错误
```bash
# 错误：ES2022语法不支持
# 解决：修改tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"]
  }
}
```

### 4. PM2启动失败
```bash
# 错误：PM2版本不兼容
# 解决：直接使用node启动
node dist/app.js

# 或者更新PM2
npm install -g pm2@latest
```

## 📋 Node.js 16兼容性检查清单

### 前端兼容性
- [ ] 修改package.json中的engines字段
- [ ] 使用--target es2020构建
- [ ] 检查依赖包兼容性
- [ ] 验证构建产物正常

### 后端兼容性
- [ ] 确认TypeScript编译目标为ES2020
- [ ] 检查所有依赖包支持Node.js 16
- [ ] 测试数据库连接正常
- [ ] 验证API接口响应

### 部署验证
- [ ] Node.js版本确认：16.20.2
- [ ] 依赖安装成功
- [ ] 服务启动正常
- [ ] 数据库连接成功
- [ ] 前端页面加载正常
- [ ] API接口调用成功

## 🎯 推荐的部署流程

### 1. 本地准备（如果需要重新构建）
```bash
# 修改前端配置兼容Node.js 16
# 重新构建前端项目
npm run build -- --target es2020
```

### 2. 服务器部署
```bash
# 上传文件
# 配置Node.js项目
# 安装依赖（使用legacy模式）
# 启动服务
```

### 3. 测试验证
```bash
# 访问网站
# 测试登录
# 检查功能
```

## 💡 性能优化建议

### Node.js 16环境优化
```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 启用实验性功能（谨慎使用）
export NODE_OPTIONS="--experimental-modules"
```

### PM2配置优化
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'dist/app.js',
    node_args: '--max-old-space-size=2048',
    env_production: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048'
    }
  }]
}
```

## ⚡ 快速部署命令

如果您选择继续使用Node.js 16，可以使用以下快速部署命令：

```bash
# 1. 上传文件后，进入后端目录
cd /www/wwwroot/crm/backend

# 2. 安装依赖
npm install --production --legacy-peer-deps

# 3. 启动服务
pm2 start dist/app.js --name crm-backend

# 4. 保存PM2配置
pm2 save
pm2 startup
```

---

**建议**：虽然可以在Node.js 16上运行，但为了获得最佳性能和兼容性，建议升级到Node.js 18或20版本。
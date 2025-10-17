# 简化上传部署指南 - 上传整个CRM文件夹

## 📦 第一步：打包整个项目

### 在本地Windows系统操作：

1. **压缩整个CRM文件夹**
   ```powershell
   # 方法1：使用PowerShell
   Compress-Archive -Path "d:\kaifa\CRM" -DestinationPath "d:\kaifa\CRM.zip"
   
   # 方法2：右键压缩
   # 右键点击 CRM 文件夹 -> 发送到 -> 压缩文件夹
   ```

2. **检查压缩包大小**
   - 确保压缩包不超过宝塔面板上传限制（通常500MB-2GB）
   - 如果太大，可以删除一些不必要的文件后重新压缩

## 🚀 第二步：上传到服务器

### 使用宝塔面板上传：

1. **登录宝塔面板**
   - 访问：http://your-server-ip:8888
   - 输入用户名密码

2. **上传压缩包**
   - 点击左侧菜单 "文件"
   - 进入 `/root` 目录
   - 点击 "上传" 按钮
   - 选择 `CRM.zip` 文件上传

3. **解压文件**
   - 右键点击 `CRM.zip`
   - 选择 "解压"
   - 解压到当前目录
   - 现在您在 `/root/CRM/` 目录下有完整的项目文件

## 🔧 第三步：执行部署

### 进入项目目录并执行部署：

```bash
# SSH登录服务器或使用宝塔终端
cd /root/CRM

# 给脚本执行权限
chmod +x centos7-setup.sh deploy.sh

# 1. 首先运行环境准备（首次部署）
./centos7-setup.sh

# 2. 配置数据库（在宝塔面板操作）
# - 创建数据库：crm_system
# - 创建用户：crm_user
# - 设置密码

# 3. 编辑后端环境变量
cd backend
cp .env.production .env
nano .env
# 修改数据库连接信息

# 4. 初始化数据库
node init-database.js

# 5. 返回项目根目录执行部署
cd /root/CRM
./deploy.sh
```

## 📝 修改部署脚本路径

由于整个项目在 `/root/CRM/` 目录，需要稍微调整部署脚本中的路径：

### 更新后的部署命令：

```bash
#!/bin/bash
# 在 /root/CRM/ 目录下执行

# 设置变量
DOMAIN="abc789.cn"
FRONTEND_PATH="/www/wwwroot/$DOMAIN"
BACKEND_PATH="/www/wwwroot/crm-backend"
PROJECT_ROOT="/root/CRM"

# 部署前端
echo "🎨 部署前端..."
mkdir -p $FRONTEND_PATH
cp -r $PROJECT_ROOT/dist/* $FRONTEND_PATH/

# 部署后端
echo "⚙️ 部署后端..."
mkdir -p $BACKEND_PATH
cp -r $PROJECT_ROOT/backend/* $BACKEND_PATH/

# 其他步骤保持不变...
```

## 🎯 优势和注意事项

### ✅ 优势：
- **简单直接** - 一次性上传所有文件
- **完整性** - 不会遗漏任何文件
- **方便管理** - 所有文件在一个目录下

### ⚠️ 注意事项：
- **上传时间** - 整个项目可能较大，上传需要时间
- **磁盘空间** - 确保服务器有足够空间
- **权限设置** - 上传后需要设置正确的文件权限

## 🔍 部署后验证

```bash
# 检查文件是否完整
ls -la /root/CRM/
ls -la /root/CRM/dist/
ls -la /root/CRM/backend/

# 检查服务状态
pm2 status
systemctl status nginx

# 测试访问
curl http://localhost:3000/api/v1/health
curl https://abc789.cn
```

## 📋 完整操作清单

- [ ] 1. 本地压缩CRM文件夹
- [ ] 2. 上传CRM.zip到服务器/root目录
- [ ] 3. 解压到/root/CRM/
- [ ] 4. 运行环境准备脚本
- [ ] 5. 在宝塔面板创建数据库
- [ ] 6. 配置后端环境变量
- [ ] 7. 初始化数据库
- [ ] 8. 运行部署脚本
- [ ] 9. 在宝塔面板配置站点和Nginx
- [ ] 10. 测试访问

这样操作更简单，您只需要上传一个压缩包就可以了！
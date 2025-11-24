# Windows 本地构建完整教程（新手版）

> 适合完全没有经验的新手，每一步都有详细说明

---

## 📋 准备工作

### 你需要准备：
- ✅ 一台 Windows 电脑（Win7/8/10/11 都可以）
- ✅ 网络连接
- ✅ 至少 5GB 可用磁盘空间
- ✅ 30 分钟时间

---

## 第一部分：安装必要软件（15分钟）

### 步骤 1：安装 Node.js

#### 1.1 下载 Node.js

1. 打开浏览器
2. 访问：https://nodejs.org/zh-cn/
3. 你会看到两个版本：
   - **LTS（长期支持版）** ← 选这个！
   - Current（最新版）
4. 点击 **"LTS"** 版本的下载按钮
5. 下载文件名类似：`node-v18.18.0-x64.msi`

**下载地址**：
- 官网：https://nodejs.org/zh-cn/
- 备用（国内镜像）：https://npmmirror.com/mirrors/node/

#### 1.2 安装 Node.js

1. 找到下载的 `.msi` 文件
2. 双击运行
3. 安装向导：
   - 点击 **"Next"**（下一步）
   - 勾选 **"I accept..."**（我接受协议）
   - 点击 **"Next"**
   - 安装路径保持默认：`C:\Program Files\nodejs\`
   - 点击 **"Next"**
   - 勾选 **"Automatically install..."**（自动安装工具）
   - 点击 **"Next"**
   - 点击 **"Install"**（安装）
   - 等待安装完成（约 2-3 分钟）
   - 点击 **"Finish"**（完成）

#### 1.3 验证安装

1. 按 `Win + R` 键
2. 输入 `cmd`，按回车
3. 在黑色窗口中输入：
   ```cmd
   node -v
   ```
4. 按回车，应该显示：`v18.18.0`（或类似版本号）
5. 再输入：
   ```cmd
   npm -v
   ```
6. 按回车，应该显示：`9.8.1`（或类似版本号）

**如果显示版本号，说明安装成功！** ✅

### 步骤 2：安装 Git（可选，推荐）

#### 2.1 下载 Git

1. 访问：https://git-scm.com/download/win
2. 自动下载最新版本
3. 或选择：**"64-bit Git for Windows Setup"**

**下载地址**：
- 官网：https://git-scm.com/download/win
- 备用：https://npmmirror.com/mirrors/git-for-windows/

#### 2.2 安装 Git

1. 双击下载的 `.exe` 文件
2. 安装向导：
   - 点击 **"Next"**
   - 安装路径保持默认
   - 点击 **"Next"**（一路下一步）
   - 选择编辑器：保持默认
   - 其他选项：全部保持默认
   - 点击 **"Install"**
   - 等待安装完成
   - 点击 **"Finish"**

#### 2.3 验证安装

在命令提示符中输入：
```cmd
git --version
```

应该显示：`git version 2.x.x`

---

## 第二部分：获取项目代码（5分钟）

### 方法一：使用 Git 克隆（推荐）

#### 步骤 1：选择存放位置

1. 打开 **"此电脑"** 或 **"我的电脑"**
2. 进入 `D:\` 盘（或其他盘）
3. 创建一个文件夹，例如：`D:\Projects`

#### 步骤 2：打开命令提示符

1. 在 `D:\Projects` 文件夹中
2. 按住 `Shift` 键，右键点击空白处
3. 选择 **"在此处打开 PowerShell 窗口"** 或 **"在此处打开命令窗口"**

#### 步骤 3：克隆项目

在命令窗口中输入：

```cmd
git clone https://github.com/shushuhao01/CRM.git
```

按回车，等待下载完成（约 2-5 分钟）。

**如果下载很慢**，使用国内镜像：
```cmd
git clone https://ghproxy.com/https://github.com/shushuhao01/CRM.git
```

#### 步骤 4：进入项目目录

```cmd
cd CRM
```

### 方法二：直接下载 ZIP（简单）

#### 步骤 1：下载项目

1. 访问：https://github.com/shushuhao01/CRM
2. 点击绿色的 **"Code"** 按钮
3. 选择 **"Download ZIP"**
4. 下载到本地（例如：`D:\Downloads\CRM-main.zip`）

#### 步骤 2：解压

1. 找到下载的 `CRM-main.zip`
2. 右键点击，选择 **"解压到当前文件夹"** 或 **"解压到 CRM-main\"**
3. 解压后得到 `CRM-main` 文件夹
4. 将文件夹重命名为 `CRM`
5. 移动到 `D:\Projects\CRM`

#### 步骤 3：打开命令提示符

1. 进入 `D:\Projects\CRM` 文件夹
2. 在地址栏输入 `cmd`，按回车
3. 命令提示符会自动打开，并定位到当前目录

---

## 第三部分：构建前端（10分钟）

### 步骤 1：配置 npm 镜像（加速）

在命令提示符中输入：

```cmd
npm config set registry https://registry.npmmirror.com
```

按回车。

**验证配置**：
```cmd
npm config get registry
```

应该显示：`https://registry.npmmirror.com/`

### 步骤 2：安装依赖

在命令提示符中输入：

```cmd
npm install --legacy-peer-deps
```

按回车，等待安装完成。

**预计时间**：5-10 分钟

**过程中会显示**：
```
npm WARN deprecated ...
added 800+ packages in 5m
```

**如果出现警告（WARN）**：不用担心，这是正常的。

**如果出现错误（ERR）**：
```cmd
# 清理后重试
rmdir /s /q node_modules
del package-lock.json
npm install --legacy-peer-deps
```

### 步骤 3：创建配置文件

#### 方法 A：使用记事本创建

1. 在 `D:\Projects\CRM` 文件夹中
2. 右键点击空白处
3. 选择 **"新建"** → **"文本文档"**
4. 文件名改为：`.env.production`（注意前面有个点）
5. 双击打开，输入以下内容：

```env
VITE_API_BASE_URL=/api
VITE_APP_TITLE=CRM管理系统
NODE_ENV=production
VITE_USE_REAL_API=true
```

6. 保存并关闭

**注意**：
- 文件名必须是 `.env.production`
- 不是 `.env.production.txt`
- 如果看不到文件扩展名，需要在文件夹选项中显示扩展名

#### 方法 B：使用命令创建

在命令提示符中输入：

```cmd
echo VITE_API_BASE_URL=/api > .env.production
echo VITE_APP_TITLE=CRM管理系统 >> .env.production
echo NODE_ENV=production >> .env.production
echo VITE_USE_REAL_API=true >> .env.production
```

### 步骤 4：开始构建

在命令提示符中输入：

```cmd
npm run build
```

按回车，等待构建完成。

**预计时间**：2-5 分钟

**构建过程中会显示**：
```
vite v4.4.9 building for production...
transforming...
✓ 1234 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.30 kB
dist/assets/index-abc123.css     50.23 kB │ gzip: 10.45 kB
dist/assets/index-xyz789.js     500.67 kB │ gzip: 150.23 kB
✓ built in 2.34s
```

**看到 "✓ built in" 说明构建成功！** ✅

### 步骤 5：验证构建结果

在命令提示符中输入：

```cmd
dir dist
```

应该看到：
```
index.html
assets
favicon.ico
...
```

**或者**：
1. 打开 `D:\Projects\CRM` 文件夹
2. 应该看到一个 `dist` 文件夹
3. 打开 `dist` 文件夹
4. 应该看到 `index.html` 和 `assets` 文件夹

---

## 第四部分：打包上传（5分钟）

### 步骤 1：打包 dist 文件夹

#### 方法 A：使用 Windows 自带压缩

1. 进入 `D:\Projects\CRM` 文件夹
2. 找到 `dist` 文件夹
3. 右键点击 `dist` 文件夹
4. 选择 **"发送到"** → **"压缩(zipped)文件夹"**
5. 等待压缩完成
6. 得到 `dist.zip` 文件

#### 方法 B：使用 7-Zip（如果已安装）

1. 右键点击 `dist` 文件夹
2. 选择 **"7-Zip"** → **"添加到压缩包..."**
3. 压缩格式：选择 **"zip"**
4. 压缩文件名：`dist.zip`
5. 点击 **"确定"**
6. 等待压缩完成

### 步骤 2：上传到服务器

#### 使用宝塔面板上传：

1. **登录宝塔面板**
   - 打开浏览器
   - 输入：`http://您的服务器IP:8888`
   - 输入用户名和密码
   - 点击 **"登录"**

2. **进入文件管理**
   - 点击左侧菜单的 **"文件"**
   - 点击路径导航到：`/www/wwwroot/abc789.cn`

3. **上传文件**
   - 点击顶部的 **"上传"** 按钮
   - 点击 **"选择文件"**
   - 选择刚才打包的 `dist.zip`
   - 点击 **"开始上传"**
   - 等待上传完成（根据网速，1-5 分钟）

4. **解压文件**
   - 在文件列表中找到 `dist.zip`
   - 点击右侧的 **"解压"** 按钮
   - 解压路径：`/www/wwwroot/abc789.cn`
   - 点击 **"解压"** 按钮
   - 等待解压完成

5. **删除旧的 dist 文件夹（如果存在）**
   - 在解压前，先删除或重命名旧的 `dist` 文件夹
   - 右键点击旧的 `dist` 文件夹
   - 选择 **"删除"** 或 **"重命名"**（改为 `dist.old`）

6. **验证**
   - 解压完成后，应该看到新的 `dist` 文件夹
   - 点击进入 `dist` 文件夹
   - 应该看到 `index.html` 和 `assets` 文件夹

7. **删除压缩包**
   - 返回上一级目录
   - 找到 `dist.zip`
   - 右键点击，选择 **"删除"**

---

## 第五部分：部署后端（5分钟）

### 在宝塔终端执行：

1. **打开终端**
   - 在宝塔面板，点击右上角的 **"终端"** 按钮

2. **进入项目目录**
   ```bash
   cd /www/wwwroot/abc789.cn
   ```

3. **安装后端依赖**
   ```bash
   cd backend
   npm install --production --legacy-peer-deps
   cd ..
   ```

4. **启动后端服务**
   ```bash
   cd backend
   pm2 stop crm-backend 2>/dev/null || true
   pm2 delete crm-backend 2>/dev/null || true
   pm2 start npm --name "crm-backend" -- start
   pm2 save
   cd ..
   ```

5. **查看服务状态**
   ```bash
   pm2 list
   ```

   应该看到：
   ```
   ┌─────┬──────────────┬─────────┬─────────┐
   │ id  │ name         │ status  │ restart │
   ├─────┼──────────────┼─────────┼─────────┤
   │ 0   │ crm-backend  │ online  │ 0       │
   └─────┴──────────────┴─────────┴─────────┘
   ```

---

## 第六部分：配置 Nginx（5分钟）

### 在宝塔面板操作：

1. **创建网站**
   - 点击左侧 **"网站"**
   - 点击 **"添加站点"**
   - 域名：输入您的域名或 IP
   - 根目录：`/www/wwwroot/abc789.cn/dist`
   - PHP版本：**"纯静态"**
   - 点击 **"提交"**

2. **配置反向代理**
   - 在网站列表找到刚创建的网站
   - 点击 **"设置"**
   - 点击 **"反向代理"** 标签
   - 点击 **"添加反向代理"**
   - 代理名称：`api`
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
   - 点击 **"保存"**

3. **配置 URL 重写**
   - 在网站设置中，点击 **"配置文件"** 标签
   - 找到 `location /` 部分
   - 修改为：
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   
   location /api {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```
   - 点击 **"保存"**

---

## 第七部分：测试访问（2分钟）

### 步骤 1：访问网站

1. 打开浏览器
2. 输入：`http://您的IP或域名`
3. 按回车

**应该看到登录页面！** 🎉

### 步骤 2：测试登录

使用预设账号：
- 用户名：`superadmin`
- 密码：`super123456`

点击 **"登录"**

**如果能进入系统，说明部署成功！** ✅

---

## 📊 完整流程时间表

| 步骤 | 内容 | 预计时间 |
|------|------|---------|
| 1 | 安装 Node.js | 5分钟 |
| 2 | 安装 Git（可选） | 5分钟 |
| 3 | 获取项目代码 | 5分钟 |
| 4 | 安装依赖 | 5-10分钟 |
| 5 | 构建前端 | 2-5分钟 |
| 6 | 打包上传 | 5分钟 |
| 7 | 部署后端 | 5分钟 |
| 8 | 配置 Nginx | 5分钟 |
| **总计** | | **30-40分钟** |

---

## ⚠️ 常见问题

### 问题 1：Node.js 安装后，cmd 中找不到命令

**解决方案**：
1. 关闭所有命令提示符窗口
2. 重新打开命令提示符
3. 再次输入 `node -v`

### 问题 2：npm install 很慢

**解决方案**：
```cmd
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install --legacy-peer-deps
```

### 问题 3：构建失败

**解决方案**：
```cmd
# 清理后重试
rmdir /s /q node_modules
rmdir /s /q dist
del package-lock.json
npm install --legacy-peer-deps
npm run build
```

### 问题 4：上传文件太大

**解决方案**：
1. 在宝塔面板 → 设置 → 上传限制
2. 调整为 500MB
3. 重新上传

### 问题 5：页面空白

**解决方案**：
1. 按 `Ctrl + Shift + Delete` 清除浏览器缓存
2. 或按 `Ctrl + F5` 强制刷新
3. 检查 Nginx 配置是否正确

---

## 📝 需要下载的软件清单

### 必须下载：

1. **Node.js**
   - 下载地址：https://nodejs.org/zh-cn/
   - 版本：LTS（长期支持版）
   - 大小：约 30MB
   - 用途：构建前端项目

### 可选下载：

2. **Git**
   - 下载地址：https://git-scm.com/download/win
   - 版本：最新版
   - 大小：约 50MB
   - 用途：克隆项目代码

3. **7-Zip**（如果需要更好的压缩）
   - 下载地址：https://www.7-zip.org/
   - 版本：最新版
   - 大小：约 1.5MB
   - 用途：压缩 dist 文件夹

---

## 🎯 快速命令参考

### 完整构建流程（复制粘贴）

```cmd
REM 1. 配置镜像
npm config set registry https://registry.npmmirror.com

REM 2. 安装依赖
npm install --legacy-peer-deps

REM 3. 创建配置文件
echo VITE_API_BASE_URL=/api > .env.production
echo VITE_APP_TITLE=CRM管理系统 >> .env.production
echo NODE_ENV=production >> .env.production
echo VITE_USE_REAL_API=true >> .env.production

REM 4. 构建
npm run build

REM 5. 验证
dir dist
```

---

## 💡 小贴士

1. **第一次构建时间较长**
   - 需要下载很多依赖包
   - 后续构建会快很多

2. **保存项目文件夹**
   - 下次更新只需 `git pull` 或重新下载
   - 然后直接 `npm run build`

3. **定期更新**
   - 每次代码更新后
   - 重新构建并上传 dist 文件夹

4. **备份配置文件**
   - 服务器上的 `backend/.env`
   - 包含数据库密码等重要信息

---

**恭喜！您已经完成了本地构建和部署！** 🎉

如果有任何问题，请查看常见问题部分或联系技术支持。

---

**版本**：v1.0  
**更新日期**：2024-11-23  
**适用于**：Windows 7/8/10/11

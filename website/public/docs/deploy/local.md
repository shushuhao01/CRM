## 🖥️ 本地电脑部署教程

适合在 Windows / macOS 本地电脑上快速体验和测试CRM系统。部署完成后团队成员可通过局域网IP访问。

---

### 📋 系统最低要求

| 配置项 | 要求 |
|--------|------|
| 操作系统 | Windows 10/11 或 macOS 12+ |
| 内存 | 4GB 及以上（推荐 8GB） |
| 磁盘空间 | 至少 2GB 可用空间 |
| 浏览器 | Chrome / Edge / Firefox 最新版 |

---

### 🚀 方式零：一键环境安装方案（完全不懂技术的小白推荐）

> 如果您不会手动安装 Node.js 和 MySQL，可以使用以下**集成环境工具**，一个软件搞定所有依赖！

#### Windows 推荐：phpStudy（小皮面板）

[**📥 点击下载 phpStudy →**](https://www.xp.cn/download.html)

1. 打开上方链接，下载 **phpStudy V8.1** Windows 版
2. 双击安装包，选择安装路径（建议 `D:\phpstudy_pro`），点击「安装」
3. 安装完成后打开 phpStudy，进入「**软件管理**」标签页
4. 找到并安装以下软件：
   - **MySQL 8.0** — 点击「安装」按钮，等待完成
   - **Nginx** — 点击「安装」按钮（可选，本地测试不需要）
5. 回到「**首页**」，点击 MySQL 的「**启动**」按钮
6. MySQL 默认密码为 `root`，可在「**数据库**」标签页中修改

> ✅ phpStudy 安装完 MySQL 就搞定了！接下来只需单独安装 Node.js 即可。

#### Node.js 一键安装

| 系统 | 下载地址 | 说明 |
|------|---------|------|
| **Windows 64位** | [**node-v20.18.1-x64.msi →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1-x64.msi) | 国内高速镜像 |
| **Windows 32位** | [**node-v20.18.1-x86.msi →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1-x86.msi) | 国内高速镜像 |
| **macOS (Intel)** | [**node-v20.18.1.pkg →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1.pkg) | 国内高速镜像 |
| **macOS (M芯片)** | [**node-v20.18.1-arm64.pkg →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1-arm64.pkg) | Apple M1/M2/M3 |
| **官网下载** | [**nodejs.org →**](https://nodejs.org/zh-cn) | 选择 LTS 版本 |

下载后双击安装包，**一路点击 Next / 下一步 直到完成**，无需修改任何选项。

> 💡 安装完成后验证：打开命令行（Win+R → 输入 cmd → 回车），输入 `node -v`，显示版本号即成功。

#### macOS 推荐：Homebrew 一键安装

```bash
# 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 一条命令安装 Node.js + MySQL
brew install node@20 mysql

# 启动 MySQL
brew services start mysql

# 设置 MySQL 密码
mysql_secure_installation
```

---

### ⚡ 方式一：一键部署（推荐新手）

#### 第一步：安装 Node.js

> 如果已通过上面的「方式零」安装了 Node.js，可跳过此步。

| 系统 | 下载地址 | 说明 |
|------|---------|------|
| **Windows** | [**Node.js v20 LTS (国内镜像) →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1-x64.msi) | 双击安装，一路 Next |
| **macOS** | [**Node.js v20 LTS (国内镜像) →**](https://npmmirror.com/mirrors/node/v20.18.1/node-v20.18.1.pkg) | 双击安装，一路继续 |
| **官网** | [**nodejs.org →**](https://nodejs.org/zh-cn) | 点击 LTS 下载 |

安装完成后验证：

```bash
node -v    # 应显示 v20.x.x
npm -v     # 应显示 10.x.x
```

**如何打开命令行：**
- **Windows**：按 `Win+R`，输入 `cmd`，回车
- **macOS**：打开「终端」应用（在启动台 → 其他 中）

#### 第二步：安装 MySQL 8.0

> 如果已通过 phpStudy 安装了 MySQL，可跳过此步。

| 系统 | 下载地址 | 说明 |
|------|---------|------|
| **Windows** | [**MySQL Installer →**](https://dev.mysql.com/downloads/installer/) | 下载较大的那个（约 300MB），选 Server only 安装 |
| **macOS** | [**MySQL DMG →**](https://dev.mysql.com/downloads/mysql/) | 选择 macOS 对应芯片的 DMG 安装包 |
| **简便替代** | [**phpStudy（小皮面板）→**](https://www.xp.cn/) | 🌟 自带 MySQL + 可视化管理，最适合新手 |

**Windows 安装要点：**
1. 双击安装包，选择 "Server only"
2. 点击 Execute → Next
3. Config Type 选 "Development Computer"
4. **设置 root 密码** — ⚠️ **请务必记住此密码！**
5. 勾选 "Start MySQL Server at System Startup"
6. 完成安装

**macOS 安装要点：**
1. 双击 DMG → 安装包 → 继续、安装
2. 安装最后一步会弹出设置 root 密码的窗口 — **请务必记住！**
3. 在「系统偏好设置」中找到 MySQL，确认已启动

#### 第三步：下载项目代码

**Git 克隆（推荐）：**

先安装 Git：[**Git 下载地址 →**](https://git-scm.com/downloads)

```bash
# Windows: 打开 cmd
cd D:\
git clone https://github.com/shushuhao01/crm-system.git CRM
cd CRM

# macOS:
cd ~
git clone https://github.com/shushuhao01/crm-system.git CRM
cd CRM
```

**或下载压缩包：** 前往 [**GitHub Releases →**](https://github.com/shushuhao01/crm-system/releases) 下载最新版本，或从购买成功页面下载。

解压到本地目录：
- **Windows 推荐路径**：`D:\CRM` 或 `C:\CRM`
- **macOS 推荐路径**：`~/CRM`

> ⚠️ 路径中不要包含中文、空格、特殊字符，否则可能导致构建失败。

#### 第四步：创建数据库

**方式A：使用 phpStudy 可视化操作（最简单）**

1. 打开 phpStudy → 点击「**数据库**」标签
2. 点击「**创建数据库**」
3. 数据库名输入：`crm_db`，字符集选 `utf8mb4`
4. 点击「确认」即可

**方式B：使用命令行**

```bash
# 打开 cmd，输入
mysql -u root -p
# 输入你安装时设置的密码，然后执行：
CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**方式C：使用可视化工具**

推荐免费工具 [**DBeaver →**](https://dbeaver.io/download/) 或 [**Navicat →**](https://www.navicat.com.cn/download/navicat-premium)

#### 第五步：配置环境变量

进入项目的 `backend` 目录，找到 `.env.example` 文件：

1. 复制一份 `.env.example`，重命名为 `.env`
2. 用记事本或 VS Code 打开 `.env` 文件
3. 修改以下关键配置（其他保持默认即可）：

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你安装MySQL时设置的密码
DB_DATABASE=crm_db
JWT_SECRET=请替换为一串随机字符（至少32位）
PORT=3000
```

> ⚠️ `DB_PASSWORD` 必须填写正确的 MySQL 密码，否则无法连接数据库。如果用 phpStudy 安装，默认密码是 `root`。

#### 第六步：执行一键部署脚本 ⚡

在项目根目录打开终端/命令行：

**Windows 用户：**
```bash
# 方法1: 直接双击项目根目录的 build-local.bat
# 方法2: 打开 cmd，进入项目目录执行
cd D:\CRM
build-local.bat
```

**macOS / Linux 用户：**
```bash
cd ~/CRM
chmod +x build-local.sh
./build-local.sh
```

脚本将自动完成：
- ✅ 检查 Node.js 和 npm 版本
- ✅ 配置国内 npm 镜像加速
- ✅ 安装前端依赖（约5-8分钟）
- ✅ 安装后端依赖（约3-5分钟）
- ✅ 构建前端项目（约5-10分钟）
- ✅ 启动后端服务

> ⏱ 首次部署预计 15-25 分钟（取决于网速），请耐心等待，不要关闭终端窗口。

#### 第七步：启动后端服务

构建完成后，启动后端：

```bash
cd backend
npm run build
node dist/server.js
```

或者使用 PM2（推荐，更稳定）：

```bash
npm install -g pm2
cd backend
pm2 start dist/server.js --name crm-backend
```

#### 第八步：访问系统并激活授权 🎉

**本机访问：**

打开浏览器访问 `http://localhost:3000`

**⭐ 局域网内其他成员访问：**

1. 先查看本机局域网 IP 地址：
   - **Windows**：打开 cmd，输入 `ipconfig`，找到 **IPv4 地址**（如 `192.168.1.100`）
   - **macOS**：打开终端，输入 `ifconfig | grep "inet "` 或在「系统偏好设置→网络」查看

2. 将 IP 告诉团队成员，他们在浏览器输入：`http://192.168.1.100:3000`（替换为你的实际 IP）

> ⚠️ 确保电脑防火墙允许 3000 端口通过。Windows 可在「控制面板→Windows 防火墙→高级设置→入站规则」中添加。

**激活授权：**

1. 在登录页面，点击左下角的 🔑 图标
2. 选择「私有部署」
3. 粘贴您的 **系统授权码**，点击「激活」
4. 系统自动创建管理员账号（**⚠️ 账号密码仅首次激活时显示，请立即保存！**）
5. 使用管理员账号登录，**登录后请立即修改密码！**

---

### 📝 方式二：手动部署

如果一键脚本出问题，可以手动执行：

```bash
# 先设置国内镜像加速
npm config set registry https://registry.npmmirror.com

# 安装前端依赖并构建
npm install
npm run build

# 安装后端依赖并构建
cd backend
npm install
npm run build

# 启动后端服务
node dist/server.js
```

> 💡 也可使用 PM2 管理进程：先安装 `npm install -g pm2`，然后 `pm2 start dist/server.js --name crm-backend`

---

### ❓ 常见问题

**Q: 提示 "node 不是内部或外部命令"**
A: Node.js 没有安装成功或没有添加到环境变量。请重新安装 Node.js，安装时勾选 "Add to PATH"。安装后**需要重新打开一个新的 cmd 窗口**。

**Q: 提示 "Access denied for user 'root'" 数据库连接失败**
A: 请检查 `backend/.env` 文件中的 `DB_PASSWORD` 是否与您安装 MySQL 时设置的密码一致。如果用 phpStudy 默认密码是 `root`。

**Q: npm install 速度很慢或报错**
A: 请先设置国内镜像：`npm config set registry https://registry.npmmirror.com`，然后删除 `node_modules` 文件夹重新执行 `npm install`。

**Q: 端口 3000 被占用**
A: 修改 `backend/.env` 中的 `PORT=3001`（或其他空闲端口），然后重新启动。

**Q: 局域网其他电脑无法访问**
A: ① 检查 Windows 防火墙是否放行了 3000 端口；② 确认两台电脑在同一局域网（同一个 WiFi 或同一个网段）；③ 确认使用的是本机的局域网 IP 地址（以 192.168 或 10. 开头），不是 `localhost`。

**Q: 完全不懂技术，能不能更简单？**
A: 推荐使用 [phpStudy](https://www.xp.cn/) 一键安装 MySQL 环境，再安装 Node.js（上方有直接下载链接），这两步搞定就可以执行部署脚本了。

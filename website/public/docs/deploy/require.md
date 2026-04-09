## 私有部署环境要求

在开始部署前，请确认您的环境满足以下要求。

---

### 🖥️ 本地电脑部署（体验测试用）

| 配置项 | 最低要求 |
|--------|---------|
| 操作系统 | Windows 10/11 或 macOS 12+ |
| 内存 | 4GB（推荐 8GB） |
| 磁盘空间 | 至少 2GB 可用空间 |
| 浏览器 | Chrome / Edge / Firefox 最新版 |

### 🖧 服务器部署（生产环境）

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|---------|
| CPU | 2核 | 4核及以上 |
| 内存 | 2GB | 4GB 及以上 |
| 硬盘 | 40GB SSD | 100GB SSD |
| 带宽 | 3Mbps | 5Mbps 及以上 |

> 💡 推荐云服务器厂商：[阿里云ECS](https://www.aliyun.com/minisite/goods)、[腾讯云轻量](https://cloud.tencent.com/act/pro/lighthouse)、[华为云ECS](https://www.huaweicloud.com/)，新用户通常有优惠活动。

---

### 操作系统支持

| 系统 | 版本 | 推荐度 |
|------|------|-------|
| **Ubuntu** | 22.04 / 20.04 LTS | ⭐⭐⭐ 强烈推荐 |
| **Debian** | 11 / 12 | ⭐⭐⭐ 推荐 |
| **CentOS** | 7.9 / 8.x | ⭐⭐ 可用 |
| **Windows** | 10/11 / Server 2019+ | ⭐ 仅限本地体验 |
| **macOS** | 12+ | ⭐ 仅限本地体验 |

---

### 必需软件

| 软件 | 版本要求 | 说明 | 下载地址 |
|------|---------|------|---------|
| **Node.js** | 20.x LTS | JavaScript 运行时 | [nodejs.org](https://nodejs.org/zh-cn) |
| **MySQL** | 8.0+ | 关系型数据库 | [mysql.com](https://dev.mysql.com/downloads/) |
| **Nginx** | 1.22+ | Web服务器/反向代理 | 通过包管理器安装 |
| **PM2** | 最新版 | Node.js 进程管理器 | `npm install -g pm2` |
| **Git** | 最新版 | 版本控制（推荐但可选） | [git-scm.com](https://git-scm.com/) |

> ⚠️ Node.js 推荐使用 **20.x LTS** 版本，不推荐使用奇数版本号（如 19.x、21.x）。

---

### 端口要求

| 端口 | 协议 | 用途 | 必须 |
|------|------|------|------|
| 22 | TCP | SSH 远程连接 | ✅ |
| 80 | TCP | HTTP 网站访问 | ✅ |
| 443 | TCP | HTTPS 网站访问 | 推荐 |
| 3000 | TCP | 后端 API 服务 | 仅开发调试需要 |
| 3306 | TCP | MySQL 数据库 | ❌ 不要对外开放 |
| 8888 | TCP | 宝塔面板（如使用） | 仅宝塔需要 |

> ⚠️ **安全提示**：MySQL 3306 端口不要对外开放，只允许本地访问即可。

---

### 网络要求

- 服务器需能访问外网（用于授权验证、物流查询等）
- 建议配置已备案的域名和 SSL 证书
- 如需 APP 使用，服务器必须有公网 IP 或域名

---

准备就绪后，请选择部署方式开始安装：

- [🖥️ 本地电脑部署](/docs/deploy/local)
- [🚀 宝塔面板部署](/docs/deploy/bt)（推荐）
- [🐧 纯Linux部署](/docs/deploy/linux)

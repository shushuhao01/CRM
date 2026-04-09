## ⚙️ 配置文件说明

私有部署需要编辑后端目录下的 `.env` 配置文件。

---

### 配置文件位置

配置文件位于项目的 `backend/.env`，基于 `backend/.env.example` 模板创建。

```bash
cd 项目目录/backend
cp .env.example .env
nano .env  # 或用其他编辑器打开
```

---

### 🗄️ 数据库配置（必须修改）

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=你的数据库密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4
```

| 配置项 | 说明 |
|--------|------|
| DB_HOST | 数据库地址，本地部署填 `localhost` |
| DB_PORT | 数据库端口，MySQL 默认 `3306` |
| DB_USERNAME | 数据库用户名 |
| DB_PASSWORD | 数据库密码 |
| DB_DATABASE | 数据库名称 |
| DB_CHARSET | 字符集，建议 `utf8mb4` 支持完整 Unicode |

### 🔐 应用安全配置（必须修改）

```
PORT=3000
JWT_SECRET=用 openssl rand -hex 32 生成随机字符串
JWT_EXPIRES_IN=7d
```

| 配置项 | 说明 |
|--------|------|
| PORT | 后端服务端口，默认 3000 |
| JWT_SECRET | **⚠️ 必须修改！** 用于加密用户登录令牌的密钥，至少 32 位随机字符 |
| JWT_EXPIRES_IN | 登录令牌有效期，`7d` 表示7天 |

> ⚠️ **JWT_SECRET 绝不能使用默认值或简单字符串！** 请执行 `openssl rand -hex 32` 生成。

### 📁 文件存储配置

**本地存储**（默认）：
```
STORAGE_TYPE=local
UPLOAD_DIR=uploads
```

**阿里云 OSS**（推荐生产环境使用）：
```
STORAGE_TYPE=oss
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-guangzhou
```

### 📱 短信配置（可选）

如需短信验证码、通知等功能：

```
SMS_ACCESS_KEY_ID=your_key
SMS_ACCESS_KEY_SECRET=your_secret
SMS_SIGN_NAME=云客CRM
SMS_TEMPLATE_CODE=SMS_xxxxx
```

### 📞 电销配置（可选）

如需使用电销外呼功能，需配置呼叫中心参数，请联系技术支持获取配置指导。

### 🌐 部署模式配置

```
DEPLOY_MODE=private
ADMIN_API_URL=https://admin.yourdomain.com/api/v1/admin
```

| 配置项 | 说明 |
|--------|------|
| DEPLOY_MODE | 部署模式，私有部署填 `private` |
| ADMIN_API_URL | 平台管理后台地址，用于授权验证和版本检查 |

---

### 配置修改后

修改 `.env` 配置文件后需要重启服务才能生效：

```bash
# 使用 PM2
pm2 restart crm-backend

# 或者重启全部
pm2 restart all
```

> 💡 可以使用 `pm2 logs` 查看重启后是否有报错。

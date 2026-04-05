## 配置文件说明

私有部署需要编辑后端目录下的 `.env` 配置文件。

### 数据库配置

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crm
```

### 应用配置

```
APP_PORT=3000
JWT_SECRET=your_jwt_secret_key
APP_URL=https://your-domain.com
```

### 存储配置

支持本地存储和阿里云OSS云存储：

**本地存储**（默认）：
```
STORAGE_TYPE=local
UPLOAD_DIR=uploads
```

**阿里云OSS**：
```
STORAGE_TYPE=oss
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-guangzhou
```

### 短信配置（可选）

```
SMS_ACCESS_KEY_ID=your_key
SMS_ACCESS_KEY_SECRET=your_secret
SMS_SIGN_NAME=云客CRM
SMS_TEMPLATE_CODE=SMS_xxxxx
```

### 电销配置（可选）

如需使用电销外呼功能，需要配置呼叫中心相关参数，请联系技术支持获取配置指导。

> 💡 配置文件修改后需要重启服务才能生效：`pm2 restart all`

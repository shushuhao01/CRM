# CRM系统后端API

基于Node.js + TypeScript + Express + TypeORM + MySQL的CRM系统后端API服务。

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- MySQL 8.0+
- npm 8.0+

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量配置文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置数据库连接等信息：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=your_password
DB_DATABASE=crm_system

# JWT密钥
JWT_SECRET=your_jwt_secret_key
```

### 数据库初始化

1. 创建数据库：
```sql
CREATE DATABASE crm_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 导入初始化SQL（可选）：
```bash
mysql -u crm_user -p crm_system < ../database/bt_panel_setup.sql
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start

# 使用PM2启动
npm run start:prod
```

## 📁 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # 数据库配置
│   │   ├── jwt.ts       # JWT配置
│   │   └── logger.ts    # 日志配置
│   ├── controllers/     # 控制器
│   │   └── UserController.ts
│   ├── entities/        # 数据库实体
│   │   ├── User.ts
│   │   ├── Customer.ts
│   │   ├── Product.ts
│   │   └── ...
│   ├── middleware/      # 中间件
│   │   ├── auth.ts      # 认证中间件
│   │   ├── errorHandler.ts # 错误处理
│   │   └── validation.ts    # 请求验证
│   ├── routes/          # 路由
│   │   ├── auth.ts      # 认证路由
│   │   ├── users.ts     # 用户管理
│   │   └── ...
│   └── app.ts           # 应用入口
├── logs/                # 日志文件
├── uploads/             # 上传文件
├── package.json
├── tsconfig.json
└── ecosystem.config.js  # PM2配置
```

## 🔌 API接口

### 认证相关

- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新令牌
- `GET /api/v1/auth/me` - 获取当前用户信息
- `PUT /api/v1/auth/me` - 更新用户信息
- `PUT /api/v1/auth/password` - 修改密码
- `POST /api/v1/auth/logout` - 用户登出

### 用户管理

- `GET /api/v1/users` - 获取用户列表（管理员）

### 其他模块

- 客户管理：`/api/v1/customers`
- 产品管理：`/api/v1/products`
- 订单管理：`/api/v1/orders`
- 系统管理：`/api/v1/system`

## 🔐 认证机制

使用JWT (JSON Web Token) 进行身份认证：

1. 用户登录成功后获得访问令牌(access token)和刷新令牌(refresh token)
2. 访问令牌用于API请求认证，有效期7天
3. 刷新令牌用于获取新的访问令牌，有效期30天
4. 请求头格式：`Authorization: Bearer <access_token>`

## 🛡️ 安全特性

- **密码加密**：使用bcrypt进行密码哈希
- **JWT认证**：基于令牌的无状态认证
- **请求限流**：防止API滥用
- **CORS配置**：跨域请求控制
- **Helmet安全头**：HTTP安全头设置
- **输入验证**：使用Joi进行请求数据验证
- **SQL注入防护**：TypeORM参数化查询
- **错误处理**：统一错误响应格式

## 📊 日志系统

使用Winston进行日志管理：

- **访问日志**：记录所有HTTP请求
- **错误日志**：记录应用错误和异常
- **操作日志**：记录用户操作行为
- **性能日志**：记录性能指标

日志文件位置：`logs/` 目录

## 🚀 部署指南

### 宝塔面板部署

1. **环境准备**
   - 安装Node.js 18+
   - 安装MySQL 8.0+
   - 安装PM2

2. **代码部署**
   ```bash
   # 上传代码到服务器
   git clone <repository>
   cd backend
   npm install
   npm run build
   ```

3. **数据库配置**
   - 创建数据库和用户
   - 导入初始化SQL
   - 配置环境变量

4. **启动服务**
   ```bash
   npm run start:prod
   ```

5. **Nginx反向代理**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }
   ```

### Docker部署（可选）

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## 🔧 开发指南

### 添加新的API端点

1. 创建实体模型（如需要）
2. 创建控制器方法
3. 添加路由定义
4. 添加请求验证规则
5. 更新API文档

### 数据库迁移

```bash
# 生成迁移文件
npm run typeorm migration:generate -- -n MigrationName

# 运行迁移
npm run typeorm migration:run

# 回滚迁移
npm run typeorm migration:revert
```

### 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch
```

## 📝 API响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License
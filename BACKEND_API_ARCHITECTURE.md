# CRM系统后端API架构设计

## 技术栈选择

### 推荐：Node.js + Express + TypeScript
```
理由：
- 与前端Vue3技术栈统一
- TypeScript类型安全
- 丰富的生态系统
- 部署简单，宝塔面板支持
```

### 替代方案：
- **PHP + Laravel**：宝塔面板原生支持，学习成本低
- **Python + FastAPI**：性能优秀，文档自动生成
- **Java + Spring Boot**：企业级，但资源消耗大

## 项目结构设计

```
crm-backend/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── product.controller.ts
│   │   ├── order.controller.ts
│   │   └── system.controller.ts
│   ├── services/             # 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── customer.service.ts
│   │   ├── product.service.ts
│   │   ├── order.service.ts
│   │   └── system.service.ts
│   ├── models/               # 数据模型层
│   │   ├── User.ts
│   │   ├── Customer.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── index.ts
│   ├── middleware/           # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/               # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── customer.routes.ts
│   │   ├── product.routes.ts
│   │   ├── order.routes.ts
│   │   └── index.ts
│   ├── utils/                # 工具函数
│   │   ├── database.ts
│   │   ├── jwt.ts
│   │   ├── encryption.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── config/               # 配置文件
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   └── app.ts                # 应用入口
├── tests/                    # 测试文件
├── docs/                     # API文档
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## API接口设计

### 1. 认证相关 (/api/auth)

```typescript
// 用户登录
POST /api/auth/login
{
  "username": "string",
  "password": "string"
}
Response: {
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "username": "admin",
      "realName": "管理员",
      "role": "admin",
      "department": "销售部"
    }
  }
}

// 用户注册
POST /api/auth/register
{
  "username": "string",
  "password": "string",
  "email": "string",
  "realName": "string",
  "departmentId": 1
}

// 刷新Token
POST /api/auth/refresh
Headers: { "Authorization": "Bearer token" }

// 用户登出
POST /api/auth/logout
Headers: { "Authorization": "Bearer token" }

// 获取当前用户信息
GET /api/auth/profile
Headers: { "Authorization": "Bearer token" }
```

### 2. 用户管理 (/api/users)

```typescript
// 获取用户列表
GET /api/users?page=1&limit=20&search=keyword&department=1&role=sales
Headers: { "Authorization": "Bearer token" }

// 创建用户
POST /api/users
{
  "username": "string",
  "password": "string",
  "email": "string",
  "realName": "string",
  "phone": "string",
  "role": "sales",
  "departmentId": 1
}

// 更新用户
PUT /api/users/:id
{
  "email": "string",
  "realName": "string",
  "phone": "string",
  "role": "sales",
  "departmentId": 1,
  "status": "active"
}

// 删除用户
DELETE /api/users/:id

// 重置密码
POST /api/users/:id/reset-password
{
  "newPassword": "string"
}
```

### 3. 客户管理 (/api/customers)

```typescript
// 获取客户列表
GET /api/customers?page=1&limit=20&search=keyword&level=gold&status=active&assignedTo=1
Headers: { "Authorization": "Bearer token" }

// 创建客户
POST /api/customers
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "address": "string",
  "company": "string",
  "industry": "string",
  "source": "string",
  "level": "normal",
  "tags": ["tag1", "tag2"],
  "remark": "string",
  "assignedTo": 1
}

// 更新客户
PUT /api/customers/:id
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "address": "string",
  "company": "string",
  "industry": "string",
  "level": "gold",
  "tags": ["tag1", "tag2"],
  "remark": "string",
  "assignedTo": 1,
  "status": "active"
}

// 删除客户
DELETE /api/customers/:id

// 获取客户详情
GET /api/customers/:id

// 获取客户订单历史
GET /api/customers/:id/orders

// 分配客户
POST /api/customers/:id/assign
{
  "assignedTo": 1
}
```

### 4. 产品管理 (/api/products)

```typescript
// 获取产品列表
GET /api/products?page=1&limit=20&search=keyword&categoryId=1&status=active
Headers: { "Authorization": "Bearer token" }

// 创建产品
POST /api/products
{
  "name": "string",
  "productCode": "string",
  "categoryId": 1,
  "description": "string",
  "price": 100.00,
  "costPrice": 80.00,
  "stockQuantity": 100,
  "minStock": 10,
  "unit": "件",
  "specifications": {},
  "images": ["url1", "url2"]
}

// 更新产品
PUT /api/products/:id

// 删除产品
DELETE /api/products/:id

// 获取产品详情
GET /api/products/:id

// 产品分类管理
GET /api/products/categories
POST /api/products/categories
PUT /api/products/categories/:id
DELETE /api/products/categories/:id

// 库存管理
POST /api/products/:id/stock
{
  "type": "in|out",
  "quantity": 10,
  "reason": "string"
}
```

### 5. 订单管理 (/api/orders)

```typescript
// 获取订单列表
GET /api/orders?page=1&limit=20&search=keyword&status=pending&customerId=1&salesPersonId=1&startDate=2024-01-01&endDate=2024-12-31
Headers: { "Authorization": "Bearer token" }

// 创建订单
POST /api/orders
{
  "customerId": 1,
  "customerName": "string",
  "customerPhone": "string",
  "products": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 100.00
    }
  ],
  "subtotal": 200.00,
  "discount": 10.00,
  "totalAmount": 190.00,
  "receiverName": "string",
  "receiverPhone": "string",
  "receiverAddress": "string",
  "remark": "string"
}

// 更新订单
PUT /api/orders/:id

// 删除订单
DELETE /api/orders/:id

// 获取订单详情
GET /api/orders/:id

// 订单审核
POST /api/orders/:id/audit
{
  "action": "approve|reject",
  "remark": "string"
}

// 订单发货
POST /api/orders/:id/ship
{
  "expressCompany": "string",
  "trackingNumber": "string"
}

// 订单状态更新
POST /api/orders/:id/status
{
  "status": "shipped",
  "remark": "string"
}

// 物流跟踪
GET /api/orders/:id/logistics
POST /api/orders/:id/logistics
{
  "location": "string",
  "description": "string",
  "logisticsStatus": "in_transit",
  "trackedAt": "2024-01-01T10:00:00Z"
}

// 订单统计
GET /api/orders/statistics?startDate=2024-01-01&endDate=2024-12-31&groupBy=day|month|year
```

### 6. 系统管理 (/api/system)

```typescript
// 部门管理
GET /api/system/departments
POST /api/system/departments
PUT /api/system/departments/:id
DELETE /api/system/departments/:id

// 系统配置
GET /api/system/configs
POST /api/system/configs
PUT /api/system/configs/:key

// 操作日志
GET /api/system/logs?page=1&limit=20&userId=1&action=create&resourceType=order&startDate=2024-01-01

// 数据统计
GET /api/system/statistics/dashboard
GET /api/system/statistics/sales?period=month
GET /api/system/statistics/customers?period=month

// 数据导出
POST /api/system/export/customers
POST /api/system/export/orders
POST /api/system/export/products

// 数据备份
POST /api/system/backup
GET /api/system/backup/list
POST /api/system/backup/restore/:id

// 文件上传
POST /api/system/upload
```

## 数据库连接配置

### 使用TypeORM

```typescript
// src/config/database.config.ts
import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'crm_system',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Customer, Product, Order],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});
```

## 认证和授权

### JWT配置

```typescript
// src/config/jwt.config.ts
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

// src/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '访问令牌缺失' });
  }

  jwt.verify(token, jwtConfig.secret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};
```

## 错误处理

```typescript
// src/middleware/error.middleware.ts
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
};
```

## 数据验证

```typescript
// src/utils/validation.ts
import Joi from 'joi';

export const customerSchema = Joi.object({
  name: Joi.string().required().max(100),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
  email: Joi.string().email(),
  address: Joi.string().max(500),
  company: Joi.string().max(200),
  industry: Joi.string().max(100),
  level: Joi.string().valid('normal', 'silver', 'gold'),
  tags: Joi.array().items(Joi.string()),
  remark: Joi.string().max(1000),
  assignedTo: Joi.number().integer().positive()
});

export const orderSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  products: Joi.array().items(Joi.object({
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().required(),
    price: Joi.number().positive().required()
  })).min(1).required(),
  receiverName: Joi.string().required().max(100),
  receiverPhone: Joi.string().required().pattern(/^1[3-9]\d{9}$/),
  receiverAddress: Joi.string().required().max(500),
  remark: Joi.string().max(1000)
});
```

## 部署配置

### PM2配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crm-api',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Nginx配置

```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 开发环境配置

### package.json

```json
{
  "name": "crm-backend",
  "version": "1.0.0",
  "description": "CRM系统后端API",
  "main": "dist/app.js",
  "scripts": {
    "dev": "nodemon src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "migrate": "typeorm migration:run",
    "seed": "ts-node src/seeds/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "typeorm": "^0.3.17",
    "mysql2": "^3.6.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/node": "^20.4.5",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcryptjs": "^2.4.2",
    "@types/cors": "^2.8.13",
    "@types/morgan": "^1.9.4",
    "@types/multer": "^1.4.7",
    "typescript": "^5.1.6",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "jest": "^29.6.1",
    "@types/jest": "^29.5.3"
  }
}
```

这个后端架构设计提供了：

1. **完整的RESTful API**
2. **JWT认证和授权**
3. **数据验证和错误处理**
4. **TypeORM数据库操作**
5. **角色权限控制**
6. **操作日志记录**
7. **文件上传处理**
8. **数据统计和导出**
9. **生产环境部署配置**

您可以根据实际需求调整和扩展这个架构。
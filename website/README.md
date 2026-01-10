# 云客CRM官网

## 项目说明

这是云客CRM的官方网站，用于产品介绍、套餐展示、用户注册和购买。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Vue Router
- Pinia
- SCSS

## 启动方式

```bash
# 进入官网目录
cd website

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 页面结构

- `/` - 首页
- `/features` - 功能特性
- `/pricing` - 价格方案
- `/solutions` - 解决方案
- `/about` - 关于我们
- `/docs` - 帮助文档
- `/register` - 注册购买
- `/pay-success` - 支付成功

## 部署说明

1. 构建生产版本：`npm run build`
2. 将 `dist` 目录部署到 Web 服务器
3. 配置 Nginx 反向代理

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name www.yunke-crm.com;
    
    root /var/www/website/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 与后端对接

官网的注册、支付等功能需要对接后端 API：

- `POST /api/v1/website/register` - 用户注册
- `POST /api/v1/website/send-code` - 发送验证码
- `POST /api/v1/website/create-order` - 创建订单
- `POST /api/v1/website/pay` - 发起支付
- `POST /api/v1/website/pay-callback` - 支付回调

这些 API 需要在后端实现。

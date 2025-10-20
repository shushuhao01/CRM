# 🚀 宝塔面板 Node.js 16 构建解决方案

## 问题描述

在宝塔面板环境下，由于 Node.js 版本限制（通常为 16.20.2），直接使用标准 Vite 构建会遇到以下问题：

1. **版本兼容性错误**：`Vite requires Node.js version 20.19+ or 22.12+`
2. **加密函数错误**：`crypto.getRandomValues is not a function`
3. **构建失败**：无法正常完成前端构建

## 解决方案

### 1. 专用配置文件

创建了 `vite.config.node16.ts` 配置文件，专门适配 Node.js 16 环境：

```typescript
// 关键配置项
define: {
  global: 'globalThis',  // 修复 crypto.getRandomValues 问题
},
build: {
  target: 'es2015',      // 兼容较老的浏览器
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    output: {
      manualChunks: {
        // 优化分包策略
      }
    }
  }
}
```

### 2. 专用构建脚本

#### Linux/宝塔面板环境
```bash
# 使用 build-node16.sh
chmod +x build-node16.sh
./build-node16.sh
```

#### Windows 开发环境
```cmd
# 使用 build-node16.bat
build-node16.bat
```

#### NPM 脚本
```bash
npm run build-node16
```

### 3. 环境变量设置

构建脚本会自动设置以下环境变量：
- `NODE_OPTIONS="--max-old-space-size=4096"` - 增加内存限制
- `VITE_LEGACY_BUILD=true` - 启用兼容模式

## 使用步骤

### 方法一：使用专用脚本（推荐）

1. **上传文件到宝塔面板**
   ```bash
   # 确保所有文件已上传，包括新的构建脚本
   ```

2. **执行构建**
   ```bash
   cd /www/wwwroot/your-domain
   chmod +x build-node16.sh
   ./build-node16.sh
   ```

### 方法二：使用 NPM 脚本

1. **安装依赖**
   ```bash
   npm install
   ```

2. **执行构建**
   ```bash
   npm run build-node16
   ```

### 方法三：直接使用 Vite

```bash
npx vite build --config vite.config.node16.ts
```

## 构建结果

成功构建后会生成 `dist` 目录，包含：
- 优化的 JavaScript 文件
- CSS 样式文件
- 静态资源文件
- 入口 HTML 文件

## 部署配置

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/your-domain/dist;
    index index.html;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 故障排除

### 常见问题

1. **权限问题**
   ```bash
   chmod +x build-node16.sh
   ```

2. **内存不足**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=8192"
   ```

3. **依赖问题**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **磁盘空间不足**
   ```bash
   df -h  # 检查磁盘空间
   ```

### 验证构建

```bash
# 检查构建文件
ls -la dist/
du -sh dist/

# 检查文件完整性
find dist/ -name "*.js" | wc -l
find dist/ -name "*.css" | wc -l
```

## 性能优化

构建配置已包含以下优化：
- ✅ 代码分割和懒加载
- ✅ 资源压缩和混淆
- ✅ Tree-shaking 去除无用代码
- ✅ 分包策略优化
- ✅ 兼容性处理

## 更新说明

- **v1.0**: 初始版本，解决基本兼容性问题
- **v1.1**: 优化构建性能，添加详细日志
- **v1.2**: 完善错误处理，添加自动检测

---

## 技术支持

如遇到问题，请检查：
1. Node.js 版本是否为 16.x
2. 磁盘空间是否充足
3. 网络连接是否正常
4. 依赖是否完整安装

**构建成功标志**：看到 `✓ built in XXs` 消息表示构建完成。
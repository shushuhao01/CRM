# 宝塔面板 Node.js 16 兼容部署指南

## 问题说明

宝塔面板默认使用 Node.js 16.20.2，但最新版本的 Vite (5.4.8) 要求 Node.js 20.19+ 或 22.12+，导致构建失败。

## 解决方案

### 1. 使用兼容版本的依赖

已将以下依赖降级以兼容 Node.js 16：
- `vite`: `^5.4.8` → `^4.5.3`
- `@vitejs/plugin-vue`: `^5.1.4` → `^4.6.2`

### 2. 宝塔面板部署步骤

#### 步骤1：安装依赖
```bash
# 在宝塔面板终端中执行
cd /www/wwwroot/your-domain
npm install
```

#### 步骤2：使用兼容的构建命令
```bash
# 方法1：使用专门的宝塔配置文件
npm run build-bt

# 方法2：使用简化构建（推荐）
npm run build-simple

# 方法3：直接使用vite构建
npx vite build --mode production
```

#### 步骤3：验证构建结果
构建成功后，会在 `dist` 目录生成以下文件：
- `index.html`
- `assets/` 目录（包含 CSS 和 JS 文件）

### 3. 常见错误解决

#### 错误1：crypto.getRandomValues is not a function
**解决方案**：已在 `vite.config.ts` 中添加 polyfill 配置

#### 错误2：Node.js 版本不兼容
**解决方案**：使用降级后的 Vite 4.5.3 版本

#### 错误3：构建内存不足
**解决方案**：在宝塔面板中增加 Node.js 内存限制
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build-simple
```

### 4. 宝塔面板配置

#### 网站设置
1. **运行目录**：设置为 `/dist`
2. **默认文档**：`index.html`
3. **伪静态规则**：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### 反向代理（如果需要）
如果后端API在不同端口，配置反向代理：
```nginx
location /api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 5. 部署检查清单

- [ ] Node.js 版本确认（16.20.2 可用）
- [ ] 依赖安装成功
- [ ] 构建命令执行成功
- [ ] dist 目录生成
- [ ] 网站运行目录设置正确
- [ ] 伪静态规则配置
- [ ] 后端API连接正常

### 6. 故障排除

如果仍然遇到问题，请按以下步骤排查：

1. **清理缓存**：
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **检查Node.js版本**：
```bash
node --version
npm --version
```

3. **使用最简构建**：
```bash
npx vite build --mode production --target es2015
```

4. **查看详细错误日志**：
```bash
npm run build-simple --verbose
```

## 联系支持

如果按照此指南仍然无法解决问题，请提供：
1. 完整的错误日志
2. Node.js 版本信息
3. 宝塔面板版本信息
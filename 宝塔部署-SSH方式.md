# 宝塔部署 - SSH 方式（推荐）

## 步骤 1：SSH 连接到服务器

### 使用宝塔面板的终端
1. 登录宝塔面板
2. 点击左侧菜单 → **终端**
3. 或者使用 SSH 客户端（如 PuTTY、Xshell）连接

### 使用 SSH 客户端
```bash
ssh root@你的服务器IP
# 输入密码
```

---

## 步骤 2：安装 Git（如果未安装）

```bash
# CentOS/RHEL
yum install -y git

# Ubuntu/Debian
apt-get install -y git

# 验证安装
git --version
```

---

## 步骤 3：克隆项目

```bash
# 进入网站目录
cd /www/wwwroot

# 克隆项目
git clone https://github.com/shushuhao01/CRM.git

# 进入项目目录
cd CRM

# 查看文件
ls -la
```

你应该能看到所有文件：
```
backend/
src/
public/
database/
deploy.sh
deploy.ps1
package.json
README.md
用户登录说明.md
部署指南.md
...
```

---

## 步骤 4：一键部署

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署脚本
./deploy.sh
```

脚本会自动：
1. ✅ 检查 Node.js 版本
2. ✅ 安装前端依赖
3. ✅ 安装后端依赖
4. ✅ 构建前端
5. ✅ 构建后端
6. ✅ 启动后端服务

---

## 步骤 5：配置 Nginx

### 5.1 创建网站
1. 宝塔面板 → 网站 → 添加站点
2. 填写：
   - 域名：`你的域名.com`
   - 根目录：`/www/wwwroot/CRM/dist`
   - PHP：纯静态

### 5.2 配置反向代理
1. 点击网站 → 设置 → 反向代理
2. 添加反向代理：
   - 代理名称：`api`
   - 目标 URL：`http://127.0.0.1:3000`

### 5.3 修改配置文件
点击"配置文件"，添加：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 步骤 6：访问测试

访问：`http://你的域名.com`

测试账号：
- 用户名：`admin`
- 密码：`admin123`

---

## 常见问题

### Q: 提示 "git: command not found"
```bash
# 安装 Git
yum install -y git  # CentOS
apt-get install -y git  # Ubuntu
```

### Q: 提示 "Permission denied"
```bash
# 给予权限
chmod +x deploy.sh
```

### Q: 克隆速度慢
```bash
# 使用国内镜像（可选）
git clone https://gitee.com/mirrors/CRM.git
# 或使用 GitHub 加速
git clone https://ghproxy.com/https://github.com/shushuhao01/CRM.git
```

### Q: 如何更新代码？
```bash
cd /www/wwwroot/CRM
git pull
./deploy.sh
```

---

## 为什么不能用"从URL获取"？

宝塔的"从URL获取"功能只能下载**单个文件**，不能克隆整个 Git 仓库。

Git 仓库包含：
- 所有源代码文件
- 目录结构
- 版本历史
- 配置文件

必须使用 `git clone` 命令才能完整获取。

---

## 快速命令汇总

```bash
# 一键部署（复制粘贴即可）
cd /www/wwwroot && \
git clone https://github.com/shushuhao01/CRM.git && \
cd CRM && \
chmod +x deploy.sh && \
./deploy.sh
```

---

## 视频教程

如果还有疑问，可以参考这些步骤：

1. **SSH 连接** → 宝塔面板左侧"终端"
2. **执行命令** → 复制上面的一键部署命令
3. **配置 Nginx** → 按照步骤 5 操作
4. **访问测试** → 打开浏览器访问域名

---

## 技术支持

如遇问题，请提供：
- 错误信息截图
- 执行的命令
- 服务器系统版本

GitHub Issues: https://github.com/shushuhao01/CRM/issues

<template>
  <div class="help-content">
    <h1>Nginx配置指南</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Connection /></el-icon>
        <div class="intro-text">
          <p>Nginx是云客CRM系统的Web服务器和反向代理，负责静态资源服务、API代理、WebSocket代理和SSL加密等功能。正确配置Nginx是系统稳定运行的关键。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Download /></el-icon> 安装Nginx</h2>

      <h3>CentOS / RHEL</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('centos-install')">复制</el-button>
        </div>
        <pre id="centos-install"># 安装EPEL源
yum install -y epel-release

# 安装Nginx
yum install -y nginx

# 启动Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 检查状态
systemctl status nginx</pre>
      </div>

      <h3>Ubuntu / Debian</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('ubuntu-install')">复制</el-button>
        </div>
        <pre id="ubuntu-install"># 更新软件源
apt-get update

# 安装Nginx
apt-get install -y nginx

# 启动Nginx
systemctl start nginx

# 设置开机自启
systemctl enable nginx

# 检查状态
systemctl status nginx</pre>
      </div>

      <h3>宝塔面板安装</h3>
      <div class="step-list">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>进入软件商店</h4>
            <p>登录宝塔面板，点击左侧菜单"软件商店"</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>搜索Nginx</h4>
            <p>在搜索框输入"nginx"，找到Nginx软件</p>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>安装Nginx</h4>
            <p>点击"安装"按钮，选择版本（推荐1.22+），等待安装完成</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Document /></el-icon> 基础配置</h2>

      <h3>站点配置文件</h3>
      <p>创建站点配置文件 <code>/etc/nginx/conf.d/crm.conf</code>：</p>

      <div class="code-block">
        <div class="code-header">
          <span>Nginx配置</span>
          <el-button size="small" text @click="copyCode('nginx-basic')">复制</el-button>
        </div>
        <pre id="nginx-basic">server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    # 前端静态文件
    root /www/wwwroot/crm/dist;
    index index.html;

    # 前端路由支持（Vue Router history模式）
    location / {
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket代理（重要！）
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket超时设置
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # 文件上传大小限制
    client_max_body_size 100M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml
               application/xml+rss image/svg+xml;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}</pre>
      </div>
    </section>

    <section>
      <h2><el-icon><Lock /></el-icon> SSL/HTTPS配置</h2>

      <div class="warning-box">
        <el-icon><WarningFilled /></el-icon>
        <div>
          <strong>强烈建议</strong>
          <p>生产环境必须启用HTTPS，以保护用户数据安全和登录凭证传输。</p>
        </div>
      </div>

      <h3>宝塔面板完整配置（推荐）</h3>
      <p>以下是经过生产环境验证的完整Nginx配置，适用于宝塔面板部署。只需修改域名即可直接使用：</p>

      <div class="tip-box">
        <el-icon><WarningFilled /></el-icon>
        <span>请将配置中的 <code>your-domain.com</code> 替换为您的实际域名</span>
      </div>

      <div class="code-block">
        <div class="code-header">
          <span>宝塔面板 Nginx 完整配置</span>
          <el-button size="small" text @click="copyCode('bt-nginx-full')">复制</el-button>
        </div>
        <pre id="bt-nginx-full">server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;  # ← 修改为您的域名
    index index.html index.htm;
    root /www/wwwroot/your-domain.com/dist;  # ← 修改为您的项目路径

    # 宝塔面板扩展配置（如有）
    # include /www/server/panel/vhost/nginx/extension/your-domain.com/*.conf;

    # SSL证书申请验证（宝塔自动生成）
    # include /www/server/panel/vhost/nginx/well-known/your-domain.com.conf;

    #SSL-START SSL相关配置
    # HTTP强制跳转HTTPS
    set $isRedcert 1;
    if ($server_port != 443) {
        set $isRedcert 2;
    }
    if ( $uri ~ /\.well-known/ ) {
        set $isRedcert 1;
    }
    if ($isRedcert != 1) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }

    # SSL证书路径（宝塔自动申请的证书路径）
    ssl_certificate    /www/server/panel/vhost/cert/your-domain.com/fullchain.pem;  # ← 修改域名
    ssl_certificate_key    /www/server/panel/vhost/cert/your-domain.com/privkey.pem;  # ← 修改域名

    # SSL安全配置
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    error_page 497  https://$host$request_uri;
    #SSL-END

    # 错误页配置 - 支持Vue Router history模式
    error_page 404 /index.html;

    # 前端路由支持 - Vue Router history 模式
    location / {
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 静态文件服务 - 支持 /uploads 路径
    location ^~ /uploads/ {
        alias /www/wwwroot/your-domain.com/backend/uploads/;  # ← 修改域名
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    # 静态文件服务 - 兼容旧的 /api/v1/uploads 路径
    location ^~ /api/v1/uploads/ {
        alias /www/wwwroot/your-domain.com/backend/uploads/;  # ← 修改域名
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    # WebSocket - Socket.IO 专用路径（Web端实时通知）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 禁用缓冲
        proxy_buffering off;
        proxy_cache off;
    }

    # APP端 WebSocket 代理
    location /ws/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 3600s;  # APP长连接需要更长超时

        proxy_buffering off;
        proxy_cache off;
    }

    # API 反向代理配置
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 禁止访问的文件或目录
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md) {
        return 404;
    }

    # SSL证书验证目录
    location ~ \.well-known {
        allow all;
    }

    # 禁止在证书验证目录放入敏感文件
    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    # 日志配置（修改为您的域名）
    access_log  /www/wwwlogs/your-domain.com.log;
    error_log  /www/wwwlogs/your-domain.com.error.log;
}</pre>
      </div>

      <h3>配置要点说明</h3>
      <div class="config-notes">
        <div class="note-item">
          <span class="note-label">域名配置</span>
          <span class="note-desc">将所有 <code>your-domain.com</code> 替换为您的实际域名</span>
        </div>
        <div class="note-item">
          <span class="note-label">项目路径</span>
          <span class="note-desc">确保 <code>root</code> 指向前端构建后的 dist 目录</span>
        </div>
        <div class="note-item">
          <span class="note-label">SSL证书</span>
          <span class="note-desc">使用宝塔面板申请免费SSL证书，路径会自动配置</span>
        </div>
        <div class="note-item">
          <span class="note-label">WebSocket</span>
          <span class="note-desc">配置了两个WebSocket路径：/socket.io/（Web端）和 /ws/（APP端）</span>
        </div>
        <div class="note-item">
          <span class="note-label">文件上传</span>
          <span class="note-desc">uploads目录配置了两个访问路径，兼容新旧版本</span>
        </div>
      </div>

      <h3>获取SSL证书</h3>
      <div class="info-cards">
        <div class="info-card">
          <h4>免费证书</h4>
          <ul>
            <li>Let's Encrypt（推荐）</li>
            <li>阿里云免费证书</li>
            <li>腾讯云免费证书</li>
          </ul>
        </div>
        <div class="info-card">
          <h4>付费证书</h4>
          <ul>
            <li>DigiCert</li>
            <li>GlobalSign</li>
            <li>Comodo</li>
          </ul>
        </div>
      </div>

      <h3>Let's Encrypt自动申请</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('certbot')">复制</el-button>
        </div>
        <pre id="certbot"># 安装Certbot
yum install -y certbot python3-certbot-nginx  # CentOS
# apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 自动申请并配置证书
certbot --nginx -d your-domain.com

# 设置自动续期
echo "0 0,12 * * * root certbot renew --quiet" >> /etc/crontab</pre>
      </div>

      <h3>HTTPS完整配置</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Nginx配置</span>
          <el-button size="small" text @click="copyCode('nginx-ssl')">复制</el-button>
        </div>
        <pre id="nginx-ssl"># HTTP重定向到HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书路径
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS（可选，启用后浏览器会强制使用HTTPS）
    add_header Strict-Transport-Security "max-age=63072000" always;

    # 前端静态文件
    root /www/wwwroot/crm/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket代理
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    client_max_body_size 100M;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml;
}</pre>
      </div>
    </section>

    <section>
      <h2><el-icon><Refresh /></el-icon> 配置生效</h2>

      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('nginx-reload')">复制</el-button>
        </div>
        <pre id="nginx-reload"># 测试配置文件语法
nginx -t

# 如果测试通过，重载配置
systemctl reload nginx

# 或者重启Nginx
systemctl restart nginx

# 查看Nginx状态
systemctl status nginx

# 查看错误日志
tail -f /var/log/nginx/error.log</pre>
      </div>
    </section>

    <section>
      <h2><el-icon><Key /></el-icon> 防火墙配置</h2>

      <h3>firewalld（CentOS）</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('firewalld')">复制</el-button>
        </div>
        <pre id="firewalld"># 开放HTTP端口
firewall-cmd --permanent --add-service=http

# 开放HTTPS端口
firewall-cmd --permanent --add-service=https

# 重载防火墙
firewall-cmd --reload

# 查看已开放端口
firewall-cmd --list-all</pre>
      </div>

      <h3>ufw（Ubuntu）</h3>
      <div class="code-block">
        <div class="code-header">
          <span>Shell</span>
          <el-button size="small" text @click="copyCode('ufw')">复制</el-button>
        </div>
        <pre id="ufw"># 开放Nginx所有端口
ufw allow 'Nginx Full'

# 或者分别开放
ufw allow 80/tcp
ufw allow 443/tcp

# 查看状态
ufw status</pre>
      </div>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 常见问题</h2>

      <el-collapse accordion>
        <el-collapse-item title="502 Bad Gateway错误" name="1">
          <div class="faq-content">
            <p><strong>原因：</strong>后端服务未启动或端口不正确</p>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>检查后端服务是否正常运行：<code>pm2 status</code></li>
              <li>确认后端监听端口是否为3000</li>
              <li>检查防火墙是否阻止了内部通信</li>
              <li>查看Nginx错误日志：<code>tail -f /var/log/nginx/error.log</code></li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item title="WebSocket连接失败" name="2">
          <div class="faq-content">
            <p><strong>原因：</strong>WebSocket代理配置不正确</p>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>确认 <code>proxy_http_version</code> 设置为 1.1</li>
              <li>确认 <code>Upgrade</code> 和 <code>Connection</code> 头设置正确</li>
              <li>检查超时设置是否足够长</li>
              <li>如果使用CDN，确保CDN支持WebSocket</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item title="静态资源404错误" name="3">
          <div class="faq-content">
            <p><strong>原因：</strong>前端文件路径配置错误</p>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>确认 <code>root</code> 路径指向正确的dist目录</li>
              <li>检查文件权限：<code>ls -la /www/wwwroot/crm/dist</code></li>
              <li>确认前端已正确构建：<code>npm run build</code></li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item title="上传文件失败" name="4">
          <div class="faq-content">
            <p><strong>原因：</strong>文件大小超过限制</p>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>增加 <code>client_max_body_size</code> 值</li>
              <li>同时检查后端的文件大小限制</li>
              <li>检查磁盘空间是否充足</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item title="SSL证书错误" name="5">
          <div class="faq-content">
            <p><strong>原因：</strong>证书过期或配置错误</p>
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>检查证书有效期：<code>openssl x509 -in cert.pem -noout -dates</code></li>
              <li>确认证书路径正确</li>
              <li>使用Let's Encrypt时运行：<code>certbot renew</code></li>
              <li>确保证书链完整（fullchain.pem）</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><TrendCharts /></el-icon> 性能优化</h2>

      <div class="optimization-tips">
        <div class="tip-card">
          <h4>启用Gzip压缩</h4>
          <p>压缩文本资源可减少60-80%的传输大小</p>
        </div>
        <div class="tip-card">
          <h4>静态资源缓存</h4>
          <p>设置长期缓存，减少重复请求</p>
        </div>
        <div class="tip-card">
          <h4>启用HTTP/2</h4>
          <p>多路复用提升并发加载性能</p>
        </div>
        <div class="tip-card">
          <h4>连接池优化</h4>
          <p>调整worker_connections提升并发能力</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  Connection, Download, Document, Lock, Refresh, Key,
  QuestionFilled, TrendCharts, WarningFilled
} from '@element-plus/icons-vue'

const copyCode = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    navigator.clipboard.writeText(element.textContent || '')
    ElMessage.success('代码已复制到剪贴板')
  }
}
</script>

<style scoped>
.help-content {
  line-height: 1.8;
  color: #333;
}

.help-content h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #409eff;
}

.help-content h2 {
  font-size: 20px;
  color: #303133;
  margin: 35px 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 25px 0 15px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 15px 0 10px;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

.help-content code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #e6a23c;
}

section {
  margin-bottom: 40px;
}

.intro-section {
  margin-bottom: 30px;
}

.intro-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 25px;
  border-radius: 12px;
  color: white;
}

.intro-icon {
  font-size: 48px;
  opacity: 0.9;
}

.intro-text p {
  margin: 0;
  color: white;
  font-size: 15px;
  line-height: 1.8;
}

.code-block {
  background: #1e1e1e;
  border-radius: 8px;
  margin: 15px 0;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.code-header span {
  color: #888;
  font-size: 12px;
}

.code-block pre {
  margin: 0;
  padding: 15px;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-x: auto;
}

.step-list {
  margin: 20px 0;
}

.step-item {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 5px;
  color: #303133;
}

.step-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.warning-box {
  display: flex;
  gap: 15px;
  padding: 15px 20px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  margin: 20px 0;
}

.warning-box .el-icon {
  font-size: 24px;
  color: #f56c6c;
}

.warning-box strong {
  color: #f56c6c;
  display: block;
  margin-bottom: 5px;
}

.warning-box p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.info-card {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.info-card h4 {
  margin: 0 0 10px;
  color: #303133;
}

.info-card ul {
  margin: 0;
  padding-left: 18px;
}

.info-card li {
  margin: 5px 0;
  font-size: 14px;
}

.faq-content {
  padding: 10px 0;
}

.faq-content p {
  margin: 8px 0;
}

.faq-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.faq-content li {
  margin: 5px 0;
}

.optimization-tips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.tip-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.tip-card h4 {
  margin: 0 0 10px;
  color: #409eff;
}

.tip-card p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
  margin: 15px 0;
  color: #e6a23c;
  font-size: 14px;
}

.tip-box code {
  background: #fff;
  color: #e6a23c;
}

.config-notes {
  margin: 20px 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.note-item {
  display: flex;
  gap: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.note-item:last-child {
  border-bottom: none;
}

.note-label {
  min-width: 100px;
  font-weight: 600;
  color: #409eff;
}

.note-desc {
  color: #606266;
  flex: 1;
}

.note-desc code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #e6a23c;
}
</style>

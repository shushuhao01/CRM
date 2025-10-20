import{l as o,r as c,m as t,p as s,aA as v,q as d,Q as n}from"./vendor-D8Vxqhr-.js";import{_ as l}from"./settings-CuxbDWOu.js";import"./elementPlus-Bmwh7Rh8.js";import"./utils-ywHRn0uI.js";const b={class:"help-content"},r={class:"content-section"},p={class:"deployment-tabs"},m={class:"tab-header"},h={class:"tab-content"},u={key:0,class:"tab-panel"},y={key:1,class:"tab-panel"},_={key:2,class:"tab-panel"},k=o({__name:"DeploymentGuide",setup(g){const e=c("docker");return(x,a)=>(s(),t("div",b,[a[7]||(a[7]=v(`<h1 data-v-eaaad4b0>部署详细步骤</h1><section class="content-section" data-v-eaaad4b0><h2 data-v-eaaad4b0>环境要求</h2><div class="requirements-grid" data-v-eaaad4b0><div class="requirement-card" data-v-eaaad4b0><h3 data-v-eaaad4b0>前端环境</h3><ul data-v-eaaad4b0><li data-v-eaaad4b0>Node.js &gt;= 16.0.0</li><li data-v-eaaad4b0>npm &gt;= 8.0.0 或 yarn &gt;= 1.22.0</li><li data-v-eaaad4b0>Vue 3.x</li><li data-v-eaaad4b0>Vite 4.x</li></ul></div><div class="requirement-card" data-v-eaaad4b0><h3 data-v-eaaad4b0>后端环境</h3><ul data-v-eaaad4b0><li data-v-eaaad4b0>Node.js &gt;= 16.0.0</li><li data-v-eaaad4b0>Express.js 4.x</li><li data-v-eaaad4b0>MySQL &gt;= 8.0</li><li data-v-eaaad4b0>Redis &gt;= 6.0（可选）</li></ul></div><div class="requirement-card" data-v-eaaad4b0><h3 data-v-eaaad4b0>服务器环境</h3><ul data-v-eaaad4b0><li data-v-eaaad4b0>Linux/Windows Server</li><li data-v-eaaad4b0>Nginx &gt;= 1.18</li><li data-v-eaaad4b0>PM2（进程管理）</li><li data-v-eaaad4b0>SSL证书（生产环境）</li></ul></div></div></section><section class="content-section" data-v-eaaad4b0><h2 data-v-eaaad4b0>本地开发环境搭建</h2><div class="step-container" data-v-eaaad4b0><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>1</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>克隆项目代码</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0>git clone https://github.com/your-repo/crm-system.git
cd crm-system</code></pre></div></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>2</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>安装前端依赖</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 进入前端目录
cd frontend

# 安装依赖
npm install

# 或使用 yarn
yarn install</code></pre></div></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>3</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>安装后端依赖</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 进入后端目录
cd ../backend

# 安装依赖
npm install</code></pre></div></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>4</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>配置数据库</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 创建数据库
CREATE DATABASE crm_system;

# 导入数据库结构
mysql -u root -p crm_system &lt; database/schema.sql

# 导入初始数据（可选）
mysql -u root -p crm_system &lt; database/data.sql</code></pre></div></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>5</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>配置环境变量</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 复制环境配置文件
cp .env.example .env

# 编辑配置文件
vim .env</code></pre></div><div class="config-example" data-v-eaaad4b0><h4 data-v-eaaad4b0>环境变量示例：</h4><pre data-v-eaaad4b0><code data-v-eaaad4b0>DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crm_system
JWT_SECRET=your_jwt_secret
PORT=3000</code></pre></div></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>6</div><div class="step-content" data-v-eaaad4b0><h3 data-v-eaaad4b0>启动开发服务器</h3><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 启动后端服务
cd backend
npm run dev

# 新开终端，启动前端服务
cd frontend
npm run dev</code></pre></div><div class="note" data-v-eaaad4b0><p data-v-eaaad4b0><strong data-v-eaaad4b0>注意：</strong>前端服务默认运行在 http://localhost:5173，后端服务运行在 http://localhost:3000</p></div></div></div></div></section>`,3)),d("section",r,[a[6]||(a[6]=d("h2",null,"生产环境部署",-1)),d("div",p,[d("div",m,[d("button",{class:"tab-btn active",onClick:a[0]||(a[0]=i=>e.value="docker")},"Docker 部署"),d("button",{class:"tab-btn",onClick:a[1]||(a[1]=i=>e.value="manual")},"手动部署"),d("button",{class:"tab-btn",onClick:a[2]||(a[2]=i=>e.value="nginx")},"Nginx 配置")]),d("div",h,[e.value==="docker"?(s(),t("div",u,[...a[3]||(a[3]=[v(`<div class="deployment-section" data-v-eaaad4b0><h3 data-v-eaaad4b0>🐳 Docker 部署</h3><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>1. 准备 Docker 环境</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Docker Compose
sudo curl -L &quot;https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)&quot; -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose</code></pre></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>2. 构建和运行</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 克隆项目
git clone https://github.com/your-repo/crm-system.git
cd crm-system

# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps</code></pre></div></div></div><div class="deployment-section" data-v-eaaad4b0><h3 data-v-eaaad4b0>🏗️ 宝塔面板部署</h3><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>1. 安装宝塔面板</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># CentOS/RHEL 系统
yum install -y wget &amp;&amp; wget -O install.sh http://download.bt.cn/install/install_6.0.sh &amp;&amp; sh install.sh

# Ubuntu/Debian 系统
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh &amp;&amp; sudo bash install.sh

# 安装完成后访问面板地址
# 默认端口：8888
# 默认用户名和密码会在安装完成后显示</code></pre></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>2. 环境配置</h4><div class="step-list" data-v-eaaad4b0><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>1</div><div class="step-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>安装运行环境</h5><p data-v-eaaad4b0>在宝塔面板中安装以下软件：</p><ul data-v-eaaad4b0><li data-v-eaaad4b0>Nginx 1.20+</li><li data-v-eaaad4b0>MySQL 8.0+</li><li data-v-eaaad4b0>Node.js 18+</li><li data-v-eaaad4b0>PM2 管理器</li></ul></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>2</div><div class="step-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>创建网站</h5><p data-v-eaaad4b0>在宝塔面板中创建新网站，设置域名和根目录</p></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>3</div><div class="step-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>配置数据库</h5><p data-v-eaaad4b0>创建 MySQL 数据库和用户，记录连接信息</p></div></div></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>3. 部署前端</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 在本地构建前端项目
npm install
npm run build

# 将 dist 目录上传到网站根目录
# 或使用宝塔面板的文件管理器上传</code></pre></div><div class="tip-item" data-v-eaaad4b0><div class="tip-icon" data-v-eaaad4b0>💡</div><div class="tip-content" data-v-eaaad4b0><p data-v-eaaad4b0>建议使用宝塔面板的&quot;一键部署&quot;功能，可以直接从 Git 仓库拉取代码并自动构建</p></div></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>4. 部署后端</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 上传后端代码到服务器
# 进入后端目录
cd /www/wwwroot/your-domain/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 运行数据库迁移
npm run migration:run

# 使用 PM2 启动应用
pm2 start npm --name &quot;crm-backend&quot; -- run start
pm2 save
pm2 startup</code></pre></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>5. Nginx 配置</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 在宝塔面板中配置网站的 Nginx 配置
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/your-domain/dist;
    index index.html;

    # 前端路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理配置
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control &quot;public, immutable&quot;;
    }
}</code></pre></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>6. SSL 证书配置</h4><div class="step-list" data-v-eaaad4b0><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>1</div><div class="step-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>申请 SSL 证书</h5><p data-v-eaaad4b0>在宝塔面板中使用 Let&#39;s Encrypt 免费申请 SSL 证书</p></div></div><div class="step-item" data-v-eaaad4b0><div class="step-number" data-v-eaaad4b0>2</div><div class="step-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>强制 HTTPS</h5><p data-v-eaaad4b0>开启强制 HTTPS 重定向，确保网站安全</p></div></div></div></div><div class="deployment-card" data-v-eaaad4b0><h4 data-v-eaaad4b0>7. 监控和维护</h4><div class="feature-grid" data-v-eaaad4b0><div class="feature-item" data-v-eaaad4b0><div class="feature-icon" data-v-eaaad4b0>📊</div><div class="feature-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>系统监控</h5><p data-v-eaaad4b0>使用宝塔面板监控服务器资源使用情况</p></div></div><div class="feature-item" data-v-eaaad4b0><div class="feature-icon" data-v-eaaad4b0>🔄</div><div class="feature-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>自动备份</h5><p data-v-eaaad4b0>配置数据库和文件的定时备份</p></div></div><div class="feature-item" data-v-eaaad4b0><div class="feature-icon" data-v-eaaad4b0>🛡️</div><div class="feature-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>安全防护</h5><p data-v-eaaad4b0>开启防火墙和安全规则</p></div></div><div class="feature-item" data-v-eaaad4b0><div class="feature-icon" data-v-eaaad4b0>📝</div><div class="feature-content" data-v-eaaad4b0><h5 data-v-eaaad4b0>日志管理</h5><p data-v-eaaad4b0>查看和管理应用日志</p></div></div></div></div></div>`,2)])])):n("",!0),e.value==="manual"?(s(),t("div",y,[...a[4]||(a[4]=[v(`<h3 data-v-eaaad4b0>手动部署步骤</h3><div class="step-item" data-v-eaaad4b0><h4 data-v-eaaad4b0>1. 构建前端项目</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0>cd frontend
npm run build</code></pre></div></div><div class="step-item" data-v-eaaad4b0><h4 data-v-eaaad4b0>2. 部署前端文件</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 将 dist 目录上传到服务器
scp -r dist/ user@server:/var/www/crm</code></pre></div></div><div class="step-item" data-v-eaaad4b0><h4 data-v-eaaad4b0>3. 部署后端服务</h4><div class="code-block" data-v-eaaad4b0><pre data-v-eaaad4b0><code data-v-eaaad4b0># 上传后端代码
scp -r backend/ user@server:/opt/crm-backend

# 安装依赖并启动
cd /opt/crm-backend
npm install --production
pm2 start ecosystem.config.js</code></pre></div></div>`,4)])])):n("",!0),e.value==="nginx"?(s(),t("div",_,[...a[5]||(a[5]=[d("h3",null,"Nginx 配置",-1),d("div",{class:"code-block"},[d("pre",null,[d("code",null,`server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/crm;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`)])],-1)])])):n("",!0)])])]),a[8]||(a[8]=v('<section class="content-section" data-v-eaaad4b0><h2 data-v-eaaad4b0>常见部署问题</h2><div class="faq-list" data-v-eaaad4b0><div class="faq-item" data-v-eaaad4b0><h3 data-v-eaaad4b0>Q: 前端构建失败怎么办？</h3><p data-v-eaaad4b0>A: 检查 Node.js 版本是否符合要求，清除 node_modules 重新安装依赖，确保网络连接正常。</p></div><div class="faq-item" data-v-eaaad4b0><h3 data-v-eaaad4b0>Q: 数据库连接失败？</h3><p data-v-eaaad4b0>A: 检查数据库服务是否启动，确认连接参数正确，检查防火墙设置。</p></div><div class="faq-item" data-v-eaaad4b0><h3 data-v-eaaad4b0>Q: 前端页面空白？</h3><p data-v-eaaad4b0>A: 检查 Nginx 配置是否正确，确认静态文件路径，查看浏览器控制台错误信息。</p></div><div class="faq-item" data-v-eaaad4b0><h3 data-v-eaaad4b0>Q: API 请求失败？</h3><p data-v-eaaad4b0>A: 检查后端服务是否正常运行，确认 API 代理配置，检查跨域设置。</p></div></div></section>',1))]))}}),$=l(k,[["__scopeId","data-v-eaaad4b0"]]);export{$ as default};

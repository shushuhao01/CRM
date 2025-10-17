<template>
  <div class="help-content">
    <h1>部署详细步骤</h1>
    
    <section class="content-section">
      <h2>环境要求</h2>
      <div class="requirements-grid">
        <div class="requirement-card">
          <h3>前端环境</h3>
          <ul>
            <li>Node.js >= 16.0.0</li>
            <li>npm >= 8.0.0 或 yarn >= 1.22.0</li>
            <li>Vue 3.x</li>
            <li>Vite 4.x</li>
          </ul>
        </div>
        
        <div class="requirement-card">
          <h3>后端环境</h3>
          <ul>
            <li>Node.js >= 16.0.0</li>
            <li>Express.js 4.x</li>
            <li>MySQL >= 8.0</li>
            <li>Redis >= 6.0（可选）</li>
          </ul>
        </div>
        
        <div class="requirement-card">
          <h3>服务器环境</h3>
          <ul>
            <li>Linux/Windows Server</li>
            <li>Nginx >= 1.18</li>
            <li>PM2（进程管理）</li>
            <li>SSL证书（生产环境）</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>本地开发环境搭建</h2>
      
      <div class="step-container">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>克隆项目代码</h3>
            <div class="code-block">
              <pre><code>git clone https://github.com/your-repo/crm-system.git
cd crm-system</code></pre>
            </div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>安装前端依赖</h3>
            <div class="code-block">
              <pre><code># 进入前端目录
cd frontend

# 安装依赖
npm install

# 或使用 yarn
yarn install</code></pre>
            </div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>安装后端依赖</h3>
            <div class="code-block">
              <pre><code># 进入后端目录
cd ../backend

# 安装依赖
npm install</code></pre>
            </div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>配置数据库</h3>
            <div class="code-block">
              <pre><code># 创建数据库
CREATE DATABASE crm_system;

# 导入数据库结构
mysql -u root -p crm_system < database/schema.sql

# 导入初始数据（可选）
mysql -u root -p crm_system < database/data.sql</code></pre>
            </div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3>配置环境变量</h3>
            <div class="code-block">
              <pre><code># 复制环境配置文件
cp .env.example .env

# 编辑配置文件
vim .env</code></pre>
            </div>
            <div class="config-example">
              <h4>环境变量示例：</h4>
              <pre><code>DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crm_system
JWT_SECRET=your_jwt_secret
PORT=3000</code></pre>
            </div>
          </div>
        </div>
        
        <div class="step-item">
          <div class="step-number">6</div>
          <div class="step-content">
            <h3>启动开发服务器</h3>
            <div class="code-block">
              <pre><code># 启动后端服务
cd backend
npm run dev

# 新开终端，启动前端服务
cd frontend
npm run dev</code></pre>
            </div>
            <div class="note">
              <p><strong>注意：</strong>前端服务默认运行在 http://localhost:5173，后端服务运行在 http://localhost:3000</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>生产环境部署</h2>
      
      <div class="deployment-tabs">
        <div class="tab-header">
          <button class="tab-btn active" @click="activeTab = 'docker'">Docker 部署</button>
          <button class="tab-btn" @click="activeTab = 'manual'">手动部署</button>
          <button class="tab-btn" @click="activeTab = 'nginx'">Nginx 配置</button>
        </div>
        
        <div class="tab-content">
          <div v-if="activeTab === 'docker'" class="tab-panel">
            <div class="deployment-section">
              <h3>🐳 Docker 部署</h3>
              <div class="deployment-card">
                <h4>1. 准备 Docker 环境</h4>
                <div class="code-block">
                  <pre><code># 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose</code></pre>
                </div>
              </div>

              <div class="deployment-card">
                <h4>2. 构建和运行</h4>
                <div class="code-block">
                  <pre><code># 克隆项目
git clone https://github.com/your-repo/crm-system.git
cd crm-system

# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps</code></pre>
                </div>
              </div>
            </div>

            <div class="deployment-section">
              <h3>🏗️ 宝塔面板部署</h3>
              <div class="deployment-card">
                <h4>1. 安装宝塔面板</h4>
                <div class="code-block">
                  <pre><code># CentOS/RHEL 系统
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian 系统
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh

# 安装完成后访问面板地址
# 默认端口：8888
# 默认用户名和密码会在安装完成后显示</code></pre>
                </div>
              </div>

              <div class="deployment-card">
                <h4>2. 环境配置</h4>
                <div class="step-list">
                  <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                      <h5>安装运行环境</h5>
                      <p>在宝塔面板中安装以下软件：</p>
                      <ul>
                        <li>Nginx 1.20+</li>
                        <li>MySQL 8.0+</li>
                        <li>Node.js 18+</li>
                        <li>PM2 管理器</li>
                      </ul>
                    </div>
                  </div>
                  <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                      <h5>创建网站</h5>
                      <p>在宝塔面板中创建新网站，设置域名和根目录</p>
                    </div>
                  </div>
                  <div class="step-item">
                    <div class="step-number">3</div>
                    <div class="step-content">
                      <h5>配置数据库</h5>
                      <p>创建 MySQL 数据库和用户，记录连接信息</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="deployment-card">
                <h4>3. 部署前端</h4>
                <div class="code-block">
                  <pre><code># 在本地构建前端项目
npm install
npm run build

# 将 dist 目录上传到网站根目录
# 或使用宝塔面板的文件管理器上传</code></pre>
                </div>
                <div class="tip-item">
                  <div class="tip-icon">💡</div>
                  <div class="tip-content">
                    <p>建议使用宝塔面板的"一键部署"功能，可以直接从 Git 仓库拉取代码并自动构建</p>
                  </div>
                </div>
              </div>

              <div class="deployment-card">
                <h4>4. 部署后端</h4>
                <div class="code-block">
                  <pre><code># 上传后端代码到服务器
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
pm2 start npm --name "crm-backend" -- run start
pm2 save
pm2 startup</code></pre>
                </div>
              </div>

              <div class="deployment-card">
                <h4>5. Nginx 配置</h4>
                <div class="code-block">
                  <pre><code># 在宝塔面板中配置网站的 Nginx 配置
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
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}</code></pre>
                </div>
              </div>

              <div class="deployment-card">
                <h4>6. SSL 证书配置</h4>
                <div class="step-list">
                  <div class="step-item">
                    <div class="step-number">1</div>
                    <div class="step-content">
                      <h5>申请 SSL 证书</h5>
                      <p>在宝塔面板中使用 Let's Encrypt 免费申请 SSL 证书</p>
                    </div>
                  </div>
                  <div class="step-item">
                    <div class="step-number">2</div>
                    <div class="step-content">
                      <h5>强制 HTTPS</h5>
                      <p>开启强制 HTTPS 重定向，确保网站安全</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="deployment-card">
                <h4>7. 监控和维护</h4>
                <div class="feature-grid">
                  <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div class="feature-content">
                      <h5>系统监控</h5>
                      <p>使用宝塔面板监控服务器资源使用情况</p>
                    </div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">🔄</div>
                    <div class="feature-content">
                      <h5>自动备份</h5>
                      <p>配置数据库和文件的定时备份</p>
                    </div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">🛡️</div>
                    <div class="feature-content">
                      <h5>安全防护</h5>
                      <p>开启防火墙和安全规则</p>
                    </div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">📝</div>
                    <div class="feature-content">
                      <h5>日志管理</h5>
                      <p>查看和管理应用日志</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="activeTab === 'manual'" class="tab-panel">
            <h3>手动部署步骤</h3>
            <div class="step-item">
              <h4>1. 构建前端项目</h4>
              <div class="code-block">
                <pre><code>cd frontend
npm run build</code></pre>
              </div>
            </div>
            
            <div class="step-item">
              <h4>2. 部署前端文件</h4>
              <div class="code-block">
                <pre><code># 将 dist 目录上传到服务器
scp -r dist/ user@server:/var/www/crm</code></pre>
              </div>
            </div>
            
            <div class="step-item">
              <h4>3. 部署后端服务</h4>
              <div class="code-block">
                <pre><code># 上传后端代码
scp -r backend/ user@server:/opt/crm-backend

# 安装依赖并启动
cd /opt/crm-backend
npm install --production
pm2 start ecosystem.config.js</code></pre>
              </div>
            </div>
          </div>
          
          <div v-if="activeTab === 'nginx'" class="tab-panel">
            <h3>Nginx 配置</h3>
            <div class="code-block">
              <pre><code>server {
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
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>常见部署问题</h2>
      <div class="faq-list">
        <div class="faq-item">
          <h3>Q: 前端构建失败怎么办？</h3>
          <p>A: 检查 Node.js 版本是否符合要求，清除 node_modules 重新安装依赖，确保网络连接正常。</p>
        </div>
        
        <div class="faq-item">
          <h3>Q: 数据库连接失败？</h3>
          <p>A: 检查数据库服务是否启动，确认连接参数正确，检查防火墙设置。</p>
        </div>
        
        <div class="faq-item">
          <h3>Q: 前端页面空白？</h3>
          <p>A: 检查 Nginx 配置是否正确，确认静态文件路径，查看浏览器控制台错误信息。</p>
        </div>
        
        <div class="faq-item">
          <h3>Q: API 请求失败？</h3>
          <p>A: 检查后端服务是否正常运行，确认 API 代理配置，检查跨域设置。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('docker')
</script>

<style scoped>
.help-content {
  padding: 20px;
  max-width: 1000px;
}

.content-section {
  margin-bottom: 40px;
}

.content-section h1 {
  color: #2c3e50;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 30px;
}

.content-section h2 {
  color: #34495e;
  margin-bottom: 20px;
  font-size: 24px;
}

.requirements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.requirement-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.requirement-card h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.requirement-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirement-card li {
  padding: 5px 0;
  color: #303133;
  position: relative;
  padding-left: 20px;
}

.requirement-card li::before {
  content: "✓";
  color: #27ae60;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.step-container {
  margin: 30px 0;
}

.step-item {
  display: flex;
  margin-bottom: 30px;
  align-items: flex-start;
}

.step-number {
  background: #3498db;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 20px;
  flex-shrink: 0;
  font-size: 18px;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.code-block {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 5px;
  margin: 10px 0;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.config-example {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin: 10px 0;
  border-left: 4px solid #f39c12;
}

.config-example h4 {
  color: #e67e22;
  margin-bottom: 10px;
}

.note {
  background: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
}

.note p {
  margin: 0;
  color: #2d5a2d;
}

.deployment-tabs {
  margin: 20px 0;
}

.tab-header {
  display: flex;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 20px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  color: #6c757d;
  font-size: 16px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-btn:hover {
  color: #3498db;
}

.tab-panel h3 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.tab-panel h4 {
  color: #34495e;
  margin: 20px 0 10px 0;
}

.faq-list {
  margin: 20px 0;
}

.faq-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.faq-item h3 {
  color: #e74c3c;
  margin-bottom: 10px;
  font-size: 16px;
}

.faq-item p {
  color: #303133;
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .step-item {
    flex-direction: column;
  }
  
  .step-number {
    margin-bottom: 10px;
    margin-right: 0;
  }
  
  .requirements-grid {
    grid-template-columns: 1fr;
  }
  
  .tab-header {
    flex-direction: column;
  }
  
  .tab-btn {
    text-align: left;
  }
}
</style>
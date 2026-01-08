<template>
  <div class="help-content">
    <h1>私有部署指南</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Monitor /></el-icon>
        <div class="intro-text">
          <p>私有部署版本适合对数据安全有较高要求的企业，可以将系统部署在自有服务器上，完全掌控数据。本文档将指导您完成私有部署的全过程。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Cpu /></el-icon> 环境要求</h2>
      <div class="requirements">
        <div class="req-card">
          <h3>服务器配置</h3>
          <ul>
            <li><strong>最低配置</strong>：2核2GB</li>
            <li><strong>推荐配置</strong>：4核8GB</li>
            <li>硬盘：50GB及以上</li>
            <li>带宽：5Mbps及以上</li>
          </ul>
        </div>
        <div class="req-card recommend">
          <h3>推荐操作系统</h3>
          <div class="recommend-os">
            <strong>Ubuntu 24.04.3 LTS</strong>
            <span>(Noble Numbat) x86_64</span>
          </div>
          <p class="os-note">也支持：Ubuntu 22.04/20.04、CentOS 7.x/8.x、Debian 11/12</p>
        </div>
        <div class="req-card">
          <h3>软件环境</h3>
          <ul>
            <li>Node.js 18.x 或 20.x</li>
            <li>MySQL 5.7+ 或 8.0+</li>
            <li>Nginx 1.18+</li>
            <li>PM2（进程管理）</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 部署方式</h2>
      <el-tabs v-model="deployMethod" type="border-card">
        <el-tab-pane label="🚀 宝塔面板一键部署（推荐）" name="bt">
          <div class="deploy-content">
            <div class="step-section">
              <h3>第一步：安装宝塔面板</h3>
              <p>连接到服务器后，执行以下命令安装宝塔面板：</p>

              <div class="os-tabs">
                <el-radio-group v-model="osType" size="small">
                  <el-radio-button label="ubuntu">Ubuntu/Debian</el-radio-button>
                  <el-radio-button label="centos">CentOS</el-radio-button>
                </el-radio-group>
              </div>

              <div class="code-block">
                <div class="code-header">
                  <span>{{ osType === 'ubuntu' ? 'Ubuntu/Debian' : 'CentOS' }}</span>
                  <el-button size="small" text @click="copyCode('bt-install')">复制</el-button>
                </div>
                <pre id="bt-install">{{ osType === 'ubuntu'
? `wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec`
: `yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec` }}</pre>
              </div>

              <div class="tip-box success">
                <el-icon><SuccessFilled /></el-icon>
                <span>安装完成后会显示面板地址、用户名和密码，请妥善保存！</span>
              </div>
            </div>

            <div class="step-section">
              <h3>第二步：安装必要软件</h3>
              <p>登录宝塔面板后，在「软件商店」中安装以下软件：</p>

              <div class="software-list">
                <div class="software-item">
                  <span class="software-name">Nginx</span>
                  <span class="software-version">1.22+</span>
                  <span class="software-desc">Web服务器</span>
                </div>
                <div class="software-item">
                  <span class="software-name">MySQL</span>
                  <span class="software-version">8.0</span>
                  <span class="software-desc">数据库</span>
                </div>
                <div class="software-item">
                  <span class="software-name">PM2管理器</span>
                  <span class="software-version">最新版</span>
                  <span class="software-desc">进程管理</span>
                </div>
                <div class="software-item">
                  <span class="software-name">Node.js版本管理器</span>
                  <span class="software-version">安装后选择 v20.x</span>
                  <span class="software-desc">运行环境</span>
                </div>
              </div>
            </div>

            <div class="step-section">
              <h3>第三步：创建数据库</h3>
              <ol>
                <li>在宝塔面板点击「数据库」→「添加数据库」</li>
                <li>填写信息：
                  <ul>
                    <li>数据库名：<code>crm_db</code></li>
                    <li>用户名：<code>crm_user</code></li>
                    <li>密码：点击「生成密码」（<strong>请保存此密码！</strong>）</li>
                    <li>访问权限：本地服务器</li>
                  </ul>
                </li>
                <li>点击「提交」创建数据库</li>
                <li>点击数据库右侧「管理」→「导入」→ 上传 <code>database/schema.sql</code> 文件</li>
              </ol>
            </div>

            <div class="step-section">
              <h3>第四步：上传项目代码</h3>

              <h4>方式一：Git 克隆（推荐）</h4>
              <div class="code-block">
                <div class="code-header">
                  <span>终端命令</span>
                  <el-button size="small" text @click="copyCode('git-clone')">复制</el-button>
                </div>
                <pre id="git-clone"># 进入网站目录
cd /www/wwwroot

# 克隆项目
git clone https://github.com/your-repo/CRM.git

# 进入项目目录
cd CRM</pre>
              </div>

              <h4>方式二：宝塔面板上传</h4>
              <ol>
                <li>将项目打包成 .zip 文件</li>
                <li>在宝塔面板「文件」中导航到 <code>/www/wwwroot</code></li>
                <li>点击「上传」上传压缩包</li>
                <li>右键点击压缩包选择「解压」</li>
              </ol>
            </div>

            <div class="step-section">
              <h3>第五步：配置后端环境变量</h3>
              <ol>
                <li>进入 <code>/www/wwwroot/CRM/backend</code> 目录</li>
                <li>复制 <code>.env.example</code> 为 <code>.env</code></li>
                <li>编辑 <code>.env</code> 文件，修改以下配置：</li>
              </ol>

              <div class="code-block">
                <div class="code-header">
                  <span>backend/.env 关键配置</span>
                  <el-button size="small" text @click="copyCode('env-config')">复制</el-button>
                </div>
                <pre id="env-config"># 数据库配置 - 必须修改！
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=您的数据库密码  # ← 填写第三步保存的密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4

# JWT配置 - 必须修改！
JWT_SECRET=请生成一个随机密钥  # ← 至少32位随机字符串
JWT_EXPIRES_IN=7d

# 服务端口
PORT=3000</pre>
              </div>

              <div class="tip-box warning">
                <el-icon><WarningFilled /></el-icon>
                <span>JWT_SECRET 生成方法：在终端执行 <code>openssl rand -hex 32</code></span>
              </div>
            </div>

            <div class="step-section">
              <h3>第六步：一键部署</h3>
              <p>项目已包含一键部署脚本，执行以下命令即可自动完成依赖安装、构建和启动：</p>

              <div class="code-block">
                <div class="code-header">
                  <span>一键部署命令</span>
                  <el-button size="small" text @click="copyCode('deploy-cmd')">复制</el-button>
                </div>
                <pre id="deploy-cmd"># 进入项目目录
cd /www/wwwroot/CRM

# 给脚本执行权限
chmod +x deploy.sh

# 执行一键部署
./deploy.sh</pre>
              </div>

              <div class="deploy-steps">
                <h4>脚本将自动完成以下操作：</h4>
                <div class="auto-step">
                  <span class="step-num">1</span>
                  <span>环境检查（Node.js版本、内存、磁盘空间）</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">2</span>
                  <span>配置 npm 镜像加速</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">3</span>
                  <span>安装前端依赖（约5-8分钟）</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">4</span>
                  <span>安装后端依赖（约3-5分钟）</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">5</span>
                  <span>构建前端项目（约5-10分钟）</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">6</span>
                  <span>使用 PM2 启动后端服务</span>
                </div>
                <div class="auto-step">
                  <span class="step-num">7</span>
                  <span>配置开机自启</span>
                </div>
              </div>

              <div class="tip-box success">
                <el-icon><SuccessFilled /></el-icon>
                <span>部署完成后会显示服务状态和访问地址</span>
              </div>
            </div>

            <div class="step-section">
              <h3>第七步：配置 Nginx</h3>
              <ol>
                <li>在宝塔面板点击「网站」→「添加站点」</li>
                <li>填写域名（或服务器IP）</li>
                <li>根目录选择：<code>/www/wwwroot/CRM/dist</code></li>
                <li>PHP版本选择：纯静态</li>
                <li>点击「提交」</li>
                <li>点击网站「设置」→「配置文件」</li>
                <li>参考「Nginx配置」文档配置反向代理和WebSocket</li>
              </ol>

              <div class="tip-box info">
                <el-icon><InfoFilled /></el-icon>
                <span>详细的 Nginx 配置请查看「部署指南 → Nginx配置」章节</span>
              </div>
            </div>

            <div class="step-section">
              <h3>第八步：申请 SSL 证书（推荐）</h3>
              <ol>
                <li>在网站设置中点击「SSL」</li>
                <li>选择「Let's Encrypt」</li>
                <li>勾选域名，点击「申请」</li>
                <li>申请成功后开启「强制HTTPS」</li>
              </ol>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="🐳 Docker部署" name="docker">
          <div class="deploy-content">
            <h3>1. 安装 Docker</h3>
            <div class="code-block">
              <pre># Ubuntu
apt-get update
apt-get install -y docker.io docker-compose

# CentOS
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker</pre>
            </div>

            <h3>2. 使用 docker-compose 部署</h3>
            <div class="code-block">
              <pre>cd /www/wwwroot/CRM
docker-compose up -d</pre>
            </div>

            <div class="tip-box info">
              <el-icon><InfoFilled /></el-icon>
              <span>Docker 部署方式适合有容器化经验的用户，详细配置请参考项目中的 docker-compose.yml 文件</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section>
      <h2><el-icon><Key /></el-icon> 授权码激活</h2>
      <p>私有部署版本需要授权码才能正常使用。首次访问系统时，需要输入授权码进行激活：</p>

      <div class="license-steps">
        <div class="license-step">
          <div class="license-num">1</div>
          <div class="license-content">
            <h4>获取授权码</h4>
            <p>购买私有部署版本后，您将收到授权码（通过邮件或客服发送）</p>
          </div>
        </div>
        <div class="license-step">
          <div class="license-num">2</div>
          <div class="license-content">
            <h4>访问系统</h4>
            <p>部署完成后，访问您的系统地址</p>
          </div>
        </div>
        <div class="license-step">
          <div class="license-num">3</div>
          <div class="license-content">
            <h4>输入授权码</h4>
            <p>首次访问时，系统会弹出授权码输入框，输入您的授权码</p>
          </div>
        </div>
        <div class="license-step">
          <div class="license-num">4</div>
          <div class="license-content">
            <h4>激活成功</h4>
            <p>授权码验证通过后，即可使用初始账号登录系统</p>
          </div>
        </div>
      </div>

      <div class="tip-box warning">
        <el-icon><WarningFilled /></el-icon>
        <span>授权码与服务器绑定，更换服务器需要重新申请授权码</span>
      </div>

      <div class="contact-box">
        <h4>获取授权码</h4>
        <p>如需购买授权码或授权码相关问题，请联系我们：</p>
        <div class="contact-items">
          <div class="contact-item">
            <el-icon><Message /></el-icon>
            <span>邮箱：xianhuquwang@163.com</span>
          </div>
          <div class="contact-item">
            <el-icon><Phone /></el-icon>
            <span>电话：135-7072-7364</span>
          </div>
          <a href="https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25" target="_blank" class="online-btn">
            <el-icon><ChatLineRound /></el-icon>
            <span>在线咨询</span>
          </a>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><User /></el-icon> 初始账号</h2>
      <div class="account-cards">
        <div class="account-card primary">
          <h4>超级管理员</h4>
          <p>用户名：<code>superadmin</code></p>
          <p>密码：<code>super123456</code></p>
        </div>
        <div class="account-card">
          <h4>管理员</h4>
          <p>用户名：<code>admin</code></p>
          <p>密码：<code>admin123</code></p>
        </div>
        <div class="account-card">
          <h4>部门经理</h4>
          <p>用户名：<code>manager</code></p>
          <p>密码：<code>manager123</code></p>
        </div>
        <div class="account-card">
          <h4>销售员</h4>
          <p>用户名：<code>sales</code></p>
          <p>密码：<code>sales123</code></p>
        </div>
        <div class="account-card">
          <h4>客服</h4>
          <p>用户名：<code>service</code></p>
          <p>密码：<code>service123</code></p>
        </div>
      </div>
      <el-alert type="warning" :closable="false" show-icon style="margin-top: 15px;">
        <template #title>安全提示</template>
        <template #default>
          <p>请登录后立即修改默认密码，确保系统安全！</p>
        </template>
      </el-alert>
    </section>

    <section>
      <h2><el-icon><Tools /></el-icon> 常用维护命令</h2>
      <div class="command-list">
        <div class="command-item">
          <span class="command-name">查看服务状态</span>
          <code>pm2 list</code>
        </div>
        <div class="command-item">
          <span class="command-name">查看后端日志</span>
          <code>pm2 logs crm-backend</code>
        </div>
        <div class="command-item">
          <span class="command-name">重启后端服务</span>
          <code>pm2 restart crm-backend</code>
        </div>
        <div class="command-item">
          <span class="command-name">停止后端服务</span>
          <code>pm2 stop crm-backend</code>
        </div>
        <div class="command-item">
          <span class="command-name">更新代码后重新部署</span>
          <code>cd /www/wwwroot/CRM && git pull && ./deploy.sh</code>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 常见问题</h2>
      <el-collapse accordion>
        <el-collapse-item title="构建时卡住或内存不足" name="1">
          <div class="faq-content">
            <p><strong>原因：</strong>服务器内存不足（2GB内存可能会卡）</p>
            <p><strong>解决方案：</strong></p>
            <ol>
              <li>添加 Swap 虚拟内存：
                <div class="code-block small">
                  <pre>sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab</pre>
                </div>
              </li>
              <li>重新执行部署脚本</li>
            </ol>
          </div>
        </el-collapse-item>
        <el-collapse-item title="访问网站显示502错误" name="2">
          <div class="faq-content">
            <p><strong>检查步骤：</strong></p>
            <ul>
              <li>运行 <code>pm2 list</code> 查看服务状态是否为 online</li>
              <li>运行 <code>pm2 logs crm-backend</code> 查看错误日志</li>
              <li>检查 Nginx 配置中的代理地址是否正确（127.0.0.1:3000）</li>
            </ul>
          </div>
        </el-collapse-item>
        <el-collapse-item title="数据库连接失败" name="3">
          <div class="faq-content">
            <p><strong>检查步骤：</strong></p>
            <ul>
              <li>确认 MySQL 服务已启动</li>
              <li>确认 backend/.env 中的数据库密码正确</li>
              <li>确认数据库名和用户名正确</li>
              <li>在宝塔面板检查数据库是否已导入 schema.sql</li>
            </ul>
          </div>
        </el-collapse-item>
        <el-collapse-item title="WebSocket/实时通知不工作" name="4">
          <div class="faq-content">
            <p><strong>检查步骤：</strong></p>
            <ul>
              <li>确认 Nginx 配置了 /socket.io/ 和 /ws/ 的 WebSocket 代理</li>
              <li>确认 proxy_http_version 设置为 1.1</li>
              <li>确认 Upgrade 和 Connection 头设置正确</li>
              <li>如果使用 CDN，确保 CDN 支持 WebSocket</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor, Cpu, Setting, User, Tools, QuestionFilled,
  SuccessFilled, WarningFilled, InfoFilled, Key, Message, Phone, ChatLineRound
} from '@element-plus/icons-vue'

const deployMethod = ref('bt')
const osType = ref('ubuntu')

const copyCode = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    navigator.clipboard.writeText(element.textContent || '')
    ElMessage.success('已复制到剪贴板')
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
  font-size: 17px;
  color: #303133;
  margin: 25px 0 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.help-content h4 {
  font-size: 15px;
  color: #409eff;
  margin: 20px 0 10px;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul, .help-content ol {
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

.requirements {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 15px;
}

.req-card {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.req-card.recommend {
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border-color: #b3e19d;
}

.req-card h3 {
  margin: 0 0 15px;
  color: #303133;
  font-size: 16px;
  border: none;
  padding: 0;
}

.req-card ul {
  margin: 0;
  padding-left: 18px;
}

.req-card li {
  font-size: 13px;
  margin: 5px 0;
}

.recommend-os {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  margin-bottom: 10px;
}

.recommend-os strong {
  display: block;
  font-size: 16px;
  color: #67c23a;
  margin-bottom: 5px;
}

.recommend-os span {
  font-size: 12px;
  color: #909399;
}

.os-note {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin: 0;
}

.deploy-content {
  padding: 20px 0;
}

.step-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #ebeef5;
}

.step-section:last-child {
  border-bottom: none;
}

.os-tabs {
  margin: 15px 0;
}

.code-block {
  background: #1e1e1e;
  border-radius: 8px;
  margin: 15px 0;
  overflow: hidden;
}

.code-block.small {
  margin: 10px 0;
}

.code-block.small pre {
  font-size: 12px;
  padding: 10px;
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

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border-radius: 8px;
  margin: 15px 0;
  font-size: 14px;
}

.tip-box.success {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  color: #67c23a;
}

.tip-box.warning {
  background: #fdf6ec;
  border: 1px solid #faecd8;
  color: #e6a23c;
}

.tip-box.info {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  color: #409eff;
}

.software-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 15px 0;
}

.software-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.software-name {
  font-weight: 600;
  color: #303133;
  min-width: 120px;
}

.software-version {
  color: #409eff;
  font-size: 13px;
}

.software-desc {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.deploy-steps {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 15px 0;
}

.deploy-steps h4 {
  margin: 0 0 15px;
  color: #303133;
}

.auto-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.step-num {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.account-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-top: 15px;
}

.account-card {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.account-card.primary {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.account-card.primary h4 {
  color: white;
}

.account-card.primary code {
  background: rgba(255,255,255,0.2);
  color: white;
}

.account-card h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #303133;
}

.account-card p {
  margin: 5px 0;
  font-size: 13px;
}

.command-list {
  display: grid;
  gap: 10px;
  margin-top: 15px;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.command-name {
  min-width: 150px;
  color: #606266;
}

.command-item code {
  flex: 1;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px 12px;
  border-radius: 4px;
}

.faq-content {
  padding: 10px 0;
}

.faq-content p {
  margin: 8px 0;
}

.faq-content ul, .faq-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

@media (max-width: 1200px) {
  .account-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .requirements {
    grid-template-columns: 1fr;
  }

  .software-list {
    grid-template-columns: 1fr;
  }

  .account-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .license-steps {
    grid-template-columns: 1fr;
  }
}

/* 授权码激活样式 */
.license-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.license-step {
  display: flex;
  gap: 12px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.license-num {
  width: 28px;
  height: 28px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.license-content h4 {
  margin: 0 0 5px;
  font-size: 14px;
  color: #303133;
}

.license-content p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.contact-box {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 20px;
  border-radius: 12px;
  margin: 20px 0;
}

.contact-box h4 {
  margin: 0 0 10px;
  color: #303133;
}

.contact-box > p {
  margin: 0 0 15px;
  font-size: 14px;
}

.contact-items {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.contact-items .contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.contact-items .contact-item .el-icon {
  color: #409eff;
}

.online-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #07c160;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
}

.online-btn:hover {
  background: #06ae56;
  transform: translateY(-2px);
}
</style>

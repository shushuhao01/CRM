<template>
  <div class="help-content">
    <h1>数据库配置</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Coin /></el-icon>
        <div class="intro-text">
          <p>云客CRM系统使用 MySQL 数据库存储数据。本文档将指导您完成数据库的安装、配置和初始化。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Download /></el-icon> MySQL安装</h2>

      <el-tabs v-model="installMethod" type="border-card">
        <el-tab-pane label="🖥️ 宝塔面板安装（推荐）" name="bt">
          <div class="install-content">
            <h3>步骤说明</h3>
            <ol>
              <li>登录宝塔面板</li>
              <li>点击左侧菜单「软件商店」</li>
              <li>在搜索框输入 <code>mysql</code></li>
              <li>找到 <strong>MySQL 8.0</strong>（或 5.7），点击「安装」</li>
              <li>选择「极速安装」，等待安装完成（约5-8分钟）</li>
            </ol>

            <div class="tip-box success">
              <el-icon><SuccessFilled /></el-icon>
              <span>宝塔面板会自动配置 MySQL，无需手动设置</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Ubuntu/Debian" name="ubuntu">
          <div class="install-content">
            <div class="code-block">
              <div class="code-header">
                <span>Shell</span>
                <el-button size="small" text @click="copyCode('ubuntu-mysql')">复制</el-button>
              </div>
              <pre id="ubuntu-mysql"># 更新软件源
apt-get update

# 安装MySQL 8.0
apt-get install -y mysql-server

# 启动服务
systemctl start mysql
systemctl enable mysql

# 安全配置（设置root密码等）
mysql_secure_installation</pre>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="CentOS" name="centos">
          <div class="install-content">
            <div class="code-block">
              <div class="code-header">
                <span>Shell</span>
                <el-button size="small" text @click="copyCode('centos-mysql')">复制</el-button>
              </div>
              <pre id="centos-mysql"># 安装MySQL 8.0
yum install -y mysql-server

# 启动服务
systemctl start mysqld
systemctl enable mysqld

# 获取临时密码
grep 'temporary password' /var/log/mysqld.log

# 安全配置
mysql_secure_installation</pre>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section>
      <h2><el-icon><Plus /></el-icon> 创建数据库</h2>

      <el-tabs v-model="createMethod" type="border-card">
        <el-tab-pane label="🖥️ 宝塔面板创建（推荐）" name="bt">
          <div class="create-content">
            <h3>操作步骤</h3>
            <ol>
              <li>在宝塔面板点击左侧菜单「数据库」</li>
              <li>点击「添加数据库」按钮</li>
              <li>填写信息：
                <ul>
                  <li>数据库名：<code>crm_db</code></li>
                  <li>用户名：<code>crm_user</code></li>
                  <li>密码：点击「生成密码」自动生成强密码</li>
                  <li>访问权限：选择「本地服务器」</li>
                </ul>
              </li>
              <li><strong>重要：</strong>复制并保存生成的密码！</li>
              <li>点击「提交」创建数据库</li>
            </ol>

            <div class="tip-box warning">
              <el-icon><WarningFilled /></el-icon>
              <span>请务必保存数据库密码，后续配置 backend/.env 时需要使用</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="命令行创建" name="cli">
          <div class="create-content">
            <div class="code-block">
              <div class="code-header">
                <span>MySQL</span>
                <el-button size="small" text @click="copyCode('create-db')">复制</el-button>
              </div>
              <pre id="create-db"># 登录MySQL
mysql -u root -p

# 创建数据库（使用utf8mb4字符集）
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（请修改密码）
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'your_strong_password';

# 授权
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;</pre>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section>
      <h2><el-icon><Upload /></el-icon> 导入数据库结构</h2>

      <el-tabs v-model="importMethod" type="border-card">
        <el-tab-pane label="🖥️ 宝塔面板导入（推荐）" name="bt">
          <div class="import-content">
            <ol>
              <li>在数据库列表中找到 <code>crm_db</code></li>
              <li>点击右侧「管理」按钮，进入 phpMyAdmin</li>
              <li>点击顶部「导入」标签</li>
              <li>点击「选择文件」，选择项目中的 <code>database/schema.sql</code></li>
              <li>点击「执行」按钮</li>
              <li>等待导入完成，应该看到多个表被创建</li>
            </ol>

            <div class="tip-box success">
              <el-icon><SuccessFilled /></el-icon>
              <span>导入成功后，可以在左侧看到 users、customers、orders 等表</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="命令行导入" name="cli">
          <div class="import-content">
            <div class="code-block">
              <div class="code-header">
                <span>Shell</span>
                <el-button size="small" text @click="copyCode('import-sql')">复制</el-button>
              </div>
              <pre id="import-sql"># 进入项目目录
cd /www/wwwroot/CRM

# 导入数据库结构
mysql -u crm_user -p crm_db &lt; database/schema.sql</pre>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 配置后端连接</h2>
      <p>在 <code>backend/.env</code> 文件中配置数据库连接信息：</p>

      <div class="code-block">
        <div class="code-header">
          <span>backend/.env</span>
          <el-button size="small" text @click="copyCode('env-db')">复制</el-button>
        </div>
        <pre id="env-db"># 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=您的数据库密码  # ← 填写创建数据库时保存的密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00</pre>
      </div>
    </section>

    <section>
      <h2><el-icon><DocumentCopy /></el-icon> 数据备份</h2>

      <h3>手动备份</h3>
      <div class="code-block">
        <pre># 备份数据库
mysqldump -u crm_user -p crm_db &gt; backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u crm_user -p crm_db &lt; backup_20240101.sql</pre>
      </div>

      <h3>宝塔面板备份</h3>
      <ol>
        <li>在宝塔面板点击「计划任务」</li>
        <li>添加任务，类型选择「备份数据库」</li>
        <li>选择要备份的数据库 <code>crm_db</code></li>
        <li>设置执行周期（建议每天凌晨2点）</li>
        <li>设置保留份数（建议保留7份）</li>
      </ol>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 常见问题</h2>
      <el-collapse accordion>
        <el-collapse-item title="连接数据库失败" name="1">
          <div class="faq-content">
            <p><strong>检查步骤：</strong></p>
            <ul>
              <li>确认 MySQL 服务已启动</li>
              <li>确认用户名和密码正确</li>
              <li>确认数据库名正确</li>
              <li>确认用户有访问权限</li>
              <li>如果是远程连接，检查防火墙是否开放 3306 端口</li>
            </ul>
          </div>
        </el-collapse-item>
        <el-collapse-item title="字符集/乱码问题" name="2">
          <div class="faq-content">
            <p>确保数据库使用 <code>utf8mb4</code> 字符集，支持 emoji 等特殊字符。</p>
            <p>如果已有数据库字符集不对，可以执行：</p>
            <div class="code-block small">
              <pre>ALTER DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;</pre>
            </div>
          </div>
        </el-collapse-item>
        <el-collapse-item title="导入 SQL 文件失败" name="3">
          <div class="faq-content">
            <p><strong>可能原因：</strong></p>
            <ul>
              <li>SQL 文件过大，超过 phpMyAdmin 上传限制</li>
              <li>SQL 语法与 MySQL 版本不兼容</li>
            </ul>
            <p><strong>解决方案：</strong></p>
            <ul>
              <li>使用命令行导入（无大小限制）</li>
              <li>在宝塔面板调整 PHP 上传限制</li>
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
  Coin, Download, Plus, Upload, Setting, DocumentCopy, QuestionFilled,
  SuccessFilled, WarningFilled
} from '@element-plus/icons-vue'

const installMethod = ref('bt')
const createMethod = ref('bt')
const importMethod = ref('bt')

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
  font-size: 16px;
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

.install-content, .create-content, .import-content {
  padding: 15px 0;
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
  padding: 10px;
  font-size: 12px;
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
</style>

<template>
  <div class="help-content">
    <h1>环境要求</h1>
    <section>
      <h2>服务器配置</h2>
      <h3>最低配置</h3>
      <ul>
        <li>CPU：2核</li>
        <li>内存：4GB</li>
        <li>硬盘：50GB</li>
        <li>带宽：5Mbps</li>
      </ul>
      <h3>推荐配置</h3>
      <ul>
        <li>CPU：4核</li>
        <li>内存：8GB</li>
        <li>硬盘：100GB SSD</li>
        <li>带宽：10Mbps</li>
      </ul>
    </section>
    <section>
      <h2>操作系统</h2>
      <div class="recommend-box">
        <el-icon><Star /></el-icon>
        <div>
          <strong>推荐系统</strong>
          <p>Ubuntu 24.04.3 LTS (Noble Numbat) x86_64</p>
        </div>
      </div>
      <h3>支持的操作系统</h3>
      <ul>
        <li><strong>Ubuntu 24.04 LTS</strong>（强烈推荐）</li>
        <li>Ubuntu 22.04 / 20.04 LTS</li>
        <li>Debian 11 / 12</li>
        <li>CentOS 7.x / 8.x</li>
        <li>Windows Server 2016+（不推荐）</li>
      </ul>
    </section>
    <section>
      <h2>软件环境</h2>
      <el-table :data="software" stripe style="width: 100%">
        <el-table-column prop="name" label="软件" width="150" />
        <el-table-column prop="version" label="版本要求" width="150" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>
    <section>
      <h2>端口要求</h2>
      <ul>
        <li><strong>80</strong>：HTTP访问</li>
        <li><strong>443</strong>：HTTPS访问</li>
        <li><strong>3000</strong>：后端API服务</li>
        <li><strong>3306</strong>：MySQL数据库</li>
      </ul>
    </section>
    <section>
      <h2>网络要求</h2>
      <ul>
        <li>服务器需要能访问外网（用于物流API等）</li>
        <li>建议配置域名和SSL证书</li>
        <li>如需APP使用，需要公网IP或域名</li>
      </ul>
    </section>
  </div>
</template>
<script setup lang="ts">
import { Star } from '@element-plus/icons-vue'

const software = [
  { name: 'Node.js', version: '18.x 或 20.x', description: 'JavaScript运行时' },
  { name: 'MySQL', version: '5.7+ 或 8.0+', description: '关系型数据库' },
  { name: 'Nginx', version: '1.18+', description: 'Web服务器/反向代理' },
  { name: 'PM2', version: '最新版', description: 'Node.js进程管理' },
  { name: 'Python', version: '3.7+', description: '部分工具依赖（可选）' },
  { name: 'Git', version: '最新版', description: '版本控制（可选）' }
]
</script>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }

.recommend-box {
  display: flex;
  gap: 15px;
  padding: 15px 20px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border: 1px solid #b3e19d;
  border-radius: 8px;
  margin: 15px 0;
  align-items: center;
}

.recommend-box .el-icon {
  font-size: 28px;
  color: #67c23a;
}

.recommend-box strong {
  color: #67c23a;
  display: block;
  margin-bottom: 3px;
}

.recommend-box p {
  margin: 0;
  color: #303133;
  font-weight: 500;
}
</style>

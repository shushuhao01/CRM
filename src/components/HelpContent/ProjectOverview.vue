<template>
  <div class="help-content">
    <h1>系统概述</h1>

    <section class="intro-section">
      <h2>什么是云客CRM系统？</h2>
      <p>
        云客CRM系统是一个全面的客户关系管理平台，专为现代企业的销售团队设计。系统集成了客户管理、订单处理、业绩统计、物流跟踪等核心功能，帮助企业提升销售效率，优化客户服务体验。
      </p>
    </section>

    <section class="value-section">
      <h2>核心价值</h2>
      <div class="value-grid">
        <div class="value-card">
          <div class="value-icon">📊</div>
          <h3>数据驱动</h3>
          <p>通过数据分析和可视化图表，帮助管理层做出明智的业务决策</p>
        </div>
        <div class="value-card">
          <div class="value-icon">⚡</div>
          <h3>效率提升</h3>
          <p>自动化工作流程，减少重复性工作，提升团队整体工作效率</p>
        </div>
        <div class="value-card">
          <div class="value-icon">👥</div>
          <h3>团队协作</h3>
          <p>统一的平台促进团队成员之间的信息共享和协作</p>
        </div>
        <div class="value-card">
          <div class="value-icon">🔔</div>
          <h3>实时通知</h3>
          <p>订单状态变更、审核提醒等实时推送，不错过任何重要信息</p>
        </div>
        <div class="value-card">
          <div class="value-icon">📱</div>
          <h3>移动办公</h3>
          <p>配套移动APP，支持外出办公、移动外呼、实时同步</p>
        </div>
        <div class="value-card">
          <div class="value-icon">🔐</div>
          <h3>权限管理</h3>
          <p>精细化的角色权限控制，确保数据安全和业务合规</p>
        </div>
      </div>
    </section>

    <section class="module-section">
      <h2>系统模块</h2>
      <p>云客CRM系统包含以下核心功能模块：</p>
      <div class="module-list">
        <div class="module-item">
          <span class="module-icon">📈</span>
          <div class="module-info">
            <h4>数据看板</h4>
            <p>实时展示销售数据、订单统计、业绩排名等关键指标</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">👤</span>
          <div class="module-info">
            <h4>客户管理</h4>
            <p>客户信息管理、分组标签、跟进记录、客户画像</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">🛒</span>
          <div class="module-info">
            <h4>订单管理</h4>
            <p>订单创建、审核流程、状态跟踪、订单统计</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">📞</span>
          <div class="module-info">
            <h4>服务管理</h4>
            <p>通话管理、短信管理、外呼任务、录音回放</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">📊</span>
          <div class="module-info">
            <h4>业绩统计</h4>
            <p>个人业绩、团队业绩、业绩分析、排名对比</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">🚚</span>
          <div class="module-info">
            <h4>物流管理</h4>
            <p>发货管理、物流跟踪、状态更新、物流公司配置</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">🎧</span>
          <div class="module-info">
            <h4>售后管理</h4>
            <p>售后工单、退换货处理、售后数据分析</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">📁</span>
          <div class="module-info">
            <h4>资料管理</h4>
            <p>客户资料、数据导入导出、资料分配、回收站</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">💰</span>
          <div class="module-info">
            <h4>财务管理</h4>
            <p>绩效数据、提成计算、阶梯提成配置</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">📦</span>
          <div class="module-info">
            <h4>商品管理</h4>
            <p>商品信息、库存管理、分类管理、商品分析、虚拟商品（卡密/网盘资源）</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">💬</span>
          <div class="module-info">
            <h4>企微管理</h4>
            <p>客户同步、会话存档、AI助手、渠道活码、客户群、话术库、敏感词监控</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">📬</span>
          <div class="module-info">
            <h4>消息通知</h4>
            <p>站内消息、系统公告、通知订阅、消息已读、短信模板与自动发送</p>
          </div>
        </div>
        <div class="module-item">
          <span class="module-icon">⚙️</span>
          <div class="module-info">
            <h4>系统管理</h4>
            <p>部门管理、用户管理、角色权限、系统设置</p>
          </div>
        </div>
      </div>
    </section>

    <section class="role-section">
      <h2>用户角色</h2>
      <p>系统支持多种用户角色，每种角色拥有不同的权限范围：</p>
      <el-table :data="roleData" stripe style="width: 100%">
        <el-table-column prop="role" label="角色" width="150" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="dataScope" label="数据范围" width="150" />
      </el-table>
    </section>

    <section class="version-section">
      <h2>版本说明</h2>
      <div class="version-info">
        <div class="version-item">
          <h4>私有部署版</h4>
          <p>适合对数据安全有较高要求的企业，可部署在自有服务器上，完全掌控数据。</p>
          <ul>
            <li>完整源代码</li>
            <li>自主部署维护</li>
            <li>数据完全私有</li>
            <li>支持二次开发</li>
          </ul>
        </div>
        <div class="version-item">
          <h4>SaaS版本</h4>
          <p>适合快速上手的企业，无需部署，注册即用，按需付费。</p>
          <ul>
            <li>即开即用</li>
            <li>自动更新升级</li>
            <li>专业运维保障</li>
            <li>灵活套餐选择</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="help-link-section">
      <h2>帮助中心公开访问</h2>
      <p>您可以将以下链接分享给客户或发布到公众号，无需登录即可访问帮助文档：</p>
      <div class="help-link-card">
        <div class="link-info">
          <el-icon><Link /></el-icon>
          <div>
            <span class="link-label">公开帮助中心地址</span>
            <a :href="publicHelpUrl" target="_blank" class="link-url">{{ publicHelpUrl }}</a>
          </div>
        </div>
        <div class="link-actions">
          <el-button type="primary" size="small" @click="copyHelpUrl">
            <el-icon><CopyDocument /></el-icon>
            复制链接
          </el-button>
          <el-button size="small" @click="openHelpUrl">
            <el-icon><View /></el-icon>
            打开
          </el-button>
        </div>
      </div>
      <div class="link-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>此链接为公开访问，访客只能查看帮助文档，无法访问系统其他功能</span>
      </div>
    </section>

    <section class="contact-section">
      <h2>技术支持</h2>
      <p>如有任何问题，请通过以下方式联系我们：</p>
      <div class="contact-info">
        <div class="contact-item">
          <el-icon><Message /></el-icon>
          <div>
            <span class="contact-label">邮箱</span>
            <a href="mailto:xianhuquwang@163.com">xianhuquwang@163.com</a>
          </div>
        </div>
        <div class="contact-item">
          <el-icon><Phone /></el-icon>
          <div>
            <span class="contact-label">电话</span>
            <a href="tel:13570727364">135-7072-7364</a>
          </div>
        </div>
        <div class="contact-item clickable" @click="showServiceDialog = true">
          <el-icon><ChatDotRound /></el-icon>
          <div>
            <span class="contact-label">在线客服</span>
            <span class="contact-link">点击咨询 →</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 客服弹窗 -->
    <el-dialog
      v-model="showServiceDialog"
      title="联系客服"
      width="360px"
      :append-to-body="true"
      class="service-dialog"
    >
      <div class="service-content">
        <div class="qr-wrapper">
          <img src="/images/kefuQR.png" alt="微信客服二维码" />
        </div>
        <p class="qr-tip">微信扫一扫，添加专属客服</p>
        <div class="divider">
          <span>或</span>
        </div>
        <a
          href="https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25"
          target="_blank"
          class="chat-btn"
        >
          <el-icon><ChatLineRound /></el-icon>
          <span>点击在线咨询</span>
        </a>
        <p class="work-time">工作时间：周一至周五 9:00-18:00</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Message, Phone, ChatDotRound, ChatLineRound, Link, CopyDocument, View, InfoFilled } from '@element-plus/icons-vue'

const showServiceDialog = ref(false)

// 计算公开帮助中心的URL
const publicHelpUrl = computed(() => {
  const origin = window.location.origin
  return `${origin}/public-help`
})

// 复制帮助中心链接
const copyHelpUrl = () => {
  navigator.clipboard.writeText(publicHelpUrl.value)
    .then(() => {
      ElMessage.success('链接已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
}

// 打开帮助中心
const openHelpUrl = () => {
  window.open(publicHelpUrl.value, '_blank')
}

const roleData = [
  { role: '超级管理员', description: '拥有系统全部权限，可管理所有功能和数据', dataScope: '全部数据' },
  { role: '管理员', description: '拥有大部分管理权限，可管理业务数据和用户', dataScope: '全部数据' },
  { role: '部门经理', description: '管理本部门的业务数据和团队成员', dataScope: '本部门数据' },
  { role: '销售员', description: '管理个人客户和订单，查看个人业绩', dataScope: '个人数据' },
  { role: '客服', description: '处理订单审核、物流发货、售后服务等工作', dataScope: '全部数据' }
]
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
  margin: 30px 0 15px;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 10px 0;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 8px 0;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

section {
  margin-bottom: 40px;
}

.intro-section p {
  font-size: 16px;
  line-height: 2;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.value-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.value-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.value-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.value-card p {
  font-size: 14px;
  color: #909399;
}

.module-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.module-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.module-icon {
  font-size: 28px;
  margin-right: 15px;
}

.module-info h4 {
  margin: 0 0 5px;
}

.module-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.version-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.version-item {
  background: #f5f7fa;
  border-radius: 12px;
  padding: 25px;
  border: 1px solid #e4e7ed;
}

.version-item h4 {
  color: #409eff;
  font-size: 18px;
  margin-bottom: 10px;
}

.version-item ul {
  margin: 15px 0 0;
  padding-left: 20px;
}

.version-item li {
  margin: 8px 0;
  color: #606266;
}

.contact-info {
  background: #ecf5ff;
  border-radius: 12px;
  padding: 20px;
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: white;
  border-radius: 8px;
  transition: all 0.3s;
}

.contact-item.clickable {
  cursor: pointer;
}

.contact-item.clickable:hover {
  background: #f0f9ff;
  transform: translateX(5px);
}

.contact-item .el-icon {
  font-size: 24px;
  color: #409eff;
}

.contact-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.contact-item a {
  color: #303133;
  text-decoration: none;
  font-weight: 500;
}

.contact-item a:hover {
  color: #409eff;
}

.contact-link {
  color: #409eff;
  font-weight: 500;
}

/* 客服弹窗样式 */
.service-content {
  text-align: center;
  padding: 10px 0;
}

.qr-wrapper {
  width: 180px;
  height: 180px;
  margin: 0 auto 15px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.qr-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-tip {
  font-size: 14px;
  color: #606266;
  margin: 0 0 15px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  padding: 0 12px;
  font-size: 12px;
  color: #909399;
}

.chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #07c160;
  color: white;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
}

.chat-btn:hover {
  background: #06ae56;
  transform: translateY(-2px);
}

.chat-btn .el-icon {
  font-size: 20px;
}

.work-time {
  margin: 15px 0 0;
  font-size: 12px;
  color: #909399;
}

/* 帮助链接样式 */
.help-link-section {
  margin-bottom: 40px;
}

.help-link-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 15px 0;
}

.link-info {
  display: flex;
  align-items: center;
  gap: 15px;
  color: white;
}

.link-info .el-icon {
  font-size: 32px;
  opacity: 0.9;
}

.link-label {
  display: block;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.link-url {
  color: white;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  word-break: break-all;
}

.link-url:hover {
  text-decoration: underline;
}

.link-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.link-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: #f0f9eb;
  border-radius: 6px;
  color: #67c23a;
  font-size: 13px;
}

@media (max-width: 768px) {
  .value-grid,
  .module-list,
  .version-info {
    grid-template-columns: 1fr;
  }

  .help-link-card {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .link-info {
    flex-direction: column;
  }

  .link-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>

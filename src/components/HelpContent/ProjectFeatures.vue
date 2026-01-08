<template>
  <div class="help-content">
    <h1>核心特性</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Star /></el-icon>
        <div class="intro-text">
          <p>云客CRM系统集成了客户管理、订单处理、业绩统计、物流跟踪等核心功能，通过智能化的工作流程和数据分析，帮助企业提升销售效率和客户满意度。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><DataAnalysis /></el-icon> 数据驱动决策</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>通过数据分析和可视化图表，帮助管理层做出明智的业务决策。系统提供实时的销售数据、订单统计、业绩排名等关键指标。</p>
        </div>
        <div class="feature-highlights">
          <div class="highlight-item">
            <div class="highlight-icon">📊</div>
            <div class="highlight-content">
              <h4>实时数据看板</h4>
              <p>销售额、订单量、转化率等核心指标实时展示</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon">📈</div>
            <div class="highlight-content">
              <h4>趋势分析</h4>
              <p>日/周/月业绩趋势图，直观了解业务走向</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon">🏆</div>
            <div class="highlight-content">
              <h4>业绩排名</h4>
              <p>个人和团队业绩排名，激励销售团队</p>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon">🎯</div>
            <div class="highlight-content">
              <h4>目标追踪</h4>
              <p>设定销售目标，实时追踪完成进度</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 自动化工作流</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>订单自动流转、物流状态自动更新、超时自动提醒等自动化功能，减少人工操作，提升工作效率。</p>
        </div>
        <div class="workflow-list">
          <div class="workflow-item">
            <div class="workflow-step">1</div>
            <div class="workflow-content">
              <h4>订单自动流转</h4>
              <p>订单创建后自动进入待审核队列，审核通过后自动流转到发货环节</p>
            </div>
          </div>
          <div class="workflow-item">
            <div class="workflow-step">2</div>
            <div class="workflow-content">
              <h4>物流状态同步</h4>
              <p>对接物流API，自动获取物流轨迹，实时更新订单状态</p>
            </div>
          </div>
          <div class="workflow-item">
            <div class="workflow-step">3</div>
            <div class="workflow-content">
              <h4>超时自动提醒</h4>
              <p>订单超时未处理、物流异常等情况自动发送提醒通知</p>
            </div>
          </div>
          <div class="workflow-item">
            <div class="workflow-step">4</div>
            <div class="workflow-content">
              <h4>业绩自动计算</h4>
              <p>订单签收后自动计算销售业绩和提成</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><User /></el-icon> 多角色权限管理</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>支持超级管理员、管理员、部门经理、销售员、客服等多种角色，每种角色拥有不同的权限范围，确保数据安全。</p>
        </div>
        <div class="role-cards">
          <div class="role-card">
            <div class="role-icon super-admin">👑</div>
            <h4>超级管理员</h4>
            <p>系统全部权限，可管理所有功能和数据</p>
          </div>
          <div class="role-card">
            <div class="role-icon admin">⚙️</div>
            <h4>管理员</h4>
            <p>业务管理权限，可管理用户和业务数据</p>
          </div>
          <div class="role-card">
            <div class="role-icon manager">📋</div>
            <h4>部门经理</h4>
            <p>部门数据权限，可查看和管理部门数据</p>
          </div>
          <div class="role-card">
            <div class="role-icon sales">💼</div>
            <h4>销售员</h4>
            <p>个人数据权限，管理自己的客户和订单</p>
          </div>
          <div class="role-card">
            <div class="role-icon service">🎧</div>
            <h4>客服</h4>
            <p>服务权限，处理订单审核和售后服务</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Bell /></el-icon> 实时消息通知</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>订单状态变更、审核提醒、超时提醒等实时推送，支持系统内消息、企业微信、钉钉等多种通知渠道。</p>
        </div>
        <div class="notification-types">
          <div class="notification-item">
            <el-icon><Message /></el-icon>
            <span>系统内消息</span>
          </div>
          <div class="notification-item">
            <el-icon><ChatDotRound /></el-icon>
            <span>企业微信</span>
          </div>
          <div class="notification-item">
            <el-icon><ChatLineRound /></el-icon>
            <span>钉钉通知</span>
          </div>
          <div class="notification-item">
            <el-icon><Iphone /></el-icon>
            <span>短信通知</span>
          </div>
        </div>
        <div class="notification-scenarios">
          <h4>通知场景</h4>
          <ul>
            <li>新订单创建通知</li>
            <li>订单审核结果通知</li>
            <li>物流状态变更通知</li>
            <li>订单超时提醒</li>
            <li>客户跟进提醒</li>
            <li>业绩目标达成通知</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Iphone /></el-icon> 移动办公支持</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>配套移动APP，支持外出办公、移动外呼、通话记录同步，随时随地处理业务。</p>
        </div>
        <div class="mobile-features">
          <div class="mobile-feature">
            <div class="mobile-icon">📱</div>
            <h4>移动外呼</h4>
            <p>一键拨打客户电话，通话记录自动同步</p>
          </div>
          <div class="mobile-feature">
            <div class="mobile-icon">📊</div>
            <h4>数据查看</h4>
            <p>随时查看客户信息、订单状态、业绩数据</p>
          </div>
          <div class="mobile-feature">
            <div class="mobile-icon">🔔</div>
            <h4>消息推送</h4>
            <p>实时接收系统通知，不错过重要信息</p>
          </div>
          <div class="mobile-feature">
            <div class="mobile-icon">📍</div>
            <h4>外勤打卡</h4>
            <p>支持外出拜访打卡，记录工作轨迹</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Tools /></el-icon> 灵活的系统配置</h2>
      <div class="feature-detail">
        <div class="feature-desc">
          <p>支持自定义订单字段、物流公司配置、通知规则配置等，满足不同企业的个性化需求。</p>
        </div>
        <div class="config-list">
          <div class="config-item">
            <el-icon><Document /></el-icon>
            <div>
              <h4>订单配置</h4>
              <p>自定义订单字段、审核流程、状态流转规则</p>
            </div>
          </div>
          <div class="config-item">
            <el-icon><Van /></el-icon>
            <div>
              <h4>物流配置</h4>
              <p>配置物流公司、运费模板、发货规则</p>
            </div>
          </div>
          <div class="config-item">
            <el-icon><Bell /></el-icon>
            <div>
              <h4>通知配置</h4>
              <p>配置通知渠道、通知规则、提醒时间</p>
            </div>
          </div>
          <div class="config-item">
            <el-icon><Money /></el-icon>
            <div>
              <h4>绩效配置</h4>
              <p>配置提成规则、阶梯提成、绩效系数</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Lock /></el-icon> 安全与稳定</h2>
      <div class="security-features">
        <div class="security-item">
          <div class="security-icon">🔐</div>
          <h4>数据加密</h4>
          <p>敏感数据加密存储，传输使用HTTPS</p>
        </div>
        <div class="security-item">
          <div class="security-icon">🛡️</div>
          <h4>权限控制</h4>
          <p>细粒度权限控制，数据隔离保护</p>
        </div>
        <div class="security-item">
          <div class="security-icon">📝</div>
          <h4>操作日志</h4>
          <p>完整的操作日志，可追溯审计</p>
        </div>
        <div class="security-item">
          <div class="security-icon">💾</div>
          <h4>数据备份</h4>
          <p>自动备份机制，数据安全可靠</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Star, DataAnalysis, Setting, User, Bell, Iphone, Tools, Lock,
  Message, ChatDotRound, ChatLineRound, Document, Van, Money
} from '@element-plus/icons-vue'
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

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 10px 0;
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

.feature-detail {
  margin-top: 15px;
}

.feature-desc {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.feature-desc p {
  margin: 0;
}

.feature-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.highlight-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.highlight-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.highlight-icon {
  font-size: 32px;
}

.highlight-content h4 {
  margin: 0 0 5px;
  color: #303133;
}

.highlight-content p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.workflow-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.workflow-step {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.workflow-content h4 {
  margin: 0 0 5px;
}

.workflow-content p {
  margin: 0;
  font-size: 14px;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
}

.role-card {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: transform 0.3s;
}

.role-card:hover {
  transform: translateY(-5px);
}

.role-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.role-card h4 {
  margin: 10px 0 5px;
  color: #303133;
}

.role-card p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.notification-types {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #ecf5ff;
  border-radius: 20px;
  color: #409eff;
  font-size: 14px;
}

.notification-scenarios {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.notification-scenarios h4 {
  margin: 0 0 15px;
  color: #303133;
}

.notification-scenarios ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.notification-scenarios li {
  padding-left: 20px;
  position: relative;
}

.notification-scenarios li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #67c23a;
}

.mobile-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.mobile-feature {
  text-align: center;
  padding: 25px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
}

.mobile-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.mobile-feature h4 {
  margin: 10px 0 5px;
  color: #303133;
}

.mobile-feature p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.config-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
}

.config-item {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.config-item .el-icon {
  font-size: 28px;
  color: #409eff;
}

.config-item h4 {
  margin: 0 0 5px;
}

.config-item p {
  margin: 0;
  font-size: 13px;
}

.security-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.security-item {
  text-align: center;
  padding: 25px;
  background: #f0f9eb;
  border-radius: 12px;
  border: 1px solid #e1f3d8;
}

.security-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.security-item h4 {
  margin: 10px 0 5px;
  color: #67c23a;
}

.security-item p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}
</style>

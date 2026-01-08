<template>
  <div class="help-content">
    <h1>业务逻辑说明</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Connection /></el-icon>
        <div class="intro-text">
          <p>云客CRM是一套专为电销团队设计的客户关系管理系统，核心业务围绕<strong>客户管理</strong>、<strong>订单处理</strong>、<strong>物流跟踪</strong>、<strong>业绩统计</strong>展开，帮助企业实现销售全流程数字化管理。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Promotion /></el-icon> 核心业务流程</h2>
      <p>系统的核心业务流程从客户录入开始，经过订单创建、审核、发货、签收，最终完成业绩结算。</p>

      <div class="main-flow">
        <div class="flow-step">
          <div class="step-icon">👤</div>
          <div class="step-info">
            <h4>客户录入</h4>
            <p>录入客户信息，建立客户档案</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-icon">📞</div>
          <div class="step-info">
            <h4>电话跟进</h4>
            <p>通过APP外呼跟进客户</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-icon">📝</div>
          <div class="step-info">
            <h4>创建订单</h4>
            <p>客户成交后创建订单</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-icon">✅</div>
          <div class="step-info">
            <h4>订单审核</h4>
            <p>客服审核订单信息</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-icon">📦</div>
          <div class="step-info">
            <h4>发货配送</h4>
            <p>审核通过后安排发货</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-icon">🎉</div>
          <div class="step-info">
            <h4>签收完成</h4>
            <p>客户签收，业绩生效</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Document /></el-icon> 订单状态流转</h2>
      <p>订单从创建到完成会经历多个状态，每个状态对应不同的操作权限。</p>

      <div class="status-flow-diagram">
        <div class="status-row main-flow-row">
          <div class="status-node pending-transfer">
            <span class="status-name">待流转</span>
            <span class="status-desc">订单创建后的初始状态</span>
          </div>
          <div class="status-arrow-right">→</div>
          <div class="status-node pending-audit">
            <span class="status-name">待审核</span>
            <span class="status-desc">自动流转或手动提审后</span>
          </div>
          <div class="status-arrow-right">→</div>
          <div class="status-node pending-shipment">
            <span class="status-name">待发货</span>
            <span class="status-desc">审核通过，等待发货</span>
          </div>
          <div class="status-arrow-right">→</div>
          <div class="status-node shipped">
            <span class="status-name">已发货</span>
            <span class="status-desc">已填写物流单号</span>
          </div>
          <div class="status-arrow-right">→</div>
          <div class="status-node delivered">
            <span class="status-name">已签收</span>
            <span class="status-desc">客户已签收，订单完成</span>
          </div>
        </div>
      </div>

      <h3>异常状态处理</h3>
      <div class="exception-status">
        <div class="exception-item">
          <el-tag type="danger" effect="dark">审核拒绝</el-tag>
          <span>订单信息有误，可修改后重新提审</span>
        </div>
        <div class="exception-item">
          <el-tag type="warning" effect="dark">拒收</el-tag>
          <span>客户拒收包裹，需要处理退回</span>
        </div>
        <div class="exception-item">
          <el-tag type="warning" effect="dark">物流退回</el-tag>
          <span>物流异常导致包裹退回</span>
        </div>
        <div class="exception-item">
          <el-tag type="info" effect="dark">已取消</el-tag>
          <span>订单已取消，不再处理</span>
        </div>
        <div class="exception-item">
          <el-tag type="warning" effect="dark">已建售后</el-tag>
          <span>订单已创建售后工单</span>
        </div>
      </div>

      <h3>状态操作权限</h3>
      <el-table :data="statusPermissions" stripe border>
        <el-table-column prop="status" label="订单状态" width="120" />
        <el-table-column prop="canEdit" label="可编辑" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.canEdit" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="canSubmit" label="可提审" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.canSubmit" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="canCancel" label="可取消" width="80" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.canCancel" color="#67c23a"><Check /></el-icon>
            <el-icon v-else color="#f56c6c"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>

    <section>
      <h2><el-icon><Grid /></el-icon> 功能模块说明</h2>

      <div class="module-grid">
        <div class="module-card">
          <div class="module-header">
            <el-icon><Odometer /></el-icon>
            <h4>数据看板</h4>
          </div>
          <ul>
            <li>今日订单数、销售额统计</li>
            <li>本月业绩、签收业绩</li>
            <li>待审核、待发货订单数</li>
            <li>业绩趋势图表</li>
            <li>业绩排名展示</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><User /></el-icon>
            <h4>客户管理</h4>
          </div>
          <ul>
            <li>客户信息录入与维护</li>
            <li>客户分组与标签管理</li>
            <li>跟进记录管理</li>
            <li>客户数据导入导出</li>
            <li>客户分配与转移</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><ShoppingCart /></el-icon>
            <h4>订单管理</h4>
          </div>
          <ul>
            <li>订单创建与编辑</li>
            <li>订单状态流转</li>
            <li>订单审核（客服）</li>
            <li>订单标记（正常/预留/退单）</li>
            <li>批量操作与导出</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><Phone /></el-icon>
            <h4>服务管理</h4>
          </div>
          <ul>
            <li>通话记录管理</li>
            <li>录音回放</li>
            <li>跟进记录</li>
            <li>短信管理</li>
            <li>外呼任务</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><TrendCharts /></el-icon>
            <h4>业绩统计</h4>
          </div>
          <ul>
            <li>个人业绩查看</li>
            <li>团队业绩排名</li>
            <li>业绩分析报表</li>
            <li>业绩分享功能</li>
            <li>下单/签收业绩统计</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><Van /></el-icon>
            <h4>物流管理</h4>
          </div>
          <ul>
            <li>发货列表管理</li>
            <li>物流轨迹查询</li>
            <li>物流状态更新</li>
            <li>物流公司配置</li>
            <li>批量发货操作</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><Service /></el-icon>
            <h4>售后管理</h4>
          </div>
          <ul>
            <li>售后工单创建</li>
            <li>退换货处理</li>
            <li>售后状态跟踪</li>
            <li>售后数据统计</li>
          </ul>
        </div>

        <div class="module-card">
          <div class="module-header">
            <el-icon><Money /></el-icon>
            <h4>财务管理</h4>
          </div>
          <ul>
            <li>绩效数据查看</li>
            <li>提成规则配置</li>
            <li>阶梯提成设置</li>
            <li>绩效系数管理</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><UserFilled /></el-icon> 角色权限体系</h2>
      <p>系统采用基于角色的权限控制，不同角色拥有不同的数据访问范围和操作权限。</p>

      <div class="role-table">
        <el-table :data="roleData" stripe border>
          <el-table-column prop="role" label="角色" width="120" />
          <el-table-column prop="dataScope" label="数据范围" width="120" />
          <el-table-column prop="mainPermissions" label="主要权限" />
          <el-table-column prop="description" label="说明" width="200" />
        </el-table>
      </div>
    </section>

    <section>
      <h2><el-icon><Iphone /></el-icon> 移动APP功能</h2>
      <p>云客CRM移动APP是专为销售人员设计的外呼助手，主要功能包括：</p>

      <div class="app-features">
        <div class="app-feature">
          <div class="feature-icon">📱</div>
          <div class="feature-info">
            <h4>首页</h4>
            <p>今日通话统计、快捷拨号入口</p>
          </div>
        </div>
        <div class="app-feature">
          <div class="feature-icon">📞</div>
          <div class="feature-info">
            <h4>通话记录</h4>
            <p>查看所有通话记录，支持录音回放</p>
          </div>
        </div>
        <div class="app-feature">
          <div class="feature-icon">📊</div>
          <div class="feature-info">
            <h4>统计</h4>
            <p>个人通话统计数据</p>
          </div>
        </div>
        <div class="app-feature">
          <div class="feature-icon">⚙️</div>
          <div class="feature-info">
            <h4>设置</h4>
            <p>服务器配置、账号管理</p>
          </div>
        </div>
        <div class="app-feature">
          <div class="feature-icon">🔢</div>
          <div class="feature-info">
            <h4>拨号盘</h4>
            <p>手动输入号码拨打电话</p>
          </div>
        </div>
        <div class="app-feature">
          <div class="feature-icon">📷</div>
          <div class="feature-info">
            <h4>扫码绑定</h4>
            <p>扫描Web端二维码快速登录</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><DataLine /></el-icon> 数据流转逻辑</h2>

      <div class="data-flow-section">
        <div class="data-flow-item">
          <h4>客户数据流</h4>
          <div class="flow-content">
            <p>客户信息录入 → 分配给销售员 → 销售跟进 → 创建订单 → 订单关联客户</p>
            <ul>
              <li>客户归属销售员，销售员只能看到自己的客户</li>
              <li>部门经理可以看到本部门所有客户</li>
              <li>管理员可以进行客户转移和重新分配</li>
            </ul>
          </div>
        </div>

        <div class="data-flow-item">
          <h4>订单数据流</h4>
          <div class="flow-content">
            <p>创建订单 → 自动/手动流转 → 客服审核 → 物流发货 → 签收确认 → 业绩结算</p>
            <ul>
              <li>订单创建后默认30分钟自动流转到审核</li>
              <li>预留单和退单需要手动提审</li>
              <li>审核通过后进入发货流程</li>
              <li>签收后业绩自动计入销售员名下</li>
            </ul>
          </div>
        </div>

        <div class="data-flow-item">
          <h4>业绩数据流</h4>
          <div class="flow-content">
            <p>订单签收 → 业绩生效 → 提成计算 → 绩效统计</p>
            <ul>
              <li>业绩按订单签收时间统计</li>
              <li>支持阶梯提成规则</li>
              <li>可设置绩效系数调整</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Lock /></el-icon> 数据安全机制</h2>

      <div class="security-list">
        <div class="security-item">
          <el-icon><Key /></el-icon>
          <div>
            <h4>权限隔离</h4>
            <p>用户只能访问权限范围内的数据，销售员看个人数据，经理看部门数据</p>
          </div>
        </div>
        <div class="security-item">
          <el-icon><Document /></el-icon>
          <div>
            <h4>操作日志</h4>
            <p>所有重要操作都有日志记录，可追溯审计</p>
          </div>
        </div>
        <div class="security-item">
          <el-icon><CircleCheck /></el-icon>
          <div>
            <h4>敏感信息保护</h4>
            <p>客户手机号等敏感信息脱敏显示，需要权限才能查看完整信息</p>
          </div>
        </div>
        <div class="security-item">
          <el-icon><Refresh /></el-icon>
          <div>
            <h4>数据备份</h4>
            <p>系统自动备份数据，删除的数据进入回收站可恢复</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Connection, Promotion, Document, Grid, UserFilled, Iphone, DataLine, Lock,
  Odometer, User, ShoppingCart, Phone, TrendCharts, Van, Service, Money,
  Check, Close, Key, Refresh, CircleCheck
} from '@element-plus/icons-vue'

// 订单状态操作权限数据
const statusPermissions = [
  { status: '待流转', canEdit: true, canSubmit: true, canCancel: true, description: '订单创建后的初始状态，可以编辑、提审或取消' },
  { status: '待审核', canEdit: false, canSubmit: false, canCancel: true, description: '等待客服审核，可以撤回后再编辑' },
  { status: '审核拒绝', canEdit: true, canSubmit: true, canCancel: true, description: '审核未通过，可修改后重新提审' },
  { status: '待发货', canEdit: false, canSubmit: false, canCancel: false, description: '审核通过，等待物流发货' },
  { status: '已发货', canEdit: false, canSubmit: false, canCancel: false, description: '已填写物流单号，等待签收' },
  { status: '已签收', canEdit: false, canSubmit: false, canCancel: false, description: '订单完成，业绩已生效' }
]

// 角色权限数据
const roleData = [
  { role: '超级管理员', dataScope: '全部数据', mainPermissions: '系统全部功能和数据', description: '系统最高权限' },
  { role: '管理员', dataScope: '全部数据', mainPermissions: '业务管理、用户管理、系统设置', description: '企业管理角色' },
  { role: '部门经理', dataScope: '本部门数据', mainPermissions: '客户、订单、业绩、团队管理', description: '部门管理角色' },
  { role: '销售员', dataScope: '个人数据', mainPermissions: '个人客户、订单、业绩查看', description: '一线销售角色' },
  { role: '客服', dataScope: '全部数据', mainPermissions: '订单审核、发货、售后处理', description: '客户服务角色' }
]
</script>

<style scoped>
.help-content {
  line-height: 1.8;
  color: #303133;
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

.intro-text strong {
  color: #ffd700;
}

/* 主流程图 */
.main-flow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin: 25px 0;
  padding: 25px;
  background: #f8f9fa;
  border-radius: 12px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 100px;
  flex: 1;
}

.step-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.step-info h4 {
  margin: 0 0 5px;
  color: #303133;
  font-size: 14px;
}

.step-info p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.flow-arrow {
  font-size: 24px;
  color: #409eff;
  font-weight: bold;
  align-self: center;
  margin-top: 20px;
}

/* 订单状态流转图 */
.status-flow-diagram {
  margin: 20px 0;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  overflow-x: auto;
}

.main-flow-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 20px;
  border-radius: 8px;
  min-width: 100px;
  text-align: center;
}

.status-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 5px;
}

.status-desc {
  font-size: 11px;
  opacity: 0.9;
}

.status-node.pending-transfer {
  background: #909399;
  color: white;
}

.status-node.pending-audit {
  background: #e6a23c;
  color: white;
}

.status-node.pending-shipment {
  background: #409eff;
  color: white;
}

.status-node.shipped {
  background: #36cfc9;
  color: white;
}

.status-node.delivered {
  background: #67c23a;
  color: white;
}

.status-arrow-right {
  font-size: 20px;
  color: #c0c4cc;
}

/* 异常状态 */
.exception-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.exception-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: #fafafa;
  border-radius: 8px;
}

.exception-item span {
  color: #606266;
  font-size: 14px;
}

/* 模块网格 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.module-card {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.module-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.module-header .el-icon {
  font-size: 24px;
  color: #409eff;
}

.module-header h4 {
  margin: 0;
  color: #303133;
}

.module-card ul {
  margin: 0;
  padding-left: 18px;
}

.module-card li {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
}

/* 角色表格 */
.role-table {
  margin: 20px 0;
}

/* APP功能 */
.app-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.app-feature {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
}

.feature-icon {
  font-size: 32px;
}

.feature-info h4 {
  margin: 0 0 5px;
  color: #303133;
}

.feature-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

/* 数据流转 */
.data-flow-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.data-flow-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid #409eff;
}

.data-flow-item h4 {
  margin: 0 0 10px;
  color: #409eff;
}

.flow-content p {
  margin: 0 0 10px;
  color: #303133;
  font-weight: 500;
}

.flow-content ul {
  margin: 0;
  padding-left: 18px;
}

.flow-content li {
  margin: 5px 0;
  font-size: 13px;
}

/* 安全机制 */
.security-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.security-item {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: #f0f9eb;
  border-radius: 12px;
  border: 1px solid #e1f3d8;
}

.security-item .el-icon {
  font-size: 28px;
  color: #67c23a;
}

.security-item h4 {
  margin: 0 0 5px;
  color: #303133;
}

.security-item p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

@media (max-width: 768px) {
  .main-flow {
    flex-direction: column;
    align-items: center;
  }

  .flow-arrow {
    transform: rotate(90deg);
    margin: 10px 0;
  }

  .main-flow-row {
    flex-direction: column;
  }

  .status-arrow-right {
    transform: rotate(90deg);
  }
}
</style>

<template>
  <div class="help-content">
    <h1>数据看板</h1>

    <section>
      <h2>功能概述</h2>
      <p>
        数据看板是系统的首页，提供实时的业务数据概览。通过可视化图表和统计卡片，帮助用户快速了解销售情况、订单状态、业绩排名等关键指标。
      </p>
    </section>

    <section>
      <h2>访问路径</h2>
      <div class="path-info">
        <span class="path-item">首页</span>
        <span class="path-arrow">→</span>
        <span class="path-item active">数据看板</span>
      </div>
      <p>登录系统后默认进入数据看板页面，也可点击左侧菜单"数据看板"进入。</p>
    </section>

    <section>
      <h2>页面布局</h2>
      <div class="layout-desc">
        <h3>1. 统计卡片区</h3>
        <p>页面顶部展示核心统计数据：</p>
        <ul>
          <li><strong>今日订单数</strong>：当天新增的订单数量</li>
          <li><strong>今日销售额</strong>：当天订单的总金额</li>
          <li><strong>待审核订单</strong>：等待审核的订单数量</li>
          <li><strong>待发货订单</strong>：已审核待发货的订单数量</li>
          <li><strong>本月业绩</strong>：当月累计销售业绩</li>
          <li><strong>客户总数</strong>：系统中的客户总数</li>
        </ul>

        <h3>2. 趋势图表区</h3>
        <p>展示业务数据的变化趋势：</p>
        <ul>
          <li><strong>销售趋势图</strong>：近7天/30天的销售额变化曲线</li>
          <li><strong>订单趋势图</strong>：近7天/30天的订单数量变化</li>
          <li><strong>客户增长图</strong>：新增客户数量趋势</li>
        </ul>

        <h3>3. 业绩排名区</h3>
        <p>展示销售人员的业绩排名：</p>
        <ul>
          <li><strong>日排名</strong>：当天销售业绩排名</li>
          <li><strong>周排名</strong>：本周销售业绩排名</li>
          <li><strong>月排名</strong>：本月销售业绩排名</li>
        </ul>

        <h3>4. 待办事项区</h3>
        <p>展示需要处理的待办任务：</p>
        <ul>
          <li>待审核的订单</li>
          <li>待发货的订单</li>
          <li>待跟进的客户</li>
          <li>待处理的售后</li>
        </ul>
      </div>
    </section>

    <section>
      <h2>数据范围说明</h2>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          不同角色看到的数据范围不同
        </template>
      </el-alert>
      <el-table :data="dataScopeData" stripe style="width: 100%; margin-top: 15px;">
        <el-table-column prop="role" label="角色" width="150" />
        <el-table-column prop="scope" label="数据范围" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>

    <section>
      <h2>操作指南</h2>
      <div class="operation-guide">
        <h3>切换时间范围</h3>
        <p>点击图表右上角的时间选择器，可切换查看不同时间段的数据：</p>
        <ul>
          <li>今日</li>
          <li>本周</li>
          <li>本月</li>
          <li>自定义时间范围</li>
        </ul>

        <h3>刷新数据</h3>
        <p>点击页面右上角的刷新按钮，可手动刷新看板数据。系统也会每5分钟自动刷新一次。</p>

        <h3>查看详情</h3>
        <p>点击统计卡片或图表，可跳转到对应的详情页面查看更多信息。</p>
      </div>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 为什么我看到的数据和同事不一样？" name="1">
          <p>A: 不同角色看到的数据范围不同。销售员只能看到自己的数据，部门经理可以看到本部门的数据，管理员可以看到全部数据。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 数据多久更新一次？" name="2">
          <p>A: 看板数据每5分钟自动刷新一次，您也可以点击刷新按钮手动更新。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何导出看板数据？" name="3">
          <p>A: 目前看板数据不支持直接导出，您可以进入对应的功能模块（如订单管理、业绩统计）进行数据导出。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const dataScopeData = [
  { role: '超级管理员', scope: '全部数据', description: '可查看公司所有部门、所有人员的数据' },
  { role: '管理员', scope: '全部数据', description: '可查看公司所有部门、所有人员的数据' },
  { role: '部门经理', scope: '本部门数据', description: '只能查看本部门成员的数据' },
  { role: '销售员', scope: '个人数据', description: '只能查看自己的数据' },
  { role: '客服', scope: '全部数据', description: '可查看全部订单和物流数据' }
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
  margin: 20px 0 10px;
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

.path-info {
  display: flex;
  align-items: center;
  margin: 15px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.path-item {
  padding: 5px 15px;
  background: #e4e7ed;
  border-radius: 4px;
  color: #606266;
}

.path-item.active {
  background: #409eff;
  color: white;
}

.path-arrow {
  margin: 0 10px;
  color: #909399;
}

.layout-desc {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.operation-guide {
  background: #f0f9eb;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e1f3d8;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.8;
}
</style>

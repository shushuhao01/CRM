<template>
  <div class="help-content-section">
    <h1>系统概述</h1>
    
    <div class="content-block">
      <h2>什么是智能销售CRM系统？</h2>
      <p>智能销售CRM系统是一个全面的客户关系管理平台，专为现代企业的销售团队设计。系统集成了客户管理、订单处理、业绩统计、物流跟踪等核心功能，帮助企业提升销售效率，优化客户服务体验。</p>
    </div>

    <div class="content-block">
      <h2>核心价值</h2>
      <div class="value-grid">
        <div class="value-item">
          <div class="value-icon">📊</div>
          <h3>数据驱动</h3>
          <p>通过数据分析和可视化图表，帮助管理层做出明智的业务决策</p>
        </div>
        <div class="value-item">
          <div class="value-icon">🚀</div>
          <h3>效率提升</h3>
          <p>自动化工作流程，减少重复性工作，提升团队整体工作效率</p>
        </div>
        <div class="value-item">
          <div class="value-icon">👥</div>
          <h3>团队协作</h3>
          <p>统一的平台促进团队成员之间的信息共享和协作</p>
        </div>
        <div class="value-item">
          <div class="value-icon">📱</div>
          <h3>移动办公</h3>
          <p>支持移动端访问，随时随地处理业务，不受地点限制</p>
        </div>
      </div>
    </div>

    <div class="content-block">
      <h2>技术特点</h2>
      <ul class="feature-list">
        <li><strong>现代化架构：</strong>基于Vue 3 + TypeScript构建，采用组件化开发模式</li>
        <li><strong>响应式设计：</strong>支持桌面端和移动端，适配各种屏幕尺寸</li>
        <li><strong>实时数据：</strong>支持实时数据更新和消息推送</li>
        <li><strong>权限管理：</strong>细粒度的权限控制，确保数据安全</li>
        <li><strong>可扩展性：</strong>模块化设计，便于功能扩展和维护</li>
      </ul>
    </div>

    <div class="content-block">
      <h2>适用场景</h2>
      <div class="scenario-list">
        <div class="scenario-item">
          <h4>中小型企业</h4>
          <p>快速建立客户管理体系，提升销售团队效率</p>
        </div>
        <div class="scenario-item">
          <h4>电商企业</h4>
          <p>完整的订单管理和物流跟踪，优化客户购买体验</p>
        </div>
        <div class="scenario-item">
          <h4>服务型企业</h4>
          <p>完善的售后服务管理，提升客户满意度</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 项目概述组件
</script>

<style scoped>
.help-content-section {
  line-height: 1.6;
  color: #303133;
}

.help-content-section h1 {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 30px;
  border-bottom: 3px solid #409eff;
  padding-bottom: 10px;
}

.help-content-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 30px 0 15px 0;
}

.help-content-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
  margin: 15px 0 10px 0;
}

.help-content-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 10px 0 5px 0;
}

.help-content-section p {
  font-size: 14px;
  color: #303133;
  margin-bottom: 15px;
}

.content-block {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.value-item {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.value-item:hover {
  transform: translateY(-5px);
}

.value-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 10px 0;
  border-bottom: 1px solid #e4e7ed;
  font-size: 14px;
}

.feature-list li:last-child {
  border-bottom: none;
}

.scenario-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.scenario-item {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.scenario-item h4 {
  color: #409eff;
  margin-bottom: 8px;
}

.scenario-item p {
  margin: 0;
  font-size: 13px;
  color: #303133;
}
</style>
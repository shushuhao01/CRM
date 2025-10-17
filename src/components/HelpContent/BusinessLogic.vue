<template>
  <div class="help-content">
    <h1>项目业务逻辑</h1>
    
    <section class="content-section">
      <h2>业务流程概述</h2>
      <p>智能销售CRM系统的核心业务流程围绕客户生命周期管理展开，从潜在客户获取到成交后的售后服务，形成完整的业务闭环。</p>
      
      <div class="flow-diagram">
        <div class="flow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>客户获取</h4>
            <p>通过多渠道获取潜在客户信息</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>客户管理</h4>
            <p>建立客户档案，跟踪客户状态</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>销售跟进</h4>
            <p>制定销售策略，推进销售进程</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>订单管理</h4>
            <p>处理订单，跟踪订单状态</p>
          </div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h4>售后服务</h4>
            <p>提供售后支持，维护客户关系</p>
          </div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>核心业务模块</h2>
      
      <div class="module-grid">
        <div class="module-card">
          <h3>客户管理模块</h3>
          <ul>
            <li>客户信息录入与维护</li>
            <li>客户分类与标签管理</li>
            <li>客户跟进记录</li>
            <li>客户价值评估</li>
          </ul>
        </div>
        
        <div class="module-card">
          <h3>销售管理模块</h3>
          <ul>
            <li>销售机会管理</li>
            <li>销售流程跟踪</li>
            <li>报价与合同管理</li>
            <li>销售预测分析</li>
          </ul>
        </div>
        
        <div class="module-card">
          <h3>订单管理模块</h3>
          <ul>
            <li>订单创建与编辑</li>
            <li>订单状态跟踪</li>
            <li>发货与物流管理</li>
            <li>订单统计分析</li>
          </ul>
        </div>
        
        <div class="module-card">
          <h3>售后服务模块</h3>
          <ul>
            <li>售后工单管理</li>
            <li>客户投诉处理</li>
            <li>服务质量评估</li>
            <li>客户满意度调查</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>数据流转逻辑</h2>
      <div class="data-flow">
        <h3>客户数据流</h3>
        <p>客户信息从录入开始，经过验证、分类、跟进等环节，最终形成完整的客户档案。系统会自动记录客户的所有互动历史，为后续的销售决策提供数据支持。</p>
        
        <h3>订单数据流</h3>
        <p>订单从创建到完成的整个生命周期都会被系统跟踪记录。包括订单状态变更、库存扣减、物流信息更新等，确保订单处理的透明化和可追溯性。</p>
        
        <h3>财务数据流</h3>
        <p>系统会自动计算销售业绩、佣金分配、应收账款等财务数据，并生成相应的财务报表，为企业的财务管理提供准确的数据基础。</p>
      </div>
    </section>

    <section class="content-section">
      <h2>权限管理逻辑</h2>
      <div class="permission-info">
        <h3>角色权限体系</h3>
        <ul>
          <li><strong>管理员：</strong>拥有系统的完全访问权限，可以管理所有模块和用户</li>
          <li><strong>部门经理：</strong>可以管理本部门的客户、订单和员工数据</li>
          <li><strong>销售人员：</strong>只能访问分配给自己的客户和相关订单信息</li>
          <li><strong>客服人员：</strong>主要负责售后服务模块，可以查看客户基本信息</li>
        </ul>
        
        <h3>数据安全机制</h3>
        <ul>
          <li>用户只能访问权限范围内的数据</li>
          <li>敏感操作需要二次确认</li>
          <li>系统会记录所有用户操作日志</li>
          <li>定期进行数据备份和安全检查</li>
        </ul>
      </div>
    </section>
  </div>
</template>

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

.content-section h3 {
  color: #2980b9;
  margin-bottom: 15px;
  font-size: 18px;
}

.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.flow-step {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  padding: 15px;
  min-width: 150px;
  transition: all 0.3s ease;
}

.flow-step:hover {
  border-color: #3498db;
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.2);
}

.step-number {
  background: #3498db;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 16px;
}

.step-content p {
  margin: 0;
  color: #303133;
  font-size: 14px;
}

.flow-arrow {
  font-size: 24px;
  color: #3498db;
  font-weight: bold;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.module-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.module-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.module-card h3 {
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ecf0f1;
}

.module-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.module-card li {
  padding: 8px 0;
  color: #303133;
  position: relative;
  padding-left: 20px;
}

.module-card li::before {
  content: "•";
  color: #3498db;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.data-flow, .permission-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.permission-info ul {
  list-style: none;
  padding: 0;
}

.permission-info li {
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.permission-info li:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .flow-diagram {
    flex-direction: column;
  }
  
  .flow-arrow {
    transform: rotate(90deg);
  }
  
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
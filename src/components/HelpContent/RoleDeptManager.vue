<template>
  <div class="help-content">
    <h1>部门经理</h1>
    <section>
      <h2>角色说明</h2>
      <p>部门经理负责管理本部门的业务和团队，可以查看本部门所有成员的数据，但不能访问其他部门的数据。</p>
    </section>
    <section>
      <h2>权限范围</h2>
      <h3>可访问功能</h3>
      <ul>
        <li>✅ 数据看板（本部门数据）</li>
        <li>✅ 客户管理（客户列表、新增客户）</li>
        <li>✅ 订单管理（订单列表、新增订单）</li>
        <li>✅ 服务管理（通话管理）</li>
        <li>✅ 业绩统计（全部功能）</li>
        <li>✅ 物流管理（物流列表、物流跟踪）</li>
        <li>✅ 售后管理（全部功能）</li>
        <li>✅ 资料管理（资料列表、客户查询）</li>
        <li>✅ 财务管理（绩效数据）</li>
      </ul>
      <h3>不可访问功能</h3>
      <ul>
        <li>❌ 客户分组、客户标签</li>
        <li>❌ 订单审核</li>
        <li>❌ 发货列表、状态更新</li>
        <li>❌ 物流公司配置</li>
        <li>❌ 回收站</li>
        <li>❌ 绩效管理</li>
        <li>❌ 商品管理</li>
        <li>❌ 系统管理</li>
      </ul>
    </section>
    <section>
      <h2>数据范围</h2>
      <p>部门经理可以查看和管理本部门的数据：</p>
      <ul>
        <li>本部门所有成员的客户</li>
        <li>本部门所有成员的订单</li>
        <li>本部门所有成员的业绩</li>
        <li>本部门的统计数据</li>
      </ul>
    </section>
    <section>
      <h2>主要职责</h2>
      <ul>
        <li>管理本部门业务</li>
        <li>监督团队成员工作</li>
        <li>查看团队业绩排名</li>
        <li>分析部门业绩数据</li>
        <li>协调部门内部资源</li>
      </ul>
    </section>
  </div>
</template>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>

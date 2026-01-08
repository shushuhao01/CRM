<template>
  <div class="help-content">
    <h1>管理员</h1>
    <section>
      <h2>角色说明</h2>
      <p>管理员是企业日常管理角色，负责业务数据管理、用户管理等工作。拥有大部分管理权限，但不包括超管专属功能。</p>
    </section>
    <section>
      <h2>权限范围</h2>
      <h3>可访问功能</h3>
      <ul>
        <li>✅ 数据看板（全部数据）</li>
        <li>✅ 客户管理（全部功能）</li>
        <li>✅ 订单管理（全部功能）</li>
        <li>✅ 服务管理（全部功能）</li>
        <li>✅ 业绩统计（全部功能）</li>
        <li>✅ 物流管理（全部功能）</li>
        <li>✅ 售后管理（全部功能）</li>
        <li>✅ 资料管理（全部功能）</li>
        <li>✅ 财务管理（全部功能）</li>
        <li>✅ 商品管理（全部功能）</li>
        <li>✅ 系统管理（部分功能）</li>
      </ul>
      <h3>不可访问功能</h3>
      <ul>
        <li>❌ 超管面板</li>
        <li>❌ 部分高级系统配置</li>
      </ul>
    </section>
    <section>
      <h2>数据范围</h2>
      <p>管理员可以查看和管理全公司的数据，包括：</p>
      <ul>
        <li>所有部门的客户数据</li>
        <li>所有部门的订单数据</li>
        <li>所有员工的业绩数据</li>
        <li>全公司的统计报表</li>
      </ul>
    </section>
    <section>
      <h2>主要职责</h2>
      <ul>
        <li>日常业务数据管理</li>
        <li>用户账号管理</li>
        <li>部门架构管理</li>
        <li>系统基础配置</li>
        <li>数据导入导出</li>
        <li>业务流程监控</li>
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

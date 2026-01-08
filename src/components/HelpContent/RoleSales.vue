<template>
  <div class="help-content">
    <h1>销售员</h1>
    <section>
      <h2>角色说明</h2>
      <p>销售员是一线销售人员，负责客户开发、订单处理等工作。只能管理自己的客户和订单数据。</p>
    </section>
    <section>
      <h2>权限范围</h2>
      <h3>可访问功能</h3>
      <ul>
        <li>✅ 数据看板（个人数据）</li>
        <li>✅ 客户管理（客户列表、新增客户）</li>
        <li>✅ 订单管理（订单列表、新增订单）</li>
        <li>✅ 服务管理（通话管理）</li>
        <li>✅ 业绩统计（个人业绩、团队业绩）</li>
        <li>✅ 物流管理（物流列表、物流跟踪）</li>
        <li>✅ 售后管理（售后订单、新建售后）</li>
        <li>✅ 资料管理（客户查询）</li>
        <li>✅ 财务管理（绩效数据-个人）</li>
      </ul>
      <h3>不可访问功能</h3>
      <ul>
        <li>❌ 客户分组、客户标签</li>
        <li>❌ 订单审核</li>
        <li>❌ 短信管理</li>
        <li>❌ 业绩分析、业绩分享</li>
        <li>❌ 发货列表、状态更新、物流公司</li>
        <li>❌ 资料列表、回收站</li>
        <li>❌ 绩效管理</li>
        <li>❌ 商品管理</li>
        <li>❌ 系统管理</li>
      </ul>
    </section>
    <section>
      <h2>数据范围</h2>
      <p>销售员只能查看和管理自己的数据：</p>
      <ul>
        <li>自己创建或负责的客户</li>
        <li>自己创建的订单</li>
        <li>自己的通话记录</li>
        <li>自己的业绩数据</li>
      </ul>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>团队业绩中可以看到排名，但看不到其他人的具体数据</template>
      </el-alert>
    </section>
    <section>
      <h2>日常工作流程</h2>
      <ol>
        <li><strong>客户开发</strong>：新增客户，记录客户信息</li>
        <li><strong>客户跟进</strong>：通过APP外呼，记录跟进内容</li>
        <li><strong>创建订单</strong>：为意向客户创建订单</li>
        <li><strong>订单跟踪</strong>：跟踪订单状态，处理问题</li>
        <li><strong>业绩查看</strong>：查看个人业绩和排名</li>
      </ol>
    </section>
    <section>
      <h2>使用技巧</h2>
      <ul>
        <li>使用APP进行外呼，通话记录自动同步</li>
        <li>及时记录客户跟进内容</li>
        <li>设置下次跟进时间，系统会自动提醒</li>
        <li>关注个人业绩排名，了解自己的表现</li>
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
.help-content ul, .help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
</style>

<template>
  <div class="help-content">
    <h1>客服</h1>
    <section>
      <h2>角色说明</h2>
      <p>客服负责订单审核、物流发货、售后处理等工作。可以查看全公司的订单和物流数据，但主要是执行操作而非管理。</p>
    </section>
    <section>
      <h2>客服类型</h2>
      <p>客服角色可以细分为不同类型，拥有不同的权限：</p>
      <el-table :data="serviceTypes" stripe style="width: 100%">
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="permissions" label="主要权限" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>
    <section>
      <h2>权限范围</h2>
      <h3>审核客服</h3>
      <ul>
        <li>✅ 订单审核（审核通过/拒绝）</li>
        <li>✅ 订单列表（查看）</li>
        <li>✅ 客户查询</li>
      </ul>
      <h3>物流客服</h3>
      <ul>
        <li>✅ 发货列表（发货操作）</li>
        <li>✅ 物流列表（查看和管理）</li>
        <li>✅ 物流跟踪</li>
        <li>✅ 状态更新</li>
      </ul>
      <h3>售后客服</h3>
      <ul>
        <li>✅ 售后订单（处理）</li>
        <li>✅ 新建售后</li>
        <li>✅ 售后数据</li>
      </ul>
      <h3>综合客服</h3>
      <p>拥有以上所有权限。</p>
    </section>
    <section>
      <h2>数据范围</h2>
      <p>客服可以查看全公司的相关数据：</p>
      <ul>
        <li>所有待审核的订单</li>
        <li>所有待发货的订单</li>
        <li>所有物流信息</li>
        <li>所有售后工单</li>
        <li>客户基本信息（只读）</li>
      </ul>
    </section>
    <section>
      <h2>工作流程</h2>
      <h3>审核客服</h3>
      <ol>
        <li>查看待审核订单列表</li>
        <li>核实订单信息</li>
        <li>审核通过或拒绝</li>
        <li>填写审核意见</li>
      </ol>
      <h3>物流客服</h3>
      <ol>
        <li>查看待发货订单</li>
        <li>填写物流信息</li>
        <li>确认发货</li>
        <li>跟踪物流状态</li>
        <li>处理物流异常</li>
      </ol>
      <h3>售后客服</h3>
      <ol>
        <li>接收售后申请</li>
        <li>审核售后请求</li>
        <li>处理退换货</li>
        <li>跟进售后进度</li>
        <li>关闭售后工单</li>
      </ol>
    </section>
    <section>
      <h2>配置客服权限</h2>
      <p>管理员可以在"系统管理 → 客服管理"中配置客服权限：</p>
      <ol>
        <li>选择用户</li>
        <li>设置为客服角色</li>
        <li>选择客服类型</li>
        <li>配置具体权限</li>
      </ol>
    </section>
  </div>
</template>
<script setup>
const serviceTypes = [
  { type: '审核客服', permissions: '订单审核', description: '专门负责订单审核工作' },
  { type: '物流客服', permissions: '发货、物流跟踪、状态更新', description: '专门负责物流发货工作' },
  { type: '售后客服', permissions: '售后工单处理', description: '专门负责售后服务工作' },
  { type: '综合客服', permissions: '以上所有权限', description: '拥有全部客服权限' }
]
</script>
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

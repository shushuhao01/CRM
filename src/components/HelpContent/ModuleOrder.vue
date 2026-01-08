<template>
  <div class="help-content">
    <h1>订单管理</h1>

    <section>
      <h2>功能概述</h2>
      <p>
        订单管理模块负责处理从订单创建到订单完成的整个生命周期，包括订单录入、审核流程、状态跟踪等功能。
      </p>
    </section>

    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📋</div>
          <div class="menu-info">
            <h4>订单列表</h4>
            <p>查看和管理所有订单，支持综合搜索、状态筛选、批量操作</p>
            <span class="menu-path">路径：订单管理 → 订单列表</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">➕</div>
          <div class="menu-info">
            <h4>新增订单</h4>
            <p>为客户创建新订单，选择商品、填写收货信息</p>
            <span class="menu-path">路径：订单管理 → 新增订单</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">✅</div>
          <div class="menu-info">
            <h4>订单审核</h4>
            <p>审核待审核的订单，通过或拒绝</p>
            <span class="menu-path">路径：订单管理 → 订单审核</span>
            <el-tag size="small" type="warning">管理员/客服可见</el-tag>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>订单状态流转</h2>
      <div class="status-flow">
        <div class="status-item">
          <div class="status-badge pending">待流转</div>
          <p>订单创建后的初始状态，等待自动流转或手动提审</p>
        </div>
        <div class="status-arrow">→</div>
        <div class="status-item">
          <div class="status-badge audit">待审核</div>
          <p>订单已提交审核，等待管理员或客服审核</p>
        </div>
        <div class="status-arrow">→</div>
        <div class="status-item">
          <div class="status-badge approved">待发货</div>
          <p>审核通过，等待物流发货</p>
        </div>
        <div class="status-arrow">→</div>
        <div class="status-item">
          <div class="status-badge shipped">已发货</div>
          <p>已填写物流单号，商品已发出</p>
        </div>
        <div class="status-arrow">→</div>
        <div class="status-item">
          <div class="status-badge delivered">已签收</div>
          <p>客户已签收商品，订单完成</p>
        </div>
      </div>

      <h3>其他状态</h3>
      <ul>
        <li><strong>审核拒绝</strong>：订单审核未通过，可修改后重新提审</li>
        <li><strong>已取消</strong>：订单已取消</li>
        <li><strong>拒收</strong>：客户拒收商品</li>
        <li><strong>物流退回</strong>：物流异常退回</li>
      </ul>
    </section>

    <section>
      <h2>订单列表</h2>
      <h3>综合搜索</h3>
      <p>订单列表支持综合搜索，可同时搜索以下字段：</p>
      <ul>
        <li>订单号</li>
        <li>客户姓名</li>
        <li>客户电话</li>
        <li>商品名称</li>
        <li>客户编码</li>
        <li>物流单号</li>
      </ul>

      <h3>筛选条件</h3>
      <ul>
        <li><strong>订单状态</strong>：待流转、待审核、待发货、已发货、已签收等</li>
        <li><strong>支付状态</strong>：未支付、已支付、部分支付</li>
        <li><strong>订单标记</strong>：正常单、预留单、退单</li>
        <li><strong>部门</strong>：按部门筛选（管理员可用）</li>
        <li><strong>销售员</strong>：按销售员筛选</li>
        <li><strong>日期范围</strong>：按创建时间筛选</li>
      </ul>

      <h3>快捷筛选</h3>
      <div class="quick-filter">
        <el-tag>全部订单</el-tag>
        <el-tag type="warning">待流转</el-tag>
        <el-tag type="info">待审核</el-tag>
        <el-tag type="success">待发货</el-tag>
        <el-tag>已发货</el-tag>
        <el-tag type="danger">审核拒绝</el-tag>
      </div>

      <h3>操作按钮</h3>
      <el-table :data="operationData" stripe style="width: 100%; margin-top: 15px;">
        <el-table-column prop="operation" label="操作" width="120" />
        <el-table-column prop="condition" label="显示条件" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </section>

    <section>
      <h2>新增订单</h2>
      <h3>操作步骤</h3>
      <ol>
        <li>
          <strong>选择客户</strong>
          <p>输入客户姓名或手机号搜索，选择已有客户；或点击"新建客户"创建新客户</p>
        </li>
        <li>
          <strong>选择商品</strong>
          <p>从商品列表中选择商品，设置数量和单价</p>
        </li>
        <li>
          <strong>填写收货信息</strong>
          <p>确认收货人姓名、电话、地址（可从客户信息自动填充）</p>
        </li>
        <li>
          <strong>设置订单信息</strong>
          <ul>
            <li>订单金额：系统自动计算，可手动调整</li>
            <li>定金金额：客户已支付的定金</li>
            <li>支付方式：微信、支付宝、银行转账等</li>
            <li>订单备注：其他需要说明的信息</li>
          </ul>
        </li>
        <li>
          <strong>提交订单</strong>
          <p>点击"提交订单"按钮，订单进入"待流转"状态</p>
        </li>
      </ol>

      <h3>订单标记类型</h3>
      <ul>
        <li><strong>正常单</strong>：正常发货的订单，会自动流转到审核</li>
        <li><strong>预留单</strong>：暂不发货的订单，需要手动提审</li>
        <li><strong>退单</strong>：需要退货的订单，需要手动提审</li>
      </ul>
    </section>

    <section>
      <h2>订单审核</h2>
      <el-tag type="warning">管理员/客服可操作</el-tag>

      <h3>审核流程</h3>
      <ol>
        <li>进入"订单管理" → "订单审核"</li>
        <li>查看待审核订单列表</li>
        <li>点击订单查看详情</li>
        <li>核实订单信息（客户、商品、金额、地址等）</li>
        <li>选择"通过"或"拒绝"</li>
        <li>如拒绝，需填写拒绝原因</li>
      </ol>

      <h3>审核要点</h3>
      <ul>
        <li>核实客户信息是否完整</li>
        <li>核实收货地址是否正确</li>
        <li>核实商品和数量是否正确</li>
        <li>核实订单金额是否正确</li>
        <li>检查是否有特殊备注</li>
      </ul>

      <h3>批量审核</h3>
      <p>勾选多个订单，点击"批量通过"或"批量拒绝"进行批量操作。</p>
    </section>

    <section>
      <h2>订单详情</h2>
      <p>点击订单列表中的"查看"按钮，进入订单详情页面：</p>

      <h3>基本信息</h3>
      <ul>
        <li>订单号、创建时间、订单状态</li>
        <li>客户信息、收货地址</li>
        <li>商品明细、订单金额</li>
        <li>支付信息、物流信息</li>
      </ul>

      <h3>状态历史</h3>
      <p>展示订单的所有状态变更记录，包括操作人和操作时间。</p>

      <h3>操作记录</h3>
      <p>展示订单的所有操作记录，包括编辑、审核、发货等。</p>
    </section>

    <section>
      <h2>订单流转配置</h2>
      <el-tag type="warning">仅管理员可配置</el-tag>
      <p>在"系统管理" → "系统设置" → "订单设置"中可配置：</p>
      <ul>
        <li><strong>流转模式</strong>：自动流转 / 手动提审</li>
        <li><strong>流转延迟</strong>：自动流转的延迟时间（分钟）</li>
      </ul>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 订单创建后多久会自动流转到审核？" name="1">
          <p>A: 默认30分钟后自动流转。管理员可在系统设置中修改流转延迟时间，或设置为手动提审模式。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 审核拒绝的订单如何处理？" name="2">
          <p>A: 审核拒绝的订单可以修改后重新提审。在订单列表中找到该订单，点击"编辑"修改信息，然后点击"提审"重新提交审核。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何取消订单？" name="3">
          <p>A: 待流转和待审核状态的订单可以直接取消。已审核通过的订单需要提交取消申请，由管理员审批。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 订单可以修改吗？" name="4">
          <p>A: 待流转和审核拒绝状态的订单可以修改。已审核通过或已发货的订单不能修改。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何查看订单的审核记录？" name="5">
          <p>A: 在订单详情页面的"状态历史"中可以查看所有审核记录，包括审核人、审核时间和审核意见。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const operationData = [
  { operation: '查看', condition: '所有订单', description: '查看订单详情' },
  { operation: '编辑', condition: '待流转/审核拒绝', description: '修改订单信息' },
  { operation: '提审', condition: '待流转/审核拒绝', description: '提交订单审核' },
  { operation: '审核', condition: '待审核（管理员/客服）', description: '审核通过或拒绝' },
  { operation: '发货', condition: '待发货（管理员/客服）', description: '填写物流信息' },
  { operation: '取消', condition: '待流转/待审核', description: '取消订单' }
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

.help-content ul, .help-content ol {
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

.menu-list {
  display: grid;
  gap: 15px;
  margin-top: 15px;
}

.menu-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.menu-icon {
  font-size: 32px;
  margin-right: 15px;
}

.menu-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.menu-info p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #909399;
}

.menu-path {
  font-size: 12px;
  color: #c0c4cc;
  display: block;
  margin-bottom: 5px;
}

.status-flow {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.status-item {
  text-align: center;
  flex: 1;
  min-width: 100px;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
}

.status-badge.pending {
  background: #e6a23c;
  color: white;
}

.status-badge.audit {
  background: #909399;
  color: white;
}

.status-badge.approved {
  background: #67c23a;
  color: white;
}

.status-badge.shipped {
  background: #409eff;
  color: white;
}

.status-badge.delivered {
  background: #67c23a;
  color: white;
}

.status-item p {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.status-arrow {
  font-size: 24px;
  color: #c0c4cc;
  align-self: center;
}

.quick-filter {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
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

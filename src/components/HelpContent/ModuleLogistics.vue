<template>
  <div class="help-content">
    <h1>物流管理</h1>

    <section>
      <h2>功能概述</h2>
      <p>
        物流管理模块负责订单的发货、物流跟踪、状态更新等功能，帮助企业高效管理物流配送流程。
      </p>
    </section>

    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📦</div>
          <div class="menu-info">
            <h4>发货列表</h4>
            <p>查看待发货订单，填写物流信息进行发货</p>
            <span class="menu-path">路径：物流管理 → 发货列表</span>
            <el-tag size="small" type="warning">管理员/客服可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📋</div>
          <div class="menu-info">
            <h4>物流列表</h4>
            <p>查看所有已发货订单的物流信息</p>
            <span class="menu-path">路径：物流管理 → 物流列表</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🔍</div>
          <div class="menu-info">
            <h4>物流跟踪</h4>
            <p>查询物流轨迹，跟踪包裹状态</p>
            <span class="menu-path">路径：物流管理 → 物流跟踪</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🔄</div>
          <div class="menu-info">
            <h4>状态更新</h4>
            <p>批量更新物流状态，处理签收、拒收等</p>
            <span class="menu-path">路径：物流管理 → 状态更新</span>
            <el-tag size="small" type="warning">管理员/客服可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🏢</div>
          <div class="menu-info">
            <h4>物流公司</h4>
            <p>管理物流公司配置，设置API接口</p>
            <span class="menu-path">路径：物流管理 → 物流公司</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>物流状态说明</h2>
      <el-table :data="statusData" stripe style="width: 100%">
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="nextAction" label="后续操作" />
      </el-table>
    </section>

    <section>
      <h2>发货列表</h2>
      <el-tag type="warning">管理员/客服可操作</el-tag>

      <h3>发货操作</h3>
      <ol>
        <li>进入"物流管理" → "发货列表"</li>
        <li>找到待发货的订单</li>
        <li>点击"发货"按钮</li>
        <li>选择物流公司</li>
        <li>填写物流单号</li>
        <li>确认发货</li>
      </ol>

      <h3>批量发货</h3>
      <ol>
        <li>勾选多个待发货订单</li>
        <li>点击"批量发货"按钮</li>
        <li>下载发货模板</li>
        <li>在模板中填写物流单号</li>
        <li>上传模板文件</li>
        <li>确认批量发货</li>
      </ol>

      <h3>发货信息</h3>
      <ul>
        <li><strong>物流公司</strong>：选择快递公司（顺丰、圆通、中通等）</li>
        <li><strong>物流单号</strong>：快递单号</li>
        <li><strong>发货备注</strong>：发货相关备注（可选）</li>
      </ul>
    </section>

    <section>
      <h2>物流列表</h2>
      <h3>筛选条件</h3>
      <ul>
        <li>物流状态：已发货、运输中、已签收、拒收、异常等</li>
        <li>物流公司：按快递公司筛选</li>
        <li>发货时间：按发货日期筛选</li>
        <li>订单号/物流单号：搜索</li>
      </ul>

      <h3>列表信息</h3>
      <ul>
        <li>订单号、客户信息</li>
        <li>物流公司、物流单号</li>
        <li>物流状态、最新物流信息</li>
        <li>发货时间、签收时间</li>
      </ul>

      <h3>操作功能</h3>
      <ul>
        <li><strong>查看轨迹</strong>：查看完整物流轨迹</li>
        <li><strong>刷新状态</strong>：手动刷新物流状态</li>
        <li><strong>修改单号</strong>：修改物流单号（管理员）</li>
        <li><strong>标记签收</strong>：手动标记签收</li>
        <li><strong>标记拒收</strong>：手动标记拒收</li>
      </ul>
    </section>

    <section>
      <h2>物流跟踪</h2>
      <h3>查询方式</h3>
      <ul>
        <li>输入物流单号查询</li>
        <li>输入订单号查询</li>
        <li>扫描物流单号条码</li>
      </ul>

      <h3>轨迹信息</h3>
      <p>物流轨迹展示包裹的完整运输过程：</p>
      <ul>
        <li>揽收时间和地点</li>
        <li>运输节点和时间</li>
        <li>派送信息</li>
        <li>签收信息</li>
      </ul>

      <h3>自动更新</h3>
      <p>系统会自动定时查询物流状态并更新，无需手动刷新。</p>
    </section>

    <section>
      <h2>状态更新</h2>
      <el-tag type="warning">管理员/客服可操作</el-tag>

      <h3>批量更新状态</h3>
      <ol>
        <li>进入"物流管理" → "状态更新"</li>
        <li>选择要更新的物流状态</li>
        <li>勾选需要更新的订单</li>
        <li>点击"批量更新"</li>
        <li>确认更新</li>
      </ol>

      <h3>手动标记</h3>
      <ul>
        <li><strong>标记签收</strong>：客户已签收但系统未自动更新时使用</li>
        <li><strong>标记拒收</strong>：客户拒收包裹</li>
        <li><strong>标记异常</strong>：物流异常情况</li>
        <li><strong>标记退回</strong>：包裹退回发货方</li>
      </ul>
    </section>

    <section>
      <h2>物流公司配置</h2>
      <el-tag type="warning">仅管理员可操作</el-tag>

      <h3>添加物流公司</h3>
      <ol>
        <li>进入"物流管理" → "物流公司"</li>
        <li>点击"添加物流公司"</li>
        <li>填写公司名称和编码</li>
        <li>配置物流查询API（可选）</li>
        <li>保存配置</li>
      </ol>

      <h3>API配置</h3>
      <p>支持对接第三方物流查询API，实现自动查询物流轨迹：</p>
      <ul>
        <li>快递100 API</li>
        <li>快递鸟 API</li>
        <li>阿里云物流 API</li>
      </ul>

      <h3>发件人配置</h3>
      <p>配置默认发件人信息，发货时自动填充：</p>
      <ul>
        <li>发件人姓名</li>
        <li>发件人电话</li>
        <li>发件地址</li>
      </ul>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 物流单号填错了怎么办？" name="1">
          <p>A: 管理员可以在物流列表中找到该订单，点击"修改单号"进行修改。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 物流状态为什么没有自动更新？" name="2">
          <p>A: 可能是物流API配置问题或网络问题。可以点击"刷新状态"手动更新，或联系管理员检查API配置。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何处理客户拒收的包裹？" name="3">
          <p>A: 在物流列表中找到该订单，点击"标记拒收"，填写拒收原因。系统会自动创建售后工单。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 批量发货模板在哪里下载？" name="4">
          <p>A: 在发货列表页面，点击"批量发货"按钮，在弹窗中点击"下载模板"即可。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const statusData = [
  { status: '待发货', description: '订单已审核通过，等待发货', nextAction: '填写物流信息发货' },
  { status: '已发货', description: '已填写物流单号，商品已发出', nextAction: '等待物流更新' },
  { status: '运输中', description: '包裹正在运输途中', nextAction: '等待派送' },
  { status: '派送中', description: '快递员正在派送', nextAction: '等待签收' },
  { status: '已签收', description: '客户已签收包裹', nextAction: '订单完成' },
  { status: '拒收', description: '客户拒绝签收', nextAction: '处理退回' },
  { status: '异常', description: '物流异常（丢失、损坏等）', nextAction: '联系物流公司处理' },
  { status: '退回', description: '包裹已退回发货方', nextAction: '处理退款或重发' }
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

:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.8;
}
</style>

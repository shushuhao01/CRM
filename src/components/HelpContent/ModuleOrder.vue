<template>
  <div class="help-content">
    <h1>订单管理模块</h1>
    
    <section class="content-section">
      <h2>功能概述</h2>
      <p>订单管理模块是CRM系统的核心业务模块之一，负责处理从订单创建到订单完成的整个生命周期。该模块提供了完整的订单处理流程，包括订单录入、状态跟踪、发货管理、收款记录等功能。</p>
      
      <div class="feature-highlights">
        <div class="highlight-item">
          <div class="highlight-icon">📋</div>
          <h3>订单全生命周期管理</h3>
          <p>从订单创建到完成的全流程跟踪</p>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">📊</div>
          <h3>实时状态监控</h3>
          <p>订单状态实时更新，进度一目了然</p>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">💰</div>
          <h3>财务数据统计</h3>
          <p>自动计算订单金额和收款情况</p>
        </div>
        <div class="highlight-item">
          <div class="highlight-icon">🚚</div>
          <h3>物流信息跟踪</h3>
          <p>集成物流信息，实时跟踪配送状态</p>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>主要功能</h2>
      
      <div class="function-list">
        <div class="function-item">
          <h3>📝 订单列表</h3>
          <div class="function-details">
            <h4>功能说明：</h4>
            <p>显示所有订单信息，支持多种筛选和排序方式，方便用户快速查找目标订单。</p>
            
            <h4>主要特性：</h4>
            <ul>
              <li>支持按订单状态、客户、时间范围等条件筛选</li>
              <li>可按订单号、创建时间、金额等字段排序</li>
              <li>提供快速搜索功能，支持订单号和客户名称搜索</li>
              <li>支持批量操作，如批量导出、批量状态更新</li>
            </ul>
            
            <h4>操作步骤：</h4>
            <ol>
              <li>进入订单管理页面</li>
              <li>使用筛选条件缩小查找范围</li>
              <li>点击订单行查看详细信息</li>
              <li>使用操作按钮进行相应处理</li>
            </ol>
          </div>
        </div>
        
        <div class="function-item">
          <h3>➕ 新增订单</h3>
          <div class="function-details">
            <h4>功能说明：</h4>
            <p>创建新的销售订单，录入客户信息、商品信息、价格等关键数据。</p>
            
            <h4>必填信息：</h4>
            <ul>
              <li>客户信息（可从客户库选择或新建）</li>
              <li>商品信息（商品名称、规格、数量、单价）</li>
              <li>订单总金额（系统自动计算）</li>
              <li>预计交付时间</li>
            </ul>
            
            <h4>操作步骤：</h4>
            <ol>
              <li>点击"新增订单"按钮</li>
              <li>选择或新建客户信息</li>
              <li>添加商品明细</li>
              <li>确认订单信息并保存</li>
            </ol>
          </div>
        </div>
        
        <div class="function-item">
          <h3>✏️ 编辑订单</h3>
          <div class="function-details">
            <h4>功能说明：</h4>
            <p>修改已有订单的信息，包括商品数量、价格调整、客户信息更新等。</p>
            
            <h4>可编辑内容：</h4>
            <ul>
              <li>商品数量和价格（未发货状态下）</li>
              <li>客户联系信息</li>
              <li>收货地址</li>
              <li>备注信息</li>
            </ul>
            
            <h4>注意事项：</h4>
            <div class="warning-box">
              <p>⚠️ 已发货的订单只能修改部分信息，如收货地址、备注等</p>
              <p>⚠️ 价格修改需要相应权限，建议由主管审核</p>
            </div>
          </div>
        </div>
        
        <div class="function-item">
          <h3>📦 订单状态管理</h3>
          <div class="function-details">
            <h4>订单状态流程：</h4>
            <div class="status-flow">
              <div class="status-item">
                <div class="status-badge pending">待确认</div>
                <p>订单刚创建，等待确认</p>
              </div>
              <div class="flow-arrow">→</div>
              <div class="status-item">
                <div class="status-badge confirmed">已确认</div>
                <p>订单已确认，准备生产</p>
              </div>
              <div class="flow-arrow">→</div>
              <div class="status-item">
                <div class="status-badge production">生产中</div>
                <p>商品正在生产制作</p>
              </div>
              <div class="flow-arrow">→</div>
              <div class="status-item">
                <div class="status-badge shipped">已发货</div>
                <p>商品已发出，在途中</p>
              </div>
              <div class="flow-arrow">→</div>
              <div class="status-item">
                <div class="status-badge completed">已完成</div>
                <p>客户已收货，订单完成</p>
              </div>
            </div>
            
            <h4>状态更新操作：</h4>
            <ol>
              <li>在订单列表中找到目标订单</li>
              <li>点击"状态"列的下拉菜单</li>
              <li>选择新的状态</li>
              <li>填写状态变更说明（可选）</li>
              <li>确认更新</li>
            </ol>
          </div>
        </div>
        
        <div class="function-item">
          <h3>💳 收款管理</h3>
          <div class="function-details">
            <h4>功能说明：</h4>
            <p>记录订单的收款情况，支持分期收款和多种支付方式。</p>
            
            <h4>支持的支付方式：</h4>
            <ul>
              <li>现金支付</li>
              <li>银行转账</li>
              <li>支付宝/微信支付</li>
              <li>信用卡支付</li>
              <li>支票支付</li>
            </ul>
            
            <h4>收款记录操作：</h4>
            <ol>
              <li>进入订单详情页面</li>
              <li>点击"收款记录"标签</li>
              <li>点击"新增收款"按钮</li>
              <li>填写收款金额和支付方式</li>
              <li>上传收款凭证（可选）</li>
              <li>保存收款记录</li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>操作技巧</h2>
      <div class="tips-container">
        <div class="tip-item">
          <h3>🔍 快速查找订单</h3>
          <ul>
            <li>使用订单号进行精确搜索</li>
            <li>按客户名称搜索相关订单</li>
            <li>利用时间范围筛选特定期间的订单</li>
            <li>使用状态筛选查看特定状态的订单</li>
          </ul>
        </div>
        
        <div class="tip-item">
          <h3>📊 数据导出</h3>
          <ul>
            <li>支持导出Excel格式的订单数据</li>
            <li>可选择导出字段和时间范围</li>
            <li>支持批量导出多个订单</li>
            <li>导出数据包含完整的订单信息</li>
          </ul>
        </div>
        
        <div class="tip-item">
          <h3>🔔 订单提醒</h3>
          <ul>
            <li>系统会自动提醒超期未发货的订单</li>
            <li>可设置自定义提醒规则</li>
            <li>支持邮件和站内消息提醒</li>
            <li>重要订单可设置特别关注</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2>注意事项</h2>
      <div class="notice-list">
        <div class="notice-item important">
          <h3>⚠️ 重要提醒</h3>
          <ul>
            <li>订单一旦确认，修改需要相应权限</li>
            <li>价格调整建议记录调整原因</li>
            <li>发货前务必核对收货地址</li>
            <li>及时更新订单状态，保持信息准确</li>
          </ul>
        </div>
        
        <div class="notice-item warning">
          <h3>💡 操作建议</h3>
          <ul>
            <li>定期检查待处理订单，避免遗漏</li>
            <li>重要订单建议添加备注说明</li>
            <li>收款后及时更新收款记录</li>
            <li>异常订单及时与客户沟通</li>
          </ul>
        </div>
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

.feature-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.highlight-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.highlight-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.highlight-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.highlight-item h3 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 18px;
}

.highlight-item p {
  color: #303133;
  margin: 0;
}

.function-list {
  margin: 20px 0;
}

.function-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.function-item h3 {
  background: #f8f9fa;
  color: #2c3e50;
  padding: 15px 20px;
  margin: 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 18px;
}

.function-details {
  padding: 20px;
}

.function-details h4 {
  color: #34495e;
  margin: 15px 0 10px 0;
  font-size: 16px;
}

.function-details ul, .function-details ol {
  margin: 10px 0;
  padding-left: 20px;
}

.function-details li {
  margin: 5px 0;
  color: #2c3e50;
  line-height: 1.6;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 5px;
  padding: 15px;
  margin: 15px 0;
}

.warning-box p {
  margin: 5px 0;
  color: #856404;
}

.status-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.status-item {
  text-align: center;
  flex: 1;
  min-width: 120px;
}

.status-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 14px;
}

.status-badge.pending {
  background: #f39c12;
}

.status-badge.confirmed {
  background: #3498db;
}

.status-badge.production {
  background: #9b59b6;
}

.status-badge.shipped {
  background: #e67e22;
}

.status-badge.completed {
  background: #27ae60;
}

.status-item p {
  color: #303133;
  font-size: 12px;
  margin: 0;
}

.flow-arrow {
  font-size: 20px;
  color: #409eff;
  font-weight: bold;
}

.tips-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.tip-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.tip-item h3 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 16px;
}

.tip-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-item li {
  padding: 5px 0;
  color: #34495e;
  position: relative;
  padding-left: 20px;
}

.tip-item li::before {
  content: "•";
  color: #3498db;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.notice-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.notice-item {
  border-radius: 8px;
  padding: 20px;
}

.notice-item.important {
  background: #fdf2f2;
  border: 1px solid #f5c6cb;
  border-left: 4px solid #e74c3c;
}

.notice-item.warning {
  background: #f0f9ff;
  border: 1px solid #bee5eb;
  border-left: 4px solid #17a2b8;
}

.notice-item h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.notice-item.important h3 {
  color: #721c24;
}

.notice-item.warning h3 {
  color: #0c5460;
}

.notice-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.notice-item li {
  padding: 5px 0;
  position: relative;
  padding-left: 20px;
}

.notice-item.important li {
  color: #721c24;
}

.notice-item.warning li {
  color: #0c5460;
}

.notice-item.important li::before {
  content: "⚠";
  color: #e74c3c;
  position: absolute;
  left: 0;
}

.notice-item.warning li::before {
  content: "💡";
  position: absolute;
  left: 0;
}

@media (max-width: 768px) {
  .status-flow {
    flex-direction: column;
  }
  
  .flow-arrow {
    transform: rotate(90deg);
    margin: 10px 0;
  }
  
  .feature-highlights {
    grid-template-columns: 1fr;
  }
  
  .tips-container {
    grid-template-columns: 1fr;
  }
  
  .notice-list {
    grid-template-columns: 1fr;
  }
}
</style>
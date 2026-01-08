<template>
  <div class="help-content">
    <h1>售后管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>售后管理模块负责处理客户的退换货、投诉、售后服务等工作，提升客户满意度。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📋</div>
          <div class="menu-info">
            <h4>售后订单</h4>
            <p>查看和处理所有售后工单</p>
            <span class="menu-path">路径：售后管理 → 售后订单</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">➕</div>
          <div class="menu-info">
            <h4>新建售后</h4>
            <p>创建新的售后工单</p>
            <span class="menu-path">路径：售后管理 → 新建售后</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📊</div>
          <div class="menu-info">
            <h4>售后数据</h4>
            <p>售后统计分析、问题分类统计</p>
            <span class="menu-path">路径：售后管理 → 售后数据</span>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>售后类型</h2>
      <ul>
        <li><strong>退货退款</strong>：客户退回商品并退款</li>
        <li><strong>换货</strong>：更换商品</li>
        <li><strong>仅退款</strong>：不退货只退款</li>
        <li><strong>补发</strong>：补发商品</li>
        <li><strong>投诉</strong>：客户投诉处理</li>
        <li><strong>咨询</strong>：售后咨询</li>
      </ul>
    </section>
    <section>
      <h2>售后流程</h2>
      <ol>
        <li><strong>创建工单</strong>：填写售后信息，关联原订单</li>
        <li><strong>审核</strong>：客服审核售后申请</li>
        <li><strong>处理</strong>：执行退款/换货/补发等操作</li>
        <li><strong>完成</strong>：售后处理完成，关闭工单</li>
      </ol>
    </section>
    <section>
      <h2>新建售后</h2>
      <h3>必填信息</h3>
      <ul>
        <li>关联订单号</li>
        <li>售后类型</li>
        <li>售后原因</li>
        <li>处理方式</li>
      </ul>
      <h3>选填信息</h3>
      <ul>
        <li>退款金额</li>
        <li>退货物流单号</li>
        <li>图片凭证</li>
        <li>备注说明</li>
      </ul>
    </section>
    <section>
      <h2>售后数据</h2>
      <h3>统计指标</h3>
      <ul>
        <li>售后工单数量</li>
        <li>各类型占比</li>
        <li>处理时效</li>
        <li>退款金额统计</li>
        <li>售后率分析</li>
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
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
</style>

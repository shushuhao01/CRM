<template>
  <div class="help-content">
    <h1>业绩统计</h1>
    <section>
      <h2>功能概述</h2>
      <p>业绩统计模块提供个人业绩、团队业绩、业绩分析等功能，帮助管理层了解销售情况和团队表现。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">👤</div>
          <div class="menu-info">
            <h4>个人业绩</h4>
            <p>查看个人销售业绩、订单统计、业绩趋势</p>
            <span class="menu-path">路径：业绩统计 → 个人业绩</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">👥</div>
          <div class="menu-info">
            <h4>团队业绩</h4>
            <p>查看团队/部门业绩汇总、成员排名</p>
            <span class="menu-path">路径：业绩统计 → 团队业绩</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📊</div>
          <div class="menu-info">
            <h4>业绩分析</h4>
            <p>业绩趋势分析、同比环比、目标完成率</p>
            <span class="menu-path">路径：业绩统计 → 业绩分析</span>
            <el-tag size="small" type="warning">经理及以上可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📤</div>
          <div class="menu-info">
            <h4>业绩分享</h4>
            <p>生成业绩报表、分享到企业微信/钉钉</p>
            <span class="menu-path">路径：业绩统计 → 业绩分享</span>
            <el-tag size="small" type="warning">经理及以上可见</el-tag>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>个人业绩</h2>
      <h3>统计指标</h3>
      <ul>
        <li><strong>订单数量</strong>：已完成订单数</li>
        <li><strong>销售金额</strong>：订单总金额</li>
        <li><strong>客户数量</strong>：新增客户数</li>
        <li><strong>通话时长</strong>：总通话时长</li>
        <li><strong>转化率</strong>：订单/客户转化率</li>
      </ul>
      <h3>时间维度</h3>
      <ul>
        <li>今日业绩</li>
        <li>本周业绩</li>
        <li>本月业绩</li>
        <li>自定义时间范围</li>
      </ul>
    </section>
    <section>
      <h2>团队业绩</h2>
      <h3>数据范围</h3>
      <ul>
        <li><strong>部门经理</strong>：查看本部门所有成员业绩</li>
        <li><strong>管理员</strong>：查看全公司所有部门业绩</li>
        <li><strong>销售员</strong>：查看团队排名（不含具体数据）</li>
      </ul>
      <h3>排名展示</h3>
      <ul>
        <li>日排名、周排名、月排名</li>
        <li>按销售额、订单数、客户数排名</li>
        <li>部门排名、个人排名</li>
      </ul>
    </section>
    <section>
      <h2>业绩分析</h2>
      <h3>分析维度</h3>
      <ul>
        <li><strong>趋势分析</strong>：业绩变化趋势图</li>
        <li><strong>同比分析</strong>：与去年同期对比</li>
        <li><strong>环比分析</strong>：与上月/上周对比</li>
        <li><strong>目标完成率</strong>：业绩目标完成情况</li>
      </ul>
    </section>
    <section>
      <h2>业绩分享</h2>
      <h3>分享方式</h3>
      <ul>
        <li>生成业绩报表图片</li>
        <li>推送到企业微信群</li>
        <li>推送到钉钉群</li>
        <li>定时自动推送</li>
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
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
</style>

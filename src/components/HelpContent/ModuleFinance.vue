<template>
  <div class="help-content">
    <h1>财务管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>财务管理模块提供绩效数据查看和绩效管理功能，支持提成计算、阶梯提成等配置。</p>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📊</div>
          <div class="menu-info">
            <h4>绩效数据</h4>
            <p>查看个人/团队绩效数据、提成明细</p>
            <span class="menu-path">路径：财务管理 → 绩效数据</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">⚙️</div>
          <div class="menu-info">
            <h4>绩效管理</h4>
            <p>配置提成规则、阶梯提成、绩效系数</p>
            <span class="menu-path">路径：财务管理 → 绩效管理</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>绩效数据</h2>
      <h3>数据范围</h3>
      <ul>
        <li><strong>销售员</strong>：查看个人绩效数据</li>
        <li><strong>部门经理</strong>：查看本部门绩效数据</li>
        <li><strong>管理员</strong>：查看全公司绩效数据</li>
      </ul>
      <h3>绩效指标</h3>
      <ul>
        <li>销售金额</li>
        <li>订单数量</li>
        <li>提成金额</li>
        <li>绩效系数</li>
        <li>实发提成</li>
      </ul>
      <h3>时间维度</h3>
      <ul>
        <li>日绩效</li>
        <li>周绩效</li>
        <li>月绩效</li>
        <li>年度绩效</li>
      </ul>
    </section>
    <section>
      <h2>绩效管理</h2>
      <h3>提成规则</h3>
      <ul>
        <li><strong>固定比例</strong>：按销售额的固定比例计算提成</li>
        <li><strong>阶梯提成</strong>：不同销售额区间使用不同提成比例</li>
        <li><strong>产品提成</strong>：不同产品设置不同提成比例</li>
      </ul>
      <h3>阶梯提成配置</h3>
      <p>示例：</p>
      <el-table :data="ladderData" stripe style="width: 100%">
        <el-table-column prop="range" label="销售额区间" />
        <el-table-column prop="rate" label="提成比例" />
      </el-table>
      <h3>绩效系数</h3>
      <p>可根据订单状态设置不同的绩效系数：</p>
      <ul>
        <li>已签收订单：系数 1.0</li>
        <li>拒收订单：系数 0</li>
        <li>退货订单：系数 -1.0（扣除提成）</li>
      </ul>
    </section>
    <section>
      <h2>提成计算</h2>
      <p>提成计算公式：</p>
      <div class="formula">
        实发提成 = 销售金额 × 提成比例 × 绩效系数
      </div>
    </section>
  </div>
</template>
<script setup>
const ladderData = [
  { range: '0 - 10,000', rate: '5%' },
  { range: '10,001 - 50,000', rate: '8%' },
  { range: '50,001 - 100,000', rate: '10%' },
  { range: '100,001 以上', rate: '12%' }
]
</script>
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
.formula { background: #f5f7fa; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 16px; color: #409eff; margin: 15px 0; }
</style>

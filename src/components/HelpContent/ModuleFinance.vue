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
        <div class="menu-item">
          <div class="menu-icon">💰</div>
          <div class="menu-info">
            <h4>代收管理</h4>
            <p>查看和管理订单代收金额，统计代收数据</p>
            <span class="menu-path">路径：财务管理 → 代收管理</span>
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

    <section>
      <h2>代收管理</h2>
      <el-tag type="warning">仅管理员可见</el-tag>
      <p>代收管理功能用于统计和管理订单的代收金额，帮助财务人员核对物流代收款项。</p>

      <h3>什么是代收？</h3>
      <p>代收是指订单发货时，由物流公司代为收取的货款金额。通常情况下：</p>
      <div class="formula">
        代收金额 = 订单总金额 - 已支付定金
      </div>

      <h3>代收数据统计</h3>
      <p>在"财务管理" → "代收管理"中可以查看：</p>
      <ul>
        <li><strong>代收订单列表</strong>：所有需要代收的订单</li>
        <li><strong>代收金额汇总</strong>：按时间、部门、销售员统计代收总额</li>
        <li><strong>代收状态</strong>：待发货、已发货、已签收、已拒收等</li>
        <li><strong>实收金额</strong>：物流公司实际代收的金额</li>
        <li><strong>差异分析</strong>：应收与实收的差异对比</li>
      </ul>

      <h3>筛选条件</h3>
      <ul>
        <li>时间范围：按发货时间或签收时间筛选</li>
        <li>订单状态：待发货、已发货、已签收等</li>
        <li>部门：按部门筛选</li>
        <li>销售员：按销售员筛选</li>
        <li>物流公司：按物流公司筛选</li>
        <li>代收金额范围：按金额区间筛选</li>
      </ul>

      <h3>代收核对</h3>
      <p>财务人员可以：</p>
      <ul>
        <li>导出代收订单明细表</li>
        <li>与物流公司对账单进行核对</li>
        <li>标记已核对的订单</li>
        <li>记录实收金额和差异原因</li>
      </ul>

      <h3>代收金额变更</h3>
      <p>当订单的代收金额需要调整时：</p>
      <ol>
        <li>销售员在订单详情页提交"取消代收申请"</li>
        <li>管理员在"订单管理" → "取消代收审核"中审核</li>
        <li>审核通过后，订单代收金额自动更新</li>
        <li>变更记录会在代收管理中显示</li>
      </ol>

      <h3>常见场景</h3>
      <ul>
        <li><strong>客户补齐尾款</strong>：客户在发货前补齐了剩余货款，代收金额改为0</li>
        <li><strong>拒收订单</strong>：客户拒收，物流公司未代收到款项</li>
        <li><strong>部分代收</strong>：客户只支付了部分货款</li>
        <li><strong>代收异常</strong>：物流公司代收金额与订单金额不符</li>
      </ul>

      <h3>报表功能</h3>
      <ul>
        <li>日代收汇总报表</li>
        <li>月代收汇总报表</li>
        <li>部门代收统计报表</li>
        <li>销售员代收统计报表</li>
        <li>物流公司代收统计报表</li>
      </ul>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 代收金额是如何计算的？" name="1">
          <p>A: 代收金额 = 订单总金额 - 已支付定金。例如订单总额1000元，客户已支付定金300元，则代收金额为700元。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 代收金额可以为0吗？" name="2">
          <p>A: 可以。当客户已全额支付订单金额时，代收金额为0，表示无需物流代收。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何修改订单的代收金额？" name="3">
          <p>A: 销售员需要在订单详情页提交"取消代收申请"，填写新的代收金额和申请原因，等待管理员审核通过后生效。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 物流公司代收的金额与订单不符怎么办？" name="4">
          <p>A: 在代收管理中记录实收金额和差异原因，联系物流公司核实情况，必要时联系客户补齐差额。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 拒收订单的代收金额如何处理？" name="5">
          <p>A: 拒收订单物流公司未代收到款项，系统会自动标记为未收款。如果客户已支付定金，需要按退款流程处理。</p>
        </el-collapse-item>
      </el-collapse>
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
.help-content ol { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
.formula { background: #f5f7fa; padding: 15px 20px; border-radius: 8px; font-family: monospace; font-size: 16px; color: #409eff; margin: 15px 0; }
:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>

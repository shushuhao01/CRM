<template>
  <div class="help-content">
    <h1>面单模板配置指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>面单模板决定了打印面单的布局和显示内容。系统预设了多种模板，也支持自定义配置。</template>
    </el-alert>

    <section>
      <h2>一、模板类型</h2>
      <el-table :data="templateTypes" stripe style="width: 100%">
        <el-table-column prop="type" label="模板类型" width="180" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="paperSize" label="纸张规格" width="140" />
        <el-table-column prop="usage" label="适用场景" width="200" />
      </el-table>
    </section>

    <section>
      <h2>二、模板配置入口</h2>
      <ol>
        <li>进入 <strong>物流管理 → 发货列表</strong></li>
        <li>选择一个订单，点击 <strong>"打印面单发货"</strong></li>
        <li>在打印面单弹窗中，点击 <strong>"面单模板"</strong> 按钮</li>
        <li>在面单模板管理中可以查看、切换、自定义模板</li>
      </ol>
    </section>

    <section>
      <h2>三、模板显示配置</h2>
      <p>每个模板支持以下显示选项的开关：</p>
      <el-table :data="displayOptions" stripe style="width: 100%">
        <el-table-column prop="option" label="显示选项" width="180" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="default" label="默认状态" width="100" />
      </el-table>
    </section>

    <section>
      <h2>四、隐私保护设置</h2>
      <p>面单支持对敏感信息进行脱敏处理，保护客户隐私：</p>

      <h3>手机号隐私</h3>
      <ul>
        <li><strong>完全显示</strong>：138****8888 → 13812348888</li>
        <li><strong>部分隐藏</strong>：13812348888 → 138****8888（中间4位隐藏）</li>
        <li><strong>完全隐藏</strong>：不显示手机号</li>
      </ul>

      <h3>姓名隐私</h3>
      <ul>
        <li><strong>完全显示</strong>：张三丰</li>
        <li><strong>部分隐藏</strong>：张** （仅显示姓氏）</li>
        <li><strong>完全隐藏</strong>：不显示姓名</li>
      </ul>

      <h3>地址隐私</h3>
      <ul>
        <li><strong>完全显示</strong>：完整地址</li>
        <li><strong>部分隐藏</strong>：隐藏门牌号等详细信息</li>
        <li><strong>完全隐藏</strong>：仅显示省市区</li>
      </ul>
    </section>

    <section>
      <h2>五、自定义模板</h2>
      <h3>创建自定义模板</h3>
      <ol>
        <li>在面单模板管理中，点击 <strong>"新增模板"</strong></li>
        <li>输入模板名称和描述</li>
        <li>选择纸张规格</li>
        <li>配置显示选项（勾选需要显示的内容）</li>
        <li>配置隐私模式</li>
        <li>保存模板</li>
      </ol>

      <h3>设置默认模板</h3>
      <p>可以为每个物流公司设置专属的默认模板，也可以设置一个全局默认模板。打印时系统按以下优先级选择模板：</p>
      <ol>
        <li>用户手动选择的模板（最高优先）</li>
        <li>当前物流公司的专属模板</li>
        <li>全局默认模板</li>
        <li>系统预设"通用标准面单"</li>
      </ol>
    </section>

    <section>
      <h2>六、常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 面单上的条码打印不完整？" name="1">
          <p>A: 请确认纸张规格设置与实际纸张匹配。如果面单内容过多导致超出范围，可以尝试关闭部分显示选项（如商品列表、备注等）。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 不同快递公司需要不同模板吗？" name="2">
          <p>A: 建议使用通用标准模板即可满足大部分需求。如果某快递公司对面单格式有特殊要求，可以为其创建专属模板。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 自定义模板会被系统更新覆盖吗？" name="3">
          <p>A: 不会。系统预设模板和自定义模板分开存储，系统更新只会更新预设模板，不会影响您创建的自定义模板。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const templateTypes = [
  { type: '通用标准面单', description: '适用所有快递公司的标准模板，包含寄件人、收件人、条码等', paperSize: '100×180mm', usage: '日常发货（推荐）' },
  { type: '通用精简面单', description: '精简版面单，省略部分信息', paperSize: '100×150mm', usage: '信息较少的包裹' },
  { type: '顺丰专属面单', description: '符合顺丰格式要求的专属模板', paperSize: '100×180mm', usage: '顺丰发货' },
  { type: '圆通专属面单', description: '符合圆通格式要求的专属模板', paperSize: '100×180mm', usage: '圆通发货' },
  { type: '隐私保护面单', description: '客户信息脱敏处理的面单', paperSize: '100×180mm', usage: '需要隐私保护的场景' },
  { type: '自定义模板', description: '用户根据需求自定义的面单模板', paperSize: '自定义', usage: '特殊需求' },
]

const displayOptions = [
  { option: '条形码', description: '面单条形码（快递单号编码）', default: '✅ 显示' },
  { option: '二维码', description: '面单二维码（包含物流信息）', default: '✅ 显示' },
  { option: '商品列表', description: '订单中的商品名称和数量', default: '✅ 显示' },
  { option: '代收金额', description: '货到付款的代收金额', default: '✅ 显示' },
  { option: '备注', description: '发货备注信息', default: '❌ 隐藏' },
  { option: '寄件人信息', description: '发件人姓名、电话、地址', default: '✅ 显示' },
  { option: '客服微信', description: '售后客服微信二维码', default: '❌ 隐藏' },
  { option: '签收区域', description: '面单底部的签收确认区', default: '❌ 隐藏' },
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
section { margin-bottom: 40px; }

:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>


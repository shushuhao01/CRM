<template>
  <div class="help-content">
    <h1>发货打单操作指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>本指南详细说明发货列表的各种发货方式，包括打印面单发货、手动发货、批量打印面单、批量发货和导入发货。</template>
    </el-alert>

    <section>
      <h2>一、发货方式总览</h2>
      <el-table :data="shippingMethods" stripe style="width: 100%">
        <el-table-column prop="method" label="发货方式" width="160" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="needApi" label="需要API" width="100" />
        <el-table-column prop="scenario" label="适用场景" width="200" />
      </el-table>
    </section>

    <section>
      <h2>二、打印面单发货（单个）</h2>
      <el-tag type="success">推荐 · 自动获取单号</el-tag>

      <h3>前置条件</h3>
      <ul>
        <li>已配置物流公司API（参考《物流API配置指南》）</li>
        <li>已配置默认寄件人（参考《寄件人配置指南》）</li>
        <li>已配置打印机（参考《打印机配置指南》）</li>
      </ul>

      <h3>操作步骤</h3>
      <ol>
        <li>进入 <strong>物流管理 → 发货列表</strong>，在"待发货"标签页找到订单</li>
        <li>点击操作列的 <strong>"打印面单"</strong> 按钮</li>
        <li>在弹窗中确认/修改以下信息：
          <ul>
            <li><strong>物流公司</strong>：选择要使用的快递公司</li>
            <li><strong>寄件人信息</strong>：默认使用默认寄件人，可手动修改</li>
            <li><strong>收件人信息</strong>：从订单自动获取，可修改</li>
            <li><strong>面单模板</strong>：选择打印模板</li>
            <li><strong>备注</strong>：发货备注（可选）</li>
          </ul>
        </li>
        <li>点击 <strong>"获取单号并打印"</strong></li>
        <li>系统调用API获取快递单号，生成面单并打印</li>
        <li>打印完成后，订单自动变为"已发货"状态</li>
      </ol>

      <div class="tip-box">
        <h4>💡 提示</h4>
        <p>如果API调用失败，系统会提示错误信息。常见原因包括：API凭证错误、月结编码未生效、余额不足等。请检查API配置或联系快递公司。</p>
      </div>
    </section>

    <section>
      <h2>三、手动发货（单个）</h2>
      <el-tag>无需API · 手动输入单号</el-tag>

      <h3>操作步骤</h3>
      <ol>
        <li>在发货列表找到待发货订单</li>
        <li>点击操作列的 <strong>"发货"</strong> 按钮</li>
        <li>在弹窗中填写：
          <ul>
            <li><strong>物流公司</strong>：选择快递公司</li>
            <li><strong>快递单号</strong>：手动输入或扫描枪扫入快递单号</li>
            <li><strong>发货备注</strong>：可选</li>
          </ul>
        </li>
        <li>点击 <strong>"确认发货"</strong></li>
        <li>订单状态变为"已发货"</li>
      </ol>
    </section>

    <section>
      <h2>四、批量打印面单</h2>
      <el-tag type="success">高效 · 批量获取单号并打印</el-tag>

      <h3>操作步骤</h3>
      <ol>
        <li>在待发货列表中，勾选需要发货的多个订单</li>
        <li>点击上方的 <strong>"批量打印面单"</strong> 按钮</li>
        <li>确认物流公司和寄件人信息（批量操作使用统一设置）</li>
        <li>点击 <strong>"批量获取单号"</strong></li>
        <li>系统依次为每个订单调用API获取快递单号</li>
        <li>全部获取成功后，点击 <strong>"批量打印"</strong></li>
        <li>所有面单依次打印，订单批量更新为"已发货"</li>
      </ol>

      <h3>注意事项</h3>
      <ul>
        <li>批量操作时所有订单使用同一家快递公司</li>
        <li>如果部分订单取号失败，系统会标注失败原因，成功的可以继续打印</li>
        <li>建议每批不超过50单，避免API请求超时</li>
      </ul>
    </section>

    <section>
      <h2>五、批量发货（手动输入单号）</h2>

      <h3>操作步骤</h3>
      <ol>
        <li>勾选多个待发货订单</li>
        <li>点击 <strong>"批量发货"</strong> 按钮</li>
        <li>在弹窗中为每个订单选择物流公司和输入快递单号</li>
        <li>或使用扫描枪快速录入单号</li>
        <li>确认后批量发货</li>
      </ol>
    </section>

    <section>
      <h2>六、导入发货（Excel）</h2>

      <h3>操作步骤</h3>
      <ol>
        <li>点击 <strong>"批量发货"</strong> → 选择 <strong>"导入发货"</strong> 模式</li>
        <li>点击 <strong>"下载模板"</strong> 获取发货导入Excel模板</li>
        <li>在模板中填写：
          <ul>
            <li><strong>订单号</strong>：必填</li>
            <li><strong>快递公司</strong>：公司名称或代码</li>
            <li><strong>快递单号</strong>：必填</li>
            <li><strong>备注</strong>：可选</li>
          </ul>
        </li>
        <li>上传填好的Excel文件</li>
        <li>系统校验数据后批量发货</li>
      </ol>

      <h3>模板格式示例</h3>
      <el-table :data="importExample" stripe style="width: 100%; margin: 10px 0" size="small">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="company" label="快递公司" width="120" />
        <el-table-column prop="trackingNo" label="快递单号" width="200" />
        <el-table-column prop="remark" label="备注" />
      </el-table>
    </section>

    <section>
      <h2>七、发货状态流转</h2>
      <div class="status-flow">
        <div class="status-item pending">待发货</div>
        <div class="status-arrow">→</div>
        <div class="status-item shipped">已发货</div>
        <div class="status-arrow">→</div>
        <div class="status-item transit">运输中</div>
        <div class="status-arrow">→</div>
        <div class="status-item delivered">已签收</div>
      </div>
      <p style="text-align: center; color: #909399; margin-top: 10px;">
        发货后系统自动跟踪物流状态，也支持手动标记签收/拒收/退回
      </p>

      <h3>特殊状态</h3>
      <ul>
        <li><strong>草稿</strong>：订单已创建但未审核通过，不能发货</li>
        <li><strong>退回</strong>：快递被拒收或退回，需要重新处理</li>
        <li><strong>取消</strong>：已取消的发货订单</li>
      </ul>
    </section>

    <section>
      <h2>八、常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 发货后发现单号填错了怎么办？" name="1">
          <p>A: 在物流列表中找到该订单，点击"修改单号"可以更正。如果是打印面单发货的，需要重新打印面单。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 一个订单可以分多个包裹发货吗？" name="2">
          <p>A: 当前版本暂不支持拆单发货。如需分包裹，建议在下单时拆分为多个订单。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 批量打印时部分订单失败怎么处理？" name="3">
          <p>A: 系统会标注每个订单的处理结果。成功的订单可以正常打印发货，失败的订单请检查错误信息后单独重试。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 导入发货对Excel格式有什么要求？" name="4">
          <p>A: 必须使用系统提供的模板，订单号和快递单号为必填项。快递公司可以填名称（如"顺丰速运"）或代码（如"SF"），系统会自动匹配。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
const shippingMethods = [
  { method: '打印面单发货', description: '系统自动调用API获取单号，生成并打印面单', needApi: '✅ 需要', scenario: '日常发货（推荐）' },
  { method: '手动发货', description: '手动输入已有的快递单号进行发货', needApi: '❌ 不需要', scenario: '已在快递网点寄件' },
  { method: '批量打印面单', description: '批量获取单号并打印面单', needApi: '✅ 需要', scenario: '大批量发货' },
  { method: '批量发货', description: '批量手动输入/扫描快递单号', needApi: '❌ 不需要', scenario: '已有批量快递单号' },
  { method: '导入发货', description: '通过Excel模板批量导入发货信息', needApi: '❌ 不需要', scenario: '从其他系统导入单号' },
]

const importExample = [
  { orderNo: 'ORD20260401001', company: '顺丰速运', trackingNo: 'SF1234567890', remark: '' },
  { orderNo: 'ORD20260401002', company: 'ZTO', trackingNo: '75312345678901', remark: '加急' },
  { orderNo: 'ORD20260401003', company: '圆通速递', trackingNo: 'YT1234567890', remark: '' },
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

.tip-box { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px; padding: 15px 20px; margin: 15px 0; }
.tip-box h4 { margin: 0 0 8px; color: #e6a23c; }
.tip-box p { margin: 0; color: #606266; }

.status-flow { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
.status-item { padding: 10px 24px; border-radius: 8px; font-weight: 500; color: white; }
.status-item.pending { background: #e6a23c; }
.status-item.shipped { background: #409eff; }
.status-item.transit { background: #67c23a; }
.status-item.delivered { background: #909399; }
.status-arrow { font-size: 24px; color: #c0c4cc; }

:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>


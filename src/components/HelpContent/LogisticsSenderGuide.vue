<template>
  <div class="help-content">
    <h1>寄件人配置指南</h1>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
      <template #title>寄件人信息用于发货面单的发件人填充。系统支持管理多个寄件人和退货地址，并设置默认项。</template>
    </el-alert>

    <section>
      <h2>一、功能概述</h2>
      <p>寄件人与退货地址管理包含两个功能模块：</p>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">📮</div>
          <h4>寄件人信息</h4>
          <p>管理发货寄件人，打印面单时自动填充默认寄件人的姓名、电话、地址。支持添加多个寄件人，按需切换。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📦</div>
          <h4>退货地址</h4>
          <p>管理退货收货地址，售后退货时自动匹配。可关联特定的售后类型（退货、换货、维修），实现智能匹配。</p>
        </div>
      </div>
    </section>

    <section>
      <h2>二、寄件人管理</h2>

      <h3>进入管理页面</h3>
      <ol>
        <li>进入 <strong>物流管理 → 发货列表</strong></li>
        <li>点击标签页右侧的 <strong>"寄件人"</strong> 按钮</li>
        <li>在弹窗中默认显示"寄件人信息"标签页</li>
      </ol>

      <h3>添加寄件人</h3>
      <ol>
        <li>点击 <strong>"添加寄件人"</strong> 按钮</li>
        <li>填写以下信息：
          <ul>
            <li><strong>联系人</strong>（必填）：寄件人姓名</li>
            <li><strong>联系电话</strong>（必填）：寄件人手机号</li>
            <li><strong>省/市/区</strong>：发货地的省、市、区县</li>
            <li><strong>详细地址</strong>（必填）：不含省市区的具体地址</li>
            <li><strong>备注</strong>：附加说明（如"仓库A"、"总部发货"等）</li>
            <li><strong>设为默认</strong>：开启后打印面单时自动使用此寄件人</li>
          </ul>
        </li>
        <li>点击 <strong>"保存"</strong></li>
      </ol>

      <h3>设为默认寄件人</h3>
      <p>同一类型（寄件人/退货地址）下只能有一个默认项。设置新的默认后，原默认会自动取消。</p>
      <ul>
        <li>在列表中点击 <strong>"设为默认"</strong> 按钮即可</li>
        <li>默认寄件人会显示 <el-tag type="warning" size="small">默认</el-tag> 标识</li>
        <li>也可以点击 <strong>"取消默认"</strong> 来取消</li>
      </ul>
    </section>

    <section>
      <h2>三、退货地址管理</h2>

      <h3>添加退货地址</h3>
      <ol>
        <li>切换到 <strong>"退货地址"</strong> 标签页</li>
        <li>点击 <strong>"添加退货地址"</strong></li>
        <li>除基本信息外，还可以配置 <strong>"关联售后"</strong>：
          <ul>
            <li>勾选 <strong>退货</strong>：该地址用于退货售后</li>
            <li>勾选 <strong>换货</strong>：该地址用于换货售后</li>
            <li>勾选 <strong>维修</strong>：该地址用于维修售后</li>
          </ul>
        </li>
        <li>售后处理时系统会根据售后类型自动推荐匹配的退货地址</li>
      </ol>
    </section>

    <section>
      <h2>四、使用场景</h2>

      <h3>打印面单时</h3>
      <p>当您在发货列表点击"打印面单发货"时：</p>
      <ol>
        <li>系统自动获取默认寄件人信息</li>
        <li>将寄件人姓名、电话、地址填入面单的发件人区域</li>
        <li>如果没有设置默认寄件人，需要手动选择或填写</li>
      </ol>

      <h3>手动发货时</h3>
      <p>在手动发货弹窗中也会显示默认寄件人信息（如果配置了API的话，用于提交取号请求）。</p>

      <h3>售后退货时</h3>
      <p>创建退货售后时，系统自动推荐与该售后类型关联的退货地址，减少客服操作。</p>
    </section>

    <section>
      <h2>五、注意事项</h2>
      <el-alert type="warning" :closable="false" style="margin-bottom: 15px">
        <template #title>
          <ul style="margin: 0; padding-left: 20px;">
            <li>寄件人信息按<strong>租户隔离</strong>，每个租户独立管理，互不影响</li>
            <li>打印面单时会使用默认寄件人的完整地址（省+市+区+详细地址）</li>
            <li>建议至少设置一个默认寄件人，避免每次打印都需要手动选择</li>
            <li>退货地址的"关联售后"可以多选，一个地址可以同时关联退货和换货</li>
          </ul>
        </template>
      </el-alert>
    </section>

    <section>
      <h2>六、常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 可以添加多少个寄件人？" name="1">
          <p>A: 没有数量限制。您可以根据需要添加多个寄件人（如不同仓库、不同分公司的发货地址），但默认寄件人只能设置一个。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 修改寄件人信息后，已发货的面单会受影响吗？" name="2">
          <p>A: 不会。已打印的面单使用的是打印时的寄件人快照，后续修改不会影响已发出的面单。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 退货地址没有关联售后类型会怎样？" name="3">
          <p>A: 系统在自动推荐时不会匹配该地址，但客服仍可以手动选择它。建议为常用退货地址设置关联类型。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
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

.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 15px 0; }
.feature-card { padding: 20px; background: #f5f7fa; border-radius: 8px; border: 1px solid #e4e7ed; }
.feature-icon { font-size: 32px; margin-bottom: 8px; }
.feature-card h4 { margin: 0 0 8px; font-size: 16px; color: #303133; }
.feature-card p { margin: 0; font-size: 14px; color: #909399; }

:deep(.el-collapse-item__header) { font-weight: 500; color: #303133; }
:deep(.el-collapse-item__content) { color: #606266; line-height: 1.8; }
</style>


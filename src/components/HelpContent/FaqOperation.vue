<template>
  <div class="help-content">
    <h1>操作问题FAQ</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Operation /></el-icon>
        <div class="intro-text">
          <p>本页面汇总了系统日常操作中的常见问题和解决方案，帮助您快速解决使用过程中遇到的各种操作问题。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><User /></el-icon> 客户管理操作</h2>

      <el-collapse accordion>
        <el-collapse-item name="2">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何给客户添加跟进记录？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>进入"客户管理" → "客户列表"</li>
              <li>找到目标客户，点击"查看"进入详情页</li>
              <li>在"跟进记录"标签页点击"添加跟进"</li>
              <li>选择跟进方式（电话、微信、拜访等）</li>
              <li>填写跟进内容和结果</li>
              <li>设置下次跟进时间（可选）</li>
              <li>点击"保存"完成添加</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="3">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何把客户共享给其他销售？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p>系统提供两种方式将客户共享给其他销售人员：</p>

            <p><strong>方式一：客户分享（客户管理）</strong></p>
            <ol>
              <li>进入「客户管理」→「客户列表」</li>
              <li>找到要分享的客户，点击操作列的「分享」</li>
              <li>选择要分享给的销售人员</li>
              <li>确认分享</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>分享后，原销售和被分享的销售都可以查看和跟进该客户</span>
            </div>

            <p><strong>方式二：分配资料（资料管理）</strong></p>
            <ol>
              <li>进入「资料管理」→「资料列表」</li>
              <li>勾选需要分配的客户资料</li>
              <li>点击「分配」按钮</li>
              <li>选择目标销售人员</li>
              <li>确认分配</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>分配后，客户归属会变更为目标销售人员</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="4">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>客户被误删了怎么恢复？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p>删除的客户会进入回收站，可以在30天内恢复：</p>
            <ol>
              <li>进入"资料管理" → "回收站"</li>
              <li>找到被删除的客户记录</li>
              <li>点击"恢复"按钮</li>
              <li>客户将恢复到原来的归属销售名下</li>
            </ol>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>回收站数据保留30天，超过30天将被永久删除</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Document /></el-icon> 订单管理操作</h2>

      <el-collapse accordion>
        <el-collapse-item name="5">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何创建新订单？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>方式一：从客户详情创建</strong></p>
            <ol>
              <li>进入客户详情页</li>
              <li>点击"新建订单"按钮</li>
              <li>系统自动填充客户信息</li>
              <li>选择商品、填写收货地址</li>
              <li>确认订单信息后提交</li>
            </ol>
            <p><strong>方式二：从订单列表创建</strong></p>
            <ol>
              <li>进入"订单管理" → "订单列表"</li>
              <li>点击"新增订单"</li>
              <li>搜索并选择客户</li>
              <li>添加商品、填写信息</li>
              <li>提交订单</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="6">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>订单提审后可以修改吗？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>不同状态的修改规则：</strong></p>
            <div class="status-table">
              <div class="status-row">
                <span class="status-name">待流转</span>
                <span class="status-action">可以直接编辑修改</span>
              </div>
              <div class="status-row">
                <span class="status-name">待审核</span>
                <span class="status-action">需要先撤回，再修改后重新提审</span>
              </div>
              <div class="status-row">
                <span class="status-name">审核拒绝</span>
                <span class="status-action">可以编辑修改后重新提审</span>
              </div>
              <div class="status-row">
                <span class="status-name">审核通过</span>
                <span class="status-action">不可修改，如需修改请联系管理员</span>
              </div>
              <div class="status-row">
                <span class="status-name">已发货</span>
                <span class="status-action">不可修改</span>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="7">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何批量审核订单？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>进入"订单管理" → "订单审核"</li>
              <li>使用筛选条件筛选待审核订单</li>
              <li>勾选需要审核的订单（可全选）</li>
              <li>点击"批量审核"按钮</li>
              <li>选择"通过"或"拒绝"</li>
              <li>如果拒绝，需填写拒绝原因</li>
              <li>确认操作</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>批量审核前请仔细核对订单信息，审核通过后不可撤销</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="8">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何查看订单的操作记录？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p>每个订单都有完整的操作日志：</p>
            <ol>
              <li>进入订单详情页</li>
              <li>切换到"操作记录"标签页</li>
              <li>可以查看订单从创建到当前的所有操作记录</li>
              <li>包括：创建时间、提审时间、审核时间、发货时间等</li>
              <li>每条记录显示操作人、操作时间和操作内容</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Van /></el-icon> 物流发货操作</h2>

      <el-collapse accordion>
        <el-collapse-item name="9">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何给订单发货？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>单个发货：</strong></p>
            <ol>
              <li>进入"物流管理" → "发货列表"</li>
              <li>找到待发货订单，点击"发货"</li>
              <li>选择物流公司</li>
              <li>填写快递单号</li>
              <li>确认发货</li>
            </ol>
            <p><strong>批量发货：</strong></p>
            <ol>
              <li>勾选多个待发货订单</li>
              <li>点击"批量发货"</li>
              <li>下载发货模板，填写快递单号</li>
              <li>上传填写好的模板</li>
              <li>确认批量发货</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="10">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何查询物流轨迹？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>进入"物流管理" → "物流列表"</li>
              <li>找到目标订单，点击"查看物流"</li>
              <li>系统会自动查询并显示物流轨迹</li>
              <li>可以看到包裹的实时位置和状态</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>物流信息通常在发货后2-4小时内更新</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="11">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>发货后发现快递单号填错了怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>进入"物流管理" → "物流列表"</li>
              <li>找到该订单，点击"修改物流"</li>
              <li>修改快递公司或快递单号</li>
              <li>保存修改</li>
            </ol>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>已签收的订单无法修改物流信息</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><DataAnalysis /></el-icon> 数据导出操作</h2>

      <el-collapse accordion>
        <el-collapse-item name="12">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何导出客户数据？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>进入"客户管理" → "客户列表"</li>
              <li>使用筛选条件筛选需要导出的客户</li>
              <li>点击"导出"按钮</li>
              <li>选择需要导出的字段</li>
              <li>点击"确认导出"</li>
              <li>等待生成Excel文件并下载</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>导出数据量较大时可能需要等待几秒钟</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="13">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何导出订单数据？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>进入"订单管理" → "订单列表"</li>
              <li>设置筛选条件（时间范围、订单状态等）</li>
              <li>点击"导出"按钮</li>
              <li>选择导出格式和字段</li>
              <li>确认导出</li>
            </ol>
            <p><strong>可导出的字段包括：</strong></p>
            <ul>
              <li>订单基本信息（订单号、金额、状态等）</li>
              <li>客户信息（姓名、电话、地址等）</li>
              <li>商品信息（商品名称、数量、单价等）</li>
              <li>物流信息（快递公司、单号等）</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="14">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导出的Excel文件打不开怎么办？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因和解决方法：</strong></p>
            <ul>
              <li><strong>文件未下载完整</strong>：重新导出下载</li>
              <li><strong>Excel版本过低</strong>：使用Office 2010及以上版本</li>
              <li><strong>文件被损坏</strong>：尝试用WPS打开</li>
              <li><strong>文件过大</strong>：分批导出，减少数据量</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 系统设置操作</h2>

      <el-collapse accordion>
        <el-collapse-item name="15">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何修改个人密码？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>点击右上角头像</li>
              <li>选择"个人设置"</li>
              <li>切换到"修改密码"标签</li>
              <li>输入当前密码</li>
              <li>输入新密码（两次确认）</li>
              <li>点击"保存"</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>密码要求：8-20位，包含字母和数字</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="16">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何添加新用户？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤（需要管理员权限）：</strong></p>
            <ol>
              <li>进入"系统管理" → "用户管理"</li>
              <li>点击"新增用户"</li>
              <li>填写用户信息（用户名、姓名、手机号等）</li>
              <li>选择所属部门</li>
              <li>分配角色权限</li>
              <li>设置初始密码</li>
              <li>点击"保存"</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="17">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何设置消息通知？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>操作步骤：</strong></p>
            <ol>
              <li>点击右上角头像 → "个人设置"</li>
              <li>切换到"通知设置"标签</li>
              <li>根据需要开启或关闭各类通知：
                <ul>
                  <li>订单通知（新订单、审核结果等）</li>
                  <li>客户通知（新客户分配等）</li>
                  <li>系统通知（公告、提醒等）</li>
                </ul>
              </li>
              <li>保存设置</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Promotion /></el-icon> 快捷操作技巧</h2>

      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon">⌨️</div>
          <h4>快捷键</h4>
          <ul>
            <li><code>Ctrl + F</code> 页面内搜索</li>
            <li><code>Enter</code> 确认操作</li>
            <li><code>Esc</code> 关闭弹窗</li>
          </ul>
        </div>
        <div class="tip-card">
          <div class="tip-icon">📋</div>
          <h4>表格操作</h4>
          <ul>
            <li>点击表头可排序</li>
            <li>拖拽表头调整列宽</li>
            <li>右键查看快捷菜单</li>
          </ul>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🔍</div>
          <h4>搜索技巧</h4>
          <ul>
            <li>支持模糊搜索</li>
            <li>可组合多个条件</li>
            <li>常用筛选可保存</li>
          </ul>
        </div>
        <div class="tip-card">
          <div class="tip-icon">📱</div>
          <h4>移动端</h4>
          <ul>
            <li>支持手机浏览器访问</li>
            <li>推荐使用APP</li>
            <li>数据实时同步</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Operation, User, Document, Van, DataAnalysis, Setting,
  Promotion, InfoFilled, WarningFilled
} from '@element-plus/icons-vue'
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
  margin: 35px 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 15px 0 10px;
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

.help-content code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #e6a23c;
}

section {
  margin-bottom: 40px;
}

.intro-section {
  margin-bottom: 30px;
}

.intro-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 25px;
  border-radius: 12px;
  color: white;
}

.intro-icon {
  font-size: 48px;
  opacity: 0.9;
}

.intro-text p {
  margin: 0;
  color: white;
  font-size: 15px;
  line-height: 1.8;
}

.faq-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.faq-answer {
  padding: 15px 0;
  border-top: 1px solid #ebeef5;
}

.faq-answer ol, .faq-answer ul {
  margin: 15px 0;
}

.faq-answer li {
  margin: 8px 0;
  line-height: 1.8;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #ecf5ff;
  border-radius: 6px;
  margin: 15px 0;
  color: #409eff;
  font-size: 14px;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  background: #fef0f0;
  border-radius: 6px;
  margin: 15px 0;
  color: #f56c6c;
  font-size: 14px;
}

.status-table {
  margin: 15px 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.status-row {
  display: flex;
  border-bottom: 1px solid #ebeef5;
}

.status-row:last-child {
  border-bottom: none;
}

.status-name {
  width: 120px;
  padding: 12px 15px;
  background: #f5f7fa;
  font-weight: 500;
  color: #303133;
}

.status-action {
  flex: 1;
  padding: 12px 15px;
  color: #606266;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.tip-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.tip-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.tip-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.tip-card h4 {
  margin: 10px 0;
  color: #409eff;
}

.tip-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.tip-card li {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
  padding-left: 15px;
  position: relative;
}

.tip-card li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #409eff;
}

:deep(.el-collapse-item__header) {
  height: auto;
  padding: 15px 0;
  line-height: 1.5;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 20px;
}
</style>

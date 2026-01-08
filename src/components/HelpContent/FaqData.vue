<template>
  <div class="help-content">
    <h1>数据问题FAQ</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><DataBoard /></el-icon>
        <div class="intro-text">
          <p>本页面汇总了数据显示、数据导入导出、数据统计等方面的常见问题和解决方案，帮助您快速解决数据相关的疑问。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><View /></el-icon> 数据显示问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="1">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>数据列表显示为空或数据不全？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li><strong>权限限制</strong>：当前用户可能没有查看该数据的权限</li>
              <li><strong>筛选条件</strong>：检查是否设置了过滤条件导致数据被过滤</li>
              <li><strong>数据范围</strong>：销售员只能看到自己的数据，经理可以看到部门数据</li>
              <li><strong>时间范围</strong>：默认可能只显示近期数据</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>清除所有筛选条件，点击"重置"按钮</li>
              <li>检查时间范围是否正确</li>
              <li>确认当前账号的数据权限</li>
              <li>刷新页面重新加载数据</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="2">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>数据更新不及时，看不到最新数据？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>浏览器缓存导致显示旧数据</li>
              <li>WebSocket连接断开，无法接收实时更新</li>
              <li>网络延迟导致数据同步慢</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>点击页面刷新按钮或按 <code>F5</code> 刷新</li>
              <li>检查右上角WebSocket连接状态图标</li>
              <li>清除浏览器缓存：<code>Ctrl + Shift + Delete</code></li>
              <li>检查网络连接是否正常</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>系统支持实时数据推送，正常情况下数据会自动更新</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="3">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>统计数据与实际数据不一致？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>统计时间范围与查看的数据时间范围不同</li>
              <li>统计规则理解有误（如业绩只统计已签收订单）</li>
              <li>数据正在同步中，尚未完成</li>
              <li>存在被删除或作废的数据</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>确认统计时间范围设置正确</li>
              <li>了解统计规则：
                <ul>
                  <li>业绩统计：只计算已签收的订单金额</li>
                  <li>订单统计：包含所有状态的订单</li>
                  <li>客户统计：只计算有效客户</li>
                </ul>
              </li>
              <li>等待几分钟后刷新页面</li>
              <li>如仍有疑问，联系管理员核实</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="4">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>图表数据显示异常或不显示？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>选择的时间范围内没有数据</li>
              <li>浏览器不支持图表渲染</li>
              <li>页面加载不完整</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>调整时间范围，选择有数据的时间段</li>
              <li>使用Chrome、Edge等现代浏览器</li>
              <li>刷新页面重新加载</li>
              <li>清除浏览器缓存后重试</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Upload /></el-icon> 数据导入问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="5">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导入数据失败，提示格式错误？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>常见原因和解决方法：</strong></p>
            <div class="error-table">
              <div class="error-row">
                <div class="error-type">文件格式错误</div>
                <div class="error-solution">只支持 .xlsx 和 .xls 格式，请使用Excel保存</div>
              </div>
              <div class="error-row">
                <div class="error-type">模板不匹配</div>
                <div class="error-solution">请下载最新的导入模板，按模板格式填写</div>
              </div>
              <div class="error-row">
                <div class="error-type">必填字段为空</div>
                <div class="error-solution">检查姓名、手机号等必填字段是否填写完整</div>
              </div>
              <div class="error-row">
                <div class="error-type">手机号格式错误</div>
                <div class="error-solution">手机号必须是11位数字，不能包含空格或特殊字符</div>
              </div>
              <div class="error-row">
                <div class="error-type">日期格式错误</div>
                <div class="error-solution">日期格式应为 YYYY-MM-DD 或 YYYY/MM/DD</div>
              </div>
            </div>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>建议先导入少量数据测试，确认无误后再批量导入</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="6">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>部分数据导入成功，部分失败？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>处理方法：</strong></p>
            <ol>
              <li>导入完成后会显示导入结果报告</li>
              <li>点击"下载失败记录"获取失败数据</li>
              <li>查看每条失败记录的失败原因</li>
              <li>修正错误后重新导入失败的数据</li>
            </ol>
            <p><strong>常见失败原因：</strong></p>
            <ul>
              <li>手机号重复（系统中已存在）</li>
              <li>数据格式不正确</li>
              <li>必填字段缺失</li>
              <li>数据超出长度限制</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="7">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导入数据量太大，导入很慢或失败？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>单次导入建议不超过1000条记录</li>
              <li>大批量数据请分批导入</li>
              <li>导入时避免进行其他操作</li>
              <li>确保网络连接稳定</li>
            </ul>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>导入过程中请勿关闭页面或刷新，否则可能导致数据不完整</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Download /></el-icon> 数据导出问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="8">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导出的Excel文件打不开？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因和解决方法：</strong></p>
            <ul>
              <li><strong>文件下载不完整</strong>：重新导出下载，确保下载完成</li>
              <li><strong>Excel版本过低</strong>：使用Office 2010及以上版本，或使用WPS</li>
              <li><strong>文件被损坏</strong>：尝试用其他软件打开，如WPS、Google Sheets</li>
              <li><strong>文件过大</strong>：分批导出，减少单次导出的数据量</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="9">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导出的数据不完整？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>检查以下设置：</strong></p>
            <ol>
              <li>确认筛选条件设置正确，没有遗漏数据</li>
              <li>检查导出字段选择，确保选择了需要的字段</li>
              <li>确认有足够的数据查看权限</li>
              <li>检查数据总数是否超过导出限制（通常为10000条）</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>如需导出大量数据，请联系管理员协助</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="10">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>导出时间很长，一直在加载？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>解决方法：</strong></p>
            <ul>
              <li>数据量大时导出需要时间，请耐心等待</li>
              <li>可以缩小筛选范围，减少导出数据量</li>
              <li>避免在网络高峰期导出大量数据</li>
              <li>如果超过5分钟仍未完成，刷新页面重试</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Delete /></el-icon> 数据删除与恢复</h2>

      <el-collapse accordion>
        <el-collapse-item name="11">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>误删除的数据可以恢复吗？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可以恢复的数据：</strong></p>
            <ul>
              <li>客户数据：删除后进入回收站，30天内可恢复</li>
              <li>订单数据：作废的订单可以在订单列表中查看</li>
            </ul>
            <p><strong>恢复步骤：</strong></p>
            <ol>
              <li>进入"资料管理" → "回收站"</li>
              <li>找到需要恢复的数据</li>
              <li>点击"恢复"按钮</li>
            </ol>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>回收站数据保留30天，超过30天将被永久删除，无法恢复</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="12">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何彻底删除数据？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>彻底删除步骤：</strong></p>
            <ol>
              <li>先将数据删除到回收站</li>
              <li>进入回收站</li>
              <li>找到需要彻底删除的数据</li>
              <li>点击"彻底删除"按钮</li>
              <li>确认删除操作</li>
            </ol>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <span>彻底删除后数据无法恢复，请谨慎操作！</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Lock /></el-icon> 数据安全</h2>

      <div class="security-cards">
        <div class="security-card">
          <div class="security-icon">🔒</div>
          <h4>数据加密</h4>
          <p>敏感数据采用加密存储，传输过程使用HTTPS加密</p>
        </div>
        <div class="security-card">
          <div class="security-icon">💾</div>
          <h4>自动备份</h4>
          <p>系统每天自动备份数据，保留最近30天的备份</p>
        </div>
        <div class="security-card">
          <div class="security-icon">📝</div>
          <h4>操作日志</h4>
          <p>所有重要操作都有日志记录，可追溯操作历史</p>
        </div>
        <div class="security-card">
          <div class="security-icon">🛡️</div>
          <h4>权限控制</h4>
          <p>严格的角色权限控制，确保数据访问安全</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><QuestionFilled /></el-icon> 其他数据问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="13">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>如何查看数据的修改历史？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p>系统记录了重要数据的修改历史：</p>
            <ul>
              <li><strong>订单</strong>：在订单详情页的"操作记录"中查看</li>
              <li><strong>客户</strong>：在客户详情页的"操作日志"中查看</li>
              <li><strong>系统操作</strong>：管理员可在"系统管理"中查看系统日志</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="14">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>数据同步到APP需要多长时间？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p>数据同步机制：</p>
            <ul>
              <li><strong>实时同步</strong>：通话记录、新订单等实时推送</li>
              <li><strong>定时同步</strong>：客户数据每5分钟同步一次</li>
              <li><strong>手动同步</strong>：在APP中下拉刷新可立即同步</li>
            </ul>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>如果数据长时间未同步，请检查APP的网络连接</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  DataBoard, View, Upload, Download, Delete, Lock,
  QuestionFilled, InfoFilled, WarningFilled
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

.error-table {
  margin: 15px 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.error-row {
  display: flex;
  border-bottom: 1px solid #ebeef5;
}

.error-row:last-child {
  border-bottom: none;
}

.error-type {
  width: 150px;
  padding: 12px 15px;
  background: #fef0f0;
  font-weight: 500;
  color: #f56c6c;
}

.error-solution {
  flex: 1;
  padding: 12px 15px;
  color: #606266;
}

.security-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.security-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s;
}

.security-card:hover {
  transform: translateY(-5px);
}

.security-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.security-card h4 {
  margin: 10px 0;
  color: #303133;
}

.security-card p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
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

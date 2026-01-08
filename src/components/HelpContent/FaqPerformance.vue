<template>
  <div class="help-content">
    <h1>性能问题FAQ</h1>

    <section class="intro-section">
      <div class="intro-card">
        <el-icon class="intro-icon"><Odometer /></el-icon>
        <div class="intro-text">
          <p>本页面汇总了系统性能相关的常见问题和优化建议，帮助您获得更流畅的使用体验。如果遇到系统卡顿、加载慢等问题，可以参考以下解决方案。</p>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Loading /></el-icon> 页面加载问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="1">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>首次打开系统加载很慢？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>原因说明：</strong></p>
            <p>首次访问系统需要下载前端资源文件（JS、CSS、图片等），这是正常现象。后续访问会使用浏览器缓存，速度会明显提升。</p>
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>使用Chrome、Edge等现代浏览器</li>
              <li>确保网络连接稳定</li>
              <li>避免使用VPN或代理（可能增加延迟）</li>
              <li>首次加载完成后，后续访问会快很多</li>
            </ul>
            <div class="performance-indicator">
              <div class="indicator-item">
                <span class="indicator-label">首次加载</span>
                <el-progress :percentage="100" :stroke-width="10" status="warning">
                  <span>3-5秒</span>
                </el-progress>
              </div>
              <div class="indicator-item">
                <span class="indicator-label">缓存后加载</span>
                <el-progress :percentage="30" :stroke-width="10" status="success">
                  <span>1-2秒</span>
                </el-progress>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="2">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>数据列表加载很慢？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>数据量过大，一次加载太多数据</li>
              <li>网络带宽不足</li>
              <li>服务器负载较高</li>
            </ul>
            <p><strong>优化建议：</strong></p>
            <ol>
              <li><strong>使用筛选条件</strong>：缩小数据范围，只加载需要的数据</li>
              <li><strong>调整分页大小</strong>：将每页显示数量从50调整为20或30</li>
              <li><strong>避免导出过大数据</strong>：分批导出大量数据</li>
              <li><strong>定期清理历史数据</strong>：归档或删除不需要的旧数据</li>
            </ol>
          </div>
        </el-collapse-item>

        <el-collapse-item name="3">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>图表渲染很慢或卡顿？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>缩短统计时间范围（如从一年改为一个月）</li>
              <li>减少图表数据点数量</li>
              <li>关闭不必要的动画效果</li>
              <li>使用性能更好的浏览器（推荐Chrome）</li>
              <li>关闭其他占用资源的程序</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Mouse /></el-icon> 操作响应问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="4">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>点击按钮无反应或反应很慢？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>上一个操作尚未完成</li>
              <li>网络请求超时</li>
              <li>浏览器资源占用过高</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>等待当前操作完成再进行下一步</li>
              <li>避免快速连续点击同一按钮</li>
              <li>检查网络连接状态</li>
              <li>刷新页面重试</li>
              <li>关闭其他不必要的浏览器标签页</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>按钮点击后会显示加载状态，请等待操作完成</span>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="5">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>表格滚动卡顿？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>减少每页显示的数据量（建议20-30条）</li>
              <li>隐藏不需要的列</li>
              <li>使用筛选减少数据量</li>
              <li>升级浏览器到最新版本</li>
              <li>关闭浏览器的硬件加速（如果有问题）</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="6">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>弹窗打开很慢？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>弹窗需要加载数据</li>
              <li>弹窗内容较复杂</li>
              <li>浏览器性能不足</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>等待数据加载完成</li>
              <li>检查网络连接</li>
              <li>刷新页面后重试</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Cpu /></el-icon> 内存与资源问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="7">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>浏览器内存占用过高？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li><strong>定期刷新页面</strong>：每隔几小时刷新一次释放内存</li>
              <li><strong>关闭不使用的标签页</strong>：减少浏览器内存占用</li>
              <li><strong>避免长时间不刷新</strong>：长时间运行可能累积内存</li>
              <li><strong>增加电脑内存</strong>：建议8GB以上内存</li>
            </ul>
            <div class="memory-tips">
              <div class="memory-tip">
                <span class="tip-icon">💡</span>
                <span>建议每天至少刷新一次页面</span>
              </div>
              <div class="memory-tip">
                <span class="tip-icon">💡</span>
                <span>同时打开的标签页不超过10个</span>
              </div>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="8">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>系统运行一段时间后变慢？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>原因说明：</strong></p>
            <p>长时间运行可能导致浏览器内存累积、缓存数据增多等问题。</p>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>刷新页面（按 <code>F5</code> 或 <code>Ctrl + R</code>）</li>
              <li>清理浏览器缓存（<code>Ctrl + Shift + Delete</code>）</li>
              <li>重启浏览器</li>
              <li>检查电脑性能，关闭其他占用资源的程序</li>
            </ol>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Connection /></el-icon> 网络问题</h2>

      <el-collapse accordion>
        <el-collapse-item name="9">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>网络连接不稳定，经常断开？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>使用有线网络连接（比WiFi更稳定）</li>
              <li>检查网络带宽是否充足</li>
              <li>避免网络高峰期使用</li>
              <li>联系网络服务商检查线路</li>
              <li>检查路由器是否正常工作</li>
            </ul>
            <div class="network-status">
              <h4>网络状态检查</h4>
              <ul>
                <li>✅ 能正常打开其他网站</li>
                <li>✅ Ping服务器延迟低于100ms</li>
                <li>✅ 没有频繁的网络波动</li>
              </ul>
            </div>
          </div>
        </el-collapse-item>

        <el-collapse-item name="10">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>上传文件很慢或失败？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>优化建议：</strong></p>
            <ul>
              <li>检查文件大小是否超过限制（通常100MB）</li>
              <li>确保网络连接稳定</li>
              <li>尝试分批上传（多个小文件比一个大文件更稳定）</li>
              <li>使用有线网络上传大文件</li>
              <li>避免在上传过程中进行其他操作</li>
            </ul>
          </div>
        </el-collapse-item>

        <el-collapse-item name="11">
          <template #title>
            <div class="faq-title">
              <el-tag type="primary" size="small">Q</el-tag>
              <span>WebSocket连接经常断开？</span>
            </div>
          </template>
          <div class="faq-answer">
            <p><strong>可能的原因：</strong></p>
            <ul>
              <li>网络不稳定</li>
              <li>防火墙或代理阻止WebSocket</li>
              <li>服务器负载过高</li>
            </ul>
            <p><strong>解决方法：</strong></p>
            <ol>
              <li>检查网络连接</li>
              <li>刷新页面重新连接</li>
              <li>检查是否使用了代理或VPN</li>
              <li>联系管理员检查服务器状态</li>
            </ol>
            <div class="tip-box">
              <el-icon><InfoFilled /></el-icon>
              <span>WebSocket断开后系统会自动尝试重连</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </section>

    <section>
      <h2><el-icon><Setting /></el-icon> 性能优化建议</h2>

      <div class="optimization-section">
        <h3>浏览器设置</h3>
        <div class="optimization-cards">
          <div class="opt-card">
            <div class="opt-icon">🌐</div>
            <h4>使用现代浏览器</h4>
            <p>推荐Chrome、Edge、Firefox最新版本</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">⚡</div>
            <h4>启用硬件加速</h4>
            <p>在浏览器设置中开启GPU加速</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">🧹</div>
            <h4>定期清理缓存</h4>
            <p>每周清理一次浏览器缓存</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">🔌</div>
            <h4>禁用不必要插件</h4>
            <p>关闭广告拦截等可能影响性能的插件</p>
          </div>
        </div>

        <h3>系统使用习惯</h3>
        <div class="optimization-cards">
          <div class="opt-card">
            <div class="opt-icon">🔍</div>
            <h4>合理使用筛选</h4>
            <p>使用筛选条件减少数据加载量</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">📑</div>
            <h4>控制标签页数量</h4>
            <p>避免同时打开过多页面</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">📦</div>
            <h4>定期清理数据</h4>
            <p>导出并清理不需要的历史数据</p>
          </div>
          <div class="opt-card">
            <div class="opt-icon">🔄</div>
            <h4>定期刷新页面</h4>
            <p>每天刷新页面释放内存</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2><el-icon><Monitor /></el-icon> 推荐配置</h2>

      <div class="config-table">
        <div class="config-row header">
          <span>配置项</span>
          <span>最低要求</span>
          <span>推荐配置</span>
        </div>
        <div class="config-row">
          <span>浏览器</span>
          <span>Chrome 80+</span>
          <span>Chrome 最新版</span>
        </div>
        <div class="config-row">
          <span>内存</span>
          <span>4GB</span>
          <span>8GB+</span>
        </div>
        <div class="config-row">
          <span>网络</span>
          <span>4Mbps</span>
          <span>10Mbps+</span>
        </div>
        <div class="config-row">
          <span>分辨率</span>
          <span>1366×768</span>
          <span>1920×1080</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Odometer, Loading, Mouse, Cpu, Connection, Setting,
  Monitor, InfoFilled
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

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 25px 0 15px;
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
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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

.performance-indicator {
  margin: 20px 0;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 15px 0;
}

.indicator-label {
  width: 100px;
  font-size: 14px;
  color: #606266;
}

.indicator-item :deep(.el-progress) {
  flex: 1;
}

.memory-tips {
  margin: 15px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.memory-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
}

.tip-icon {
  font-size: 18px;
}

.network-status {
  margin: 15px 0;
  padding: 15px;
  background: #f0f9eb;
  border-radius: 8px;
  border-left: 4px solid #67c23a;
}

.network-status h4 {
  margin: 0 0 10px;
  color: #67c23a;
}

.network-status ul {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.network-status li {
  margin: 5px 0;
  font-size: 14px;
}

.optimization-section {
  margin: 20px 0;
}

.optimization-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 15px 0 30px;
}

.opt-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.opt-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.opt-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.opt-card h4 {
  margin: 10px 0 5px;
  color: #303133;
  font-size: 14px;
}

.opt-card p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.config-table {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

.config-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-bottom: 1px solid #ebeef5;
}

.config-row:last-child {
  border-bottom: none;
}

.config-row.header {
  background: #f5f7fa;
  font-weight: 600;
  color: #303133;
}

.config-row span {
  padding: 12px 15px;
  font-size: 14px;
  color: #606266;
}

.config-row span:not(:last-child) {
  border-right: 1px solid #ebeef5;
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

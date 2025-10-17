<template>
  <div class="install-guide-container">
    <div class="header">
      <h1>📱 CRM移动SDK安装指南</h1>
      <p class="subtitle">Progressive Web App (PWA) - 无需应用商店，直接安装</p>
    </div>

    <div class="content">
      <!-- 重要提示 -->
      <div class="alert alert-warning">
        <h3>⚠️ 重要说明</h3>
        <p>之前提供的APK文件是错误的格式，无法在Android设备上安装。</p>
        <p>现在我们提供的是PWA应用，这是更好的解决方案！</p>
      </div>

      <!-- PWA优势 -->
      <div class="section">
        <h2>🚀 PWA应用的优势</h2>
        <ul class="advantages">
          <li>✅ 无需从应用商店下载</li>
          <li>✅ 自动更新，始终是最新版本</li>
          <li>✅ 支持离线使用</li>
          <li>✅ 接近原生应用的体验</li>
          <li>✅ 占用存储空间更小</li>
          <li>✅ 跨平台兼容（Android/iOS）</li>
        </ul>
      </div>

      <!-- Android安装方法 -->
      <div class="section">
        <h2>📱 Android设备安装方法</h2>
        
        <div class="method">
          <h3>方法一：Chrome浏览器自动安装（推荐）</h3>
          <ol>
            <li>在Android手机上打开 <strong>Chrome浏览器</strong></li>
            <li>访问：<code>{{ sdkUrl }}</code></li>
            <li>等待页面加载完成</li>
            <li>点击地址栏右侧的 <strong>"安装"</strong> 按钮</li>
            <li>或点击浏览器菜单（三个点）→ <strong>"安装应用"</strong></li>
            <li>确认安装，应用将自动添加到主屏幕</li>
          </ol>
        </div>

        <div class="method">
          <h3>方法二：手动添加到主屏幕</h3>
          <ol>
            <li>在手机浏览器中访问：<code>{{ sdkUrl }}</code></li>
            <li>点击浏览器菜单（三个点）</li>
            <li>选择 <strong>"添加到主屏幕"</strong></li>
            <li>输入应用名称（如：CRM SDK）</li>
            <li>点击 <strong>"添加"</strong></li>
          </ol>
        </div>
      </div>

      <!-- iOS安装方法 -->
      <div class="section">
        <h2>🍎 iOS设备安装方法</h2>
        <ol>
          <li>在iPhone/iPad上打开 <strong>Safari浏览器</strong></li>
          <li>访问：<code>{{ sdkUrl }}</code></li>
          <li>点击底部的 <strong>分享按钮</strong> <span class="icon">📤</span></li>
          <li>向下滚动，选择 <strong>"添加到主屏幕"</strong></li>
          <li>输入应用名称，点击 <strong>"添加"</strong></li>
        </ol>
      </div>

      <!-- 版本更新 -->
      <div class="section">
        <h2>🆕 版本 1.1.0 更新内容</h2>
        <div class="update-notes">
          <div class="update-item">
            <h4>🎨 界面优化</h4>
            <p>重新设计了移动SDK界面，优化了图标、按键布局和整体视觉效果</p>
          </div>
          <div class="update-item">
            <h4>🔐 权限管理优化</h4>
            <p>改进了权限管理流程，提供更清晰的权限状态说明和引导</p>
          </div>
          <div class="update-item">
            <h4>🔄 持久化连接</h4>
            <p>实现了连接配置的持久化存储，支持断开重连功能</p>
          </div>
          <div class="update-item">
            <h4>📱 用户体验提升</h4>
            <p>优化了连接状态显示，提供更详细的网络状态信息</p>
          </div>
        </div>
      </div>

      <!-- 功能说明 -->
      <div class="section">
        <h2>⚙️ 功能说明</h2>
        <div class="features">
          <div class="feature-item">
            <h4>📞 通话权限管理</h4>
            <p>智能检查和管理通话相关权限，提供详细的权限说明</p>
          </div>
          <div class="feature-item">
            <h4>🔍 SDK状态检查</h4>
            <p>实时检查SDK连接状态，显示详细的连接信息</p>
          </div>
          <div class="feature-item">
            <h4>🧪 连接测试</h4>
            <p>测试与CRM系统的连接，支持自动重连</p>
          </div>
          <div class="feature-item">
            <h4>📱 离线支持</h4>
            <p>支持离线使用基本功能，配置持久化存储</p>
          </div>
          <div class="feature-item">
            <h4>📲 二维码连接</h4>
            <p>支持通过扫描二维码快速配置连接（Android版本）</p>
          </div>
        </div>
      </div>

      <!-- 快速访问 -->
      <div class="section">
        <h2>🔗 快速访问</h2>
        <div class="quick-access">
          <a :href="sdkUrl" target="_blank" class="btn btn-primary">
            🚀 立即访问PWA应用
          </a>
          <a href="/mobile-sdk/INSTALL_GUIDE.txt" target="_blank" class="btn btn-secondary">
            📋 下载安装指南
          </a>
        </div>
      </div>

      <!-- 故障排除 -->
      <div class="section">
        <h2>🔧 故障排除</h2>
        <div class="troubleshooting">
          <div class="issue">
            <h4>❓ 找不到"安装"按钮？</h4>
            <p>确保使用Chrome浏览器（Android）或Safari浏览器（iOS），并且网络连接正常。</p>
          </div>
          <div class="issue">
            <h4>❓ 安装后无法打开？</h4>
            <p>检查网络连接，PWA应用需要网络连接才能正常工作。</p>
          </div>
          <div class="issue">
            <h4>❓ 应用图标不显示？</h4>
            <p>这是正常现象，PWA应用可能需要几分钟才能完全加载图标。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 动态获取当前域名和端口
const sdkUrl = computed(() => {
  const { protocol, hostname, port } = window.location
  const portStr = port ? `:${port}` : ''
  return `${protocol}//${hostname}${portStr}/mobile-sdk/`
})
</script>

<style scoped>
.install-guide-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  color: #409EFF;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 16px;
}

.content {
  line-height: 1.6;
}

.section {
  margin-bottom: 40px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h2 {
  color: #333;
  margin-bottom: 20px;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 8px;
}

.alert {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.alert h3 {
  margin-bottom: 8px;
  color: #856404;
}

.advantages {
  list-style: none;
  padding: 0;
}

.advantages li {
  padding: 8px 0;
  font-size: 16px;
}

.method {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.method h3 {
  color: #409EFF;
  margin-bottom: 12px;
}

.method ol {
  margin-left: 20px;
}

.method li {
  margin-bottom: 8px;
}

code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e83e8c;
}

.update-notes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.update-item {
  padding: 16px;
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
  border-radius: 8px;
  border-left: 4px solid #52c41a;
}

.update-item h4 {
  color: #52c41a;
  margin-bottom: 8px;
  font-weight: 600;
}

.update-item p {
  color: #555;
  line-height: 1.5;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.feature-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.feature-item h4 {
  color: #409EFF;
  margin-bottom: 8px;
}

.quick-access {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  text-align: center;
  transition: all 0.3s;
}

.btn-primary {
  background: #409EFF;
  color: white;
}

.btn-primary:hover {
  background: #337ab7;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.troubleshooting .issue {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-left: 4px solid #409EFF;
}

.troubleshooting .issue h4 {
  color: #333;
  margin-bottom: 8px;
}

.icon {
  font-size: 18px;
}

@media (max-width: 768px) {
  .install-guide-container {
    padding: 16px;
  }
  
  .section {
    padding: 16px;
  }
  
  .quick-access {
    flex-direction: column;
  }
  
  .features {
    grid-template-columns: 1fr;
  }
  
  .update-notes {
    grid-template-columns: 1fr;
  }
}
</style>
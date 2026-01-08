<template>
  <div class="help-content">
    <h1>移动APP概述</h1>

    <section>
      <h2>产品介绍</h2>
      <p>
        云客CRM移动APP是云客CRM系统的移动端应用，专为销售人员外出办公设计。支持Android和iOS平台，提供外呼、通话记录、客户查询等核心功能。
      </p>
    </section>

    <section>
      <h2>核心功能</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">📞</div>
          <h3>一键外呼</h3>
          <p>直接拨打客户电话，通话记录自动同步到CRM系统</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📝</div>
          <h3>通话记录</h3>
          <p>查看所有通话记录，支持录音回放</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">👤</div>
          <h3>客户查询</h3>
          <p>快速查询客户信息，查看客户详情</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>业绩统计</h3>
          <p>查看个人通话统计和业绩数据</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔄</div>
          <h3>实时同步</h3>
          <p>通话数据实时同步到Web端</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>扫码登录</h3>
          <p>扫描Web端二维码快速登录</p>
        </div>
      </div>
    </section>

    <section>
      <h2>APP页面</h2>
      <div class="page-list">
        <div class="page-item">
          <h4>🏠 首页</h4>
          <p>展示今日通话统计、快捷操作入口</p>
        </div>
        <div class="page-item">
          <h4>📞 拨号盘</h4>
          <p>手动输入号码拨打电话</p>
        </div>
        <div class="page-item">
          <h4>📋 通话记录</h4>
          <p>查看所有通话记录列表</p>
        </div>
        <div class="page-item">
          <h4>📊 统计</h4>
          <p>查看通话统计数据</p>
        </div>
        <div class="page-item">
          <h4>⚙️ 设置</h4>
          <p>APP设置和账号管理</p>
        </div>
      </div>
    </section>

    <section>
      <h2>使用流程</h2>
      <div class="flow-steps">
        <div class="flow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>下载安装</h4>
            <p>从应用商店或扫码下载APP</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>配置服务器</h4>
            <p>输入服务器地址或扫码配置</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>登录账号</h4>
            <p>使用CRM账号登录或扫码登录</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>开始使用</h4>
            <p>拨打电话，记录自动同步</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>系统要求</h2>
      <div class="requirements">
        <div class="req-item">
          <h4>Android</h4>
          <ul>
            <li>Android 8.0 及以上</li>
            <li>需要电话权限</li>
            <li>需要录音权限（可选）</li>
            <li>需要网络权限</li>
          </ul>
        </div>
        <div class="req-item">
          <h4>iOS</h4>
          <ul>
            <li>iOS 12.0 及以上</li>
            <li>需要网络权限</li>
            <li>通话使用系统拨号</li>
          </ul>
        </div>
      </div>
    </section>

    <section>
      <h2>与Web端的关系</h2>
      <el-table :data="relationData" stripe style="width: 100%">
        <el-table-column prop="feature" label="功能" width="150" />
        <el-table-column prop="app" label="APP端" />
        <el-table-column prop="web" label="Web端" />
      </el-table>
    </section>

    <section>
      <h2>注意事项</h2>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>使用前请确认</template>
        <template #default>
          <ul style="margin: 10px 0 0; padding-left: 20px;">
            <li>已在Web端开通账号</li>
            <li>服务器地址配置正确</li>
            <li>网络连接正常</li>
            <li>已授予必要权限</li>
          </ul>
        </template>
      </el-alert>
    </section>

    <section>
      <h2>相关文档</h2>
      <ul>
        <li><a href="#" @click.prevent="$emit('navigate', 'app-install')">安装配置</a> - APP下载和服务器配置</li>
        <li><a href="#" @click.prevent="$emit('navigate', 'app-login')">登录绑定</a> - 登录方式和设备绑定</li>
        <li><a href="#" @click.prevent="$emit('navigate', 'app-call')">通话功能</a> - 外呼功能使用说明</li>
        <li><a href="#" @click.prevent="$emit('navigate', 'app-sync')">数据同步</a> - 数据同步机制说明</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
defineEmits(['navigate'])

const relationData = [
  { feature: '客户管理', app: '查询客户信息', web: '完整的客户管理功能' },
  { feature: '订单管理', app: '暂不支持', web: '完整的订单管理功能' },
  { feature: '通话记录', app: '查看和拨打', web: '查看和管理' },
  { feature: '录音回放', app: '支持播放', web: '支持播放和下载' },
  { feature: '业绩统计', app: '个人通话统计', web: '完整的业绩统计' },
  { feature: '系统设置', app: 'APP设置', web: '完整的系统设置' }
]
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
  margin: 30px 0 15px;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 15px 0 10px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 10px 0;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

.help-content a {
  color: #409eff;
  text-decoration: none;
}

.help-content a:hover {
  text-decoration: underline;
}

section {
  margin-bottom: 40px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.feature-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.feature-card h3 {
  margin: 0 0 10px;
  color: #303133;
}

.feature-card p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.page-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.page-item {
  background: #fafafa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.page-item h4 {
  margin: 0 0 8px;
}

.page-item p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.flow-steps {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  flex: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content h4 {
  margin: 0 0 5px;
}

.step-content p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.requirements {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 15px;
}

.req-item {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.req-item h4 {
  margin: 0 0 15px;
  color: #409eff;
}

.req-item ul {
  margin: 0;
  padding-left: 18px;
}

.req-item li {
  font-size: 13px;
  margin: 5px 0;
}

@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .flow-steps {
    flex-direction: column;
    gap: 20px;
  }

  .requirements {
    grid-template-columns: 1fr;
  }
}
</style>

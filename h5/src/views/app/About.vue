<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="关于" left-arrow @click-left="$router.back()" />

    <div class="about-hero">
      <div class="about-logo">
        <svg width="56" height="56" viewBox="0 0 44 44" fill="none">
          <defs><linearGradient id="alg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs>
          <rect width="44" height="44" rx="10" fill="url(#alg)"/>
          <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
          <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
          <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
          <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
        </svg>
      </div>
      <div class="about-name">云客 CRM</div>
      <div class="about-ver">企微工作台 H5 版</div>
      <div class="about-version">v1.0.0</div>
    </div>

    <div class="card">
      <van-cell-group :border="false">
        <van-cell title="产品名称" value="云客 CRM 企微工作台" />
        <van-cell title="版本号" value="1.0.0" />
        <van-cell title="技术栈" value="Vue3 + Vant4 + Vite" />
        <van-cell title="后端框架" value="Express + TypeORM" />
        <van-cell title="运行环境" value="企业微信 / 浏览器" />
      </van-cell-group>
    </div>

    <div class="card">
      <div class="section-title">功能特性</div>
      <div class="feature-list">
        <div class="feature-item">
          <van-icon name="friends-o" color="#6366f1" size="18" />
          <div>
            <div class="ft-title">客户管理</div>
            <div class="ft-desc">实时同步企微外部联系人，统一管理客户信息</div>
          </div>
        </div>
        <div class="feature-item">
          <van-icon name="chart-trending-o" color="#10b981" size="18" />
          <div>
            <div class="ft-title">数据报表</div>
            <div class="ft-desc">多维度客户分析，新增/流失趋势，渠道分布统计</div>
          </div>
        </div>
        <div class="feature-item">
          <van-icon name="chat-o" color="#f59e0b" size="18" />
          <div>
            <div class="ft-title">话术管理</div>
            <div class="ft-desc">快速查找和复制话术，提升沟通效率</div>
          </div>
        </div>
        <div class="feature-item">
          <van-icon name="bell" color="#ef4444" size="18" />
          <div>
            <div class="ft-title">消息通知</div>
            <div class="ft-desc">客户动态实时提醒，流失预警及CRM关联提示</div>
          </div>
        </div>
      </div>
    </div>

    <div class="about-footer">
      <p>© {{ new Date().getFullYear() }} 云客 · 智能销售管理系统</p>
      <p>专注于企业微信生态的客户关系管理</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.about-hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 20px 24px;
}
.about-logo { margin-bottom: 12px; }
.about-name {
  font-size: 22px; font-weight: 700; color: #1f2937;
  letter-spacing: 1px;
}
.about-ver {
  font-size: 13px; color: #6b7280; margin-top: 4px;
}
.about-version {
  margin-top: 8px;
  font-size: 12px; color: #6366f1;
  background: #eef2ff; padding: 2px 12px;
  border-radius: 20px; font-weight: 500;
}

.section-title {
  font-size: 13px; font-weight: 600; color: #6b7280;
  padding: 0 0 12px; letter-spacing: 1px;
}

.feature-list {
  display: flex; flex-direction: column; gap: 16px;
}
.feature-item {
  display: flex; gap: 12px; align-items: flex-start;
}
.ft-title {
  font-size: 14px; font-weight: 600; color: #374151;
}
.ft-desc {
  font-size: 12px; color: #9ca3af; margin-top: 2px;
}

.about-footer {
  text-align: center; padding: 24px 16px 0;
}
.about-footer p {
  font-size: 11px; color: #d1d5db; margin: 2px 0;
}
</style>

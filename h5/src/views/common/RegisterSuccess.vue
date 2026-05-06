<template>
  <div class="success-page">
    <div class="bg-decor">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
    </div>

    <div class="content-wrap">
      <!-- 成功图标 -->
      <div class="success-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="url(#sgr)" />
          <path d="M20 33l8 8 16-16" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          <defs><linearGradient id="sgr" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#10b981"/><stop offset="1" stop-color="#059669"/></linearGradient></defs>
        </svg>
      </div>

      <h1 class="success-title">注册成功</h1>
      <p class="success-desc">免费试用已开通，请妥善保管以下账号信息</p>

      <!-- 账号信息卡片 -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">租户编码</span>
          <span class="info-value highlight">{{ tenantCode }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">管理员账号</span>
          <span class="info-value">{{ adminUsername }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">管理员密码</span>
          <span class="info-value">{{ adminPassword }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">试用到期</span>
          <span class="info-value">{{ expireDate }}</span>
        </div>
      </div>

      <div class="tip-card">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>登录CRM系统时，请使用<strong>租户编码</strong>、<strong>管理员账号</strong>和<strong>密码</strong>进行登录</span>
      </div>

      <!-- 操作按钮 -->
      <div class="action-btns">
        <van-button round block type="primary" class="btn-primary" @click="goHome">
          进入工作台
        </van-button>
        <van-button round block plain class="btn-outline" @click="openCrm">
          打开CRM系统
        </van-button>
        <van-button round block plain class="btn-outline" @click="openMember">
          打开会员中心
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tenantCode = (route.query.tenantCode as string) || ''
const adminUsername = (route.query.adminUsername as string) || ''
const adminPassword = (route.query.adminPassword as string) || ''
const expireDate = (route.query.expireDate as string) || ''
const crmUrl = (route.query.crmUrl as string) || ''
const memberUrl = (route.query.memberUrl as string) || ''

function goHome() {
  router.replace('/app/home')
}

function openCrm() {
  if (crmUrl) window.open(crmUrl, '_blank')
}

function openMember() {
  if (memberUrl) window.open(memberUrl, '_blank')
}
</script>

<style scoped>
.success-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdf4 0%, #f8fafc 40%, #eef2ff 100%);
  position: relative;
  overflow: hidden;
}

.bg-decor { position: absolute; inset: 0; pointer-events: none; }
.circle { position: absolute; border-radius: 50%; }
.c1 {
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
  top: -40px; right: -30px;
}
.c2 {
  width: 160px; height: 160px;
  background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
  bottom: 20%; left: -30px;
}

.content-wrap {
  position: relative;
  z-index: 1;
  padding: 48px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon {
  margin-bottom: 20px;
  animation: bounce-in 0.6s ease;
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.success-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.success-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px;
}

.info-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: 13px;
  color: #6b7280;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}
.info-value.highlight {
  color: #6366f1;
  font-weight: 600;
  font-size: 15px;
}

.tip-card {
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.6;
}
.tip-card svg { flex-shrink: 0; margin-top: 1px; }

.action-btns {
  width: 100%;
  max-width: 360px;
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-primary {
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(99,102,241,0.3);
}

.btn-outline {
  height: 42px;
  font-size: 14px;
  font-weight: 500;
  color: #6366f1 !important;
  border-color: #c7d2fe !important;
}
</style>

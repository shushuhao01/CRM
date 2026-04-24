<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="个人信息" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" size="24px" style="text-align:center;padding:40px;" />

    <template v-else-if="profile">
      <!-- 头像 -->
      <div class="card avatar-card">
        <div class="avatar-row">
          <span class="avatar-label">头像</span>
          <img v-if="profile.avatar && profile.avatar.trim()" class="avatar-img" :src="profile.avatar" />
          <div v-else class="avatar-fb" :style="{ background: getAvatarBg(profile.name) }">{{ getLastChar(profile.name) }}</div>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="card">
        <div class="section-title">基本信息</div>
        <van-cell-group :border="false">
          <van-cell title="姓名" :value="profile.name || '-'" />
          <van-cell title="用户名" :value="profile.username || '-'" />
          <van-cell title="手机号" :value="profile.phone || '未绑定'" />
          <van-cell title="邮箱" :value="profile.email || '未绑定'" />
        </van-cell-group>
      </div>

      <!-- 工作信息 -->
      <div class="card">
        <div class="section-title">工作信息</div>
        <van-cell-group :border="false">
          <van-cell title="角色" :value="roleText" />
          <van-cell title="部门" :value="profile.department || '-'" />
          <van-cell title="企微UserID" :value="profile.wecomUserId || '-'" />
          <van-cell title="管理客户数" :value="String(profile.customerCount ?? 0)" />
        </van-cell-group>
      </div>

      <!-- 账号信息 -->
      <div class="card">
        <div class="section-title">账号信息</div>
        <van-cell-group :border="false">
          <van-cell title="注册时间" :value="profile.createdAt || '-'" />
          <van-cell title="最近登录" :value="profile.lastLoginAt || '-'" />
        </van-cell-group>
      </div>
    </template>

    <van-empty v-else description="无法获取个人信息" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getProfile } from '@/api/app'

const loading = ref(true)
const profile = ref<any>(null)

const roleText = computed(() => {
  const map: Record<string, string> = {
    admin: '管理员', super_admin: '超级管理员', superadmin: '超级管理员',
    manager: '主管', department_manager: '部门经理',
    sales: '销售', sales_staff: '销售', customer_service: '客服'
  }
  return map[profile.value?.role || ''] || '员工'
})

const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

function getLastChar(name: string): string {
  const n = name || profile.value?.username || ''
  return n ? n.charAt(n.length - 1) : ''
}

function getAvatarBg(name: string): string {
  return avatarColors[((name || '').charCodeAt(0) || 0) % avatarColors.length]
}

onMounted(async () => {
  try {
    const { data } = await getProfile()
    if (data?.success) profile.value = data.data
  } catch (e) {
    console.error('[ProfileInfo] load error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.avatar-card { padding: 16px; }
.avatar-row {
  display: flex; align-items: center; justify-content: space-between;
}
.avatar-label { font-size: 14px; color: #374151; }
.avatar-img {
  width: 48px; height: 48px; border-radius: 12px;
  object-fit: cover; display: block;
}
.avatar-fb {
  width: 48px; height: 48px; border-radius: 12px;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700;
}
.section-title {
  font-size: 13px; font-weight: 600; color: #6b7280;
  padding: 0 16px 8px; letter-spacing: 1px;
}
</style>

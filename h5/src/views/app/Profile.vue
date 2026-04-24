<template>
  <div class="page-container">
    <!-- 用户信息卡片 -->
    <div class="profile-hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="avatar-wrap" @click="onAvatarClick">
          <img v-if="avatarSrc" class="avatar-img-lg" :src="avatarSrc" />
          <div v-else class="avatar-fallback-lg" :style="{ background: avatarBg }">{{ avatarChar }}</div>
        </div>
        <div class="hero-info">
          <div class="hero-name">{{ profileData.name || authStore.user?.name || authStore.user?.username || '未登录' }}</div>
          <div class="hero-role">
            <van-tag round color="#6366f1" text-color="#fff" size="small">{{ roleText }}</van-tag>
          </div>
        </div>
      </div>
      <!-- 统计条 -->
      <div class="hero-stats">
        <div class="hs-item" @click="$router.push('/app/customers')">
          <div class="hs-val">{{ profileData.customerCount ?? '-' }}</div>
          <div class="hs-lbl">我的客户</div>
        </div>
        <div class="hs-divider"></div>
        <div class="hs-item">
          <div class="hs-val">{{ profileData.department || '-' }}</div>
          <div class="hs-lbl">所属部门</div>
        </div>
        <div class="hs-divider"></div>
        <div class="hs-item">
          <div class="hs-val">{{ profileData.createdAt || '-' }}</div>
          <div class="hs-lbl">注册时间</div>
        </div>
      </div>
    </div>

    <!-- 功能列表 -->
    <div class="card func-card">
      <van-cell-group :border="false">
        <van-cell title="个人信息" is-link icon="contact-o" to="/app/profile/info" />
        <van-cell title="消息通知" is-link icon="bell" to="/app/notifications">
          <template v-if="unreadCount > 0" #right-icon>
            <van-badge :content="unreadCount" style="margin-right: 4px;" />
            <van-icon name="arrow" />
          </template>
        </van-cell>
        <van-cell title="快捷话术" is-link icon="chat-o" to="/app/scripts" />
        <van-cell title="绑定CRM系统用户" is-link icon="user-o" to="/app/bind-user" />
        <van-cell title="客户关联CRM" is-link icon="link-o" to="/app/bind-wecom" />
      </van-cell-group>
    </div>

    <div class="card func-card">
      <van-cell-group :border="false">
        <van-cell title="关于" is-link icon="info-o" to="/app/about" />
      </van-cell-group>
    </div>

    <!-- 退出 -->
    <div style="padding: 16px 0;">
      <van-button type="default" block round plain @click="handleLogout" style="color:#ef4444;border-color:#fecaca;">退出登录</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getProfile, getNotifications } from '@/api/app'
import { showToast } from 'vant'

const authStore = useAuthStore()
const router = useRouter()
const profileData = ref<any>({})
const unreadCount = ref(0)

const roleText = computed(() => {
  const map: Record<string, string> = {
    admin: '管理员', super_admin: '超级管理员', superadmin: '超级管理员',
    manager: '主管', department_manager: '部门经理',
    sales: '销售', sales_staff: '销售', customer_service: '客服'
  }
  return map[authStore.user?.role || ''] || '员工'
})

const displayName = computed(() =>
  profileData.value?.name || authStore.user?.name || authStore.user?.username || ''
)

const avatarChar = computed(() => {
  const name = displayName.value
  return name ? name.charAt(name.length - 1) : ''
})

const avatarSrc = computed(() => {
  const url = authStore.user?.avatar
  return url && url.trim() ? url : undefined
})

const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const avatarBg = computed(() => {
  const name = displayName.value
  return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length]
})

function onAvatarClick() {
  showToast('企微环境下可授权获取头像')
}

function handleLogout() {
  authStore.logout()
  router.replace('/bind')
}

onMounted(async () => {
  try {
    const [profileRes, notiRes] = await Promise.all([
      getProfile(),
      getNotifications()
    ])
    if (profileRes.data?.success) profileData.value = profileRes.data.data || {}
    if (notiRes.data?.success) {
      const list = notiRes.data.data || []
      unreadCount.value = list.filter((n: any) => !n.read).length
    }
  } catch (e) {
    console.error('[Profile] load error:', e)
  }
})
</script>

<style scoped>
.profile-hero {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  margin: 12px 0;
  overflow: hidden;
  position: relative;
}
.hero-bg {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15), transparent 50%);
}
.hero-content {
  display: flex; align-items: center; gap: 16px;
  padding: 24px 20px 16px;
  position: relative; z-index: 1;
}
.avatar-wrap { position: relative; }
.avatar-img-lg {
  width: 64px; height: 64px; border-radius: 16px;
  object-fit: cover; display: block;
  border: 2px solid rgba(255,255,255,0.4);
}
.avatar-fallback-lg {
  width: 64px; height: 64px; border-radius: 16px;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 700;
  border: 2px solid rgba(255,255,255,0.3);
}
.hero-info { flex: 1; }
.hero-name { font-size: 20px; font-weight: 700; color: #fff; }
.hero-role { margin-top: 6px; }
.hero-stats {
  display: flex; align-items: center; justify-content: space-around;
  padding: 14px 20px;
  background: rgba(255,255,255,0.12);
  position: relative; z-index: 1;
}
.hs-item { text-align: center; flex: 1; cursor: pointer; }
.hs-val { font-size: 15px; font-weight: 700; color: #fff; }
.hs-lbl { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.hs-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.2); }

.func-card :deep(.van-cell) {
  padding: 14px 16px;
}
.func-card :deep(.van-cell__left-icon) {
  color: #6366f1; font-size: 18px; margin-right: 10px;
}
</style>

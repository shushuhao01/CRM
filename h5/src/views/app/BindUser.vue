<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="绑定CRM系统用户" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" size="24px" style="text-align:center;padding:40px;" />

    <template v-else>
      <!-- 当前账号信息 -->
      <div class="card" style="margin-top: 8px;">
        <div class="info-section">
          <div class="info-row">
            <div class="info-avatar" :style="{ background: avatarBg }">{{ avatarChar }}</div>
            <div class="info-detail">
              <div class="info-name">{{ userName }}</div>
              <div class="info-sub">CRM账号: {{ authStore.user?.username || '-' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 绑定关系展示 -->
      <div class="card">
        <div class="section-title">企微绑定状态</div>

        <div class="bind-pair">
          <!-- CRM用户 -->
          <div class="pair-item">
            <div class="pair-icon" style="background: #eff6ff;"><van-icon name="manager-o" color="#3b82f6" size="22" /></div>
            <div class="pair-label">CRM用户</div>
            <div class="pair-val">{{ userName }}</div>
          </div>

          <!-- 连接线 -->
          <div class="pair-link">
            <div v-if="bindInfo" class="link-line link-line--ok">
              <van-icon name="link-o" color="#10b981" size="18" />
            </div>
            <div v-else class="link-line link-line--no">
              <van-icon name="cross" color="#d1d5db" size="16" />
            </div>
          </div>

          <!-- 企微成员 -->
          <div class="pair-item">
            <div class="pair-icon" style="background: #f0fdf4;"><van-icon name="chat-o" color="#10b981" size="22" /></div>
            <div class="pair-label">企微成员</div>
            <div class="pair-val">{{ bindInfo?.wecomUserName || wecomUserId || '未识别' }}</div>
          </div>
        </div>

        <!-- 状态提示 -->
        <div v-if="bindInfo" class="status-tip status-tip--ok">
          <van-icon name="passed" size="14" />
          <span>已绑定 · {{ bindInfo.createdAt || '' }}</span>
        </div>
        <div v-else class="status-tip status-tip--warn">
          <van-icon name="info-o" size="14" />
          <span>当前CRM账号未与企微成员绑定，点击下方按钮一键绑定</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div style="padding: 16px 0;">
        <van-button v-if="!bindInfo" type="primary" block round :loading="binding" @click="doBind"
          style="background: linear-gradient(135deg, #60a5fa, #818cf8); border: none;">
          一键绑定当前账号
        </van-button>
        <van-button v-else type="default" block round plain :loading="unbinding" @click="doUnbind"
          style="color:#f87171;border-color:#fecaca;">
          解除绑定
        </van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'

const authStore = useAuthStore()
const loading = ref(true)
const binding = ref(false)
const unbinding = ref(false)
const bindInfo = ref<any>(null)

const wecomUserId = authStore.wecomUserId || ''
const userName = computed(() => authStore.user?.name || authStore.user?.username || '未知用户')
const avatarChar = computed(() => {
  const n = userName.value
  return n ? n.charAt(n.length - 1) : ''
})
const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const avatarBg = computed(() => avatarColors[(userName.value.charCodeAt(0) || 0) % avatarColors.length])

async function loadBindStatus() {
  loading.value = true
  try {
    const { data } = await api.get('/app/user-binding')
    if (data?.success && data.data) {
      bindInfo.value = data.data
    } else {
      bindInfo.value = null
    }
  } catch (e) {
    console.error('[BindUser] load error:', e)
  } finally {
    loading.value = false
  }
}

async function doBind() {
  binding.value = true
  try {
    const { data } = await api.post('/app/user-binding', {
      crmUserId: authStore.user?.id
    })
    if (data?.success) {
      showSuccessToast('绑定成功')
      await loadBindStatus()
    } else {
      showToast(data?.message || '绑定失败')
    }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '绑定失败')
  } finally {
    binding.value = false
  }
}

async function doUnbind() {
  try {
    await showConfirmDialog({
      title: '确认解绑',
      message: '解除绑定后将影响企微与CRM的数据同步，确认解绑？'
    })
  } catch { return }

  unbinding.value = true
  try {
    const { data } = await api.delete('/app/user-binding')
    if (data?.success) {
      showSuccessToast('已解除绑定')
      bindInfo.value = null
    } else {
      showToast(data?.message || '解绑失败')
    }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '解绑失败')
  } finally {
    unbinding.value = false
  }
}

onMounted(() => {
  loadBindStatus()
})
</script>

<style scoped>
.section-title {
  font-size: 13px; font-weight: 600; color: #374151;
  margin-bottom: 12px;
}
.info-section {}
.info-row {
  display: flex; align-items: center; gap: 12px;
}
.info-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.info-detail { flex: 1; }
.info-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.info-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.bind-pair {
  display: flex; align-items: center; gap: 0;
  padding: 12px 0;
}
.pair-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px;
}
.pair-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.pair-label { font-size: 11px; color: #9ca3af; }
.pair-val {
  font-size: 13px; font-weight: 600; color: #374151;
  max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pair-link {
  flex-shrink: 0; width: 48px; display: flex; align-items: center; justify-content: center;
  margin-top: -20px;
}
.link-line {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.link-line--ok { background: #ecfdf5; }
.link-line--no { background: #f9fafb; }

.status-tip {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; border-radius: 8px;
  font-size: 12px; margin-top: 4px;
}
.status-tip--ok { background: #ecfdf5; color: #059669; }
.status-tip--warn { background: #fffbeb; color: #d97706; }
</style>

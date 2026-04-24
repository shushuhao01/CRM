<template>
  <div v-if="isDemoMode && !isStandalone" class="wecom-demo-banner">
    <div class="demo-banner-body">
      <div class="demo-banner-left">
        <el-icon :size="18" color="#e6a23c"><WarningFilled /></el-icon>
        <span class="demo-banner-text">
          当前为<strong>示例预览</strong>模式，数据均为演示数据。授权企业微信后将显示真实数据。
        </span>
      </div>
      <div class="demo-banner-actions">
        <el-button type="success" size="small" @click="goConfig('auth')">
          <el-icon><Connection /></el-icon>扫码授权
        </el-button>
        <el-button type="primary" size="small" plain @click="goConfig('add')">
          <el-icon><Plus /></el-icon>手动添加
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { Connection, Plus, WarningFilled } from '@element-plus/icons-vue'

defineProps<{ isDemoMode: boolean }>()

// 独立窗口模式下不显示 demo banner
const isStandalone = inject('isWecomStandalone', false)
const emit = defineEmits(['auth', 'add'])
const router = useRouter()

const goConfig = (action: 'auth' | 'add') => {
  emit(action)
  // 检测是否在独立窗口模式
  if (window.location.pathname.includes('wecom-standalone')) {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'config')
    window.history.replaceState({}, '', url.toString())
    window.location.reload()
    return
  }
  router.push('/wecom/config')
}
</script>

<style scoped>
.wecom-demo-banner {
  margin-bottom: 16px;
}
.demo-banner-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
  border: 1px solid #FDE68A;
  border-radius: 12px;
}
.demo-banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.demo-banner-text {
  font-size: 13px;
  color: #4B5563;
  strong { color: #D97706; }
}
.demo-banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .demo-banner-body { flex-direction: column; }
}
</style>


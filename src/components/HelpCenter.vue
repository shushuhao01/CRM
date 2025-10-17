<template>
  <div v-if="canAccessHelpCenter" class="help-center-container">
    <el-tooltip content="帮助中心" placement="bottom">
      <div class="help-center-button" @click="goToHelpCenter">
        <IconHelpCenter />
      </div>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import IconHelpCenter from '@/components/icons/IconHelpCenter.vue'

const router = useRouter()
const userStore = useUserStore()

// 权限控制：只有超级管理员和管理员可以访问帮助中心
const canAccessHelpCenter = computed(() => {
  return userStore.isAdmin || userStore.isSuperAdmin
})

const goToHelpCenter = () => {
  router.push('/help-center')
}
</script>

<style scoped>
.help-center-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.help-center-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: transparent;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 18px;
  opacity: 0.3;
}

.help-center-button:hover {
  background-color: #f5f7fa;
  color: #409eff;
  transform: scale(1.1);
  opacity: 1;
}

.help-center-button:active {
  transform: scale(0.95);
}
</style>
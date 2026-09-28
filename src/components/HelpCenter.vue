<template>
  <div v-if="canAccessHelpCenter" class="help-center-entry">
    <el-tooltip content="帮助中心" placement="bottom">
      <div class="help-center-button" @click="goToHelpCenter">
        <el-icon :size="18"><QuestionFilled /></el-icon>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { QuestionFilled } from '@element-plus/icons-vue'

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
/* 类名用 help-center-entry，避免与帮助中心页面的 .help-center-container 撞名
   （dark-mode.scss 对页面容器设置了深色背景，曾误命中顶栏按钮导致黑色背景） */
.help-center-entry {
  display: flex;
  align-items: center;
}

.help-center-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: transparent;
  color: #b0b3b8;
  opacity: 0.7;
  cursor: pointer;
  transition: all 0.25s;
}

.help-center-button:hover {
  background-color: rgba(0,0,0,0.04);
  color: #409eff;
  opacity: 1;
}
</style>

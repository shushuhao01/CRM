<template>
  <div v-if="canAccessHelpCenter" class="help-center-container">
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
.help-center-container {
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

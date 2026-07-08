<template>
  <!-- 响铃中来电最小化悬浮球：点击恢复弹窗，接听/挂断后由父组件隐藏 -->
  <Teleport to="body">
    <Transition name="ring-ball">
      <div v-if="visible" class="incoming-ring-ball" @click="$emit('restore')" title="点击恢复来电弹窗">
        <div class="ball-core">
          <span class="pulse-ring ring-1"></span>
          <span class="pulse-ring ring-2"></span>
          <span class="pulse-ring ring-3"></span>
          <el-icon class="ball-icon" :size="26"><PhoneFilled /></el-icon>
        </div>
        <div class="ball-label">
          <span class="label-title">来电响铃中</span>
          <span class="label-name">{{ callerName || '未知来电' }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { PhoneFilled } from '@element-plus/icons-vue'

defineProps<{
  visible: boolean
  callerName?: string
}>()

defineEmits<{
  restore: []
}>()
</script>

<style scoped>
.incoming-ring-ball {
  position: fixed;
  right: 28px;
  bottom: 110px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 8px;
  background: linear-gradient(135deg, #67c23a 0%, #36cfc9 100%);
  border-radius: 40px;
  box-shadow: 0 8px 24px rgba(103, 194, 58, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  user-select: none;
  animation: ball-shake 1.2s ease-in-out infinite;
}
.incoming-ring-ball:hover {
  box-shadow: 0 10px 32px rgba(103, 194, 58, 0.55), 0 4px 12px rgba(0, 0, 0, 0.2);
}

.ball-core {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ball-icon {
  color: #fff;
  animation: icon-wiggle 0.6s ease-in-out infinite;
}

/* 扩散波纹 */
.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  animation: pulse-expand 2s ease-out infinite;
  pointer-events: none;
}
.ring-2 { animation-delay: 0.5s; }
.ring-3 { animation-delay: 1s; }

.ball-label {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  color: #fff;
}
.label-title {
  font-size: 11px;
  opacity: 0.9;
}
.label-name {
  font-size: 14px;
  font-weight: 600;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pulse-expand {
  0% { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(2.1); opacity: 0; }
}
@keyframes ball-shake {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-3px); }
  40% { transform: translateY(0); }
  60% { transform: translateY(-2px); }
  80% { transform: translateY(0); }
}
@keyframes icon-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-12deg); }
  75% { transform: rotate(12deg); }
}

/* 出入场动画 */
.ring-ball-enter-active,
.ring-ball-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ring-ball-enter-from,
.ring-ball-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(20px);
}
</style>

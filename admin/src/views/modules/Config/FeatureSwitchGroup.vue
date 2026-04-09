<template>
  <div class="feature-group">
    <div class="group-label">{{ title }}</div>
    <div class="group-items">
      <div v-for="item in items" :key="item.key" class="switch-row">
        <div class="switch-info">
          <el-icon class="switch-icon"><component :is="item.icon" /></el-icon>
          <div class="switch-text">
            <span class="switch-name">{{ item.name }}</span>
            <span class="switch-desc">{{ item.desc }}</span>
          </div>
        </div>
        <el-switch :model-value="flags[item.key]" @update:model-value="$emit('update', type, item.key, $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  flags: Record<string, boolean>
  items: { key: string; name: string; desc: string; icon: any }[]
  type: string
}>()

defineEmits<{
  'update': [type: string, key: string, value: boolean]
}>()
</script>

<style scoped lang="scss">
.feature-group {
  margin-bottom: 20px;
  &:last-child { margin-bottom: 0; }
}
.group-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.group-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
  &:hover { background-color: #f5f7fa; }
}
.switch-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.switch-icon {
  font-size: 18px;
  color: #909399;
  flex-shrink: 0;
}
.switch-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.switch-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.switch-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
</style>

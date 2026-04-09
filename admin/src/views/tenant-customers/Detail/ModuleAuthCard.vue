<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>功能模块授权
          <el-tag size="small" type="info" style="margin-left: 8px;">
            已启用 {{ enabledModulesCount }}/{{ crmModuleOptions.length }}
          </el-tag>
        </span>
        <div class="button-group">
          <template v-if="isEditingModules">
            <el-button size="small" @click="$emit('cancel-edit')">取消</el-button>
            <el-button size="small" type="primary" :loading="submitting" @click="$emit('save')">保存</el-button>
          </template>
          <el-button v-else size="small" type="primary" text @click="$emit('start-edit')">
            <el-icon><Edit /></el-icon>配置模块
          </el-button>
        </div>
      </div>
    </template>

    <!-- 查看模式 -->
    <div v-if="!isEditingModules" class="modules-grid">
      <div
        v-for="mod in crmModuleOptions" :key="mod.id"
        class="module-card"
        :class="{ enabled: isModuleEnabled(mod.id), disabled: !isModuleEnabled(mod.id) }"
      >
        <div class="module-card-icon" :class="{ enabled: isModuleEnabled(mod.id) }">
          <el-icon :size="22"><component :is="mod.icon" /></el-icon>
        </div>
        <div class="module-card-name">{{ mod.title }}</div>
        <div class="module-card-status">
          <el-icon v-if="isModuleEnabled(mod.id)" class="status-icon on"><CircleCheck /></el-icon>
          <el-icon v-else class="status-icon off"><CircleClose /></el-icon>
        </div>
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="modules-edit">
      <div class="edit-toolbar">
        <el-button size="small" link type="primary" @click="$emit('select-all')">全选</el-button>
        <el-button size="small" link @click="$emit('deselect-all')">全不选</el-button>
      </div>
      <el-checkbox-group :model-value="editModules" @update:model-value="$emit('update:editModules', $event)">
        <div class="modules-grid edit-mode">
          <label
            v-for="mod in crmModuleOptions" :key="mod.id"
            class="module-card-check"
            :class="{ checked: editModules.includes(mod.id), locked: mod.id === 'dashboard' }"
          >
            <el-checkbox :value="mod.id" :disabled="mod.id === 'dashboard'" class="hidden-checkbox" />
            <div class="module-card-icon" :class="{ enabled: editModules.includes(mod.id) }">
              <el-icon :size="22"><component :is="mod.icon" /></el-icon>
            </div>
            <div class="module-card-name">{{ mod.title }}</div>
            <div class="module-card-check-mark">
              <el-icon v-if="editModules.includes(mod.id)" color="#409eff"><CircleCheck /></el-icon>
              <el-icon v-else color="#dcdfe6"><CircleClose /></el-icon>
            </div>
          </label>
        </div>
      </el-checkbox-group>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Edit, CircleCheck, CircleClose } from '@element-plus/icons-vue'

defineProps<{
  detail: any
  crmModuleOptions: { id: string; title: string; icon: any }[]
  isEditingModules: boolean
  editModules: string[]
  submitting: boolean
  enabledModulesCount: number
  isModuleEnabled: (id: string) => boolean
}>()

defineEmits<{
  'start-edit': []
  'cancel-edit': []
  'save': []
  'select-all': []
  'deselect-all': []
  'update:editModules': [value: string[]]
}>()
</script>

<style scoped lang="scss">
.info-card {
  border-radius: 8px;
  border: none;
  :deep(.el-card__header) { padding: 12px 20px; }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  .el-icon { margin-right: 4px; vertical-align: -2px; }
}

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ====== 功能模块 - 网格卡片 ====== */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px 12px;
  border-radius: 10px;
  cursor: default;
  position: relative;
  transition: all 0.25s;

  &.enabled {
    background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    border: 1px solid #d9ecff;
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.disabled {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    .module-card-name { color: #c0c4cc; }
    .module-card-icon { opacity: 0.4; }
  }
}

.module-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  &.enabled {
    background: #409eff;
    color: #fff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
  }
  &:not(.enabled) {
    background: #e8e8e8;
    color: #999;
  }
}

.module-card-name {
  font-size: 13px;
  text-align: center;
  line-height: 1.3;
}

.module-card-status {
  .status-icon {
    font-size: 14px;
    &.on { color: #67c23a; }
    &.off { color: #dcdfe6; }
  }
}

/* ====== 编辑模式 ====== */
.modules-edit {
  .edit-toolbar {
    margin-bottom: 12px;
    display: flex;
    gap: 12px;
  }
  .modules-grid.edit-mode { gap: 10px; }
}

.module-card-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  border: 2px solid #e4e7ed;
  background: #fafafa;

  &:hover { border-color: #c6e2ff; background: #f5f9ff; }
  &.checked {
    border-color: #409eff;
    background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.locked { cursor: not-allowed; opacity: 0.75; }
  .hidden-checkbox { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
}

.module-card-check-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 16px;
}

/* ====== 响应式 ====== */
@media screen and (max-width: 768px) {
  .modules-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
  .module-card { padding: 12px 6px 8px; }
  .module-card-icon { width: 36px; height: 36px; }
}
</style>

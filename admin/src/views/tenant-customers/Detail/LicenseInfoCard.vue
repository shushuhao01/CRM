<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>授权信息</span>
        <div class="button-group">
          <el-button size="small" @click="$emit('adjust-users')">调整用户数</el-button>
          <el-button size="small" @click="$emit('adjust-storage')">调整存储空间</el-button>
          <el-button size="small" @click="$emit('adjust-package')">调整套餐</el-button>
          <el-button size="small" @click="$emit('regenerate')">重新生成授权码</el-button>
          <el-button size="small" type="warning" @click="$emit('renew')">续期</el-button>
          <el-button v-if="detail.licenseStatus !== 'suspended'" size="small" type="danger" @click="$emit('suspend')">暂停授权</el-button>
          <el-button v-else size="small" type="success" @click="$emit('resume')">恢复授权</el-button>
        </div>
      </div>
    </template>
    <el-descriptions :column="3" border>
      <el-descriptions-item label="授权码">
        <div class="license-key-cell">
          <code>{{ showFullKey ? detail.licenseKey : maskKey(detail.licenseKey) }}</code>
          <el-tooltip :content="showFullKey ? '隐藏授权码' : '显示授权码'" placement="top">
            <el-icon class="action-icon" @click="$emit('toggle-key-visibility')">
              <View v-if="!showFullKey" />
              <Hide v-else />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="复制授权码" placement="top">
            <el-icon class="action-icon" @click="copyKey(detail.licenseKey)">
              <CopyDocument />
            </el-icon>
          </el-tooltip>
        </div>
      </el-descriptions-item>
      <el-descriptions-item label="授权状态">
        <el-tag :type="getLicenseStatusType(detail.licenseStatus)" size="small">
          {{ getLicenseStatusText(detail.licenseStatus) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="套餐">
        <el-tag :type="getPackageType(detail.packageName)" size="small">{{ detail.packageName || '未设置' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="用户数">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>{{ detail.userCount || 0 }} / {{ detail.maxUsers || 0 }}</span>
          <el-progress
            :percentage="detail.maxUsers ? Math.round((detail.userCount || 0) / detail.maxUsers * 100) : 0"
            :color="getProgressColor((detail.userCount || 0) / (detail.maxUsers || 1))"
            style="flex: 1; max-width: 120px;" :show-text="false"
          />
          <el-tag v-if="detail.maxUsers && (detail.userCount || 0) >= detail.maxUsers" type="danger" size="small">已达上限</el-tag>
        </div>
      </el-descriptions-item>
      <el-descriptions-item label="存储空间">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>{{ formatStorage(detail.usedStorageMb) }} / {{ detail.maxStorageGb || 0 }}GB</span>
          <el-progress
            :percentage="detail.maxStorageGb ? Math.round((detail.usedStorageMb || 0) / 1024 / detail.maxStorageGb * 100) : 0"
            :color="getProgressColor((detail.usedStorageMb || 0) / 1024 / (detail.maxStorageGb || 1))"
            style="flex: 1; max-width: 120px;" :show-text="false"
          />
        </div>
      </el-descriptions-item>
      <el-descriptions-item label="到期时间">
        <span :class="{ 'text-danger': isExpired(detail.expireDate) }">
          {{ formatExpireDate(detail.expireDate) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="账号状态">
        <el-tag :type="getStatusType(detail.status)" size="small">{{ getStatusText(detail.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="付费方式">
        <template v-if="detail.subscription_status === 'active'">
          <el-tag type="success" size="small" effect="dark">订阅中</el-tag>
          <span style="margin-left: 6px; font-size: 12px; color: #909399;">
            {{ detail.subscription_channel === 'wechat' ? '微信代扣' : detail.subscription_channel === 'alipay' ? '支付宝扣款' : '' }}
          </span>
        </template>
        <template v-else-if="detail.subscription_status === 'signing'">
          <el-tag type="warning" size="small">签约中</el-tag>
        </template>
        <template v-else-if="detail.subscription_status === 'paused'">
          <el-tag type="danger" size="small">订阅暂停</el-tag>
        </template>
        <template v-else-if="detail.subscription_status === 'cancelled'">
          <el-tag type="info" size="small">已取消订阅</el-tag>
        </template>
        <template v-else-if="detail.subscription_status === 'expired'">
          <el-tag type="danger" size="small" effect="dark">订阅已过期</el-tag>
        </template>
        <template v-else>
          <el-tag size="small">一次性自付</el-tag>
        </template>
      </el-descriptions-item>
      <el-descriptions-item label="管理员账号">
        <div v-if="detail.adminUsers && detail.adminUsers.length > 0">
          <template v-if="detail.adminUsers.length === 1">
            <span>{{ detail.adminUsers[0].username }}</span>
            <el-tag v-if="detail.adminUsers[0].status === 'locked'" type="danger" size="small" style="margin-left: 8px;">
              已锁定 (失败{{ detail.adminUsers[0].login_fail_count }}次)
            </el-tag>
            <el-tag v-else type="success" size="small" style="margin-left: 8px;">正常</el-tag>
          </template>
          <template v-else>
            <el-tooltip placement="top" effect="light" :show-after="200">
              <template #content>
                <div class="admin-tooltip-list">
                  <div v-for="admin in detail.adminUsers" :key="admin.id" class="admin-tooltip-item">
                    <span>{{ admin.username }}</span>
                    <el-tag v-if="admin.status === 'locked'" type="danger" size="small" style="margin-left: 6px;">
                      已锁定
                    </el-tag>
                    <el-tag v-else type="success" size="small" style="margin-left: 6px;">正常</el-tag>
                  </div>
                </div>
              </template>
              <span class="admin-count-trigger">
                {{ detail.adminUsers[0].username }}
                <el-tag size="small" type="info" style="margin-left: 6px;">共{{ detail.adminUsers.length }}个管理员</el-tag>
              </span>
            </el-tooltip>
          </template>
        </div>
        <span v-else class="text-secondary">未创建</span>
      </el-descriptions-item>
      <el-descriptions-item label="激活时间">
        {{ detail.activatedAt ? formatDateTime(detail.activatedAt) : '未激活' }}
      </el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updatedAt) }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import { View, Hide, CopyDocument } from '@element-plus/icons-vue'
import {
  maskKey, copyKey, formatStorage, formatDateTime, formatExpireDate, isExpired,
  getProgressColor, getPackageType, getStatusType, getStatusText,
  getLicenseStatusType, getLicenseStatusText
} from './helpers'

defineProps<{
  detail: any
  showFullKey: boolean
}>()

defineEmits<{
  'adjust-users': []
  'adjust-storage': []
  'adjust-package': []
  'regenerate': []
  'renew': []
  'suspend': []
  'resume': []
  'toggle-key-visibility': []
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
}
.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.license-key-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    background: #f5f7fa;
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
}
.action-icon {
  cursor: pointer;
  color: #409eff;
  &:hover { color: #66b1ff; }
}
.text-danger { color: #f56c6c; }
.text-secondary { color: #909399; }
.admin-count-trigger {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  &:hover { color: #409eff; }
}
.admin-tooltip-list {
  .admin-tooltip-item {
    display: flex;
    align-items: center;
    padding: 4px 0;
    font-size: 13px;
    &:not(:last-child) { border-bottom: 1px dashed #ebeef5; }
  }
}
</style>

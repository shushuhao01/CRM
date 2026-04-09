<template>
  <el-card shadow="never" class="info-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>基本信息</span>
        <div class="button-group">
          <el-tooltip :content="detail.status === 'active' ? '点击禁用' : '点击启用'" placement="top">
            <el-switch
              :model-value="detail.status === 'active'"
              @change="$emit('toggle-status')"
              :loading="statusLoading"
              style="margin-right: 12px;"
            />
          </el-tooltip>
          <el-button type="primary" size="small" @click="$emit('edit')">编辑</el-button>
        </div>
      </div>
    </template>
    <el-descriptions :column="3" border>
      <el-descriptions-item label="客户名称">{{ detail.name }}</el-descriptions-item>
      <el-descriptions-item label="租户编码">
        <el-tag size="small" type="info">{{ detail.code || '-' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
      <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
      <el-descriptions-item label="创建人">
        <span v-if="detail.createdByName">{{ detail.createdByName }}</span>
        <span v-else class="text-secondary">未知</span>
      </el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
    </el-descriptions>

    <!-- 更多信息（折叠） -->
    <el-collapse v-model="moreCollapse" class="more-collapse">
      <el-collapse-item name="more">
        <template #title>
          <span class="collapse-title">更多信息</span>
        </template>
        <el-descriptions :column="3" border size="default">
          <template v-if="isSuperAdmin">
            <el-descriptions-item label="会员中心密码">
            <template v-if="detail.memberPasswordStatus === 'default'">
              <div class="password-cell">
                <code>{{ showMemberPwd ? detail.memberPasswordDisplay : '••••••••' }}</code>
                <el-tooltip content="查看/隐藏" placement="top">
                  <el-icon class="action-icon" @click="showMemberPwd = !showMemberPwd">
                    <View v-if="!showMemberPwd" /><Hide v-else />
                  </el-icon>
                </el-tooltip>
                <el-tooltip content="复制" placement="top">
                  <el-icon class="action-icon" @click="copyText(detail.memberPasswordDisplay)">
                    <CopyDocument />
                  </el-icon>
                </el-tooltip>
                <el-tag size="small" type="info" style="margin-left: 4px;">默认</el-tag>
              </div>
            </template>
            <template v-else-if="detail.memberPasswordStatus === 'custom'">
              <span style="color: #e6a23c;">{{ detail.memberPasswordDisplay }}</span>
            </template>
            <template v-else>
              <span class="text-secondary">未设置</span>
            </template>
          </el-descriptions-item>
          <el-descriptions-item label="CRM系统密码">
            <template v-if="detail.crmPasswordStatus === 'default'">
              <div class="password-cell">
                <code>{{ showCrmPwd ? detail.crmPasswordDisplay : '••••••••' }}</code>
                <el-tooltip content="查看/隐藏" placement="top">
                  <el-icon class="action-icon" @click="showCrmPwd = !showCrmPwd">
                    <View v-if="!showCrmPwd" /><Hide v-else />
                  </el-icon>
                </el-tooltip>
                <el-tooltip content="复制" placement="top">
                  <el-icon class="action-icon" @click="copyText(detail.crmPasswordDisplay)">
                    <CopyDocument />
                  </el-icon>
                </el-tooltip>
                <el-tag size="small" type="info" style="margin-left: 4px;">默认</el-tag>
              </div>
            </template>
            <template v-else-if="detail.crmPasswordStatus === 'custom'">
              <span style="color: #e6a23c;">{{ detail.crmPasswordDisplay }}</span>
            </template>
            <template v-else-if="detail.crmPasswordStatus === 'not_set'">
              <span class="text-secondary">未创建管理员</span>
            </template>
            <template v-else>
              <span class="text-secondary">未知</span>
            </template>
          </el-descriptions-item>
          </template>
          <el-descriptions-item label=" " />
        </el-descriptions>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { View, Hide, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from './helpers'
import { useUserStore } from '@/stores/user'

const { isSuperAdmin } = useUserStore()

defineProps<{
  detail: any
  loading: boolean
  statusLoading: boolean
}>()

defineEmits<{
  'toggle-status': []
  'edit': []
}>()

const moreCollapse = ref<string[]>([])
const showMemberPwd = ref(false)
const showCrmPwd = ref(false)

const copyText = async (text: string) => {
  if (!text) return
  try { await navigator.clipboard.writeText(text); ElMessage.success('已复制到剪贴板') }
  catch { ElMessage.error('复制失败') }
}
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
}
.text-secondary { color: #909399; }

/* 更多信息折叠 */
.more-collapse {
  margin-top: 10px;
  border: none;
  :deep(.el-collapse-item__header) {
    height: 32px;
    line-height: 32px;
    font-size: 13px;
    color: #606266;
    background: transparent;
    border-bottom: none;
    padding: 0;
  }
  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }
  :deep(.el-collapse-item__content) {
    padding: 4px 0 0;
  }
}
.collapse-title {
  font-weight: 500;
  font-size: 13px;
}
.password-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    background: #f5f7fa;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
}
.action-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  &:hover { color: #66b1ff; }
}
</style>

<template>
  <div class="archive-settings">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在顶部选择企微配置后再进行设置。
    </el-alert>

    <template v-else>
      <!-- 授权状态卡片 -->
      <el-card shadow="never" class="status-card" :class="statusCardClass">
        <div class="status-row">
          <div class="status-icon">
            <el-icon :size="28" :color="settings.status === 'active' ? '#67c23a' : '#e6a23c'">
              <CircleCheckFilled v-if="settings.status === 'active'" />
              <WarningFilled v-else />
            </el-icon>
          </div>
          <div class="status-info">
            <div class="status-title">
              {{ settings.status === 'active' ? '会话存档已开通' : '会话存档未激活' }}
            </div>
            <div class="status-desc">
              <template v-if="settings.status === 'active'">
                到期时间：{{ formatDate(settings.expireDate) }} · 席位：{{ settings.usedUsers }}/{{ settings.maxUsers }}
              </template>
              <template v-else>
                请配置Secret和RSA私钥后开通会话存档服务
              </template>
            </div>
          </div>
          <div class="status-badges">
            <el-tag :type="settings.hasSecret ? 'success' : 'danger'" size="small">
              Secret {{ settings.hasSecret ? '✓' : '✗' }}
            </el-tag>
            <el-tag :type="settings.hasPrivateKey ? 'success' : 'danger'" size="small">
              RSA私钥 {{ settings.hasPrivateKey ? '✓' : '✗' }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- 设置表单 -->
      <el-form :model="form" label-width="120px" label-position="right" style="max-width: 680px; margin-top: 20px" v-loading="loading">
        <!-- A: 基础拉取设置 -->
        <el-divider content-position="left">拉取设置</el-divider>

        <el-form-item label="拉取间隔">
          <el-input-number v-model="form.fetchInterval" :min="1" :max="60" :step="1" />
          <span class="form-tip">分钟（建议 5~15 分钟）</span>
        </el-form-item>

        <el-form-item label="拉取模式">
          <el-radio-group v-model="form.fetchMode">
            <el-radio label="default">默认模式</el-radio>
            <el-radio label="pre_page">预分页模式</el-radio>
            <el-radio label="adaptive">自适应模式</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="保留天数">
          <el-input-number v-model="form.retentionDays" :min="7" :max="3650" :step="30" />
          <span class="form-tip">天（超期数据将被清理）</span>
        </el-form-item>

        <!-- B: 存储设置 -->
        <el-divider content-position="left">存储设置</el-divider>

        <el-form-item label="媒体存储">
          <el-radio-group v-model="form.mediaStorage">
            <el-radio label="local">本地存储</el-radio>
            <el-radio label="oss">OSS云存储</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- C: 质检设置 -->
        <el-divider content-position="left">质检设置</el-divider>

        <el-form-item label="自动质检">
          <el-switch v-model="form.autoInspect" />
          <span class="form-tip">开启后新消息将自动触发质检规则</span>
        </el-form-item>

        <!-- D: 可见性设置 -->
        <el-divider content-position="left">成员可见性</el-divider>

        <el-form-item label="数据可见范围">
          <el-radio-group v-model="form.visibility">
            <el-radio label="self">
              <span>仅自己</span>
              <span class="radio-desc">成员只能查看自己的聊天记录</span>
            </el-radio>
            <el-radio label="department">
              <span>本部门</span>
              <span class="radio-desc">成员可查看同部门同事的聊天记录</span>
            </el-radio>
            <el-radio label="all">
              <span>全部可见</span>
              <span class="radio-desc">所有成员可查看全部聊天记录（管理员始终全部可见）</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- E: RSA公钥 -->
        <el-divider content-position="left">RSA公钥配置</el-divider>

        <el-form-item label="RSA公钥">
          <el-input
            v-model="form.rsaPublicKey"
            type="textarea"
            :rows="5"
            placeholder="粘贴RSA公钥内容（用于企微会话存档加密通信）..."
          />
          <div class="form-tip" style="margin-top: 6px">
            在企微管理后台获取RSA公钥，配置后可用于消息加密传输验证。
          </div>
        </el-form-item>

        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave" :disabled="!configId">
            保存设置
          </el-button>
          <el-button @click="fetchSettings">重置</el-button>
        </el-form-item>
      </el-form>
    </template>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ArchiveSettings' })
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getArchiveSettings, updateArchiveSettings } from '@/api/wecom'

const props = defineProps<{ configId: number | null }>()

const loading = ref(false)
const saving = ref(false)

const settings = reactive({
  status: 'inactive',
  hasSecret: false,
  hasPrivateKey: false,
  maxUsers: 0,
  usedUsers: 0,
  expireDate: null as string | null
})

const form = reactive({
  fetchInterval: 5,
  fetchMode: 'default',
  retentionDays: 180,
  mediaStorage: 'local',
  autoInspect: false,
  visibility: 'all',
  rsaPublicKey: ''
})

const statusCardClass = computed(() => {
  return settings.status === 'active' ? 'status-active' : 'status-inactive'
})

const fetchSettings = async () => {
  if (!props.configId) return
  loading.value = true
  try {
    const res: any = await getArchiveSettings(props.configId)
    if (res) {
      settings.status = res.status || 'inactive'
      settings.hasSecret = !!res.hasSecret
      settings.hasPrivateKey = !!res.hasPrivateKey
      settings.maxUsers = res.maxUsers || 0
      settings.usedUsers = res.usedUsers || 0
      settings.expireDate = res.expireDate || null

      form.fetchInterval = res.fetchInterval || 5
      form.fetchMode = res.fetchMode || 'default'
      form.retentionDays = res.retentionDays || 180
      form.mediaStorage = res.mediaStorage || 'local'
      form.autoInspect = !!res.autoInspect
      form.visibility = res.visibility || 'all'
      form.rsaPublicKey = res.rsaPublicKey || ''
    }
  } catch (e) {
    console.error('[ArchiveSettings] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!props.configId) return
  saving.value = true
  try {
    await updateArchiveSettings({
      configId: props.configId,
      fetchInterval: form.fetchInterval,
      fetchMode: form.fetchMode,
      retentionDays: form.retentionDays,
      mediaStorage: form.mediaStorage,
      autoInspect: form.autoInspect,
      visibility: form.visibility,
      rsaPublicKey: form.rsaPublicKey || undefined
    })
    ElMessage.success('存档设置已保存')
    fetchSettings()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('zh-CN') } catch { return String(d) }
}

watch(() => props.configId, (val) => {
  if (val) fetchSettings()
})

onMounted(() => {
  if (props.configId) fetchSettings()
})

defineExpose({ fetchSettings })
</script>

<style scoped lang="scss">
.archive-settings { padding: 0; }

.status-card {
  border-radius: 10px;
  &.status-active { border-left: 4px solid #67c23a; }
  &.status-inactive { border-left: 4px solid #e6a23c; }
}
.status-row {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
}
.status-icon { flex-shrink: 0; }
.status-info { flex: 1; min-width: 200px; }
.status-title { font-size: 16px; font-weight: 600; color: #303133; }
.status-desc { font-size: 13px; color: #909399; margin-top: 4px; }
.status-badges { display: flex; gap: 8px; flex-shrink: 0; }

.form-tip { margin-left: 10px; font-size: 12px; color: #909399; }

.el-radio-group {
  display: flex; flex-direction: column; gap: 10px;
}
.radio-desc {
  display: block; font-size: 12px; color: #909399; margin-top: 2px; margin-left: 0;
}
</style>


<template>
  <div class="profile-page">
    <div class="page-card">
      <h2>👤 企业信息</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else-if="profile">
        <div class="info-section">
          <h3>基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">企业名称</span>
              <span class="value" v-if="!editing">{{ profile.tenant.name }}</span>
              <input v-else v-model="editForm.name" class="edit-input" />
            </div>
            <div class="info-item">
              <span class="label">联系人</span>
              <span class="value" v-if="!editing">{{ profile.tenant.contact || '-' }}</span>
              <input v-else v-model="editForm.contact" class="edit-input" />
            </div>
            <div class="info-item">
              <span class="label">手机号</span>
              <span class="value">{{ profile.tenant.phone }}</span>
            </div>
            <div class="info-item">
              <span class="label">邮箱</span>
              <span class="value" v-if="!editing">{{ profile.tenant.email || '未设置' }}</span>
              <input v-else v-model="editForm.email" type="email" class="edit-input" />
            </div>
            <div class="info-item">
              <span class="label">租户编码</span>
              <span class="value">{{ profile.tenant.code }}</span>
            </div>
            <div class="info-item">
              <span class="label">注册时间</span>
              <span class="value">{{ formatDate(profile.tenant.createdAt) }}</span>
            </div>
          </div>
          <div class="actions">
            <button v-if="!editing" class="btn-edit" @click="startEdit">编辑信息</button>
            <template v-else>
              <button class="btn-cancel" @click="editing = false">取消</button>
              <button class="btn-save" :disabled="saving" @click="handleSave">{{ saving ? '保存中...' : '保存' }}</button>
            </template>
          </div>
        </div>

        <div class="info-section">
          <h3>套餐信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">当前套餐</span>
              <span class="value highlight">{{ profile.package?.name || '未订购' }}</span>
            </div>
            <div class="info-item">
              <span class="label">套餐类型</span>
              <span class="value">{{ profile.package?.type === 'saas' ? 'SaaS云端版' : '私有部署版' }}</span>
            </div>
            <div class="info-item">
              <span class="label">计费周期</span>
              <span class="value">{{ profile.package?.billingCycle === 'monthly' ? '月付' : profile.package?.billingCycle === 'yearly' ? '年付' : '一次性' }}</span>
            </div>
            <div class="info-item">
              <span class="label">价格</span>
              <span class="value">¥{{ profile.package?.price || 0 }}/{{ profile.package?.billingCycle === 'monthly' ? '月' : '年' }}</span>
            </div>
          </div>
          <div v-if="profile.package?.features?.length" class="features-list">
            <span v-for="f in profile.package.features" :key="f" class="feature-tag">✓ {{ f }}</span>
          </div>
        </div>

        <div class="info-section">
          <h3>资源使用</h3>
          <div class="usage-bars">
            <div class="usage-item">
              <div class="usage-header">
                <span>用户数</span>
                <span>{{ profile.usage?.userCount || 0 }} / {{ profile.usage?.maxUsers || 0 }}</span>
              </div>
              <div class="usage-bar"><div class="fill" :style="{ width: (profile.usage?.userUsagePercent || 0) + '%' }"></div></div>
            </div>
            <div class="usage-item">
              <div class="usage-header">
                <span>存储空间</span>
                <span>{{ formatStorage(profile.usage?.usedStorageMb) }} / {{ profile.usage?.maxStorageGb || 0 }}GB</span>
              </div>
              <div class="usage-bar"><div class="fill" :style="{ width: (profile.usage?.storageUsagePercent || 0) + '%' }"></div></div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getMemberProfile, updateMemberProfile } from '@/api/member'

const loading = ref(true)
const editing = ref(false)
const saving = ref(false)
const profile = ref<any>(null)
const editForm = reactive({ name: '', contact: '', email: '' })

onMounted(async () => {
  profile.value = await getMemberProfile()
  loading.value = false
})

const startEdit = () => {
  editForm.name = profile.value.tenant.name
  editForm.contact = profile.value.tenant.contact || ''
  editForm.email = profile.value.tenant.email || ''
  editing.value = true
}

const handleSave = async () => {
  saving.value = true
  try {
    const result = await updateMemberProfile(editForm)
    if (result.success) {
      profile.value = await getMemberProfile()
      editing.value = false
    } else {
      alert(result.message)
    }
  } finally { saving.value = false }
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const formatStorage = (mb: number) => {
  if (!mb) return '0MB'
  return mb >= 1024 ? (mb / 1024).toFixed(1) + 'GB' : Math.round(mb) + 'MB'
}
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.page-card h2 { margin: 0 0 24px; font-size: 18px; color: #1e293b; }
.info-section { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; &:last-child { border: none; margin: 0; padding: 0; } }
.info-section h3 { font-size: 14px; color: #64748b; margin: 0 0 16px; font-weight: 600; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-item { .label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; } .value { font-size: 14px; color: #1e293b; font-weight: 500; &.highlight { color: #6366f1; } } }
.edit-input { width: 100%; padding: 6px 10px; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; &:focus { outline: none; border-color: #6366f1; } }
.actions { margin-top: 16px; display: flex; gap: 10px; }
.btn-edit, .btn-save { padding: 8px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-edit { background: #f0f0ff; color: #6366f1; }
.btn-save { background: #6366f1; color: white; &:disabled { opacity: 0.6; } }
.btn-cancel { padding: 8px 20px; border: 1.5px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-size: 13px; color: #64748b; }
.features-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.feature-tag { font-size: 12px; padding: 4px 10px; background: #f0fdf4; color: #16a34a; border-radius: 12px; }
.usage-bars { display: grid; gap: 16px; }
.usage-item { .usage-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #475569; } }
.usage-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; .fill { height: 100%; background: #6366f1; border-radius: 3px; } }
@media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } }
</style>


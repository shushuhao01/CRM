<template>
  <!-- 编辑租户信息对话框 -->
  <el-dialog :model-value="editDialogVisible" @update:model-value="$emit('update:editDialogVisible', $event)" title="编辑租户信息" width="600px">
    <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
      <el-form-item label="客户名称" prop="name">
        <el-input v-model="editForm.name" placeholder="请输入客户名称" />
      </el-form-item>
      <el-form-item label="租户编码" prop="code">
        <el-input v-model="editForm.code" disabled placeholder="租户编码不可修改" />
      </el-form-item>
      <el-form-item label="联系人" prop="contact">
        <el-input v-model="editForm.contact" placeholder="请输入联系人" />
      </el-form-item>
      <el-form-item label="联系电话" prop="phone">
        <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="editForm.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="备注信息" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:editDialogVisible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('confirm-edit')" :loading="submitting">确定</el-button>
    </template>
  </el-dialog>

  <!-- 调整用户数对话框 -->
  <el-dialog :model-value="adjustUsersVisible" @update:model-value="$emit('update:adjustUsersVisible', $event)" title="调整用户数" width="450px">
    <el-form label-width="100px">
      <el-form-item label="客户名称">{{ detail.name }}</el-form-item>
      <el-form-item label="当前用户数">{{ detail.userCount || 0 }} / {{ detail.maxUsers || 0 }}</el-form-item>
      <el-form-item label="新最大用户" required>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
          <el-input-number :model-value="newMaxUsers" @update:model-value="$emit('update:newMaxUsers', $event)" :min="detail.userCount || 1" :max="9999" />
          <span style="white-space: nowrap; flex-shrink: 0;">个</span>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:adjustUsersVisible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('confirm-adjust-users')" :loading="submitting">确定</el-button>
    </template>
  </el-dialog>

  <!-- 调整存储空间对话框 -->
  <el-dialog :model-value="adjustStorageVisible" @update:model-value="$emit('update:adjustStorageVisible', $event)" title="调整存储空间" width="450px">
    <el-form label-width="100px">
      <el-form-item label="客户名称">{{ detail.name }}</el-form-item>
      <el-form-item label="当前存储">{{ formatStorage(detail.usedStorageMb) }} / {{ detail.maxStorageGb || 0 }}GB</el-form-item>
      <el-form-item label="新最大空间" required>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
          <el-input-number :model-value="newMaxStorageGb" @update:model-value="$emit('update:newMaxStorageGb', $event)" :min="usedStorageGbCeil" :max="10000" />
          <span style="white-space: nowrap; flex-shrink: 0;">GB</span>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:adjustStorageVisible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('confirm-adjust-storage')" :loading="submitting">确定</el-button>
    </template>
  </el-dialog>

  <!-- 调整套餐对话框 -->
  <el-dialog :model-value="adjustPackageVisible" @update:model-value="$emit('update:adjustPackageVisible', $event)" title="调整套餐" width="720px">
    <div v-loading="packagesLoading" class="package-picker">
      <div class="pkg-current-info" v-if="detail.packageName">
        <span>当前套餐：</span>
        <el-tag :type="getPackageType(detail.packageName)">{{ detail.packageName }}</el-tag>
      </div>
      <el-tabs :model-value="packageTab" @update:model-value="$emit('update:packageTab', $event)">
        <el-tab-pane label="SaaS云端版" name="saas" />
        <el-tab-pane label="私有部署版" name="private" />
      </el-tabs>
      <div class="package-picker-grid">
        <div
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="package-picker-item"
          :class="{
            selected: String(newPackageId) === String(pkg.id),
            current: String(detail.packageId) === String(pkg.id),
            recommended: pkg.is_recommended
          }"
          @click="$emit('update:newPackageId', String(pkg.id))"
        >
          <div class="pkg-badge" v-if="String(detail.packageId) === String(pkg.id)">当前</div>
          <div class="pkg-badge recommend" v-else-if="pkg.is_recommended">推荐</div>
          <div class="pkg-name">{{ pkg.name }}</div>
          <div class="pkg-price">
            <span v-if="pkg.price == 0" class="free">免费</span>
            <template v-else>
              <span class="amount">¥{{ pkg.price }}</span>
              <span class="unit">/{{ getBillingText(pkg.billing_cycle) }}</span>
            </template>
          </div>
          <div class="pkg-specs">
            <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
            <span>{{ pkg.max_storage_gb }}GB 存储</span>
          </div>
          <div class="pkg-features" v-if="pkg.features?.length">
            <div v-for="f in (pkg.features || []).slice(0, 4)" :key="f" class="pkg-feature">
              <el-icon color="#67c23a" :size="12"><CircleCheck /></el-icon> {{ f }}
            </div>
            <div v-if="pkg.features.length > 4" class="pkg-feature more">
              +{{ pkg.features.length - 4 }} 项更多功能
            </div>
          </div>
          <div class="pkg-select-mark" v-if="String(newPackageId) === String(pkg.id)">
            <el-icon :size="20"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>
      <el-empty v-if="!packagesLoading && filteredPackages.length === 0" description="暂无可用套餐" :image-size="48" />
      <el-checkbox :model-value="syncPackageConfig" @update:model-value="$emit('update:syncPackageConfig', $event)" style="margin-top: 12px">
        同步套餐的配置到租户（用户数上限、存储空间、功能模块）
      </el-checkbox>
    </div>
    <template #footer>
      <el-button @click="$emit('update:adjustPackageVisible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('confirm-adjust-package')" :loading="submitting"
        :disabled="!newPackageId">确认更换</el-button>
    </template>
  </el-dialog>

  <!-- 续期对话框 -->
  <el-dialog :model-value="renewVisible" @update:model-value="$emit('update:renewVisible', $event)" title="租户续期" width="400px">
    <el-form label-width="100px">
      <el-form-item label="当前到期">{{ detail.expireDate || '永久' }}</el-form-item>
      <el-form-item label="续期时长" required>
        <el-select :model-value="renewMonths" @update:model-value="$emit('update:renewMonths', $event)" placeholder="请选择续期时长" style="width: 100%">
          <el-option :label="'1个月'" :value="1" />
          <el-option :label="'3个月'" :value="3" />
          <el-option :label="'6个月'" :value="6" />
          <el-option :label="'12个月（1年）'" :value="12" />
          <el-option :label="'24个月（2年）'" :value="24" />
          <el-option :label="'36个月（3年）'" :value="36" />
        </el-select>
      </el-form-item>
      <el-form-item label="新到期时间">
        <span style="color: #409eff; font-weight: 500;">{{ computedExpireDate }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:renewVisible', false)">取消</el-button>
      <el-button type="primary" @click="$emit('confirm-renew')" :loading="submitting">确定续期</el-button>
    </template>
  </el-dialog>

  <!-- 授权码更新对话框 -->
  <el-dialog :model-value="licenseVisible" @update:model-value="$emit('update:licenseVisible', $event)" title="授权码已更新" width="500px">
    <el-result icon="success" title="授权码已重新生成">
      <template #sub-title>
        <div class="license-result">
          <p>请将新授权码发送给客户</p>
          <div class="license-key-box">
            <span class="key">{{ newLicenseKey }}</span>
            <el-button type="primary" size="small" @click="copyKey(newLicenseKey)">复制</el-button>
          </div>
          <p class="tip">原授权码已失效</p>
        </div>
      </template>
    </el-result>
    <template #footer>
      <el-button type="primary" @click="$emit('update:licenseVisible', false)">我知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CircleCheck } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Package } from '@/api/packages'
import { formatStorage, getPackageType, getBillingText, copyKey } from './helpers'

const props = defineProps<{
  detail: any
  submitting: boolean
  editForm: { name: string; code: string; contact: string; phone: string; email: string; remark: string }
  newMaxUsers: number
  newMaxStorageGb: number
  newPackageId: number | string
  allPackages: Package[]
  packagesLoading: boolean
  packageTab: string
  syncPackageConfig: boolean
  renewMonths: number
  newLicenseKey: string
  editDialogVisible: boolean
  adjustUsersVisible: boolean
  adjustStorageVisible: boolean
  adjustPackageVisible: boolean
  renewVisible: boolean
  licenseVisible: boolean
}>()

const emit = defineEmits<{
  'confirm-edit': []
  'confirm-adjust-users': []
  'confirm-adjust-storage': []
  'confirm-adjust-package': []
  'confirm-renew': []
  'update:editDialogVisible': [val: boolean]
  'update:adjustUsersVisible': [val: boolean]
  'update:adjustStorageVisible': [val: boolean]
  'update:adjustPackageVisible': [val: boolean]
  'update:renewVisible': [val: boolean]
  'update:licenseVisible': [val: boolean]
  'update:newMaxUsers': [val: number]
  'update:newMaxStorageGb': [val: number]
  'update:newPackageId': [val: number | string]
  'update:packageTab': [val: string]
  'update:syncPackageConfig': [val: boolean]
  'update:renewMonths': [val: number]
}>()

const editFormRef = ref<FormInstance>()

const editRules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }]
}

const usedStorageGbCeil = computed(() => {
  const mb = props.detail.usedStorageMb || 0
  return Math.max(1, Math.ceil(mb / 1024))
})

const filteredPackages = computed(() => {
  return props.allPackages.filter((p: any) => p.type === props.packageTab && p.status)
})

const computedExpireDate = computed(() => {
  if (!props.renewMonths) return '-'
  const base = props.detail.expireDate
    ? new Date(props.detail.expireDate)
    : new Date()
  const target = new Date(base)
  target.setMonth(target.getMonth() + props.renewMonths)
  return target.toISOString().split('T')[0]
})

defineExpose({ editFormRef })
</script>

<style scoped lang="scss">
.license-result {
  text-align: center;
  p { margin: 8px 0; color: #606266; }
  .tip { font-size: 12px; color: #909399; }
}
.license-key-box {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px; margin: 16px 0; background: #f5f7fa; border-radius: 8px;
  .key { font-family: monospace; font-size: 18px; font-weight: bold; color: #409eff; letter-spacing: 1px; }
}
.package-picker {
  .pkg-current-info { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; color: #606266; }
}
.package-picker-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 12px;
  max-height: 420px; overflow-y: auto; padding: 4px 2px;
}
.package-picker-item {
  position: relative; padding: 16px 14px; border: 2px solid #e4e7ed; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; background: #fff;
  &:hover { border-color: #c6e2ff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  &.selected { border-color: #409eff; background: #f0f7ff; box-shadow: 0 2px 12px rgba(64,158,255,0.15); }
  &.current { border-color: #e6a23c; }
  &.recommended { border-color: #67c23a; }
  .pkg-badge {
    position: absolute; top: -1px; right: 10px; font-size: 11px; padding: 1px 8px;
    background: #e6a23c; color: #fff; border-radius: 0 0 6px 6px; font-weight: 500;
    &.recommend { background: #67c23a; }
  }
  .pkg-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 6px; }
  .pkg-price {
    margin-bottom: 8px;
    .free { color: #67c23a; font-weight: 600; font-size: 16px; }
    .amount { color: #e6a23c; font-weight: 700; font-size: 20px; }
    .unit { color: #909399; font-size: 12px; }
  }
  .pkg-specs { display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #909399; }
  .pkg-features {
    border-top: 1px solid #f0f0f0; padding-top: 8px;
    .pkg-feature { font-size: 12px; color: #606266; line-height: 1.8; display: flex; align-items: center; gap: 4px; }
    .pkg-feature.more { color: #909399; font-style: italic; }
  }
  .pkg-select-mark { position: absolute; bottom: 8px; right: 8px; color: #409eff; }
}
</style>



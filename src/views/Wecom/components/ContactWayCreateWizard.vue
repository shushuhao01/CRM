<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑活码' : '创建活码'"
    width="680px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 步骤条 -->
    <el-steps :active="currentStep" finish-status="success" simple style="margin-bottom: 24px">
      <el-step title="基本信息" />
      <el-step title="接待成员" />
      <el-step title="欢迎语" />
      <el-step title="自动标签" />
      <el-step title="预览确认" />
    </el-steps>

    <!-- Step 1: 基本信息 -->
    <div v-show="currentStep === 0" class="step-content">
      <el-form ref="step1Ref" :model="form" :rules="step1Rules" label-width="100px">
        <el-form-item label="活码名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入活码名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="活码类型" prop="weightMode">
          <el-radio-group v-model="form.weightMode">
            <el-radio label="single">单人</el-radio>
            <el-radio label="round_robin">多人轮流</el-radio>
            <el-radio label="weighted">多人权重</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="渠道标识">
          <el-input v-model="form.state" placeholder="如: website, exhibition" />
        </el-form-item>
        <el-form-item label="跳过验证">
          <el-switch v-model="form.skipVerify" active-text="是" inactive-text="否" />
          <div class="form-tip">开启后客户添加时无需验证直接通过</div>
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 2: 接待成员 -->
    <div v-show="currentStep === 1" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="接待成员">
          <el-select v-model="form.userIds" multiple filterable placeholder="搜索并选择成员" style="width: 100%">
            <el-option v-for="u in wecomUserOptions" :key="u.userid" :label="u.name" :value="u.userid" />
          </el-select>
        </el-form-item>
        <el-form-item label="按部门添加">
          <el-select v-model="selectedDept" placeholder="选择企业微信部门" style="width: 100%" filterable clearable @change="addDeptMembers">
            <el-option v-for="dept in wecomDepartments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 权重配置（多人权重模式） -->
      <div v-if="form.weightMode === 'weighted' && form.userIds.length > 0" class="weight-section">
        <div class="weight-title">权重配置</div>
        <div v-for="uid in form.userIds" :key="uid" class="weight-row">
          <span class="weight-name">{{ getUserName(uid) }}</span>
          <el-input-number v-model="form.weights[uid]" :min="1" :max="10" size="small" />
        </div>
      </div>

      <el-empty v-if="form.userIds.length === 0" :image-size="60" description="请选择接待成员" />
    </div>

    <!-- Step 3: 欢迎语 -->
    <div v-show="currentStep === 2" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="启用欢迎语">
          <el-switch v-model="form.welcomeEnabled" />
        </el-form-item>
        <el-form-item v-if="form.welcomeEnabled" label="欢迎语">
          <el-input v-model="form.welcomeMsg" type="textarea" :rows="4" placeholder="输入欢迎语，支持变量：{客户昵称} {员工姓名}" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 4: 自动标签（企业微信企业客户标签） -->
    <div v-show="currentStep === 3" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="自动标签">
          <el-switch v-model="form.autoTagEnabled" @change="(val: boolean) => { if (val) loadCorpTags() }" />
        </el-form-item>
        <el-form-item v-if="form.autoTagEnabled" label="选择标签">
          <el-select v-model="form.autoTags" multiple filterable placeholder="选择企业微信标签" style="width: 100%" v-loading="tagLoading">
            <el-option-group v-for="group in corpTagGroups" :key="group.id" :label="group.groupName">
              <el-option v-for="tag in group.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
            </el-option-group>
          </el-select>
          <div class="form-tip">标签来自企业微信「企业客户标签」</div>
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 5: 预览确认 -->
    <div v-show="currentStep === 4" class="step-content">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="活码名称">{{ form.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeText(form.weightMode) }}</el-descriptions-item>
        <el-descriptions-item label="渠道标识">{{ form.state || '-' }}</el-descriptions-item>
        <el-descriptions-item label="跳过验证">{{ form.skipVerify ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="接待成员" :span="2">
          {{ form.userIds.map(id => getUserName(id)).join('、') || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="欢迎语">{{ form.welcomeEnabled ? (form.welcomeMsg || '-') : '关闭' }}</el-descriptions-item>
        <el-descriptions-item label="自动标签">
          <template v-if="form.autoTagEnabled && form.autoTags.length">
            <el-tag v-for="t in form.autoTags" :key="t" size="small" style="margin-right: 4px">{{ getTagName(t) }}</el-tag>
          </template>
          <span v-else>关闭</span>
        </el-descriptions-item>
      </el-descriptions>
      <div class="confirm-tip">
        <span>{{ isEdit ? '确认后将更新活码配置' : '确认后将通过企微API创建活码并生成二维码' }}</span>
      </div>
    </div>

    <!-- 底部 -->
    <template #footer>
      <div class="wizard-footer">
        <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
        <div style="flex: 1" />
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep < 4" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-else type="primary" @click="handleSubmit" :loading="submitting">{{ isEdit ? '保存' : '创建活码' }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWecomDepartments, getWecomUsers, getAcquisitionTags } from '@/api/wecom'

const props = defineProps<{
  modelValue: boolean
  editData?: any
  isDemoMode: boolean
  configId?: number | null
  wecomUserOptions?: any[]
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.editData)
const currentStep = ref(0)
const step1Ref = ref()
const submitting = ref(false)
const selectedDept = ref<number | null>(null)

// 企微部门
const wecomDepartments = ref<Array<{ id: number; name: string }>>([])

const loadDepartments = async () => {
  if (!props.configId) return
  try {
    const res: any = await getWecomDepartments(props.configId)
    const data = res?.data || res
    wecomDepartments.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
}

// 企微用户
const wecomUserOptions = computed(() => props.wecomUserOptions || [])

const addDeptMembers = async (deptId: number) => {
  if (!deptId || !props.configId) return
  try {
    const res: any = await getWecomUsers(props.configId, deptId, true)
    const users = Array.isArray(res) ? res : (res?.data || [])
    for (const u of users) {
      const uid = u.userid || u.userId
      if (uid && !form.userIds.includes(uid)) {
        form.userIds.push(uid)
        if (!form.weights[uid]) form.weights[uid] = 5
      }
    }
    ElMessage.success(`已添加 ${users.length} 名成员`)
  } catch (e: any) {
    ElMessage.error(e.message || '获取部门成员失败')
  }
  selectedDept.value = null
}

// 企微标签
const corpTagGroups = ref<Array<{ id: string; groupName: string; tags: Array<{ id: string; name: string }> }>>([])
const tagLoading = ref(false)

const loadCorpTags = async () => {
  if (!props.configId) return
  tagLoading.value = true
  try {
    const res: any = await getAcquisitionTags(props.configId)
    const data = res?.data || res
    corpTagGroups.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
  finally { tagLoading.value = false }
}

const getTagName = (tagId: string) => {
  for (const group of corpTagGroups.value) {
    const tag = group.tags?.find(t => t.id === tagId)
    if (tag) return tag.name
  }
  return tagId
}

const getUserName = (uid: string) => {
  const user = wecomUserOptions.value.find((u: any) => u.userid === uid)
  return user?.name || uid
}

const defaultForm = () => ({
  name: '',
  weightMode: 'single' as string,
  state: '',
  skipVerify: false,
  userIds: [] as string[],
  weights: {} as Record<string, number>,
  welcomeEnabled: false,
  welcomeMsg: '',
  autoTagEnabled: false,
  autoTags: [] as string[],
})

const form = reactive(defaultForm())
const step1Rules = { name: [{ required: true, message: '请输入活码名称', trigger: 'blur' }] }

const typeText = (mode: string) => {
  const map: Record<string, string> = { single: '单人', round_robin: '多人轮流', weighted: '多人权重' }
  return map[mode] || mode
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    try { await step1Ref.value?.validate() } catch { return }
  }
  if (currentStep.value === 1 && form.userIds.length === 0) {
    ElMessage.warning('请选择接待成员')
    return
  }
  currentStep.value++
}

const handleSubmit = () => {
  const weights = form.weightMode === 'weighted'
    ? form.userIds.map(uid => ({ userId: uid, weight: form.weights[uid] || 5 }))
    : undefined

  emit('submit', {
    name: form.name,
    weightMode: form.weightMode,
    state: form.state,
    skipVerify: form.skipVerify,
    userIds: form.userIds,
    userWeights: weights ? JSON.stringify(weights) : undefined,
    welcomeMsg: form.welcomeEnabled ? form.welcomeMsg : '',
    welcomeEnabled: form.welcomeEnabled,
    autoTags: form.autoTagEnabled ? JSON.stringify(form.autoTags) : null,
    autoTagEnabled: form.autoTagEnabled,
  })
}

const handleClose = () => {
  visible.value = false
  currentStep.value = 0
  Object.assign(form, defaultForm())
}

watch(() => props.editData, (data) => {
  if (data) {
    currentStep.value = 0
    form.name = data.name || ''
    form.weightMode = data.weightMode || 'single'
    form.state = data.state || ''
    form.skipVerify = data.skipVerify ?? false
    try { form.userIds = JSON.parse(data.userIds || '[]') } catch { form.userIds = [] }
    form.welcomeMsg = data.welcomeMsg || ''
    form.welcomeEnabled = !!data.welcomeMsg || !!data.welcomeEnabled
    try { form.autoTags = JSON.parse(data.autoTags || '[]') } catch { form.autoTags = [] }
    form.autoTagEnabled = form.autoTags.length > 0
  } else {
    Object.assign(form, defaultForm())
  }
}, { immediate: true })

watch(() => [props.modelValue, props.configId], ([show]) => {
  if (show && props.configId) {
    loadDepartments()
  }
})
</script>

<style scoped>
.step-content { min-height: 220px; padding: 8px 0; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.weight-section { margin-top: 12px; padding: 16px; background: #F9FAFB; border-radius: 12px; }
.weight-title { font-weight: 600; font-size: 14px; margin-bottom: 12px; color: #1F2937; }
.weight-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.weight-name { width: 80px; font-size: 13px; color: #4B5563; }
.confirm-tip {
  display: flex; align-items: center; gap: 8px;
  margin-top: 20px; padding: 12px 16px;
  background: #FFFBEB; border-radius: 8px;
  color: #92400E; font-size: 13px;
}
.wizard-footer { display: flex; align-items: center; width: 100%; }
</style>

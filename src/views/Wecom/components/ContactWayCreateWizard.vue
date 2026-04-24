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
            <el-option v-for="u in demoUsers" :key="u.userid" :label="u.name" :value="u.userid" />
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
          <el-input v-model="form.welcomeMsg" type="textarea" :rows="4" placeholder="输入欢迎语" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 4: 自动标签 -->
    <div v-show="currentStep === 3" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="自动标签">
          <el-switch v-model="form.autoTagEnabled" />
        </el-form-item>
        <el-form-item v-if="form.autoTagEnabled" label="选择标签">
          <el-select v-model="form.autoTags" multiple filterable allow-create placeholder="选择标签" style="width: 100%">
            <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
          </el-select>
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
            <el-tag v-for="t in form.autoTags" :key="t" size="small" style="margin-right: 4px">{{ t }}</el-tag>
          </template>
          <span v-else>关闭</span>
        </el-descriptions-item>
      </el-descriptions>
      <div class="qr-preview">
        <div class="qr-mock-box">
          <el-icon :size="48" style="color: #D1D5DB"><Cellphone /></el-icon>
          <p style="color: #9CA3AF; font-size: 12px">{{ isEdit ? '活码二维码' : '创建后生成二维码' }}</p>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <template #footer>
      <div class="wizard-footer">
        <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
        <div style="flex: 1" />
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep < 4" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-else type="primary" @click="handleSubmit">{{ isEdit ? '保存' : '创建活码' }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Cellphone } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
  editData?: any
  isDemoMode: boolean
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.editData)
const currentStep = ref(0)
const step1Ref = ref()

const demoUsers = [
  { userid: 'wang01', name: '王销售' },
  { userid: 'chen02', name: '陈经理' },
  { userid: 'zhang03', name: '张客服' },
  { userid: 'li04', name: '李主管' },
]

const tagOptions = ['VIP客户', '意向客户', '潜在客户', '网站来源', '展会来源']

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

const getUserName = (uid: string) => demoUsers.find(u => u.userid === uid)?.name || uid

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
  emit('submit', {
    name: form.name,
    weightMode: form.weightMode,
    state: form.state,
    skipVerify: form.skipVerify,
    userIds: form.userIds,
    welcomeMsg: form.welcomeEnabled ? form.welcomeMsg : '',
    autoTags: form.autoTagEnabled ? JSON.stringify(form.autoTags) : null,
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
    try { form.userIds = JSON.parse(data.userIds || '[]') } catch { form.userIds = [] }
    form.welcomeMsg = data.welcomeMsg || ''
    form.welcomeEnabled = !!data.welcomeMsg
  } else {
    Object.assign(form, defaultForm())
  }
}, { immediate: true })
</script>

<style scoped>
.step-content { min-height: 220px; padding: 8px 0; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.weight-section { margin-top: 12px; padding: 16px; background: #F9FAFB; border-radius: 12px; }
.weight-title { font-weight: 600; font-size: 14px; margin-bottom: 12px; color: #1F2937; }
.weight-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.weight-name { width: 80px; font-size: 13px; color: #4B5563; }
.qr-preview { display: flex; justify-content: center; margin-top: 20px; }
.qr-mock-box {
  width: 160px; height: 160px; background: #F9FAFB; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.wizard-footer { display: flex; align-items: center; width: 100%; }
</style>


<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑获客链接' : '创建获客链接'"
    width="720px"
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
        <el-form-item label="链接名称" prop="linkName">
          <el-input v-model="form.linkName" placeholder="请输入链接名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="渠道标识" prop="state">
          <el-input v-model="form.state" placeholder="如: website_banner, ad_2026Q1（用于区分来源）" />
          <div class="form-tip">渠道标识可帮助区分不同投放渠道的获客效果</div>
        </el-form-item>
        <el-form-item label="自动建群">
          <el-switch v-model="form.autoGroupEnabled" active-text="开启" inactive-text="关闭" />
          <div class="form-tip">开启后，客户添加成功将自动拉入群聊</div>
        </el-form-item>
        <el-form-item v-if="form.autoGroupEnabled" label="群模板">
          <el-select v-model="form.groupTemplateId" placeholder="选择群模板" style="width: 100%">
            <el-option label="默认群模板" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 2: 接待成员 -->
    <div v-show="currentStep === 1" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="分配模式">
          <el-radio-group v-model="form.assignMode">
            <el-radio label="weighted">按权重轮流</el-radio>
            <el-radio label="online_random">按在线随机</el-radio>
            <el-radio label="priority">指定优先</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="接待成员">
          <div style="width: 100%">
            <el-button type="primary" link @click="showMemberSelector = true">
              <el-icon><Plus /></el-icon>添加成员
            </el-button>
            <el-button type="primary" link @click="showDeptSelector = true" style="margin-left: 12px">
              <el-icon><OfficeBuilding /></el-icon>按部门添加
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <!-- 成员表格 -->
      <el-table :data="form.userWeights" stripe size="small" style="margin-top: 8px" v-if="form.userWeights.length > 0">
        <el-table-column label="成员" min-width="120">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-avatar :size="28">{{ getMemberName(row.userId).charAt(0) }}</el-avatar>
              <span>{{ getMemberName(row.userId) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="部门" width="100">
          <template #default>
            <span style="color: #9CA3AF">-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="form.assignMode === 'weighted'" label="权重" width="160">
          <template #default="{ row }">
            <el-input-number v-model="row.weight" :min="1" :max="10" :step="1" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button type="danger" link size="small" @click="form.userWeights.splice($index, 1)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else :image-size="60" description="请添加接待成员" />

      <!-- 分配预览 -->
      <div v-if="form.userWeights.length > 0 && form.assignMode === 'weighted'" class="weight-preview">
        <div class="preview-title">📊 分配预览</div>
        <div class="preview-bars">
          <div v-for="m in form.userWeights" :key="m.userId" class="preview-item">
            <span class="preview-name">{{ getMemberName(m.userId) }}</span>
            <el-progress
              :percentage="calcWeightPercent(m.weight)"
              :stroke-width="14"
              :text-inside="true"
              :color="m.weight >= 7 ? '#10B981' : m.weight >= 4 ? '#4C6EF5' : '#9CA3AF'"
              style="flex: 1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: 欢迎语 -->
    <div v-show="currentStep === 2" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="启用欢迎语">
          <el-switch v-model="form.welcomeEnabled" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <template v-if="form.welcomeEnabled">
          <el-form-item label="文本内容">
            <el-input
              v-model="form.welcomeMsg"
              type="textarea"
              :rows="4"
              placeholder="输入欢迎语文本，支持变量：{客户昵称} {员工姓名} {渠道名称} {当前时间}"
              maxlength="500"
              show-word-limit
            />
            <div class="variable-tags">
              <span class="variable-label">快捷变量：</span>
              <el-tag
                v-for="v in welcomeVariables"
                :key="v.value"
                size="small"
                type="info"
                class="variable-tag"
                @click="insertVariable(v.value)"
                style="cursor: pointer"
              >
                {{ v.label }}
              </el-tag>
            </div>
          </el-form-item>
          <el-form-item label="附件类型">
            <el-radio-group v-model="form.welcomeMediaType">
              <el-radio label="none">无附件</el-radio>
              <el-radio label="image">图片</el-radio>
              <el-radio label="link">链接</el-radio>
              <el-radio label="miniprogram">小程序</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.welcomeMediaType === 'image'" label="图片">
            <el-input v-model="form.welcomeMediaContent.imageUrl" placeholder="请输入图片URL或上传" />
          </el-form-item>
          <el-form-item v-if="form.welcomeMediaType === 'link'" label="链接标题">
            <el-input v-model="form.welcomeMediaContent.linkTitle" placeholder="链接标题" />
          </el-form-item>
          <el-form-item v-if="form.welcomeMediaType === 'link'" label="链接地址">
            <el-input v-model="form.welcomeMediaContent.linkUrl" placeholder="https://" />
          </el-form-item>
          <el-form-item v-if="form.welcomeMediaType === 'link'" label="链接描述">
            <el-input v-model="form.welcomeMediaContent.linkDesc" placeholder="链接描述" />
          </el-form-item>
        </template>
      </el-form>
    </div>

    <!-- Step 4: 自动标签 -->
    <div v-show="currentStep === 3" class="step-content">
      <el-form label-width="100px">
        <el-form-item label="启用自动标签">
          <el-switch v-model="form.autoTagEnabled" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <template v-if="form.autoTagEnabled">
          <el-form-item label="始终打标签">
            <el-select v-model="form.autoTags" multiple filterable allow-create default-first-option placeholder="选择或输入标签" style="width: 100%">
              <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
            </el-select>
            <div class="form-tip">所有通过此链接添加的客户都会自动打上所选标签</div>
          </el-form-item>
          <el-form-item label="按渠道标签">
            <el-switch v-model="form.channelTagEnabled" active-text="开启" />
            <div v-if="form.channelTagEnabled" class="form-tip">
              将自动以渠道标识 <el-tag size="small" type="info">{{ form.state || '(未设置)' }}</el-tag> 作为标签打给客户
            </div>
          </el-form-item>
        </template>
      </el-form>
    </div>

    <!-- Step 5: 预览与确认 -->
    <div v-show="currentStep === 4" class="step-content">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="链接名称">{{ form.linkName }}</el-descriptions-item>
        <el-descriptions-item label="渠道标识">{{ form.state || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分配模式">{{ assignModeText }}</el-descriptions-item>
        <el-descriptions-item label="接待成员">
          {{ form.userWeights.map(u => getMemberName(u.userId)).join('、') || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="自动建群">{{ form.autoGroupEnabled ? '开启' : '关闭' }}</el-descriptions-item>
        <el-descriptions-item label="欢迎语">{{ form.welcomeEnabled ? '开启' : '关闭' }}</el-descriptions-item>
        <el-descriptions-item v-if="form.welcomeEnabled" label="欢迎语内容" :span="2">
          {{ form.welcomeMsg || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="自动标签">
          <template v-if="form.autoTagEnabled && form.autoTags.length > 0">
            <el-tag v-for="t in form.autoTags" :key="t" size="small" style="margin-right: 4px">{{ t }}</el-tag>
          </template>
          <span v-else>关闭</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="confirm-tip">
        <el-icon style="color: #F59E0B"><WarningFilled /></el-icon>
        <span>{{ isEdit ? '确认以上信息无误后点击保存修改' : '确认以上信息无误后点击创建链接，创建后将自动生成二维码' }}</span>
      </div>
    </div>

    <!-- 成员选择器弹窗 -->
    <el-dialog v-model="showMemberSelector" title="添加接待成员" width="460px" append-to-body>
      <el-select
        v-model="selectedNewMembers"
        multiple
        filterable
        placeholder="搜索并选择成员"
        style="width: 100%"
      >
        <el-option
          v-for="u in wecomUserOptions"
          :key="u.userid"
          :label="u.name"
          :value="u.userid"
          :disabled="form.userWeights.some(w => w.userId === u.userid)"
        />
      </el-select>
      <template #footer>
        <el-button @click="showMemberSelector = false">取消</el-button>
        <el-button type="primary" @click="confirmAddMembers">确定</el-button>
      </template>
    </el-dialog>

    <!-- 按部门选择弹窗 -->
    <el-dialog v-model="showDeptSelector" title="按部门添加" width="460px" append-to-body>
      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        选择部门后，该部门下所有成员将被添加为接待人
      </el-alert>
      <el-select v-model="selectedDept" placeholder="选择部门" style="width: 100%">
        <el-option label="销售部" value="sales" />
        <el-option label="客服部" value="service" />
        <el-option label="技术部" value="tech" />
      </el-select>
      <template #footer>
        <el-button @click="showDeptSelector = false">取消</el-button>
        <el-button type="primary" @click="showDeptSelector = false">确定添加</el-button>
      </template>
    </el-dialog>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="wizard-footer">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <div style="flex: 1" />
        <el-button @click="handleClose">取消</el-button>
        <el-button v-if="currentStep < 4" type="primary" @click="nextStep">下一步</el-button>
        <el-button v-else type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建链接' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, OfficeBuilding, WarningFilled } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
  editData?: any
  wecomUserOptions: any[]
  getMemberName: (userId: string) => string
  submitting: boolean
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const isEdit = computed(() => !!props.editData)

const currentStep = ref(0)
const step1Ref = ref()
const showMemberSelector = ref(false)
const showDeptSelector = ref(false)
const selectedNewMembers = ref<string[]>([])
const selectedDept = ref('')

const welcomeVariables = [
  { label: '{客户昵称}', value: '{客户昵称}' },
  { label: '{员工姓名}', value: '{员工姓名}' },
  { label: '{渠道名称}', value: '{渠道名称}' },
  { label: '{当前时间}', value: '{当前时间}' }
]

const availableTags = ['VIP客户', '意向客户', '潜在客户', '网站来源', '广告来源', '活动来源', '转介绍']

const defaultForm = () => ({
  linkName: '',
  state: '',
  autoGroupEnabled: false,
  groupTemplateId: undefined as number | undefined,
  assignMode: 'weighted' as 'weighted' | 'online_random' | 'priority',
  userWeights: [] as Array<{ userId: string; weight: number }>,
  welcomeEnabled: false,
  welcomeMsg: '',
  welcomeMediaType: 'none' as string,
  welcomeMediaContent: { imageUrl: '', linkTitle: '', linkUrl: '', linkDesc: '' },
  autoTagEnabled: false,
  autoTags: [] as string[],
  channelTagEnabled: false
})

const form = reactive(defaultForm())

const step1Rules = {
  linkName: [{ required: true, message: '请输入链接名称', trigger: 'blur' }]
}

const assignModeText = computed(() => {
  const map: Record<string, string> = {
    weighted: '按权重轮流',
    online_random: '按在线随机',
    priority: '指定优先'
  }
  return map[form.assignMode] || form.assignMode
})

const totalWeight = computed(() => form.userWeights.reduce((s, m) => s + m.weight, 0))

const calcWeightPercent = (weight: number) => {
  return totalWeight.value > 0 ? Number(((weight / totalWeight.value) * 100).toFixed(1)) : 0
}

const insertVariable = (v: string) => {
  form.welcomeMsg += v
}

const confirmAddMembers = () => {
  for (const uid of selectedNewMembers.value) {
    if (!form.userWeights.some(w => w.userId === uid)) {
      form.userWeights.push({ userId: uid, weight: 5 })
    }
  }
  selectedNewMembers.value = []
  showMemberSelector.value = false
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    try {
      await step1Ref.value?.validate()
    } catch {
      return
    }
  }
  if (currentStep.value === 1 && form.userWeights.length === 0) {
    ElMessage.warning('请至少添加一名接待成员')
    return
  }
  currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const handleSubmit = () => {
  const submitData = {
    linkName: form.linkName,
    state: form.state,
    userIds: form.userWeights.map(u => u.userId),
    welcomeMsg: form.welcomeEnabled ? form.welcomeMsg : '',
    welcomeConfig: form.welcomeEnabled ? JSON.stringify({
      text: form.welcomeMsg,
      mediaType: form.welcomeMediaType,
      mediaContent: form.welcomeMediaContent
    }) : null,
    autoTags: form.autoTagEnabled ? JSON.stringify(form.autoTags) : null,
    autoGroupConfig: form.autoGroupEnabled ? JSON.stringify({
      enabled: true,
      templateId: form.groupTemplateId
    }) : null
  }
  emit('submit', submitData)
}

const handleClose = () => {
  visible.value = false
  currentStep.value = 0
  Object.assign(form, defaultForm())
}

// 编辑模式：填充数据
watch(() => props.editData, (data) => {
  if (data) {
    currentStep.value = 0
    form.linkName = data.linkName || ''
    form.state = data.state || ''
    form.welcomeMsg = data.welcomeMsg || ''
    form.welcomeEnabled = !!data.welcomeMsg
    try {
      const ids = JSON.parse(data.userIds || '[]')
      form.userWeights = ids.map((id: string) => ({ userId: id, weight: 5 }))
    } catch {
      form.userWeights = []
    }
    try {
      const tags = JSON.parse(data.autoTags || '[]')
      form.autoTags = tags
      form.autoTagEnabled = tags.length > 0
    } catch {
      form.autoTags = []
    }
  } else {
    Object.assign(form, defaultForm())
  }
}, { immediate: true })
</script>

<style scoped>
.step-content { min-height: 260px; padding: 8px 0; }
.form-tip { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.variable-tags { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.variable-label { font-size: 12px; color: #9CA3AF; }
.variable-tag:hover { background: #4C6EF5; color: #fff; }
.weight-preview { margin-top: 16px; padding: 16px; background: #F9FAFB; border-radius: 12px; }
.preview-title { font-weight: 600; font-size: 14px; margin-bottom: 12px; color: #1F2937; }
.preview-bars { display: flex; flex-direction: column; gap: 10px; }
.preview-item { display: flex; align-items: center; gap: 12px; }
.preview-name { width: 80px; font-size: 13px; text-align: right; flex-shrink: 0; color: #4B5563; }
.confirm-tip {
  display: flex; align-items: center; gap: 8px;
  margin-top: 20px; padding: 12px 16px;
  background: #FFFBEB; border-radius: 8px;
  color: #92400E; font-size: 13px;
}
.wizard-footer { display: flex; align-items: center; width: 100%; }
</style>


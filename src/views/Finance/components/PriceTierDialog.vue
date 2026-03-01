<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑价格档位' : '添加价格档位'"
    width="700px"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="110px">
      <el-form-item label="档位名称" prop="tierName">
        <el-input v-model="form.tierName" placeholder="如：标准档、节假日档" />
      </el-form-item>

      <el-form-item label="计价方式" prop="pricingType">
        <el-radio-group v-model="form.pricingType">
          <el-radio label="fixed">按单计价</el-radio>
          <el-radio label="percentage">按比例计价</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="form.pricingType === 'fixed'" label="固定单价" prop="unitPrice">
        <el-input-number
          v-model="form.unitPrice"
          :min="0"
          :precision="2"
          :step="10"
          style="width: 100%"
          placeholder="请输入单价"
        >
          <template #append>元/单</template>
        </el-input-number>
      </el-form-item>

      <el-form-item v-if="form.pricingType === 'percentage'" label="比例" prop="percentageRate">
        <el-input-number
          v-model="form.percentageRate"
          :min="0"
          :max="100"
          :precision="2"
          :step="0.1"
          style="width: 100%"
          placeholder="请输入比例"
        >
          <template #append>%</template>
        </el-input-number>
      </el-form-item>

      <el-form-item v-if="form.pricingType === 'percentage'" label="基数字段" prop="baseAmountField">
        <el-select v-model="form.baseAmountField" style="width: 100%">
          <el-option label="订单金额" value="orderAmount" />
          <el-option label="代收金额" value="codAmount" />
          <el-option label="商品金额" value="productAmount" />
        </el-select>
      </el-form-item>

      <el-form-item label="生效时间">
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-checkbox v-model="form.unlimitedTime" @change="handleUnlimitedChange">无限期</el-checkbox>
          <template v-if="!form.unlimitedTime">
            <el-date-picker
              v-model="form.startDate"
              type="date"
              placeholder="开始日期"
              value-format="YYYY-MM-DD"
              style="width: 160px;"
            />
            <span>~</span>
            <el-date-picker
              v-model="form.endDate"
              type="date"
              placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 160px;"
            />
          </template>
          <span v-else style="color: #909399; font-size: 13px;">
            该档位长期有效，不受时间限制
          </span>
        </div>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-input-number
          v-model="form.priority"
          :min="0"
          :max="999"
          style="width: 100%"
          placeholder="数字越大优先级越高"
        />
        <div style="color: #909399; font-size: 12px; margin-top: 4px;">
          当多个档位时间重叠时，优先使用优先级高的档位
        </div>
      </el-form-item>

      <el-form-item label="档位排序" prop="tierOrder">
        <el-input-number
          v-model="form.tierOrder"
          :min="1"
          :max="999"
          style="width: 100%"
          placeholder="用于列表显示排序"
        />
      </el-form-item>

      <el-form-item label="状态" prop="isActive">
        <el-radio-group v-model="form.isActive">
          <el-radio :label="1">启用</el-radio>
          <el-radio :label="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { PriceTier } from '@/api/valueAdded'

interface Props {
  visible: boolean
  companyId: string
  tier?: PriceTier | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  tierName: '',
  tierOrder: 1,
  pricingType: 'fixed' as 'fixed' | 'percentage',
  unitPrice: 0,
  percentageRate: 0,
  baseAmountField: 'orderAmount',
  startDate: '',
  endDate: '',
  unlimitedTime: false,
  isActive: 1,
  priority: 0,
  remark: ''
})

const rules: FormRules = {
  tierName: [{ required: true, message: '请输入档位名称', trigger: 'blur' }],
  pricingType: [{ required: true, message: '请选择计价方式', trigger: 'change' }],
  unitPrice: [
    {
      validator: (rule, value, callback) => {
        if (form.pricingType === 'fixed' && (!value || value <= 0)) {
          callback(new Error('请输入有效的单价'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  percentageRate: [
    {
      validator: (rule, value, callback) => {
        if (form.pricingType === 'percentage' && (!value || value <= 0)) {
          callback(new Error('请输入有效的比例'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const isEdit = ref(false)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    if (props.tier) {
      isEdit.value = true
      const hasTime = !!(props.tier.startDate || props.tier.endDate)
      Object.assign(form, {
        tierName: props.tier.tierName,
        tierOrder: props.tier.tierOrder,
        pricingType: props.tier.pricingType,
        unitPrice: props.tier.unitPrice,
        percentageRate: props.tier.percentageRate,
        baseAmountField: props.tier.baseAmountField,
        startDate: props.tier.startDate || '',
        endDate: props.tier.endDate || '',
        unlimitedTime: !hasTime,
        isActive: props.tier.isActive,
        priority: props.tier.priority,
        remark: props.tier.remark || ''
      })
    } else {
      isEdit.value = false
      resetForm()
    }
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const resetForm = () => {
  Object.assign(form, {
    tierName: '',
    tierOrder: 1,
    pricingType: 'fixed',
    unitPrice: 0,
    percentageRate: 0,
    baseAmountField: 'orderAmount',
    startDate: '',
    endDate: '',
    unlimitedTime: false,
    isActive: 1,
    priority: 0,
    remark: ''
  })
  formRef.value?.clearValidate()
}

// 无限期切换处理
const handleUnlimitedChange = (val: boolean) => {
  if (val) {
    // 勾选无限期时，清空日期
    form.startDate = ''
    form.endDate = ''
  }
}

const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const { createPriceTier, updatePriceTier } = await import('@/api/valueAdded')

    // 准备提交数据
    const submitData = { ...form }
    // 如果选择了无限期，清空日期
    if (form.unlimitedTime) {
      submitData.startDate = ''
      submitData.endDate = ''
    }

    if (isEdit.value && props.tier) {
      await updatePriceTier(props.companyId, props.tier.id, submitData)
      ElMessage.success('更新成功')
    } else {
      await createPriceTier(props.companyId, submitData)
      ElMessage.success('添加成功')
    }

    console.log('[PriceTierDialog] 保存成功，准备emit saved事件')
    emit('saved')
    console.log('[PriceTierDialog] saved事件已emit')
    handleClose()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
:deep(.el-input-number) {
  width: 100%;
}
</style>

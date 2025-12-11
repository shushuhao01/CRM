<template>
  <div class="order-settings-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>订单设置</h2>
      <p>配置订单字段和自定义字段</p>
    </div>

    <!-- 订单来源配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>订单来源配置</span>
          <el-button type="primary" size="small" @click="openOrderSourceDialog">
            编辑配置
          </el-button>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="字段名称">
          {{ localConfig.orderSourceFieldName }}
        </el-descriptions-item>
        <el-descriptions-item label="选项数量">
          {{ localConfig.orderSourceOptions.length }} 个
        </el-descriptions-item>
      </el-descriptions>

      <div class="options-preview">
        <h4>当前选项:</h4>
        <el-tag
          v-for="option in localConfig.orderSourceOptions"
          :key="option.value"
          style="margin: 5px"
        >
          {{ option.label }}
        </el-tag>
      </div>
    </el-card>

    <!-- 自定义字段管理 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>自定义字段管理</span>
          <el-button type="primary" size="small" :icon="Plus" @click="openAddFieldDialog">
            添加字段
          </el-button>
        </div>
      </template>

      <el-table :data="localConfig.customFields" style="width: 100%" v-if="localConfig.customFields.length > 0">
        <el-table-column prop="fieldName" label="字段名称" width="150" />
        <el-table-column prop="fieldKey" label="字段键名" width="150" />
        <el-table-column prop="fieldType" label="字段类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getFieldTypeColor(row.fieldType)" size="small">
              {{ getFieldTypeLabel(row.fieldType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="showInList" label="列表显示" width="100">
          <template #default="{ row }">
            <el-tag :type="row.showInList ? 'success' : 'info'" size="small">
              {{ row.showInList ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位符" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row, $index }">
            <el-button size="small" type="primary" link @click="openEditFieldDialog(row, $index)">
              编辑
            </el-button>
            <el-button size="small" link @click="moveFieldUp($index)" :disabled="$index === 0">
              上移
            </el-button>
            <el-button size="small" link @click="moveFieldDown($index)" :disabled="$index === (localConfig.customFields.length - 1)">
              下移
            </el-button>
            <el-button size="small" type="danger" link @click="deleteField($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无自定义字段，点击上方【添加字段】按钮开始配置" />
    </el-card>

    <!-- 订单流转时间配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>订单流转时间配置</span>
          <el-tag type="warning" size="small">全局生效</el-tag>
        </div>
      </template>

      <el-form label-width="140px">
        <el-form-item label="流转模式">
          <el-radio-group v-model="transferConfig.mode" @change="handleTransferModeChange">
            <el-radio label="immediate">无等待（立即流转）</el-radio>
            <el-radio label="delayed">延迟流转</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="流转等待时间" v-if="transferConfig.mode === 'delayed'">
          <el-input-number
            v-model="transferConfig.delayMinutes"
            :min="1"
            :max="1440"
            :step="1"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #666;">分钟</span>
          <div class="form-tip">
            订单创建后，将在设定时间后自动流转到审核。范围：1-1440分钟（最长24小时）
          </div>
        </el-form-item>

        <el-form-item label="当前配置预览">
          <el-tag :type="transferConfig.mode === 'immediate' ? 'success' : 'warning'" size="large">
            {{ transferConfig.mode === 'immediate' ? '订单创建后立即流转到审核' : `订单创建后 ${transferConfig.delayMinutes} 分钟后流转到审核` }}
          </el-tag>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveTransferConfig" :loading="savingTransfer">
            保存流转配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 支付方式配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>支付方式配置</span>
          <el-button type="primary" size="small" :icon="Plus" @click="openAddPaymentMethodDialog">
            添加支付方式
          </el-button>
        </div>
      </template>

      <el-table :data="paymentMethods" style="width: 100%" v-loading="loadingPaymentMethods" v-if="paymentMethods.length > 0" row-key="id">
        <el-table-column width="50" align="center">
          <template #default>
            <el-icon class="drag-handle" style="cursor: move; color: #999;"><Rank /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="支付方式名称" width="200" />
        <el-table-column prop="value" label="选项值" width="150" />
        <el-table-column prop="sortOrder" label="排序" width="100" />
        <el-table-column label="启用" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              @change="togglePaymentMethod(row)"
              :loading="row.toggling"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="editPaymentMethod(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="deletePaymentMethod(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="drag-tip" v-if="paymentMethods.length > 0">
        <el-icon><InfoFilled /></el-icon>
        <span>拖拽左侧图标可调整排序，排序变更后自动保存</span>
      </div>
      <el-empty v-else description="暂无支付方式配置，点击上方【添加支付方式】按钮开始配置" />
    </el-card>

    <!-- 支付方式编辑对话框 -->
    <el-dialog
      v-model="paymentMethodDialogVisible"
      :title="isEditingPaymentMethod ? '编辑支付方式' : '添加支付方式'"
      width="500px"
    >
      <el-form :model="paymentMethodForm" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="paymentMethodForm.label" placeholder="请输入支付方式名称" />
        </el-form-item>
        <el-form-item label="选项值" required>
          <el-input v-model="paymentMethodForm.value" placeholder="请输入选项值（英文）" :disabled="isEditingPaymentMethod" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="paymentMethodForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentMethodDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePaymentMethod" :loading="savingPaymentMethod">保存</el-button>
      </template>
    </el-dialog>

    <!-- 部门下单限制配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>部门下单限制配置</span>
          <el-tag type="danger" size="small">全局生效</el-tag>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #title>
          配置说明：可针对不同部门设置同一客户的下单次数、单笔金额、累计金额限制。配置后，该部门成员创建订单时将自动验证限制条件。
        </template>
      </el-alert>

      <!-- 部门选择 -->
      <el-form label-width="140px">
        <el-form-item label="选择部门">
          <el-select
            v-model="selectedDepartmentId"
            placeholder="请选择要配置的部门"
            style="width: 300px"
            @change="loadDepartmentLimit"
            clearable
          >
            <el-option
              v-for="dept in departmentList"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
          <el-button
            type="primary"
            :icon="Plus"
            style="margin-left: 10px;"
            @click="addDepartmentLimit"
            :disabled="!selectedDepartmentId"
          >
            添加/编辑配置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 已配置的部门列表 -->
      <el-table :data="departmentLimits" style="width: 100%" v-if="departmentLimits.length > 0">
        <el-table-column prop="departmentName" label="部门名称" width="150" />
        <el-table-column label="下单次数限制" width="180">
          <template #default="{ row }">
            <el-tag v-if="row.orderCountEnabled" type="warning" size="small">
              最多{{ row.maxOrderCount }}次
            </el-tag>
            <el-tag v-else type="info" size="small">无限制</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="单笔金额限制" width="180">
          <template #default="{ row }">
            <el-tag v-if="row.singleAmountEnabled" type="warning" size="small">
              最高¥{{ row.maxSingleAmount }}
            </el-tag>
            <el-tag v-else type="info" size="small">无限制</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="累计金额限制" width="180">
          <template #default="{ row }">
            <el-tag v-if="row.totalAmountEnabled" type="warning" size="small">
              最高¥{{ row.maxTotalAmount }}
            </el-tag>
            <el-tag v-else type="info" size="small">无限制</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">
              {{ row.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="editDepartmentLimit(row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" link @click="deleteDepartmentLimit(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无部门下单限制配置" />
    </el-card>

    <!-- 部门下单限制编辑对话框 -->
    <el-dialog
      v-model="departmentLimitDialogVisible"
      title="部门下单限制配置"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="departmentLimitForm" label-width="140px">
        <el-form-item label="部门">
          <el-tag size="large">{{ departmentLimitForm.departmentName }}</el-tag>
        </el-form-item>

        <el-divider content-position="left">下单次数限制</el-divider>
        <el-form-item label="启用限制">
          <el-switch v-model="departmentLimitForm.orderCountEnabled" />
        </el-form-item>
        <el-form-item label="最大下单次数" v-if="departmentLimitForm.orderCountEnabled">
          <el-input-number
            v-model="departmentLimitForm.maxOrderCount"
            :min="1"
            :max="100"
          />
          <span style="margin-left: 10px; color: #666;">次（同一客户在该部门最多下单次数）</span>
        </el-form-item>

        <el-divider content-position="left">单笔金额限制</el-divider>
        <el-form-item label="启用限制">
          <el-switch v-model="departmentLimitForm.singleAmountEnabled" />
        </el-form-item>
        <el-form-item label="单笔最大金额" v-if="departmentLimitForm.singleAmountEnabled">
          <el-input-number
            v-model="departmentLimitForm.maxSingleAmount"
            :min="1"
            :max="9999999"
            :precision="2"
          />
          <span style="margin-left: 10px; color: #666;">元</span>
        </el-form-item>

        <el-divider content-position="left">累计金额限制</el-divider>
        <el-form-item label="启用限制">
          <el-switch v-model="departmentLimitForm.totalAmountEnabled" />
        </el-form-item>
        <el-form-item label="累计最大金额" v-if="departmentLimitForm.totalAmountEnabled">
          <el-input-number
            v-model="departmentLimitForm.maxTotalAmount"
            :min="1"
            :max="99999999"
            :precision="2"
          />
          <span style="margin-left: 10px; color: #666;">元（同一客户在该部门累计订单金额）</span>
        </el-form-item>

        <el-divider />
        <el-form-item label="启用配置">
          <el-switch v-model="departmentLimitForm.isEnabled" />
          <span style="margin-left: 10px; color: #999;">关闭后该部门不受限制</span>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="departmentLimitForm.remark"
            type="textarea"
            :rows="2"
            placeholder="可选，填写配置说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="departmentLimitDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDepartmentLimit" :loading="savingDepartmentLimit">
          保存配置
        </el-button>
      </template>
    </el-dialog>

    <!-- 保存按钮 -->
    <div class="save-actions">
      <el-button size="large" @click="resetConfig">重置配置</el-button>
      <el-button type="primary" size="large" @click="saveConfig" :loading="saving">
        保存配置
      </el-button>
    </div>

    <!-- 订单来源编辑对话框 -->
    <el-dialog
      v-model="orderSourceDialogVisible"
      title="编辑订单来源配置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="orderSourceForm" label-width="100px">
        <el-form-item label="字段名称" required>
          <el-input v-model="orderSourceForm.fieldName" placeholder="请输入字段名称，如：订单来源、订单渠道" />
        </el-form-item>
        <el-form-item label="选项配置" required>
          <div class="options-editor">
            <div
              v-for="(option, index) in orderSourceForm.options"
              :key="index"
              class="option-item"
            >
              <el-input
                v-model="option.label"
                placeholder="选项名称，如：线上商城"
                style="width: 200px"
              />
              <el-input
                v-model="option.value"
                placeholder="选项值，如：online"
                style="width: 200px"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeSourceOption(index)"
                :disabled="orderSourceForm.options.length <= 1"
              />
            </div>
            <el-button type="primary" size="small" :icon="Plus" @click="addSourceOption">
              添加选项
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="orderSourceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveOrderSource">确定</el-button>
      </template>
    </el-dialog>

    <!-- 自定义字段编辑对话框 -->
    <el-dialog
      v-model="customFieldDialogVisible"
      :title="isEditingField ? '编辑自定义字段' : '添加自定义字段'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="customFieldFormRef"
        :model="customFieldForm"
        :rules="customFieldRules"
        label-width="100px"
      >
        <el-form-item label="字段名称" prop="fieldName">
          <el-input v-model="customFieldForm.fieldName" placeholder="请输入字段名称，如：客户等级" />
        </el-form-item>
        <el-form-item label="字段键名" prop="fieldKey">
          <el-select
            v-model="customFieldForm.fieldKey"
            placeholder="请选择字段键名"
            style="width: 100%"
            :disabled="isEditingField"
          >
            <el-option
              v-for="key in availableFieldKeys"
              :key="key.value"
              :label="key.label"
              :value="key.value"
              :disabled="key.disabled"
            />
          </el-select>
          <div class="form-tip">字段键名用于数据存储，每个键名只能使用一次</div>
        </el-form-item>
        <el-form-item label="字段类型" prop="fieldType">
          <el-select
            v-model="customFieldForm.fieldType"
            placeholder="请选择字段类型"
            style="width: 100%"
            :disabled="isEditingField"
          >
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="日期时间" value="datetime" />
            <el-option label="下拉选择" value="select" />
            <el-option label="单选" value="radio" />
            <el-option label="多选" value="checkbox" />
          </el-select>
        </el-form-item>
        <el-form-item label="必填" prop="required">
          <el-switch v-model="customFieldForm.required" />
        </el-form-item>
        <el-form-item label="占位符" prop="placeholder">
          <el-input v-model="customFieldForm.placeholder" placeholder="请输入占位符提示文本" />
        </el-form-item>
        <el-form-item label="列表显示" prop="showInList">
          <el-switch v-model="customFieldForm.showInList" />
          <div class="form-tip">开启后，该字段将在订单列表中显示</div>
        </el-form-item>
        <el-form-item
          label="选项配置"
          v-if="['select', 'radio', 'checkbox'].includes(customFieldForm.fieldType)"
          required
        >
          <div class="options-editor">
            <div
              v-for="(option, index) in customFieldForm.options"
              :key="index"
              class="option-item"
            >
              <el-input
                v-model="option.label"
                placeholder="选项名称"
                style="width: 200px"
              />
              <el-input
                v-model="option.value"
                placeholder="选项值"
                style="width: 200px"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeFieldOption(index)"
                :disabled="customFieldForm.options.length <= 1"
              />
            </div>
            <el-button type="primary" size="small" :icon="Plus" @click="addFieldOption">
              添加选项
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="customFieldDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomField">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Rank, InfoFilled } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'

const fieldConfigStore = useOrderFieldConfigStore()

// 预设的7个自定义字段键名
const PRESET_FIELD_KEYS = [
  { value: 'custom_field1', label: 'custom_field1 (自定义字段1)' },
  { value: 'custom_field2', label: 'custom_field2 (自定义字段2)' },
  { value: 'custom_field3', label: 'custom_field3 (自定义字段3)' },
  { value: 'custom_field4', label: 'custom_field4 (自定义字段4)' },
  { value: 'custom_field5', label: 'custom_field5 (自定义字段5)' },
  { value: 'custom_field6', label: 'custom_field6 (自定义字段6)' },
  { value: 'custom_field7', label: 'custom_field7 (自定义字段7)' }
]

// 计算可用的字段键名（排除已使用的）
const availableFieldKeys = computed(() => {
  const usedKeys = localConfig.customFields.map(f => f.fieldKey)
  return PRESET_FIELD_KEYS.map(key => ({
    ...key,
    disabled: usedKeys.includes(key.value) && key.value !== customFieldForm.fieldKey
  }))
})

// 本地配置（用于编辑）
const localConfig = reactive({
  orderSourceFieldName: '',
  orderSourceOptions: [] as Array<{ label: string; value: string }>,
  customFields: [] as Array<any>
})

// 流转时间配置
const transferConfig = reactive({
  mode: 'delayed' as 'immediate' | 'delayed',
  delayMinutes: 3
})
const savingTransfer = ref(false)

// 支付方式配置
const paymentMethods = ref<any[]>([])
const loadingPaymentMethods = ref(false)
const paymentMethodDialogVisible = ref(false)
const isEditingPaymentMethod = ref(false)
const savingPaymentMethod = ref(false)
const editingPaymentMethodId = ref('')
const isPaymentMethodsLoaded = ref(false) // 标志位：防止加载时触发change事件
const paymentMethodForm = reactive({
  label: '',
  value: '',
  sortOrder: 0
})

// 加载支付方式列表
const loadPaymentMethods = async () => {
  try {
    isPaymentMethodsLoaded.value = false // 开始加载，禁用change事件
    loadingPaymentMethods.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/payment-methods/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success && result.data) {
      // 🔥 关键修复：将isEnabled转换为布尔值（数据库返回的可能是0/1）
      paymentMethods.value = result.data.map((item: any) => ({
        ...item,
        isEnabled: Boolean(item.isEnabled) || item.isEnabled === 1 || item.isEnabled === '1'
      }))
      console.log('[支付方式] 加载成功，共', paymentMethods.value.length, '个')
    }
  } catch (error) {
    console.error('加载支付方式失败:', error)
  } finally {
    loadingPaymentMethods.value = false
    // 延迟设置标志位，确保数据渲染完成后再启用change事件
    setTimeout(() => {
      isPaymentMethodsLoaded.value = true
    }, 100)
  }
}

// 打开添加支付方式对话框
const openAddPaymentMethodDialog = () => {
  isEditingPaymentMethod.value = false
  editingPaymentMethodId.value = ''
  paymentMethodForm.label = ''
  paymentMethodForm.value = ''
  paymentMethodForm.sortOrder = paymentMethods.value.length + 1
  paymentMethodDialogVisible.value = true
}

// 编辑支付方式
const editPaymentMethod = (row: any) => {
  isEditingPaymentMethod.value = true
  editingPaymentMethodId.value = row.id
  paymentMethodForm.label = row.label
  paymentMethodForm.value = row.value
  paymentMethodForm.sortOrder = row.sortOrder
  paymentMethodDialogVisible.value = true
}

// 保存支付方式
const savePaymentMethod = async () => {
  if (!paymentMethodForm.label || !paymentMethodForm.value) {
    ElMessage.warning('请填写完整信息')
    return
  }
  try {
    savingPaymentMethod.value = true
    const token = localStorage.getItem('auth_token')
    const url = isEditingPaymentMethod.value
      ? `/api/v1/system/payment-methods/${editingPaymentMethodId.value}`
      : '/api/v1/system/payment-methods'
    const method = isEditingPaymentMethod.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentMethodForm)
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(isEditingPaymentMethod.value ? '支付方式更新成功' : '支付方式添加成功')
      paymentMethodDialogVisible.value = false
      loadPaymentMethods()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('保存支付方式失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingPaymentMethod.value = false
  }
}

// 切换支付方式状态
const togglePaymentMethod = async (row: any) => {
  // 如果数据还没加载完成，不触发API调用
  if (!isPaymentMethodsLoaded.value) {
    return
  }
  try {
    row.toggling = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/v1/system/payment-methods/${row.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isEnabled: row.isEnabled })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
    } else {
      // 恢复原状态
      row.isEnabled = !row.isEnabled
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    console.error('切换状态失败:', error)
    // 恢复原状态
    row.isEnabled = !row.isEnabled
    ElMessage.error('切换状态失败')
  } finally {
    row.toggling = false
  }
}

// 删除支付方式
const deletePaymentMethod = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该支付方式吗？', '确认删除', { type: 'warning' })
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/v1/system/payment-methods/${row.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('删除成功')
      loadPaymentMethods()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// 处理流转模式变化
const handleTransferModeChange = (mode: string) => {
  if (mode === 'immediate') {
    transferConfig.delayMinutes = 0
  } else {
    transferConfig.delayMinutes = 3
  }
}

// 加载流转配置
const loadTransferConfig = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/order-transfer-config', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const result = await response.json()
    if (result.success && result.data) {
      transferConfig.mode = result.data.mode || 'delayed'
      transferConfig.delayMinutes = result.data.delayMinutes ?? 3
    }
  } catch (error) {
    console.error('加载流转配置失败:', error)
  }
}

// 保存流转配置
const saveTransferConfig = async () => {
  try {
    savingTransfer.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/order-transfer-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mode: transferConfig.mode,
        delayMinutes: transferConfig.mode === 'immediate' ? 0 : transferConfig.delayMinutes
      })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('流转配置保存成功，已全局生效')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存流转配置失败:', error)
    ElMessage.error('保存流转配置失败')
  } finally {
    savingTransfer.value = false
  }
}

// 对话框状态
const orderSourceDialogVisible = ref(false)
const customFieldDialogVisible = ref(false)
const isEditingField = ref(false)
const editingFieldIndex = ref(-1)
const saving = ref(false)

// 表单引用
const customFieldFormRef = ref()

// 订单来源表单
const orderSourceForm = reactive({
  fieldName: '',
  options: [] as Array<{ label: string; value: string }>
})

// 自定义字段表单
const customFieldForm = reactive({
  fieldName: '',
  fieldKey: '',
  fieldType: 'text',
  required: false,
  placeholder: '',
  showInList: true,
  options: [] as Array<{ label: string; value: string }>
})

// 表单验证规则
const customFieldRules = {
  fieldName: [
    { required: true, message: '请输入字段名称', trigger: 'blur' }
  ],
  fieldKey: [
    { required: true, message: '请输入字段键名', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '字段键名必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur'
    }
  ],
  fieldType: [
    { required: true, message: '请选择字段类型', trigger: 'change' }
  ]
}

// 字段类型标签颜色
const getFieldTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    text: 'primary',
    number: 'success',
    date: 'warning',
    datetime: 'warning',
    select: 'info',
    radio: 'danger',
    checkbox: 'danger'
  }
  return colors[type] || 'primary'
}

// 字段类型标签文本
const getFieldTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    datetime: '日期时间',
    select: '下拉选择',
    radio: '单选',
    checkbox: '多选'
  }
  return labels[type] || type
}

// 初始化本地配置
const initLocalConfig = () => {
  localConfig.orderSourceFieldName = fieldConfigStore.orderSourceFieldName
  localConfig.orderSourceOptions = JSON.parse(JSON.stringify(fieldConfigStore.orderSourceOptions))
  localConfig.customFields = JSON.parse(JSON.stringify(fieldConfigStore.customFields))
}

// 打开订单来源编辑对话框
const openOrderSourceDialog = () => {
  orderSourceForm.fieldName = localConfig.orderSourceFieldName
  orderSourceForm.options = JSON.parse(JSON.stringify(localConfig.orderSourceOptions))
  orderSourceDialogVisible.value = true
}

// 保存订单来源配置
const saveOrderSource = () => {
  if (!orderSourceForm.fieldName.trim()) {
    ElMessage.warning('请输入字段名称')
    return
  }
  if (orderSourceForm.options.length === 0) {
    ElMessage.warning('请至少添加一个选项')
    return
  }

  // 验证选项
  for (const option of orderSourceForm.options) {
    if (!option.label.trim() || !option.value.trim()) {
      ElMessage.warning('请填写完整的选项信息')
      return
    }
  }

  localConfig.orderSourceFieldName = orderSourceForm.fieldName
  localConfig.orderSourceOptions = JSON.parse(JSON.stringify(orderSourceForm.options))
  orderSourceDialogVisible.value = false
  ElMessage.success('订单来源配置已更新，请点击"保存配置"按钮保存')
}

// 添加订单来源选项
const addSourceOption = () => {
  orderSourceForm.options.push({ label: '', value: '' })
}

// 删除订单来源选项
const removeSourceOption = (index: number) => {
  orderSourceForm.options.splice(index, 1)
}

// 打开添加字段对话框
const openAddFieldDialog = () => {
  isEditingField.value = false
  editingFieldIndex.value = -1
  Object.assign(customFieldForm, {
    fieldName: '',
    fieldKey: '',
    fieldType: 'text',
    required: false,
    placeholder: '',
    showInList: true,
    options: []
  })
  customFieldDialogVisible.value = true
}

// 打开编辑字段对话框
const openEditFieldDialog = (field: any, index: number) => {
  isEditingField.value = true
  editingFieldIndex.value = index
  Object.assign(customFieldForm, {
    fieldName: field.fieldName,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder || '',
    showInList: field.showInList,
    options: field.options ? JSON.parse(JSON.stringify(field.options)) : []
  })
  customFieldDialogVisible.value = true
}

// 保存自定义字段
const saveCustomField = async () => {
  try {
    await customFieldFormRef.value?.validate()

    // 检查字段键名是否重复（新增时）
    if (!isEditingField.value) {
      const exists = localConfig.customFields.some(f => f.fieldKey === customFieldForm.fieldKey)
      if (exists) {
        ElMessage.warning('字段键名已存在，请使用其他键名')
        return
      }
    }

    // 检查选项配置（如果需要）
    if (['select', 'radio', 'checkbox'].includes(customFieldForm.fieldType)) {
      if (customFieldForm.options.length === 0) {
        ElMessage.warning('请至少添加一个选项')
        return
      }
      for (const option of customFieldForm.options) {
        if (!option.label.trim() || !option.value.trim()) {
          ElMessage.warning('请填写完整的选项信息')
          return
        }
      }
    }

    if (isEditingField.value) {
      // 更新字段
      const field = localConfig.customFields[editingFieldIndex.value]
      field.fieldName = customFieldForm.fieldName
      field.required = customFieldForm.required
      field.placeholder = customFieldForm.placeholder
      field.showInList = customFieldForm.showInList
      if (customFieldForm.options.length > 0) {
        field.options = JSON.parse(JSON.stringify(customFieldForm.options))
      }
      ElMessage.success('字段已更新，请点击"保存配置"按钮保存')
    } else {
      // 添加字段
      const newField = {
        id: 'field_' + Date.now(),
        fieldName: customFieldForm.fieldName,
        fieldKey: customFieldForm.fieldKey,
        fieldType: customFieldForm.fieldType,
        required: customFieldForm.required,
        placeholder: customFieldForm.placeholder,
        showInList: customFieldForm.showInList,
        sortOrder: localConfig.customFields.length,
        options: customFieldForm.options.length > 0 ? JSON.parse(JSON.stringify(customFieldForm.options)) : undefined
      }
      localConfig.customFields.push(newField)
      ElMessage.success('字段已添加，请点击"保存配置"按钮保存')
    }

    customFieldDialogVisible.value = false
  } catch (error) {
    console.error('保存字段失败:', error)
  }
}

// 删除字段
const deleteField = async (index: number) => {
  try {
    const field = localConfig.customFields[index]
    await ElMessageBox.confirm(
      `确定要删除字段"${field.fieldName}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    localConfig.customFields.splice(index, 1)
    // 重新排序
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已删除，请点击"保存配置"按钮保存')
  } catch {
    // 用户取消删除
  }
}

// 上移字段
const moveFieldUp = (index: number) => {
  if (index > 0) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index - 1]
    localConfig.customFields[index - 1] = temp
    // 更新sortOrder
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已上移，请点击"保存配置"按钮保存')
  }
}

// 下移字段
const moveFieldDown = (index: number) => {
  if (index < localConfig.customFields.length - 1) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index + 1]
    localConfig.customFields[index + 1] = temp
    // 更新sortOrder
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已下移，请点击"保存配置"按钮保存')
  }
}

// 添加字段选项
const addFieldOption = () => {
  customFieldForm.options.push({ label: '', value: '' })
}

// 删除字段选项
const removeFieldOption = (index: number) => {
  customFieldForm.options.splice(index, 1)
}

// 保存配置 - 直接调用API保存到数据库，确保全局生效
const saveConfig = async () => {
  try {
    saving.value = true

    // 验证配置
    if (!localConfig.orderSourceFieldName.trim()) {
      ElMessage.warning('请配置订单来源字段名称')
      return
    }
    if (localConfig.orderSourceOptions.length === 0) {
      ElMessage.warning('请至少添加一个订单来源选项')
      return
    }

    // 🔥 直接调用API保存到数据库，确保持久化
    const token = localStorage.getItem('auth_token')
    const configData = {
      orderSource: {
        fieldName: localConfig.orderSourceFieldName,
        options: localConfig.orderSourceOptions
      },
      customFields: localConfig.customFields.map((field, index) => ({
        ...field,
        id: field.id || `field_${Date.now()}_${index}`,
        sortOrder: index
      }))
    }

    console.log('[订单设置] 保存配置到数据库:', configData)

    const response = await fetch('/api/v1/system/order-field-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(configData)
    })

    const result = await response.json()
    if (result.success) {
      // 同步更新store
      fieldConfigStore.config.orderSource.fieldName = localConfig.orderSourceFieldName
      fieldConfigStore.config.orderSource.options = [...localConfig.orderSourceOptions]
      fieldConfigStore.config.customFields = [...localConfig.customFields]

      ElMessage.success('配置保存成功，已全局生效（所有用户可见）')
    } else {
      ElMessage.error(result.message || '保存配置失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败，请检查网络连接')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置配置吗？将恢复到当前保存的配置。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    initLocalConfig()
    ElMessage.success('配置已重置')
  } catch {
    // 用户取消
  }
}

// ========== 部门下单限制配置 ==========

interface DepartmentLimit {
  id?: string
  departmentId: string
  departmentName: string
  orderCountEnabled: boolean
  maxOrderCount: number
  singleAmountEnabled: boolean
  maxSingleAmount: number
  totalAmountEnabled: boolean
  maxTotalAmount: number
  isEnabled: boolean
  remark?: string
}

interface Department {
  id: string
  name: string
}

const departmentList = ref<Department[]>([])
const departmentLimits = ref<DepartmentLimit[]>([])
const selectedDepartmentId = ref('')
const departmentLimitDialogVisible = ref(false)
const savingDepartmentLimit = ref(false)

const departmentLimitForm = reactive<DepartmentLimit>({
  departmentId: '',
  departmentName: '',
  orderCountEnabled: false,
  maxOrderCount: 1,
  singleAmountEnabled: false,
  maxSingleAmount: 10000,
  totalAmountEnabled: false,
  maxTotalAmount: 50000,
  isEnabled: true,
  remark: ''
})

// 加载部门列表
const loadDepartmentList = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/departments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success && result.data) {
      departmentList.value = result.data
      console.log('[订单设置] 加载部门列表成功:', departmentList.value.length, '个部门')
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

// 加载所有部门下单限制配置
const loadDepartmentLimits = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/department-order-limits', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success && result.data) {
      departmentLimits.value = result.data
    }
  } catch (error) {
    console.error('加载部门下单限制配置失败:', error)
  }
}

// 加载指定部门的限制配置
const loadDepartmentLimit = async (departmentId: string) => {
  if (!departmentId) return

  const existing = departmentLimits.value.find(l => l.departmentId === departmentId)
  if (existing) {
    Object.assign(departmentLimitForm, existing)
  }
}

// 添加部门限制配置
const addDepartmentLimit = () => {
  if (!selectedDepartmentId.value) {
    ElMessage.warning('请先选择部门')
    return
  }

  const dept = departmentList.value.find(d => d.id === selectedDepartmentId.value)
  if (!dept) return

  // 检查是否已存在配置
  const existing = departmentLimits.value.find(l => l.departmentId === selectedDepartmentId.value)
  if (existing) {
    Object.assign(departmentLimitForm, existing)
  } else {
    // 重置表单
    departmentLimitForm.departmentId = dept.id
    departmentLimitForm.departmentName = dept.name
    departmentLimitForm.orderCountEnabled = false
    departmentLimitForm.maxOrderCount = 1
    departmentLimitForm.singleAmountEnabled = false
    departmentLimitForm.maxSingleAmount = 10000
    departmentLimitForm.totalAmountEnabled = false
    departmentLimitForm.maxTotalAmount = 50000
    departmentLimitForm.isEnabled = true
    departmentLimitForm.remark = ''
  }

  departmentLimitDialogVisible.value = true
}

// 编辑部门限制配置
const editDepartmentLimit = (row: DepartmentLimit) => {
  Object.assign(departmentLimitForm, row)
  departmentLimitDialogVisible.value = true
}

// 保存部门限制配置
const saveDepartmentLimit = async () => {
  try {
    savingDepartmentLimit.value = true
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/department-order-limits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(departmentLimitForm)
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('部门下单限制配置保存成功')
      departmentLimitDialogVisible.value = false
      await loadDepartmentLimits()
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存部门下单限制配置失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingDepartmentLimit.value = false
  }
}

// 删除部门限制配置
const deleteDepartmentLimit = async (row: DepartmentLimit) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除部门"${row.departmentName}"的下单限制配置吗？`,
      '确认删除',
      { type: 'warning' }
    )

    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/v1/system/department-order-limits/${row.departmentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('删除成功')
      await loadDepartmentLimits()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除部门下单限制配置失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 初始化支付方式表格拖拽排序
const initPaymentMethodSortable = () => {
  setTimeout(() => {
    const tableEl = document.querySelector('.config-card .el-table__body-wrapper tbody')
    if (tableEl) {
      Sortable.create(tableEl as HTMLElement, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: async (evt: any) => {
          const { oldIndex, newIndex } = evt
          if (oldIndex !== newIndex) {
            const movedItem = paymentMethods.value.splice(oldIndex, 1)[0]
            paymentMethods.value.splice(newIndex, 0, movedItem)
            // 更新排序值
            paymentMethods.value.forEach((item, index) => {
              item.sortOrder = index + 1
            })
            // 保存排序到后端
            await savePaymentMethodsOrder()
          }
        }
      })
    }
  }, 500)
}

// 保存支付方式排序
const savePaymentMethodsOrder = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    for (const item of paymentMethods.value) {
      await fetch(`/api/v1/system/payment-methods/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sortOrder: item.sortOrder })
      })
    }
    ElMessage.success('排序已保存')
  } catch (error) {
    console.error('保存排序失败:', error)
    ElMessage.error('保存排序失败')
  }
}

// 初始化
onMounted(async () => {
  // 🔥 先等待store从数据库加载配置
  await fieldConfigStore.loadConfig()

  // 然后初始化本地配置
  initLocalConfig()

  // 加载其他配置
  loadTransferConfig()
  loadDepartmentList()
  loadDepartmentLimits()
  await loadPaymentMethods()
  initPaymentMethodSortable()

  console.log('[订单设置] 页面初始化完成，自定义字段数量:', localConfig.customFields.length)
})
</script>

<style scoped>
.order-settings-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #000;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.options-preview {
  margin-top: 16px;
}

.options-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.options-editor {
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 0;
}

.drag-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 12px;
  color: #409eff;
}

.drag-handle {
  cursor: move;
  color: #999;
}

.drag-handle:hover {
  color: #409eff;
}
</style>

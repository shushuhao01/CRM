<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>扩容价格配置</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增配置
          </el-button>
        </div>
      </template>

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" @tab-change="fetchData">
        <el-tab-pane label="👥 用户数扩容" name="user" />
        <el-tab-pane label="💾 存储空间扩容" name="storage" />
        <el-tab-pane label="🟢 在线席位扩容" name="online_seat" />
      </el-tabs>

      <!-- 数据表格 -->
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeTagColor(row.type)">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="billing_cycle" label="计费周期" width="130">
          <template #default="{ row }">
            {{ billingCycleLabel(row.billing_cycle) }}
          </template>
        </el-table-column>
        <el-table-column prop="unit_price" label="单价" width="160">
          <template #default="{ row }">
            <span class="price">¥{{ Number(row.unit_price).toFixed(2) }}</span>
            <span class="price-unit">/{{ unitLabel(row.type) }}/{{ cycleUnit(row.billing_cycle) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="min_qty" label="最小购买量" width="110" />
        <el-table-column prop="max_qty" label="最大购买量" width="110" />
        <el-table-column prop="discount_rules" label="折扣规则" width="200">
          <template #default="{ row }">
            <template v-if="row.discount_rules && row.discount_rules.length > 0">
              <el-tag v-for="(r, i) in row.discount_rules" :key="i" size="small" style="margin: 2px;" type="warning">
                ≥{{ r.min_qty }}{{ unitLabel(row.type) }} 打{{ (100 - r.discount_percent) / 10 }}折
              </el-tag>
            </template>
            <span v-else style="color: #c0c4cc; font-size: 12px;">无折扣</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="is_active" label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="!!row.is_active"
              @change="(val: boolean) => handleToggle(row, val)"
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该配置？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑配置' : '新增配置'" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="扩容类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="user">用户数</el-radio>
            <el-radio label="storage">存储空间</el-radio>
            <el-radio label="online_seat">在线席位</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="计费周期" prop="billing_cycle">
          <el-select v-model="form.billing_cycle" style="width: 100%">
            <el-option label="按月" value="monthly" />
            <el-option label="按年" value="yearly" />
            <el-option label="永久" value="permanent" />
            <el-option label="跟随套餐" value="follow_package" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价" prop="unit_price">
          <el-input-number v-model="form.unit_price" :min="0.01" :precision="2" :step="10" style="width: 100%" />
          <div class="form-tip">每{{ unitLabel(form.type) }}{{ cycleUnit(form.billing_cycle) }}的价格</div>
        </el-form-item>
        <el-form-item label="最小购买量" prop="min_qty">
          <el-input-number v-model="form.min_qty" :min="1" :max="form.max_qty" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最大购买量" prop="max_qty">
          <el-input-number v-model="form.max_qty" :min="form.min_qty" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="价格说明" />
        </el-form-item>
        <!-- 折扣规则 -->
        <el-form-item label="折扣规则">
          <div class="discount-rules">
            <div v-for="(rule, idx) in form.discount_rules" :key="idx" class="discount-rule-row">
              <span>≥</span>
              <el-input-number v-model="rule.min_qty" :min="1" :max="9999" size="small" style="width: 100px;" />
              <span>{{ unitLabel(form.type) }}时优惠</span>
              <el-input-number v-model="rule.discount_percent" :min="1" :max="99" :precision="0" size="small" style="width: 80px;" />
              <span>%</span>
              <el-button link type="danger" @click="form.discount_rules.splice(idx, 1)" size="small">删除</el-button>
            </div>
            <el-button link type="primary" @click="form.discount_rules.push({ min_qty: 10, discount_percent: 10 })" size="small">
              + 添加折扣梯度
            </el-button>
          </div>
          <div class="form-tip">例：购买≥10席位优惠10%，则实付原价90%</div>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/api/request'

const loading = ref(false)
const saving = ref(false)
const tableData = ref<any[]>([])
const activeTab = ref('user')
const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref()

const form = reactive({
  type: 'user' as 'user' | 'storage' | 'online_seat',
  billing_cycle: 'monthly' as string,
  unit_price: 50,
  min_qty: 1,
  max_qty: 100,
  description: '',
  is_active: true,
  discount_rules: [] as Array<{ min_qty: number; discount_percent: number }>
})

const typeTagColor = (type: string) => {
  return { user: '', storage: 'success', online_seat: 'warning' }[type] || 'info'
}

const typeLabel = (type: string) => {
  return { user: '用户数', storage: '存储空间', online_seat: '在线席位' }[type] || type
}

const unitLabel = (type: string) => {
  return { user: '人', storage: 'GB', online_seat: '席位' }[type] || '个'
}

const formRules = {
  type: [{ required: true, message: '请选择类型' }],
  billing_cycle: [{ required: true, message: '请选择计费周期' }],
  unit_price: [{ required: true, message: '请输入单价' }]
}

const billingCycleLabel = (cycle: string) => {
  return { monthly: '按月', yearly: '按年', permanent: '永久', follow_package: '跟随套餐' }[cycle] || cycle
}

const cycleUnit = (cycle: string) => {
  return { monthly: '月', yearly: '年', permanent: '永久', follow_package: '周期' }[cycle] || '周期'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get('/capacity/configs', { params: { type: activeTab.value } }) as any
    if (res.success) {
      tableData.value = res.data || []
    }
  } catch (error) {
    console.error('获取扩容配置失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  editingId.value = ''
  form.type = activeTab.value as 'user' | 'storage' | 'online_seat'
  form.billing_cycle = 'monthly'
  form.unit_price = activeTab.value === 'storage' ? 10 : 50
  form.min_qty = 1
  form.max_qty = activeTab.value === 'online_seat' ? 200 : 100
  form.description = ''
  form.is_active = true
  form.discount_rules = []
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  form.type = row.type
  form.billing_cycle = row.billing_cycle
  form.unit_price = Number(row.unit_price)
  form.min_qty = row.min_qty
  form.max_qty = row.max_qty
  form.description = row.description || ''
  form.is_active = !!row.is_active
  form.discount_rules = Array.isArray(row.discount_rules) ? [...row.discount_rules] : []
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch { return }

  saving.value = true
  try {
    const data = { ...form, discount_rules: form.discount_rules.length > 0 ? [...form.discount_rules] : undefined }
    let res: any
    if (editingId.value) {
      res = await request.put(`/capacity/configs/${editingId.value}`, data)
    } else {
      res = await request.post('/capacity/configs', data)
    }
    if (res.success) {
      ElMessage.success(editingId.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error: any) {
    // 响应拦截器已弹出错误提示，此处避免重复
    console.error('保存扩容配置失败:', error?.message || error)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: string) => {
  try {
    const res = await request.delete(`/capacity/configs/${id}`) as any
    if (res.success) {
      ElMessage.success('删除成功')
      fetchData()
    }
  } catch { ElMessage.error('删除失败') }
}

const handleToggle = async (row: any, val: boolean) => {
  try {
    const res = await request.put(`/capacity/configs/${row.id}`, { ...row, is_active: val }) as any
    if (res.success) {
      ElMessage.success(val ? '已启用' : '已禁用')
      fetchData()
    }
  } catch { ElMessage.error('操作失败') }
}

onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.price {
  font-weight: 700;
  color: #6366f1;
  font-size: 15px;
}

.price-unit {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 2px;
}

.form-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.discount-rules {
  width: 100%;
}

.discount-rule-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}
</style>


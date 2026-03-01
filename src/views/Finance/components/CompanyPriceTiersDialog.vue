<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`价格档位管理 - ${companyName}`"
    width="1100px"
    @close="handleClose"
  >
    <div class="tier-manage-header">
      <el-button type="primary" :icon="Plus" @click="showAddTierDialog">添加档位</el-button>
      <div class="tier-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>系统会根据订单日期自动匹配对应档位，如有多个档位同时生效，使用优先级最高的</span>
      </div>
    </div>

    <el-table :data="tiers" v-loading="loading" stripe border class="tier-table">
      <el-table-column prop="tierOrder" label="排序" width="70" align="center" />
      <el-table-column prop="tierName" label="档位名称" min-width="120" />
      <el-table-column prop="pricingType" label="计价方式" width="110">
        <template #default="{ row }">
          <el-tag :type="row.pricingType === 'fixed' ? 'success' : 'warning'" size="small">
            {{ row.pricingType === 'fixed' ? '按单计价' : '按比例计价' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="单价/比例" width="130" align="right">
        <template #default="{ row }">
          <span v-if="row.pricingType === 'fixed'" style="color: #67c23a; font-weight: 600;">
            ¥{{ formatMoney(row.unitPrice) }}
          </span>
          <span v-else style="color: #e6a23c; font-weight: 600;">
            {{ row.percentageRate }}%
          </span>
        </template>
      </el-table-column>
      <el-table-column label="生效时间" min-width="200">
        <template #default="{ row }">
          <span v-if="row.startDate || row.endDate">
            {{ row.startDate || '不限' }} ~ {{ row.endDate || '不限' }}
          </span>
          <span v-else style="color: #909399;">不限制</span>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="80" align="center" />
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive === 1 ? 'success' : 'info'" size="small">
            {{ row.isActive === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="editTier(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click="deleteTier(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑档位对话框 -->
    <PriceTierDialog
      v-model:visible="tierDialogVisible"
      :company-id="companyId"
      :tier="currentTier"
      @saved="loadTiers"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, InfoFilled } from '@element-plus/icons-vue'
import { getCompanyPriceTiers, deletePriceTier, type PriceTier } from '@/api/valueAdded'
import PriceTierDialog from './PriceTierDialog.vue'

interface Props {
  visible: boolean
  companyId: string
  companyName: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = ref(false)
const loading = ref(false)
const tiers = ref<PriceTier[]>([])
const tierDialogVisible = ref(false)
const currentTier = ref<PriceTier | null>(null)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    loadTiers()
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)

const loadTiers = async () => {
  loading.value = true
  try {
    const res = await getCompanyPriceTiers(props.companyId) as any
    tiers.value = res?.data || res || []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载档位失败')
  } finally {
    loading.value = false
  }
}

const showAddTierDialog = () => {
  currentTier.value = null
  tierDialogVisible.value = true
}

const editTier = (tier: PriceTier) => {
  currentTier.value = tier
  tierDialogVisible.value = true
}

const deleteTier = async (tier: PriceTier) => {
  try {
    await ElMessageBox.confirm(`确定要删除档位"${tier.tierName}"吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  try {
    await deletePriceTier(props.companyId, tier.id)
    ElMessage.success('删除成功')
    loadTiers()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.tier-manage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tier-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
}

.tier-tip .el-icon {
  font-size: 16px;
}

.tier-table {
  margin-bottom: 16px;
}
</style>

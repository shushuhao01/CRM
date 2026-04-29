<template>
  <div class="billing-section">
    <!-- 说明横幅 - 会话存档专用 -->
    <div v-if="type === 'archive'" class="notice-banner notice-warning">
      <el-icon><Warning /></el-icon>
      <div class="notice-content">
        <strong>重要说明：会话存档需企微官方履约</strong>
        <p>会话存档服务由企业微信官方提供，流程如下：</p>
        <ol>
          <li>完成支付 → 我们收到订单并向企微官方提交代购申请</li>
          <li>企微将向您企业邮箱发送<b>确认函</b>（1-3个工作日）</li>
          <li>您的企业管理员需在 <a href="https://work.weixin.qq.com/wework_admin/loginpage_wx" target="_blank" rel="noopener">企微管理后台</a> 签署并下载确认函</li>
          <li>在下方上传已签署的确认函，我们将为您激活席位</li>
        </ol>
        <p style="color:#e6a23c">⚠ 如3个工作日内未收到确认函，请联系我们客服。</p>

        <!-- 确认函上传区 -->
        <div class="confirmation-upload-area">
          <div class="conf-status" v-if="confirmationStatus">
            <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
            <span>已上传确认函：{{ confirmationStatus.filename }}</span>
            <el-tag :type="confirmationStatus.status === 'activated' ? 'success' : 'warning'" size="small">
              {{ confirmationStatus.status === 'activated' ? '已激活' : '审核中' }}
            </el-tag>
            <span style="color:#86909c;font-size:12px">{{ formatDateTime(confirmationStatus.uploadedAt) }}</span>
          </div>
          <div class="conf-upload-btn">
            <input ref="confirmFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display:none" @change="handleConfirmationUpload" />
            <el-button size="small" type="primary" plain @click="confirmFileInput?.click()" :loading="uploadingConfirmation">
              {{ confirmationStatus ? '重新上传确认函' : '上传已签确认函' }}
            </el-button>
            <span style="color:#86909c;font-size:12px;margin-left:8px">支持 PDF/图片/Word，最大10MB</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 说明横幅 - 企微套餐 -->
    <div v-if="type === 'wecom'" class="notice-banner notice-info">
      <el-icon><InfoFilled /></el-icon>
      <div class="notice-content">
        <strong>企微套餐生效说明</strong>
        <p>免费领取基础版套餐后<b>立即生效</b>，对应菜单权限随即开放。付费套餐支付确认后立即开通。</p>
        <p>如菜单权限未更新，请退出后重新登录CRM系统即可刷新。</p>
      </div>
    </div>

    <!-- 说明横幅 - 获客助手 -->
    <div v-if="type === 'acquisition'" class="notice-banner notice-info">
      <el-icon><InfoFilled /></el-icon>
      <div class="notice-content">
        <strong>获客助手套餐说明</strong>
        <p>获客助手基础功能由企业微信官方提供（企业在官方购买）。</p>
        <p>本套餐为<b>通过CRM平台管理获客助手的增值服务费用</b>，包含：渠道活码管理、获客数据看板、转化漏斗分析、客户画像标签等高级功能。</p>
        <p>免费版领取后立即生效，付费版支付确认后立即开通对应功能。</p>
      </div>
    </div>

    <!-- 账单记录 -->
    <div class="billing-title">
      <span>📋 购买记录</span>
      <el-button type="primary" text size="small" @click="loadRecords" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <div v-if="loading" style="padding:16px">
      <el-skeleton :rows="3" animated />
    </div>
    <template v-else-if="pagedRecords.length">
      <el-table :data="pagedRecords" size="small" stripe>
        <el-table-column label="购买时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="套餐名称" min-width="120">
          <template #default="{ row }">
            <strong>{{ row.packageName }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.amount === 0 || row.amount === '0'" style="color:#00b42a;font-weight:600">免费</span>
            <span v-else style="color:#f5222d;font-weight:600">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="light">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="140">
          <template #default="{ row }">
            <span style="color:#86909c;font-size:12px">{{ row.remark }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'pending_payment'">
              <el-button type="primary" link size="small" @click="handlePay(row)">去支付</el-button>
              <el-button type="danger" link size="small" @click="handleCancel(row)" :loading="row._cancelling">取消</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页 -->
      <div class="billing-pager">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredRecords.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          small
          @size-change="currentPage = 1"
          @current-change="val => currentPage = val"
        />
      </div>
    </template>
    <el-empty v-else description="暂无购买记录" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning, InfoFilled, Refresh, CircleCheckFilled } from '@element-plus/icons-vue'
import { getBillingRecords } from '@/api/wecom'
import request from '@/utils/request'

const props = defineProps<{
  type: 'wecom' | 'archive' | 'ai' | 'acquisition'
}>()
const emit = defineEmits<{ (e: 'repay', row: any): void }>()

const loading = ref(false)
const allRecords = ref<any[]>([])
const confirmationStatus = ref<any>(null)
const uploadingConfirmation = ref(false)
const confirmFileInput = ref<HTMLInputElement | null>(null)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(10)

const filteredRecords = computed(() =>
  allRecords.value.filter(r => r.type === props.type)
)

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

const formatDateTime = (d: string) => {
  if (!d) return '-'
  const dt = new Date(d)
  return dt.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const statusType = (s: string) => {
  if (s === 'free' || s === 'paid' || s === 'active') return 'success'
  if (s === 'pending_payment') return 'warning'
  if (s === 'failed') return 'danger'
  return 'info'
}

const statusText = (s: string) => {
  const map: Record<string, string> = {
    free: '免费领取', paid: '已支付', active: '已生效',
    pending_payment: '待支付', pending_fulfillment: '待履约', failed: '失败'
  }
  return map[s] || s
}

const loadRecords = async () => {
  loading.value = true
  try {
    const res: any = await getBillingRecords()
    allRecords.value = res?.data || res || []
  } catch (e) {
    console.warn('[BillingRecordSection] load failed:', e)
    allRecords.value = []
  }
  loading.value = false
}

const loadConfirmationStatus = async () => {
  if (props.type !== 'archive') return
  try {
    const res: any = await (request as any).get('/wecom/archive-confirmation-status', { showError: false })
    confirmationStatus.value = res?.data || null
  } catch { /* ignore */ }
}

const handleConfirmationUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingConfirmation.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res: any = await (request as any).post('/wecom/upload-archive-confirmation', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ElMessage.success(res?.message || '确认函上传成功，等待审核激活')
    await loadConfirmationStatus()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '上传失败')
  }
  uploadingConfirmation.value = false
  if (confirmFileInput.value) confirmFileInput.value.value = ''
}

const handlePay = (row: any) => {
  emit('repay', row)
}

const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定取消该待支付订单吗？', '取消确认', { type: 'warning' })
    row._cancelling = true
    try {
      await (request as any).post('/wecom/cancel-order', { orderId: row.id, orderNo: row.orderNo })
      ElMessage.success('订单已取消')
      await loadRecords()
    } catch (err: any) {
      // 即使接口失败，也在本地标记取消（乐观更新）
      const idx = allRecords.value.findIndex(r => r.id === row.id)
      if (idx >= 0) allRecords.value[idx].status = 'cancelled'
      ElMessage.warning('订单取消请求已发送，如未生效请联系客服')
    }
    row._cancelling = false
  } catch { /* user cancelled the confirm dialog */ }
}

onMounted(() => {
  loadRecords()
  loadConfirmationStatus()
})

defineExpose({ loadRecords })
</script>

<style scoped>
.billing-section {
  margin-top: 28px;
  border-top: 1px dashed #e5e6eb;
  padding-top: 20px;
}

/* 说明横幅 */
.notice-banner {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.7;
}
.notice-warning {
  background: #fffbe6;
  border: 1px solid #ffe58f;
  color: #7d4e00;
}
.notice-info {
  background: #f0f7ff;
  border: 1px solid #91caff;
  color: #003a8c;
}
.notice-banner .el-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
.notice-content strong { display: block; margin-bottom: 4px; font-size: 14px; }
.notice-content p { margin: 4px 0; }
.notice-content ol { margin: 6px 0 6px 16px; padding: 0; }
.notice-content ol li { margin-bottom: 4px; }
.notice-content a { color: #1677ff; text-decoration: underline; }

/* 账单标题 */
.billing-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}

/* 分页 */
.billing-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* 确认函上传区 */
.confirmation-upload-area {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.6);
  border: 1px dashed #f0c040;
  border-radius: 8px;
}
.conf-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.conf-upload-btn {
  display: flex;
  align-items: center;
}
</style>

<template>
  <el-dialog v-model="visible" title="待确认匹配" width="800px" @close="$emit('close')">
    <div class="match-header">
      <span>待确认匹配 ({{ suggestions.length }}条)</span>
      <el-button text type="info" @click="$emit('reject-all')">全部忽略</el-button>
    </div>

    <div v-for="item in suggestions" :key="item.suggestion.id" class="match-item">
      <div class="match-cards">
        <div class="match-card wecom-card">
          <h4>企微客户</h4>
          <div class="card-name">{{ item.wecomCustomer.name }}</div>
          <div class="card-info">手机: {{ maskPhone(item.suggestion.matchField) }}</div>
          <div class="card-info">来源: {{ formatAddWay(item.wecomCustomer.addWay) }}</div>
          <div class="card-info">添加: {{ formatDate(item.wecomCustomer.addTime) }}</div>
          <div class="card-info">跟进人: {{ item.wecomCustomer.followUserName || '-' }}</div>
        </div>
        <div class="match-arrow">⇄</div>
        <div class="match-card crm-card">
          <h4>CRM客户(匹配到)</h4>
          <div class="card-name">{{ item.crmCustomer.name }}</div>
          <div class="card-info">手机: {{ maskPhone(item.crmCustomer.phone) }}</div>
          <div class="card-info">等级: {{ item.crmCustomer.level || '-' }}</div>
          <div class="card-info">订单: {{ item.crmCustomer.orderCount || 0 }}笔 / ¥{{ item.crmCustomer.totalAmount || 0 }}</div>
          <div class="card-info">销售: {{ item.crmCustomer.salesPersonName || '-' }}</div>
        </div>
      </div>
      <div class="match-footer">
        <span class="match-basis">匹配依据: {{ item.suggestion.matchType === 'phone' ? '手机号完全一致' : '姓名一致' }}</span>
        <el-tag :type="item.suggestion.confidence === 'high' ? 'success' : 'warning'" size="small">
          置信度: {{ item.suggestion.confidence === 'high' ? '高' : item.suggestion.confidence === 'medium' ? '中' : '低' }}
        </el-tag>
        <div class="match-actions">
          <el-button type="primary" size="small" @click="$emit('confirm', item.suggestion.id)">确认关联</el-button>
          <el-button size="small" @click="$emit('reject', item.suggestion.id)">拒绝</el-button>
          <el-button text size="small">查看详情</el-button>
        </div>
      </div>
    </div>

    <el-empty v-if="!suggestions.length" description="暂无待确认匹配" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
  configId: number
  suggestions: Array<{ suggestion: any; wecomCustomer: any; crmCustomer: any }>
}>()

defineEmits(['close', 'confirm', 'reject', 'reject-all'])

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

const formatAddWay = (way: number) => {
  const map: Record<number, string> = { 0: '未知', 1: '扫码', 2: '搜索手机号', 3: '名片分享', 4: '群聊', 5: '手机通讯录', 6: '微信联系人', 8: '安装第三方', 9: '搜索邮箱', 201: '内部成员', 202: '管理员/负责人' }
  return map[way] || '其他'
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.match-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: 600; font-size: 15px; }
.match-item { border: 1px solid #EBEEF5; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.match-cards { display: flex; align-items: stretch; gap: 16px; }
.match-card { flex: 1; background: #F9FAFB; border-radius: 8px; padding: 16px; }
.match-card h4 { margin: 0 0 12px; font-size: 13px; color: #9CA3AF; }
.card-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
.card-info { font-size: 13px; color: #6B7280; margin-bottom: 4px; }
.match-arrow { display: flex; align-items: center; font-size: 20px; color: #D1D5DB; }
.match-footer { display: flex; align-items: center; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
.match-basis { font-size: 13px; color: #6B7280; }
.match-actions { margin-left: auto; display: flex; gap: 8px; }
</style>


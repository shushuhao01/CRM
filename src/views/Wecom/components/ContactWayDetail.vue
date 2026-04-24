<template>
  <el-drawer v-model="visible" :title="null" size="840px" direction="rtl" @close="$emit('close')">
    <template #header>
      <div class="detail-header">
        <el-button text @click="$emit('close')"><el-icon><ArrowLeft /></el-icon>返回列表</el-button>
        <span class="detail-title">{{ contactWay?.name }} 详情</span>
        <el-tag :type="contactWay?.isEnabled ? 'success' : 'info'" size="small" style="margin-left: 8px">
          {{ contactWay?.isEnabled ? '启用' : '停用' }}
        </el-tag>
      </div>
    </template>

    <div v-if="contactWay" class="contact-way-detail">
      <!-- 信息卡片 -->
      <div class="info-card">
        <div class="info-grid">
          <div class="info-item"><span class="label">活码名称</span><span class="value">{{ contactWay.name }}</span></div>
          <div class="info-item"><span class="label">渠道标识</span><span class="value">{{ contactWay.state || '-' }}</span></div>
          <div class="info-item"><span class="label">分配模式</span><span class="value">{{ weightModeText }}</span></div>
          <div class="info-item"><span class="label">接待人</span><span class="value">{{ formatUserIds(contactWay.userIds) }}</span></div>
          <div class="info-item"><span class="label">创建时间</span><span class="value">{{ contactWay.createdAt || '-' }}</span></div>
          <div class="info-item">
            <span class="label">二维码</span>
            <span class="value qr-link" v-if="contactWay.qrCode">点击下载</span>
            <span class="value" v-else style="color: #D1D5DB">创建后自动生成</span>
          </div>
        </div>
      </div>

      <!-- 4个统计卡片+今日 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-value">{{ contactWay.totalAddCount || 0 }}</div>
          <div class="stat-label">总添加</div>
          <div class="stat-today">今日 <strong>{{ contactWay.todayCount || 0 }}</strong></div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-danger">{{ contactWay.totalLossCount || 0 }}</div>
          <div class="stat-label">总流失</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">{{ netGrowth }}</div>
          <div class="stat-label">净增长</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-primary">{{ retention }}%</div>
          <div class="stat-label">7日留存率</div>
        </div>
      </div>

      <!-- 内部4Tab（复用获客链接详情组件） -->
      <el-tabs v-model="detailTab">
        <el-tab-pane label="添加客户" name="customers">
          <LinkDetailCustomers :link-id="contactWay.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="开口统计" name="talk-stats">
          <LinkDetailTalkStats :link-id="contactWay.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="数据趋势" name="trend">
          <LinkDetailPortrait :link-id="contactWay.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="画像分析" name="portrait">
          <LinkDetailFunnel :link-id="contactWay.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useWecomDemo } from '../composables/useWecomDemo'
import LinkDetailCustomers from './LinkDetailCustomers.vue'
import LinkDetailTalkStats from './LinkDetailTalkStats.vue'
import LinkDetailPortrait from './LinkDetailPortrait.vue'
import LinkDetailFunnel from './LinkDetailFunnel.vue'

const props = defineProps<{ contactWay: any }>()
defineEmits(['close'])

const { isDemoMode } = useWecomDemo()
const visible = ref(true)
const detailTab = ref('customers')

const weightModeText = computed(() => {
  const map: Record<string, string> = { single: '单人', round_robin: '多人轮流', weighted: '多人权重' }
  return map[props.contactWay?.weightMode] || '单人'
})

const netGrowth = computed(() => (props.contactWay?.totalAddCount || 0) - (props.contactWay?.totalLossCount || 0))
const retention = computed(() => {
  const add = props.contactWay?.totalAddCount || 0
  if (!add) return 0
  return Math.round(((add - (props.contactWay?.totalLossCount || 0)) / add) * 100)
})

const formatUserIds = (ids: string) => {
  try { const arr = JSON.parse(ids || '[]'); return arr.length ? `${arr.length}人` : '-' } catch { return '-' }
}
</script>

<style scoped>
.detail-header { display: flex; align-items: center; gap: 8px; }
.detail-title { font-size: 18px; font-weight: 600; color: #1F2937; }
.contact-way-detail { padding: 0 4px; }
.info-card { background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.info-item .label { color: #9CA3AF; font-size: 12px; display: block; margin-bottom: 2px; }
.info-item .value { color: #4B5563; font-size: 14px; }
.qr-link { color: #4C6EF5; cursor: pointer; }
.qr-link:hover { text-decoration: underline; }
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 16px 20px; text-align: center; transition: all 0.3s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-value { font-size: 26px; font-weight: 700; color: #1F2937; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.stat-today { font-size: 12px; color: #9CA3AF; margin-top: 8px; padding-top: 8px; border-top: 1px solid #F3F4F6; }
.stat-today strong { color: #4B5563; }
.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
.text-primary { color: #4C6EF5; }
</style>

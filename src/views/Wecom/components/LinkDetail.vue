<template>
  <el-drawer
    v-model="drawerVisible"
    :title="null"
    size="860px"
    direction="rtl"
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <template #header>
      <div class="detail-header">
        <el-button text @click="$emit('close')">
          <el-icon><ArrowLeft /></el-icon>返回列表
        </el-button>
        <span class="detail-title">{{ link?.linkName }} 详情</span>
        <el-tag :type="link?.isEnabled ? 'success' : 'info'" size="small" style="margin-left: 8px">
          {{ link?.isEnabled ? '启用' : '停用' }}
        </el-tag>
      </div>
    </template>

    <div class="link-detail-content" v-if="link">
      <!-- 概览区：链接信息卡片 -->
      <div class="link-info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">链接名称</span>
            <span class="value">{{ link.linkName }}</span>
          </div>
          <div class="info-item">
            <span class="label">渠道标识</span>
            <span class="value">{{ link.state || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间</span>
            <span class="value">{{ link.createdAt }}</span>
          </div>
          <div class="info-item">
            <span class="label">接待成员</span>
            <span class="value">{{ parseUserNames(link.userIds) }}</span>
          </div>
          <div class="info-item">
            <span class="label">欢迎语</span>
            <span class="value">{{ link.welcomeMsg || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">链接地址</span>
            <span class="value link-url" @click="copyLink(link.linkUrl)">
              {{ link.linkUrl || '-' }}
              <el-icon v-if="link.linkUrl" style="margin-left: 4px; cursor: pointer"><CopyDocument /></el-icon>
            </span>
          </div>
        </div>
      </div>

      <!-- 概览区：4个统计卡片 + 今日数据 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-main">
            <div class="stat-value">{{ link.clickCount || 0 }}</div>
            <div class="stat-label">总点击</div>
          </div>
          <div class="stat-today">今日 <strong>{{ link.todayClick || 0 }}</strong></div>
        </div>
        <div class="stat-card">
          <div class="stat-main">
            <div class="stat-value text-success">{{ link.addCount || 0 }}</div>
            <div class="stat-label">总添加</div>
          </div>
          <div class="stat-today">今日 <strong>{{ link.todayAdd || 0 }}</strong></div>
        </div>
        <div class="stat-card">
          <div class="stat-main">
            <div class="stat-value text-danger">{{ link.lossCount || 0 }}</div>
            <div class="stat-label">总流失</div>
          </div>
          <div class="stat-today">今日 <strong>{{ link.todayLoss || 0 }}</strong></div>
        </div>
        <div class="stat-card">
          <div class="stat-main">
            <div class="stat-value text-primary">{{ conversionRate }}%</div>
            <div class="stat-label">总转化率</div>
          </div>
          <div class="stat-today">今日 <strong>{{ todayConversionRate }}%</strong></div>
        </div>
      </div>

      <!-- 内部5Tab -->
      <el-tabs v-model="detailTab" class="detail-tabs">
        <el-tab-pane label="添加客户" name="customers">
          <LinkDetailCustomers :link-id="link.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="开口统计" name="talk-stats">
          <LinkDetailTalkStats :link-id="link.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="转化漏斗" name="funnel">
          <LinkDetailFunnel :link-id="link.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="链接画像" name="portrait">
          <LinkDetailPortrait :link-id="link.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
        <el-tab-pane label="日志" name="logs">
          <LinkDetailLogs :link-id="link.id" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CopyDocument } from '@element-plus/icons-vue'
import { useWecomDemo } from '../composables/useWecomDemo'
import LinkDetailCustomers from './LinkDetailCustomers.vue'
import LinkDetailTalkStats from './LinkDetailTalkStats.vue'
import LinkDetailFunnel from './LinkDetailFunnel.vue'
import LinkDetailPortrait from './LinkDetailPortrait.vue'
import LinkDetailLogs from './LinkDetailLogs.vue'

const props = defineProps<{ link: any; visible: boolean }>()
defineEmits(['close'])

const { isDemoMode } = useWecomDemo()
const detailTab = ref('customers')
const drawerVisible = computed(() => props.visible)

const conversionRate = computed(() => {
  const clicks = props.link?.clickCount || 0
  const adds = props.link?.addCount || 0
  if (!clicks) return 0
  return ((adds / clicks) * 100).toFixed(1)
})

const todayConversionRate = computed(() => {
  const clicks = props.link?.todayClick || 0
  const adds = props.link?.todayAdd || 0
  if (!clicks) return 0
  return ((adds / clicks) * 100).toFixed(1)
})

const parseUserNames = (userIds: string) => {
  try {
    const ids: string[] = JSON.parse(userIds || '[]')
    return ids.length ? `${ids.length}人` : '-'
  } catch {
    return '-'
  }
}

const copyLink = (url: string) => {
  if (!url) return
  navigator.clipboard.writeText(url)
  ElMessage.success('链接已复制')
}
</script>

<style scoped>
.detail-header { display: flex; align-items: center; gap: 8px; }
.detail-title { font-size: 18px; font-weight: 600; color: #1F2937; }

.link-detail-content { padding: 0 4px; }

/* 信息卡片 */
.link-info-card {
  background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 16px;
}
.info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.info-item .label { color: #9CA3AF; font-size: 12px; display: block; margin-bottom: 2px; }
.info-item .value { color: #4B5563; font-size: 14px; word-break: break-all; }
.link-url { color: #4C6EF5; cursor: pointer; display: inline-flex; align-items: center; }
.link-url:hover { text-decoration: underline; }

/* 统计卡片 */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 16px 20px; text-align: center; transition: all 0.3s;
  display: flex; flex-direction: column; justify-content: space-between;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-value { font-size: 28px; font-weight: 700; color: #1F2937; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.stat-today {
  font-size: 12px; color: #9CA3AF; margin-top: 8px;
  padding-top: 8px; border-top: 1px solid #F3F4F6;
}
.stat-today strong { color: #4B5563; }
.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
.text-primary { color: #4C6EF5; }

.detail-tabs { margin-top: 4px; }
</style>


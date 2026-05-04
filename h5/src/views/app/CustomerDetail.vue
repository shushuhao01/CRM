<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="客户详情" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" size="24px" style="text-align:center;padding:40px;" />

    <template v-else-if="customer">
      <!-- 客户基本信息 -->
      <div class="card customer-profile">
        <div class="profile-header">
          <van-image round width="56" height="56" :src="customer.avatar || ''" fit="cover">
            <template #error>
              <div class="avatar-fallback-lg">{{ (customer.name || '?')[0] }}</div>
            </template>
          </van-image>
          <div class="profile-info">
            <div class="profile-name">{{ customer.name }}</div>
            <div v-if="customer.company" class="profile-company">{{ customer.company }}</div>
            <div class="profile-tags">
              <van-tag v-for="tag in (customer.tags || [])" :key="tag" size="small" type="primary" plain>{{ tag }}</van-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 企微信息 -->
      <div v-if="customer.wecom" class="card">
        <div class="card-title">企微信息</div>
        <van-cell-group :border="false">
          <van-cell title="添加时间" :value="customer.wecom.addTime || '-'" />
          <van-cell title="添加方式" :value="customer.wecom.addWayText || '-'" />
          <van-cell title="跟进人" :value="customer.wecom.followUserName || '-'" />
        </van-cell-group>
      </div>

      <!-- CRM客户信息 -->
      <div v-if="customer.crm" class="card">
        <div class="card-title-row">
          <div class="card-title" style="margin-bottom: 0">CRM客户信息</div>
          <div class="card-title-actions">
            <div class="btn-refresh" @click="handleRefresh" :class="{ spinning: refreshing }">
              <van-icon name="replay" size="14" />
            </div>
            <div class="btn-send-form" @click="sendFormCard" v-if="!sendingCard">
              <van-icon name="description" size="12" /> 转发填写资料
            </div>
            <div class="btn-send-form btn-send-form--loading" v-else>
              <van-loading size="12" color="#3b82f6" /> 发送中
            </div>
          </div>
        </div>
        <van-cell-group :border="false">
          <van-cell title="姓名" :value="customer.crm.name || '-'" />
          <van-cell title="手机" :value="customer.crm.phone || '-'" />
          <van-cell title="邮箱" :value="customer.crm.email || '-'" v-if="customer.crm.email" />
          <van-cell title="微信" :value="customer.crm.wechat || '-'" v-if="customer.crm.wechat" />
          <van-cell v-if="customer.crm.height || customer.crm.age || customer.crm.weight" title="身高/年龄/体重" :value="formatHAW(customer.crm)" />
          <van-cell title="性别" :value="customer.crm.gender || '-'" v-if="customer.crm.gender" />
          <van-cell title="地址" :value="customer.crm.address || '-'" v-if="customer.crm.address" />
          <van-cell title="医病史" :value="customer.crm.medicalHistory || '-'" v-if="customer.crm.medicalHistory" />
          <van-cell title="公司" :value="customer.crm.company || '-'" v-if="customer.crm.company" />
          <van-cell title="意向金额" :value="customer.crm.amount ? `¥${customer.crm.amount}` : '-'" v-if="customer.crm.amount" />
          <van-cell title="跟进阶段" :value="customer.crm.stage || '-'" v-if="customer.crm.stage" />
          <van-cell title="最近跟进" :value="customer.crm.lastFollowUp || '-'" v-if="customer.crm.lastFollowUp" />
        </van-cell-group>
      </div>

      <!-- 跟进记录 -->
      <div class="card">
        <div class="card-title">跟进记录</div>
        <div v-if="customer.followUps?.length" class="follow-list">
          <div v-for="(item, i) in customer.followUps" :key="i" class="follow-item">
            <div class="follow-time">{{ item.time }}</div>
            <div class="follow-content">{{ item.content }}</div>
            <div v-if="item.operator" class="follow-operator">{{ item.operator }}</div>
          </div>
        </div>
        <van-empty v-else description="暂无跟进记录" image="search" />
      </div>

      <!-- 订单记录 -->
      <div class="card">
        <div class="card-title">订单记录</div>
        <div v-if="customer.orders?.length" class="order-list">
          <div v-for="order in customer.orders" :key="order.id" class="order-item">
            <div class="order-header">
              <span class="order-no">{{ order.orderNumber }}</span>
              <van-tag :type="order.status === 'completed' ? 'success' : 'warning'" size="small">{{ order.statusText }}</van-tag>
            </div>
            <div class="order-amount">¥{{ order.amount }}</div>
            <div class="order-time">{{ order.time }}</div>
          </div>
        </div>
        <van-empty v-else description="暂无订单" image="search" />
      </div>
    </template>

    <van-empty v-else description="客户不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { getCustomerDetail } from '@/api/customer'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'

const route = useRoute()
const authStore = useAuthStore()
const loading = ref(true)
const refreshing = ref(false)
const customer = ref<any>(null)
const sendingCard = ref(false)

async function loadDetail(isRefresh = false) {
  if (isRefresh) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  try {
    const id = route.params.id as string
    const { data } = await getCustomerDetail(id)
    if (data?.success) {
      customer.value = data.data
    }
  } catch (e) {
    console.error('[CustomerDetail] load error:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function handleRefresh() {
  loadDetail(true)
}

function formatHAW(crm: any) {
  const parts: string[] = []
  if (crm.height) parts.push(`${crm.height}cm`)
  if (crm.age) parts.push(`${crm.age}岁`)
  if (crm.weight) parts.push(`${crm.weight}kg`)
  return parts.join(' / ') || '-'
}

async function sendFormCard() {
  if (sendingCard.value) return
  sendingCard.value = true
  try {
    const tenantId = authStore.user?.tenantId || ''
    const memberId = authStore.user?.id || ''
    const ts = String(Math.floor(Date.now() / 1000))

    const res: any = await api.post('/app/mp-generate-card', { tenantId, memberId, ts })
    const cardData = res?.data?.data || res?.data || {}
    const { sign, appId, cardTitle } = cardData

    const path = `/pages/form/form?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${sign}`

    if (typeof (window as any).wx !== 'undefined' && (window as any).wx.invoke) {
      (window as any).wx.invoke('sendChatMessage', {
        msgtype: 'miniprogram',
        miniprogram: {
          appid: appId,
          title: cardTitle || '请填写您的个人资料',
          imgUrl: cardData.cardCoverUrl || '',
          page: path
        }
      }, (result: any) => {
        if (result.err_msg === 'sendChatMessage:ok') {
          showSuccessToast('已发送')
          api.post('/app/mp-log-send', { tenantId, memberId, ts }).catch(() => {})
        } else {
          showToast('发送失败: ' + (result.err_msg || ''))
        }
      })
    } else {
      const link = `小程序路径: ${path}`
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
        showSuccessToast('路径已复制')
      } else {
        showToast('非企微环境无法发送')
      }
    }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '生成卡片失败')
  } finally {
    sendingCard.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.card-title-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-refresh {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #86909c;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7fa;
}
.btn-refresh:active {
  background: #e8eaed;
}
.btn-refresh.spinning {
  animation: spin-detail 0.8s linear;
}
@keyframes spin-detail {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
.btn-send-form {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  background: #fff;
}
.btn-send-form:active {
  background: #eff6ff;
  transform: scale(0.97);
}
.btn-send-form--loading {
  opacity: 0.7;
  cursor: default;
}
.customer-profile {
  text-align: left;
}
.profile-header {
  display: flex;
  gap: 14px;
  align-items: center;
}
.profile-name {
  font-size: 18px;
  font-weight: 700;
  color: #323233;
}
.profile-company {
  font-size: 13px;
  color: #969799;
  margin-top: 2px;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.avatar-fallback-lg {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1989fa;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
}
.follow-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.follow-item {
  padding-left: 12px;
  border-left: 2px solid #1989fa;
}
.follow-time {
  font-size: 12px;
  color: #c8c9cc;
}
.follow-content {
  font-size: 14px;
  color: #323233;
  margin-top: 2px;
}
.follow-operator {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.order-item {
  padding: 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-no {
  font-size: 13px;
  color: #323233;
  font-weight: 500;
}
.order-amount {
  font-size: 16px;
  font-weight: 700;
  color: #ee0a24;
  margin-top: 4px;
}
.order-time {
  font-size: 12px;
  color: #c8c9cc;
  margin-top: 2px;
}
</style>

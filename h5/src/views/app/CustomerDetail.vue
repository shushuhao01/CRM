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

      <!-- CRM信息 -->
      <div v-if="customer.crm" class="card">
        <div class="card-title">CRM信息</div>
        <van-cell-group :border="false">
          <van-cell title="手机" :value="customer.crm.phone || '-'" />
          <van-cell title="公司" :value="customer.crm.company || '-'" />
          <van-cell title="意向金额" :value="customer.crm.amount ? `¥${customer.crm.amount}` : '-'" />
          <van-cell title="跟进阶段" :value="customer.crm.stage || '-'" />
          <van-cell title="最近跟进" :value="customer.crm.lastFollowUp || '-'" />
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
import { getCustomerDetail } from '@/api/customer'

const route = useRoute()
const loading = ref(true)
const customer = ref<any>(null)

async function loadDetail() {
  loading.value = true
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
  }
}

onMounted(loadDetail)
</script>

<style scoped>
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

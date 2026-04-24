<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="客户关联CRM" left-arrow @click-left="$router.back()" />

    <div class="card" style="margin-top: 8px;">
      <div class="bind-desc">
        <van-icon name="info-o" color="#6366f1" size="16" />
        <span>将企微外部联系人关联到您权限范围内的CRM客户，绑定后自动同步资料。</span>
      </div>
    </div>

    <!-- 搜索未绑定的企微客户 -->
    <div class="card">
      <div class="section-title">选择企微客户</div>
      <van-search v-model="wecomKeyword" placeholder="搜索企微客户昵称" shape="round" @search="searchWecomCustomers" @clear="searchWecomCustomers" />
      <van-loading v-if="wecomLoading" size="20px" style="text-align:center;padding:12px;" />
      <div v-else-if="wecomList.length" class="bind-list">
        <div
          v-for="item in wecomList"
          :key="item.id"
          class="bind-item"
          :class="{ selected: selectedWecomId === item.id }"
          @click="selectWecom(item)"
        >
          <div class="bind-avatar" :style="{ background: getColor(item.name) }">{{ getChar(item.name) }}</div>
          <div class="bind-info">
            <div class="bind-name">{{ item.name }}</div>
            <div class="bind-meta">
              <span v-if="item.addTime">加粉: {{ item.addTime }}</span>
              <van-tag v-if="item.crmCustomerName" size="mini" type="success">已绑定: {{ item.crmCustomerName }}</van-tag>
              <van-tag v-else size="mini" type="warning">未绑定</van-tag>
            </div>
          </div>
          <van-icon v-if="selectedWecomId === item.id" name="success" color="#10b981" size="20" />
        </div>
      </div>
      <van-empty v-else-if="wecomSearched" description="未找到匹配的企微客户" image="search" />
    </div>

    <!-- 搜索CRM客户 -->
    <div v-if="selectedWecomId && !selectedWecom?.crmCustomerName" class="card">
      <div class="section-title">选择CRM客户进行绑定</div>
      <van-search v-model="crmKeyword" placeholder="搜索CRM客户名称/手机号" shape="round" @search="searchCrmCustomers" @clear="searchCrmCustomers" />
      <van-loading v-if="crmLoading" size="20px" style="text-align:center;padding:12px;" />
      <div v-else-if="crmList.length" class="bind-list">
        <div
          v-for="item in crmList"
          :key="item.id"
          class="bind-item"
          :class="{ selected: selectedCrmId === item.id }"
          @click="selectedCrmId = item.id"
        >
          <div class="bind-avatar crm-avatar">{{ getChar(item.name) }}</div>
          <div class="bind-info">
            <div class="bind-name">{{ item.name }}</div>
            <div class="bind-meta">
              <span v-if="item.phone">{{ item.phone }}</span>
              <span v-if="item.company">{{ item.company }}</span>
            </div>
          </div>
          <van-icon v-if="selectedCrmId === item.id" name="success" color="#10b981" size="20" />
        </div>
      </div>
      <van-empty v-else-if="crmSearched" description="未找到匹配的CRM客户" image="search" />
    </div>

    <!-- 绑定按钮 -->
    <div v-if="selectedWecomId && selectedCrmId" style="padding: 16px 0;">
      <van-button type="primary" block round :loading="binding" @click="doBind" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none;">
        确认绑定
      </van-button>
    </div>

    <!-- 已绑定提示 -->
    <div v-if="selectedWecom?.crmCustomerName" class="card" style="text-align:center;">
      <van-icon name="passed" color="#10b981" size="32" />
      <div style="margin-top:8px; font-size:14px; color:#374151; font-weight:600;">该客户已绑定CRM</div>
      <div style="margin-top:4px; font-size:13px; color:#9ca3af;">关联CRM客户: {{ selectedWecom.crmCustomerName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { showToast, showSuccessToast } from 'vant'
import api from '@/api/index'

const wecomKeyword = ref('')
const crmKeyword = ref('')
const wecomLoading = ref(false)
const crmLoading = ref(false)
const wecomSearched = ref(false)
const crmSearched = ref(false)
const binding = ref(false)

const wecomList = ref<any[]>([])
const crmList = ref<any[]>([])
const selectedWecomId = ref<string | null>(null)
const selectedCrmId = ref<string | null>(null)

const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6']

function getColor(name: string): string {
  return colors[(name || '').charCodeAt(0) % colors.length]
}

function getChar(name: string): string {
  return name ? name[name.length - 1] : '?'
}

const selectedWecom = computed(() => wecomList.value.find(w => w.id === selectedWecomId.value))

function selectWecom(item: any) {
  selectedWecomId.value = item.id
  selectedCrmId.value = null
  crmList.value = []
  crmSearched.value = false
}

async function searchWecomCustomers() {
  wecomLoading.value = true
  wecomSearched.value = false
  selectedWecomId.value = null
  selectedCrmId.value = null
  try {
    const { data } = await api.get('/app/customers', {
      params: { page: 1, pageSize: 20, keyword: wecomKeyword.value || '' }
    })
    if (data?.success) {
      wecomList.value = data.data?.list || []
    }
  } catch (e) {
    console.error('[BindWecom] search wecom error:', e)
  } finally {
    wecomLoading.value = false
    wecomSearched.value = true
  }
}

async function searchCrmCustomers() {
  if (!crmKeyword.value.trim()) return
  crmLoading.value = true
  crmSearched.value = false
  selectedCrmId.value = null
  try {
    const { data } = await api.get('/app/crm-customers', {
      params: { keyword: crmKeyword.value }
    })
    if (data?.success) {
      crmList.value = data.data || []
    }
  } catch (e) {
    console.error('[BindWecom] search crm error:', e)
  } finally {
    crmLoading.value = false
    crmSearched.value = true
  }
}

async function doBind() {
  if (!selectedWecomId.value || !selectedCrmId.value) return
  binding.value = true
  try {
    const { data } = await api.post('/app/bind-crm', {
      wecomCustomerId: selectedWecomId.value,
      crmCustomerId: selectedCrmId.value
    })
    if (data?.success) {
      showSuccessToast('绑定成功，已同步到CRM')
      // Refresh the list
      await searchWecomCustomers()
      selectedWecomId.value = null
      selectedCrmId.value = null
    } else {
      showToast(data?.message || '绑定失败')
    }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '绑定失败')
  } finally {
    binding.value = false
  }
}
</script>

<style scoped>
.bind-desc {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: #6b7280; line-height: 1.5;
}
.section-title {
  font-size: 13px; font-weight: 600; color: #374151;
  margin-bottom: 8px;
}
.bind-list {
  display: flex; flex-direction: column; gap: 6px; margin-top: 8px;
}
.bind-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 1.5px solid #f3f4f6;
  cursor: pointer; transition: all 0.15s;
}
.bind-item:active { transform: scale(0.99); }
.bind-item.selected {
  border-color: #6366f1; background: #f5f3ff;
}
.bind-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; flex-shrink: 0;
}
.crm-avatar { background: #10b981 !important; }
.bind-info { flex: 1; min-width: 0; }
.bind-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.bind-meta {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  margin-top: 2px; font-size: 12px; color: #9ca3af;
}
</style>

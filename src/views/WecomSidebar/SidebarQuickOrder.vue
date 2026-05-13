<template>
  <div class="sidebar-quick-order">
    <!-- 步骤指示器（顶部固定） -->
    <div class="qo-steps">
      <div class="qo-step" :class="{ active: step === 1, done: step > 1 }" @click="step > 1 && goStep(1)">
        <span class="step-num">{{ step > 1 ? '✓' : '1' }}</span><span class="step-text">选客户</span>
      </div>
      <div class="qo-step-line" :class="{ active: step > 1 }"></div>
      <div class="qo-step" :class="{ active: step === 2, done: step > 2 }" @click="step > 2 && goStep(2)">
        <span class="step-num">{{ step > 2 ? '✓' : '2' }}</span><span class="step-text">选产品</span>
      </div>
      <div class="qo-step-line" :class="{ active: step > 2 }"></div>
      <div class="qo-step" :class="{ active: step === 3, done: step > 3 }">
        <span class="step-num">{{ step > 3 ? '✓' : '3' }}</span><span class="step-text">确认下单</span>
      </div>
    </div>

    <!-- ==================== 步骤1: 选择客户 ==================== -->
    <div v-if="step === 1" class="qo-step-content">
      <div class="qo-mode-tabs">
        <span class="qo-mode-tab" :class="{ active: custMode === 'search' }" @click="custMode = 'search'">🔍 搜索客户</span>
        <span class="qo-mode-tab" :class="{ active: custMode === 'new' }" @click="custMode = 'new'">➕ 新建客户</span>
      </div>

      <!-- 搜索已有客户 -->
      <div v-if="custMode === 'search'">
        <div class="preview-card">
          <div class="card-title">👤 搜索已有客户</div>
          <div class="qo-search-box">
            <input v-model="custKeyword" placeholder="搜索姓名/手机号..." class="preview-input" @input="searchCustomers" />
          </div>
          <!-- 自动匹配提示 -->
          <div v-if="autoMatchedCustomer" class="qo-auto-match">
            <div class="qo-match-badge">✅ 已匹配CRM客户</div>
            <div class="qo-customer-item selected" @click="selectCustomer(autoMatchedCustomer)">
              <div class="qo-cust-name">{{ autoMatchedCustomer.name }} <span class="qo-cust-phone">{{ maskPhone(autoMatchedCustomer.phone) }}</span></div>
            </div>
          </div>
          <div class="qo-customer-list" v-if="custList.length">
            <div class="qo-customer-item" v-for="c in custList" :key="c.id" :class="{ selected: form.customerId === c.id }" @click="selectCustomer(c)">
              <div class="qo-cust-name">{{ c.name || '未知' }} <span class="qo-cust-phone">{{ maskPhone(c.phone) }}</span></div>
            </div>
            <div v-if="custLoading" style="text-align:center;padding:4px;font-size:10px;color:#c0c4cc">加载中...</div>
          </div>
          <div v-else-if="custKeyword && !custLoading" class="qo-empty-hint">
            未找到客户 · <span class="action-link" @click="custMode = 'new'; newCust.phone = custKeyword">新建客户</span>
          </div>
          <div v-else class="qo-empty-hint">输入关键词搜索客户</div>
        </div>
      </div>

      <!-- 新建客户表单 -->
      <div v-if="custMode === 'new'">
        <div class="preview-card">
          <div class="card-title">📝 新建客户</div>
          <div class="qo-new-form">
            <div class="form-group">
              <label>手机号 <span class="qo-req">*</span></label>
              <input v-model="newCust.phone" placeholder="输入客户手机号" class="preview-input" @blur="checkPhone" />
              <div v-if="phoneExists" class="qo-field-hint warn">⚠ 该手机号已存在客户，<span class="action-link" @click="useExistingCustomer">点击使用</span></div>
            </div>
            <div class="form-group">
              <label>客户姓名 <span class="qo-req">*</span></label>
              <input v-model="newCust.name" placeholder="输入客户姓名" class="preview-input" />
            </div>
            <div class="form-group">
              <label>性别</label>
              <div class="qo-radio-group">
                <span class="qo-radio" :class="{ active: newCust.gender === '男' }" @click="newCust.gender = '男'">男</span>
                <span class="qo-radio" :class="{ active: newCust.gender === '女' }" @click="newCust.gender = '女'">女</span>
              </div>
            </div>
            <div class="form-group">
              <label>收货地址</label>
              <input v-model="newCust.address" placeholder="收货地址" class="preview-input" />
            </div>
          </div>
          <div class="qo-new-actions">
            <button class="preview-btn" :disabled="newCustSaving" @click="saveNewCustomer">
              {{ newCustSaving ? '保存中...' : '💾 保存并下单' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 已选客户 + 收货信息 -->
      <div class="preview-card" v-if="form.customerId">
        <div class="qo-selected-cust-bar">
          <span>✅ {{ form.customerName }}</span>
          <span class="action-link" @click="clearCustomer">更换</span>
        </div>
        <div class="card-title" style="margin-top:8px">📋 收货信息</div>
        <div class="form-group"><label>收货人 <span class="qo-req">*</span></label><input v-model="form.receiverName" placeholder="收货人姓名" class="preview-input" /></div>
        <div class="form-group"><label>收货电话 <span class="qo-req">*</span></label><input v-model="form.receiverPhone" placeholder="收货电话" class="preview-input" /></div>
        <div class="form-group"><label>收货地址 <span class="qo-req">*</span></label><input v-model="form.receiverAddress" placeholder="详细收货地址" class="preview-input" /></div>
        <button class="preview-btn" :disabled="!form.receiverName || !form.receiverPhone || !form.receiverAddress" @click="step = 2">下一步：选择产品</button>
      </div>
    </div>

    <!-- ==================== 步骤2: 选择产品 + 订单信息 ==================== -->
    <div v-if="step === 2" class="qo-step-content">
      <!-- 选择产品卡片 -->
      <div class="preview-card">
        <div class="card-title">🛒 选择产品</div>
        <div class="qo-search-box">
          <input v-model="productKeyword" placeholder="搜索产品名称..." class="preview-input" @input="searchProducts" />
        </div>
        <div class="qo-product-list" v-if="productList.length">
          <div class="qo-product-item" v-for="p in productList" :key="p.id">
            <div class="qo-prod-img">
              <img :src="p.image || p.imageUrl || p.thumbnail || '/default-product.png'" :alt="p.name" />
            </div>
            <div class="qo-prod-info">
              <div class="qo-prod-name">{{ p.name }}</div>
              <div class="qo-prod-meta">
                <span class="qo-prod-price">¥{{ Number(p.price).toFixed(2) }}</span>
                <span class="qo-prod-stock">库存 {{ p.stock }}</span>
              </div>
            </div>
            <button class="qo-add-btn" @click="addProduct(p)" :disabled="p.stock <= 0">{{ p.stock > 0 ? '+' : '无货' }}</button>
          </div>
        </div>
        <div v-else class="qo-empty-hint">{{ productKeyword ? '未找到产品' : '加载产品中...' }}</div>
      </div>

      <!-- 已选产品卡片 -->
      <div class="preview-card" v-if="form.products.length">
        <div class="card-title">📦 已选产品 ({{ form.products.length }})</div>
        <div class="qo-selected-product" v-for="(sp, idx) in form.products" :key="sp.id">
          <div class="qo-sp-top">
            <span class="qo-sp-name">{{ sp.name }}</span>
            <span class="qo-sp-remove" @click="removeProduct(idx)">✕</span>
          </div>
          <div class="qo-sp-bottom">
            <div class="qo-sp-qty">
              <span class="qo-qty-btn" @click="changeQty(idx, -1)">－</span>
              <span class="qo-qty-val">{{ sp.quantity }}</span>
              <span class="qo-qty-btn" @click="changeQty(idx, 1)">＋</span>
            </div>
            <div class="qo-sp-price-edit">
              <span style="font-size:10px;color:#909399">单价 ¥</span>
              <input v-model.number="sp.price" class="qo-price-input" @input="syncTotal()" />
            </div>
            <span class="qo-sp-total">¥{{ (sp.price * sp.quantity).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 金额信息卡片 -->
      <div class="preview-card" v-if="form.products.length">
        <div class="card-title">💰 金额信息</div>
        <div class="qo-amount-row">
          <span class="qo-amount-label">商品小计</span>
          <span class="qo-amount-val">¥{{ subtotal.toFixed(2) }}</span>
        </div>
        <div class="form-group">
          <label>订单总额（可改价）</label>
          <input v-model.number="form.totalAmount" class="preview-input" type="number" step="0.01" />
        </div>
        <div class="form-group">
          <label>定金</label>
          <input v-model.number="form.depositAmount" class="preview-input" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div class="qo-amount-row">
          <span class="qo-amount-label">代收金额</span>
          <span class="qo-amount-val" style="color:#f56c6c;font-weight:700">¥{{ collectAmount.toFixed(2) }}</span>
        </div>
        <div class="form-group">
          <label>支付方式 <span class="qo-req">*</span></label>
          <select v-model="form.paymentMethod" class="preview-input">
            <option value="">请选择</option>
            <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>定金截图</label>
          <div class="qo-screenshot-area">
            <div class="qo-screenshot-list" v-if="form.depositScreenshots.length">
              <div class="qo-screenshot-thumb" v-for="(img, i) in form.depositScreenshots" :key="i">
                <img :src="img" alt="定金截图" />
                <span class="qo-screenshot-del" @click="form.depositScreenshots.splice(i, 1)">✕</span>
              </div>
            </div>
            <div class="qo-upload-actions">
              <label class="qo-upload-btn">
                📷 上传截图
                <input type="file" accept="image/*" multiple style="display:none" @change="handleScreenshot" />
              </label>
              <span class="qo-upload-btn" @click="pasteScreenshot">📋 粘贴图片</span>
            </div>
            <div class="qo-paste-hint">💡 也可直接 Ctrl+V 粘贴截图</div>
          </div>
        </div>
      </div>

      <!-- 订单信息卡片 -->
      <div class="preview-card" v-if="form.products.length">
        <div class="card-title">📋 订单信息</div>
        <div class="form-group">
          <label>客服微信号 <span class="qo-req">*</span></label>
          <input v-model="form.serviceWechat" class="preview-input" placeholder="负责客服的微信号" />
        </div>
        <div class="form-group">
          <label>订单来源 <span class="qo-req">*</span></label>
          <select v-model="form.orderSource" class="preview-input">
            <option value="">请选择</option>
            <option value="wecom">企微</option>
            <option value="wechat">微信</option>
            <option value="phone">电话</option>
            <option value="douyin">抖音</option>
            <option value="referral">转介绍</option>
            <option value="offline">线下</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>快递公司 <span class="qo-req">*</span></label>
          <select v-model="form.expressCompany" class="preview-input">
            <option value="">请选择</option>
            <option v-for="ec in expressCompanyList" :key="ec.code" :value="ec.code">{{ ec.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>订单类型 <span class="qo-req">*</span></label>
          <div class="qo-radio-group">
            <span class="qo-radio" :class="{ active: form.markType === 'normal' }" @click="form.markType = 'normal'">正常发货单</span>
            <span class="qo-radio" :class="{ active: form.markType === 'reserved' }" @click="form.markType = 'reserved'">预留单</span>
          </div>
        </div>
        <div class="form-group">
          <label>订单备注</label>
          <input v-model="form.remark" class="preview-input" placeholder="选填备注信息" />
        </div>
        <button class="preview-btn" @click="goToConfirm" style="margin-top:8px">下一步：确认订单</button>
      </div>
    </div>

    <!-- ==================== 步骤3: 确认下单 ==================== -->
    <div v-if="step === 3" class="qo-step-content">
      <div class="preview-card">
        <div class="card-title">📝 订单确认</div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">客户</div>
          <div class="qo-confirm-val">{{ form.customerName }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">收货人</div>
          <div class="qo-confirm-val">{{ form.receiverName }} {{ maskPhone(form.receiverPhone) }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">收货地址</div>
          <div class="qo-confirm-val">{{ form.receiverAddress }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">快递</div>
          <div class="qo-confirm-val">{{ expressCompanyList.find(e => e.code === form.expressCompany)?.name || form.expressCompany || '-' }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">产品明细</div>
          <div class="qo-confirm-product" v-for="sp in form.products" :key="sp.id">
            {{ sp.name }} × {{ sp.quantity }} = ¥{{ (sp.price * sp.quantity).toFixed(2) }}
          </div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">客服微信</div>
          <div class="qo-confirm-val">{{ form.serviceWechat || '-' }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">订单来源</div>
          <div class="qo-confirm-val">{{ orderSourceLabel }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">支付方式</div>
          <div class="qo-confirm-val">{{ paymentMethods.find(m => m.value === form.paymentMethod)?.label || '-' }}</div>
        </div>
        <div class="qo-confirm-section">
          <div class="qo-confirm-label">订单类型</div>
          <div class="qo-confirm-val">{{ form.markType === 'reserved' ? '预留单' : '正常发货单' }}</div>
        </div>
      </div>
      <div class="preview-card">
        <div class="qo-total-bar">
          <span style="font-weight:600">订单总额</span>
          <span class="qo-total-amount">¥{{ Number(form.totalAmount || 0).toFixed(2) }}</span>
        </div>
        <div class="qo-total-bar" v-if="form.depositAmount">
          <span>定金</span>
          <span style="color:#67c23a">-¥{{ Number(form.depositAmount || 0).toFixed(2) }}</span>
        </div>
        <div class="qo-total-bar">
          <span>代收金额</span>
          <span style="color:#f56c6c;font-weight:600">¥{{ collectAmount.toFixed(2) }}</span>
        </div>
        <div class="qo-screenshot-list" v-if="form.depositScreenshots.length" style="margin:8px 0">
          <div class="qo-screenshot-thumb" v-for="(img, i) in form.depositScreenshots" :key="i">
            <img :src="img" alt="定金截图" />
          </div>
        </div>
        <button class="preview-btn" style="margin-top:8px" :disabled="submitting" @click="submitOrder">
          {{ submitting ? '提交中...' : '🛒 提交订单' }}
        </button>
        <button class="preview-btn" style="background:#909399;margin-top:6px" @click="step = 2">返回修改</button>
      </div>
    </div>

    <!-- ==================== 步骤4: 下单成功 ==================== -->
    <div v-if="step === 4" class="qo-step-content" style="text-align:center;padding:40px 20px">
      <div style="font-size:48px;margin-bottom:12px">✅</div>
      <div style="font-size:16px;font-weight:600;color:#303133;margin-bottom:8px">订单提交成功！</div>
      <div style="font-size:12px;color:#909399;margin-bottom:4px">订单号：{{ resultOrderNo }}</div>
      <div style="font-size:14px;color:#f56c6c;font-weight:600;margin-bottom:16px">¥{{ Number(form.totalAmount || 0).toFixed(2) }}</div>
      <button class="preview-btn" @click="resetOrder">继续下单</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = defineProps<{ sidebarToken: string; customerData?: any }>()

const authHeaders = computed(() => ({
  headers: { Authorization: `Bearer ${props.sidebarToken}` }
}))

// ========== 状态 ==========
const step = ref(1)
const custMode = ref<'search' | 'new'>('search')
const custKeyword = ref('')
const custList = ref<any[]>([])
const custLoading = ref(false)
const autoMatchedCustomer = ref<any>(null)

const productKeyword = ref('')
const productList = ref<any[]>([])
const productLoading = ref(false)

const submitting = ref(false)
const resultOrderNo = ref('')
const newCustSaving = ref(false)
const phoneExists = ref(false)
const existingCustomer = ref<any>(null)

const newCust = ref({ phone: '', name: '', gender: '', address: '' })

const form = ref({
  customerId: '' as string | number,
  customerName: '',
  customerPhone: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  products: [] as { id: any; name: string; price: number; quantity: number; stock: number; image: string }[],
  totalAmount: 0,
  depositAmount: 0,
  depositScreenshots: [] as string[],
  paymentMethod: '',
  serviceWechat: '',
  orderSource: '',
  expressCompany: '',
  markType: 'normal' as 'normal' | 'reserved',
  remark: ''
})

const paymentMethods = ref([
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝支付', value: 'alipay' },
  { label: '银行转账', value: 'bank_transfer' },
  { label: '货到付款', value: 'cod' },
  { label: '其他', value: 'other' }
])

const expressCompanyList = ref([
  { code: 'SF', name: '顺丰速运' },
  { code: 'YD', name: '韵达速递' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'STO', name: '申通快递' },
  { code: 'JTSD', name: '极兔速递' },
  { code: 'JD', name: '京东物流' },
  { code: 'EMS', name: 'EMS' },
  { code: 'DB', name: '德邦快递' }
])

const orderSourceOptions = [
  { label: '企微', value: 'wecom' },
  { label: '微信', value: 'wechat' },
  { label: '电话', value: 'phone' },
  { label: '抖音', value: 'douyin' },
  { label: '转介绍', value: 'referral' },
  { label: '线下', value: 'offline' },
  { label: '其他', value: 'other' }
]

// ========== 计算属性 ==========
const subtotal = computed(() => form.value.products.reduce((sum, p) => sum + p.price * p.quantity, 0))
const collectAmount = computed(() => Math.max(Number(form.value.totalAmount || 0) - Number(form.value.depositAmount || 0), 0))
const orderSourceLabel = computed(() => orderSourceOptions.find(o => o.value === form.value.orderSource)?.label || form.value.orderSource || '-')

const maskPhone = (p: string) => {
  if (!p || p.length < 7) return p || '-'
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const goStep = (s: number) => { step.value = s }

const syncTotal = () => {
  form.value.totalAmount = subtotal.value
}

// ========== 搜索客户 ==========
let searchTimer: any = null
const searchCustomers = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!custKeyword.value.trim()) { custList.value = []; return }
    custLoading.value = true
    try {
      const res: any = await request.get('/wecom/sidebar/search-customers', {
        params: { keyword: custKeyword.value },
        ...authHeaders.value
      } as any)
      custList.value = res?.data || res || []
    } catch { custList.value = [] }
    custLoading.value = false
  }, 300)
}

const selectCustomer = (c: any) => {
  form.value.customerId = c.id
  form.value.customerName = c.name || ''
  form.value.customerPhone = c.phone || ''
  form.value.receiverName = c.name || ''
  form.value.receiverPhone = c.phone || ''
  form.value.receiverAddress = c.address || ''
}

const clearCustomer = () => {
  form.value.customerId = ''
  form.value.customerName = ''
  form.value.customerPhone = ''
  form.value.receiverName = ''
  form.value.receiverPhone = ''
  form.value.receiverAddress = ''
}

// ========== 新建客户 ==========
const checkPhone = async () => {
  if (!newCust.value.phone || newCust.value.phone.length < 11) { phoneExists.value = false; return }
  try {
    const res: any = await request.get('/wecom/sidebar/check-phone', {
      params: { phone: newCust.value.phone },
      ...authHeaders.value
    } as any)
    if (res?.data) { phoneExists.value = true; existingCustomer.value = res.data }
    else { phoneExists.value = false; existingCustomer.value = null }
  } catch { phoneExists.value = false }
}

const useExistingCustomer = () => {
  if (existingCustomer.value) {
    selectCustomer(existingCustomer.value)
    phoneExists.value = false
    custMode.value = 'search'
  }
}

const saveNewCustomer = async () => {
  if (!newCust.value.phone || !/^1[3-9]\d{9}$/.test(newCust.value.phone)) {
    ElMessage.warning('请输入正确的手机号'); return
  }
  if (!newCust.value.name?.trim()) { ElMessage.warning('请输入客户姓名'); return }
  if (phoneExists.value) { ElMessage.warning('该手机号已存在客户，请直接使用'); return }

  newCustSaving.value = true
  try {
    const res: any = await request.post('/wecom/sidebar/customers', {
      name: newCust.value.name.trim(),
      phone: newCust.value.phone,
      gender: newCust.value.gender || undefined,
      address: newCust.value.address || undefined,
      source: 'wecom'
    }, authHeaders.value as any)
    const created = res?.data || res
    if (!created?.id) throw new Error('创建客户失败')
    ElMessage.success('客户创建成功')
    selectCustomer(created)
    step.value = 2
  } catch (e: any) {
    ElMessage.error(e?.message || '创建客户失败')
  }
  newCustSaving.value = false
}

// ========== 搜索产品 ==========
const searchProducts = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    productLoading.value = true
    try {
      const res: any = await request.get('/wecom/sidebar/products', {
        params: { keyword: productKeyword.value || '', page: 1, pageSize: 50 },
        ...authHeaders.value
      } as any)
      const data = res?.data || res
      productList.value = data?.list || data || []
    } catch { productList.value = [] }
    productLoading.value = false
  }, 300)
}

const addProduct = (p: any) => {
  const existing = form.value.products.find(x => x.id === p.id)
  if (existing) {
    if (existing.quantity < (p.stock || 999)) { existing.quantity++; syncTotal() }
    else ElMessage.warning('库存不足')
  } else {
    form.value.products.push({
      id: p.id, name: p.name, price: Number(p.price) || 0,
      quantity: 1, stock: p.stock || 999,
      image: p.image || p.imageUrl || p.thumbnail || ''
    })
    syncTotal()
  }
}

const removeProduct = (idx: number) => {
  form.value.products.splice(idx, 1)
  syncTotal()
}

const changeQty = (idx: number, delta: number) => {
  const sp = form.value.products[idx]
  const newQty = sp.quantity + delta
  if (newQty < 1) { form.value.products.splice(idx, 1) }
  else if (newQty > sp.stock) { ElMessage.warning('库存不足') }
  else { sp.quantity = newQty }
  syncTotal()
}

// ========== 定金截图 ==========
const handleScreenshot = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const remaining = 3 - form.value.depositScreenshots.length
  if (remaining <= 0) { ElMessage.warning('最多上传3张截图'); return }
  Array.from(input.files).slice(0, remaining).forEach(file => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) form.value.depositScreenshots.push(ev.target.result as string)
    }
    reader.readAsDataURL(file)
  })
  input.value = ''
}

const pasteScreenshot = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      const imageType = item.types.find(t => t.startsWith('image/'))
      if (imageType) {
        if (form.value.depositScreenshots.length >= 3) { ElMessage.warning('最多上传3张截图'); return }
        const blob = await item.getType(imageType)
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (ev.target?.result) form.value.depositScreenshots.push(ev.target.result as string)
        }
        reader.readAsDataURL(blob)
        ElMessage.success('粘贴截图成功')
        return
      }
    }
    ElMessage.info('剪贴板中没有图片')
  } catch {
    ElMessage.info('无法读取剪贴板，请使用Ctrl+V或上传按钮')
  }
}

const handleGlobalPaste = async (e: ClipboardEvent) => {
  if (step.value !== 2) return
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      if (form.value.depositScreenshots.length >= 3) { ElMessage.warning('最多上传3张截图'); return }
      const blob = item.getAsFile()
      if (!blob) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          form.value.depositScreenshots.push(ev.target.result as string)
          ElMessage.success('粘贴截图成功')
        }
      }
      reader.readAsDataURL(blob)
      return
    }
  }
}

// ========== 步骤2→3校验 ==========
const goToConfirm = () => {
  if (!form.value.serviceWechat) { ElMessage.warning('请输入客服微信号'); return }
  if (!form.value.orderSource) { ElMessage.warning('请选择订单来源'); return }
  if (!form.value.paymentMethod) { ElMessage.warning('请选择支付方式'); return }
  if (!form.value.expressCompany) { ElMessage.warning('请选择快递公司'); return }
  step.value = 3
}

// ========== 提交订单 ==========
const submitOrder = async () => {
  if (!form.value.customerId) { ElMessage.warning('请选择客户'); step.value = 1; return }
  if (!form.value.products.length) { ElMessage.warning('请选择产品'); step.value = 2; return }
  if (!form.value.receiverName || !form.value.receiverPhone) { ElMessage.warning('请填写收货信息'); step.value = 1; return }

  submitting.value = true
  try {
    const res: any = await request.post('/wecom/sidebar/orders', {
      customerId: form.value.customerId,
      products: form.value.products.map(p => ({
        id: p.id, name: p.name, price: p.price, quantity: p.quantity
      })),
      totalAmount: Number(form.value.totalAmount) || subtotal.value,
      depositAmount: Number(form.value.depositAmount) || 0,
      paymentMethod: form.value.paymentMethod,
      remark: form.value.remark,
      receiverName: form.value.receiverName,
      receiverPhone: form.value.receiverPhone,
      receiverAddress: form.value.receiverAddress,
      serviceWechat: form.value.serviceWechat,
      orderSource: form.value.orderSource,
      expressCompany: form.value.expressCompany,
      markType: form.value.markType
    }, authHeaders.value as any)
    const data = res?.data || res
    resultOrderNo.value = data?.orderNumber || ''
    ElMessage.success('订单提交成功！')
    step.value = 4
  } catch (e: any) {
    ElMessage.error(e?.message || '订单提交失败，请重试')
  }
  submitting.value = false
}

// ========== 重置 ==========
const resetOrder = () => {
  step.value = 1
  custMode.value = 'search'
  autoMatchedCustomer.value = null
  form.value = {
    customerId: '', customerName: '', customerPhone: '',
    receiverName: '', receiverPhone: '', receiverAddress: '',
    products: [], totalAmount: 0, depositAmount: 0, depositScreenshots: [],
    paymentMethod: '', serviceWechat: '', orderSource: '',
    expressCompany: '', markType: 'normal', remark: ''
  }
  resultOrderNo.value = ''
  custKeyword.value = ''
  custList.value = []
  newCust.value = { phone: '', name: '', gender: '', address: '' }
  phoneExists.value = false
}

// ========== 自动填充客户 ==========
function autoFillCustomer() {
  if (props.customerData?.crmCustomer) {
    const crm = props.customerData.crmCustomer
    autoMatchedCustomer.value = crm
    selectCustomer({ id: crm.id, name: crm.name, phone: crm.phone, address: crm.address })
  }
}

// ========== 初始化产品列表 ==========
const initProducts = async () => {
  try {
    const res: any = await request.get('/wecom/sidebar/products', {
      params: { keyword: '', page: 1, pageSize: 50 },
      ...authHeaders.value
    } as any)
    const data = res?.data || res
    productList.value = data?.list || data || []
  } catch { /* ignore */ }
}

// ========== 生命周期 ==========
onMounted(() => {
  initProducts()
  autoFillCustomer()
  document.addEventListener('paste', handleGlobalPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', handleGlobalPaste)
})

watch(() => props.customerData, () => {
  if (!form.value.customerId) autoFillCustomer()
})
</script>

<style scoped>
.sidebar-quick-order { padding: 0 0 12px; background: #f5f6f7; min-height: 100%; color: #303133; }
.qo-step-content { padding: 0; }

/* 步骤指示器 */
.qo-steps { display: flex; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.qo-step { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.qo-step .step-num { width: 20px; height: 20px; border-radius: 50%; background: #dcdfe6; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.qo-step.active .step-num { background: #07c160; }
.qo-step.done .step-num { background: #67c23a; }
.qo-step .step-text { font-size: 11px; color: #909399; }
.qo-step.active .step-text { color: #07c160; font-weight: 600; }
.qo-step.done .step-text { color: #67c23a; }
.qo-step-line { flex: 1; height: 2px; background: #dcdfe6; margin: 0 6px; }
.qo-step-line.active { background: #67c23a; }

/* 模式切换Tab */
.qo-mode-tabs { display: flex; background: #fff; border-bottom: 1px solid #f0f0f0; }
.qo-mode-tab { flex: 1; text-align: center; padding: 10px 0; font-size: 12px; color: #909399; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.qo-mode-tab.active { color: #07c160; border-bottom-color: #07c160; font-weight: 600; }

/* 卡片 */
.preview-card { background: #fff; margin: 8px; border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card-title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; }

/* 表单 */
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; color: #606266; margin-bottom: 4px; }
.preview-input { width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; color: #303133; }
.preview-input:focus { border-color: #07c160; }
select.preview-input { appearance: auto; }

/* 按钮 */
.preview-btn { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #07c160; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.preview-btn:hover { background: #06ad56; }
.preview-btn:disabled { background: #c0c4cc; cursor: not-allowed; }

/* 链接 */
.action-link { color: #4c6ef5; cursor: pointer; font-size: 12px; font-weight: 400; }

/* 搜索客户 */
.qo-search-box { margin-bottom: 8px; }
.qo-customer-list { max-height: 240px; overflow-y: auto; }
.qo-customer-item { padding: 8px; border-radius: 6px; border: 1px solid #f0f0f0; margin-bottom: 4px; cursor: pointer; transition: all 0.2s; }
.qo-customer-item:hover { border-color: #07c160; background: #f0faf4; }
.qo-customer-item.selected { border-color: #07c160; background: #e8f8ef; }
.qo-cust-name { font-size: 12px; font-weight: 500; color: #303133; }
.qo-cust-phone { font-size: 11px; color: #909399; margin-left: 6px; }
.qo-empty-hint { text-align: center; font-size: 11px; color: #c0c4cc; padding: 16px 0; }
.qo-auto-match { margin-bottom: 8px; }
.qo-match-badge { font-size: 11px; color: #67c23a; font-weight: 600; margin-bottom: 4px; }

/* 新建客户 */
.qo-new-form { max-height: 340px; overflow-y: auto; }
.qo-new-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.qo-req { color: #f56c6c; font-weight: 700; }
.qo-field-hint { font-size: 10px; margin-top: 2px; }
.qo-field-hint.warn { color: #e6a23c; }

/* 已选客户 */
.qo-selected-cust-bar { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 500; color: #303133; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }

/* 单选组 */
.qo-radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
.qo-radio { padding: 4px 14px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
.qo-radio.active { border-color: #07c160; background: #f0faf4; color: #07c160; font-weight: 600; }

/* 产品列表 */
.qo-product-list { max-height: 200px; overflow-y: auto; }
.qo-product-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #f5f5f5; }
.qo-prod-img { width: 48px; height: 48px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #f5f5f5; }
.qo-prod-img img { width: 100%; height: 100%; object-fit: cover; }
.qo-prod-info { flex: 1; min-width: 0; }
.qo-prod-name { font-size: 12px; font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qo-prod-meta { display: flex; gap: 8px; margin-top: 2px; }
.qo-prod-price { font-size: 12px; color: #f56c6c; font-weight: 600; }
.qo-prod-stock { font-size: 10px; color: #909399; }
.qo-add-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: #07c160; color: #fff; font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qo-add-btn:disabled { background: #dcdfe6; cursor: not-allowed; }

/* 已选产品 */
.qo-selected-product { padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.qo-selected-product:last-child { border-bottom: none; }
.qo-sp-top { display: flex; justify-content: space-between; align-items: center; }
.qo-sp-name { font-size: 12px; font-weight: 500; color: #303133; }
.qo-sp-remove { color: #f56c6c; cursor: pointer; font-size: 14px; }
.qo-sp-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.qo-sp-qty { display: flex; align-items: center; gap: 0; }
.qo-qty-btn { width: 22px; height: 22px; border-radius: 4px; background: #f0f0f0; color: #303133; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; }
.qo-qty-btn:hover { background: #e0e0e0; }
.qo-qty-val { width: 28px; text-align: center; font-size: 12px; font-weight: 600; }
.qo-sp-price-edit { display: flex; align-items: center; gap: 2px; }
.qo-price-input { width: 50px; border: 1px solid #dcdfe6; border-radius: 4px; padding: 2px 4px; font-size: 12px; text-align: right; outline: none; }
.qo-price-input:focus { border-color: #07c160; }
.qo-sp-total { font-size: 12px; color: #f56c6c; font-weight: 600; min-width: 60px; text-align: right; }

/* 金额信息 */
.qo-amount-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; }
.qo-amount-label { color: #909399; }
.qo-amount-val { color: #303133; font-weight: 600; }

/* 定金截图 */
.qo-screenshot-area { margin-top: 4px; }
.qo-screenshot-list { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.qo-screenshot-thumb { width: 56px; height: 56px; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid #e5e7eb; }
.qo-screenshot-thumb img { width: 100%; height: 100%; object-fit: cover; }
.qo-screenshot-del { position: absolute; top: -2px; right: -2px; width: 16px; height: 16px; background: #f56c6c; color: #fff; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.qo-upload-actions { display: flex; gap: 6px; }
.qo-upload-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px dashed #dcdfe6; border-radius: 6px; font-size: 11px; color: #606266; cursor: pointer; }
.qo-upload-btn:hover { border-color: #07c160; color: #07c160; }
.qo-paste-hint { font-size: 10px; color: #c0c4cc; margin-top: 4px; }

/* 确认页 */
.qo-confirm-section { padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.qo-confirm-label { font-size: 10px; color: #909399; }
.qo-confirm-val { font-size: 12px; color: #303133; font-weight: 500; }
.qo-confirm-product { font-size: 11px; color: #606266; padding: 2px 0; }
.qo-total-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid #f0f0f0; font-size: 13px; color: #303133; }
.qo-total-amount { font-size: 16px; font-weight: 700; color: #f56c6c; }
</style>

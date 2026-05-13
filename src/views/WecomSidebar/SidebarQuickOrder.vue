<template>
  <div class="sidebar-quick-order">
    <!-- Step 1: 选择客户 -->
    <div v-if="step === 1" class="qo-step">
      <div class="step-header">
        <span class="step-badge">1</span>
        <span class="step-title">选择客户</span>
      </div>

      <!-- 已选客户 -->
      <div v-if="form.customerId" class="selected-customer info-card">
        <div class="customer-row">
          <span class="cust-name">{{ form.customerName }}</span>
          <span class="cust-phone">{{ form.customerPhone }}</span>
          <el-button link type="danger" size="small" @click="clearCustomer">✕</el-button>
        </div>
        <el-button type="primary" style="width:100%;margin-top:8px" @click="step = 2">下一步 → 选择商品</el-button>
      </div>

      <!-- 搜索客户 -->
      <div v-else class="info-card">
        <div class="mode-tabs">
          <span :class="{ active: custMode === 'search' }" @click="custMode = 'search'">搜索客户</span>
          <span :class="{ active: custMode === 'new' }" @click="custMode = 'new'">新建客户</span>
        </div>

        <div v-if="custMode === 'search'">
          <el-input v-model="custKeyword" placeholder="搜索客户姓名/手机号..." clearable size="small" @input="searchCustomers">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <div class="cust-list" v-loading="custLoading">
            <div v-for="c in custList" :key="c.id" class="cust-item" @click="selectCustomer(c)">
              <span class="cust-name">{{ c.name || '未知' }}</span>
              <span class="cust-phone">{{ maskPhone(c.phone) }}</span>
            </div>
            <div v-if="!custLoading && custList.length === 0 && custKeyword" class="cust-empty">
              未找到客户
            </div>
          </div>
        </div>

        <div v-else class="new-cust-form">
          <el-form label-position="top" size="small">
            <el-form-item label="手机号" required>
              <el-input v-model="newCust.phone" placeholder="输入手机号" @blur="checkPhone" />
              <div v-if="phoneExists" class="phone-exists-tip">
                该手机号已有客户 <el-button link type="primary" size="small" @click="useExistingCustomer">直接使用</el-button>
              </div>
            </el-form-item>
            <el-form-item label="姓名" required>
              <el-input v-model="newCust.name" placeholder="客户姓名" />
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="newCust.gender">
                <el-radio label="male">男</el-radio>
                <el-radio label="female">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="地址">
              <el-input v-model="newCust.address" placeholder="收货地址" />
            </el-form-item>
          </el-form>
          <el-button type="primary" style="width:100%" :loading="newCustSaving" @click="saveNewCustomer">创建客户并下单</el-button>
        </div>
      </div>
    </div>

    <!-- Step 2: 选择商品 -->
    <div v-else-if="step === 2" class="qo-step">
      <div class="step-header">
        <el-button link @click="step = 1">← 返回</el-button>
        <span class="step-badge">2</span>
        <span class="step-title">选择商品</span>
      </div>

      <div class="info-card">
        <el-input v-model="productKeyword" placeholder="搜索商品..." clearable size="small" @input="searchProducts">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <div class="product-list" v-loading="productLoading">
          <div v-for="p in productList" :key="p.id" class="product-item" @click="addProduct(p)">
            <div class="prod-info">
              <span class="prod-name">{{ p.name }}</span>
              <span class="prod-price">¥{{ Number(p.price).toFixed(2) }}</span>
            </div>
            <span class="prod-stock">库存 {{ p.stock }}</span>
          </div>
        </div>
      </div>

      <!-- 已选商品 -->
      <div v-if="form.products.length" class="info-card">
        <div class="section-title">已选商品 ({{ form.products.length }})</div>
        <div v-for="(sp, idx) in form.products" :key="sp.id" class="selected-product">
          <span class="sp-name">{{ sp.name }}</span>
          <div class="sp-qty">
            <el-button size="small" @click="changeQty(idx, -1)">-</el-button>
            <span>{{ sp.quantity }}</span>
            <el-button size="small" @click="changeQty(idx, 1)">+</el-button>
          </div>
          <span class="sp-subtotal">¥{{ (sp.price * sp.quantity).toFixed(2) }}</span>
        </div>
        <div class="total-row">
          <span>合计</span>
          <span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
        <el-button type="primary" style="width:100%;margin-top:8px" @click="step = 3">下一步 → 填写信息</el-button>
      </div>
    </div>

    <!-- Step 3: 填写订单信息并提交 -->
    <div v-else-if="step === 3" class="qo-step">
      <div class="step-header">
        <el-button link @click="step = 2">← 返回</el-button>
        <span class="step-badge">3</span>
        <span class="step-title">确认订单</span>
      </div>

      <div class="info-card">
        <div class="section-title">订单摘要</div>
        <div class="summary-row"><span>客户</span><span>{{ form.customerName }}</span></div>
        <div class="summary-row"><span>商品数</span><span>{{ form.products.length }}种 / {{ form.products.reduce((s, p) => s + p.quantity, 0) }}件</span></div>
        <div class="summary-row"><span>金额</span><span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span></div>
      </div>

      <div class="info-card">
        <el-form label-position="top" size="small">
          <el-form-item label="收货人">
            <el-input v-model="form.receiverName" placeholder="收货人姓名" />
          </el-form-item>
          <el-form-item label="收货手机">
            <el-input v-model="form.receiverPhone" placeholder="收货人手机号" />
          </el-form-item>
          <el-form-item label="收货地址">
            <el-input v-model="form.receiverAddress" placeholder="详细地址" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="form.paymentMethod" placeholder="选择支付方式" style="width:100%">
              <el-option label="微信" value="wechat" />
              <el-option label="支付宝" value="alipay" />
              <el-option label="银行转账" value="bank" />
              <el-option label="货到付款" value="cod" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="订单备注" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width:100%" :loading="submitting" @click="submitOrder">提交订单</el-button>
      </div>
    </div>

    <!-- Step 4: 下单成功 -->
    <div v-else-if="step === 4" class="qo-step">
      <div class="info-card" style="text-align:center;padding:30px 12px">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <h3 style="color:#303133;margin-bottom:8px">下单成功</h3>
        <p style="color:#909399;font-size:13px">订单号: {{ resultOrderNo }}</p>
        <el-button type="primary" style="margin-top:16px" @click="resetOrder">继续下单</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps<{ sidebarToken: string; customerData?: any }>()

const step = ref(1)
const custMode = ref<'search' | 'new'>('search')
const custKeyword = ref('')
const custList = ref<any[]>([])
const custLoading = ref(false)
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
  products: [] as { id: any; name: string; price: number; quantity: number; stock: number }[],
  paymentMethod: '',
  remark: ''
})

const authHeaders = computed(() => ({
  headers: { Authorization: `Bearer ${props.sidebarToken}` }
}))

const totalAmount = computed(() => form.value.products.reduce((sum, p) => sum + p.price * p.quantity, 0))

const maskPhone = (p: string) => {
  if (!p || p.length < 7) return p || '-'
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
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

// ========== 搜索商品 ==========
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
    if (existing.quantity < (p.stock || 999)) { existing.quantity++ }
    else ElMessage.warning('库存不足')
  } else {
    form.value.products.push({
      id: p.id, name: p.name, price: Number(p.price) || 0,
      quantity: 1, stock: p.stock || 999
    })
  }
}

const changeQty = (idx: number, delta: number) => {
  const sp = form.value.products[idx]
  const newQty = sp.quantity + delta
  if (newQty < 1) form.value.products.splice(idx, 1)
  else if (newQty > sp.stock) ElMessage.warning('库存不足')
  else sp.quantity = newQty
}

// ========== 提交订单 ==========
const submitOrder = async () => {
  if (!form.value.customerId) { ElMessage.warning('请选择客户'); step.value = 1; return }
  if (!form.value.products.length) { ElMessage.warning('请选择商品'); step.value = 2; return }

  submitting.value = true
  try {
    const res: any = await request.post('/wecom/sidebar/orders', {
      customerId: form.value.customerId,
      products: form.value.products.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: p.quantity })),
      totalAmount: totalAmount.value,
      paymentMethod: form.value.paymentMethod,
      remark: form.value.remark,
      receiverName: form.value.receiverName,
      receiverPhone: form.value.receiverPhone,
      receiverAddress: form.value.receiverAddress
    }, authHeaders.value as any)
    const data = res?.data || res
    resultOrderNo.value = data?.orderNumber || ''
    ElMessage.success('订单创建成功')
    step.value = 4
  } catch (e: any) {
    ElMessage.error(e?.message || '订单创建失败')
  }
  submitting.value = false
}

const resetOrder = () => {
  step.value = 1
  form.value = {
    customerId: '', customerName: '', customerPhone: '',
    receiverName: '', receiverPhone: '', receiverAddress: '',
    products: [], paymentMethod: '', remark: ''
  }
  resultOrderNo.value = ''
  newCust.value = { phone: '', name: '', gender: '', address: '' }
}

// Auto-load products on mount
import { onMounted } from 'vue'
onMounted(() => {
  searchProducts()
  // Auto-select customer from parent if available
  if (props.customerData?.crmCustomer) {
    const crm = props.customerData.crmCustomer
    selectCustomer({ id: crm.id, name: crm.name, phone: crm.phone, address: crm.address })
  }
})
</script>

<style scoped>
.sidebar-quick-order { padding: 0 0 12px; background: #f5f6f7; min-height: 100%; }
.qo-step { padding: 0; }
.step-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fff; border-bottom: 1px solid #eee; }
.step-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #07c160; color: #fff; font-size: 12px; font-weight: 700; }
.step-title { font-size: 14px; font-weight: 600; color: #303133; }
.info-card { background: #fff; border-radius: 8px; padding: 12px; margin: 8px 12px; }
.section-title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.mode-tabs { display: flex; gap: 12px; margin-bottom: 10px; }
.mode-tabs span { padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #606266; background: #f0f2f5; cursor: pointer; }
.mode-tabs span.active { background: #07c160; color: #fff; }
.cust-list { max-height: 200px; overflow-y: auto; margin-top: 8px; }
.cust-item { display: flex; justify-content: space-between; padding: 8px 6px; border-bottom: 1px solid #f0f2f5; cursor: pointer; font-size: 13px; }
.cust-item:hover { background: #f9fafb; }
.cust-name { font-weight: 500; color: #303133; }
.cust-phone { color: #909399; font-size: 12px; }
.cust-empty { text-align: center; padding: 16px; color: #909399; font-size: 12px; }
.selected-customer .customer-row { display: flex; align-items: center; gap: 8px; }
.phone-exists-tip { color: #e6a23c; font-size: 12px; margin-top: 4px; }
.product-list { max-height: 240px; overflow-y: auto; margin-top: 8px; }
.product-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 6px; border-bottom: 1px solid #f0f2f5; cursor: pointer; }
.product-item:hover { background: #f9fafb; }
.prod-info { display: flex; flex-direction: column; }
.prod-name { font-size: 13px; font-weight: 500; color: #303133; }
.prod-price { font-size: 12px; color: #f56c6c; font-weight: 600; }
.prod-stock { font-size: 11px; color: #909399; }
.selected-product { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f6f7; font-size: 13px; }
.sp-name { flex: 1; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-qty { display: flex; align-items: center; gap: 8px; margin: 0 8px; }
.sp-subtotal { color: #f56c6c; font-weight: 600; min-width: 60px; text-align: right; }
.total-row { display: flex; justify-content: space-between; padding: 10px 0 0; font-size: 14px; font-weight: 600; border-top: 1px solid #eee; margin-top: 8px; }
.total-amount { color: #f56c6c; font-size: 16px; }
.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #606266; border-bottom: 1px solid #f5f6f7; }
.new-cust-form { margin-top: 8px; }
</style>

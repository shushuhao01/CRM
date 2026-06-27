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

    <!-- 返回按钮（从客户详情跳来时显示） -->
    <div v-if="showBackToDetail" class="qo-back-bar">
      <button class="qo-back-btn" @click="goBackToDetail">← 返回客户详情</button>
    </div>

    <!-- ==================== 步骤1: 选择客户 ==================== -->
    <div v-if="step === 1" class="qo-step-content">
      <div class="qo-mode-tabs">
        <span class="qo-mode-tab" :class="{ active: custMode === 'search' }" @click="custMode = 'search'">🔍 搜索客户</span>
        <span class="qo-mode-tab" :class="{ active: custMode === 'new' }" @click="switchToNewCust">➕ 新建客户</span>
      </div>

      <!-- 搜索已有客户 -->
      <div v-if="custMode === 'search'">
        <div class="preview-card">
          <div class="card-title">👤 搜索已有客户</div>
          <div class="qo-search-box">
            <input v-model="custKeyword" placeholder="搜索姓名/手机号..." class="preview-input" @input="searchCustomers" @focus="!custList.length && searchCustomers()" />
          </div>
          <!-- 已选客户（搜索框下方显示） -->
          <div v-if="form.customerId && !custList.length" class="qo-selected-inline">
            <span class="qo-selected-name">{{ form.customerName }}</span>
            <span class="qo-selected-phone">{{ maskPhone(form.customerPhone) }}</span>
            <span class="action-link" style="margin-left:auto;font-size:11px" @click="clearCustomer">更换</span>
          </div>
          <!-- 自动匹配提示（仅在未手动选择其他客户、未搜索时显示） -->
          <div v-else-if="autoMatchedCustomer && !form.customerId && !custKeyword && !custList.length" class="qo-selected-inline" style="border-color:#b7eb8f;background:#f6ffed" @click="selectCustomer(autoMatchedCustomer)">
            <span style="font-size:11px;color:#52c41a;margin-right:4px">已匹配</span>
            <span class="qo-selected-name">{{ autoMatchedCustomer.name }}</span>
            <span class="qo-selected-phone">{{ maskPhone(autoMatchedCustomer.phone) }}</span>
          </div>
          <!-- 搜索结果列表 -->
          <div class="qo-customer-list" v-if="custList.length">
            <div class="qo-customer-item" v-for="c in custList" :key="c.id" :class="{ selected: form.customerId === c.id }" @click="selectCustomer(c)">
              <div class="qo-cust-name">{{ c.name || '未知' }} <span class="qo-cust-phone">{{ maskPhone(c.phone) }}</span></div>
            </div>
            <div v-if="custLoading" style="text-align:center;padding:4px;font-size:10px;color:#c0c4cc">加载中...</div>
          </div>
          <div v-else-if="custKeyword && !custLoading && !form.customerId" class="qo-empty-hint">
            未找到客户 · <span class="action-link" @click="custMode = 'new'; newCust.phone = custKeyword">新建客户</span>
          </div>
        </div>
      </div>

      <!-- 新建客户表单 -->
      <div v-if="custMode === 'new'">
        <div class="preview-card">
          <div class="card-title">📝 新建客户</div>
          <div class="qo-new-form">
            <!-- 手机号 + 验证按钮 -->
            <div class="form-group">
              <label>手机号 <span class="qo-req">*</span></label>
              <div style="display:flex;gap:6px">
                <input v-model="newCust.phone" placeholder="输入客户手机号" class="preview-input" style="flex:1" @blur="autoVerifyPhone" />
                <button class="verify-btn" :disabled="!newCust.phone || newCust.phone.length < 11 || phoneChecking" @click="verifyPhone">{{ phoneChecking ? '验证中' : '验证' }}</button>
              </div>
              <div v-if="phoneVerifyResult === 'ok'" class="qo-field-hint ok">✅ 可创建</div>
              <div v-else-if="phoneVerifyResult === 'exists'" class="qo-field-hint warn">⚠ 该客户已存在，归属：{{ phoneExistOwner }} <span class="action-link" @click="useExistingCustomer">直接使用</span></div>
            </div>
            <!-- 客户姓名 -->
            <div class="form-group">
              <label>客户姓名 <span class="qo-req">*</span></label>
              <input v-model="newCust.name" placeholder="输入客户姓名" class="preview-input" />
            </div>
            <!-- 性别 -->
            <div class="form-group" v-if="isCustFieldEnabled('gender')">
              <label>性别 <span class="qo-req" v-if="isCustFieldRequired('gender')">*</span></label>
              <div class="qo-radio-group">
                <span class="qo-radio" :class="{ active: newCust.gender === '男' }" @click="newCust.gender = '男'">男</span>
                <span class="qo-radio" :class="{ active: newCust.gender === '女' }" @click="newCust.gender = '女'">女</span>
              </div>
            </div>
            <!-- 年龄 -->
            <div class="form-group" v-if="isCustFieldEnabled('age')">
              <label>年龄 <span class="qo-req" v-if="isCustFieldRequired('age')">*</span></label>
              <input v-model.number="newCust.age" placeholder="年龄" class="preview-input" type="number" />
            </div>
            <!-- 来源 -->
            <div class="form-group" v-if="isCustFieldEnabled('source')">
              <label>客户来源 <span class="qo-req" v-if="isCustFieldRequired('source')">*</span></label>
              <select v-model="newCust.source" class="preview-input">
                <option value="">请选择</option>
                <option value="wecom">企微</option><option value="wechat">微信</option>
                <option value="phone">电话</option><option value="douyin">抖音</option>
                <option value="referral">转介绍</option><option value="other">其他</option>
              </select>
            </div>
            <!-- 收货地址 -->
            <div class="form-group" v-if="isCustFieldEnabled('address')">
              <label>收货地址 <span class="qo-req" v-if="isCustFieldRequired('address')">*</span></label>
              <input v-model="newCust.address" placeholder="省市区+详细地址" class="preview-input" />
            </div>
            <!-- 系统自定义客户字段 -->
            <template v-if="customerFieldConfig.customFields?.length">
              <div class="form-group" v-for="cf in customerFieldConfig.customFields" :key="cf.fieldKey">
                <label>{{ cf.fieldName }} <span class="qo-req" v-if="cf.required">*</span></label>
                <select v-if="cf.fieldType === 'select'" v-model="newCust.customFields[cf.fieldKey]" class="preview-input">
                  <option value="">请选择</option>
                  <option v-for="opt in (cf.options || [])" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <input v-else v-model="newCust.customFields[cf.fieldKey]" class="preview-input" :placeholder="cf.placeholder || '请输入' + cf.fieldName" />
              </div>
            </template>
          </div>
          <div class="qo-new-actions">
            <button class="preview-btn" :disabled="newCustSaving || (newCust.phone.length >= 11 && phoneVerifyResult === '')" @click="saveNewCustomer">
              {{ newCustSaving ? '保存中...' : '💾 保存并下单' }}
            </button>
            <div v-if="newCust.phone.length >= 11 && phoneVerifyResult === ''" style="font-size:10px;color:#e6a23c;text-align:center;margin-top:4px">请先验证手机号（点击输入框外失去焦点自动验证）</div>
          </div>
        </div>
      </div>

      <!-- 收货信息（选中客户后显示） -->
      <div class="preview-card" v-if="form.customerId">
        <div class="card-title">📋 收货信息</div>
        <div class="form-group"><label>收货人 <span class="qo-req">*</span></label><input v-model="form.receiverName" placeholder="收货人姓名" class="preview-input" /></div>
        <div class="form-group"><label>收货电话 <span class="qo-req">*</span></label>
          <div style="display:flex;gap:6px;align-items:center">
            <input
              v-if="receiverPhoneEditing"
              v-model="form.receiverPhone"
              placeholder="请输入新的收货电话"
              class="preview-input"
              style="flex:1"
              ref="phoneEditInput"
            />
            <input
              v-else
              :value="receiverPhoneMasked"
              placeholder="收货电话"
              class="preview-input"
              style="flex:1"
              readonly
            />
            <span v-if="receiverPhoneEditing" class="action-link" style="flex-shrink:0;font-size:11px;color:#67c23a" @click="confirmPhoneEdit">确定</span>
            <span v-else class="action-link" style="flex-shrink:0;font-size:11px" @click="startPhoneEdit">编辑</span>
          </div>
        </div>
        <div class="form-group"><label>收货地址 <span class="qo-req">*</span></label><input v-model="form.receiverAddress" placeholder="省市区+详细地址（如：广东广州天河区XX路XX号）" class="preview-input" />
          <div v-if="addressError" style="color:#f56c6c;font-size:10px;margin-top:2px">{{ addressError }}</div>
        </div>
        <button class="preview-btn" :disabled="!form.receiverName || !form.receiverPhone || !form.receiverAddress" @click="validateAndNext">下一步：选择产品</button>
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
          <div class="qo-product-item" v-for="p in productList" :key="p.id" :class="{ 'out-of-stock': p.stock <= 0 }">
            <div class="qo-prod-img">
              <img :src="getProductImage(p)" :alt="p.name" @error="handleImgError($event)" />
            </div>
            <div class="qo-prod-info">
              <div class="qo-prod-name">
                <span class="prod-type-tag" :class="p.productType === 'virtual' ? 'virtual' : 'physical'">{{ p.productType === 'virtual' ? '虚拟' : '实物' }}</span>
                {{ p.name }}
              </div>
              <div class="qo-prod-meta">
                <span class="qo-prod-price" v-if="p.skuType && p.skuType !== 'none' && p.minPrice">¥{{ p.minPrice }}<template v-if="p.minPrice !== p.maxPrice">-{{ p.maxPrice }}</template></span>
                <span class="qo-prod-price" v-else>¥{{ Number(p.price).toFixed(2) }}</span>
                <span class="qo-prod-stock" :class="{ 'no-stock': ((p.skuType && p.skuType !== 'none') ? (p.totalStock ?? p.stock) : p.stock) <= 0 }">{{ ((p.skuType && p.skuType !== 'none') ? (p.totalStock ?? p.stock) : p.stock) > 0 ? '库存 ' + ((p.skuType && p.skuType !== 'none') ? (p.totalStock ?? p.stock) : p.stock) : '缺货' }}</span>
              </div>
            </div>
            <button class="qo-add-btn" @click="(p.skuType && p.skuType !== 'none') ? openSidebarSkuDialog(p) : addProduct(p)" :disabled="((p.skuType && p.skuType !== 'none') ? (p.totalStock ?? p.stock) : p.stock) <= 0" :title="p.stock <= 0 ? '商品缺货' : '添加到订单'">+</button>
          </div>
        </div>
        <div v-else class="qo-empty-hint">{{ productKeyword ? '未找到产品' : '加载产品中...' }}</div>
      </div>

      <!-- 已选产品卡片 -->
      <div class="preview-card" v-if="form.products.length">
        <div class="card-title">📦 已选产品 ({{ form.products.length }})</div>
        <div class="qo-selected-product" v-for="(sp, idx) in form.products" :key="sp.id">
          <div class="qo-sp-top">
            <span class="qo-sp-name">
              <span class="prod-type-tag" :class="sp.productType === 'virtual' ? 'virtual' : 'physical'">{{ sp.productType === 'virtual' ? '虚拟' : '实物' }}</span>
              {{ sp.name }}
              <span v-if="(sp as any).skuName" style="color:#909399;font-size:11px;display:block;margin-top:2px;">规格: {{ (sp as any).skuName }}</span>
            </span>
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

      <!-- SKU选择弹窗 -->
      <div v-if="sidebarSkuVisible" class="preview-card" style="border: 2px solid #409eff; position: relative;">
        <div class="card-title">🏷️ 选择规格 - {{ sidebarSkuProduct?.name }}</div>
        <div v-if="sidebarSkuLoading" style="text-align: center; padding: 20px; color: #909399;">加载SKU中...</div>
        <div v-else-if="sidebarSkuList.length === 0" style="text-align: center; padding: 20px; color: #909399;">暂无可选规格</div>
        <div v-else>
          <div v-for="sku in sidebarSkuList" :key="sku.id" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500;">{{ sku.skuName }}</div>
              <div style="font-size: 12px; color: #909399;">¥{{ Number(sku.price).toFixed(2) }} | 库存: {{ sku.stock }}</div>
            </div>
            <div class="qo-sp-qty" style="display: flex; align-items: center; gap: 4px;">
              <span class="qo-qty-btn" @click="sku._qty = Math.max(0, sku._qty - 1)">－</span>
              <span class="qo-qty-val" style="min-width: 24px; text-align: center;">{{ sku._qty }}</span>
              <span class="qo-qty-btn" @click="sku._qty = Math.min(sku.stock, sku._qty + 1)">＋</span>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="btn-secondary" style="flex: 1; padding: 8px; border: 1px solid #dcdfe6; border-radius: 6px; background: #fff; cursor: pointer;" @click="sidebarSkuVisible = false">取消</button>
          <button class="btn-primary" style="flex: 1; padding: 8px; border: none; border-radius: 6px; background: #409eff; color: #fff; cursor: pointer;" @click="confirmSidebarSku()">确定</button>
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
            <option v-for="opt in orderSourceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
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
            <span class="qo-radio" :class="{ active: form.markType === 'normal', disabled: isPureVirtual }" @click="!isPureVirtual && (form.markType = 'normal')">正常发货单</span>
            <span class="qo-radio" :class="{ active: form.markType === 'reserved', disabled: isPureVirtual }" @click="!isPureVirtual && (form.markType = 'reserved')">预留单</span>
            <span class="qo-radio" :class="{ active: form.markType === 'virtual_delivery', disabled: !hasVirtualProduct }" @click="hasVirtualProduct && (form.markType = 'virtual_delivery')">虚拟发货</span>
          </div>
        </div>
        <div class="form-group">
          <label>订单备注</label>
          <input v-model="form.remark" class="preview-input" placeholder="选填备注信息" />
        </div>
        <!-- 系统自定义订单字段 -->
        <template v-if="orderCustomFields.length">
          <div class="form-group" v-for="cf in orderCustomFields" :key="cf.fieldKey">
            <label>{{ cf.fieldName }} <span class="qo-req" v-if="cf.required">*</span></label>
            <select v-if="cf.fieldType === 'select'" v-model="form.customFields[cf.fieldKey]" class="preview-input">
              <option value="">请选择</option>
              <option v-for="opt in (cf.options || [])" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input v-else-if="cf.fieldType === 'number'" v-model.number="form.customFields[cf.fieldKey]" class="preview-input" type="number" :placeholder="cf.placeholder || '请输入'" />
            <input v-else v-model="form.customFields[cf.fieldKey]" class="preview-input" :placeholder="cf.placeholder || '请输入' + cf.fieldName" />
          </div>
        </template>
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
          <div class="qo-confirm-val">{{ { normal: '正常发货单', reserved: '预留单', virtual_delivery: '虚拟发货' }[form.markType] || '正常发货单' }}</div>
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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
const addressError = ref('')
const receiverPhoneEditing = ref(false)
const phoneEditInput = ref<HTMLInputElement | null>(null)

function startPhoneEdit() {
  form.value.receiverPhone = ''
  receiverPhoneEditing.value = true
  nextTick(() => phoneEditInput.value?.focus())
}

async function confirmPhoneEdit() {
  const phone = form.value.receiverPhone.trim()
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    ElMessage.warning('请输入正确的11位手机号')
    return
  }
  try {
    const res: any = await request.get('/wecom/sidebar/check-phone', {
      params: { phone },
      ...authHeaders.value
    } as any)
    if (res?.data) {
      ElMessage.warning(`该手机号已被客户「${res.data.name || ''}」使用，请更换`)
      return
    }
  } catch { /* 校验失败不阻塞 */ }
  receiverPhoneEditing.value = false
}

function switchToNewCust() {
  custMode.value = 'new'
  form.value.customerId = ''
  form.value.customerName = ''
  form.value.customerPhone = ''
  form.value.receiverName = ''
  form.value.receiverPhone = ''
  form.value.receiverAddress = ''
}

function validateAndNext() {
  addressError.value = ''
  const addr = form.value.receiverAddress.trim()
  if (addr.length < 8) {
    addressError.value = '地址太短，请填写完整的省市区+详细地址'
    return
  }
  const hasProvince = /(省|市|自治区|北京|上海|天津|重庆|广东|浙江|江苏|山东|河北|河南|四川|湖北|湖南|福建|安徽|辽宁|陕西|江西|广西|云南|贵州|山西|吉林|黑龙|内蒙|新疆|甘肃|海南|宁夏|青海|西藏)/
  const hasDetail = /(路|街|巷|号|栋|楼|室|区|镇|村|园|城|大厦|小区|社区)/
  if (!hasProvince.test(addr)) {
    addressError.value = '请填写省/市信息，如：广东广州天河区...'
    return
  }
  if (!hasDetail.test(addr)) {
    addressError.value = '请填写详细地址，如：XX路XX号'
    return
  }
  step.value = 2
}

const productKeyword = ref('')
const productList = ref<any[]>([])
const productLoading = ref(false)

const submitting = ref(false)
const resultOrderNo = ref('')
const newCustSaving = ref(false)
const phoneExists = ref(false)
const phoneChecking = ref(false)
const phoneVerifyResult = ref<'' | 'ok' | 'exists'>('')
const phoneExistOwner = ref('')
const existingCustomer = ref<any>(null)

const newCust = ref({ phone: '', name: '', gender: '', address: '', age: null as number | null, source: 'wecom', customFields: {} as Record<string, any> })

function isCustFieldEnabled(key: string): boolean {
  const vis = customerFieldConfig.value?.fieldVisibility?.[key]
  return vis ? vis.enabled !== false : true
}
function isCustFieldRequired(key: string): boolean {
  const vis = customerFieldConfig.value?.fieldVisibility?.[key]
  return vis?.required === true
}

function autoVerifyPhone() {
  if (newCust.value.phone && newCust.value.phone.length >= 11 && phoneVerifyResult.value === '') {
    verifyPhone()
  }
}

async function verifyPhone() {
  if (!newCust.value.phone || newCust.value.phone.length < 11) return
  phoneChecking.value = true
  phoneVerifyResult.value = ''
  try {
    const res: any = await request.get('/wecom/sidebar/check-phone', {
      params: { phone: newCust.value.phone },
      ...authHeaders.value
    } as any)
    if (res?.data) {
      phoneVerifyResult.value = 'exists'
      phoneExistOwner.value = res.data.salesPersonName || res.data.name || '其他成员'
      existingCustomer.value = res.data
      phoneExists.value = true
    } else {
      phoneVerifyResult.value = 'ok'
      phoneExists.value = false
      existingCustomer.value = null
    }
  } catch { phoneVerifyResult.value = '' }
  phoneChecking.value = false
}

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
  markType: 'normal' as 'normal' | 'reserved' | 'virtual_delivery',
  remark: '',
  customFields: {} as Record<string, any>
})

const paymentMethods = ref([
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝支付', value: 'alipay' },
  { label: '银行转账', value: 'bank_transfer' },
  { label: '货到付款', value: 'cod' },
  { label: '其他', value: 'other' }
])

const expressCompanyList = ref<any[]>([])
const orderSourceOptions = ref<any[]>([])
const orderCustomFields = ref<any[]>([])
const customerFieldConfig = ref<any>({})

async function loadSystemConfigs() {
  try {
    const [orderCfg, expressCfg, custCfg] = await Promise.all([
      request.get('/wecom/sidebar/order-field-config', authHeaders.value as any).catch(() => null),
      request.get('/wecom/sidebar/express-companies', authHeaders.value as any).catch(() => null),
      request.get('/wecom/sidebar/customer-field-config', authHeaders.value as any).catch(() => null)
    ])
    // 订单来源选项
    const oCfg = orderCfg?.data || orderCfg || {}
    if (oCfg?.orderSource?.options?.length) {
      orderSourceOptions.value = oCfg.orderSource.options
    }
    if (oCfg?.customFields?.length) {
      orderCustomFields.value = oCfg.customFields.filter((f: any) => f.fieldKey && f.fieldName)
    }
    // 快递公司
    const eCfg = expressCfg?.data || expressCfg || []
    if (Array.isArray(eCfg) && eCfg.length > 0) {
      expressCompanyList.value = eCfg
    }
    // 客户配置
    const cCfg = custCfg?.data || custCfg || {}
    if (cCfg.fieldVisibility || cCfg.customFields) {
      customerFieldConfig.value = cCfg
    }
  } catch { /* ignore */ }
  // 兜底默认值（与CRM系统订单配置保持一致）
  if (!orderSourceOptions.value.length) {
    orderSourceOptions.value = [
      { label: '线上商城', value: 'online_store' },
      { label: '微信小程序', value: 'wechat_mini' },
      { label: '电话咨询', value: 'phone_call' },
      { label: '其他渠道', value: 'other' }
    ]
  }
  if (!expressCompanyList.value.length) {
    expressCompanyList.value = [
      { code: 'SF', name: '顺丰速运' }, { code: 'YTO', name: '圆通速递' },
      { code: 'ZTO', name: '中通快递' }, { code: 'YD', name: '韵达速递' },
      { code: 'STO', name: '申通快递' }, { code: 'JTSD', name: '极兔速递' }
    ]
  }
}


// ========== 计算属性 ==========
const subtotal = computed(() => form.value.products.reduce((sum, p) => sum + p.price * p.quantity, 0))
const collectAmount = computed(() => Math.max(Number(form.value.totalAmount || 0) - Number(form.value.depositAmount || 0), 0))
const orderSourceLabel = computed(() => orderSourceOptions.value.find((o: any) => o.value === form.value.orderSource)?.label || form.value.orderSource || '-')

const maskPhone = (p: string) => {
  if (!p || p.length < 7) return p || '-'
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const receiverPhoneMasked = computed(() => maskPhone(form.value.receiverPhone))

/** 是否显示返回客户详情按钮（从客户详情跳过来时显示） */
const showBackToDetail = computed(() => !!props.customerData)

const goStep = (s: number) => { step.value = s }

/** 返回侧边栏的CRM客户详情页 */
const goBackToDetail = () => {
  // 通过自定义事件通知父组件切换tab
  window.dispatchEvent(new CustomEvent('sidebar-switch-tab', { detail: { tab: 'customer' } }))
}


const hasVirtualProduct = computed(() => form.value.products.some(p => (p as any).productType === 'virtual'))
const isPureVirtual = computed(() => form.value.products.length > 0 && form.value.products.every(p => (p as any).productType === 'virtual'))

watch(isPureVirtual, (val) => {
  if (val) form.value.markType = 'virtual_delivery'
  else if (form.value.markType === 'virtual_delivery') form.value.markType = 'normal'
})

const syncTotal = () => {
  form.value.totalAmount = subtotal.value
}

// ========== 搜索客户 ==========
let searchTimer: any = null
const searchCustomers = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    custLoading.value = true
    try {
      const res: any = await request.get('/wecom/sidebar/search-customers', {
        params: { keyword: custKeyword.value || '' },
        ...authHeaders.value
      } as any)
      custList.value = res?.data || res || []
    } catch { custList.value = [] }
    custLoading.value = false
  }, custKeyword.value ? 300 : 0)
}

const selectCustomer = (c: any) => {
  form.value.customerId = c.id
  form.value.customerName = c.name || ''
  form.value.customerPhone = c.phone || ''
  form.value.receiverName = c.name || ''
  form.value.receiverPhone = c.phone || ''
  form.value.receiverAddress = parseAddress(c.address)
  receiverPhoneEditing.value = false
  custList.value = []
  custKeyword.value = ''
}

/** 解析地址：支持JSON数组格式和纯字符串 */
function parseAddress(addr: any): string {
  if (!addr) return ''
  if (typeof addr === 'string') {
    // 尝试解析JSON数组格式 [{"id":xxx,"content":"地址"}]
    if (addr.startsWith('[') || addr.startsWith('{')) {
      try {
        const parsed = JSON.parse(addr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 取最后一条（最新的）地址记录
          const latest = parsed[parsed.length - 1]
          return latest.content || latest.address || latest.value || ''
        }
        if (typeof parsed === 'object' && parsed.content) {
          return parsed.content
        }
      } catch { /* 不是JSON，当做普通字符串 */ }
    }
    return addr
  }
  if (Array.isArray(addr) && addr.length > 0) {
    const latest = addr[addr.length - 1]
    return latest?.content || latest?.address || ''
  }
  return String(addr || '')
}

const clearCustomer = () => {
  form.value.customerId = ''
  form.value.customerName = ''
  form.value.customerPhone = ''
  form.value.receiverName = ''
  form.value.receiverPhone = ''
  form.value.receiverAddress = ''
  receiverPhoneEditing.value = false
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

// ========== 图片处理 ==========
function getProductImage(p: any): string {
  const img = p.image || p.imageUrl || p.thumbnail || ''
  if (!img) return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#f0f2f5"/><text x="24" y="28" text-anchor="middle" font-size="12" fill="#c0c4cc">📦</text></svg>')
  return img
}
function handleImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#f0f2f5"/><text x="24" y="28" text-anchor="middle" font-size="12" fill="#c0c4cc">📦</text></svg>')
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

// ===== SKU选择（侧边栏） =====
const sidebarSkuVisible = ref(false)
const sidebarSkuProduct = ref<any>(null)
const sidebarSkuList = ref<any[]>([])
const sidebarSkuLoading = ref(false)

const openSidebarSkuDialog = async (p: any) => {
  sidebarSkuProduct.value = p
  sidebarSkuLoading.value = true
  sidebarSkuVisible.value = true
  try {
    const res: any = await request.get(`/products/${p.id}/skus`, {
      params: { pageSize: 100, status: 'active' },
      ...authHeaders.value
    } as any)
    const data = res?.data || res
    const list = data?.list || data || []
    sidebarSkuList.value = list.filter((s: any) => s.stock > 0).map((s: any) => {
      const existing = form.value.products.find(x => (x as any).skuId === s.id)
      return { ...s, _qty: existing ? existing.quantity : 0 }
    })
  } catch {
    sidebarSkuList.value = []
  } finally {
    sidebarSkuLoading.value = false
  }
}

const confirmSidebarSku = () => {
  if (!sidebarSkuProduct.value) return
  const p = sidebarSkuProduct.value
  const selected = sidebarSkuList.value.filter(s => s._qty > 0)
  if (selected.length === 0) {
    ElMessage.warning('请选择数量')
    return
  }

  form.value.products = form.value.products.filter(x => !((x as any).skuId && x.id === p.id))

  selected.forEach(sku => {
    form.value.products.push({
      id: p.id,
      name: p.name,
      price: Number(sku.price) || 0,
      quantity: sku._qty,
      stock: sku.stock,
      image: sku.skuImage || p.image || '',
      productType: p.productType || 'physical',
      skuId: sku.id,
      skuName: sku.skuName,
      sku: sku.skuName
    } as any)
  })
  syncTotal()
  sidebarSkuVisible.value = false
  ElMessage.success(`已添加 ${selected.length} 个SKU`)
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
      image: p.image || p.imageUrl || p.thumbnail || '',
      productType: p.productType || 'physical'
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
  // 优先尝试 Clipboard API
  if (navigator.clipboard?.read) {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        const imageType = item.types.find((t: string) => t.startsWith('image/'))
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
      return
    } catch { /* Clipboard API不可用，降级处理 */ }
  }
  // 降级：提示用户使用Ctrl+V
  ElMessage.info('请按Ctrl+V粘贴截图，或使用上传按钮')
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
      customerName: form.value.customerName,
      customerPhone: form.value.customerPhone,
      products: form.value.products.map(p => ({
        id: p.id, name: p.name, price: p.price, quantity: p.quantity,
        image: (p as any).image || '', productType: (p as any).productType || 'physical', sku: (p as any).sku || '',
        skuId: (p as any).skuId || null, skuName: (p as any).skuName || null
      })),
      totalAmount: Number(form.value.totalAmount) || subtotal.value,
      depositAmount: Number(form.value.depositAmount) || 0,
      paymentMethod: form.value.paymentMethod,
      paymentMethodOther: (form.value as any).paymentMethodOther || '',
      remark: form.value.remark,
      receiverName: form.value.receiverName,
      receiverPhone: form.value.receiverPhone,
      receiverAddress: form.value.receiverAddress,
      serviceWechat: form.value.serviceWechat,
      orderSource: form.value.orderSource,
      expressCompany: form.value.expressCompany,
      markType: form.value.markType,
      depositScreenshots: form.value.depositScreenshots || []
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
    expressCompany: '', markType: 'normal', remark: '',
    customFields: {}
  }
  resultOrderNo.value = ''
  custKeyword.value = ''
  custList.value = []
  newCust.value = { phone: '', name: '', gender: '', address: '', age: null, source: 'wecom', customFields: {} }
  phoneExists.value = false
}

// ========== 自动填充客户（仅当前对话框客户已关联CRM且有权限时） ==========
function shouldAutoFillCustomer(): boolean {
  return !!(props.customerData?.crmCustomer && props.customerData?.canAccess === true)
}

function autoFillCustomer() {
  if (!shouldAutoFillCustomer()) {
    autoMatchedCustomer.value = null
    if (form.value.customerId) clearCustomer()
    return
  }
  const crm = props.customerData!.crmCustomer
  autoMatchedCustomer.value = crm
  selectCustomer({ id: crm.id, name: crm.name, phone: crm.phone, address: crm.address })
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
  loadSystemConfigs()
  initProducts()
  autoFillCustomer()
  document.addEventListener('paste', handleGlobalPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', handleGlobalPaste)
})

watch(() => props.customerData, () => {
  autoFillCustomer()
})
</script>

<style scoped>
.sidebar-quick-order { padding: 0 0 12px; background: #f5f6f7; min-height: 100%; color: #303133; }
.qo-back-bar { padding: 6px 8px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.qo-back-btn { border: none; background: transparent; color: #4c6ef5; font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
.qo-back-btn:hover { background: #f0f4ff; }
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
.qo-selected-inline { display: flex; align-items: center; gap: 6px; padding: 8px 10px; margin-top: 8px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fafafa; cursor: pointer; }
.qo-selected-inline .qo-selected-name { font-size: 13px; font-weight: 600; color: #303133; }
.qo-selected-inline .qo-selected-phone { font-size: 11px; color: #909399; }
.qo-match-badge { font-size: 11px; color: #67c23a; font-weight: 600; margin-bottom: 4px; }

/* 新建客户 */
.qo-new-form { max-height: 340px; overflow-y: auto; }
.qo-new-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.qo-req { color: #f56c6c; font-weight: 700; }
.qo-field-hint { font-size: 10px; margin-top: 2px; }
.qo-field-hint.warn { color: #e6a23c; }
.qo-field-hint.ok { color: #67c23a; }
.verify-btn { padding: 6px 12px; border: 1px solid #07c160; border-radius: 6px; background: #fff; color: #07c160; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.verify-btn:hover { background: #f0fdf4; }
.verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
.qo-add-btn:disabled { background: #dcdfe6; cursor: not-allowed; opacity: 0.6; }
.qo-product-item.out-of-stock { opacity: 0.6; }
.qo-prod-stock.no-stock { color: #f56c6c; }
.prod-type-tag { display: inline-block; padding: 0 4px; border-radius: 2px; font-size: 9px; font-weight: 600; vertical-align: middle; margin-right: 2px; }
.prod-type-tag.physical { background: #e8f5e9; color: #4caf50; }
.prod-type-tag.virtual { background: #e3f2fd; color: #1976d2; }
.qo-radio.disabled { opacity: 0.4; cursor: not-allowed; }

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

<template>
  <div class="order-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>{{ isEdit ? '编辑订单' : '新增订单' }}
        <el-tooltip v-if="(userStore.isAdmin || userStore.isSuperAdmin) && !isEdit" content="订单字段设置" placement="right">
          <el-icon class="order-settings-link" @click="goToOrderSettings" style="cursor: pointer; margin-left: 8px; font-size: 18px; color: #409eff; vertical-align: middle;"><Setting /></el-icon>
        </el-tooltip>
      </h2>
    </div>

    <el-form :model="orderForm" :rules="formRules" ref="orderFormRef" label-width="120px">
      <!-- 客户选择区域 -->
      <el-card class="customer-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon><User /></el-icon>
              <span>客户信息</span>
            </div>
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="选择客户" prop="customerId" required>
              <div class="customer-select-wrapper">
                <el-select
                  v-model="orderForm.customerId"
                  placeholder="请选择客户"
                  style="flex: 1"
                  filterable
                  remote
                  :remote-method="searchCustomers"
                  :loading="customerLoading"
                  @change="handleCustomerChange"
                  size="large"
                >
                  <el-option
                    v-for="customer in customerOptions"
                    :key="customer.id"
                    :label="`${customer.name} (${displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '')})`"
                    :value="customer.id"
                  />
                </el-select>
                <!-- 🔥 配额查看图标按钮 -->
                <el-tooltip
                  v-if="orderLimitResult?.hasLimit"
                  content="查看下单配额详情"
                  placement="top"
                >
                  <el-icon
                    class="limit-info-icon"
                    :class="{ 'is-exceeded': orderLimitExceeded }"
                    @click="orderLimitDialogVisible = true"
                  >
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
              <!-- 🔥 内联限制提示文字 -->
              <div v-if="orderLimitResult?.hasLimit && orderLimitResult.details" class="limit-inline-hint" :class="{ 'is-exceeded': orderLimitExceeded }">
                <span class="limit-dot"></span>
                <template v-if="orderLimitExceeded">
                  <span v-if="orderLimitResult.details.orderCountEnabled && orderLimitResult.details.orderCountExceeded">已下{{ orderLimitResult.details.orderCount }}/{{ orderLimitResult.details.maxOrderCount }}次 </span>
                  <span v-if="orderLimitResult.details.totalAmountEnabled && orderLimitResult.details.totalAmountExceeded">累计¥{{ Number(orderLimitResult.details.totalAmount).toFixed(0) }}/¥{{ Number(orderLimitResult.details.maxTotalAmount).toFixed(0) }} </span>
                  <span>超出限制</span>
                </template>
                <template v-else>
                  <span v-if="orderLimitResult.details.orderCountEnabled">剩{{ orderLimitResult.details.maxOrderCount - orderLimitResult.details.orderCount }}次 </span>
                  <span v-if="orderLimitResult.details.totalAmountEnabled">余¥{{ Number(orderLimitResult.details.remainingAmount).toFixed(0) }} </span>
                  <span v-if="orderLimitResult.details.singleAmountEnabled">单笔≤¥{{ Number(orderLimitResult.details.maxSingleAmount).toFixed(0) }}</span>
                </template>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客服微信号" prop="serviceWechat" required>
              <el-input
                v-model="orderForm.serviceWechat"
                placeholder="请输入负责客服的微信号"
                clearable
              >
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="fieldConfigStore.orderSourceFieldName" prop="orderSource" required>
              <el-select
                v-model="orderForm.orderSource"
                :placeholder="`请选择${fieldConfigStore.orderSourceFieldName}`"
                style="width: 100%"
              >
                <el-option
                  v-for="option in fieldConfigStore.orderSourceOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 收货信息（虚拟发货订单时非必填但仍显示） -->
        <div v-if="selectedCustomer" class="delivery-info">
          <h4>收货信息 <el-tag v-if="orderForm.markType === 'virtual_delivery'" type="info" size="small" style="margin-left: 8px;">虚拟商品可选填</el-tag></h4>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="收货人" prop="receiverName">
                <el-input
                  v-model="orderForm.receiverName"
                  placeholder="请输入收货人姓名"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="收货电话" prop="receiverPhone">
                <div class="phone-management">
                  <!-- 🔥 修复：收货电话下拉框显示加密手机号 -->
                  <el-select
                    v-model="selectedPhoneId"
                    placeholder="请选择收货电话"
                    style="width: 100%"
                    clearable
                    @change="handlePhoneSelect"
                  >
                    <el-option
                      v-for="phone in customerPhones"
                      :key="phone.id"
                      :label="displaySensitiveInfoNew(phone.number, SensitiveInfoType.PHONE) + (phone.remark ? ` (${phone.remark})` : '')"
                      :value="phone.id"
                    />
                  </el-select>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showAddPhoneDialog = true"
                    style="margin-left: 8px;"
                    :icon="Plus"
                  >
                    新增
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="指定快递" prop="expressCompany" :required="orderForm.markType !== 'virtual_delivery'">
                <el-select
                  v-model="orderForm.expressCompany"
                  placeholder="请选择快递公司"
                  style="width: 100%"
                  :loading="expressCompanyLoading"
                >
                  <el-option
                    v-for="company in expressCompanyList"
                    :key="company.code"
                    :label="company.name"
                    :value="company.code"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <el-form-item label="收货地址" prop="receiverAddress">
                <el-select
                  v-if="customerAddresses.length > 0"
                  v-model="orderForm.receiverAddress"
                  placeholder="选择客户地址或手动输入"
                  style="width: 100%"
                  filterable
                  allow-create
                  default-first-option
                  clearable
                  class="address-select-dropdown"
                  :suffix-icon="ArrowDown"
                >
                  <el-option
                    v-for="addr in customerAddresses"
                    :key="addr.id"
                    :label="addr.content"
                    :value="addr.content"
                  />
                </el-select>
                <el-input
                  v-else
                  v-model="orderForm.receiverAddress"
                  placeholder="请输入详细收货地址"
                  clearable
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 自定义字段 -->
      <CustomFieldsCard v-model="orderForm.customFields" :show="!!selectedCustomer" />

      <!-- 产品搜索和选择区域 -->
      <el-card class="product-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon><ShoppingBag /></el-icon>
              <span>产品选择</span>
            </div>
            <el-button
              type="primary"
              size="small"
              :icon="Refresh"
              @click="handleRefreshProducts"
              title="刷新商品列表"
            >
              刷新
            </el-button>
          </div>
        </template>

        <!-- 产品搜索 -->
        <div class="product-search">
          <el-input
            v-model="productSearchKeyword"
            placeholder="搜索产品名称、编号..."
            size="large"
            clearable
            @input="handleProductSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 产品列表 -->
        <div class="product-list">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-item"
            @click="addProduct(product)"
          >
            <div class="product-image">
              <img :src="product.image || '/default-product.png'" :alt="product.name" />
            </div>
            <div class="product-info">
              <div class="product-name">
                <el-tag v-if="product.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
                <el-tag v-else size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
                {{ product.name }}
              </div>
              <div class="product-price-stock">
                <span class="product-price">¥{{ product.price }}</span>
                <span class="product-stock">库存: {{ product.stock }}</span>
              </div>
              <div class="product-badges" v-if="product.isRecommended || product.isNew || product.isHot">
                <el-tag v-if="product.isRecommended" type="warning" size="small" effect="light">
                  ⭐ 推荐
                </el-tag>
                <el-tag v-if="product.isNew" type="success" size="small" effect="light">
                  🆕 新品
                </el-tag>
                <el-tag v-if="product.isHot" type="danger" size="small" effect="light">
                  🔥 热销
                </el-tag>
              </div>
            </div>
            <div class="product-actions">
              <el-button
                type="info"
                size="small"
                :icon="View"
                @click.stop="viewProductDetail(product)"
                title="查看商品详情"
              >
                详情
              </el-button>
              <el-button type="primary" size="small" :icon="Plus">添加</el-button>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 订单汇总区域 -->
      <el-card class="summary-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon><Money /></el-icon>
              <span>订单汇总</span>
            </div>
          </div>
        </template>

        <!-- 已选商品列表 -->
        <div class="selected-products" v-if="orderForm.products.length > 0">
          <h4>已选商品</h4>
          <el-table :data="orderForm.products" style="width: 100%">
            <el-table-column prop="name" label="商品名称" min-width="200">
              <template #default="{ row }">
                <div class="selected-product-name">
                  <div class="selected-product-name-row">
                    <el-tag v-if="row.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
                    <el-tag v-else size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
                    <span style="font-weight: 600;">{{ row.name }}</span>
                  </div>
                  <div class="selected-product-tags">
                    <el-tag v-if="row.isRecommended" type="warning" size="small" effect="light">
                      ⭐ 推荐
                    </el-tag>
                    <el-tag v-if="row.isNew" type="success" size="small" effect="light">
                      🆕 新品
                    </el-tag>
                    <el-tag v-if="row.isHot" type="danger" size="small" effect="light">
                      🔥 热销
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="单价" width="100">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: 600;">¥{{ row.price }}</span>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="150">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  :max="row.stock"
                  size="small"
                  @change="calculateTotal"
                />
              </template>
            </el-table-column>
            <el-table-column label="小计" width="100">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: 600;">¥{{ ((row.price || 0) * (row.quantity || 0)).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="removeProduct($index)"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 金额汇总 - 简约现代化布局 -->
        <div class="amount-summary-modern">
          <!-- 第一行：商品小计、订单总额（输入框）、定金（输入框） -->
          <div class="amount-row">
            <div class="amount-field">
              <span class="field-label">商品小计</span>
              <span class="field-amount subtotal">¥{{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="amount-field">
              <span class="field-label">
                订单总额
                <el-tooltip content="点击同步商品小计" placement="top" v-if="isManuallyModified">
                  <el-button
                    type="text"
                    size="small"
                    :icon="Refresh"
                    @click="resetToSubtotal"
                    class="sync-button"
                  />
                </el-tooltip>
              </span>
              <el-input-number
                v-model="orderForm.totalAmount"
                :min="0"
                :max="subtotal"
                :precision="2"
                placeholder="订单总额"
                class="field-input"
                @change="handleTotalAmountChange"
              />
            </div>
            <div class="amount-field">
              <span class="field-label">定金</span>
              <el-input-number
                v-model="orderForm.depositAmount"
                :min="0"
                :max="orderForm.totalAmount || 0"
                :precision="2"
                placeholder="定金金额"
                class="field-input"
                @change="calculateCollectAmount"
              />
            </div>
            <div class="amount-field">
              <span class="field-label">支付方式 <span class="required-star">*</span></span>
              <div class="payment-method-wrapper">
                <el-select
                  v-model="orderForm.paymentMethod"
                  placeholder="请选择支付方式"
                  class="field-input"
                  style="width: 140px;"
                  @change="handlePaymentMethodChange"
                >
                  <el-option
                    v-for="method in paymentMethods"
                    :key="method.value"
                    :label="method.label"
                    :value="method.value"
                  />
                </el-select>
                <el-input
                  v-if="orderForm.paymentMethod === 'other'"
                  v-model="orderForm.paymentMethodOther"
                  placeholder="请输入支付方式"
                  style="width: 140px; margin-left: 8px;"
                />
              </div>
            </div>
          </div>

          <!-- 第二行：代收金额、优惠金额、支付方式备注、定金截图 -->
          <div class="amount-row">
            <div class="amount-field">
              <span class="field-label">代收金额</span>
              <span class="field-amount collect">¥{{ collectAmount.toFixed(2) }}</span>
            </div>
            <div class="amount-field">
              <span class="field-label">优惠金额</span>
              <div class="discount-horizontal">
                <span class="field-amount discount">¥{{ discountAmount.toFixed(2) }}</span>
                <span class="discount-percent" v-if="discountAmount > 0">
                  ({{ discountPercentage.toFixed(1) }}%)
                </span>
              </div>
            </div>
            <div class="amount-field screenshot-field">
              <span class="field-label">定金截图</span>
              <div class="screenshot-buttons">
                <el-button type="primary" size="small" :icon="Upload" @click="triggerUpload">
                  上传截图
                </el-button>
                <el-button type="success" size="small" :icon="DocumentCopy" @click="pasteImage">
                  粘贴图片
                </el-button>
              </div>
              <div class="screenshot-content">
                <!-- 图片缩略图列表 -->
                <div class="screenshot-thumbnails" v-if="depositScreenshots.length > 0">
                  <div
                    v-for="(screenshot, index) in depositScreenshots"
                    :key="index"
                    class="thumbnail-item"
                    @mouseenter="showZoomIcon = index"
                    @mouseleave="showZoomIcon = -1"
                    @click="previewImage(screenshot)"
                  >
                    <img :src="screenshot" alt="定金截图" />
                    <!-- 悬停时显示放大图标 -->
                    <div class="thumbnail-overlay" v-show="showZoomIcon === index">
                      <el-icon class="zoom-icon"><ZoomIn /></el-icon>
                    </div>
                    <!-- 删除图标 -->
                    <div class="thumbnail-delete" @click.stop="removeScreenshot(index)">
                      <el-icon><Delete /></el-icon>
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="handleFileSelect"
              />
            </div>
          </div>
        </div>



        <!-- 订单标记 -->
        <div class="mark-section">
          <h4>订单标记</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="订单类型" prop="markType" required>
                <el-radio-group v-model="orderForm.markType" @change="handleMarkTypeChange">
                  <el-radio label="normal" :disabled="isAllVirtualProducts">
                    <el-tag type="success" size="small" :class="{ 'is-disabled-tag': isAllVirtualProducts }">正常发货单</el-tag>
                  </el-radio>
                  <el-radio label="reserved" :disabled="isAllVirtualProducts">
                    <el-tag type="warning" size="small" :class="{ 'is-disabled-tag': isAllVirtualProducts }">预留单</el-tag>
                  </el-radio>
                  <el-radio v-if="hasVirtualProducts" label="virtual_delivery">
                    <el-tag type="primary" size="small">虚拟发货</el-tag>
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <div class="mark-description">
                <el-alert
                  v-if="orderForm.markType === 'reserved'"
                  title="预留单说明"
                  description="预留单将保留在下单人处，不会流转到审核员。需要修改为正常发货单后才会进入审核流程。"
                  type="warning"
                  :closable="false"
                  show-icon
                />
                <el-alert
                  v-else-if="orderForm.markType === 'virtual_delivery'"
                  title="虚拟发货单"
                  description="虚拟商品订单，无需物流发货，审核通过后将通过卡密/资源等方式交付。"
                  type="info"
                  :closable="false"
                  show-icon
                />
                <el-alert
                  v-else
                  title="正常发货单"
                  description="订单将按正常流程进行审核和发货处理。"
                  type="success"
                  :closable="false"
                  show-icon
                />
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 备注信息 -->
        <div class="remark-section">
          <el-form-item label="订单备注">
            <el-input
              v-model="orderForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入订单备注信息"
            />
          </el-form-item>
        </div>

        <!-- 操作按钮 -->
        <div class="form-footer">
          <el-button @click="handleCancel" size="large">取消</el-button>
          <el-button @click="handleSaveOrder" type="primary" size="large" :loading="saving" :disabled="orderLimitExceeded">
            {{ orderLimitExceeded ? '下单受限' : '保存订单' }}
          </el-button>
          <span v-if="orderLimitExceeded" class="limit-exceeded-tip">
            <span class="limit-dot" style="background:#f56c6c"></span>
            <span style="color: #f56c6c; font-size: 12px;">超出部门下单限制</span>
          </span>
        </div>
      </el-card>
    </el-form>

    <!-- 订单确认弹窗 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="订单确认"
      width="600px"
      :before-close="handleCloseConfirm"
    >
      <div class="order-confirm">
        <h4>请确认以下订单信息：</h4>

        <div class="confirm-section customer-info">
          <h5>客户信息</h5>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">客户：</span>
              <span class="value">{{ selectedCustomer?.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">电话：</span>
              <span class="value">{{ selectedCustomer?.phone ? displaySensitiveInfoNew(selectedCustomer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') : '' }}</span>
            </div>
            <div class="info-item" v-if="orderForm.receiverName">
              <span class="label">收货人：</span>
              <span class="value">{{ orderForm.receiverName }}</span>
            </div>
            <div class="info-item" v-if="orderForm.receiverAddress">
              <span class="label">收货地址：</span>
              <span class="value">{{ orderForm.receiverAddress }}</span>
            </div>
            <div class="info-item" v-if="orderForm.expressCompany && orderForm.markType !== 'virtual_delivery'">
              <span class="label">快递公司：</span>
              <span class="value">{{ getExpressCompanyText(orderForm.expressCompany) }}</span>
            </div>
            <div v-if="orderForm.markType === 'virtual_delivery'" class="info-item">
              <span class="label">发货方式：</span>
              <span class="value" style="color: #409EFF;">虚拟发货（卡密/资源交付）</span>
            </div>
          </div>
        </div>

        <div class="confirm-section order-mark">
          <h5>订单标记</h5>
          <div class="mark-content">
            <div class="mark-item">
              <span class="label">订单类型：</span>
              <el-tag
                :type="orderForm.markType === 'normal' ? 'success' : orderForm.markType === 'virtual_delivery' ? 'primary' : 'warning'"
                size="small"
              >
                {{ orderForm.markType === 'normal' ? '正常发货单' : orderForm.markType === 'virtual_delivery' ? '虚拟发货' : '预留单' }}
              </el-tag>
            </div>
            <div v-if="orderForm.markType === 'reserved'" class="mark-note">
              * 预留单将保留在您处，不会流转到审核员
            </div>
            <div v-if="orderForm.markType === 'virtual_delivery'" class="mark-note">
              * 虚拟商品订单，审核通过后将通过卡密/资源等方式交付
            </div>
          </div>
        </div>

        <div class="confirm-section amount-info">
          <h5>金额汇总</h5>
          <div class="amount-summary-two-columns">
            <!-- 第一列：基础金额信息 -->
            <div class="amount-column basic-amounts">
              <div class="amount-item">
                <span class="label">商品小计</span>
                <span class="value">¥{{ subtotal.toFixed(2) }}</span>
              </div>
              <div class="amount-item">
                <span class="label">优惠金额</span>
                <div class="discount-info">
                  <span class="value discount">¥{{ discountAmount.toFixed(2) }}</span>
                  <span class="discount-percent" v-if="discountAmount > 0">
                    ({{ discountPercentage.toFixed(1) }}%)
                  </span>
                </div>
              </div>
            </div>

            <!-- 第二列：重要金额信息（带颜色标识） -->
            <div class="amount-column important-amounts">
              <div class="amount-item highlight total-amount">
                <span class="label">订单总额</span>
                <span class="value">¥{{ (orderForm.totalAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="amount-item highlight deposit-amount">
                <span class="label">定金</span>
                <span class="value">¥{{ (orderForm.depositAmount || 0).toFixed(2) }}</span>
              </div>
              <div class="amount-item highlight collect-amount">
                <span class="label">代收金额</span>
                <span class="value">¥{{ collectAmount.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="confirm-section product-info">
          <h5>商品信息</h5>
          <el-table :data="orderForm.products" size="small">
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="price" label="单价" width="80">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="60" />
            <el-table-column label="小计" width="80">
              <template #default="{ row }">¥{{ ((row.price || 0) * (row.quantity || 0)).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitOrder" :loading="submitting" :disabled="orderLimitExceeded">
            {{ orderLimitExceeded ? '下单受限' : '确认提交审核' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增手机号对话框 -->
    <el-dialog
      v-model="showAddPhoneDialog"
      title="新增手机号"
      width="400px"
      :before-close="handleCloseAddPhoneDialog"
    >
      <el-form
        ref="addPhoneFormRef"
        :model="addPhoneForm"
        :rules="addPhoneRules"
        label-width="80px"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="addPhoneForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addPhoneForm.remark"
            placeholder="请输入备注（可选）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAddPhoneDialog">取消</el-button>
          <el-button type="primary" @click="handleAddPhone" :loading="addingPhone">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 🔥 部门下单限制详情弹窗（点击图标打开） -->
    <el-dialog
      v-model="orderLimitDialogVisible"
      :title="orderLimitExceeded ? '⚠️ 下单限制已超出' : '📋 下单配额详情'"
      width="520px"
    >
      <div class="order-limit-dialog" v-if="orderLimitResult?.details">
        <el-alert
          v-if="orderLimitExceeded"
          title="当前客户在本部门的下单限制已超出，无法提交订单"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        />
        <el-alert
          v-else
          title="当前客户在本部门有下单限制，请注意以下配额信息"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        />

        <el-descriptions :column="2" border size="default">
          <!-- 下单次数 -->
          <template v-if="orderLimitResult.details.orderCountEnabled">
            <el-descriptions-item label="已下次数" :span="1">
              <el-tag :type="orderLimitResult.details.orderCountExceeded ? 'danger' : 'info'" size="default">
                {{ orderLimitResult.details.orderCount }} 次
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="可下次数" :span="1">
              <el-tag type="success" size="default">
                {{ orderLimitResult.details.maxOrderCount }} 次
              </el-tag>
            </el-descriptions-item>
          </template>

          <!-- 累计金额 -->
          <template v-if="orderLimitResult.details.totalAmountEnabled">
            <el-descriptions-item label="已下金额" :span="1">
              <el-tag :type="orderLimitResult.details.totalAmountExceeded ? 'danger' : 'info'" size="default">
                ¥{{ Number(orderLimitResult.details.totalAmount).toFixed(2) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="可下金额" :span="1">
              <el-tag type="success" size="default">
                ¥{{ Number(orderLimitResult.details.maxTotalAmount).toFixed(2) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="剩余额度" :span="2">
              <el-tag :type="orderLimitResult.details.remainingAmount <= 0 ? 'danger' : 'warning'" size="default">
                ¥{{ Number(orderLimitResult.details.remainingAmount).toFixed(2) }}
              </el-tag>
            </el-descriptions-item>
          </template>

          <!-- 单笔金额 -->
          <template v-if="orderLimitResult.details.singleAmountEnabled">
            <el-descriptions-item label="当前单笔金额" :span="1">
              <el-tag :type="(orderForm.totalAmount > orderLimitResult.details.maxSingleAmount) ? 'danger' : 'info'" size="default">
                ¥{{ (orderForm.totalAmount || 0).toFixed(2) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最高单笔金额" :span="1">
              <el-tag type="success" size="default">
                ¥{{ Number(orderLimitResult.details.maxSingleAmount).toFixed(2) }}
              </el-tag>
            </el-descriptions-item>
          </template>
        </el-descriptions>

        <div v-if="orderLimitExceeded" style="margin-top: 16px; text-align: center;">
          <el-text type="danger" size="default" tag="b">
            提交按钮已锁定，请联系管理员调整限制配置
          </el-text>
        </div>
      </div>

      <template #footer>
        <el-button @click="orderLimitDialogVisible = false" type="primary">
          知道了
        </el-button>
      </template>
    </el-dialog>

    <!-- 图片查看器 -->
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="currentImageList"
      @close="showImageViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import {
  User, Message, Location, ShoppingBag, Search, Plus,
  Delete, Money, Upload, Check, DocumentCopy, ZoomIn, Refresh, View, InfoFilled, Warning, Setting, ArrowDown
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { useProductStore } from '@/stores/product'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { createSafeNavigator } from '@/utils/navigation'
import CustomFieldsCard from '@/components/Order/CustomFieldsCard.vue'
import { orderApi } from '@/api/order'
import type { DepartmentLimitCheckResult } from '@/api/order'
import { customerDetailApi } from '@/api/customerDetail'
import { getAddressLabel } from '@/utils/addressData'

// 接口定义
interface Product {
  id: string
  name: string
  code: string
  price: number
  originalPrice: number
  stock: number
  category: string
  image: string
  isHot: boolean
  productType?: string
  isRecommended?: boolean
  isNew?: boolean
}

interface OrderProduct extends Product {
  quantity: number
  total: number
}

interface Customer {
  id: string
  name: string
  phone: string
  otherPhones?: string[]  // 其他手机号
  address: string
  age: number
  level: 'normal' | 'vip' | 'premium'
  salesPersonId: string
  orderCount: number
  createTime: string
  createdBy: string
}

interface CustomerPhone {
  id: number
  number: string
  remark: string
  isDefault: boolean
}

interface OrderForm {
  customerId: string
  serviceWechat: string
  orderSource: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  expressCompany: string
  products: OrderProduct[]
  discount: number
  totalAmount: number
  depositAmount: number
  depositScreenshot: string
  paymentMethod: string
  paymentMethodOther: string
  markType: string
  remark: string
  customFields: Record<string, unknown>
}

interface AddPhoneForm {
  phone: string
  remark: string
}

interface UploadOptions {
  file: File
  onSuccess: (response: UploadResponse) => void
  onError: (error: Error) => void
}

interface UploadResponse {
  url: string
}

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const userStore = useUserStore()
const configStore = useConfigStore()
const productStore = useProductStore()
const fieldConfigStore = useOrderFieldConfigStore()

// 跳转到订单设置
const goToOrderSettings = () => {
  router.push('/system/settings?tab=order')
}

// 响应式数据
const orderFormRef = ref()
const customerLoading = ref(false)
const customerAddresses = ref<any[]>([])

// 加载客户地址列表
const loadCustomerAddresses = async (customerId: string) => {
  try {
    const response = await customerDetailApi.getCustomerAddresses(customerId)
    const data = response?.data || response || []
    customerAddresses.value = Array.isArray(data) ? data : []
    // 🔥 如果有客户详情页维护的地址，始终默认使用最新地址
    if (customerAddresses.value.length > 0) {
      orderForm.receiverAddress = customerAddresses.value[0].content
    }
  } catch (error) {
    console.error('加载客户地址失败:', error)
    customerAddresses.value = []
  }
}

// 构建客户可读地址（从省市区代码转换）
const buildCustomerReadableAddress = (customer: any): string => {
  if (customer.province || customer.city || customer.district) {
    const label = getAddressLabel(customer.province, customer.city, customer.district, customer.street)
    if (label) {
      return customer.detailAddress ? label + customer.detailAddress : label
    }
  }
  return customer.address || ''
}
const loading = ref(false) // 产品刷新加载状态
const saving = ref(false)
const submitting = ref(false)
const confirmDialogVisible = ref(false)
const isEdit = ref(false)
const productSearchKeyword = ref('')

// 图片查看器
const showImageViewer = ref(false)
const currentImageList = ref<string[]>([])

// 物流公司列表
const expressCompanyList = ref<{ code: string; name: string; logo?: string }[]>([])
const expressCompanyLoading = ref(false)

// 客户选项 - 🔥 添加权限过滤
// 🔥 临时客户（从外部传递的客户信息）
const tempCustomer = ref<Customer | null>(null)

const customerOptions = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  const allCustomers = customerStore.customers
  const userRole = currentUser.role

  let filteredCustomers: Customer[] = []

  // 超管和管理员不受限
  if (userRole === 'super_admin' || userRole === 'admin') {
    filteredCustomers = [...allCustomers]
  } else if (userRole === 'department_manager') {
    // 部门经理看部门成员创建的客户
    const deptId = currentUser.departmentId
    // 获取部门成员ID列表
    const deptMemberIds = userStore.users
      ?.filter(u => u.departmentId === deptId)
      .map(u => u.id) || []
    filteredCustomers = allCustomers.filter(customer =>
      deptMemberIds.includes(customer.createdBy) ||
      customer.createdBy === currentUser.id ||
      // 分享给部门成员的客户
      customer.sharedWith?.some((share: any) => deptMemberIds.includes(share.userId))
    )
  } else {
    // 普通成员只看自己创建的客户和分享给自己的客户
    filteredCustomers = allCustomers.filter(customer =>
      customer.createdBy === currentUser.id ||
      customer.sharedWith?.some((share: any) => share.userId === currentUser.id)
    )
  }

  // 🔥 如果有临时客户且不在列表中，添加到列表
  if (tempCustomer.value && !filteredCustomers.some(c => c.id === tempCustomer.value?.id)) {
    filteredCustomers = [tempCustomer.value, ...filteredCustomers]
  }

  return filteredCustomers
})

// 产品列表 - 从productStore获取，只显示有库存的上架在售产品
const productList = computed(() => {
  // 【批次204新增】读取价格优惠配置
  const priceConfig = JSON.parse(localStorage.getItem('crm_product_price_config') || '{}')

  return productStore.products.filter(product =>
    product.status === 'active' &&
    !product.isDeleted &&
    product.stock > 0
  ).map(product => {
    // 【批次204新增】检查是否有优惠价格
    let finalPrice = product.price
    if (priceConfig.enabled && priceConfig.products && priceConfig.products[product.id]) {
      const configPrice = priceConfig.products[product.id].price
      if (configPrice !== undefined && configPrice !== null) {
        finalPrice = configPrice
      }
    }

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      price: finalPrice, // 【批次204修复】使用优惠价格
      originalPrice: product.price, // 【批次204新增】保存原价
      stock: product.stock,
      category: product.category,
      image: product.image,
      isRecommended: product.isRecommended,
      isNew: product.isNew,
      isHot: product.isHot,
      productType: product.productType || 'physical'
    }
  })
})

// 选中的客户
const selectedCustomer = ref<Customer | null>(null)

// 客户手机号列表
const customerPhones = ref<CustomerPhone[]>([])

// 🔥 选中的手机号ID（用于下拉框显示加密号码）
const selectedPhoneId = ref<number | null>(null)

// 新增手机号对话框
const showAddPhoneDialog = ref(false)
const addPhoneFormRef = ref()
const addingPhone = ref(false)

// 新增手机号表单
const addPhoneForm = reactive<AddPhoneForm>({
  phone: '',
  remark: ''
})

// 新增手机号表单验证规则
const addPhoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
}

// 🔥 部门下单限制检查
const orderLimitResult = ref<DepartmentLimitCheckResult | null>(null)
const orderLimitExceeded = ref(false)
const orderLimitDialogVisible = ref(false)
const orderLimitChecking = ref(false)

// 订单表单数据
const orderForm = reactive<OrderForm>({
  customerId: '',
  serviceWechat: '',
  orderSource: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  expressCompany: '',
  products: [] as OrderProduct[],
  discount: 0,
  totalAmount: 0,
  depositAmount: 0,
  depositScreenshot: '',
  paymentMethod: '',
  paymentMethodOther: '',
  markType: 'normal',
  remark: '',
  customFields: {}
})

// 支付方式选项
const paymentMethods = ref([
  { label: '微信支付', value: 'wechat' },
  { label: '支付宝支付', value: 'alipay' },
  { label: '银行转账', value: 'bank_transfer' },
  { label: '云闪付', value: 'unionpay' },
  { label: '货到付款', value: 'cod' },
  { label: '其他', value: 'other' }
])

// 加载支付方式
const loadPaymentMethods = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/payment-methods', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await response.json()
    if (result.success && result.data && result.data.length > 0) {
      paymentMethods.value = result.data.map((m: any) => ({
        label: m.label,
        value: m.value
      }))
    }
  } catch (error) {
    console.warn('加载支付方式失败，使用默认配置:', error)
  }
}

// 处理支付方式变化
const handlePaymentMethodChange = (value: string) => {
  if (value !== 'other') {
    orderForm.paymentMethodOther = ''
  }
}

// 表单验证规则（收货信息在虚拟发货时非必填）
const formRules = computed(() => {
  const isVirtual = orderForm.markType === 'virtual_delivery'
  return {
    customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
    serviceWechat: [{ required: true, message: '请输入客服微信号', trigger: 'blur' }],
    orderSource: [{ required: true, message: '请选择订单来源', trigger: 'change' }],
    expressCompany: [{ required: !isVirtual, message: '请选择快递公司', trigger: 'change' }],
    receiverName: [{ required: !isVirtual, message: '请输入收货人姓名', trigger: 'blur' }],
    receiverPhone: [{ required: !isVirtual, message: '请输入收货人电话', trigger: 'blur' }],
    receiverAddress: [{ required: !isVirtual, message: '请输入收货地址', trigger: 'blur' }],
    markType: [{ required: true, message: '请选择订单类型', trigger: 'change' }]
  }
})

// 多张定金截图
const depositScreenshots = ref<string[]>([])

// 控制悬停时显示放大图标
const showZoomIcon = ref(-1)

// 根据用户角色获取最大优惠比例
const maxDiscountRate = computed(() => {
  const userRole = userStore.currentUser?.role || 'employee'
  // 🔥 修复：正确映射所有角色
  let discountValue = 0
  if (userRole === 'admin' || userRole === 'super_admin') {
    discountValue = configStore.productConfig.adminMaxDiscount
  } else if (userRole === 'department_manager' || userRole === 'manager') {
    discountValue = configStore.productConfig.managerMaxDiscount
  } else if (userRole === 'sales_staff' || userRole === 'sales' || userRole === 'employee') {
    // 🔥 修复：sales_staff角色也使用销售员优惠
    discountValue = configStore.productConfig.salesMaxDiscount
  } else {
    // 其他角色默认使用销售员优惠
    discountValue = configStore.productConfig.salesMaxDiscount
  }
  console.log('[优惠折扣] 当前角色:', userRole, '优惠比例:', discountValue, '%')
  console.log('[优惠折扣] 配置详情:', {
    admin: configStore.productConfig.adminMaxDiscount,
    manager: configStore.productConfig.managerMaxDiscount,
    sales: configStore.productConfig.salesMaxDiscount
  })
  return discountValue / 100
})

// 标记用户是否手动修改过订单总额
const isManuallyModified = ref(false)

// 虚拟商品检测
const hasVirtualProducts = computed(() => {
  return orderForm.products.some(p => (p as any).productType === 'virtual')
})

const isAllVirtualProducts = computed(() => {
  return orderForm.products.length > 0 && orderForm.products.every(p => (p as any).productType === 'virtual')
})

// 自动切换订单类型：所有商品为虚拟时切虚拟发货，否则切回正常发货单
watch(isAllVirtualProducts, (allVirtual) => {
  if (allVirtual) {
    orderForm.markType = 'virtual_delivery'
  } else if (orderForm.markType === 'virtual_delivery') {
    orderForm.markType = 'normal'
  }
})

// 计算属性
const subtotal = computed(() => {
  return orderForm.products.reduce((sum, product) => {
    return sum + ((product.price || 0) * (product.quantity || 0))
  }, 0)
})

const collectAmount = computed(() => {
  return (orderForm.totalAmount || 0) - (orderForm.depositAmount || 0)
})

// 优惠金额 = 商品小计 - 订单总额
const discountAmount = computed(() => {
  return subtotal.value - (orderForm.totalAmount || 0)
})

// 优惠比例
const discountPercentage = computed(() => {
  if (subtotal.value === 0) return 0
  return (discountAmount.value / subtotal.value) * 100
})

// 计算最低可优惠金额（基于管理员设置的优惠比例）
const minAllowedAmount = computed(() => {
  return subtotal.value * (1 - maxDiscountRate.value)
})

const filteredProducts = computed(() => {
  if (!productSearchKeyword.value) {
    return productList.value
  }
  return productList.value.filter(product =>
    product.name.toLowerCase().includes(productSearchKeyword.value.toLowerCase())
  )
})

// 上传配置
const uploadAction = ref('')

// 方法
const handleUpload = (options: UploadOptions) => {
  const { file, onSuccess, onError } = options

  // 模拟上传过程
  const formData = new FormData()
  formData.append('file', file)

  // 模拟异步上传
  setTimeout(() => {
    try {
      // 创建本地预览URL
      const url = URL.createObjectURL(file)
      onSuccess({ url })
    } catch (error) {
      onError(error as Error)
    }
  }, 1000)
}

const searchCustomers = (query: string) => {
  if (query) {
    customerLoading.value = true
    // 模拟搜索
    setTimeout(() => {
      customerLoading.value = false
    }, 300)
  }
}

const handleCustomerChange = async (customerId: string) => {
  // 🔥 先重置限制状态
  orderLimitResult.value = null
  orderLimitExceeded.value = false
  orderLimitDialogVisible.value = false

  const customer = customerOptions.value.find(c => c.id === customerId)
  if (customer) {
    selectedCustomer.value = customer
    // 同步收货信息
    orderForm.receiverName = customer.name
    // 🔥 临时先设空，loadCustomerAddresses 会设置最新地址
    orderForm.receiverAddress = ''

    // 加载客户手机号列表
    loadCustomerPhones(customerId)

    // 🔥 加载客户地址列表（从详情页新增的地址，会自动设置最新地址）
    await loadCustomerAddresses(customerId)

    // 🔥 如果没有详情页地址，使用可读地址兜底
    if (!orderForm.receiverAddress) {
      orderForm.receiverAddress = buildCustomerReadableAddress(customer)
    }

    // 🔥 检查部门下单限制（仅正常发货单检查，预留单和虚拟发货不检查）
    if (orderForm.markType !== 'reserved' && orderForm.markType !== 'return' && orderForm.markType !== 'virtual_delivery') {
      checkDepartmentLimit(customerId)
    }
  }
}

// 🔥 检查部门下单限制
const checkDepartmentLimit = async (customerId: string) => {
  try {
    orderLimitChecking.value = true
    const response = await orderApi.checkDepartmentLimit(customerId)
    const data = (response as any)?.data || response

    if (data && data.hasLimit) {
      orderLimitResult.value = data
      const details = data.details

      // 判断是否有任一维度超限
      let exceeded = false
      if (details) {
        if (details.orderCountExceeded) exceeded = true
        if (details.totalAmountExceeded) exceeded = true
      }

      orderLimitExceeded.value = exceeded

      // 不自动弹窗，用户可点击图标查看详情
    } else {
      orderLimitResult.value = null
      orderLimitExceeded.value = false
    }
  } catch (error) {
    console.error('检查部门下单限制失败:', error)
    // 出错不阻止下单
    orderLimitResult.value = null
    orderLimitExceeded.value = false
  } finally {
    orderLimitChecking.value = false
  }
}

// 🔥 监听订单总额变化，实时检查单笔金额限制
watch(() => orderForm.totalAmount, (newAmount) => {
  if (orderLimitResult.value?.hasLimit && orderLimitResult.value.details) {
    const details = orderLimitResult.value.details
    let exceeded = false

    // 重新检查次数限制
    if (details.orderCountExceeded) exceeded = true
    // 检查单笔金额限制
    if (details.singleAmountEnabled && details.maxSingleAmount > 0 && newAmount > details.maxSingleAmount) {
      exceeded = true
    }
    // 检查累计金额限制（当前累计 + 本单金额 > 最大累计）
    if (details.totalAmountEnabled && details.maxTotalAmount > 0) {
      if (details.totalAmount + newAmount > details.maxTotalAmount) {
        exceeded = true
      }
    }

    orderLimitExceeded.value = exceeded
  }
})

// 加载客户手机号列表
const loadCustomerPhones = async (customerId: string) => {
  try {
    const phones = []
    let phoneId = 1

    // 主手机号
    if (selectedCustomer.value?.phone) {
      phones.push({
        id: phoneId++,
        number: selectedCustomer.value.phone,
        remark: '主手机号',
        isDefault: true
      })
    }

    // 其他手机号（从otherPhones字段获取）
    if (selectedCustomer.value?.otherPhones && Array.isArray(selectedCustomer.value.otherPhones)) {
      selectedCustomer.value.otherPhones.forEach((phone: string, index: number) => {
        if (phone && phone !== selectedCustomer.value?.phone) {
          phones.push({
            id: phoneId++,
            number: phone,
            remark: `备用号码${index + 1}`,
            isDefault: false
          })
        }
      })
    }

    customerPhones.value = phones

    // 设置默认手机号
    if (phones.length > 0) {
      selectedPhoneId.value = phones[0].id
      orderForm.receiverPhone = phones[0].number
    }
  } catch (error) {
    ElMessage.error('加载客户手机号失败')
  }
}

// 🔥 处理手机号选择（用于显示加密号码）
const handlePhoneSelect = (phoneId: number | null) => {
  if (phoneId === null) {
    orderForm.receiverPhone = ''
    return
  }
  const phone = customerPhones.value.find(p => p.id === phoneId)
  if (phone) {
    orderForm.receiverPhone = phone.number
  }
}

// 新增手机号相关方法
const handleAddPhone = async () => {
  try {
    await addPhoneFormRef.value.validate()
    addingPhone.value = true

    // 模拟API调用
    setTimeout(() => {
      const newPhone = {
        id: Date.now(),
        number: addPhoneForm.phone,
        remark: addPhoneForm.remark || '新增手机号',
        isDefault: false
      }

      customerPhones.value.push(newPhone)

      // 重置表单
      addPhoneForm.phone = ''
      addPhoneForm.remark = ''
      showAddPhoneDialog.value = false
      addingPhone.value = false

      ElMessage.success('手机号添加成功')
    }, 1000)
  } catch (error) {
    addingPhone.value = false
  }
}

const handleCloseAddPhoneDialog = () => {
  addPhoneForm.phone = ''
  addPhoneForm.remark = ''
  showAddPhoneDialog.value = false
}

const syncCustomerAddress = () => {
  if (selectedCustomer.value) {
    orderForm.receiverAddress = buildCustomerReadableAddress(selectedCustomer.value)
    ElMessage.success('已同步客户地址')
  }
}

const handleProductSearch = () => {
  // 产品搜索逻辑
}

const handleRefreshProducts = async () => {
  try {
    loading.value = true
    await productStore.refreshProducts() // 从API刷新在售产品数据
    ElMessage.success('商品列表已刷新，已同步在售产品')
  } catch (error) {
    ElMessage.error('刷新商品列表失败，请检查网络连接')
    console.error('刷新商品失败:', error)
  } finally {
    loading.value = false
  }
}

const addProduct = (product: Product) => {
  // 【批次204新增】检查价格优惠配置
  let finalPrice = product.price
  const priceConfig = JSON.parse(localStorage.getItem('crm_product_price_config') || '{}')

  if (priceConfig.enabled && priceConfig.products && priceConfig.products[product.id]) {
    const configPrice = priceConfig.products[product.id].price
    if (configPrice !== undefined && configPrice !== null) {
      finalPrice = configPrice
      console.log(`[订单创建] 商品 ${product.name} 应用优惠价格: ¥${product.price} → ¥${finalPrice}`)
    }
  }

  const existingProduct = orderForm.products.find(p => p.id === product.id)
  if (existingProduct) {
    if (existingProduct.quantity < product.stock) {
      existingProduct.quantity++
      existingProduct.total = existingProduct.price * existingProduct.quantity
      calculateTotal()
      ElMessage.success(`${product.name} 数量已增加`)
    } else {
      ElMessage.warning('库存不足')
    }
  } else {
    orderForm.products.push({
      ...product,
      price: finalPrice, // 【批次204修复】使用优惠价格
      originalPrice: product.price, // 【批次204新增】保存原价
      quantity: 1,
      total: finalPrice * 1
    })
    calculateTotal()
    ElMessage.success(`${product.name} 已添加到订单`)
  }
}

const viewProductDetail = (product: Product) => {
  // 跳转到商品详情页
  safeNavigator.push(`/product/detail/${product.id}`)
}

const removeProduct = (index: number) => {
  const product = orderForm.products[index]
  orderForm.products.splice(index, 1)
  calculateTotal()
  ElMessage.success(`${product.name} 已从订单中移除`)
}

const calculateTotal = () => {
  // 更新每个产品的total字段
  orderForm.products.forEach(product => {
    product.total = product.price * product.quantity
  })

  // 只有在用户没有手动修改过订单总额时，才自动同步商品小计
  if (!isManuallyModified.value) {
    orderForm.totalAmount = subtotal.value
  }
}

const calculateCollectAmount = () => {
  // 代收金额计算的逻辑已在计算属性中实现
}

// 处理订单总额变化
const handleTotalAmountChange = (value: number | null) => {
  // 如果value为null或undefined，不处理
  if (value === null || value === undefined) {
    return
  }

  // 标记用户手动修改了订单总额
  isManuallyModified.value = true

  // 计算最低可优惠价格（基于管理员设置的优惠比例）
  const minAllowedAmountValue = subtotal.value * (1 - maxDiscountRate.value)
  const discountPercent = (maxDiscountRate.value * 100).toFixed(0)

  console.log('[订单总额变更] 详细信息:', {
    修改后的值: value,
    商品小计: subtotal.value,
    最大优惠比例: maxDiscountRate.value,
    优惠百分比显示: discountPercent,
    最低允许金额: minAllowedAmountValue
  })

  // 检查是否低于最低允许金额
  if (value < minAllowedAmountValue) {
    // 立即调整到最低允许金额
    orderForm.totalAmount = minAllowedAmountValue
    // 显示弹窗提示
    ElMessageBox.alert(
      `订单总额不能低于 ¥${minAllowedAmountValue.toFixed(2)}（最大优惠${discountPercent}%）`,
      '优惠限制提示',
      {
        confirmButtonText: '确定',
        type: 'warning'
      }
    )
    return
  }

  // 检查是否超过商品小计
  if (value > subtotal.value) {
    // 立即调整到商品小计
    orderForm.totalAmount = subtotal.value
    // 显示弹窗提示
    ElMessageBox.alert(
      '订单总额不能超过商品小计',
      '提示',
      {
        confirmButtonText: '确定',
        type: 'warning'
      }
    )
    return
  }

  // 如果定金大于新的订单总额，自动调整定金
  if (orderForm.depositAmount > value) {
    orderForm.depositAmount = value
    ElMessage.info('定金已自动调整为订单总额')
  }

  // 当手动修改订单总额时，重新计算代收金额
  calculateCollectAmount()
}

// 重置订单总额为商品小计，重新启用自动同步
const resetToSubtotal = () => {
  isManuallyModified.value = false
  orderForm.totalAmount = subtotal.value
  ElMessage.success('订单总额已同步为商品小计')
}

// 文件输入引用
const fileInput = ref<HTMLInputElement>()

// 触发文件上传
const triggerUpload = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      if (depositScreenshots.value.length >= 3) {
        ElMessage.warning('最多只能上传3张图片')
        break
      }
      handleImageFile(files[i])
    }
    // 清空input值，允许重复选择同一文件
    target.value = ''
  }
}

// 粘贴图片功能
const pasteImage = async () => {
  if (depositScreenshots.value.length >= 3) {
    ElMessage.warning('最多只能上传3张图片')
    return
  }

  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type)
          const file = new File([blob], 'pasted-image.png', { type })
          handleImageFile(file)
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch (error) {
    ElMessage.error('粘贴图片失败，请检查浏览器权限')
  }
}

// 处理图片文件 - 上传到服务器
const handleImageFile = async (file: File) => {
  if (!beforeUpload(file)) {
    return
  }

  if (depositScreenshots.value.length >= 3) {
    ElMessage.warning('最多只能上传3张图片')
    return
  }

  try {
    // 上传到服务器
    const { uploadImage } = await import('@/services/uploadService')
    const result = await uploadImage(file, 'order')

    if (result.success && result.url) {
      // 上传成功，使用服务器返回的URL
      depositScreenshots.value.push(result.url)
      // 同时更新orderForm中的字段（保持兼容性）
      orderForm.depositScreenshot = depositScreenshots.value[0] || ''
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(result.message || '图片上传失败')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败，请重试')
  }
}

// 删除截图
const removeScreenshot = (index: number) => {
  depositScreenshots.value.splice(index, 1)
  // 更新orderForm中的字段
  orderForm.depositScreenshot = depositScreenshots.value[0] || ''
  ElMessage.success('图片已删除')
}

// 预览图片
const previewImage = (imageUrl?: string) => {
  const url = imageUrl || orderForm.depositScreenshot
  if (url) {
    currentImageList.value = [url]
    showImageViewer.value = true
  }
}

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleUploadSuccess = (response: UploadResponse) => {
  orderForm.depositScreenshot = response.url
  ElMessage.success('截图上传成功')
}

const handleUploadError = () => {
  ElMessage.error('截图上传失败，请重试')
}

const handleMarkTypeChange = (value: string) => {
  if (value === 'reserved') {
    ElMessage.info('已选择预留单，订单将保留在您处，不会流转到审核员')
    // 🔥 预留单不受部门下单限制
    orderLimitExceeded.value = false
    orderLimitResult.value = null
    orderLimitDialogVisible.value = false
  } else if (value === 'virtual_delivery') {
    ElMessage.info('已选择虚拟发货，订单审核通过后将通过卡密/资源等方式交付')
    // 虚拟发货不受部门下单限制
    orderLimitExceeded.value = false
    orderLimitResult.value = null
    orderLimitDialogVisible.value = false
  } else {
    ElMessage.info('已选择正常发货单，订单将按正常流程进行审核')
    // 🔥 切换回正常发货单时重新检查
    if (orderForm.customerId) {
      checkDepartmentLimit(orderForm.customerId)
    }
  }
}

const handleSaveOrder = async () => {
  try {
    await orderFormRef.value.validate()

    if (orderForm.products.length === 0) {
      ElMessage.warning('请至少选择一个商品')
      return
    }

    // 验证支付方式
    if (!orderForm.paymentMethod) {
      ElMessage.warning('请选择支付方式')
      return
    }

    // 如果选择了"其他"，验证是否填写了具体支付方式
    if (orderForm.paymentMethod === 'other' && !orderForm.paymentMethodOther) {
      ElMessage.warning('请输入具体的支付方式')
      return
    }

    // 🔥 检查部门下单限制（双重保障）
    if (orderLimitExceeded.value) {
      ElMessage.error('部门下单限制已超出，无法提交订单')
      return
    }

    // 🔥 实时检查单笔金额限制
    if (orderLimitResult.value?.hasLimit && orderLimitResult.value.details) {
      const d = orderLimitResult.value.details
      const currentAmount = orderForm.totalAmount || 0
      if (d.singleAmountEnabled && d.maxSingleAmount > 0 && currentAmount > d.maxSingleAmount) {
        orderLimitExceeded.value = true
        ElMessage.error(`当前订单金额 ¥${currentAmount.toFixed(2)} 超出单笔金额限制 ¥${d.maxSingleAmount.toFixed(2)}`)
        return
      }
      if (d.totalAmountEnabled && d.maxTotalAmount > 0 && (d.totalAmount + currentAmount) > d.maxTotalAmount) {
        orderLimitExceeded.value = true
        ElMessage.error(`累计金额将达到 ¥${(d.totalAmount + currentAmount).toFixed(2)}，超出限制 ¥${d.maxTotalAmount.toFixed(2)}`)
        return
      }
    }

    confirmDialogVisible.value = true
  } catch (error) {
    ElMessage.error('请完善订单信息')
  }
}

const handleSubmitOrder = async () => {
  try {
    submitting.value = true

    // 检查库存是否充足
    for (const product of orderForm.products) {
      const currentProduct = productStore.products.find(p => p.id === product.id)
      if (!currentProduct) {
        ElMessage.error(`商品 ${product.name} 不存在`)
        return
      }
      if (currentProduct.stock < product.quantity) {
        ElMessage.error(`商品 ${product.name} 库存不足，当前库存：${currentProduct.stock}，需要：${product.quantity}`)
        return
      }
    }

    // 【批次204修复】使用用户修改后的订单金额,不重新计算
    const subtotal = orderForm.products.reduce((sum, product) => sum + (product.price * product.quantity || 0), 0)
    // 使用orderForm.totalAmount(用户可能手动修改过)
    const totalAmount = orderForm.totalAmount || (subtotal - (orderForm.discount || 0))
    const collectAmount = totalAmount - (orderForm.depositAmount || 0)

    // 🔥 调试：打印当前用户信息，确保使用正确的销售人员
    console.log('📋 [新增订单] 当前用户信息:', {
      currentUser: userStore.currentUser,
      user: userStore.user,
      id: userStore.currentUser?.id || userStore.user?.id,
      name: userStore.currentUser?.name || userStore.user?.name
    })

    // 构建订单数据
    const orderData = {
      customerId: orderForm.customerId,
      customerName: selectedCustomer.value?.name || '',
      customerPhone: selectedCustomer.value?.phone || '',
      products: orderForm.products,
      subtotal: subtotal,
      discount: orderForm.discount,
      totalAmount: totalAmount, // 【批次204修复】使用用户修改后的金额
      collectAmount: collectAmount,
      depositAmount: orderForm.depositAmount,
      depositScreenshot: orderForm.depositScreenshot,
      depositScreenshots: depositScreenshots.value.length > 0 ? depositScreenshots.value : undefined,
      receiverName: orderForm.receiverName,
      receiverPhone: orderForm.receiverPhone,
      receiverAddress: orderForm.receiverAddress,
      markType: orderForm.markType,
      remark: orderForm.remark,
      // 🔥 使用当前登录用户的信息作为销售人员
      salesPersonId: userStore.currentUser?.id || userStore.user?.id || '1',
      createdBy: userStore.currentUser?.name || userStore.user?.name || '系统用户',
      // 🔥 添加销售人员姓名，确保后端能正确显示
      salesPersonName: userStore.currentUser?.name || userStore.user?.name || '系统用户',
      // 新增字段：客服微信和订单来源
      serviceWechat: orderForm.serviceWechat,
      orderSource: orderForm.orderSource,
      expressCompany: orderForm.expressCompany,
      // 支付方式
      paymentMethod: orderForm.paymentMethod,
      paymentMethodOther: orderForm.paymentMethod === 'other' ? orderForm.paymentMethodOther : '',
      // 🔥 自定义字段
      customFields: orderForm.customFields
    }

    // 🔥 调试：打印提交的customFields
    console.log('📋 [新增订单] 提交的customFields:', JSON.stringify(orderForm.customFields, null, 2))

    // 使用订单store创建订单
    const newOrder = await orderStore.createOrder(orderData)

    // 减少商品库存
    for (const product of orderForm.products) {
      await productStore.updateProductStock(product.id, -product.quantity)
    }

    // 更新客户统计数据
    if (orderData.customerId) {
      customerStore.incrementOrderCount(orderData.customerId)
    }

    // 🔥 注意：订单创建通知由后端统一发送（ORDER_CREATED），前端不再重复发送

    // 根据订单类型显示不同的提示信息
    if (orderData.markType === 'normal') {
      const delayMinutes = orderStore.transferDelayMinutes || 3
      ElMessage.success(`订单已提交，该订单${delayMinutes}分钟后将流转至审核`)
    } else if (orderData.markType === 'reserved') {
      ElMessage.success('预留单已保存，信息将保留在系统中')
    } else if (orderData.markType === 'virtual_delivery') {
      ElMessage.success('虚拟发货订单已提交，审核通过后将通过卡密/资源交付')
    } else {
      ElMessage.success('订单已提交')
    }

    confirmDialogVisible.value = false

    // 跳转到订单列表并传递刷新参数
    safeNavigator.push({
      path: '/order/list',
      query: { refresh: 'true', timestamp: Date.now().toString() }
    })
  } catch (error) {
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

const handleCloseConfirm = () => {
  confirmDialogVisible.value = false
}

const handleCancel = () => {
  router.back()
}

// 辅助方法
const getLevelType = (level: string) => {
  const types = {
    'vip': 'warning',
    'premium': 'danger',
    'normal': 'info'
  }
  return types[level] || 'info'
}

const getLevelText = (level: string) => {
  const texts = {
    'vip': 'VIP客户',
    'premium': '高级客户',
    'normal': '普通客户'
  }
  return texts[level] || '普通客户'
}

const getExpressCompanyText = (code: string) => {
  // 优先从已加载的物流公司列表中查找
  const company = expressCompanyList.value.find(c => c.code === code)
  if (company) {
    return company.name
  }
  // 兼容旧的硬编码值
  const defaultCompanies: Record<string, string> = {
    'sf': '顺丰速运',
    'SF': '顺丰速运',
    'yt': '圆通速递',
    'YTO': '圆通速递',
    'zt': '中通快递',
    'ZTO': '中通快递',
    'st': '申通快递',
    'STO': '申通快递',
    'yd': '韵达速递',
    'YD': '韵达速递',
    'bs': '百世快递',
    'db': '德邦快递',
    'jd': '京东物流'
  }
  return defaultCompanies[code] || code
}

// 加载启用的物流公司列表
const loadExpressCompanies = async () => {
  expressCompanyLoading.value = true
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.getActiveCompanies()
    const dataList = (response && response.success && Array.isArray(response.data))
      ? response.data
      : (response && Array.isArray(response) ? response as any[] : null)
    if (dataList) {
      // 🔥 使用完整名称而不是简称
      expressCompanyList.value = dataList.map((item: { code: string; name: string; shortName?: string; logo?: string }) => ({
        code: item.code,
        name: item.name, // 使用完整名称
        logo: item.logo
      }))
      console.log('[新增订单] 加载物流公司列表成功:', expressCompanyList.value.length, '个')
    }
  } catch (error) {
    console.warn('加载物流公司列表失败，使用默认列表:', error)
    // 如果API失败，使用默认列表
    expressCompanyList.value = [
      { code: 'SF', name: '顺丰速运' },
      { code: 'YTO', name: '圆通速递' },
      { code: 'ZTO', name: '中通快递' },
      { code: 'STO', name: '申通快递' },
      { code: 'YD', name: '韵达速递' },
      { code: 'JTSD', name: '极兔速递' },
      { code: 'EMS', name: 'EMS' },
      { code: 'JD', name: '京东物流' }
    ]
  } finally {
    expressCompanyLoading.value = false
  }
}

onMounted(async () => {
  // 🔥 首先加载系统配置（包括优惠折扣设置），确保全局生效
  try {
    await configStore.initConfig()
    console.log('[新增订单] 系统配置已加载，优惠折扣:', {
      admin: configStore.productConfig.adminMaxDiscount,
      manager: configStore.productConfig.managerMaxDiscount,
      sales: configStore.productConfig.salesMaxDiscount
    })
  } catch (error) {
    console.warn('[新增订单] 加载系统配置失败:', error)
  }

  // 加载客户数据
  await customerStore.loadCustomers()

  // 加载流转延迟配置
  if (typeof orderStore.loadTransferDelayConfig === 'function') {
    await orderStore.loadTransferDelayConfig()
  }

  // 加载启用的物流公司列表
  loadExpressCompanies()

  // 加载支付方式配置
  loadPaymentMethods()

  // 【修复】始终从API获取最新商品数据，确保所有用户看到相同的商品列表
  // 不再依赖本地缓存，避免不同用户看到不同商品的问题
  try {
    await productStore.refreshProducts()
  } catch (error) {
    console.error('加载商品数据失败:', error)
    // 如果API失败，回退到本地数据
    if (productStore.products.length === 0) {
      productStore.initData()
    }
  }

  // 检查是否有传递的客户信息和商品信息
  const { customerId, customerName, customerPhone, customerAddress, productId } = route.query

  console.log('[新增订单] 路由参数:', { customerId, customerName, customerPhone, customerAddress, productId })

  if (customerId) {
    // 查找客户信息
    let customerInfo = customerStore.customers.find(c => c.id === customerId)
    console.log('[新增订单] 从store查找客户:', customerInfo ? '找到' : '未找到')

    if (customerInfo) {
      // 从store中找到客户，使用store中的完整信息
      orderForm.customerId = customerInfo.id
      orderForm.receiverName = customerInfo.name
      orderForm.receiverPhone = customerInfo.phone
      orderForm.receiverAddress = ''

      // 🔥 必须先设置 selectedCustomer，否则收货信息区域不显示
      selectedCustomer.value = customerInfo

      // 加载客户手机号列表（依赖 selectedCustomer）
      loadCustomerPhones(customerId as string)

      // 🔥 加载客户地址列表（从详情页新增的地址，会自动设置最新地址）
      await loadCustomerAddresses(customerId as string)

      // 🔥 如果没有详情页地址，用路由传递的地址或可读地址兜底
      if (!orderForm.receiverAddress) {
        orderForm.receiverAddress = (customerAddress as string) || buildCustomerReadableAddress(customerInfo)
      }

      // 🔥 检查部门下单限制
      checkDepartmentLimit(customerInfo.id)
    } else if (customerName && customerPhone) {
      // 如果store中找不到但有传递的客户信息，使用传递的信息
      console.log('[新增订单] 使用路由传递的客户信息')

      orderForm.customerId = customerId as string
      orderForm.receiverName = customerName as string
      orderForm.receiverPhone = customerPhone as string
      orderForm.receiverAddress = ''

      // 创建一个临时的客户对象
      customerInfo = {
        id: customerId as string,
        name: customerName as string,
        phone: customerPhone as string,
        address: customerAddress as string || '',
        age: 0,
        level: 'normal' as const,
        salesPersonId: '',
        orderCount: 0,
        createTime: '',
        createdBy: ''
      }

      selectedCustomer.value = customerInfo

      // 🔥 设置临时客户，确保下拉框能显示
      tempCustomer.value = customerInfo

      // 🔥 加载客户地址列表（优先使用详情页维护的最新地址）
      await loadCustomerAddresses(customerId as string)

      // 🔥 如果没有详情页地址，使用路由传递的地址兜底
      if (!orderForm.receiverAddress) {
        orderForm.receiverAddress = customerAddress as string || ''
      }

      // 🔥 初始化手机号列表并设置选中（路由参数来的客户可能没有otherPhones）
      const phones = []
      let phoneId = 1

      if (customerPhone) {
        phones.push({
          id: phoneId++,
          number: customerPhone as string,
          remark: '主手机号',
          isDefault: true
        })
      }

      customerPhones.value = phones
      selectedPhoneId.value = 1

      ElMessage.success(`已自动选择客户：${customerName}`)

      // 🔥 检查部门下单限制
      checkDepartmentLimit(customerId as string)
    } else {
      // 只有customerId但找不到客户信息
      ElMessage.warning('未找到指定的客户信息，请手动选择客户')
    }
  }

  // 检查是否有传递的商品信息
  if (productId) {
    // 查找商品信息
    const product = productStore.products.find(p => p.id === productId)

    if (product) {
      // 自动添加商品到订单
      const productToAdd = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price
      }

      orderForm.products.push(productToAdd)

      ElMessage.success(`已自动添加商品：${product.name}`)
    } else {
      ElMessage.warning('未找到指定的商品信息')
    }
  }
})
</script>

<style scoped>
/* 收货地址下拉框箭头更明显 */
.address-select-dropdown :deep(.el-select__suffix) {
  font-size: 20px;
  color: #409EFF;
}
.address-select-dropdown :deep(.el-select__suffix .el-icon) {
  font-size: 20px;
  color: #409EFF;
  background: #ecf5ff;
  border-radius: 4px;
  padding: 2px;
}

.order-form {
  padding: 20px;
  width: 100%;
  margin: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.customer-card,
.product-card,
.summary-card {
  margin-bottom: 20px;
}

.delivery-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.delivery-info h4 {
  margin: 0 0 16px 0;
  color: #606266;
}

.product-search {
  margin-bottom: 20px;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.product-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.product-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.product-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  text-align: center;
  margin-bottom: 8px;
}

.product-name {
  font-weight: 600;
  color: #303133;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  max-height: 2.8em;
  text-align: center;
  margin-bottom: 6px;
}

.product-price-stock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 6px;
}

.product-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.product-badges .el-tag {
  font-size: 11px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 3px;
}

.product-price {
  color: #f56c6c;
  font-weight: 600;
  font-size: 15px;
}

.product-stock {
  color: #909399;
  font-size: 12px;
}

.product-actions {
  text-align: center;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.selected-products {
  margin-bottom: 20px;
}

.selected-products h4 {
  margin: 0 0 16px 0;
  color: #606266;
}

.selected-product-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selected-product-name-row {
  display: flex;
  align-items: center;
}

.selected-product-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.selected-product-tags .el-tag {
  font-size: 11px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 3px;
}

.amount-calculation {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.amount-item label {
  font-weight: 600;
  color: #606266;
}

.amount-value {
  font-size: 18px;
  color: #303133;
}

.total-amount {
  font-size: 20px;
  font-weight: 600;
  color: #f56c6c;
}

.collect-amount {
  font-size: 18px;
  font-weight: 600;
  color: #67c23a;
}

.deposit-section,
.mark-section,
.remark-section {
  margin: 20px 0;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.deposit-section h4,
.mark-section h4 {
  margin: 0 0 16px 0;
  color: #606266;
}

.deposit-upload {
  width: 100%;
}

.upload-success {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  margin-top: 8px;
}

.screenshot-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  margin-left: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.screenshot-preview:hover {
  border-color: #409eff;
  transform: scale(1.05);
}

.mark-section .el-radio {
  margin-right: 20px;
  margin-bottom: 12px;
}

.mark-section .el-radio__label {
  padding-left: 8px;
}

.mark-description {
  margin-top: 8px;
}

.mark-description .el-alert {
  border-radius: 6px;
}

.form-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.order-confirm {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.order-confirm h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2f5;
}

.confirm-section {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.confirm-section:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.confirm-section:last-child {
  margin-bottom: 0;
}

.confirm-section h5 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-section h5::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  border-radius: 2px;
}

.confirm-section p {
  margin: 6px 0;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-section p strong {
  color: #374151;
  font-weight: 500;
  min-width: 80px;
}

/* 确认弹窗中的表格样式 */
.confirm-section .el-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.confirm-section .el-table th {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #374151;
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid #d1d5db;
}

.confirm-section .el-table td {
  border-bottom: 1px solid #f3f4f6;
  font-size: 12px;
  color: #4b5563;
}

.confirm-section .el-table tr:hover td {
  background-color: #f8fafc;
}

/* 信息网格布局 */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #6b7280;
  font-weight: 500;
  min-width: 80px;
  font-size: 13px;
}

.info-item .value {
  color: #374151;
  font-weight: 400;
  flex: 1;
  font-size: 13px;
}

/* 订单标记样式 */
.mark-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mark-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mark-note {
  color: #e6a23c;
  font-size: 12px;
  font-style: italic;
  padding: 6px 12px;
  background: #fef3c7;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

/* 简约现代化金额汇总样式 */
.amount-summary-modern {
  margin-top: 24px;
  padding: 32px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.amount-row {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 2%;
  flex-wrap: nowrap;
}

.amount-row:last-child {
  margin-bottom: 0;
}

.amount-field {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.amount-field:nth-child(1) { /* 商品小计 */
  flex: 0 0 16%;
}

.amount-field:nth-child(2) { /* 订单总额 */
  flex: 0 0 18%;
}

.amount-field:nth-child(3) { /* 定金金额 */
  flex: 0 0 16%;
}

.amount-field:nth-child(4) { /* 已收金额 */
  flex: 0 0 14%;
}

.amount-field:nth-child(5) { /* 优惠金额 */
  flex: 0 0 18%;
}

.screenshot-field { /* 定金截图 - 包含按钮和缩略图 */
  flex: 0 0 18% !important;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  min-width: 60px;
  flex-shrink: 0;
}

.field-amount {
  font-size: 18px;
  font-weight: 700;
}

.field-amount.subtotal {
  color: #059669;
}

.field-amount.collect {
  color: #7c3aed;
}

.field-amount.discount {
  color: #ea580c;
}

.field-input {
  flex: 1;
  width: 100%;
}

.field-input .el-input-number {
  width: 100%;
}

.field-input .el-input-number .el-input__inner {
  font-size: 16px;
  font-weight: 600;
  text-align: right;
  padding-right: 12px;
  color: #1f2937;
}

.field-input .el-input-number:focus-within .el-input__inner {
  color: #3b82f6;
}

.sync-button {
  margin-left: 4px;
  padding: 2px 4px;
  color: #3b82f6;
  font-size: 12px;
}

.sync-button:hover {
  color: #2563eb;
  background-color: #eff6ff;
}

.discount-horizontal {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discount-percent {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.screenshot-field {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.screenshot-content {
  display: flex;
  align-items: center;
  min-height: 32px;
  flex: 1;
  margin-left: 8px;
}

.screenshot-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.screenshot-buttons .el-button {
  padding: 4px 8px;
  font-size: 12px;
  height: 28px;
}

.screenshot-btn {
  height: 36px;
  font-size: 13px;
  border-radius: 8px;
}

.screenshot-thumbnails {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
}

.thumbnail-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
  flex-shrink: 0;
  cursor: pointer;
}

.thumbnail-item:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.zoom-icon {
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.thumbnail-delete {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 12px;
  transition: all 0.2s ease;
}

.thumbnail-delete:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.amount-row-first,
.amount-row-second {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.amount-row-second {
  margin-bottom: 0;
}

.amount-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amount-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
}

.amount-value {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
  padding: 8px 12px;
  background: rgba(5, 150, 105, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.amount-value.readonly {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border-color: rgba(107, 114, 128, 0.2);
}

.amount-input-wrapper {
  position: relative;
}

.amount-input {
  width: 100% !important;
}

.amount-highlight {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 700;
  color: #dc2626;
  text-align: center;
  padding: 4px 8px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.discount-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.discount-input {
  width: 100% !important;
}

.discount-percentage {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
  text-align: center;
  padding: 2px 6px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.screenshot-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.screenshot-controls .el-button {
  flex: 1;
  font-size: 12px;
}

.screenshot-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.screenshot-thumbnail:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.screenshot-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 18px;
}

.screenshot-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

/* 现代化金额汇总样式 */
.amount-summary-grid {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.amount-row-main {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.amount-card {
  flex: 1;
  min-width: 180px;
  max-width: 220px;
  padding: 20px 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.amount-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  opacity: 0.9;
  z-index: 1;
}

.amount-card > * {
  position: relative;
  z-index: 2;
}

.amount-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.amount-card.subtotal-card {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: white;
}

.amount-card.subtotal-card::after {
  content: '🛒';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.total-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.amount-card.total-card::after {
  content: '💰';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.collect-card {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.amount-card.collect-card::after {
  content: '📦';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-label {
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.9;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.amount-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.amount-row-detail {
  display: flex;
  gap: 32px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(228, 231, 237, 0.6);
  backdrop-filter: blur(10px);
  margin-top: 8px;
}

.discount-input-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.discount-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.discount-label {
  color: #f56c6c;
  font-size: 13px;
  font-weight: 500;
}

.discount-value {
  color: #f56c6c;
  font-weight: 600;
  font-size: 14px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.phone-management {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-management .el-select {
  flex: 1;
  min-width: 200px;
}

/* 订单类型标签样式优化 */
.confirm-section .el-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 中等屏幕响应式样式 */
@media (max-width: 1024px) and (min-width: 769px) {
  .amount-field:nth-child(1) { /* 商品小计 */
    flex: 0 0 20%;
  }

  .amount-field:nth-child(2) { /* 订单总额 */
    flex: 0 0 22%;
  }

  .amount-field:nth-child(3) { /* 定金金额 */
    flex: 0 0 20%;
  }

  .amount-field:nth-child(4) { /* 已收金额 */
    flex: 0 0 18%;
  }

  .amount-field:nth-child(5) { /* 优惠金额 */
    flex: 0 0 20%;
  }

  .screenshot-field { /* 定金截图 */
    flex: 0 0 20% !important;
  }

  .field-input .el-input-number {
    min-width: 100px;
  }
}

/* 移动端响应式样式 */
@media (max-width: 768px) {
  .order-form {
    padding: 12px;
  }

  .product-list {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .form-footer {
    flex-direction: column;
  }

  .form-footer .el-button {
    width: 100%;
  }

  /* 订单确认弹窗响应式 */
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .info-item .label {
    min-width: auto;
    font-weight: 600;
  }

  .amount-summary-grid {
    padding: 16px;
  }

  .amount-row-main {
    flex-direction: column;
    gap: 12px;
  }

  .amount-card {
    min-width: auto;
    max-width: none;
    padding: 16px 12px;
  }

  .amount-value {
    font-size: 20px;
  }

  .amount-row-detail {
    flex-direction: column;
    gap: 16px;
    padding: 12px 16px;
  }

  .discount-input-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  /* 响应式输入框样式 */
  .amount-row {
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .amount-field {
    flex: 1 1 100%;
    min-width: 100%;
    justify-content: space-between;
  }

  .amount-field:nth-child(1),
  .amount-field:nth-child(2),
  .amount-field:nth-child(3),
  .amount-field:nth-child(4),
  .amount-field:nth-child(5),
  .screenshot-field {
    flex: 1 1 100% !important;
  }

  .field-label {
    min-width: 80px;
    flex-shrink: 0;
  }

  .field-input {
    flex: 1;
    min-width: 120px;
  }

  .field-input .el-input-number {
    width: 100%;
    min-width: 120px;
  }
}

/* 订单确认弹窗 - 两列金额汇总样式 */
.amount-summary-two-columns {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.amount-column {
  flex: 1;
  padding: 16px;
  border-radius: 12px;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
}

.amount-column.basic-amounts {
  background: #f8fafc;
  border-color: #0ea5e9;
  position: relative;
}

.amount-column.basic-amounts::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%);
  border-radius: 12px 12px 0 0;
}

.amount-column.important-amounts {
  background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
  border-color: #f59e0b;
  position: relative;
}

.amount-column.important-amounts::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
  border-radius: 12px 12px 0 0;
}

.amount-column .amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.amount-column .amount-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.amount-column .amount-item .label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
}

.amount-column .amount-item .value {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.amount-column .amount-item .value.discount {
  color: #dc2626;
}

.amount-column .discount-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.amount-column .discount-percent {
  font-size: 11px;
  color: #059669;
  font-weight: 500;
  background: rgba(5, 150, 105, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.amount-column.basic-amounts .amount-item .label {
  color: #0369a1;
  font-weight: 600;
}

.amount-column.basic-amounts .amount-item .value {
  color: #0369a1;
  font-weight: 700;
}

.amount-column.important-amounts .amount-item .label {
  color: #92400e;
  font-weight: 600;
}

.amount-column.important-amounts .amount-item .value {
  color: #92400e;
  font-weight: 700;
  font-size: 16px;
}

.amount-column.important-amounts .amount-item.total-amount .value {
  color: #dc2626;
  font-size: 18px;
}

.amount-column.important-amounts .amount-item.deposit-amount .value {
  color: #059669;
}

.amount-column.important-amounts .amount-item.collect-amount .value {
  color: #7c3aed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .amount-summary-two-columns {
    flex-direction: column;
    gap: 16px;
  }

  .amount-column {
    padding: 12px;
  }

  .amount-column .amount-item {
    padding: 10px 0;
  }

  .amount-column .amount-item .label {
    font-size: 12px;
  }

  .amount-column .amount-item .value {
    font-size: 14px;
  }

  .amount-column.important-amounts .amount-item .value {
    font-size: 15px;
  }

  .amount-column.important-amounts .amount-item.total-amount .value {
    font-size: 16px;
  }
}

/* 支付方式样式 */
.payment-method-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
}

.required-star {
  color: #f56c6c;
  margin-left: 2px;
}

/* 🔥 部门下单限制提示样式 */
.customer-select-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 4px;
}

.limit-info-icon {
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
}
.limit-info-icon:hover {
  color: #409eff;
}
.limit-info-icon.is-exceeded {
  color: #f56c6c;
}
.limit-info-icon.is-exceeded:hover {
  color: #c45656;
}

.limit-inline-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 1;
  margin-top: 4px;
  color: #67c23a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.limit-inline-hint.is-exceeded {
  color: #f56c6c;
}

.limit-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67c23a;
  flex-shrink: 0;
}
.limit-inline-hint.is-exceeded .limit-dot {
  background: #f56c6c;
}

.limit-exceeded-tip {
  display: inline-flex;
  align-items: center;
  margin-left: 12px;
  gap: 6px;
}

.order-limit-dialog :deep(.el-descriptions__label) {
  font-weight: 600;
  min-width: 100px;
}

.order-limit-dialog :deep(.el-tag) {
  font-size: 14px;
  padding: 4px 12px;
}

.form-footer {
  display: flex;
  align-items: center;
}

.is-disabled-tag {
  opacity: 0.5;
}
</style>

<template>
  <div class="order-edit-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">编辑订单</h2>
    </div>

    <el-form :model="orderForm" :rules="formRules" ref="orderFormRef" label-width="120px" class="order-form">
      <!-- 客户信息区域 -->
      <div class="form-section">
        <div class="section-header">
          <el-icon><User /></el-icon>
          <span>客户信息</span>
        </div>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="选择客户" prop="customerId" required>
              <el-select
                v-model="orderForm.customerId"
                placeholder="请选择客户"
                style="width: 100%"
                filterable
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
            <el-form-item label="订单来源" prop="orderSource" required>
              <el-select
                v-model="orderForm.orderSource"
                placeholder="请选择订单来源"
                style="width: 100%"
              >
                <el-option label="🛒 线上商城" value="online_store" />
                <el-option label="📱 微信小程序" value="wechat_mini" />
                <el-option label="💬 微信客服" value="wechat_service" />
                <el-option label="📞 电话咨询" value="phone_call" />
                <el-option label="🏪 线下门店" value="offline_store" />
                <el-option label="👥 客户推荐" value="referral" />
                <el-option label="📺 广告投放" value="advertisement" />
                <el-option label="🎯 其他渠道" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 收货信息 -->
      <div v-if="selectedCustomer" class="form-section">
        <div class="section-header" @click="deliveryCollapsed = !deliveryCollapsed" style="cursor: pointer;">
          <div class="header-left">
            <el-icon><Location /></el-icon>
            <span>收货信息</span>
            <el-tag v-if="orderForm.markType === 'virtual'" type="info" size="small" style="margin-left: 8px;">选填</el-tag>
          </div>
          <div class="header-right">
            <el-icon class="collapse-icon" :class="{ 'collapsed': deliveryCollapsed }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="!deliveryCollapsed">
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
              <el-col :span="8">
                <el-form-item label="收货电话" prop="receiverPhone">
                  <div class="phone-management">
                    <!-- 🔥 修复：使用selectedPhoneId来显示加密号码 -->
                    <el-select
                      v-model="selectedPhoneId"
                      placeholder="请选择收货电话"
                      style="width: 180px"
                      clearable
                      @change="handlePhoneSelect"
                    >
                      <el-option
                        v-for="phone in customerPhones"
                        :key="phone.id"
                        :label="displaySensitiveInfoNew(phone.number, SensitiveInfoType.PHONE)"
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
                <el-form-item label="指定快递" prop="expressCompany" required>
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
                      :label="displaySensitiveInfoNew(addr.content, SensitiveInfoType.ADDRESS)"
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
        </el-collapse-transition>
      </div>

      <!-- 自定义字段 -->
      <CustomFieldsCard v-model="orderForm.customFields" :show="!!selectedCustomer" />

      <!-- 产品选择区域 -->
      <div class="form-section">
        <div class="section-header">
          <div class="header-left">
            <el-icon><ShoppingBag /></el-icon>
            <span>产品选择</span>
          </div>
          <div class="header-right">
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
        </div>

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

        <!-- 产品容器 - 显示商品卡片 -->
        <div class="product-container">
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
        </div>
      </div>

      <!-- 订单汇总区域 -->
      <div class="form-section">
        <div class="section-header">
          <el-icon><Money /></el-icon>
          <span>订单汇总</span>
        </div>

        <!-- 已选商品列表 -->
        <div class="selected-products" v-if="orderForm.products.length > 0">
          <h4>已选商品</h4>
          <el-table :data="orderForm.products" style="width: 100%">
            <el-table-column prop="productName" label="商品名称" min-width="200">
              <template #default="{ row }">
                <div class="selected-product-name">
                  <div class="selected-product-name-row">
                    <el-tag v-if="row.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
                    <el-tag v-else size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
                    <span style="font-weight: 600;">{{ row.productName }}</span>
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
                  @change="calculateSubtotal"
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
        <div v-else class="empty-products">
          <el-empty description="暂无选择商品" />
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

          <!-- 第二行：代收金额、优惠金额、定金截图 -->
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
                  <el-radio label="normal" :disabled="onlyVirtualProducts">
                    <el-tag type="success" size="small">正常发货单</el-tag>
                  </el-radio>
                  <el-radio label="reserved" :disabled="onlyVirtualProducts">
                    <el-tag type="warning" size="small">预留单</el-tag>
                  </el-radio>
                  <el-radio v-if="hasVirtualProduct" value="virtual" :disabled="hasPhysicalProduct">
                    <el-tag type="info" size="small" color="#7B68EE" style="color:#fff;">虚拟发货</el-tag>
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
                  v-else-if="orderForm.markType === 'virtual'"
                  title="虚拟发货"
                  description="虚拟商品订单，审核通过后进入虚拟发货流程，无需填写物流信息。"
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
          <el-button @click="saveOrder" type="primary" size="large" :loading="saving">
            保存更新
          </el-button>
        </div>
      </div>
    </el-form>

    <!-- 客户选择弹窗 -->
    <el-dialog
      v-model="showCustomerDialog"
      title="选择客户"
      width="800px"
      :before-close="handleCustomerDialogClose"
    >
      <div class="customer-search">
        <el-input
          v-model="customerSearchKeyword"
          placeholder="搜索客户姓名或电话..."
          @input="searchCustomers"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="customer-list">
        <el-table
          :data="customerSearchResults"
          @row-click="selectCustomer"
          highlight-current-row
          style="width: 100%"
        >
          <el-table-column prop="name" label="客户姓名" />
          <el-table-column prop="phone" label="联系电话">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>
          <el-table-column prop="address" label="地址">
            <template #default="{ row }">
              {{ row.address ? displaySensitiveInfoNew(row.address, SensitiveInfoType.ADDRESS) : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 添加电话号码弹窗 -->
    <el-dialog
      v-model="showAddPhoneDialog"
      title="添加电话号码"
      width="400px"
    >
      <el-form :model="phoneForm" label-width="80px">
        <el-form-item label="电话号码">
          <el-input
            v-model="phoneForm.phone"
            placeholder="请输入电话号码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddPhoneDialog = false">取消</el-button>
          <el-button type="primary" @click="addPhoneNumber">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 订单确认弹窗 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="订单确认"
      width="600px"
      :before-close="handleConfirmDialogClose"
    >
      <div class="order-confirm">
        <h4>请确认以下订单信息：</h4>

        <div class="confirm-section customer-info-section">
          <h5>客户信息</h5>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">客户：</span>
              <span class="value">{{ orderForm.customerName }}</span>
            </div>
            <div class="info-item">
              <span class="label">电话：</span>
              <span class="value">{{ orderForm.customerPhone }}</span>
            </div>
            <div class="info-item" v-if="orderForm.receiverName">
              <span class="label">收货人：</span>
              <span class="value">{{ orderForm.receiverName }}</span>
            </div>
            <div class="info-item" v-if="orderForm.receiverAddress">
              <span class="label">收货地址：</span>
              <span class="value">{{ displaySensitiveInfoNew(orderForm.receiverAddress, SensitiveInfoType.ADDRESS) }}</span>
            </div>
            <div class="info-item" v-if="orderForm.expressCompany && orderForm.markType !== 'virtual'">
              <span class="label">快递公司：</span>
              <span class="value">{{ orderForm.expressCompany }}</span>
            </div>
            <div v-if="orderForm.markType === 'virtual'" class="info-item">
              <span class="label">发货方式：</span>
              <span class="value" style="color: #409EFF;">虚拟发货（卡密/资源交付）</span>
            </div>
            <div v-if="orderForm.remarks || orderForm.remark" class="info-item">
              <span class="label">备注：</span>
              <span class="value">{{ orderForm.remarks || orderForm.remark }}</span>
            </div>
          </div>
        </div>

        <div class="confirm-section order-mark">
          <h5>订单标记</h5>
          <div class="mark-content">
            <div class="mark-item">
              <span class="label">订单类型：</span>
              <el-tag
                :type="orderForm.markType === 'normal' ? 'success' : orderForm.markType === 'virtual' ? 'primary' : 'warning'"
                size="small"
              >
                {{ orderForm.markType === 'normal' ? '正常发货单' : orderForm.markType === 'virtual' ? '虚拟发货' : '预留单' }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="confirm-section amount-info">
          <h5>金额汇总</h5>
          <div class="amount-summary-two-columns">
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

        <div class="confirm-section product-info-section">
          <h5>商品信息</h5>
          <el-table :data="orderForm.products" size="small">
            <el-table-column prop="productName" label="商品名称" />
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
          <el-button @click="showConfirmDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSaveOrder" :loading="saving">
            确认保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 图片查看器 -->
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="currentImageList"
      :initial-index="0"
      @close="showImageViewer = false"
    />

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'OrderEdit'
})

import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, ZoomIn, Delete, ArrowDown, User, Message, Location, Plus, ShoppingBag, Refresh, View, Upload, DocumentCopy, Money } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useProductStore } from '@/stores/product'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { createSafeNavigator } from '@/utils/navigation'
import CustomFieldsCard from '@/components/Order/CustomFieldsCard.vue'
import { customerDetailApi } from '@/api/customerDetail'
import { getAddressLabel } from '@/utils/addressData'

const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 初始化stores
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const productStore = useProductStore()
const userStore = useUserStore()
const configStore = useConfigStore()

// 获取订单ID
const orderId = route.params.id

// 响应式数据
const saving = ref(false)
const searchKeyword = ref('')
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

// 构建客户可读地址
const buildCustomerReadableAddress = (customer: any): string => {
  if (customer.province || customer.city || customer.district) {
    const label = getAddressLabel(customer.province, customer.city, customer.district, customer.street)
    if (label) return customer.detailAddress ? label + customer.detailAddress : label
  }
  return customer.address || ''
}
const searchResults = ref([])
const productSearchKeyword = ref('')
const customerSearchKeyword = ref('')
const customerSearchResults = ref<any[]>([])
const customerPhones = ref<{ id: string; number: string }[]>([])
// 🔥 选中的手机号ID（用于下拉框显示加密号码）
const selectedPhoneId = ref<string | null>(null)
const showCustomerDialog = ref(false)
const showAddPhoneDialog = ref(false)
const showConfirmDialog = ref(false)
const showImageViewer = ref(false)
const currentImageList = ref<string[]>([])
const viewImageUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const depositScreenshots = ref<string[]>([])
const showZoomIcon = ref(-1)
const selectedCustomer = ref<any>(null)
const deliveryCollapsed = ref(false) // 配送信息默认展开

// 物流公司列表
const expressCompanyList = ref<{ code: string; name: string; logo?: string }[]>([])
const expressCompanyLoading = ref(false)

// 表单数据
const orderForm = reactive({
  id: null,
  customerId: null,
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryTime: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  expressCompany: '',
  serviceWechat: '',
  orderSource: '',
  products: [] as any[],
  subtotal: 0,
  totalAmount: 0,
  depositAmount: 0,
  collectedAmount: 0,
  discountAmount: 0,
  depositScreenshot: '',
  paymentMethod: '',
  paymentMethodOther: '',
  orderType: 'normal',
  markType: 'normal',
  remarks: '',
  remark: '',
  customFields: {} as Record<string, unknown>
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

// 处理订单标记类型变化
const handleMarkTypeChange = (value: string) => {
  orderForm.markType = value
  orderForm.orderType = value
}

// 🔥 虚拟商品类型判断
const hasPhysicalProduct = computed(() =>
  orderForm.products.some((p: any) => (p.productType || 'physical') === 'physical')
)
const hasVirtualProduct = computed(() =>
  orderForm.products.some((p: any) => p.productType === 'virtual')
)
const onlyVirtualProducts = computed(() =>
  orderForm.products.length > 0 && !hasPhysicalProduct.value && hasVirtualProduct.value
)

// 🔥 监听商品列表变化，自动切换标记
watch(() => orderForm.products, () => {
  if (onlyVirtualProducts.value && orderForm.markType !== 'virtual') {
    orderForm.markType = 'virtual'
    orderForm.orderType = 'virtual'
    ElMessage.info('当前仅含虚拟商品，已自动切换为虚拟发货')
  } else if (hasPhysicalProduct.value && orderForm.markType === 'virtual') {
    orderForm.markType = 'normal'
    orderForm.orderType = 'normal'
    ElMessage.info('包含实物商品，已自动切换为正常发货单')
  }
}, { deep: true })

// 电话表单
const phoneForm = reactive({
  phone: ''
})

// 表单验证规则
const formRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  serviceWechat: [{ required: true, message: '请输入客服微信号', trigger: 'blur' }],
  orderSource: [{ required: true, message: '请选择订单来源', trigger: 'change' }],
  expressCompany: [{ required: true, message: '请选择快递公司', trigger: 'change' }]
}

// 计算属性
const subtotal = computed(() => {
  return orderForm.products.reduce((sum, product) => {
    return sum + ((product.price || 0) * (product.quantity || 0))
  }, 0)
})

const collectAmount = computed(() => {
  return (orderForm.totalAmount || 0) - (orderForm.depositAmount || 0)
})

const discountAmount = computed(() => {
  return subtotal.value - (orderForm.totalAmount || 0)
})

const discountPercentage = computed(() => {
  if (subtotal.value > 0 && discountAmount.value > 0) {
    return (discountAmount.value / subtotal.value) * 100
  }
  return 0
})

// 根据用户角色获取最大优惠比例
const maxDiscountRate = computed(() => {
  const userRole = userStore.currentUser?.role || 'employee'
  // 🔥 修复：正确映射所有销售相关角色
  let mappedRole = userRole
  if (userRole === 'employee' || userRole === 'sales_staff' || userRole === 'sales') {
    mappedRole = 'sales'
  }

  console.log('[编辑订单] 计算最大折扣率, 用户角色:', userRole, '映射角色:', mappedRole, '配置:', {
    adminMaxDiscount: configStore.productConfig.adminMaxDiscount,
    managerMaxDiscount: configStore.productConfig.managerMaxDiscount,
    salesMaxDiscount: configStore.productConfig.salesMaxDiscount
  })

  // 【批次202修复】直接从productConfig读取,确保实时同步
  let discountValue = 0
  if (mappedRole === 'admin' || mappedRole === 'super_admin') {
    discountValue = configStore.productConfig.adminMaxDiscount
  } else if (mappedRole === 'department_manager' || mappedRole === 'manager') {
    discountValue = configStore.productConfig.managerMaxDiscount
  } else if (mappedRole === 'sales') {
    discountValue = configStore.productConfig.salesMaxDiscount
  } else {
    // 其他角色默认使用销售员的折扣
    discountValue = configStore.productConfig.salesMaxDiscount || 0
  }
  return discountValue / 100
})

// 过滤后的产品列表
const filteredProducts = computed(() => {
  if (!productSearchKeyword.value) {
    return productStore.products.filter(product => product.status === 'active')
  }
  return productStore.products.filter(product =>
    product.status === 'active' &&
    (product.name.toLowerCase().includes(productSearchKeyword.value.toLowerCase()) ||
     product.code?.toLowerCase().includes(productSearchKeyword.value.toLowerCase()))
  )
})

// 客户选项
const customerOptions = computed(() => {
  return customerStore.customers.filter(customer => !customer.deleted)
})

// 页面初始化
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
      console.log('[编辑订单] 加载物流公司列表成功:', expressCompanyList.value.length, '个')
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
  // 🔥 修复：先加载客户数据，确保客户选择下拉框有数据
  await customerStore.loadCustomers()

  // 加载启用的物流公司列表
  loadExpressCompanies()

  // 加载支付方式配置
  loadPaymentMethods()

  await loadOrderData()

  // 监听订单更新事件，确保数据同步
  window.addEventListener('orderUpdated', handleOrderUpdate)
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
})

// 页面卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('orderUpdated', handleOrderUpdate)
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
})

// 处理订单更新事件
const handleOrderUpdate = (event) => {
  const { orderId: updatedOrderId } = event.detail
  if (updatedOrderId === orderId) {
    // 重新加载当前订单数据
    loadOrderData()
    ElMessage.success('订单数据已同步更新')
  }
}

// 处理订单状态更新事件
const handleOrderStatusUpdate = (event) => {
  const { orderId: updatedOrderId } = event.detail
  if (updatedOrderId === orderId) {
    // 重新加载当前订单数据
    loadOrderData()
    ElMessage.info('订单状态已更新')
  }
}

// 加载订单数据
const loadOrderData = async () => {
  try {
    // 🔥 修复：先加载系统配置，确保折扣限制生效
    await configStore.loadProductConfigFromAPI()

    const order = orderStore.getOrderById(orderId)
    if (order) {
      // 🔥 修复：设置selectedCustomer，确保收货信息和自定义字段卡片显示
      if (order.customerId) {
        const customer = customerStore.getCustomerById(order.customerId)
        if (customer) {
          selectedCustomer.value = customer
        } else {
          // 如果客户不在列表中，创建一个临时客户对象
          selectedCustomer.value = {
            id: order.customerId,
            name: order.customerName || '',
            phone: order.customerPhone || '',
            address: order.deliveryAddress || ''
          }
        }
      }

      // 🔥 加载客户地址列表
      if (order.customerId) {
        await loadCustomerAddresses(order.customerId)
      }

      // 填充表单数据 - 确保所有字段都同步
      Object.assign(orderForm, {
        id: order.id,
        customerId: order.customerId,
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 配送信息
        receiverName: order.receiverName || order.shippingName || '',
        receiverPhone: order.receiverPhone || order.shippingPhone || '',
        receiverAddress: order.receiverAddress || order.shippingAddress || order.deliveryAddress || '',
        deliveryAddress: order.deliveryAddress || order.shippingAddress || '',
        deliveryTime: order.deliveryTime || '',
        expressCompany: order.expressCompany || '',
        // 客服和订单来源
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        // 产品和金额 - 🔥 修复：确保产品数据正确映射
        products: (order.products || []).map((p: any) => ({
          productId: p.productId || p.id,
          productName: p.productName || p.name || '',
          productCode: p.productCode || p.code || '',
          specification: p.specification || '',
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 1,
          subtotal: (Number(p.price) || 0) * (Number(p.quantity) || 1),
          stock: p.stock || 999
        })),
        subtotal: Number(order.subtotal) || 0,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectedAmount: Number(order.collectedAmount) || 0,
        discountAmount: Number(order.discountAmount) || 0,
        depositScreenshot: order.depositScreenshot || '',
        paymentMethod: order.paymentMethod || '',
        paymentMethodOther: order.paymentMethodOther || '',
        orderType: order.orderType || order.markType || 'normal',
        markType: order.markType || 'normal',
        remarks: order.remarks || order.remark || '',
        remark: order.remark || order.remarks || '',
        // 🔥 自定义字段
        customFields: order.customFields || {}
      })

      // 加载客户电话列表
      if (order.customerId) {
        await loadCustomerPhones(order.customerId)
      }

      // 初始化截图数组
      if (order.depositScreenshots && Array.isArray(order.depositScreenshots)) {
        depositScreenshots.value = [...order.depositScreenshots]
      } else if (order.depositScreenshot) {
        depositScreenshots.value = [order.depositScreenshot]
      } else {
        depositScreenshots.value = []
      }

      // 重新计算金额（标记为加载模式，不覆盖totalAmount）
      isLoadingOrder = true
      calculateSubtotal()
      isLoadingOrder = false
    }
  } catch (error) {
    console.error('加载订单数据失败:', error)
    ElMessage.error('加载订单数据失败')
    goBack()
  }
}

// 搜索产品
const searchProducts = async () => {
  if (searchKeyword.value.trim()) {
    try {
      searchResults.value = await productStore.searchProducts(searchKeyword.value)
    } catch (error) {
      console.error('搜索产品失败:', error)
      searchResults.value = []
    }
  } else {
    searchResults.value = []
  }
}

// 添加产品
const addProduct = (product) => {
  const existingItem = orderForm.products.find(item => item.productId === product.id)
  if (existingItem) {
    if (product.stock && existingItem.quantity >= product.stock) {
      ElMessage.warning('库存不足')
      return
    }
    existingItem.quantity += 1
    existingItem.subtotal = existingItem.quantity * existingItem.price
  } else {
    orderForm.products.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      specification: product.specification,
      price: product.price,
      quantity: 1,
      subtotal: product.price,
      stock: product.stock || 9999,
      productType: product.productType || 'physical'
    })
  }
  calculateSubtotal()
  searchKeyword.value = ''
  searchResults.value = []
}

// 删除产品
const removeProduct = (index) => {
  orderForm.products.splice(index, 1)
  calculateSubtotal()
}

// 🔥 标志位：是否正在加载已有订单数据（加载时不覆盖totalAmount）
let isLoadingOrder = false

// 计算小计
const calculateSubtotal = () => {
  orderForm.products.forEach(item => {
    item.subtotal = item.quantity * item.price
  })
  orderForm.subtotal = orderForm.products.reduce((sum, item) => sum + item.subtotal, 0)
  calculateAmounts()
}

// 计算金额
const calculateAmounts = () => {
  // 🔥 修复：加载已有订单时不覆盖totalAmount，保留数据库中的真实值（用户可能给过优惠）
  if (!isLoadingOrder) {
    orderForm.totalAmount = orderForm.subtotal
  }
  orderForm.collectedAmount = orderForm.depositAmount
}

// 处理产品搜索
const handleProductSearch = () => {
  // 产品搜索通过computed属性filteredProducts自动处理
}

// 处理客户变更
const handleCustomerChange = async (customerId) => {
  if (customerId) {
    const customer = customerStore.getCustomerById(customerId)
    if (customer) {
      selectedCustomer.value = customer
      orderForm.customerName = customer.name
      orderForm.customerPhone = customer.phone
      orderForm.deliveryAddress = buildCustomerReadableAddress(customer)

      // 同步收货人信息（默认使用客户信息）
      orderForm.receiverName = customer.name
      orderForm.receiverPhone = customer.phone
      orderForm.receiverAddress = buildCustomerReadableAddress(customer)

      // 同步客户微信号到客服微信号字段
      orderForm.serviceWechat = customer.wechatId || ''

      // 同步客户订单来源
      orderForm.orderSource = customer.source || ''

      // 自动展开收货信息区域
      deliveryCollapsed.value = false

      // 加载客户电话列表
      await loadCustomerPhones(customerId)

      // 🔥 加载客户地址列表
      await loadCustomerAddresses(customerId)
    }
  } else {
    selectedCustomer.value = null
    orderForm.customerName = ''
    orderForm.customerPhone = ''
    orderForm.deliveryAddress = ''
    orderForm.receiverName = ''
    orderForm.receiverPhone = ''
    orderForm.serviceWechat = ''
    orderForm.orderSource = ''
    customerPhones.value = []
  }
}

// 刷新产品列表
const handleRefreshProducts = () => {
  productStore.refreshProducts()
  ElMessage.success('产品列表已刷新')
}

// 查看产品详情
const viewProductDetail = (product) => {
  // 跳转到商品详情页
  safeNavigator.push(`/product/detail/${product.id}`)
}

// 处理总金额变更（包含优惠校验）
const handleTotalAmountChange = (value: number | null) => {
  // 如果value为null或undefined，不处理
  if (value === null || value === undefined) {
    return
  }

  // 计算最低可优惠价格（基于管理员设置的优惠比例）
  const minAllowedAmount = subtotal.value * (1 - maxDiscountRate.value)

  // 检查是否低于最低允许金额
  if (value < minAllowedAmount) {
    ElMessageBox.alert(
      `订单总额不能低于 ¥${minAllowedAmount.toFixed(2)}（最大优惠${(maxDiscountRate.value * 100).toFixed(0)}%）`,
      '优惠限制提示',
      {
        confirmButtonText: '确定',
        type: 'warning',
        callback: () => {
          // 弹窗关闭后自动调整到最低允许金额
          orderForm.totalAmount = minAllowedAmount
          calculateCollectAmount()
        }
      }
    )
    return
  }

  // 检查是否超过商品小计
  if (value > subtotal.value) {
    ElMessageBox.alert(
      '订单总额不能超过商品小计',
      '提示',
      {
        confirmButtonText: '确定',
        type: 'warning',
        callback: () => {
          orderForm.totalAmount = subtotal.value
          calculateCollectAmount()
        }
      }
    )
    return
  }

  // 如果定金大于新的订单总额，自动调整定金
  if ((orderForm.depositAmount || 0) > value) {
    orderForm.depositAmount = value
    ElMessage.info('定金已自动调整为订单总额')
  }

  orderForm.totalAmount = value
  calculateCollectAmount()
}

// 计算代收金额
const calculateCollectAmount = () => {
  // 代收金额 = 订单总额 - 定金
  orderForm.collectedAmount = (orderForm.totalAmount || 0) - (orderForm.depositAmount || 0)
}

// 重置到商品小计
const resetToSubtotal = () => {
  orderForm.totalAmount = subtotal.value
  calculateCollectAmount()
}

// 检查是否手动修改过总金额
const isManuallyModified = computed(() => {
  return Math.abs((orderForm.totalAmount || 0) - subtotal.value) > 0.01
})

// 搜索客户
const searchCustomers = async () => {
  if (customerSearchKeyword.value.trim()) {
    try {
      customerSearchResults.value = await customerStore.searchCustomers(customerSearchKeyword.value)
    } catch (error) {
      console.error('搜索客户失败:', error)
      customerSearchResults.value = []
    }
  } else {
    customerSearchResults.value = []
  }
}

// 选择客户
const selectCustomer = async (customer) => {
  orderForm.customerId = customer.id
  orderForm.customerName = customer.name
  orderForm.customerPhone = customer.phone
  orderForm.deliveryAddress = customer.address || ''

  // 同步收货人信息（默认使用客户信息）
  orderForm.receiverName = customer.name
  orderForm.receiverPhone = customer.phone

  // 同步客户微信号到客服微信号字段
  orderForm.serviceWechat = customer.wechatId || ''

  // 同步客户订单来源
  orderForm.orderSource = customer.source || ''

  // 自动展开收货信息区域
  deliveryCollapsed.value = false

  await loadCustomerPhones(customer.id)
  showCustomerDialog.value = false
}

// 加载客户电话列表
const loadCustomerPhones = async (customerId) => {
  try {
    const phones = await customerStore.getCustomerPhones(customerId)
    // 🔥 修复：统一数据格式，store返回的是 { id, phone }，需要转换为 { id, number }
    customerPhones.value = (phones || []).map((p: any) => ({
      id: String(p.id),
      number: p.phone || p.number || ''
    }))

    // 🔥 设置默认选中的电话
    if (customerPhones.value.length > 0) {
      // 如果当前收货电话在列表中，选中它
      const currentPhone = customerPhones.value.find(p => p.number === orderForm.receiverPhone)
      if (currentPhone) {
        selectedPhoneId.value = currentPhone.id
      } else {
        // 否则选择第一个
        selectedPhoneId.value = customerPhones.value[0].id
        orderForm.receiverPhone = customerPhones.value[0].number
      }
    }
  } catch (error) {
    console.error('加载客户电话失败:', error)
    customerPhones.value = []
    selectedPhoneId.value = null
  }
}

// 🔥 处理手机号选择（用于显示加密号码）
const handlePhoneSelect = (phoneId: string | null) => {
  if (phoneId === null) {
    orderForm.receiverPhone = ''
    return
  }
  const phone = customerPhones.value.find(p => p.id === phoneId)
  if (phone) {
    orderForm.receiverPhone = phone.number
  }
}

// 🔥 同步客户地址到收货地址
const syncCustomerAddress = () => {
  if (selectedCustomer.value) {
    orderForm.receiverAddress = buildCustomerReadableAddress(selectedCustomer.value)
    ElMessage.success('已同步客户地址')
  }
}

// 添加电话号码
const addPhoneNumber = async () => {
  if (!phoneForm.phone.trim()) {
    ElMessage.warning('请输入电话号码')
    return
  }

  try {
    await customerStore.addCustomerPhone(orderForm.customerId, phoneForm.phone)
    const newPhone = { id: Date.now().toString(), number: phoneForm.phone }
    customerPhones.value.push(newPhone)

    // 🔥 自动选中新添加的电话
    selectedPhoneId.value = newPhone.id
    orderForm.receiverPhone = phoneForm.phone

    phoneForm.phone = ''
    showAddPhoneDialog.value = false
    ElMessage.success('添加电话号码成功')
  } catch (_error) {
    console.error('添加电话号码失败:', _error)
    ElMessage.error('添加电话号码失败')
  }
}

// 选择截图
const selectScreenshot = () => {
  fileInput.value?.click()
}

// 触发文件上传
const triggerUpload = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      if (depositScreenshots.value.length >= 3) {
        ElMessage.warning('最多只能上传3张图片')
        break
      }
      handleImageFile(files[i])
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = ''
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
const handleImageFile = async (file) => {
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

// 文件上传前验证
const beforeUpload = (file) => {
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

// 拍照
const takeScreenshot = () => {
  // 这里可以集成相机功能
  ElMessage.info('拍照功能待实现')
}

// 查看截图
const viewScreenshot = () => {
  viewImageUrl.value = orderForm.depositScreenshot
  showImageViewer.value = true
}

// 预览图片
const previewImage = (imageUrl) => {
  const url = imageUrl || orderForm.depositScreenshot
  if (url) {
    currentImageList.value = [url]
    showImageViewer.value = true
  }
}

// 删除截图
const removeScreenshot = (index) => {
  if (typeof index === 'number') {
    // 删除特定索引的截图
    depositScreenshots.value.splice(index, 1)
    // 更新orderForm中的字段
    orderForm.depositScreenshot = depositScreenshots.value[0] || ''
    ElMessage.success('图片已删除')
  } else {
    // 兼容旧的删除所有截图的方式
    depositScreenshots.value = []
    orderForm.depositScreenshot = ''
  }
}

// 保存订单
const saveOrder = () => {
  // 验证表单
  if (!orderForm.customerName) {
    ElMessage.warning('请选择客户')
    return
  }

  if (orderForm.products.length === 0) {
    ElMessage.warning('请至少选择一个产品')
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

  showConfirmDialog.value = true
}

// 确认保存订单
const confirmSaveOrder = async () => {
  saving.value = true
  try {
    // 🔥 修复：调用API保存到数据库
    const { orderApi } = await import('@/api/order')

    // 🔥 修复：转换产品数据格式，确保字段名与列表显示一致
    const formattedProducts = orderForm.products.map((p: any) => ({
      id: p.productId || p.id,
      productId: p.productId || p.id,
      name: p.productName || p.name || '',  // 列表显示用 name
      productName: p.productName || p.name || '',
      code: p.productCode || p.code || '',
      productCode: p.productCode || p.code || '',
      specification: p.specification || '',
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 1,
      subtotal: (Number(p.price) || 0) * (Number(p.quantity) || 1)
    }))

    // 构建要更新的订单数据
    const updateData = {
      customerId: orderForm.customerId,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      // 收货信息
      shippingName: orderForm.receiverName,
      shippingPhone: orderForm.receiverPhone,
      shippingAddress: orderForm.receiverAddress || orderForm.deliveryAddress,
      receiverAddress: orderForm.receiverAddress,
      expressCompany: orderForm.expressCompany,
      // 客服和订单来源
      serviceWechat: orderForm.serviceWechat,
      orderSource: orderForm.orderSource,
      // 产品和金额 - 🔥 使用格式化后的产品数据
      products: formattedProducts,
      totalAmount: orderForm.totalAmount,
      depositAmount: orderForm.depositAmount,
      discountAmount: discountAmount.value,
      // 截图
      depositScreenshots: depositScreenshots.value,
      depositScreenshot: depositScreenshots.value[0] || '',
      // 支付方式
      paymentMethod: orderForm.paymentMethod,
      paymentMethodOther: orderForm.paymentMethodOther,
      // 订单标记
      markType: orderForm.markType,
      // 备注
      remark: orderForm.remarks || orderForm.remark,
      // 自定义字段
      customFields: orderForm.customFields
    }

    console.log('[编辑订单] 提交更新数据:', updateData)

    const response = await orderApi.update(orderId as string, updateData as any)

    if (response && response.success !== false) {
      // 🔥 同时更新本地store数据
      orderStore.updateOrder(orderId as string, {
        ...updateData,
        customerId: orderForm.customerId || undefined,
        receiverName: orderForm.receiverName,
        receiverPhone: orderForm.receiverPhone,
        deliveryAddress: orderForm.deliveryAddress
      } as any)

      ElMessage.success('订单更新成功')
      showConfirmDialog.value = false

      // 自动关闭页面并刷新订单列表
      setTimeout(() => {
        safeNavigator.push('/order/list')
      }, 1000)
    } else {
      throw new Error(response?.message || '更新失败')
    }
  } catch (error: any) {
    console.error('更新订单失败:', error)
    ElMessage.error(error.message || '更新订单失败')
  } finally {
    saving.value = false
  }
}

// 处理取消操作
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm('确定要取消吗？未保存的数据将丢失', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })

    safeNavigator.push('/order/list')
  } catch (error) {
    // 用户取消操作
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 处理弹窗关闭
const handleCustomerDialogClose = () => {
  showCustomerDialog.value = false
  customerSearchKeyword.value = ''
  customerSearchResults.value = []
}

const handleConfirmDialogClose = () => {
  showConfirmDialog.value = false
}
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

/* 页面容器 */
.order-edit-page {
  padding: 12px;
  background-color: #f5f5f5;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
}

/* 页面标题 */
.page-header {
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 2px solid #e5e7eb;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

/* 表单区域 */
.form-section {
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 区域标题 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.section-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #6b7280; /* 调整为灰色但清晰可见 */
}

.section-header .header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 简单的section-header样式（没有header-left/header-right结构的） */
.section-header:not(:has(.header-left)) {
  justify-content: flex-start;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #6b7280; /* 调整为灰色但清晰可见 */
}

.section-header:not(:has(.header-left)) .el-icon {
  color: #6b7280;
}

.section-header:not(:has(.header-left)) span {
  color: #6b7280;
}

.order-form {
  max-width: 100%;
  margin: 0;
  width: 100%;
}

/* 客户信息样式 */
.customer-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.customer-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.field-label {
  min-width: 80px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.field-input {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.readonly-input {
  flex: 1;
}

.select-customer-btn {
  flex-shrink: 0;
}

.phone-management {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.phone-select {
  flex: 1;
  min-width: 200px;
}

/* 配送信息样式 */
.delivery-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.delivery-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

/* 产品搜索样式 */
.product-search {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
}

/* 产品容器样式 */
.product-container {
  margin-top: 16px;
}

.product-search {
  margin-bottom: 20px;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  max-height: 450px;
  overflow-y: auto;
  padding: 4px;
}

.product-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
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
  margin-bottom: 6px;
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
  margin-bottom: 6px;
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

/* 已选产品样式 */
.empty-products {
  text-align: center;
  padding: 40px 0;
}

.selected-products {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.selected-products h4 {
  color: #6b7280; /* 与其他标题保持一致的灰色 */
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding: 0;
}

.selected-product-name {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

/* 金额汇总样式 */
/* 简约现代化金额汇总样式 */
.amount-summary-modern {
  margin-top: 16px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.amount-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 1.5%;
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
  flex: 0 0 22%; /* 增加宽度 */
}

.amount-field:nth-child(3) { /* 定金金额 */
  flex: 0 0 20%; /* 增加宽度 */
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
  min-width: 120px; /* 确保最小宽度 */
}

.field-input .el-input-number {
  width: 100%;
  min-width: 120px; /* 确保最小宽度 */
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

.mark-section {
  margin-top: 24px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.mark-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.mark-description {
  margin-top: 12px;
}

.remark-section {
  margin-top: 24px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.form-footer {
  margin-top: 32px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 订单标记样式 */
.order-tags {
  display: flex;
  gap: 16px;
}

/* 备注样式 */
.remarks {
  width: 100%;
}

/* 操作按钮样式 */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
  margin-top: 32px;
}

/* 弹窗样式 */
.customer-search {
  margin-bottom: 16px;
}

.customer-list {
  max-height: 400px;
  overflow-y: auto;
}

/* 订单确认弹窗 */
.order-confirm {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.order-confirm h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f2f5;
}

.confirm-section {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
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
  background: #409eff;
  border-radius: 2px;
}

.confirm-section p {
  margin: 6px 0;
  color: #4b5563;
  font-size: 13px;
  display: flex;
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

.confirm-section .el-tag {
  border-radius: 6px;
  font-weight: 500;
}

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

.image-viewer {
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .customer-info,
  .delivery-info {
    grid-template-columns: 1fr;
  }

  .amount-row-main {
    flex-direction: column;
    gap: 12px;
  }

  .amount-card {
    min-width: auto;
    max-width: none;
  }

  .amount-row-detail {
    flex-direction: column;
    gap: 16px;
  }

  .discount-input-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .order-edit-page {
    padding: 12px;
  }

  .page-title {
    font-size: 24px;
    margin-bottom: 16px;
  }

  .section-content {
    padding: 16px;
  }

  .customer-field,
  .delivery-field {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .field-label {
    min-width: auto;
  }

  .field-input {
    width: 100%;
  }

  .product-list {
    grid-template-columns: 1fr;
  }

  .form-footer {
    flex-direction: column;
  }

  .form-footer .el-button {
    width: 100%;
  }

  .amount-summary-two-columns {
    flex-direction: column;
    gap: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

/* 折叠图标样式 */
.collapse-icon {
  transition: transform 0.3s ease;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
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
</style>

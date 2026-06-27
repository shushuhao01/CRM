<template>
  <div class="product-edit">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>{{ isEdit ? '编辑商品' : '新增商品' }}</h2>
          <div class="header-meta">
            <span v-if="isEdit" class="product-code">商品编码：{{ productForm.code }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 表单内容 -->
    <div class="form-content">
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="formRules"
        label-width="120px"
        size="default"
      >
        <!-- ★ 商品类型选择器 -->
        <el-card class="form-card product-type-card" style="margin-bottom: 20px;">
          <template #header>
            <span>★ 选择商品类型</span>
          </template>
          <div class="product-type-selector">
            <div class="type-cards" :class="{ disabled: isEdit }">
              <div
                class="type-card"
                :class="{ active: productForm.productType === 'physical' }"
                @click="!isEdit && (productForm.productType = 'physical')"
              >
                <div class="type-card-check" v-if="productForm.productType === 'physical'">✓</div>
                <el-icon :size="20"><Box /></el-icon>
                <span class="type-title">普通商品</span>
                <span class="type-desc">需要发实物物流配送</span>
              </div>
              <div
                class="type-card virtual"
                :class="{ active: productForm.productType === 'virtual' }"
                @click="!isEdit && (productForm.productType = 'virtual')"
              >
                <div class="type-card-check" v-if="productForm.productType === 'virtual'">✓</div>
                <el-icon :size="20"><MagicStick /></el-icon>
                <span class="type-title">虚拟商品</span>
                <span class="type-desc">无需实物物流，线上交付</span>
              </div>
            </div>
            <el-alert v-if="isEdit" type="warning" :closable="false" style="margin-top: 12px;">
              编辑模式下商品类型不可更改
            </el-alert>
          </div>
        </el-card>

        <el-row :gutter="20">
          <!-- 左侧主要信息 -->
          <el-col :span="16">
            <!-- 基本信息 -->
            <el-card class="form-card" title="基本信息">
              <template #header>
                <span>基本信息</span>
              </template>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="商品名称" prop="name">
                    <el-input
                      v-model="productForm.name"
                      placeholder="请输入商品名称"
                      maxlength="100"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品编码" prop="code">
                    <el-input
                      v-model="productForm.code"
                      placeholder="请输入商品编码"
                      :disabled="isEdit"
                    >
                      <template #append>
                        <el-button @click="generateCode" :disabled="isEdit">
                          生成
                        </el-button>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="商品分类" prop="categoryId">
                    <el-cascader
                      v-model="productForm.categoryId"
                      :options="categoryOptions"
                      :props="categoryProps"
                      placeholder="请选择商品分类"
                      style="width: 100%"
                      clearable
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品品牌" prop="brand">
                    <el-input
                      v-model="productForm.brand"
                      placeholder="请输入商品品牌"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="商品规格" prop="specification">
                    <el-input
                      v-model="productForm.specification"
                      placeholder="请输入商品规格"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品单位" prop="unit">
                    <el-select
                      v-model="productForm.unit"
                      placeholder="请选择商品单位"
                      style="width: 100%"
                    >
                      <el-option label="件" value="件" />
                      <el-option label="台" value="台" />
                      <el-option label="个" value="个" />
                      <el-option label="盒" value="盒" />
                      <el-option label="包" value="包" />
                      <el-option label="瓶" value="瓶" />
                      <el-option label="袋" value="袋" />
                      <el-option label="套" value="套" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20" v-if="productForm.productType === 'physical'">
                <el-col :span="12">
                  <el-form-item label="商品重量" prop="weight">
                    <el-input-number
                      v-model="productForm.weight"
                      :precision="3"
                      :step="0.1"
                      :min="0"
                      style="width: 100%"
                    />
                    <span class="unit-text">kg</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品尺寸" prop="dimensions">
                    <el-input
                      v-model="productForm.dimensions"
                      placeholder="长×宽×高 (cm)"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="商品描述" prop="description">
                <el-input
                  v-model="productForm.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入商品描述"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-card>

            <!-- 价格库存 -->
            <el-card class="form-card" title="价格库存">
              <template #header>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>价格库存</span>
                  <div v-if="productForm.productType === 'physical'" style="display: flex; gap: 0;">
                    <button
                      type="button"
                      :style="{
                        padding: '6px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #dcdfe6',
                        borderRadius: '6px 0 0 6px', transition: 'all .2s',
                        background: productForm.skuType !== 'multi' ? '#409eff' : '#fff',
                        color: productForm.skuType !== 'multi' ? '#fff' : '#606266',
                        borderColor: productForm.skuType !== 'multi' ? '#409eff' : '#dcdfe6'
                      }"
                      @click="productForm.skuType = 'none'; handleSkuTypeChange('none')"
                    >无SKU</button>
                    <button
                      type="button"
                      :style="{
                        padding: '6px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #dcdfe6',
                        borderRadius: '0 6px 6px 0', marginLeft: '-1px', transition: 'all .2s',
                        background: productForm.skuType === 'multi' ? '#409eff' : '#fff',
                        color: productForm.skuType === 'multi' ? '#fff' : '#606266',
                        borderColor: productForm.skuType === 'multi' ? '#409eff' : '#dcdfe6'
                      }"
                      @click="productForm.skuType = 'multi'; handleSkuTypeChange('multi')"
                    >设SKU（多规格）</button>
                  </div>
                </div>
              </template>

              <!-- 无SKU模式 -->
              <template v-if="productForm.skuType !== 'multi' || productForm.productType !== 'physical'">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="销售价格" prop="price">
                      <el-input-number v-model="productForm.price" :precision="2" :step="0.01" :min="0" style="width: 100%" />
                      <span class="unit-text">元</span>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="成本价格" prop="costPrice">
                      <el-input-number v-model="productForm.costPrice" :precision="2" :step="0.01" :min="0" style="width: 100%" />
                      <span class="unit-text">元</span>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="市场价格" prop="marketPrice">
                      <el-input-number v-model="productForm.marketPrice" :precision="2" :step="0.01" :min="0" style="width: 100%" />
                      <span class="unit-text">元</span>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12" v-if="productForm.productType === 'physical'">
                    <el-form-item label="当前库存" prop="stock">
                      <el-input-number v-model="productForm.stock" :min="0" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20" v-if="productForm.productType === 'physical'">
                  <el-col :span="12">
                    <el-form-item label="最低库存" prop="minStock">
                      <el-input-number v-model="productForm.minStock" :min="0" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="最高库存" prop="maxStock">
                      <el-input-number v-model="productForm.maxStock" :min="0" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </template>

              <!-- SKU模式 -->
              <template v-if="productForm.skuType === 'multi' && productForm.productType === 'physical'">
                <!-- 规格组管理 -->
                <div class="sku-spec-section" style="margin-bottom: 20px;">
                  <div v-for="(group, gIdx) in skuSpecGroups" :key="gIdx" style="margin-bottom: 16px; padding: 14px 16px; background: #f5f7fa; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                      <el-input v-model="group.specName" :placeholder="['规格名称（如：颜色）','规格名称（如：尺寸）','规格名称（如：款式）'][gIdx] || '规格名称'" style="width: 220px;" />
                      <el-button type="danger" :icon="Delete" circle size="small" @click="removeSpecGroup(gIdx)" />
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                      <el-tag v-for="(val, vIdx) in group.specValues" :key="vIdx" closable @close="removeSpecValue(gIdx, vIdx)" type="primary" effect="light">
                        {{ val }}
                      </el-tag>
                      <el-input v-model="group._inputVal" placeholder="输入规格值后按回车" style="width: 220px;" size="small" @keyup.enter="addSpecValue(gIdx)" />
                    </div>
                  </div>
                  <el-button type="primary" plain size="small" @click="addSpecGroup" :disabled="skuSpecGroups.length >= 3">
                    + 添加规格组{{ skuSpecGroups.length >= 3 ? '（最多3组）' : '' }}
                  </el-button>
                </div>

                <!-- SKU矩阵表格 -->
                <div v-if="skuList.length > 0" class="sku-table-section">
                  <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; font-size: 14px;">SKU列表（共{{ skuList.length }}个）
                      <span v-if="skuSelectedRows.length > 0" style="font-weight: 400; font-size: 12px; color: #909399; margin-left: 6px;">已选 {{ skuSelectedRows.length }} 项</span>
                    </span>
                    <div style="display: flex; gap: 6px;">
                      <el-button size="small" :disabled="skuSelectedRows.length === 0" style="background: #ecf5ff; color: #409eff; border-color: #d9ecff;" @click="batchSetSkuField('price', '售价')">批量设售价</el-button>
                      <el-button size="small" :disabled="skuSelectedRows.length === 0" style="background: #f0f9eb; color: #67c23a; border-color: #e1f3d8;" @click="batchSetSkuField('costPrice', '成本')">批量设成本</el-button>
                      <el-button size="small" :disabled="skuSelectedRows.length === 0" style="background: #fdf6ec; color: #e6a23c; border-color: #faecd8;" @click="batchSetSkuField('stock', '库存')">批量设库存</el-button>
                      <el-button size="small" :disabled="skuSelectedRows.length === 0" style="background: #f4f4f5; color: #909399; border-color: #e9e9eb;" @click="batchSetSkuField('weight', '重量')">批量设重量</el-button>
                    </div>
                  </div>
                  <el-table :data="skuList" border size="small" max-height="450" @selection-change="handleSkuSelectionChange" ref="skuTableRef">
                    <el-table-column type="selection" width="45" align="center" />
                    <el-table-column label="SKU图片" width="80" align="center">
                      <template #default="{ row }">
                        <div style="display: flex; justify-content: center;">
                          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" style="display: none;" :ref="(el: any) => { if (el) skuImageInputRefs[row.skuName] = el }" @change="(e: Event) => handleSkuFileChange(e, row)" />
                          <el-image v-if="row.skuImage" :src="row.skuImage" style="width: 50px; height: 50px; cursor: pointer; border-radius: 4px; border: 1px solid #ebeef5;" fit="cover" @click="triggerSkuImageUpload(row)" />
                          <div v-else style="width: 50px; height: 50px; border: 1px dashed #dcdfe6; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; color: #c0c4cc; font-size: 20px;" @click="triggerSkuImageUpload(row)">+</div>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="SKU规格" min-width="160">
                      <template #default="{ row }">
                        <span style="font-weight: 500;">{{ row.skuName }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column width="120">
                      <template #header><span style="color: #f56c6c;">*</span> 售价(元)</template>
                      <template #default="{ row }">
                        <el-input-number v-model="row.price" :min="0" :precision="2" :step="0.01" size="small" style="width: 100%;" controls-position="right" :class="{ 'sku-field-error': !row.price || row.price <= 0 }" />
                      </template>
                    </el-table-column>
                    <el-table-column label="成本(元)" width="120">
                      <template #default="{ row }">
                        <el-input-number v-model="row.costPrice" :min="0" :precision="2" :step="0.01" size="small" style="width: 100%;" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column width="100">
                      <template #header><span style="color: #f56c6c;">*</span> 库存</template>
                      <template #default="{ row }">
                        <el-input-number v-model="row.stock" :min="0" size="small" style="width: 100%;" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column label="重量(kg)" width="100">
                      <template #default="{ row }">
                        <el-input-number v-model="row.weight" :min="0" :precision="2" size="small" style="width: 100%;" controls-position="right" />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="60" align="center">
                      <template #default="{ $index }">
                        <el-button type="danger" :icon="Delete" circle size="small" @click="removeSkuItem($index)" />
                      </template>
                    </el-table-column>
                  </el-table>
                  <div style="margin-top: 10px; font-size: 14px; display: flex; gap: 20px;">
                    <span>总库存：<b style="color: #67c23a; font-size: 16px;">{{ skuList.reduce((s: number, k: any) => s + (k.stock || 0), 0) }}</b></span>
                    <span>价格范围：<b style="color: #e6a23c; font-size: 16px;">¥{{ Math.min(...skuList.map((k: any) => k.price || 0)) }} - ¥{{ Math.max(...skuList.map((k: any) => k.price || 0)) }}</b></span>
                  </div>
                </div>
              </template>

              <!-- 虚拟商品库存 -->
              <el-row :gutter="20" v-if="productForm.productType === 'virtual' && productForm.virtualDeliveryType === 'none'">
                <el-col :span="12">
                  <el-form-item label="库存数量" prop="stock" :rules="[{ required: true, message: '无需发货类型必须填写库存', trigger: 'blur' }, { type: 'number', min: 0, message: '库存不能小于0', trigger: 'blur' }]">
                    <el-input-number v-model="productForm.stock" :min="0" style="width: 100%" placeholder="售完即止的数量限制" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-alert
                v-if="productForm.productType === 'virtual' && productForm.virtualDeliveryType && productForm.virtualDeliveryType !== 'none'"
                title="库存由关联的卡密/资源数量自动计算：作废-1，恢复+1"
                type="info" :closable="false" show-icon style="margin-bottom: 16px"
              />

              <!-- 利润计算 -->
              <div class="profit-info" v-if="productForm.skuType !== 'multi'">
                <el-alert
                  :title="`预计利润：¥${calculateProfit()} (${calculateProfitRate()}%)`"
                  type="info" :closable="false" show-icon
                />
              </div>
            </el-card>

            <!-- ★ 虚拟发货设置（仅虚拟商品显示） -->
            <el-card v-if="productForm.productType === 'virtual'" class="form-card" style="margin-bottom: 20px;">
              <template #header>
                <span>虚拟发货设置</span>
              </template>

              <el-form-item label="发货方式" required>
                <div class="virtual-delivery-cards">
                  <div
                    v-for="option in virtualDeliveryOptions"
                    :key="option.value"
                    class="virtual-delivery-card"
                    :class="{ active: productForm.virtualDeliveryType === option.value }"
                    @click="productForm.virtualDeliveryType = option.value"
                  >
                    <span class="vd-emoji">{{ option.emoji }}</span>
                    <span class="vd-name">{{ option.label }}</span>
                    <span class="vd-desc">{{ option.desc }}</span>
                  </div>
                </div>
              </el-form-item>

              <!-- 卡密发货提示 -->
              <el-alert
                v-if="productForm.virtualDeliveryType === 'card_key'"
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 16px;"
              >
                <template #title>
                  <span>发货类型：<b>卡密发货</b>（如激活码、兑换码、会员卡号等）</span>
                </template>
                <template #default>
                  <span style="color: #606266; font-size: 12px;">保存商品后，请前往「卡密库存」添加或导入卡密，并关联到此商品</span>
                </template>
              </el-alert>

              <!-- 资源发货提示 -->
              <el-alert
                v-if="productForm.virtualDeliveryType === 'resource_link'"
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 16px;"
              >
                <template #title>
                  <span>发货类型：<b>网盘资源</b>（如百度网盘链接+提取码）</span>
                </template>
                <template #default>
                  <span style="color: #606266; font-size: 12px;">保存商品后，请前往「资源库存」添加或导入资源链接，并关联到此商品</span>
                </template>
              </el-alert>

              <!-- 加密开关 -->
              <el-form-item v-if="productForm.virtualDeliveryType && productForm.virtualDeliveryType !== 'none'" label="发货内容加密">
                <el-switch v-model="productForm.virtualContentEncrypt" />
                <span style="margin-left: 8px; color: #909399; font-size: 12px;">
                  开启后，发货内容在订单详情中默认以****形式展示
                </span>
              </el-form-item>
            </el-card>

            <!-- 商品图片 -->
            <el-card class="form-card" title="商品图片">
              <template #header>
                <span>商品图片</span>
              </template>

              <div class="image-upload-section">
                <div class="upload-tip">
                  <el-alert
                    title="图片要求：支持 JPG、PNG 格式，单张图片不超过 2MB，建议尺寸 800x800px"
                    type="info"
                    :closable="false"
                  />
                </div>

                <el-upload
                  v-model:file-list="fileList"
                  action="#"
                  list-type="picture-card"
                  :auto-upload="false"
                  :on-change="handleImageChange"
                  :on-remove="handleImageRemove"
                  :on-preview="handleImagePreview"
                  :before-upload="beforeImageUpload"
                  multiple
                  :limit="5"
                >
                  <el-icon><Plus /></el-icon>
                  <template #tip>
                    <div class="el-upload__tip">
                      最多上传5张图片，第一张为主图
                    </div>
                  </template>
                </el-upload>
              </div>
            </el-card>
          </el-col>

          <!-- 右侧设置 -->
          <el-col :span="8">
            <!-- 商品状态 -->
            <el-card class="form-card" title="商品状态">
              <template #header>
                <span>商品状态</span>
              </template>

              <el-form-item label="商品状态" prop="status">
                <el-radio-group v-model="productForm.status">
                  <el-radio label="active">上架</el-radio>
                  <el-radio label="inactive">下架</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="是否推荐" prop="isRecommended">
                <div class="switch-with-preview">
                  <el-switch
                    v-model="productForm.isRecommended"
                    active-text="是"
                    inactive-text="否"
                    active-color="#e6a23c"
                  />
                  <transition name="tag-fade">
                    <el-tag v-if="productForm.isRecommended" type="warning" size="small" effect="light" class="switch-preview-tag">
                      ⭐ 推荐
                    </el-tag>
                  </transition>
                </div>
              </el-form-item>

              <el-form-item label="是否新品" prop="isNew">
                <div class="switch-with-preview">
                  <el-switch
                    v-model="productForm.isNew"
                    active-text="是"
                    inactive-text="否"
                    active-color="#67c23a"
                  />
                  <transition name="tag-fade">
                    <el-tag v-if="productForm.isNew" type="success" size="small" effect="light" class="switch-preview-tag">
                      🆕 新品
                    </el-tag>
                  </transition>
                </div>
              </el-form-item>

              <el-form-item label="是否热销" prop="isHot">
                <div class="switch-with-preview">
                  <el-switch
                    v-model="productForm.isHot"
                    active-text="是"
                    inactive-text="否"
                    active-color="#f56c6c"
                  />
                  <transition name="tag-fade">
                    <el-tag v-if="productForm.isHot" type="danger" size="small" effect="light" class="switch-preview-tag">
                      🔥 热销
                    </el-tag>
                  </transition>
                </div>
              </el-form-item>
            </el-card>


            <!-- 操作提示 -->
            <el-card class="form-card" title="操作提示">
              <template #header>
                <span>操作提示</span>
              </template>

              <div class="tips-content">
                <el-alert
                  title="商品操作须知"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <ul style="margin: 4px 0 0; padding-left: 16px; line-height: 2;">
                    <li>商品编码保存后不可修改，请仔细确认</li>
                    <li>修改价格不会影响已下单的订单，仅对新订单生效</li>
                    <li v-if="productForm.productType === 'virtual'">虚拟商品请在保存后前往对应库存管理页添加卡密或资源</li>
                    <li v-if="productForm.skuType === 'multi'">设置多规格SKU后，价格和库存以各SKU为准</li>
                    <li v-if="productForm.skuType === 'multi'">新增或删除规格会重新生成SKU组合，已有数据将被清除</li>
                    <li v-if="!isEdit">新建商品默认为上架状态，保存后即可在订单中选择</li>
                    <li>商品图片建议使用 800×800px 高清图，第一张为主图</li>
                  </ul>
                </el-alert>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 底部按钮区域 -->
    <div class="form-footer">
      <div class="footer-actions">
        <el-button @click="handleCancel" size="large">取消</el-button>
        <el-button @click="handleSave" type="primary" size="large" :loading="saveLoading">
          保存
        </el-button>
      </div>
    </div>
  </div>

  <!-- 图片预览弹窗 -->
  <el-dialog v-model="imagePreviewVisible" title="图片预览" width="600px" append-to-body>
    <img :src="imagePreviewUrl" alt="预览" style="width: 100%; display: block;" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Box, MagicStick, Delete } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/product'
import { useTabsStore } from '@/stores/tabs'
import { createSafeNavigator } from '@/utils/navigation'
import { apiService } from '@/services/apiService'
import { productApi } from '@/api/product'

// 接口定义
interface UploadFile {
  name: string
  url?: string
  status?: string
  uid?: number
  raw?: File
}

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// 商品store
const productStore = useProductStore()

// 标签页store
const tabsStore = useTabsStore()

// 响应式数据
const saveLoading = ref(false)
const productFormRef = ref()

// 是否编辑模式
const isEdit = computed(() => !!route.params.id)

// 商品表单数据
const productForm = reactive({
  id: '',
  code: '',
  name: '',
  categoryId: [],
  brand: '',
  specification: '',
  unit: '',
  weight: 0,
  dimensions: '',
  description: '',
  price: 0,
  costPrice: 0,
  marketPrice: 0,
  stock: 0,
  minStock: 0,
  maxStock: 0,
  status: 'active',
  isRecommended: false,
  isNew: false,
  isHot: false,
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  mainImage: '',
  images: [],
  // 虚拟商品字段
  productType: 'physical' as 'physical' | 'virtual',
  virtualDeliveryType: '',
  cardKeyTemplate: '',
  resourceLinkTemplate: '',
  virtualContentEncrypt: false,
  // SKU字段
  skuType: 'none' as string
})

// SKU规格组
const skuSpecGroups = ref<Array<{ specName: string; specValues: string[]; _inputVal: string }>>([])
// SKU列表
const skuList = ref<Array<{
  id?: string; skuCode: string; skuName: string; skuImage: string
  price: number; costPrice: number; stock: number; weight: number
  specValues: Record<string, string>; status: string
}>>([])
const skuSelectedRows = ref<any[]>([])
const skuTableRef = ref<any>(null)

function handleSkuSelectionChange(rows: any[]) {
  skuSelectedRows.value = rows
}

function handleSkuTypeChange(val: string) {
  if (val === 'multi' && skuSpecGroups.value.length === 0) {
    skuSpecGroups.value.push({ specName: '', specValues: [], _inputVal: '' })
  }
}

function hasSkuDataFilled() {
  return skuList.value.some(s => s.price > 0 || s.costPrice > 0 || s.stock > 0 || s.weight > 0 || s.skuImage)
}

function addSpecGroup() {
  if (skuSpecGroups.value.length >= 3) return
  if (hasSkuDataFilled()) {
    ElMessageBox.confirm(
      '新增规格组将重新生成SKU组合，现有SKU中已填写的价格、库存、成本、重量等数据可能会丢失，请谨慎操作！',
      '确认新增规格',
      { type: 'warning', confirmButtonText: '确认新增', cancelButtonText: '取消' }
    ).then(() => {
      skuSpecGroups.value.push({ specName: '', specValues: [], _inputVal: '' })
    }).catch(() => {})
  } else {
    skuSpecGroups.value.push({ specName: '', specValues: [], _inputVal: '' })
  }
}

function removeSpecGroup(idx: number) {
  skuSpecGroups.value.splice(idx, 1)
  generateSkuList()
}

function doAddSpecValue(gIdx: number) {
  const group = skuSpecGroups.value[gIdx]
  const val = (group._inputVal || '').trim()
  if (!val) return
  if (group.specValues.includes(val)) {
    ElMessage.warning('规格值已存在')
    return
  }
  group.specValues.push(val)
  group._inputVal = ''
  generateSkuList()
}

function addSpecValue(gIdx: number) {
  const val = (skuSpecGroups.value[gIdx]?._inputVal || '').trim()
  if (!val) return
  if (hasSkuDataFilled()) {
    ElMessageBox.confirm(
      '新增规格值将重新生成SKU组合，现有SKU中已填写的价格、库存、成本等数据可能会丢失，请谨慎操作！',
      '确认新增规格值',
      { type: 'warning', confirmButtonText: '确认新增', cancelButtonText: '取消' }
    ).then(() => { doAddSpecValue(gIdx) }).catch(() => {})
  } else {
    doAddSpecValue(gIdx)
  }
}

function removeSpecValue(gIdx: number, vIdx: number) {
  skuSpecGroups.value[gIdx].specValues.splice(vIdx, 1)
  generateSkuList()
}

function generateSkuList() {
  const groups = skuSpecGroups.value.filter(g => g.specValues.length > 0)
  if (groups.length === 0) { skuList.value = []; return }
  
  const cartesian = (arrays: string[][]): string[][] => {
    return arrays.reduce<string[][]>((acc, cur) => {
      if (acc.length === 0) return cur.map(v => [v])
      const result: string[][] = []
      acc.forEach(a => cur.forEach(v => result.push([...a, v])))
      return result
    }, [])
  }

  const combos = cartesian(groups.map(g => g.specValues))
  const existingMap = new Map(skuList.value.map(s => [s.skuName, s]))
  
  skuList.value = combos.map(combo => {
    const skuName = combo.join(' / ')
    const existing = existingMap.get(skuName)
    const specValues: Record<string, string> = {}
    groups.forEach((g, i) => { specValues[g.specName] = combo[i] })
    return {
      id: existing?.id,
      skuCode: existing?.skuCode || '',
      skuName,
      skuImage: existing?.skuImage || '',
      price: existing?.price ?? productForm.price ?? 0,
      costPrice: existing?.costPrice ?? productForm.costPrice ?? 0,
      stock: existing?.stock ?? 0,
      weight: existing?.weight ?? 0,
      specValues,
      status: existing?.status || 'active'
    }
  })
}

const skuImageInputRefs: Record<string, HTMLInputElement> = {}

function triggerSkuImageUpload(row: any) {
  const input = skuImageInputRefs[row.skuName]
  if (input) {
    input.value = ''
    input.click()
  }
}

function cropToSquare(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') { resolve(file); return }
    const img = new Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: file.type || 'image/jpeg', lastModified: Date.now() }))
        } else {
          resolve(file)
        }
      }, file.type || 'image/jpeg', 0.92)
    }
    img.onerror = () => resolve(file)
    const reader = new FileReader()
    reader.onload = (e) => { img.src = e.target?.result as string }
    reader.readAsDataURL(file)
  })
}

async function handleSkuFileChange(e: Event, row: any) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件（JPG/PNG/GIF/WebP/BMP）')
    return
  }
  try {
    const croppedFile = await cropToSquare(file)
    const { uploadImage } = await import('@/services/uploadService')
    const result = await uploadImage(croppedFile, 'product')
    if (result.success && result.url) {
      row.skuImage = result.url
      ElMessage.success('SKU图片上传成功')
    } else {
      ElMessage.error(result.message || 'SKU图片上传失败')
    }
  } catch (err) {
    console.error('SKU图片上传失败:', err)
    ElMessage.error('SKU图片上传失败，请重试')
  }
}

function batchSetSkuField(field: 'price' | 'costPrice' | 'stock' | 'weight', label: string) {
  if (skuSelectedRows.value.length === 0) {
    ElMessage.warning('请先勾选需要批量设置的SKU')
    return
  }
  const isInt = field === 'stock'
  const pattern = isInt ? /^\d+$/ : /^\d+(\.\d{1,2})?$/
  const count = skuSelectedRows.value.length
  const total = skuList.value.length
  ElMessageBox.prompt(`请输入统一${label}（仅限数字）`, `批量设置${label}`, {
    inputPattern: pattern,
    inputErrorMessage: `请输入正确的${label}（仅限数字）`,
    inputValue: '',
    inputPlaceholder: isInt ? `请输入${label}数量` : `请输入${label}金额`,
    confirmButtonText: '确定应用',
    cancelButtonText: '取消',
    dangerouslyUseHTMLString: true,
    message: `<p style="color:#606266;font-size:13px;">将对已勾选的 <b style="color:#409eff;">${count}</b> / ${total} 个SKU设置${label}</p>`
  }).then(({ value }) => {
    const num = Number(value)
    const selectedNames = new Set(skuSelectedRows.value.map((s: any) => s.skuName))
    skuList.value.forEach(s => {
      if (selectedNames.has(s.skuName)) { (s as any)[field] = num }
    })
    ElMessage.success(`已将 ${count} 个SKU的${label}设置为 ${value}`)
  }).catch(() => {})
}

function removeSkuItem(idx: number) {
  skuList.value.splice(idx, 1)
}

// 原始虚拟发货方式（编辑模式用于检测变更）
const originalVirtualDeliveryType = ref('')

// 虚拟发货方式选项
const virtualDeliveryOptions = [
  { value: 'none', label: '无需发货', emoji: '🚫', desc: '审核通过后订单自动完成' },
  { value: 'card_key', label: '卡密发货', emoji: '🔑', desc: '需在发货时填写卡密信息' },
  { value: 'resource_link', label: '网盘资源', emoji: '☁️', desc: '需在发货时填写资源链接' }
]

// 图片上传文件列表
const fileList = ref<UploadFile[]>([])

// 分类选项 - 从 productStore 获取并转换格式
const categoryOptions = computed(() => {
  return (productStore.categories || []).map(category => ({
    value: category.id,
    label: category.name,
    children: category.children?.map(child => ({
      value: child.id,
      label: child.name
    })) || []
  }))
})

// 分类级联属性
const categoryProps = {
  value: 'value',
  label: 'label',
  children: 'children',
  emitPath: false
}

// 获取分类名称
const getCategoryName = (categoryId: string | number) => {
  if (!categoryId) return '未分类'

  // 在一级分类中查找
  for (const category of productStore.categories || []) {
    if (category.id === categoryId) {
      return category.name
    }
    // 在二级分类中查找
    if (category.children) {
      for (const child of category.children) {
        if (child.id === categoryId) {
          return child.name
        }
      }
    }
  }
  return '未分类'
}

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '商品名称长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入商品编码', trigger: 'blur' },
    { pattern: /^[A-Z0-9]{3,20}$/, message: '商品编码只能包含大写字母和数字，长度3-20位', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ],
  unit: [
    { required: true, message: '请选择商品单位', trigger: 'change' }
  ],
  price: [
    { required: true, message: '请输入销售价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '销售价格必须大于0', trigger: 'blur' }
  ],
  costPrice: [
    { type: 'number', min: 0, message: '成本价格不能小于0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入当前库存', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能小于0', trigger: 'blur' }
  ],
  minStock: [
    { type: 'number', min: 0, message: '最低库存不能小于0', trigger: 'blur' }
  ],
  maxStock: [
    { type: 'number', min: 0, message: '最高库存不能小于0', trigger: 'blur' }
  ]
}

// 方法定义
/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
}

/**
 * 生成商品编码
 */
const generateCode = () => {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  productForm.code = `P${timestamp}${random}`
}

/**
 * 计算利润
 */
const calculateProfit = () => {
  const profit = productForm.price - productForm.costPrice
  return profit.toFixed(2)
}

/**
 * 计算利润率
 */
const calculateProfitRate = () => {
  if (productForm.costPrice === 0) return '0.00'
  const rate = ((productForm.price - productForm.costPrice) / productForm.costPrice) * 100
  return rate.toFixed(2)
}

/**
 * 图片上传前验证
 */
const beforeImageUpload = (file: File) => {
  const isJPGOrPNG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPGOrPNG) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 图片预览
const imagePreviewVisible = ref(false)
const imagePreviewUrl = ref('')

const handleImagePreview = (file: UploadFile) => {
  imagePreviewUrl.value = file.url || ''
  imagePreviewVisible.value = true
}

/**
 * 图片变化处理 - 上传到服务器
 */
const handleImageChange = async (file: UploadFile, uploadFileList: UploadFile[]) => {
  // 如果有原始文件，上传到服务器
  if (file.raw) {
    try {
      const { uploadImage } = await import('@/services/uploadService')
      const result = await uploadImage(file.raw, 'product')

      if (result.success && result.url) {
        // 上传成功，使用服务器返回的URL
        file.url = result.url
        ElMessage.success('图片上传成功')
      } else {
        // 上传失败，从列表中移除
        const index = uploadFileList.indexOf(file)
        if (index > -1) {
          uploadFileList.splice(index, 1)
        }
        ElMessage.error(result.message || '图片上传失败')
        return
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      // 上传失败，从列表中移除
      const index = uploadFileList.indexOf(file)
      if (index > -1) {
        uploadFileList.splice(index, 1)
      }
      ElMessage.error('图片上传失败，请重试')
      return
    }
  }

  // 更新图片列表（只包含有URL的图片）
  const imageUrls = uploadFileList
    .filter(f => f.url && !f.url.startsWith('data:')) // 排除base64预览图
    .map(f => f.url!)

  productForm.images = imageUrls

  // 设置第一张图片为主图
  if (imageUrls.length > 0) {
    productForm.mainImage = imageUrls[0]
  }
}

/**
 * 图片移除处理
 */
const handleImageRemove = (file: UploadFile, uploadFileList: UploadFile[]) => {
  // 更新图片列表
  const imageUrls = uploadFileList
    .filter(f => f.url)
    .map(f => f.url!)

  productForm.images = imageUrls

  // 更新主图
  if (imageUrls.length > 0) {
    productForm.mainImage = imageUrls[0]
  } else {
    productForm.mainImage = ''
  }
}

/**
 * 取消操作
 */
const handleCancel = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消吗？未保存的数据将丢失！',
      '确认取消',
      {
        confirmButtonText: '确定',
        cancelButtonText: '继续编辑',
        type: 'warning'
      }
    )

    goBack()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 保存商品
 */
const handleSave = async () => {
  try {
    // 表单验证
    const isValid = await productFormRef.value?.validate()
    if (!isValid) {
      ElMessage.error('请完善商品信息')
      return
    }

    // 验证库存设置
    if (productForm.productType === 'physical' && productForm.skuType !== 'multi' && productForm.minStock > productForm.maxStock) {
      ElMessage.error('最低库存不能大于最高库存')
      return
    }

    // SKU模式验证：售价必填且不能为0，库存必填（允许0）
    if (productForm.productType === 'physical' && productForm.skuType === 'multi') {
      if (skuList.value.length === 0) {
        ElMessage.error('请至少添加一个SKU规格')
        return
      }
      const invalidSkus = skuList.value.filter(s => !s.price || s.price <= 0)
      if (invalidSkus.length > 0) {
        const names = invalidSkus.map(s => s.skuName).join('、')
        ElMessage.error(`以下SKU的售价未填写或为0，请完善：${names}`)
        return
      }
      const noStockSkus = skuList.value.filter(s => s.stock === undefined || s.stock === null || s.stock < 0)
      if (noStockSkus.length > 0) {
        const names = noStockSkus.map(s => s.skuName).join('、')
        ElMessage.error(`以下SKU的库存未填写，请完善：${names}`)
        return
      }
    }

    if (productForm.costPrice > productForm.price && productForm.skuType !== 'multi') {
      try {
        await ElMessageBox.confirm(
          '成本价格高于销售价格，确定要保存吗？',
          '价格提醒',
          {
            confirmButtonText: '确定保存',
            cancelButtonText: '重新设置',
            type: 'warning'
          }
        )
      } catch (error) {
        // 用户取消操作，直接返回
        return
      }
    }

    saveLoading.value = true

    const isAddMode = !isEdit.value

    // 更新store中的商品数据
    if (isAddMode) {
      // 新增商品
      const skuPayload: any = {}
      if (productForm.productType === 'physical' && productForm.skuType === 'multi' && skuList.value.length > 0) {
        skuPayload.skuType = 'multi'
        skuPayload.specGroups = skuSpecGroups.value.map((g, i) => ({
          specName: g.specName, specValues: g.specValues, sortOrder: i
        }))
        skuPayload.skus = skuList.value.map((s, i) => ({
          id: s.id, skuCode: s.skuCode, skuName: s.skuName, skuImage: s.skuImage,
          price: s.price, costPrice: s.costPrice, stock: s.stock, weight: s.weight,
          specValues: s.specValues, sortOrder: i, status: s.status
        }))
      }

      const newProduct = productStore.addProduct({
        code: productForm.code,
        name: productForm.name,
        categoryId: productForm.categoryId,
        categoryName: getCategoryName(productForm.categoryId),
        brand: productForm.brand,
        specification: productForm.specification,
        unit: productForm.unit,
        weight: productForm.weight,
        dimensions: productForm.dimensions,
        description: productForm.description,
        price: productForm.price,
        costPrice: productForm.costPrice,
        marketPrice: productForm.marketPrice,
        stock: productForm.stock,
        minStock: productForm.minStock,
        maxStock: productForm.maxStock,
        salesCount: 0,
        status: productForm.status as 'active' | 'inactive' | 'out_of_stock',
        isRecommended: productForm.isRecommended,
        isNew: productForm.isNew,
        isHot: productForm.isHot,
        image: productForm.mainImage || '/src/assets/images/product-placeholder.svg',
        images: Array.isArray(productForm.images) ? productForm.images : [],
        productType: productForm.productType,
        virtualDeliveryType: productForm.productType === 'virtual' ? productForm.virtualDeliveryType : null,
        cardKeyTemplate: productForm.cardKeyTemplate || null,
        resourceLinkTemplate: productForm.resourceLinkTemplate || null,
        virtualContentEncrypt: productForm.virtualContentEncrypt,
        ...skuPayload
      } as any)
      if (newProduct && newProduct.id) {
        productForm.id = newProduct.id.toString()
      }
    } else {
      // 更新商品
      const updateSkuPayload: any = {}
      if (productForm.productType === 'physical') {
        updateSkuPayload.skuType = productForm.skuType
        if (productForm.skuType === 'multi' && skuList.value.length > 0) {
          updateSkuPayload.specGroups = skuSpecGroups.value.map((g, i) => ({
            specName: g.specName, specValues: g.specValues, sortOrder: i
          }))
          updateSkuPayload.skus = skuList.value.map((s, i) => ({
            id: s.id, skuCode: s.skuCode, skuName: s.skuName, skuImage: s.skuImage,
            price: s.price, costPrice: s.costPrice, stock: s.stock, weight: s.weight,
            specValues: s.specValues, sortOrder: i, status: s.status
          }))
        }
      }

      productStore.updateProduct(productForm.id, {
        code: productForm.code,
        name: productForm.name,
        categoryId: productForm.categoryId,
        categoryName: getCategoryName(productForm.categoryId),
        brand: productForm.brand,
        specification: productForm.specification,
        unit: productForm.unit,
        weight: productForm.weight,
        dimensions: productForm.dimensions,
        description: productForm.description,
        price: productForm.price,
        costPrice: productForm.costPrice,
        marketPrice: productForm.marketPrice,
        stock: productForm.stock,
        minStock: productForm.minStock,
        maxStock: productForm.maxStock,
        status: productForm.status as 'active' | 'inactive' | 'out_of_stock',
        isRecommended: productForm.isRecommended,
        isNew: productForm.isNew,
        isHot: productForm.isHot,
        image: productForm.mainImage || '/src/assets/images/product-placeholder.svg',
        images: Array.isArray(productForm.images) ? productForm.images : [],
        virtualDeliveryType: productForm.virtualDeliveryType || null,
        cardKeyTemplate: productForm.cardKeyTemplate || null,
        resourceLinkTemplate: productForm.resourceLinkTemplate || null,
        virtualContentEncrypt: productForm.virtualContentEncrypt,
        ...updateSkuPayload
      } as any)
    }

    ElMessage.success(isEdit.value ? '商品更新成功' : '商品创建成功')

    // 编辑模式：如果虚拟发货方式变更，自动解除旧库存关联
    if (isEdit.value && originalVirtualDeliveryType.value && originalVirtualDeliveryType.value !== productForm.virtualDeliveryType) {
      try {
        const oldType = originalVirtualDeliveryType.value
        const endpoint = oldType === 'card_key' ? '/virtual-inventory/card-keys/batch-associate' : '/virtual-inventory/resources/batch-associate'
        // 查找所有关联到该商品的库存并取消关联
        const listEndpoint = oldType === 'card_key' ? '/virtual-inventory/card-keys' : '/virtual-inventory/resources'
        const listResp = await apiService.get(listEndpoint, { productId: productForm.id, pageSize: 9999 })
        const ids = (listResp?.list || []).map((item: any) => item.id)
        if (ids.length > 0) {
          await apiService.put(endpoint, { ids, productId: null })
          console.log(`[商品编辑] 已自动解除 ${ids.length} 条${oldType === 'card_key' ? '卡密' : '资源'}的关联`)
        }
      } catch (_e) {
        console.warn('[商品编辑] 自动解除旧库存关联失败:', _e)
      }
    }

    // 虚拟商品保存后引导配置库存
    if (isAddMode && productForm.productType === 'virtual' && productForm.virtualDeliveryType && productForm.virtualDeliveryType !== 'none') {
      try {
        await ElMessageBox.confirm(
          '该商品需配置卡密/资源库存后才能在订单中选择，是否立即配置？',
          '商品保存成功',
          { confirmButtonText: '立即配置', cancelButtonText: '稍后配置', type: 'success' }
        )
        const target = productForm.virtualDeliveryType === 'card_key'
          ? '/product/virtual/card-keys'
          : '/product/virtual/resources'
        safeNavigator.push({ path: target, query: { productId: productForm.id } })
        return
      } catch {
        // 用户选择稍后配置，继续正常跳转
      }
    }

    // 延迟跳转，让用户能看到成功提示
    setTimeout(() => {
      if (isAddMode) {
        // 新建商品后关闭当前标签页并跳转到商品列表
        const currentPath = route.path
        tabsStore.removeTab(currentPath)
        safeNavigator.push({ path: '/product/list', query: { refresh: 'true' } })
      } else {
        // 编辑商品后跳转到详情页
        safeNavigator.push(`/product/detail/${productForm.id}`)
      }
    }, 1000) // 1秒延迟，让用户能看到成功提示
  } catch (error) {
    console.error('保存商品失败:', error)
    ElMessage.error('保存失败，请检查网络连接或稍后重试')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 加载商品信息（编辑模式）
 */
const loadProductInfo = async () => {
  if (!isEdit.value) return

  try {
    const productId = route.params.id

    if (!productId) {
      ElMessage.error('商品ID不存在')
      safeNavigator.push('/product/list')
      return
    }

    // 优先通过API获取完整商品详情（含SKU数据）
    let product: any = null
    try {
      product = await productApi.getDetail(String(productId))
    } catch (e) {
      console.warn('API获取详情失败，回退到store:', e)
    }
    if (!product || !product.id) {
      product = productStore.getProductById(productId)
      if (!product && !isNaN(Number(productId))) {
        product = productStore.getProductById(Number(productId))
      }
    }

    if (product) {
      Object.assign(productForm, {
        id: product.id,
        code: product.code,
        name: product.name,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        brand: product.brand,
        specification: product.specification,
        unit: product.unit,
        weight: product.weight,
        dimensions: product.dimensions,
        description: product.description,
        price: product.price,
        costPrice: product.costPrice,
        marketPrice: product.marketPrice,
        stock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        status: product.status,
        isRecommended: !!product.isRecommended,
        isNew: !!product.isNew,
        isHot: !!product.isHot,
        seoTitle: '',
        seoKeywords: '',
        seoDescription: '',
        mainImage: product.image,
        images: product.images || [],
        productType: product.productType || 'physical',
        virtualDeliveryType: product.virtualDeliveryType || '',
        cardKeyTemplate: product.cardKeyTemplate || '',
        resourceLinkTemplate: product.resourceLinkTemplate || '',
        virtualContentEncrypt: !!product.virtualContentEncrypt
      })
      originalVirtualDeliveryType.value = product.virtualDeliveryType || ''

      // 恢复SKU数据
      productForm.skuType = product.skuType || 'none'
      if (product.skuType === 'multi' && product.specGroups && product.specGroups.length > 0) {
        skuSpecGroups.value = product.specGroups.map((g: any) => ({
          specName: g.specName,
          specValues: g.specValues || [],
          _inputVal: ''
        }))
      }
      if (product.skuType === 'multi' && product.skus && product.skus.length > 0) {
        skuList.value = product.skus.map((s: any) => ({
          id: s.id,
          skuCode: s.skuCode,
          skuName: s.skuName,
          skuImage: s.skuImage || '',
          price: Number(s.price) || 0,
          costPrice: Number(s.costPrice) || 0,
          stock: s.stock || 0,
          weight: Number(s.weight) || 0,
          specValues: s.specValues || {},
          status: s.status || 'active'
        }))
      }

      // 初始化文件列表
      fileList.value = (product.images || []).map((url: string, index: number) => ({
        uid: Date.now() + index,
        name: `image-${index + 1}`,
        status: 'done',
        url: url
      }))
    } else {
      ElMessage.error('商品不存在')
      safeNavigator.push('/product/list')
    }
  } catch (error) {
    ElMessage.error('加载商品信息失败')
  }
}

/**
 * 处理复制商品
 */
const handleCopyProduct = async () => {
  const copyId = route.query.copy
  if (!copyId) return

  try {
    // 🔥 修复：从store获取真实的商品数据进行复制
    let product = productStore.getProductById(String(copyId))
    if (!product && !isNaN(Number(copyId))) {
      product = productStore.getProductById(Number(copyId))
    }

    if (!product) {
      ElMessage.error('要复制的商品不存在')
      return
    }

    // 复制商品数据（排除ID和编码，名称添加"(复制)"后缀）
    Object.assign(productForm, {
      name: `${product.name} (复制)`,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      brand: product.brand || '',
      specification: product.specification || '',
      unit: product.unit || '件',
      weight: product.weight || 0,
      dimensions: product.dimensions || '',
      description: product.description || '',
      price: product.price || 0,
      costPrice: product.costPrice || 0,
      marketPrice: product.marketPrice || 0,
      stock: 0, // 库存默认为0
      minStock: product.minStock || 10,
      maxStock: product.maxStock || 1000,
      status: 'inactive', // 复制的商品默认下架
      isRecommended: false,
      isNew: false,
      isHot: false,
      seoTitle: '',
      seoKeywords: '',
      seoDescription: '',
      mainImage: product.image || '',
      images: product.images || []
    })

    // 初始化文件列表
    if (product.images && product.images.length > 0) {
      fileList.value = product.images.map((url: string, index: number) => ({
        uid: Date.now() + index,
        name: `image-${index + 1}`,
        status: 'done',
        url: url
      }))
    }

    // 生成新的商品编码
    generateCode()

    ElMessage.success('商品信息已复制，请修改后保存')
  } catch (error) {
    console.error('复制商品信息失败:', error)
    ElMessage.error('复制商品信息失败')
  }
}

// 生命周期钩子
onMounted(() => {
  if (isEdit.value) {
    loadProductInfo()
  } else if (route.query.copy) {
    handleCopyProduct()
  } else {
    // 新增模式，生成商品编码
    generateCode()
  }
})
</script>

<style scoped>
.product-edit {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-code {
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-content {
  margin-bottom: 20px;
}

.form-footer {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  padding: 20px;
  margin-top: 20px;
  z-index: 100;
}

.footer-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.form-card {
  margin-bottom: 20px;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}

.profit-info {
  margin-top: 16px;
}

.image-upload-section {
  padding: 0;
}

.upload-tip {
  margin-bottom: 16px;
}

.tips-content ul {
  margin: 0;
  padding-left: 20px;
}

.tips-content li {
  margin-bottom: 4px;
  color: #e6a23c;
}

/* 表单项样式调整 */
:deep(.el-form-item) {
  margin-bottom: 20px;
}

/* 开关预览标签样式 */
.switch-with-preview {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch-preview-tag {
  font-size: 12px;
  border-radius: 4px;
}

/* 标签淡入淡出动画 */
.tag-fade-enter-active {
  transition: all 0.3s ease;
}

.tag-fade-leave-active {
  transition: all 0.2s ease;
}

.tag-fade-enter-from,
.tag-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

:deep(.el-form-item__label) {
  color: #606266;
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 100px;
  height: 100px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .form-content .el-col {
    margin-bottom: 20px;
  }
}

/* ★ 商品类型选择器样式 */
.product-type-selector {
  .type-cards {
    display: flex;
    gap: 20px;

    &.disabled {
      opacity: 0.7;
      pointer-events: none;
    }
  }

  .type-card {
    position: relative;
    flex: 1;
    padding: 12px 16px;
    border: 2px solid #dcdfe6;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    &:hover {
      border-color: #c6e2ff;
      transform: translateY(-2px);
    }

    &.active {
      border-color: #409EFF;
      background: #f0f7ff;
      box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    }

    &.virtual.active {
      border-color: #E6A23C;
      background: #fdf6ec;
      box-shadow: 0 2px 12px rgba(230, 162, 60, 0.15);
    }

    .type-card-check {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #409EFF;
      color: #fff;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &.virtual .type-card-check {
      background: #E6A23C;
    }

    .type-title {
      font-size: 14px;
      font-weight: bold;
      color: #303133;
    }

    .type-desc {
      font-size: 12px;
      color: #909399;
    }
  }
}

/* ★ 虚拟发货方式卡片样式 */
.virtual-delivery-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  .virtual-delivery-card {
    flex: 1;
    padding: 16px;
    border: 2px solid #dcdfe6;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;

    &:hover {
      border-color: #c6e2ff;
      transform: translateY(-2px);
    }

    &.active {
      border-color: #409EFF;
      background: #f0f7ff;
      box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    }

    .vd-name {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .vd-desc {
      font-size: 12px;
      color: #909399;
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .form-content .el-row .el-col {
    margin-bottom: 20px;
  }
}

.sku-field-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}
</style>

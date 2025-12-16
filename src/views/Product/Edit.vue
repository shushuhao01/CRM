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

              <el-row :gutter="20">
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
                <span>价格库存</span>
              </template>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="销售价格" prop="price">
                    <el-input-number
                      v-model="productForm.price"
                      :precision="2"
                      :step="0.01"
                      :min="0"
                      style="width: 100%"
                    />
                    <span class="unit-text">元</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="成本价格" prop="costPrice">
                    <el-input-number
                      v-model="productForm.costPrice"
                      :precision="2"
                      :step="0.01"
                      :min="0"
                      style="width: 100%"
                    />
                    <span class="unit-text">元</span>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="市场价格" prop="marketPrice">
                    <el-input-number
                      v-model="productForm.marketPrice"
                      :precision="2"
                      :step="0.01"
                      :min="0"
                      style="width: 100%"
                    />
                    <span class="unit-text">元</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="当前库存" prop="stock">
                    <el-input-number
                      v-model="productForm.stock"
                      :min="0"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="最低库存" prop="minStock">
                    <el-input-number
                      v-model="productForm.minStock"
                      :min="0"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="最高库存" prop="maxStock">
                    <el-input-number
                      v-model="productForm.maxStock"
                      :min="0"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- 利润计算 -->
              <div class="profit-info">
                <el-alert
                  :title="`预计利润：¥${calculateProfit()} (${calculateProfitRate()}%)`"
                  type="info"
                  :closable="false"
                  show-icon
                />
              </div>
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
                <el-switch
                  v-model="productForm.isRecommended"
                  active-text="是"
                  inactive-text="否"
                />
              </el-form-item>

              <el-form-item label="是否新品" prop="isNew">
                <el-switch
                  v-model="productForm.isNew"
                  active-text="是"
                  inactive-text="否"
                />
              </el-form-item>

              <el-form-item label="是否热销" prop="isHot">
                <el-switch
                  v-model="productForm.isHot"
                  active-text="是"
                  inactive-text="否"
                />
              </el-form-item>
            </el-card>

            <!-- SEO设置 -->
            <el-card class="form-card" title="SEO设置">
              <template #header>
                <span>SEO设置</span>
              </template>

              <el-form-item label="SEO标题" prop="seoTitle">
                <el-input
                  v-model="productForm.seoTitle"
                  placeholder="请输入SEO标题"
                  maxlength="60"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="SEO关键词" prop="seoKeywords">
                <el-input
                  v-model="productForm.seoKeywords"
                  placeholder="请输入SEO关键词，用逗号分隔"
                />
              </el-form-item>

              <el-form-item label="SEO描述" prop="seoDescription">
                <el-input
                  v-model="productForm.seoDescription"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入SEO描述"
                  maxlength="160"
                  show-word-limit
                />
              </el-form-item>
            </el-card>

            <!-- 操作提示 -->
            <el-card class="form-card" title="操作提示">
              <template #header>
                <span>操作提示</span>
              </template>

              <div class="tips-content">
                <el-alert
                  title="保存提示"
                  type="warning"
                  :closable="false"
                  show-icon
                >
                  <ul>
                    <li>商品编码一旦保存不可修改</li>
                    <li>价格变动会影响现有订单</li>
                    <li>库存调整请谨慎操作</li>
                    <li>图片建议使用高清图片</li>
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
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useProductStore } from '@/stores/product'
import { useTabsStore } from '@/stores/tabs'
import { createSafeNavigator } from '@/utils/navigation'

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
  images: []
})

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
    if (productForm.minStock > productForm.maxStock) {
      ElMessage.error('最低库存不能大于最高库存')
      return
    }

    if (productForm.costPrice > productForm.price) {
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
        image: productForm.mainImage || '/src/assets/images/product-placeholder.svg',
        images: Array.isArray(productForm.images) ? productForm.images : []
      })
      if (newProduct && newProduct.id) {
        productForm.id = newProduct.id.toString()
      }
    } else {
      // 更新商品
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
        image: productForm.mainImage || '/src/assets/images/product-placeholder.svg',
        images: Array.isArray(productForm.images) ? productForm.images : []
      })
    }

    ElMessage.success(isEdit.value ? '商品更新成功' : '商品创建成功')

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

    // 从store中获取真实的商品数据，尝试字符串和数字两种类型
    let product = productStore.getProductById(productId)
    if (!product && !isNaN(Number(productId))) {
      product = productStore.getProductById(Number(productId))
    }

    if (product) {
      // 使用真实的商品数据填充表单
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
        isRecommended: false,
        isNew: false,
        isHot: false,
        seoTitle: '',
        seoKeywords: '',
        seoDescription: '',
        mainImage: product.image,
        images: product.images || []
      })

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
    // 复制商品数据（排除ID和编码）
    Object.assign(productForm, {
      name: 'iPhone 15 Pro (复制)',
      categoryId: '1-1', // 使用手机数码分类
      brand: 'Apple',
      specification: '256GB 深空黑色',
      unit: '台',
      weight: 0.187,
      dimensions: '146.6×70.6×7.8',
      description: 'iPhone 15 Pro 采用钛金属设计，搭载 A17 Pro 芯片，配备专业级摄像头系统，支持 5G 网络。',
      price: 8999.00,
      costPrice: 7200.00,
      marketPrice: 9999.00,
      stock: 0,
      minStock: 10,
      maxStock: 200,
      status: 'inactive',
      isRecommended: false,
      isNew: false,
      isHot: false,
      seoTitle: '',
      seoKeywords: '',
      seoDescription: '',
      images: []
    })

    // 生成新的商品编码
    generateCode()

    ElMessage.success('商品信息已复制，请修改后保存')
  } catch (error) {
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
</style>

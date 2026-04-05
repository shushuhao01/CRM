<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>商品配置</span>
        <el-button
          v-if="canEditProductSettings"
          @click="handleSaveProduct"
          type="primary"
          :loading="productLoading"
        >
          保存设置
        </el-button>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.product" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

    <el-form
      ref="productFormRef"
      :disabled="configStore.configLocked.product"
      :model="productForm"
      :rules="productFormRules"
      label-width="150px"
      class="setting-form"
    >
      <!-- 优惠折扣设置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Discount /></el-icon>
          优惠折扣设置
        </h4>

        <el-form-item label="全局最大优惠比例" prop="maxDiscountPercent">
          <el-input-number v-model="productForm.maxDiscountPercent" :min="0" :max="100" :precision="1" placeholder="最大优惠比例" />
          <span class="form-tip-inline">%（0-100，建议不超过50%）</span>
        </el-form-item>

        <el-form-item label="管理员最大优惠" prop="adminMaxDiscount">
          <el-input-number v-model="productForm.adminMaxDiscount" :min="0" :max="100" :precision="1" placeholder="管理员最大优惠" />
          <span class="form-tip-inline">%（管理员权限下的最大优惠比例）</span>
        </el-form-item>

        <el-form-item label="经理最大优惠" prop="managerMaxDiscount">
          <el-input-number v-model="productForm.managerMaxDiscount" :min="0" :max="100" :precision="1" placeholder="经理最大优惠" />
          <span class="form-tip-inline">%（经理权限下的最大优惠比例）</span>
        </el-form-item>

        <el-form-item label="销售员最大优惠" prop="salesMaxDiscount">
          <el-input-number v-model="productForm.salesMaxDiscount" :min="0" :max="100" :precision="1" placeholder="销售员最大优惠" />
          <span class="form-tip-inline">%（销售员权限下的最大优惠比例）</span>
        </el-form-item>

        <el-form-item label="优惠审批阈值" prop="discountApprovalThreshold">
          <el-input-number v-model="productForm.discountApprovalThreshold" :min="0" :max="100" :precision="1" placeholder="优惠审批阈值" />
          <span class="form-tip-inline">%（超过此比例需要审批）</span>
        </el-form-item>
      </div>

      <!-- 价格管理设置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Money /></el-icon>
          价格管理设置
        </h4>

        <el-form-item label="允许价格修改" prop="allowPriceModification">
          <el-switch v-model="productForm.allowPriceModification" active-text="允许" inactive-text="禁止" />
          <div class="form-tip">是否允许在订单中修改商品价格</div>
        </el-form-item>

        <el-form-item label="价格修改权限" prop="priceModificationRoles">
          <el-checkbox-group v-model="productForm.priceModificationRoles">
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="sales">销售员</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="价格变动记录" prop="enablePriceHistory">
          <el-switch v-model="productForm.enablePriceHistory" active-text="启用" inactive-text="禁用" />
          <div class="form-tip">记录商品价格变动历史</div>
        </el-form-item>

        <el-form-item label="价格显示精度" prop="pricePrecision">
          <el-select v-model="productForm.pricePrecision" placeholder="选择价格精度">
            <el-option label="整数（如：100）" value="0" />
            <el-option label="一位小数（如：100.0）" value="1" />
            <el-option label="两位小数（如：100.00）" value="2" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 库存管理设置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Box /></el-icon>
          库存管理设置
        </h4>

        <el-form-item label="启用库存管理" prop="enableInventory">
          <el-switch v-model="productForm.enableInventory" active-text="启用" inactive-text="禁用" />
          <div class="form-tip">是否启用商品库存管理功能</div>
        </el-form-item>

        <el-form-item label="低库存预警阈值" prop="lowStockThreshold">
          <el-input-number v-model="productForm.lowStockThreshold" :min="0" :max="1000" placeholder="低库存预警阈值" />
          <span class="form-tip-inline">件（库存低于此数量时预警）</span>
        </el-form-item>

        <el-form-item label="允许负库存销售" prop="allowNegativeStock">
          <el-switch v-model="productForm.allowNegativeStock" active-text="允许" inactive-text="禁止" />
          <div class="form-tip">库存不足时是否允许继续销售</div>
        </el-form-item>
      </div>

      <!-- 商品分类设置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Grid /></el-icon>
          商品分类设置
        </h4>

        <el-form-item label="默认分类" prop="defaultCategory">
          <el-input v-model="productForm.defaultCategory" placeholder="请输入默认分类名称" />
          <div class="form-tip">新建商品时的默认分类</div>
        </el-form-item>

        <el-form-item label="分类层级限制" prop="maxCategoryLevel">
          <el-input-number v-model="productForm.maxCategoryLevel" :min="1" :max="5" placeholder="分类层级限制" />
          <span class="form-tip-inline">级（最多支持的分类层级数）</span>
        </el-form-item>

        <el-form-item label="启用分类编码" prop="enableCategoryCode">
          <el-switch v-model="productForm.enableCategoryCode" active-text="启用" inactive-text="禁用" />
          <div class="form-tip">为商品分类生成唯一编码</div>
        </el-form-item>
      </div>

      <!-- 权限配置设置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Lock /></el-icon>
          权限配置设置
        </h4>

        <el-form-item label="成本价格查看权限" prop="costPriceViewRoles">
          <el-checkbox-group v-model="productForm.costPriceViewRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="finance">财务人员</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">选择可以查看商品成本价格的角色</div>
        </el-form-item>

        <el-form-item label="销售数据查看权限" prop="salesDataViewRoles">
          <el-checkbox-group v-model="productForm.salesDataViewRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="sales_manager">销售经理</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">选择可以查看销售数据的角色</div>
        </el-form-item>

        <el-form-item label="库存信息查看权限" prop="stockInfoViewRoles">
          <el-checkbox-group v-model="productForm.stockInfoViewRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="warehouse">仓库管理员</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">选择可以查看库存信息的角色</div>
        </el-form-item>

        <el-form-item label="操作日志查看权限" prop="operationLogsViewRoles">
          <el-checkbox-group v-model="productForm.operationLogsViewRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="audit">审计人员</el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">选择可以查看操作日志的角色</div>
        </el-form-item>

        <el-form-item label="敏感信息隐藏方式" prop="sensitiveInfoHideMethod">
          <el-radio-group v-model="productForm.sensitiveInfoHideMethod">
            <el-radio label="asterisk">星号（****）</el-radio>
            <el-radio label="eye_icon">眼睛图标</el-radio>
            <el-radio label="dash">横线（----）</el-radio>
          </el-radio-group>
          <div class="form-tip">选择敏感信息的隐藏显示方式</div>
        </el-form-item>

        <el-form-item label="启用权限控制" prop="enablePermissionControl">
          <el-switch v-model="productForm.enablePermissionControl" active-text="启用" inactive-text="禁用" />
          <div class="form-tip">是否启用商品信息权限控制功能</div>
        </el-form-item>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions" v-if="canEditProductSettings">
        <el-button @click="handleResetProduct" :disabled="productLoading">重置默认</el-button>
        <el-button type="primary" @click="handleSaveProduct" :loading="productLoading">保存设置</el-button>
      </div>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Discount, Money, Box, Grid, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const productLoading = ref(false)
const productFormRef = ref()

const productForm = computed(() => configStore.productConfig)

const productFormRules = {
  maxDiscountPercent: [
    { required: true, message: '请设置全局最大优惠比例', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  adminMaxDiscount: [
    { required: true, message: '请设置管理员最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  managerMaxDiscount: [
    { required: true, message: '请设置经理最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  salesMaxDiscount: [
    { required: true, message: '请设置销售员最大优惠', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '优惠比例应在0-100之间', trigger: 'blur' }
  ],
  discountApprovalThreshold: [
    { required: true, message: '请设置优惠审批阈值', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '审批阈值应在0-100之间', trigger: 'blur' }
  ],
  lowStockThreshold: [
    { required: true, message: '请设置低库存预警阈值', trigger: 'blur' },
    { type: 'number', min: 0, message: '预警阈值不能为负数', trigger: 'blur' }
  ],
  defaultCategory: [
    { required: true, message: '请输入默认分类名称', trigger: 'blur' },
    { min: 1, max: 20, message: '分类名称长度在1-20个字符', trigger: 'blur' }
  ],
  maxCategoryLevel: [
    { required: true, message: '请设置分类层级限制', trigger: 'blur' },
    { type: 'number', min: 1, max: 5, message: '分类层级应在1-5之间', trigger: 'blur' }
  ],
  costPriceViewRoles: [{ required: true, message: '请选择成本价格查看权限角色', trigger: 'change' }],
  salesDataViewRoles: [{ required: true, message: '请选择销售数据查看权限角色', trigger: 'change' }],
  stockInfoViewRoles: [{ required: true, message: '请选择库存信息查看权限角色', trigger: 'change' }],
  operationLogsViewRoles: [{ required: true, message: '请选择操作日志查看权限角色', trigger: 'change' }],
  sensitiveInfoHideMethod: [{ required: true, message: '请选择敏感信息隐藏方式', trigger: 'change' }]
}

const canEditProductSettings = computed(() => userStore.isAdmin || userStore.isManager)

const handleSaveProduct = async () => {
  try {
    await productFormRef.value?.validate()

    if (productForm.value.salesMaxDiscount > productForm.value.managerMaxDiscount) {
      ElMessage.warning('销售员最大优惠不能超过经理最大优惠'); return
    }
    if (productForm.value.managerMaxDiscount > productForm.value.adminMaxDiscount) {
      ElMessage.warning('经理最大优惠不能超过管理员最大优惠'); return
    }
    if (productForm.value.discountApprovalThreshold > productForm.value.maxDiscountPercent) {
      ElMessage.warning('优惠审批阈值不能超过全局最大优惠比例'); return
    }

    productLoading.value = true
    configStore.updateProductConfig(productForm.value)
    console.log('[商品设置] 已保存到localStorage:', productForm.value)

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/product-settings', productForm.value)
      console.log('[商品设置] 已同步到后端API')
      ElMessage.success('商品设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { message?: string; code?: string; response?: { status?: number } }
      console.warn('[商品设置] API调用失败，已保存到本地:', err.message || apiError)
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('商品设置保存成功（本地模式）')
      } else {
        ElMessage.warning('商品设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error: unknown) {
    console.error('[商品设置] 表单验证失败:', error)
    const err = error as { message?: string }
    if (err.message) { ElMessage.error(err.message) }
    else { ElMessage.error('保存商品设置失败，请重试') }
  } finally {
    productLoading.value = false
  }
}

const handleResetProduct = () => {
  ElMessageBox.confirm('确定要重置商品设置吗？这将恢复到默认配置。', '重置确认', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    configStore.resetProductConfig()
    productFormRef.value?.clearValidate()
    ElMessage.success('商品设置已重置为默认配置')
  }).catch(() => {})
}
</script>

<style scoped>
.setting-card { border: none; box-shadow: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding-left: 2%; }
.setting-form { padding: 20px 0; }
.form-tip { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #909399; }
.form-tip-inline { margin-left: 8px; color: #909399; font-size: 12px; }
.form-section { margin-bottom: 32px; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #e4e7ed; }
.section-title { margin: 0 0 20px 0; color: #303133; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.section-title .el-icon { color: #409eff; font-size: 18px; }
.section-title :deep(.el-icon) { color: #409eff; font-size: 18px; }
.form-actions :deep(.el-button) { margin-left: 12px; }
.form-actions :deep(.el-button:first-child) { margin-left: 0; }
.setting-form :deep(.el-form-item) { margin-bottom: 20px; }
.setting-form :deep(.el-input-number) { width: 200px; }
.setting-form :deep(.el-select) { width: 200px; }
.setting-form :deep(.el-checkbox-group) { display: flex; flex-wrap: wrap; gap: 16px; }
.setting-form :deep(.el-switch) { margin-right: 12px; }
</style>



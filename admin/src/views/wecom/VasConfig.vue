<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>增值服务配置</span>
          <el-button v-permission="'wecom-management:vas-config:edit'" type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </template>

      <el-form :model="form" label-width="140px" style="max-width: 700px" v-loading="loading">
        <el-divider content-position="left">会话存档增值服务</el-divider>

        <el-form-item label="服务状态">
          <el-switch v-model="form.chatArchive.enabled" active-text="已启用" inactive-text="已停用" />
        </el-form-item>

        <el-form-item label="默认价格">
          <el-input-number v-model="form.chatArchive.defaultPrice" :min="0" :max="9999" :precision="0" />
          <span style="margin-left: 10px; color: #909399">元/人/年</span>
        </el-form-item>

        <el-form-item label="最低价格">
          <el-input-number v-model="form.chatArchive.minPrice" :min="0" :max="9999" :precision="0" />
          <span style="margin-left: 10px; color: #909399">元/人/年</span>
        </el-form-item>

        <el-form-item label="计费方式">
          <el-select v-model="form.chatArchive.billingUnit" style="width: 200px">
            <el-option label="按人按年" value="per_user_year" />
            <el-option label="按人按月" value="per_user_month" />
          </el-select>
        </el-form-item>

        <el-form-item label="试用天数">
          <el-input-number v-model="form.chatArchive.trialDays" :min="0" :max="365" :precision="0" />
          <span style="margin-left: 10px; color: #909399">天（0 = 不提供试用）</span>
        </el-form-item>

        <el-divider content-position="left">阶梯定价</el-divider>

        <div v-for="(tier, index) in form.chatArchive.tierPricing" :key="index" style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; padding-left: 140px">
          <el-input-number v-model="tier.min" :min="1" size="small" style="width: 100px" placeholder="起始" />
          <span>~</span>
          <el-input-number v-model="tier.max" :min="tier.min" size="small" style="width: 100px" placeholder="截止" />
          <span>人：</span>
          <el-input-number v-model="tier.price" :min="0" :precision="0" size="small" style="width: 100px" />
          <span>元/人/年</span>
          <el-button type="danger" link size="small" @click="removeTier(index)" v-if="form.chatArchive.tierPricing.length > 1">删除</el-button>
        </div>
        <div style="padding-left: 140px; margin-bottom: 20px">
          <el-button type="primary" link @click="addTier">+ 添加阶梯</el-button>
        </div>

        <el-divider content-position="left">续费折扣</el-divider>

        <el-form-item label="续费折扣">
          <el-switch v-model="form.chatArchive.enableRenewalDiscount" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <template v-if="form.chatArchive.enableRenewalDiscount">
          <div v-for="(rd, index) in form.chatArchive.renewalDiscounts" :key="index" style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; padding-left: 140px">
            <span>续费</span>
            <el-input-number v-model="rd.months" :min="1" :max="120" size="small" style="width: 80px" />
            <span>个月，折扣</span>
            <el-input-number v-model="rd.discount" :min="0.1" :max="1" :step="0.05" :precision="2" size="small" style="width: 100px" />
            <span>({{ Math.round(rd.discount * 100) / 10 }}折)</span>
            <el-button type="danger" link size="small" @click="form.chatArchive.renewalDiscounts.splice(index, 1)" v-if="form.chatArchive.renewalDiscounts.length > 1">删除</el-button>
          </div>
          <div style="padding-left: 140px; margin-bottom: 20px">
            <el-button type="primary" link @click="addRenewalDiscount">+ 添加折扣档位</el-button>
          </div>
        </template>

        <el-divider content-position="left">预设套餐包</el-divider>

        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          预设套餐包将显示在CRM前端购买弹窗中。如需更精细管理，请前往
          <el-link type="primary" @click="$router.push('/wecom-management/package-templates')">套餐模板管理</el-link>
          页面。
        </el-alert>

        <div v-for="(pkg, index) in form.chatArchive.presetPackages" :key="index" style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; padding-left: 140px; flex-wrap: wrap">
          <el-input v-model="pkg.name" size="small" style="width: 100px" placeholder="名称" />
          <el-input-number v-model="pkg.userCount" :min="1" size="small" style="width: 90px" />
          <span>人</span>
          <el-input-number v-model="pkg.price" :min="0" :precision="0" size="small" style="width: 100px" />
          <span>元</span>
          <el-input v-model="pkg.label" size="small" style="width: 80px" placeholder="标签" />
          <el-button type="danger" link size="small" @click="form.chatArchive.presetPackages.splice(index, 1)" v-if="form.chatArchive.presetPackages.length > 1">删除</el-button>
        </div>
        <div style="padding-left: 140px; margin-bottom: 20px">
          <el-button type="primary" link @click="addPresetPackage">+ 添加套餐包</el-button>
        </div>

        <el-divider content-position="left">服务说明</el-divider>

        <el-form-item label="服务描述">
          <el-input v-model="form.chatArchive.description" type="textarea" :rows="3" placeholder="增值服务说明文字，显示在会员中心" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const saving = ref(false)

const form = ref({
  chatArchive: {
    enabled: true,
    defaultPrice: 100,
    minPrice: 50,
    billingUnit: 'per_user_year',
    trialDays: 7,
    tierPricing: [
      { min: 1, max: 10, price: 100 },
      { min: 11, max: 50, price: 90 },
      { min: 51, max: 100, price: 80 },
      { min: 101, max: 999999, price: 70 }
    ],
    enableRenewalDiscount: true,
    renewalDiscounts: [
      { months: 6, discount: 0.95 },
      { months: 12, discount: 0.9 },
      { months: 24, discount: 0.8 }
    ],
    presetPackages: [
      { name: '体验版', userCount: 5, price: 500, label: '' },
      { name: '基础版', userCount: 10, price: 1000, label: '推荐' },
      { name: '标准版', userCount: 50, price: 4000, label: '' },
      { name: '专业版', userCount: 100, price: 7000, label: '热销' },
      { name: '企业版', userCount: 300, price: 18000, label: '' },
      { name: '旗舰版', userCount: 500, price: 25000, label: '' }
    ],
    description: '企微会话存档增值服务，可查看员工与客户的聊天记录，支持敏感词检测和质检功能。'
  }
})

const addTier = () => {
  const last = form.value.chatArchive.tierPricing[form.value.chatArchive.tierPricing.length - 1]
  form.value.chatArchive.tierPricing.push({
    min: (last?.max || 0) + 1,
    max: (last?.max || 0) + 100,
    price: Math.max((last?.price || 100) - 10, 0)
  })
}

const removeTier = (index: number) => {
  form.value.chatArchive.tierPricing.splice(index, 1)
}

const addRenewalDiscount = () => {
  const last = form.value.chatArchive.renewalDiscounts[form.value.chatArchive.renewalDiscounts.length - 1]
  form.value.chatArchive.renewalDiscounts.push({
    months: (last?.months || 6) + 6,
    discount: Math.max((last?.discount || 0.9) - 0.05, 0.1)
  })
}

const addPresetPackage = () => {
  const last = form.value.chatArchive.presetPackages[form.value.chatArchive.presetPackages.length - 1]
  form.value.chatArchive.presetPackages.push({
    name: '',
    userCount: (last?.userCount || 10) * 2,
    price: (last?.price || 1000) * 1.5,
    label: ''
  })
}

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/vas-config')
    if (res.data?.chatArchive) {
      // 合并默认值，确保新字段不丢失
      const merged = { ...form.value.chatArchive, ...res.data.chatArchive }
      if (!Array.isArray(merged.renewalDiscounts)) {
        merged.renewalDiscounts = form.value.chatArchive.renewalDiscounts
      }
      if (!Array.isArray(merged.presetPackages)) {
        merged.presetPackages = form.value.chatArchive.presetPackages
      }
      form.value = { chatArchive: merged }
    }
  } catch (e) {
    console.error('Fetch VAS config error:', e)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await request.put('/wecom-management/vas-config', form.value)
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchConfig())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>



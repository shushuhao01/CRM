<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">基础配置</span>
            <span class="subtitle">配置CRM系统的基本信息，优先级高于租户/私有部署的本地设置</span>
          </div>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>保存配置
          </el-button>
        </div>
      </template>

      <el-alert type="warning" :closable="false" class="tip-alert">
        <template #title>
          此处配置的信息将覆盖所有租户和私有部署的系统设置。如果此处未配置，则使用各租户/私有部署自己的设置。
        </template>
      </el-alert>

      <el-tabs v-model="activeTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="form" label-width="120px" class="config-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="系统名称">
                  <el-input v-model="form.systemName" placeholder="请输入系统名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="系统版本">
                  <el-input v-model="form.systemVersion" placeholder="请输入系统版本" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="公司名称">
                  <el-input v-model="form.companyName" placeholder="请输入公司名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="联系邮箱">
                  <el-input v-model="form.contactEmail" placeholder="请输入联系邮箱" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="网站地址">
                  <el-input v-model="form.websiteUrl" placeholder="请输入网站地址" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="公司地址">
              <el-input v-model="form.companyAddress" placeholder="请输入公司地址" />
            </el-form-item>

            <el-form-item label="系统描述">
              <el-input v-model="form.systemDescription" type="textarea" :rows="3" placeholder="请输入系统描述" />
            </el-form-item>

            <el-form-item label="系统Logo">
              <el-upload
                class="logo-uploader"
                action="#"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleLogoChange"
              >
                <img v-if="form.systemLogo" :src="form.systemLogo" class="logo-preview" />
                <el-icon v-else class="logo-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">建议尺寸：200x60px，支持 jpg、png 格式</div>
            </el-form-item>

            <el-divider content-position="left">联系二维码</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="二维码标签">
                  <el-input v-model="form.contactQRCodeLabel" placeholder="如：微信、联系我们" />
                  <div class="upload-tip">用于说明二维码的用途</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系二维码">
                  <el-upload
                    class="qr-uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    :on-change="handleQRChange"
                  >
                    <img v-if="form.contactQRCode" :src="form.contactQRCode" class="qr-preview" />
                    <el-icon v-else class="qr-icon"><Plus /></el-icon>
                  </el-upload>
                  <div class="upload-tip">建议尺寸：200x200px</div>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <!-- 版权信息 -->
        <el-tab-pane label="版权信息" name="copyright">
          <el-form :model="form" label-width="120px" class="config-form">
            <el-form-item label="版权文字">
              <el-input v-model="form.copyrightText" placeholder="如：© 2024 XXX公司 版权所有" />
              <div class="upload-tip">显示在系统底部的版权信息</div>
            </el-form-item>
            <el-form-item label="ICP备案号">
              <el-input v-model="form.icpNumber" placeholder="如：京ICP备XXXXXXXX号" />
            </el-form-item>
            <el-form-item label="公安备案号">
              <el-input v-model="form.policeNumber" placeholder="如：京公网安备XXXXXXXX号" />
            </el-form-item>
            <el-form-item label="技术支持">
              <el-input v-model="form.techSupport" placeholder="如：技术支持：XXX科技" />
            </el-form-item>
          </el-form>

          <el-divider content-position="left">预览效果</el-divider>
          <div class="copyright-preview">
            <div class="preview-box">
              <p v-if="form.copyrightText">{{ form.copyrightText }}</p>
              <p v-if="form.icpNumber || form.policeNumber">
                <span v-if="form.icpNumber">{{ form.icpNumber }}</span>
                <span v-if="form.icpNumber && form.policeNumber"> | </span>
                <span v-if="form.policeNumber">{{ form.policeNumber }}</span>
              </p>
              <p v-if="form.techSupport">{{ form.techSupport }}</p>
            </div>
          </div>
        </el-tab-pane>

        <!-- 用户协议 -->
        <el-tab-pane label="用户协议" name="agreement">
          <el-form :model="form" label-width="120px" class="config-form">
            <el-form-item label="用户协议">
              <el-input v-model="form.userAgreement" type="textarea" :rows="10" placeholder="请输入用户使用协议内容" />
            </el-form-item>
            <el-form-item label="隐私政策">
              <el-input v-model="form.privacyPolicy" type="textarea" :rows="10" placeholder="请输入隐私政策内容" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 启用状态 -->
        <el-tab-pane label="启用状态" name="status">
          <el-form :model="form" label-width="160px" class="config-form">
            <el-alert type="info" :closable="false" style="margin-bottom: 20px">
              <template #title>
                启用后，对应配置将覆盖所有租户和私有部署的设置。未启用的配置项将使用各自的本地设置。
              </template>
            </el-alert>

            <el-form-item label="启用基本信息覆盖">
              <el-switch v-model="form.enableBasicOverride" />
              <span class="form-tip">系统名称、公司信息、Logo等</span>
            </el-form-item>
            <el-form-item label="启用版权信息覆盖">
              <el-switch v-model="form.enableCopyrightOverride" />
              <span class="form-tip">版权文字、备案号等</span>
            </el-form-item>
            <el-form-item label="启用用户协议覆盖">
              <el-switch v-model="form.enableAgreementOverride" />
              <span class="form-tip">用户协议、隐私政策</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import request from '@/api/request'

const saving = ref(false)
const activeTab = ref('basic')

const form = reactive({
  // 基本信息
  systemName: '',
  systemVersion: '',
  companyName: '',
  contactPhone: '',
  contactEmail: '',
  websiteUrl: '',
  companyAddress: '',
  systemDescription: '',
  systemLogo: '',
  contactQRCode: '',
  contactQRCodeLabel: '',
  // 版权信息
  copyrightText: '',
  icpNumber: '',
  policeNumber: '',
  techSupport: '',
  // 用户协议
  userAgreement: '',
  privacyPolicy: '',
  // 启用状态
  enableBasicOverride: false,
  enableCopyrightOverride: false,
  enableAgreementOverride: false
})

// Logo上传处理
const handleLogoChange = (file: UploadFile) => {
  if (file.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.systemLogo = e.target?.result as string
    }
    reader.readAsDataURL(file.raw)
  }
}

// 二维码上传处理
const handleQRChange = (file: UploadFile) => {
  if (file.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.contactQRCode = e.target?.result as string
    }
    reader.readAsDataURL(file.raw)
  }
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await request.get('/system-config')
    if (res.data) {
      Object.assign(form, res.data)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 保存配置
const handleSave = async () => {
  saving.value = true
  try {
    await request.post('/system-config', form)
    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped lang="scss">
.page-container {
  min-height: 100%;
}

.config-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 20px 24px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    .subtitle {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.tip-alert {
  margin-bottom: 20px;
}

.config-form {
  max-width: 900px;
  padding: 20px 0;
}

.logo-uploader, .qr-uploader {
  :deep(.el-upload) {
    border: 1px dashed #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.3s;

    &:hover {
      border-color: #409eff;
    }
  }
}

.logo-uploader :deep(.el-upload) {
  width: 200px;
  height: 60px;
}

.qr-uploader :deep(.el-upload) {
  width: 120px;
  height: 120px;
}

.logo-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.qr-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.logo-icon, .qr-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.copyright-preview {
  .preview-box {
    background: #1d1e1f;
    color: #909399;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    font-size: 12px;

    p {
      margin: 5px 0;
    }
  }
}
</style>

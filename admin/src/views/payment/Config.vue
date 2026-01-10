<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>支付配置</h2>
        <p class="header-desc">配置微信支付和支付宝，用于官网套餐购买收款</p>
      </div>
      <el-button type="primary" @click="handleSaveAll" :loading="saving">
        <el-icon><Check /></el-icon>保存全部配置
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- 微信支付配置 -->
      <el-tab-pane label="微信支付配置" name="wechat">
        <el-card shadow="never" class="config-card">
          <div class="config-header">
            <div class="config-title">
              <div class="pay-logo wechat">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z"/></svg>
              </div>
              <div>
                <h3>微信支付</h3>
                <span class="config-desc">支持Native支付、JSAPI支付、H5支付</span>
              </div>
            </div>
            <el-switch v-model="wechatConfig.enabled" active-text="已启用" inactive-text="已禁用" />
          </div>

          <el-divider />

          <el-form :model="wechatConfig" label-width="140px" class="config-form">
            <!-- API版本选择 -->
            <el-form-item label="支付接口版本">
              <el-radio-group v-model="wechatConfig.apiVersion">
                <el-radio label="v2">V2 (安全性较低/即将废弃)</el-radio>
                <el-radio label="v3">V3 (安全性较高/推荐)</el-radio>
              </el-radio-group>
              <div class="form-tip">建议使用V3版本，V3版接口更安全，支付证书的过期时间一年，支付服务商不用频繁更换证书</div>
            </el-form-item>

            <!-- 基础配置 -->
            <el-divider content-position="left">基础配置</el-divider>

            <el-form-item label="商户号" required>
              <el-input v-model="wechatConfig.mchId" placeholder="请输入微信支付商户号" />
              <div class="form-tip">微信支付商户平台的商户号</div>
            </el-form-item>

            <el-form-item label="AppID" required>
              <el-input v-model="wechatConfig.appId" placeholder="请输入公众号/小程序AppID" />
              <div class="form-tip">关联的公众号或小程序AppID</div>
            </el-form-item>

            <!-- V2配置 -->
            <template v-if="wechatConfig.apiVersion === 'v2'">
              <el-form-item label="API密钥(V2)" required>
                <el-input v-model="wechatConfig.apiKey" type="password" show-password placeholder="请输入API密钥" />
                <div class="form-tip">商户平台 → API安全 → API密钥(V2)</div>
              </el-form-item>
            </template>

            <!-- V3配置 -->
            <template v-if="wechatConfig.apiVersion === 'v3'">
              <el-divider content-position="left">V3证书配置</el-divider>

              <el-form-item label="证书序列号" required>
                <el-input v-model="wechatConfig.serialNo" placeholder="请输入证书序列号" />
                <div class="form-tip">商户API证书的证书序列号，可在证书详情中查看或运行命令获取</div>
              </el-form-item>

              <el-form-item label="微信支付接收限额">
                <el-input-number v-model="wechatConfig.receiveLimit" :min="0" :step="100" />
                <span class="unit">元</span>
                <div class="form-tip">微信自动提现限额设置</div>
              </el-form-item>

              <el-form-item label="V3密钥" required>
                <el-input v-model="wechatConfig.apiKeyV3" type="password" show-password placeholder="请输入APIv3密钥" />
                <div class="form-tip">V3支付密钥</div>
              </el-form-item>

              <el-form-item label="V3支付证书" required>
                <el-input v-model="wechatConfig.certPath" placeholder="如：PUBK_NLY_43_0178b463M6023025121100101KJWM2G01" />
                <div class="form-tip">V3支付证书，请按照文档说明填写</div>
              </el-form-item>

              <el-form-item label="V3支付公钥序列号">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'publicKeyPath')"
                >
                  <el-button type="primary" plain>
                    <el-icon><Upload /></el-icon>上传公钥证书
                  </el-button>
                </el-upload>
                <div class="form-tip">V3支付公钥证书，需要在微信支付平台上自行申请</div>
              </el-form-item>

              <el-form-item label="Mchid">
                <el-input v-model="wechatConfig.mchId" disabled />
                <div class="form-tip">微信商户商户号，跟随商户号自动填充</div>
              </el-form-item>

              <el-form-item label="商家支付证书">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'certPem')"
                >
                  <el-button type="primary" plain>
                    <el-icon><Upload /></el-icon>上传证书
                  </el-button>
                </el-upload>
                <div class="form-tip">微信支付证书，在微信商户平台下载，文件名一般为apiclient_cert.pem</div>
              </el-form-item>

              <el-form-item label="微信支付证书密钥">
                <el-upload
                  action="#"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'keyPem')"
                >
                  <el-button type="primary" plain>
                    <el-icon><Upload /></el-icon>上传密钥
                  </el-button>
                </el-upload>
                <div class="form-tip">微信支付证书密钥不可用时可以下载，文件名一般为apiclient_key.pem</div>
              </el-form-item>
            </template>

            <!-- 小程序配置 -->
            <el-divider content-position="left">小程序配置（选填）</el-divider>

            <el-form-item label="小程序商户号绑定">
              <el-radio-group v-model="wechatConfig.miniAppBind">
                <el-radio label="same">商户号绑定</el-radio>
                <el-radio label="different">非商户号绑定</el-radio>
              </el-radio-group>
              <div class="form-tip">小程序开发者是否是商户号绑定的商户管理员或员工账号</div>
            </el-form-item>

            <el-form-item label="商户号类型">
              <el-radio-group v-model="wechatConfig.mchType">
                <el-radio label="normal">微信支付商户号</el-radio>
                <el-radio label="sub">微信支付服务商子商户</el-radio>
              </el-radio-group>
              <div class="form-tip">商户类型，自行开通的商户号选择微信支付商户号即可</div>
            </el-form-item>

            <!-- 回调地址 -->
            <el-divider content-position="left">回调配置</el-divider>

            <el-form-item label="支付回调地址">
              <el-input v-model="wechatConfig.notifyUrl" readonly>
                <template #append>
                  <el-button @click="copyUrl(wechatConfig.notifyUrl)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </template>
              </el-input>
              <div class="form-tip">支付成功后微信会回调此地址，请确保服务器可访问</div>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <el-button type="primary" @click="handleSaveWechat" :loading="savingWechat">
              保存微信配置
            </el-button>
            <el-button @click="handleTestWechat">测试连接</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 支付宝配置 -->
      <el-tab-pane label="支付宝支付配置" name="alipay">
        <el-card shadow="never" class="config-card">
          <div class="config-header">
            <div class="config-title">
              <div class="pay-logo alipay">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.422 15.358c-3.83-1.153-6.055-1.84-6.678-2.062a23.013 23.013 0 0 0 1.496-4.753h-4.163v-1.56h5.097V5.876h-5.097V3.593H9.985v2.283H4.94v1.107h5.045v1.56H5.18v1.107h8.468a18.39 18.39 0 0 1-1.048 3.013c-2.21-.698-4.093-.98-5.62-.98-3.024 0-4.9 1.47-4.9 3.652 0 2.006 1.876 3.603 5.4 3.603 2.812 0 5.564-1.18 7.593-3.012 1.903.86 5.025 2.14 6.35 2.596.857.295 1.656.443 2.577.443V15.36z"/></svg>
              </div>
              <div>
                <h3>支付宝</h3>
                <span class="config-desc">支持扫码支付、网页支付、APP支付</span>
              </div>
            </div>
            <el-switch v-model="alipayConfig.enabled" active-text="已启用" inactive-text="已禁用" />
          </div>

          <el-divider />

          <el-form :model="alipayConfig" label-width="140px" class="config-form">
            <el-form-item label="支付应用Appid" required>
              <el-input v-model="alipayConfig.appId" placeholder="请输入支付宝AppID" />
              <div class="form-tip">支付宝开放平台应用AppID</div>
            </el-form-item>

            <el-form-item label="支付宝商家私钥" required>
              <el-input v-model="alipayConfig.privateKey" type="textarea" :rows="4"
                placeholder="MIIEvAIBADANBgkqhkiG9w0BAQEFAASC..." />
              <div class="form-tip">应用私钥，用于签名请求</div>
            </el-form-item>

            <el-form-item label="商家公钥验签类型">
              <el-radio-group v-model="alipayConfig.verifyType">
                <el-radio label="public">公钥</el-radio>
                <el-radio label="cert">公钥证书</el-radio>
              </el-radio-group>
              <div class="form-tip">建议使用公钥证书方式，安全性更高</div>
            </el-form-item>

            <el-form-item label="支付宝公钥" required v-if="alipayConfig.verifyType === 'public'">
              <el-input v-model="alipayConfig.alipayPublicKey" type="textarea" :rows="4"
                placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..." />
              <div class="form-tip">用于验证支付宝回调签名</div>
            </el-form-item>

            <template v-if="alipayConfig.verifyType === 'cert'">
              <el-form-item label="应用公钥证书">
                <el-upload action="#" :auto-upload="false" :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'appCertPath')">
                  <el-button type="primary" plain><el-icon><Upload /></el-icon>上传证书</el-button>
                </el-upload>
                <div class="form-tip">appCertPublicKey_xxx.crt</div>
              </el-form-item>

              <el-form-item label="支付宝公钥证书">
                <el-upload action="#" :auto-upload="false" :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'alipayCertPath')">
                  <el-button type="primary" plain><el-icon><Upload /></el-icon>上传证书</el-button>
                </el-upload>
                <div class="form-tip">alipayCertPublicKey_RSA2.crt</div>
              </el-form-item>

              <el-form-item label="支付宝根证书">
                <el-upload action="#" :auto-upload="false" :show-file-list="false"
                  :on-change="(file: any) => handleFileUpload(file, 'alipayRootCertPath')">
                  <el-button type="primary" plain><el-icon><Upload /></el-icon>上传证书</el-button>
                </el-upload>
                <div class="form-tip">alipayRootCert.crt</div>
              </el-form-item>
            </template>

            <el-form-item label="签名类型">
              <el-radio-group v-model="alipayConfig.signType">
                <el-radio label="RSA2">RSA2（推荐）</el-radio>
                <el-radio label="RSA">RSA</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="回调地址">
              <el-input v-model="alipayConfig.notifyUrl" readonly>
                <template #append>
                  <el-button @click="copyUrl(alipayConfig.notifyUrl)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </template>
              </el-input>
              <div class="form-tip">支付成功后支付宝会回调此地址</div>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <el-button type="primary" @click="handleSaveAlipay" :loading="savingAlipay">
              保存支付宝配置
            </el-button>
            <el-button @click="handleTestAlipay">测试连接</el-button>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, CopyDocument, Upload } from '@element-plus/icons-vue'
import request from '@/api/request'

const activeTab = ref('wechat')
const saving = ref(false)
const savingWechat = ref(false)
const savingAlipay = ref(false)

const baseUrl = window.location.origin.replace(':5174', ':3000')

const wechatConfig = reactive({
  enabled: false,
  apiVersion: 'v3',
  mchId: '',
  appId: '',
  apiKey: '',
  apiKeyV3: '',
  serialNo: '',
  receiveLimit: 1000,
  certPath: '',
  publicKeyPath: '',
  certPem: '',
  keyPem: '',
  miniAppBind: 'same',
  mchType: 'normal',
  notifyUrl: `${baseUrl}/api/v1/public/payment/wechat/notify`
})

const alipayConfig = reactive({
  enabled: false,
  appId: '',
  privateKey: '',
  alipayPublicKey: '',
  verifyType: 'public',
  appCertPath: '',
  alipayCertPath: '',
  alipayRootCertPath: '',
  signType: 'RSA2',
  notifyUrl: `${baseUrl}/api/v1/public/payment/alipay/notify`
})

const fetchConfig = async () => {
  try {
    const res = await request.get('/payment/config')
    if (res.success) {
      const { wechat, alipay } = res.data
      if (wechat) Object.assign(wechatConfig, wechat)
      if (alipay) Object.assign(alipayConfig, alipay)
    }
  } catch (error) {
    console.error('获取配置失败:', error)
  }
}

const handleSaveWechat = async () => {
  savingWechat.value = true
  try {
    const res = await request.post('/payment/config/wechat', wechatConfig)
    if (res.success) {
      ElMessage.success('微信支付配置已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    savingWechat.value = false
  }
}

const handleSaveAlipay = async () => {
  savingAlipay.value = true
  try {
    const res = await request.post('/payment/config/alipay', alipayConfig)
    if (res.success) {
      ElMessage.success('支付宝配置已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    savingAlipay.value = false
  }
}

const handleSaveAll = async () => {
  saving.value = true
  await handleSaveWechat()
  await handleSaveAlipay()
  saving.value = false
}

const handleTestWechat = () => {
  ElMessage.info('微信支付测试功能开发中')
}

const handleTestAlipay = () => {
  ElMessage.info('支付宝测试功能开发中')
}

const handleFileUpload = (file: any, field: string) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (field.includes('wechat') || ['certPem', 'keyPem', 'publicKeyPath'].includes(field)) {
      (wechatConfig as any)[field] = content
    } else {
      (alipayConfig as any)[field] = content
    }
    ElMessage.success('文件已读取')
  }
  reader.readAsText(file.raw)
}

const copyUrl = (url: string) => {
  navigator.clipboard.writeText(url)
  ElMessage.success('已复制到剪贴板')
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped lang="scss">
.page-container {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;

  h2 { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; }
  .header-desc { font-size: 14px; color: #909399; margin: 0; }
}

.config-tabs {
  :deep(.el-tabs__header) { margin-bottom: 20px; }
  :deep(.el-tabs__item) { font-size: 15px; }
}

.config-card {
  border-radius: 12px;
  border: none;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 16px;

  h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
  .config-desc { font-size: 13px; color: #909399; }
}

.pay-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg { width: 28px; height: 28px; }

  &.wechat { background: linear-gradient(135deg, #07c160 0%, #00b057 100%); color: white; }
  &.alipay { background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%); color: white; }
}

.config-form {
  max-width: 800px;

  :deep(.el-form-item) { margin-bottom: 22px; }
  :deep(.el-form-item__label) { font-weight: 500; }
  :deep(.el-divider__text) { font-weight: 600; color: #303133; }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.unit {
  margin-left: 8px;
  color: #606266;
}

.form-footer {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;
}
</style>

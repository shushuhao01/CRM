<template>
  <el-dialog
    v-model="dialogVisible"
    width="1200px"
    :before-close="handleClose"
    class="label-template-dialog"
    append-to-body
  >
    <template #header>
      <div class="dialog-header-with-help">
        <span class="el-dialog__title">面单模板管理</span>
        <el-tooltip content="查看面单模板配置指南" placement="bottom">
          <el-button link type="primary" class="help-icon-btn" @click="goToHelp">
            <el-icon :size="18"><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    <div class="template-layout">
      <!-- 左侧：模板列表 + 配置 -->
      <div class="template-left">
        <div class="template-content">
          <!-- 预设模板 -->
          <div class="section">
            <h4 class="section-title"><el-icon><Collection /></el-icon> 预设模板（点击选择）</h4>
            <div class="template-grid">
              <div
                v-for="tpl in allTemplates"
                :key="tpl.id"
                class="template-card"
                :class="{
                  'is-selected': selectedTemplateId === tpl.id,
                  'is-custom': !tpl.isPreset,
                  'is-default': defaultTemplateId === tpl.id
                }"
                @click="selectTemplate(tpl)"
              >
                <div class="tpl-header">
                  <span class="tpl-company">{{ tpl.companyName }}</span>
                  <div class="tpl-tags">
                    <el-tag v-if="defaultTemplateId === tpl.id" type="warning" size="small">默认</el-tag>
                    <el-tag v-if="!tpl.isPreset" type="success" size="small">自定义</el-tag>
                  </div>
                </div>
                <div class="tpl-name">{{ tpl.name }}</div>
                <div class="tpl-size">{{ tpl.paperSize.replace('x', '×') }}mm</div>
                <el-icon v-if="selectedTemplateId === tpl.id" class="check-icon"><CircleCheckFilled /></el-icon>
              </div>
            </div>
          </div>

          <!-- 模板配置 -->
          <div v-if="editingTemplate" class="section">
            <div class="section-header">
              <h4 class="section-title"><el-icon><Edit /></el-icon> 模板配置 - {{ editingTemplate.name }}</h4>
              <div>
                <el-button
                  v-if="defaultTemplateId !== editingTemplate.id"
                  type="warning"
                  size="small"
                  @click="handleSetDefault"
                >⭐ 设为默认</el-button>
                <el-button
                  v-else
                  size="small"
                  @click="handleCancelDefault"
                >取消默认</el-button>
                <el-button
                  v-if="editingTemplate.isPreset && isPresetModified"
                  type="warning"
                  size="small"
                  @click="handleResetPreset"
                >恢复默认</el-button>
                <el-button
                  v-if="!editingTemplate.isPreset"
                  type="danger"
                  size="small"
                  @click="handleDeleteTemplate"
                >删除模板</el-button>
                <el-button type="primary" size="small" @click="handleCreateCustom">创建自定义副本</el-button>
              </div>
            </div>

            <el-form :model="editingTemplate" label-width="100px" size="default" class="tpl-form">
              <div class="form-row">
                <el-form-item label="模板名称" class="form-half">
                  <el-input v-model="editingTemplate.name" :disabled="editingTemplate.isPreset" />
                </el-form-item>
                <el-form-item label="纸张尺寸" class="form-half">
                  <el-select v-model="editingTemplate.paperSize">
                    <el-option label="一联单 100×180mm" value="100x180" />
                    <el-option label="标准面单 100×150mm" value="100x150" />
                    <el-option label="方形面单 100×100mm" value="100x100" />
                    <el-option label="小面单 76×130mm" value="76x130" />
                  </el-select>
                </el-form-item>
              </div>

              <el-divider content-position="left">显示内容</el-divider>

              <div class="checkbox-grid">
                <el-checkbox v-model="editingTemplate.showBarcode">条形码</el-checkbox>
                <el-checkbox v-model="editingTemplate.showQrcode">二维码</el-checkbox>
                <el-checkbox v-model="editingTemplate.showSenderInfo">寄件人信息</el-checkbox>
                <el-checkbox v-model="editingTemplate.showProducts">商品明细</el-checkbox>
                <el-checkbox v-model="editingTemplate.showCodAmount">代收款金额</el-checkbox>
                <el-checkbox v-model="editingTemplate.showRemark">订单备注</el-checkbox>
                <el-checkbox v-model="editingTemplate.showServiceWechat">客服微信</el-checkbox>
                <el-checkbox v-model="editingTemplate.showSignArea">签收区域</el-checkbox>
              </div>

              <el-divider content-position="left">隐私保护</el-divider>

              <el-form-item label="收件人手机">
                <el-radio-group v-model="editingTemplate.privacyMode">
                  <el-radio label="partial">
                    <span>部分隐藏</span>
                    <span class="privacy-example">138****5678</span>
                  </el-radio>
                  <el-radio label="full">
                    <span>完全显示</span>
                    <span class="privacy-example">13812345678</span>
                  </el-radio>
                  <el-radio label="hidden">
                    <span>完全隐藏</span>
                    <span class="privacy-example">***</span>
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="收件人姓名">
                <el-radio-group v-model="editingTemplate.namePrivacy">
                  <el-radio label="full">
                    <span>完全显示</span>
                    <span class="privacy-example">张三</span>
                  </el-radio>
                  <el-radio label="partial">
                    <span>部分隐藏</span>
                    <span class="privacy-example">张*</span>
                  </el-radio>
                  <el-radio label="hidden">
                    <span>完全隐藏</span>
                    <span class="privacy-example">***</span>
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="收件人地址">
                <el-radio-group v-model="editingTemplate.addressPrivacy">
                  <el-radio label="full">
                    <span>完全显示</span>
                    <span class="privacy-example">北京市朝阳区建国路xxx号</span>
                  </el-radio>
                  <el-radio label="partial">
                    <span>部分隐藏</span>
                    <span class="privacy-example">北京市朝阳区****</span>
                  </el-radio>
                  <el-radio label="hidden">
                    <span>完全隐藏</span>
                    <span class="privacy-example">***</span>
                  </el-radio>
                </el-radio-group>
              </el-form-item>

              <div class="logistics-privacy-notice">
                <el-alert
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #title>
                    <span style="font-weight: 600;">关于物流隐私说明</span>
                  </template>
                  <div style="line-height: 1.8; font-size: 12px;">
                    <p>• 以上隐私加密设置<b>仅影响面单打印显示</b>，用于保护客户隐私。</p>
                    <p>• 通过物流API下单时，系统会将<b>完整的姓名、手机号、详细地址</b>传递给物流公司，确保快递员能正常配送和联系客户。</p>
                    <p>• 物流公司收到的是完整准确的收件信息，不受此处加密设置影响。</p>
                  </div>
                </el-alert>
              </div>

              <el-form-item>
                <el-button type="primary" @click="handleSaveTemplate">
                  <el-icon><Check /></el-icon> 保存模板配置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>

      <!-- 右侧：实时面单预览 -->
      <div class="template-right">
        <h4 class="section-title"><el-icon><View /></el-icon> 实时预览</h4>
        <div class="live-preview-wrapper">
          <div v-if="editingTemplate" class="live-preview-scaler" :style="{ transform: `scale(${livePreviewScale})`, transformOrigin: 'top center' }">
            <div class="sl-live" :style="{ width: previewPaperW + 'mm' }">
              <!-- 头部 -->
              <div class="sl-header">
                <div class="sl-company">{{ editingTemplate.companyName || '物流公司' }}</div>
                <el-tooltip content="路由码（大头笔）：根据收件地址自动生成目的地简码。示例：京-朝 = 北京市朝阳区" placement="top">
                  <div class="sl-route-code">京-朝</div>
                </el-tooltip>
              </div>
              <!-- 条形码 -->
              <div v-if="editingTemplate.showBarcode !== false" class="sl-barcode-top">
                <svg ref="previewBarcodeTopRef" class="sl-barcode-top-svg"></svg>
                <div class="sl-tracking-no">SF1234567890123</div>
              </div>
              <!-- 收件人 -->
              <div class="sl-addr-block">
                <div class="sl-addr-row">
                  <span class="sl-tag sl-tag-recv">收</span>
                  <span class="sl-name">{{ previewReceiverName }}</span>
                  <span class="sl-phone">{{ previewPhone }}</span>
                </div>
                <div class="sl-addr-detail">{{ previewReceiverAddress }}</div>
              </div>
              <!-- 寄件人 -->
              <div v-if="editingTemplate.showSenderInfo" class="sl-addr-block sl-send">
                <div class="sl-addr-row">
                  <span class="sl-tag sl-tag-send">寄</span>
                  <span class="sl-name-sm">客服中心</span>
                  <span class="sl-phone-sm">{{ previewSenderPhone }}</span>
                </div>
                <div class="sl-addr-detail-sm">北京市海淀区科技园区xxx号</div>
              </div>
              <!-- 商品 -->
              <div v-if="editingTemplate.showProducts" class="sl-info-row">
                <b>商品：</b>示例商品A×2、示例商品B×1
              </div>
              <!-- 代收款 -->
              <div v-if="editingTemplate.showCodAmount" class="sl-info-row sl-cod">
                <b>代收款：¥299.00</b>
              </div>
              <!-- 备注 -->
              <div v-if="editingTemplate.showRemark" class="sl-info-row sl-remark">
                <b>备注：</b><span>请轻放，易碎品</span>
              </div>
              <!-- 底部 -->
              <div class="sl-bottom">
                <div v-if="editingTemplate.showQrcode !== false" class="qr-placeholder">
                  <canvas ref="previewQrcodeRef" width="64" height="64" style="width:64px;height:64px;"></canvas>
                </div>
                <div class="sl-bottom-right">
                  <svg ref="previewBarcodeBottomRef" class="sl-barcode-btm-svg"></svg>
                  <div class="sl-order-info">
                    <span>订单号：ORD20260401001</span>
                    <span class="sl-time">2026-04-01</span>
                  </div>
                </div>
              </div>
              <!-- 签收 -->
              <div v-if="editingTemplate.showSignArea" class="sl-sign">
                签收人/日期：________________
              </div>
            </div>
          </div>
          <div v-else class="preview-placeholder">
            <el-empty description="选择模板查看预览" :image-size="60" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="confirmSelect">确认选择</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Collection, Edit, CircleCheckFilled, View, Check, QuestionFilled } from '@element-plus/icons-vue'
import { maskPhone, PAPER_SIZES } from '@/utils/printService'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import {
  getAllTemplates, saveCustomTemplate, deleteCustomTemplate,
  getLastUsedTemplateId, setLastUsedTemplateId,
  savePresetOverride, resetPresetOverride, hasPresetOverride,
  getPresetDefault, maskName, maskAddress,
  getDefaultTemplateId, setDefaultTemplateId, clearDefaultTemplateId,
  type LabelTemplate
} from '@/utils/labelTemplates'

interface Props {
  visible: boolean
  currentTemplateId?: string
}
interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'select', template: LabelTemplate): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const goToHelp = () => {
  dialogVisible.value = false
  nextTick(() => {
    router.push('/help-center?section=logistics-label-guide')
  })
}

const allTemplates = ref<LabelTemplate[]>([])
const selectedTemplateId = ref('')
const editingTemplate = ref<LabelTemplate | null>(null)
const defaultTemplateId = ref(getDefaultTemplateId())

// 预览计算
const previewPaperW = computed(() => {
  if (!editingTemplate.value) return 100
  const p = PAPER_SIZES[editingTemplate.value.paperSize]
  return p ? p.width : 100
})

const livePreviewScale = computed(() => {
  // 右侧面板约400px宽，padding后约360px
  const labelPx = previewPaperW.value * 3.78
  return Math.min(360 / labelPx, 1)
})

const previewPhone = computed(() => {
  if (!editingTemplate.value) return '138****5678'
  return maskPhone('13812345678', editingTemplate.value.privacyMode || 'partial')
})

const previewReceiverName = computed(() => {
  if (!editingTemplate.value) return '张三'
  return maskName('张三', editingTemplate.value.namePrivacy || 'full')
})

const previewReceiverAddress = computed(() => {
  if (!editingTemplate.value) return '北京市朝阳区建国路xxx号'
  return maskAddress('北京市朝阳区建国路xxx号', editingTemplate.value.addressPrivacy || 'full')
})

const previewSenderPhone = computed(() => {
  if (!editingTemplate.value) return '010****5678'
  return maskPhone('01012345678', editingTemplate.value.privacyMode || 'partial')
})

// Reactive trigger for preset override state
const presetOverrideVersion = ref(0)

// 检查预设模板是否已被修改
const isPresetModified = computed(() => {
  presetOverrideVersion.value // trigger dependency
  if (!editingTemplate.value || !editingTemplate.value.isPreset) return false
  return hasPresetOverride(editingTemplate.value.id)
})

// Refs for real barcode/QR generation
const previewBarcodeTopRef = ref<SVGSVGElement | null>(null)
const previewBarcodeBottomRef = ref<SVGSVGElement | null>(null)
const previewQrcodeRef = ref<HTMLCanvasElement | null>(null)

const generatePreviewBarcodes = () => {
  const sampleTrackingNo = 'SF1234567890123'
  if (previewBarcodeTopRef.value) {
    try {
      JsBarcode(previewBarcodeTopRef.value, sampleTrackingNo, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0 })
    } catch (e) { console.warn('预览顶部条形码生成失败:', e) }
  }
  if (previewBarcodeBottomRef.value) {
    try {
      JsBarcode(previewBarcodeBottomRef.value, sampleTrackingNo, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 2, textMargin: 1 })
    } catch (e) { console.warn('预览底部条形码生成失败:', e) }
  }
  if (previewQrcodeRef.value) {
    try {
      // 二维码仅编码运单号，保护隐私
      QRCode.toCanvas(previewQrcodeRef.value, sampleTrackingNo, { width: 64, margin: 0, color: { dark: '#000000', light: '#ffffff' } })
    } catch (e) { console.warn('预览二维码生成失败:', e) }
  }
}

onMounted(() => {
  loadTemplates()
})

watch(() => props.visible, (val) => {
  if (val) {
    loadTemplates()
    defaultTemplateId.value = getDefaultTemplateId()
    selectedTemplateId.value = props.currentTemplateId || getLastUsedTemplateId()
    const tpl = allTemplates.value.find(t => t.id === selectedTemplateId.value)
    if (tpl) editingTemplate.value = { ...tpl }
    nextTick(() => generatePreviewBarcodes())
  }
})

const loadTemplates = () => {
  allTemplates.value = getAllTemplates()
}

const selectTemplate = (tpl: LabelTemplate) => {
  selectedTemplateId.value = tpl.id
  editingTemplate.value = { ...tpl }
  nextTick(() => generatePreviewBarcodes())
}

const handleCreateCustom = () => {
  if (!editingTemplate.value) return
  const custom: LabelTemplate = {
    ...editingTemplate.value,
    id: 'custom-' + Date.now(),
    name: editingTemplate.value.name + '（自定义）',
    isPreset: false,
  }
  saveCustomTemplate(custom)
  loadTemplates()
  selectedTemplateId.value = custom.id
  editingTemplate.value = { ...custom }
  ElMessage.success('已创建自定义模板副本')
}

const handleSaveTemplate = () => {
  if (!editingTemplate.value) return
  if (editingTemplate.value.isPreset) {
    // 预设模板：保存用户的自定义覆盖
    savePresetOverride(editingTemplate.value.id, editingTemplate.value)
    loadTemplates()
    presetOverrideVersion.value++
    ElMessage.success('模板配置已保存，立即生效')
  } else {
    saveCustomTemplate(editingTemplate.value)
    loadTemplates()
    ElMessage.success('模板已保存')
  }
}

const handleSetDefault = () => {
  if (!editingTemplate.value) return
  setDefaultTemplateId(editingTemplate.value.id)
  defaultTemplateId.value = editingTemplate.value.id
  ElMessage.success(`已将「${editingTemplate.value.name}」设为默认模板`)
}

const handleCancelDefault = () => {
  clearDefaultTemplateId()
  defaultTemplateId.value = ''
  ElMessage.success('已取消默认模板')
}

const handleResetPreset = async () => {
  if (!editingTemplate.value || !editingTemplate.value.isPreset) return
  await ElMessageBox.confirm('确定要恢复此模板为默认设置吗？您的自定义配置将被清除。', '恢复默认', { type: 'warning' })
  resetPresetOverride(editingTemplate.value.id)
  loadTemplates()
  presetOverrideVersion.value++
  // 重新加载默认值
  const defaultTpl = getPresetDefault(editingTemplate.value.id)
  if (defaultTpl) {
    editingTemplate.value = { ...defaultTpl }
  }
  nextTick(() => generatePreviewBarcodes())
  ElMessage.success('已恢复默认设置')
}

const handleDeleteTemplate = async () => {
  if (!editingTemplate.value || editingTemplate.value.isPreset) return
  await ElMessageBox.confirm('确定要删除此自定义模板吗？', '确认删除', { type: 'warning' })
  deleteCustomTemplate(editingTemplate.value.id)
  editingTemplate.value = null
  selectedTemplateId.value = 'universal-standard'
  loadTemplates()
  ElMessage.success('模板已删除')
}

const confirmSelect = () => {
  const tpl = allTemplates.value.find(t => t.id === selectedTemplateId.value)
  if (tpl) {
    setLastUsedTemplateId(tpl.id)
    if (editingTemplate.value && editingTemplate.value.id === tpl.id) {
      emit('select', editingTemplate.value)
    } else {
      emit('select', tpl)
    }
  }
  handleClose()
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.dialog-header-with-help {
  display: flex;
  align-items: center;
  gap: 8px;
}
.help-icon-btn {
  padding: 2px;
  margin-left: 4px;
}

/* 左右布局 */
.template-layout {
  display: flex;
  gap: 20px;
  max-height: 70vh;
}

.template-left {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.template-right {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.template-content {
  padding-right: 4px;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

/* 模板网格 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.template-card {
  padding: 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  text-align: center;
}

.template-card:hover {
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.template-card.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.template-card.is-custom {
  border-style: dashed;
}

.template-card.is-default {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.template-card.is-default.is-selected {
  border-color: #409eff;
  background: linear-gradient(135deg, #ecf5ff 60%, #fdf6ec 100%);
}

.tpl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.tpl-tags {
  display: flex;
  gap: 4px;
}

.tpl-company {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
}

.tpl-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-size {
  font-size: 11px;
  color: #909399;
}

.check-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  color: #409eff;
  font-size: 20px;
  background: #fff;
  border-radius: 50%;
}

/* 表单 */
.tpl-form {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-half {
  flex: 1;
}

.form-half :deep(.el-select) {
  width: 100%;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 10px;
}

.privacy-example {
  font-size: 12px;
  color: #909399;
  margin-left: 6px;
  font-family: monospace;
}

.logistics-privacy-notice {
  margin: 12px 0 16px;
}

.logistics-privacy-notice p {
  margin: 0;
}

/* ===== 右侧实时预览 ===== */
.live-preview-wrapper {
  flex: 1;
  background: #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  min-height: 300px;
}

.live-preview-scaler {
  transition: transform 0.15s;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 300px;
}

/* 实时预览面单样式 - 与PrintLabelDialog一致 */
.sl-live {
  background: #fff; border: 2px solid #000;
  padding: 8px 10px; font-family: 'Microsoft YaHei','PingFang SC',Arial,sans-serif;
  font-size: 11px; color: #000; box-sizing: border-box;
}

.sl-live .sl-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 6px;
}
.sl-live .sl-company { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
.sl-live .sl-route-code {
  font-size: 28px; font-weight: 900; letter-spacing: 3px;
  border: 3px solid #000; padding: 2px 10px; border-radius: 4px;
  min-width: 80px; text-align: center; line-height: 1.1;
}
.sl-live .sl-barcode-top {
  text-align: center; border-bottom: 2px solid #000;
  padding: 4px 0 6px; margin-bottom: 6px;
}
.sl-live .sl-barcode-top-svg { max-width: 90%; height: 50px; }
.sl-live .sl-tracking-no { font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-top: 2px; }
.sl-live .sl-addr-block { border-bottom: 1.5px solid #000; padding: 5px 0; margin-bottom: 4px; }
.sl-live .sl-addr-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }
.sl-live .sl-tag {
  font-size: 13px; font-weight: 900; padding: 1px 6px; border-radius: 3px; color: #fff;
  flex-shrink: 0; display: inline-block;
}
.sl-live .sl-tag-recv { background: #000; }
.sl-live .sl-tag-send { background: #555; }
.sl-live .sl-name { font-size: 16px; font-weight: 700; }
.sl-live .sl-phone { font-size: 13px; color: #333; }
.sl-live .sl-name-sm { font-size: 12px; }
.sl-live .sl-phone-sm { font-size: 11px; color: #666; }
.sl-live .sl-addr-detail { font-size: 13px; line-height: 1.5; padding-left: 28px; }
.sl-live .sl-addr-detail-sm { font-size: 11px; color: #444; padding-left: 28px; }
.sl-live .sl-send { border-bottom: 1px dashed #999; }
.sl-live .sl-info-row {
  border-bottom: 1px dashed #aaa; padding: 3px 0; font-size: 11px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sl-live .sl-cod { font-size: 14px; color: #c00; }
.sl-live .sl-remark span { color: #c00; }
.sl-live .sl-bottom {
  display: flex; align-items: flex-start; gap: 8px;
  padding-top: 6px; margin-top: 4px; border-top: 2px solid #000;
}
.qr-placeholder { flex-shrink: 0; width: 64px; height: 64px; }
.sl-live .sl-bottom-right { flex: 1; overflow: hidden; }
.sl-live .sl-barcode-btm-svg { max-width: 100%; height: 30px; display: block; }
.sl-live .sl-order-info { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 2px; }
.sl-live .sl-time { color: #999; }
.sl-live .sl-sign {
  border-top: 1px dashed #999; padding-top: 4px; margin-top: 4px;
  font-size: 11px; color: #666;
}
</style>


<template>
  <div class="first-row">
    <el-card class="customer-info-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><User /></el-icon>
            客户信息
          </span>
          <el-button v-if="!isEditing" type="text" @click="$emit('toggle-edit')" :icon="Edit">编辑</el-button>
          <div v-else class="edit-actions">
            <el-button type="primary" size="small" @click="$emit('save')">保存</el-button>
            <el-button size="small" @click="$emit('cancel-edit')">取消</el-button>
          </div>
        </div>
      </template>

      <div v-if="!isEditing" class="info-display">
        <!-- 第一行：客户姓名、客户编码和联系电话 -->
        <div class="customer-info-row">
          <div class="info-item name-section">
            <span class="field-label">客户姓名</span>
            <span class="customer-name-display">{{ customerInfo.name || '暂无' }}</span>
          </div>
          <div class="info-item code-section">
            <span class="field-label">客户编码</span>
            <span class="customer-code-display" @click="$emit('copy-code')" :title="'点击复制编码：' + (customerInfo.code || '暂无')">
              {{ customerInfo.code || '暂无' }}
            </span>
          </div>
          <div class="info-item phone-section">
            <span class="field-label">联系电话</span>
            <div class="phone-container-horizontal">
              <template v-if="customerInfo.phone || (customerInfo.otherPhones && customerInfo.otherPhones.length > 0)">
                <span v-if="customerInfo.phone" class="phone-display" @click="$emit('make-call', customerInfo.phone)">
                  {{ displaySensitiveInfoNew(customerInfo.phone, SensitiveInfoType.PHONE) }}
                  <el-icon class="call-icon"><Phone /></el-icon>
                </span>
                <span
                  v-for="phone in customerInfo.otherPhones"
                  :key="phone"
                  class="phone-display"
                  @click="$emit('make-call', phone)"
                >
                  {{ displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE) }}
                  <el-icon class="call-icon"><Phone /></el-icon>
                </span>
              </template>
              <span v-else class="field-value">暂无</span>
            </div>
          </div>
        </div>

        <!-- 第三行：客户等级、年龄、身高、体重、性别 -->
        <div class="customer-info-row">
          <div class="info-item">
            <span class="field-label">客户等级</span>
            <el-tag v-if="customerInfo.level" :type="getLevelType(customerInfo.level)" class="level-tag" size="small">
              {{ getLevelText(customerInfo.level) }}
            </el-tag>
            <span v-else class="field-value">暂无</span>
          </div>
          <div class="info-item">
            <span class="field-label">年龄</span>
            <span class="field-value">{{ customerInfo.age ? customerInfo.age + ' 岁' : '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">身高</span>
            <span class="field-value">{{ customerInfo.height ? customerInfo.height + 'cm' : '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">体重</span>
            <span class="field-value">{{ customerInfo.weight ? customerInfo.weight + 'kg' : '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">性别</span>
            <span class="field-value">{{ getGenderText(customerInfo.gender) || '暂无' }}</span>
          </div>
        </div>

        <!-- 第四行：客户标签、客户生日、进粉时间、负责销售、改善问题 -->
        <div class="customer-info-row tags-row-flex">
          <div class="info-item flex-item">
            <span class="field-label">客户标签</span>
            <div v-if="customerInfo.tags && customerInfo.tags.length > 0" class="customer-tags-inline">
              <el-tag
                v-for="tag in customerInfo.tags"
                :key="tag"
                :type="getTagType(tag)"
                size="small"
              >
                {{ getTagText(tag) }}
              </el-tag>
            </div>
            <span v-else class="field-value">暂无</span>
          </div>
          <div class="info-item flex-item">
            <span class="field-label">客户生日</span>
            <span class="field-value">{{ customerInfo.birthday || '暂无' }}</span>
          </div>
          <div class="info-item flex-item">
            <span class="field-label">进粉时间</span>
            <span class="field-value">{{ customerInfo.joinTime || '暂无' }}</span>
          </div>
          <div class="info-item flex-item">
            <span class="field-label">负责销售</span>
            <span class="field-value">{{ customerInfo.salesperson || '暂无' }}</span>
          </div>
          <div class="info-item flex-item-wide">
            <span class="field-label">改善问题</span>
            <span class="field-value improvement-goals">
              <span v-if="customerInfo.improvementGoals && customerInfo.improvementGoals.length > 0">
                {{ customerInfo.improvementGoals.join('、') }}
              </span>
              <span v-else class="no-goals">暂无</span>
            </span>
          </div>
        </div>

        <!-- 第五行：创建时间、客户来源、微信号、邮箱 -->
        <div class="customer-info-row create-time-row">
          <div class="info-item">
            <span class="field-label">创建时间</span>
            <span class="field-value">{{ customerInfo.createTime || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">客户来源</span>
            <span class="field-value">{{ getSourceText(customerInfo.source) || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">微信号</span>
            <span class="field-value">{{ customerInfo.wechatId ? displaySensitiveInfoNew(customerInfo.wechatId, SensitiveInfoType.WECHAT) : '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="field-label">邮箱</span>
            <span class="field-value">{{ customerInfo.email ? displaySensitiveInfoNew(customerInfo.email, SensitiveInfoType.EMAIL) : '暂无' }}</span>
          </div>
        </div>

        <!-- 第六行：详细地址 -->
        <div class="customer-info-row">
          <div class="info-item address-item">
            <span class="field-label">详细地址</span>
            <div class="address-content">{{ customerInfo.address ? displaySensitiveInfoNew(customerInfo.address, SensitiveInfoType.ADDRESS) : '暂无' }}</div>
          </div>
        </div>

        <!-- 第七行：客户疾病史 -->
        <div class="customer-info-row">
          <div class="info-item medical-item">
            <span class="field-label">疾病史</span>
            <div class="medical-history-section">
              <div class="latest-medical-info" v-if="medicalHistory.length > 0">
                <div class="medical-record">
                  <span class="medical-content">{{ medicalHistory[0].content }}</span>
                  <span class="medical-date">{{ formatDate(medicalHistory[0].createTime) }}</span>
                  <span class="medical-operator">{{ medicalHistory[0].operator }}</span>
                </div>
              </div>

              <div class="medical-history-toggle" v-if="medicalHistory.length > 1">
                <el-button
                  type="text"
                  size="small"
                  @click="showMedicalHistory = !showMedicalHistory"
                  class="toggle-btn"
                >
                  <el-icon><ArrowDown v-if="!showMedicalHistory" /><ArrowUp v-else /></el-icon>
                  {{ showMedicalHistory ? '收起' : '查看' }}历史记录 ({{ medicalHistory.length - 1 }}条)
                </el-button>
              </div>

              <el-collapse-transition>
                <div class="medical-history-list" v-show="showMedicalHistory">
                  <div
                    class="medical-record history-record"
                    v-for="(record, index) in medicalHistory.slice(1)"
                    :key="index"
                  >
                    <span class="medical-content">{{ record.content }}</span>
                    <span class="medical-date">{{ formatDate(record.createTime) }}</span>
                    <span class="medical-operator">{{ record.operator }}</span>
                  </div>
                </div>
              </el-collapse-transition>

              <div class="add-medical-section">
                <el-button
                  type="primary"
                  size="small"
                  @click="showAddMedical = !showAddMedical"
                  class="add-medical-btn"
                >
                  <el-icon><Plus /></el-icon>
                  新增疾病信息
                </el-button>

                <el-collapse-transition>
                  <div class="add-medical-form" v-show="showAddMedical">
                    <el-input
                      v-model="newMedicalRecord"
                      type="textarea"
                      :rows="3"
                      placeholder="请输入疾病信息..."
                      maxlength="500"
                      show-word-limit
                      class="medical-input"
                    />
                    <div class="form-actions">
                      <el-button size="small" @click="cancelAddMedical">取消</el-button>
                      <el-button
                        type="primary"
                        size="small"
                        @click="$emit('add-medical', newMedicalRecord)"
                        :loading="addingMedical"
                      >
                        保存
                      </el-button>
                    </div>
                  </div>
                </el-collapse-transition>
              </div>

              <div class="no-medical-info" v-if="medicalHistory.length === 0">
                <span class="empty-text">暂无疾病史记录</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 第八行：客户备注 -->
        <div class="customer-info-row">
          <div class="info-item notes-item">
            <span class="field-label">客户备注</span>
            <div class="notes-content" v-if="!editingNotes">
              <span class="notes-text">{{ customerInfo.notes || '暂无备注' }}</span>
              <el-button
                type="text"
                size="small"
                @click="startEditNotes"
                class="edit-notes-btn"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
            </div>
            <div class="notes-edit" v-else>
              <el-input
                v-model="editNotesText"
                type="textarea"
                :rows="3"
                placeholder="请输入客户备注..."
                maxlength="1000"
                show-word-limit
                class="notes-input"
              />
              <div class="notes-actions">
                <el-button size="small" @click="cancelEditNotes">取消</el-button>
                <el-button
                  type="primary"
                  size="small"
                  @click="$emit('save-notes', editNotesText)"
                  :loading="savingNotes"
                >
                  保存
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <el-form v-else :model="editForm" label-width="80px" class="edit-form">
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="客户编码">
              <el-input v-model="editForm.code" readonly>
                <template #suffix>
                  <el-tooltip content="客户编码自动生成，不可修改">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="姓名">
              <el-input v-model="editForm.name" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="主手机号">
              <el-input :value="displaySensitiveInfoNew(editForm.phone, SensitiveInfoType.PHONE)" readonly>
                <template #suffix>
                  <el-tooltip content="敏感信息已加密显示，不可修改">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="邮箱">
              <el-input :value="displaySensitiveInfoNew(editForm.email, SensitiveInfoType.EMAIL)" readonly>
                <template #suffix>
                  <el-tooltip content="敏感信息已加密显示，不可修改">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别">
              <el-select v-model="editForm.gender" placeholder="请选择" style="width: 100%">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户等级">
              <el-select v-model="editForm.level" placeholder="请选择" style="width: 100%">
                <el-option label="铜牌客户" value="bronze" />
                <el-option label="银牌客户" value="silver" />
                <el-option label="金牌客户" value="gold" />
                <el-option label="钻石客户" value="diamond" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 手机号管理 -->
        <el-row :gutter="24">
          <el-col :span="24">
            <el-form-item label="其他手机" class="other-phone-item">
              <div class="phone-management">
                <div class="phone-list">
                  <el-tag
                    v-for="(phone, index) in phoneNumbers"
                    :key="index"
                    closable
                    @close="$emit('remove-phone', index)"
                    class="phone-tag"
                  >
                    {{ displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE) }}
                  </el-tag>
                  <el-button
                    v-if="!showAddPhone"
                    type="primary"
                    plain
                    size="small"
                    @click="showAddPhone = true"
                    :icon="Plus"
                  >
                    添加手机号
                  </el-button>
                </div>
                <div v-if="showAddPhone" class="add-phone">
                  <el-input
                    v-model="localNewPhone"
                    placeholder="请输入11位手机号"
                    style="width: 200px; margin-right: 10px;"
                    maxlength="11"
                  />
                  <el-button
                    type="primary"
                    size="small"
                    @click="handleAddPhone"
                    :disabled="!isLocalValidPhone"
                  >
                    确认
                  </el-button>
                  <el-button size="small" @click="showAddPhone = false; localNewPhone = ''">取消</el-button>
                </div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 年龄、身高、体重放同一行 -->
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="年龄">
              <el-input-number v-model="editForm.age" :min="1" :max="120" placeholder="年龄" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="身高(cm)">
              <el-input-number v-model="editForm.height" :min="50" :max="250" placeholder="身高" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="体重(kg)">
              <el-input-number v-model="editForm.weight" :min="20" :max="300" placeholder="体重" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="进粉时间">
              <el-date-picker
                v-model="editForm.joinTime"
                type="date"
                placeholder="选择进粉时间"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disableFutureDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户来源">
              <el-select v-model="editForm.source" placeholder="请选择" style="width: 100%">
                <el-option label="线上推广" value="online" />
                <el-option label="朋友介绍" value="referral" />
                <el-option label="电话营销" value="telemarketing" />
                <el-option label="门店到访" value="store" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="销售人员">
              <el-input v-model="editForm.salesperson" placeholder="销售人员" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="微信号">
              <el-input :value="displaySensitiveInfoNew(editForm.wechatId, SensitiveInfoType.WECHAT)" readonly>
                <template #suffix>
                  <el-tooltip content="敏感信息已加密显示，不可修改">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生日">
              <el-date-picker v-model="editForm.birthday" type="date" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 改善问题 -->
        <el-row :gutter="24">
          <el-col :span="24">
            <el-form-item label="改善问题">
              <el-checkbox-group v-model="editForm.improvementGoals">
                <el-checkbox label="减肥瘦身">减肥瘦身</el-checkbox>
                <el-checkbox label="增肌塑形">增肌塑形</el-checkbox>
                <el-checkbox label="改善睡眠">改善睡眠</el-checkbox>
                <el-checkbox label="调理肠胃">调理肠胃</el-checkbox>
                <el-checkbox label="美容养颜">美容养颜</el-checkbox>
                <el-checkbox label="增强免疫">增强免疫</el-checkbox>
                <el-checkbox label="其他">其他</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="24">
            <el-form-item label="详细地址">
              <el-input v-model="editForm.address" placeholder="请输入详细地址" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { User, Edit, Phone, Plus, InfoFilled, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { getLevelType, getLevelText, getGenderText, getSourceText, getTagType, getTagText, formatDate, disableFutureDate } from './helpers'

const props = defineProps<{
  customerInfo: any
  isEditing: boolean
  editForm: any
  phoneNumbers: string[]
  medicalHistory: any[]
  addingMedical: boolean
  savingNotes: boolean
}>()

const emit = defineEmits<{
  'toggle-edit': []
  'save': []
  'cancel-edit': []
  'copy-code': []
  'make-call': [phone: string]
  'add-medical': [content: string]
  'save-notes': [notes: string]
  'remove-phone': [index: number]
  'add-phone': [phone: string]
}>()

// 本地状态
const showMedicalHistory = ref(false)
const showAddMedical = ref(false)
const newMedicalRecord = ref('')
const editingNotes = ref(false)
const editNotesText = ref('')
const showAddPhone = ref(false)
const localNewPhone = ref('')

const isLocalValidPhone = computed(() => {
  const phone = localNewPhone.value.trim()
  return /^1[3-9]\d{9}$/.test(phone)
})

const cancelAddMedical = () => {
  showAddMedical.value = false
  newMedicalRecord.value = ''
}

const startEditNotes = () => {
  editingNotes.value = true
  editNotesText.value = props.customerInfo.notes || ''
}

const cancelEditNotes = () => {
  editingNotes.value = false
  editNotesText.value = ''
}

const handleAddPhone = () => {
  emit('add-phone', localNewPhone.value.trim())
  localNewPhone.value = ''
  showAddPhone.value = false
}
</script>

<style scoped>
.first-row { margin-bottom: 20px; }
.customer-info-card { border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); border: none; transition: all 0.3s ease; }
.customer-info-card:hover { transform: translateY(-4px); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15); }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-bottom: 1px solid #dee2e6; }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: #495057; }
.card-title .el-icon { font-size: 20px; color: #667eea; }
.edit-actions { display: flex; gap: 8px; }
.info-display { padding: 24px; }

/* 行布局 */
.customer-info-row { display: flex; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 24px; }
.customer-info-row:last-child { margin-bottom: 0; }
.info-item { flex: 1; min-width: 200px; display: flex; align-items: center; margin-right: 24px; margin-bottom: 8px; padding: 12px 16px; background: rgba(255, 255, 255, 0.8); border-radius: 10px; border: 1px solid #f1f5f9; transition: all 0.3s ease; }
.info-item:hover { background: rgba(255, 255, 255, 0.95); border-color: #e2e8f0; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.info-item:last-child { margin-right: 0; }
.field-label { font-weight: 600; color: #374151; margin-right: 8px; font-size: 14px; min-width: fit-content; }
.field-value { color: #6b7280; font-size: 14px; font-weight: 400; }
.level-tag { border-radius: 6px; font-weight: 500; }

/* 特殊布局 */
.code-section { flex: 0 0 auto; margin-right: 40px; }
.name-section { flex: 0 0 auto; margin-right: 40px; }
.phone-section { flex: 1; }
.level-item { flex: 0.8 !important; min-width: 120px !important; }
.email-item { flex: 1.5 !important; min-width: 250px !important; }

/* 客户编码/姓名 */
.customer-code-display { display: inline-flex; align-items: center; color: #374151; font-weight: 600; font-size: 15px; background: #f8fafc; padding: 8px 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-left: 8px; transition: all 0.2s ease; height: 32px; box-sizing: border-box; cursor: pointer; user-select: none; font-family: 'Courier New', monospace; letter-spacing: 0.5px; }
.customer-code-display:hover { background: #e2e8f0; border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
.customer-code-display:active { transform: translateY(0); background: #cbd5e1; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
.customer-name-display { display: inline-flex; align-items: center; color: #374151; font-weight: 600; font-size: 15px; background: #f8fafc; padding: 8px 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-left: 8px; transition: all 0.2s ease; height: 32px; box-sizing: border-box; }

/* 手机号 */
.phone-container-horizontal { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.phone-display { display: inline-flex; align-items: center; gap: 6px; color: #374151; font-weight: 500; font-size: 14px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; transition: all 0.2s ease; cursor: pointer; height: 32px; box-sizing: border-box; }
.phone-display:hover { background: #f1f5f9; border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
.call-icon { color: #10b981; cursor: pointer; transition: color 0.2s ease; }
.call-icon:hover { color: #059669; }

/* 标签行 */
.tags-row-flex { display: flex; align-items: flex-start; gap: 16px; }
.tags-row-flex .flex-item { flex: 1; min-width: 0; }
.tags-row-flex .flex-item-wide { flex: 1.5; min-width: 0; }
.customer-tags-inline { display: flex; flex-wrap: wrap; gap: 4px; }
.customer-tags-inline .el-tag { margin: 0; }

/* 创建时间行 */
.create-time-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 32px; align-items: center; }
.create-time-row .info-item { display: flex; align-items: center; justify-content: flex-start; }

/* 全宽项目 */
.address-item, .tags-item, .goals-item, .medical-item, .remark-item, .notes-item { width: 100%; margin-right: 0; flex-direction: column; align-items: flex-start; padding: 16px; background: rgba(248, 250, 252, 0.9); border: 1px solid #e2e8f0; border-radius: 12px; }
.address-item .field-label, .tags-item .field-label, .goals-item .field-label, .medical-item .field-label, .remark-item .field-label { margin-bottom: 8px; color: #374151; font-size: 15px; font-weight: 600; }

/* 地址 */
.address-content { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 12px; color: #0c4a6e; font-size: 14px; line-height: 1.5; margin-top: 4px; }

/* 疾病史 */
.medical-history-section { width: 100%; }
.latest-medical-info { margin-bottom: 12px; }
.medical-record { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px; }
.medical-record.history-record { background: #f1f5f9; border-color: #cbd5e1; }
.medical-content { flex: 1; color: #374151; font-size: 14px; line-height: 1.5; }
.medical-date { color: #6b7280; font-size: 12px; white-space: nowrap; }
.medical-operator { color: #6b7280; font-size: 12px; white-space: nowrap; margin-left: 8px; }
.medical-history-toggle { margin-bottom: 12px; }
.toggle-btn { padding: 4px 8px !important; font-size: 12px !important; color: #6366f1 !important; }
.medical-history-list { margin-bottom: 16px; }
.add-medical-section { margin-top: 16px; }
.add-medical-btn { margin-bottom: 12px; }
.add-medical-form { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
.medical-input { margin-bottom: 12px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.no-medical-info { padding: 20px; text-align: center; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; }
.empty-text { color: #9ca3af; font-size: 14px; }

/* 备注 */
.notes-content { display: flex; align-items: flex-start; gap: 12px; width: 100%; }
.notes-text { flex: 1; color: #6b7280; font-size: 14px; line-height: 1.6; min-height: 20px; word-break: break-word; }
.edit-notes-btn { flex-shrink: 0; padding: 4px 8px; color: #6366f1; }
.edit-notes-btn:hover { background: #f0f0ff; }
.notes-edit { width: 100%; }
.notes-input { margin-bottom: 12px; }
.notes-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* 改善问题 */
.improvement-goals { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-goals { color: #9ca3af; font-style: italic; }

/* 编辑表单 */
.edit-form { margin-top: 10px; padding: 24px; }
.edit-form .el-form-item { margin-bottom: 20px; }
.other-phone-item :deep(.el-form-item__label) { white-space: nowrap; }
.phone-management .phone-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.phone-management .phone-tag { margin-right: 8px; }
.phone-management .add-phone { display: flex; align-items: center; gap: 10px; }

/* 响应式 */
@media (max-width: 1200px) {
  .info-item { min-width: 180px; margin-right: 16px; }
  .customer-info-row { gap: 16px; }
}
@media (max-width: 768px) {
  .info-item { width: 100%; margin-right: 0; margin-bottom: 12px; }
  .customer-info-row { flex-direction: column; }
  .create-time-row { grid-template-columns: 1fr; }
}
</style>

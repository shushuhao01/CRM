<template>
  <div class="customer-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" class="back-btn" />
        <div class="customer-title">
          <h2>{{ customerInfo.name }}</h2>
          <el-tag :type="getLevelType(customerInfo.level)" size="large">
            {{ getLevelText(customerInfo.level) }}
          </el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Phone" @click="handleCall" class="action-btn">
          拨打电话
        </el-button>
        <el-button type="info" :icon="Message" @click="handleSendSMS" class="action-btn">
          发送短信
        </el-button>
        <el-button type="success" :icon="ShoppingBag" @click="createOrder" class="action-btn">
          新建订单
        </el-button>
        <el-button type="warning" :icon="ChatDotRound" @click="handleAddFollowUp" class="action-btn">
          添加跟进
        </el-button>
        <el-button :icon="EditPen" @click="handleEdit" class="action-btn edit-btn">
          编辑客户
        </el-button>
      </div>
    </div>

    <!-- 第一排：客户基本信息 -->
    <div class="first-row">
      <el-card class="customer-info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><User /></el-icon>
              客户信息
            </span>
            <el-button v-if="!isEditing" type="text" @click="toggleEdit" :icon="Edit">编辑</el-button>
            <div v-else class="edit-actions">
              <el-button type="primary" size="small" @click="saveCustomerInfo">保存</el-button>
              <el-button size="small" @click="cancelEdit">取消</el-button>
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
              <span class="customer-code-display" @click="copyCustomerCode" :title="'点击复制编码：' + (customerInfo.code || '暂无')">
                {{ customerInfo.code || '暂无' }}
              </span>
            </div>
            <div class="info-item phone-section">
              <span class="field-label">联系电话</span>
              <div class="phone-container-horizontal">
                <template v-if="customerInfo.phone || (customerInfo.otherPhones && customerInfo.otherPhones.length > 0)">
                  <span v-if="customerInfo.phone" class="phone-display" @click="makePhoneCall(customerInfo.phone)">
                    {{ displaySensitiveInfoNew(customerInfo.phone, SensitiveInfoType.PHONE) }}
                    <el-icon class="call-icon">
                      <Phone />
                    </el-icon>
                  </span>
                  <span
                    v-for="phone in customerInfo.otherPhones"
                    :key="phone"
                    class="phone-display"
                    @click="makePhoneCall(phone)"
                  >
                    {{ displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE) }}
                    <el-icon class="call-icon">
                      <Phone />
                    </el-icon>
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
              <span class="field-value">{{ customerInfo.age ? customerInfo.age + '岁' : '暂无' }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">身高</span>
              <span class="field-value">{{ customerInfo.height ? (Number.isInteger(Number(customerInfo.height)) ? Math.round(customerInfo.height) : customerInfo.height) + 'cm' : '暂无' }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">体重</span>
              <span class="field-value">{{ customerInfo.weight ? (Number.isInteger(Number(customerInfo.weight)) ? Math.round(customerInfo.weight) : customerInfo.weight) + 'kg' : '暂无' }}</span>
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
              <div v-if="Array.isArray(customerInfo.tags) && customerInfo.tags.length > 0" class="customer-tags-inline">
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

          <!-- 企微UserID行 -->
          <div class="customer-info-row" v-if="customerInfo.wecomExternalUserid">
            <div class="info-item">
              <span class="field-label">企微UserID</span>
              <span class="field-value">{{ customerInfo.wecomExternalUserid }}</span>
            </div>
          </div>

          <!-- 自定义字段区域 -->
          <div class="customer-info-row" v-if="displayCustomFields.length > 0 && customerInfo.customFields">
            <div class="info-item" v-for="field in displayCustomFields" :key="field.fieldKey">
              <span class="field-label">{{ field.fieldName }}</span>
              <span class="field-value">{{ formatCustomFieldValue(field, customerInfo.customFields) }}</span>
            </div>
          </div>

          <!-- 第六行：详细地址 -->
          <div class="customer-info-row full-width-row">
            <div class="info-item address-item full-width-item">
              <span class="field-label">详细地址</span>
              <div class="address-management-section">
                <!-- 新增地址按钮在最上方 -->
                <div class="add-address-section">
                  <el-button type="primary" size="small" @click="showAddAddress = !showAddAddress" class="add-address-btn">
                    <el-icon><Plus /></el-icon>
                    新增地址
                  </el-button>
                  <el-collapse-transition>
                    <div class="add-address-form" v-show="showAddAddress">
                      <el-input v-model="newAddressText" type="textarea" :rows="2" placeholder="请输入详细地址..." maxlength="200" show-word-limit />
                      <div class="form-actions">
                        <el-button size="small" @click="cancelAddAddress">取消</el-button>
                        <el-button type="primary" size="small" @click="addAddress" :loading="addingAddress">保存</el-button>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>

                <!-- 最新地址显示 -->
                <div class="latest-address-info" v-if="customerAddresses.length > 0">
                  <div class="address-record" v-if="editingAddressId !== customerAddresses[0].id">
                    <div class="address-inline-row">
                      <span class="address-text">{{ customerAddresses[0].content }}</span>
                      <div class="address-actions">
                        <el-button type="text" size="small" @click="startEditAddress(customerAddresses[0])">
                          <el-icon><Edit /></el-icon>
                        </el-button>
                        <el-button type="text" size="small" class="delete-btn" @click="deleteAddress(customerAddresses[0].id)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                    <div class="address-meta">
                      <span class="address-date">{{ formatDate(customerAddresses[0].createTime) }}</span>
                      <span class="address-operator">{{ customerAddresses[0].operator || '系统' }}</span>
                    </div>
                  </div>
                  <div class="address-edit-inline" v-else>
                    <el-input v-model="editAddressText" type="textarea" :rows="2" placeholder="请输入地址" />
                    <div class="form-actions">
                      <el-button size="small" @click="cancelEditAddress">取消</el-button>
                      <el-button type="primary" size="small" @click="saveEditAddress" :loading="savingAddress">保存</el-button>
                    </div>
                  </div>
                </div>

                <!-- 历史地址折叠 -->
                <div class="address-history-toggle" v-if="customerAddresses.length > 1">
                  <el-button type="text" size="small" @click="showAddressHistory = !showAddressHistory" class="toggle-btn">
                    <el-icon><ArrowDown v-if="!showAddressHistory" /><ArrowUp v-else /></el-icon>
                    {{ showAddressHistory ? '收起' : '查看' }}更多地址 ({{ customerAddresses.length - 1 }}个)
                  </el-button>
                </div>
                <el-collapse-transition>
                  <div class="address-history-list" v-show="showAddressHistory">
                    <div class="address-record history-record" v-for="addr in customerAddresses.slice(1)" :key="addr.id">
                      <template v-if="editingAddressId !== addr.id">
                        <div class="address-inline-row">
                          <span class="address-text">{{ addr.content }}</span>
                          <div class="address-actions">
                            <el-button type="text" size="small" @click="startEditAddress(addr)">
                              <el-icon><Edit /></el-icon>
                            </el-button>
                            <el-button type="text" size="small" class="delete-btn" @click="deleteAddress(addr.id)">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>
                        <div class="address-meta">
                          <span class="address-date">{{ formatDate(addr.createTime) }}</span>
                          <span class="address-operator">{{ addr.operator || '系统' }}</span>
                        </div>
                      </template>
                      <div class="address-edit-inline" v-else>
                        <el-input v-model="editAddressText" type="textarea" :rows="2" placeholder="请输入地址" />
                        <div class="form-actions">
                          <el-button size="small" @click="cancelEditAddress">取消</el-button>
                          <el-button type="primary" size="small" @click="saveEditAddress" :loading="savingAddress">保存</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-collapse-transition>

                <!-- 无地址提示 -->
                <div class="no-address-info" v-if="customerAddresses.length === 0 && !showAddAddress">
                  <span class="empty-text">暂无</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 第七行：客户疾病史 -->
          <div class="customer-info-row full-width-row">
            <div class="info-item medical-item full-width-item">
              <span class="field-label">疾病史</span>
              <div class="medical-history-section">
                <!-- 新增疾病信息按钮在最上方 -->
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
                          @click="addMedicalRecord"
                          :loading="addingMedical"
                        >
                          保存
                        </el-button>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>

                <!-- 最新疾病信息 -->
                <div class="latest-medical-info" v-if="medicalHistory.length > 0">
                  <div class="medical-record">
                    <span class="medical-content">{{ medicalHistory[0].content }}</span>
                    <div class="address-meta">
                      <span class="address-date">{{ formatDate(medicalHistory[0].createTime) }}</span>
                      <span class="address-operator">{{ medicalHistory[0].operator || '系统' }}</span>
                    </div>
                  </div>
                </div>

                <!-- 历史记录折叠 -->
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

                <!-- 历史记录列表 -->
                <el-collapse-transition>
                  <div class="medical-history-list" v-show="showMedicalHistory">
                    <div
                      class="medical-record history-record"
                      v-for="(record, index) in medicalHistory.slice(1)"
                      :key="index"
                    >
                      <span class="medical-content">{{ record.content }}</span>
                      <div class="address-meta">
                        <span class="address-date">{{ formatDate(record.createTime) }}</span>
                        <span class="address-operator">{{ record.operator || '系统' }}</span>
                      </div>
                    </div>
                  </div>
                </el-collapse-transition>

                <!-- 无疾病史提示 -->
                <div class="no-medical-info" v-if="medicalHistory.length === 0">
                  <span class="empty-text">暂无疾病史记录</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 第八行：客户备注 -->
          <div class="customer-info-row full-width-row">
            <div class="info-item notes-item full-width-item">
              <span class="field-label">客户备注</span>
              <div class="notes-management-section">
                <!-- 新增备注按钮在最上方 -->
                <div class="add-notes-section">
                  <el-button type="primary" size="small" @click="showAddNote = !showAddNote" class="add-notes-btn">
                    <el-icon><Plus /></el-icon>
                    新增备注
                  </el-button>
                  <el-collapse-transition>
                    <div class="add-notes-form" v-show="showAddNote">
                      <el-input v-model="newNoteText" type="textarea" :rows="3" placeholder="请输入客户备注..." maxlength="1000" show-word-limit />
                      <div class="form-actions">
                        <el-button size="small" @click="cancelAddNote">取消</el-button>
                        <el-button type="primary" size="small" @click="addNote" :loading="addingNote">保存</el-button>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>

                <!-- 最新备注显示 -->
                <div class="latest-note-info" v-if="customerNotes.length > 0">
                  <div class="note-record" v-if="editingNoteId !== customerNotes[0].id">
                    <div class="note-inline-row">
                      <span class="note-content-text">{{ customerNotes[0].content }}</span>
                      <div class="note-actions">
                        <el-button type="text" size="small" @click="startEditNote(customerNotes[0])">
                          <el-icon><Edit /></el-icon>
                        </el-button>
                        <el-button type="text" size="small" class="delete-btn" @click="deleteNote(customerNotes[0].id)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                    </div>
                    <div class="note-meta">
                      <span class="note-date">{{ formatDate(customerNotes[0].createTime) }}</span>
                      <span class="note-operator">{{ customerNotes[0].operator }}</span>
                    </div>
                  </div>
                  <div class="note-edit-inline" v-else>
                    <el-input v-model="editNoteText" type="textarea" :rows="3" placeholder="请输入备注" maxlength="1000" show-word-limit />
                    <div class="form-actions">
                      <el-button size="small" @click="cancelEditNote">取消</el-button>
                      <el-button type="primary" size="small" @click="saveEditNote" :loading="savingNote">保存</el-button>
                    </div>
                  </div>
                </div>

                <!-- 历史备注折叠 -->
                <div class="notes-history-toggle" v-if="customerNotes.length > 1">
                  <el-button type="text" size="small" @click="showNotesHistory = !showNotesHistory" class="toggle-btn">
                    <el-icon><ArrowDown v-if="!showNotesHistory" /><ArrowUp v-else /></el-icon>
                    {{ showNotesHistory ? '收起' : '查看' }}历史备注 ({{ customerNotes.length - 1 }}条)
                  </el-button>
                </div>
                <el-collapse-transition>
                  <div class="notes-history-list" v-show="showNotesHistory">
                    <div class="note-record history-record" v-for="note in customerNotes.slice(1)" :key="note.id">
                      <template v-if="editingNoteId !== note.id">
                        <div class="note-inline-row">
                          <span class="note-content-text">{{ note.content }}</span>
                          <div class="note-actions">
                            <el-button type="text" size="small" @click="startEditNote(note)">
                              <el-icon><Edit /></el-icon>
                            </el-button>
                            <el-button type="text" size="small" class="delete-btn" @click="deleteNote(note.id)">
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </div>
                        </div>
                        <div class="note-meta">
                          <span class="note-date">{{ formatDate(note.createTime) }}</span>
                          <span class="note-operator">{{ note.operator }}</span>
                        </div>
                      </template>
                      <div class="note-edit-inline" v-else>
                        <el-input v-model="editNoteText" type="textarea" :rows="3" placeholder="请输入备注" maxlength="1000" show-word-limit />
                        <div class="form-actions">
                          <el-button size="small" @click="cancelEditNote">取消</el-button>
                          <el-button type="primary" size="small" @click="saveEditNote" :loading="savingNote">保存</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-collapse-transition>

                <!-- 无备注提示 -->
                <div class="no-notes-info" v-if="customerNotes.length === 0 && !showAddNote">
                  <span class="empty-text">暂无备注</span>
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
                <div class="sensitive-edit-field">
                  <el-input
                    v-if="emailEditing || !editForm.email"
                    v-model="editForm.email"
                    placeholder="请输入邮箱"
                    clearable
                    @clear="editForm.email = ''"
                  />
                  <el-input
                    v-else
                    :value="displaySensitiveInfoNew(editForm.email, SensitiveInfoType.EMAIL)"
                    readonly
                    @click="emailEditing = true"
                  >
                    <template #suffix>
                      <el-tooltip content="点击修改邮箱">
                        <el-icon style="cursor:pointer" @click="emailEditing = true"><EditPen /></el-icon>
                      </el-tooltip>
                    </template>
                  </el-input>
                </div>
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
                      @close="removePhone(index)"
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
                      v-model="newPhoneNumber"
                      placeholder="请输入11位手机号"
                      style="width: 200px; margin-right: 10px;"
                      maxlength="11"
                    />
                    <el-button
                      type="primary"
                      size="small"
                      @click="addPhone"
                      :disabled="!isValidPhoneNumber"
                    >
                      确认
                    </el-button>
                    <el-button size="small" @click="cancelAddPhone">取消</el-button>
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
                <div class="sensitive-edit-field">
                  <el-input
                    v-if="wechatEditing || !editForm.wechatId"
                    v-model="editForm.wechatId"
                    placeholder="请输入微信号"
                    clearable
                    @clear="editForm.wechatId = ''"
                    @input="editForm.wechatId = editForm.wechatId.replace(/[\u4e00-\u9fa5\s]/g, '')"
                  />
                  <el-input
                    v-else
                    :value="displaySensitiveInfoNew(editForm.wechatId, SensitiveInfoType.WECHAT)"
                    readonly
                    @click="wechatEditing = true"
                  >
                    <template #suffix>
                      <el-tooltip content="点击修改微信号">
                        <el-icon style="cursor:pointer" @click="wechatEditing = true"><EditPen /></el-icon>
                      </el-tooltip>
                    </template>
                  </el-input>
                </div>
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

          <!-- 自定义字段 -->
          <el-row :gutter="24" v-if="displayCustomFields.length > 0">
            <el-col :span="8" v-for="field in displayCustomFields" :key="field.fieldKey">
              <el-form-item :label="field.fieldName">
                <!-- 文本输入 -->
                <el-input
                  v-if="field.fieldType === 'text' || field.fieldType === 'input'"
                  v-model="editForm.customFields[field.fieldKey]"
                  :placeholder="'请输入' + field.fieldName"
                  style="width: 100%"
                />
                <!-- 数字输入 -->
                <el-input-number
                  v-else-if="field.fieldType === 'number'"
                  v-model="editForm.customFields[field.fieldKey]"
                  :placeholder="field.fieldName"
                  style="width: 100%"
                />
                <!-- 单选下拉 -->
                <el-select
                  v-else-if="field.fieldType === 'select'"
                  v-model="editForm.customFields[field.fieldKey]"
                  :placeholder="'请选择' + field.fieldName"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="opt in (field.options || [])"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <!-- 单选按钮组 -->
                <el-radio-group
                  v-else-if="field.fieldType === 'radio'"
                  v-model="editForm.customFields[field.fieldKey]"
                >
                  <el-radio
                    v-for="opt in (field.options || [])"
                    :key="opt.value"
                    :label="opt.value"
                  >{{ opt.label }}</el-radio>
                </el-radio-group>
                <!-- 多选复选框 -->
                <el-checkbox-group
                  v-else-if="field.fieldType === 'checkbox'"
                  v-model="editForm.customFields[field.fieldKey]"
                >
                  <el-checkbox
                    v-for="opt in (field.options || [])"
                    :key="opt.value"
                    :label="opt.value"
                  >{{ opt.label }}</el-checkbox>
                </el-checkbox-group>
                <!-- 日期选择 -->
                <el-date-picker
                  v-else-if="field.fieldType === 'date'"
                  v-model="editForm.customFields[field.fieldKey]"
                  type="date"
                  :placeholder="'选择' + field.fieldName"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                />
                <!-- 多行文本 -->
                <el-input
                  v-else-if="field.fieldType === 'textarea'"
                  v-model="editForm.customFields[field.fieldKey]"
                  type="textarea"
                  :rows="2"
                  :placeholder="'请输入' + field.fieldName"
                />
                <!-- 默认文本输入 -->
                <el-input
                  v-else
                  v-model="editForm.customFields[field.fieldKey]"
                  :placeholder="'请输入' + field.fieldName"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
    </div>

    <!-- Phase 7: 企微信息卡片 -->
    <WecomInfoCard v-if="customerInfo.id" :customer-id="customerInfo.id" />

    <!-- 第二排：客户统计 -->
    <div class="second-row">
      <el-card class="stats-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="card-title">
              <el-icon><DataAnalysis /></el-icon>
              客户统计
            </span>
          </div>
        </template>
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <div class="stat-item consumption">
              <div class="stat-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">¥{{ customerStats.totalConsumption.toLocaleString() }}</div>
                <div class="stat-label">累计消费</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item orders">
              <div class="stat-icon">
                <el-icon><ShoppingBag /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ customerStats.orderCount }}</div>
                <div class="stat-label">订单数量</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item returns">
              <div class="stat-icon">
                <el-icon><RefreshLeft /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ customerStats.returnCount }}</div>
                <div class="stat-label">退货次数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item last-order">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ customerStats.lastOrderDate || '暂无' }}</div>
                <div class="stat-label">最后下单</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- Tab切换区域 -->
    <el-card class="tab-card">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <!-- 订单历史 -->
        <el-tab-pane label="订单历史" name="orders">
          <div class="tab-content">
            <div class="tab-header">
              <el-button @click="createOrder" icon="Plus" type="primary" size="small">新建订单</el-button>
              <el-input v-model="orderSearch" placeholder="搜索订单号、商品名称" style="width: 300px;" clearable>
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-table :data="filteredOrders" style="width: 100%" v-loading="loadingOrders">
              <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
              <el-table-column prop="products" label="商品名称" min-width="220" show-overflow-tooltip />
              <el-table-column prop="totalAmount" label="订单金额" width="130">
                <template #default="{ row }">
                  <span class="amount">¥{{ row.totalAmount.toLocaleString() }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="订单状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusTagType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="orderDate" label="下单时间" width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ formatDateTime(row.orderDate) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button @click="viewOrder(row.id)" size="small" type="primary" link>查看</el-button>
                  <el-button @click="editOrder(row.id)" size="small" type="warning" link v-if="row.status === '待付款'">编辑</el-button>
                  <el-button @click="cancelOrder(row.id)" size="small" type="danger" link v-if="row.status === '待付款'">取消</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 售后记录 -->
        <el-tab-pane label="售后记录" name="service">
          <div class="tab-content">
            <div class="tab-header">
              <el-button @click="createAfterSales" icon="Plus" type="primary" size="small">新建售后</el-button>
            </div>
            <el-table :data="serviceRecords" style="width: 100%" v-loading="loadingService">
              <el-table-column prop="serviceNo" label="售后单号" width="200" show-overflow-tooltip />
              <el-table-column prop="orderNo" label="关联订单" width="200" show-overflow-tooltip />
              <el-table-column prop="type" label="售后类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getServiceType(row.type)" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="reason" label="售后原因" min-width="200" show-overflow-tooltip />
              <el-table-column prop="amount" label="退款金额" width="130">
                <template #default="{ row }">
                  <span class="amount" v-if="row.amount">¥{{ row.amount.toLocaleString() }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="处理状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getServiceStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="申请时间" width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ formatDateTime(row.createTime) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" fixed="right">
                <template #default="{ row }">
                  <el-button @click="viewService(row.id)" size="small" type="primary" link>查看</el-button>
                  <el-button @click="handleService(row.id)" size="small" type="warning" link v-if="row.status === '待处理'">处理</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 通话记录 -->
        <el-tab-pane label="通话记录" name="calls">
          <div class="tab-content">
            <div class="tab-header">
              <el-button @click="makeCall" icon="Phone" type="success" size="small"
                v-if="permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'MAKE_CALL').hasAccess">发起通话</el-button>
            </div>
            <el-table :data="callRecords" style="width: 100%" v-loading="loadingCalls">
              <el-table-column prop="callType" label="通话类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.callType === '呼出' ? 'success' : 'info'" size="small">{{ row.callType }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="电话号码" width="150">
                <template #default="{ row }">
                  {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="通话时长" width="120" />
              <el-table-column prop="status" label="通话状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getCallStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="summary" label="通话摘要" min-width="200" show-overflow-tooltip />
              <el-table-column prop="callTime" label="通话时间" width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ formatDateTime(row.callTime) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button @click="viewCallDetail(row.id)" size="small" type="primary" link
                    v-if="permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'VIEW_RECORDS').hasAccess">详情</el-button>
                  <el-button @click="playRecording(row.id)" size="small" type="success" link
                    v-if="row.status === '已接通' && permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'PLAY_RECORDING').hasAccess">播放</el-button>
                  <el-button @click="addFollowUpFromCall(row)" size="small" type="warning" link>跟进</el-button>
                  <el-dropdown trigger="click">
                    <el-button size="small" type="info" link>
                      更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="downloadRecording(row.id)"
                          v-if="row.status === '已接通' && permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'DOWNLOAD_RECORDING').hasAccess">
                          <el-icon><Download /></el-icon>下载录音
                        </el-dropdown-item>
                        <el-dropdown-item @click="shareCall(row.id)">
                          <el-icon><Share /></el-icon>分享通话
                        </el-dropdown-item>
                        <el-dropdown-item @click="callBack(row.phone)"
                          v-if="permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'MAKE_CALL').hasAccess">
                          <el-icon><Phone /></el-icon>回拨
                        </el-dropdown-item>
                        <el-dropdown-item @click="editCallRecord(row.id)"
                          v-if="permissionService.checkCallPermission(userStore.userInfo?.id || 'guest', 'EDIT_RECORDS').hasAccess">
                          <el-icon><Edit /></el-icon>编辑记录
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 跟进记录 -->
        <el-tab-pane label="跟进记录" name="followup">
          <div class="tab-content">
            <div class="tab-header">
              <el-button @click="addFollowUp" icon="Plus" type="primary" size="small">添加跟进</el-button>
            </div>
            <div class="timeline-container">
              <el-timeline>
                <el-timeline-item
                  v-for="item in followUpRecords"
                  :key="item.id"
                  :timestamp="formatDateTime(item.createTime)"
                  :type="getFollowUpType(item.type)"
                >
                  <el-card class="timeline-card">
                    <div class="timeline-header">
                      <span class="timeline-title">{{ item.title }}</span>
                      <el-tag :type="getFollowUpType(item.type)" size="small">{{ item.type }}</el-tag>
                    </div>
                    <div class="timeline-content">{{ item.content }}</div>
                    <div class="timeline-footer">
                      <span class="timeline-author">{{ item.author }}</span>
                      <div class="timeline-actions" v-if="canEditFollowUp(item.createTime)">
                        <el-button
                          @click="editFollowUp(item.id)"
                          size="small"
                          type="primary"
                          link
                        >
                          编辑
                        </el-button>
                        <el-button
                          v-if="userStore.isAdmin"
                          @click="deleteFollowUp(item.id)"
                          size="small"
                          type="danger"
                          link
                        >
                          删除
                        </el-button>
                      </div>
                      <el-tooltip
                        v-else
                        content="超过24小时的跟进记录不可编辑"
                        placement="top"
                      >
                        <el-button size="small" type="info" link disabled>
                          已锁定
                        </el-button>
                      </el-tooltip>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </el-tab-pane>

        <!-- 客户标签 -->
        <el-tab-pane label="客户标签" name="tags">
          <div class="tab-content">
            <div class="tab-header">
              <el-button @click="addTag" icon="Plus" type="primary" size="small">添加标签</el-button>
            </div>
            <div class="tags-container">
              <el-tag
                v-for="tag in customerTags"
                :key="tag.id"
                :type="tag.type"
                closable
                @close="removeTag(tag.id)"
                class="tag-item"
              >
                {{ tag.name }}
              </el-tag>
              <el-tag v-if="customerTags.length === 0" type="info">暂无标签</el-tag>
            </div>
          </div>
        </el-tab-pane>

        <!-- 客户画像 -->
        <el-tab-pane label="客户画像" name="portrait">
          <div class="tab-content">
            <CustomerPortrait :customer="customerInfo" :stats="customerStats" />
          </div>
        </el-tab-pane>

        <!-- 客户日志 -->
        <el-tab-pane label="客户日志" name="logs">
          <div class="tab-content">
            <div class="customer-logs-container" v-loading="loadingLogs">
              <el-timeline v-if="customerLogs.length > 0">
                <el-timeline-item
                  v-for="item in customerLogs"
                  :key="item.id"
                  :type="getLogTimelineType(item.logType)"
                  placement="top"
                >
                  <div class="log-meta-line">
                    <span class="log-operator-name">{{ item.operatorName || '系统' }}</span>
                    <span class="log-meta-separator">·</span>
                    <span class="log-time">{{ formatDateTime(item.createdAt) }}</span>
                  </div>
                  <div class="log-item">
                    <div class="log-header">
                      <el-tag :type="getLogTagType(item.logType)" size="small">{{ getLogTypeText(item.logType) }}</el-tag>
                    </div>
                    <div class="log-content">{{ item.content }}</div>
                    <!-- 详细字段变更 -->
                    <div class="log-changes" v-if="item.detail && item.detail.changes && item.detail.changes.length > 0">
                      <div class="change-item" v-for="(change, ci) in item.detail.changes" :key="ci">
                        <span class="change-field">{{ change.fieldLabel || change.field }}</span>：
                        <span class="change-old">{{ change.oldValue || '空' }}</span>
                        <span class="change-arrow"> → </span>
                        <span class="change-new">{{ change.newValue || '空' }}</span>
                      </div>
                    </div>
                    <!-- 创建来源 -->
                    <div class="log-source" v-if="item.logType === 'create' && item.detail && item.detail.source">
                      <el-tag size="small" type="info">
                        {{ item.detail.source === 'batch_import' ? '批量导入' : 'CRM系统新增' }}
                      </el-tag>
                    </div>
                  </div>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else-if="!loadingLogs" description="暂无操作日志" />
              <div class="logs-load-more" v-if="logsHasMore">
                <el-button type="primary" link :loading="loadingMoreLogs" @click="loadMoreLogs">
                  {{ loadingMoreLogs ? '加载中...' : '加载更多' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 外呼对话框 -->
    <el-dialog v-model="showCallDialog" title="发起外呼" width="500px">
      <el-form :model="callForm" label-width="80px">
        <el-form-item label="电话号码">
          <el-select v-model="callForm.phone" placeholder="请选择客户号码" filterable allow-create>
            <el-option
              v-if="customerInfo.phone"
              :label="`${displaySensitiveInfoNew(customerInfo.phone, SensitiveInfoType.PHONE)} (主号码)`"
              :value="customerInfo.phone"
            />
            <el-option
              v-for="(phone, index) in customerInfo.otherPhones"
              :key="phone"
              :label="`${displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)} (备用号码${index + 1})`"
              :value="phone"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="通话目的">
          <el-select v-model="callForm.purpose" placeholder="请选择">
            <el-option label="销售跟进" value="sales" />
            <el-option label="客户回访" value="callback" />
            <el-option label="售后服务" value="service" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="callForm.note" type="textarea" rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCallDialog = false">取消</el-button>
        <el-button @click="startCall" type="primary" :loading="calling">开始通话</el-button>
      </template>
    </el-dialog>

    <!-- 跟进对话框 -->
    <el-dialog v-model="showFollowUpDialog" :title="isEditingFollowUp ? '编辑跟进记录' : '添加跟进记录'" width="600px">
      <el-form :model="followUpForm" :rules="followUpRules" ref="followUpFormRef" label-width="80px">
        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="followUpForm.type" placeholder="请选择">
            <el-option label="电话跟进" value="电话跟进" />
            <el-option label="微信沟通" value="微信沟通" />
            <el-option label="上门拜访" value="上门拜访" />
            <el-option label="邮件联系" value="邮件联系" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进标题" prop="title">
          <el-input v-model="followUpForm.title" placeholder="请输入跟进标题" />
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input v-model="followUpForm.content" type="textarea" rows="4" placeholder="请输入跟进内容" />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker v-model="followUpForm.nextFollowUp" type="datetime" placeholder="选择下次跟进时间" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelFollowUp">取消</el-button>
        <el-button @click="saveFollowUp" type="primary" :loading="savingFollowUp">
          {{ isEditingFollowUp ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 短信发送对话框 - 使用 SendSmsDialog 组件（三步式：选模板→填变量→预览确认） -->
    <SendSmsDialog
      v-model="showSMSDialog"
      :templates="approvedSmsTemplates"
      :presetCustomer="smsPresetCustomer"
      @submit="handleSmsSendSubmit"
      @apply-template="handleApplyTemplate"
    />

    <!-- 标签对话框 -->
    <el-dialog v-model="showTagDialog" title="添加标签" width="400px">
      <el-form :model="tagForm" label-width="80px">
        <el-form-item label="标签名称">
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="标签颜色">
          <el-select v-model="tagForm.type" placeholder="请选择颜色">
            <el-option label="默认" value="" />
            <el-option label="成功" value="success" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="危险" value="danger" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTagDialog = false">取消</el-button>
        <el-button @click="saveTag" type="primary" :loading="savingTag">保存</el-button>
      </template>
    </el-dialog>

    <!-- 申请模板对话框 -->
    <CreateTemplateDialog
      v-model="showApplyTemplateDialog"
      mode="apply"
      @submit="handleTemplateApplySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, DataAnalysis, Search, Phone, ChatDotRound, Edit, ShoppingCart, Plus, ArrowLeft, EditPen, ShoppingBag, RefreshLeft, Clock, Money, InfoFilled, ArrowDown, ArrowUp, Message, DocumentAdd, Download, Share, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useCallStore } from '@/stores/call'
import { useCustomerFieldConfigStore } from '@/stores/customerFieldConfig'

import { permissionService, CallPermissionType } from '@/services/permission'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { copyToClipboard } from '@/utils/customerCode'
import CreateTemplateDialog from '@/components/CreateTemplateDialog.vue'
import SendSmsDialog from '@/components/SendSmsDialog.vue'
import { createSafeNavigator } from '@/utils/navigation'
import { customerDetailApi } from '@/api/customerDetail'
import { customerApi } from '@/api/customer'
import { autoMatchVariables as autoMatchSmsVariables } from '@/utils/smsVariableMatcher'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { formatDateTime } from '@/utils/date'
import WecomInfoCard from './components/WecomInfoCard.vue'
import CustomerPortrait from './Detail/CustomerPortrait.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const customerFieldConfigStore = useCustomerFieldConfigStore()

// 自定义字段展示
const displayCustomFields = computed(() => {
  return [...(customerFieldConfigStore.config?.customFields || [])]
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
})

const formatCustomFieldValue = (field: any, customFields: Record<string, any> | null | undefined) => {
  if (!customFields) return '暂无'
  const val = customFields[field.fieldKey]
  if (val === undefined || val === null || val === '') return '暂无'
  if (field.fieldType === 'checkbox' && Array.isArray(val)) {
    // 多选：将值转换为标签
    if (field.options && field.options.length > 0) {
      return val.map((v: string) => {
        const opt = field.options.find((o: any) => o.value === v)
        return opt ? opt.label : v
      }).join('、')
    }
    return val.join('、')
  }
  if (field.fieldType === 'select' || field.fieldType === 'radio') {
    if (field.options && field.options.length > 0) {
      const opt = field.options.find((o: any) => o.value === val)
      return opt ? opt.label : val
    }
  }
  return String(val)
}
const orderStore = useOrderStore()
const serviceStore = useServiceStore()
const customerStore = useCustomerStore()
const callStore = useCallStore()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)

// 数据范围控制函数
const applyDataScopeControl = (orders) => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 超级管理员可以查看所有订单
  if (currentUser.role === 'admin') {
    return orders
  }

  // 部门负责人可以查看本部门所有订单
  if (currentUser.role === 'department_manager') {
    return orders.filter(order => {
      const orderCreator = userStore.getUserById(order.createdBy)
      return orderCreator?.department === currentUser.department
    })
  }

  // 销售员只能查看自己创建的订单
  if (currentUser.role === 'sales_staff') {
    return orders.filter(order => order.createdBy === currentUser.id)
  }

  // 客服只能查看自己处理的订单
  if (currentUser.role === 'customer_service') {
    return orders.filter(order => order.servicePersonId === currentUser.id)
  }

  // 其他角色默认只能查看自己创建的订单
  return orders.filter(order => order.createdBy === currentUser.id)
}

// 响应式数据
const activeTab = ref('orders')
const isEditing = ref(false)
const emailEditing = ref(false)
const wechatEditing = ref(false)
const saving = ref(false)
const loadingOrders = ref(false)
const loadingService = ref(false)
const loadingCalls = ref(false)
const orderSearch = ref('')

// 对话框状态
const showCallDialog = ref(false)
const showFollowUpDialog = ref(false)
const showTagDialog = ref(false)
const showSMSDialog = ref(false)
const showApplyTemplateDialog = ref(false)
const calling = ref(false)
const savingFollowUp = ref(false)
const savingTag = ref(false)
const sendingSMS = ref(false)

// 短信相关数据
const smsTemplates = ref<{
  id: string
  name: string
  content: string
  variables: { key: string; label: string; placeholder: string; defaultValue?: string }[]
  status: string
}[]>([])
const userSmsStats = ref({
  todayCount: 0,
  monthCount: 0
})

// 🔥 v1.8.1 新增：SendSmsDialog 需要的模板列表格式（id, name, category, content, variables, usage）
const approvedSmsTemplates = ref<{ id: string | number; name: string; category: string; content: string; variables?: string[]; usage?: number }[]>([])

// 🔥 v1.8.1 新增：传递给 SendSmsDialog 的预设客户对象，自动填充接收人和变量
const smsPresetCustomer = computed(() => {
  if (!customerInfo.value?.id) return null
  return {
    id: customerInfo.value.id,
    name: customerInfo.value.name,
    phone: customerInfo.value.phone,
    email: customerInfo.value.email,
    gender: customerInfo.value.gender,
    company: '',
    level: customerInfo.value.level,
    customerNo: customerInfo.value.code,
    address: customerInfo.value.address,
    tags: (Array.isArray(customerInfo.value.tags) ? customerInfo.value.tags : []).map((t: any) => typeof t === 'string' ? t : t.name)
  }
})

// 🔥 v1.8.1 新增：SendSmsDialog 提交发送回调
const handleSmsSendSubmit = async (data: Record<string, unknown>) => {
  try {
    const { sendSms } = await import('@/api/sms')
    const res = await sendSms({
      templateId: data.templateId as string,
      templateName: (data.template as any)?.name || '',
      recipients: data.recipients as any[],
      content: data.content as string
    }) as any

    if (res?.success || res?.code === 200) {
      ElMessage.success('短信发送成功')
      showSMSDialog.value = false
    } else {
      ElMessage.error(res?.message || '短信发送失败')
    }
  } catch (error: any) {
    console.error('短信发送失败:', error)
    ElMessage.error(error?.response?.data?.message || '短信发送失败')
  }
}

// 短信表单
const smsForm = reactive({
  phone: '',
  templateId: '',
  variables: {}
})

// 短信表单验证规则
const smsRules = {
  phone: [
    { required: true, message: '请选择接收号码', trigger: 'change' }
  ],
  templateId: [
    { required: true, message: '请选择短信模板', trigger: 'change' }
  ]
}

// 客户信息
const customerInfo = ref<{
  id: string
  code: string
  name: string
  phone: string
  email: string
  address: string
  level: string
  gender: string
  birthday: string
  age: number | null
  height: number | null
  weight: number | null
  wechatId: string
  salesPerson: string
  salesperson: string
  salesPersonId: string
  createdBy: string
  createTime: string
  createdAt: string
  joinTime: string
  source: string
  medicalHistory: string
  tags: any[]
  improvementGoals: any[]
  otherPhones: string[]
  notes: string
  customFields: Record<string, any> | null
  starRating: number
  finalScore: number
  wecomExternalUserid: string
  wecomAddTime: string
  chatCount: number
  replyRate: string
  followUpCount: number
  afterSalesCount: number
  afterSalesAmount: number
  totalAmount: number
  orderCount: number
  lastOrderTime: string
}>({
  id: '',
  code: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  level: '',
  gender: '',
  birthday: '',
  age: null,
  height: null,
  weight: null,
  wechatId: '',
  salesPerson: '',
  salesperson: '',
  salesPersonId: '',
  createdBy: '',
  createTime: '',
  createdAt: '',
  joinTime: '',
  source: '',
  medicalHistory: '',
  tags: [],
  improvementGoals: [],
  otherPhones: [],
  notes: '',
  customFields: null,
  starRating: 0,
  finalScore: 0,
  wecomExternalUserid: '',
  wecomAddTime: '',
  chatCount: 0,
  replyRate: '',
  followUpCount: 0,
  afterSalesCount: 0,
  afterSalesAmount: 0,
  totalAmount: 0,
  orderCount: 0,
  lastOrderTime: ''
})

// 客户统计
const customerStats = ref({
  totalConsumption: 0,
  orderCount: 0,
  returnCount: 0,
  lastOrderDate: ''
})

// 编辑表单数据
const editForm = reactive({
  code: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  level: '',
  gender: '',
  birthday: '',
  salesperson: '',
  age: null as number | null,
  height: null as number | null,
  weight: null as number | null,
  wechatId: '',
  source: '',
  joinTime: '',  // 进粉时间
  improvementGoals: [] as string[],  // 改善问题
  customFields: {} as Record<string, any>  // 自定义字段
})

// 手机号管理
const phoneNumbers = ref<string[]>([])
const newPhoneNumber = ref('')
const showAddPhone = ref(false)

// 验证手机号是否有效（11位数字）
const isValidPhoneNumber = computed(() => {
  const phone = newPhoneNumber.value.trim()
  return /^1[3-9]\d{9}$/.test(phone)
})

// 疾病史管理
const medicalHistory = ref<{
  id: number | string
  content: string
  createTime: string
  operator: string
  operationType: string
}[]>([])
const showMedicalHistory = ref(false)
const showAddMedical = ref(false)
const newMedicalRecord = ref('')
const addingMedical = ref(false)

// 客户备注管理
const customerNotes = ref<{ id: number; content: string; createTime: string; operator: string }[]>([])
const showNotesHistory = ref(false)
const showAddNote = ref(false)
const newNoteText = ref('')
const addingNote = ref(false)
const editingNoteId = ref<number | null>(null)
const editNoteText = ref('')
const savingNote = ref(false)

// 客户地址管理
const customerAddresses = ref<{ id: number; content: string; createTime: string; isDefault?: boolean }[]>([])
const showAddressHistory = ref(false)
const showAddAddress = ref(false)
const newAddressText = ref('')
const addingAddress = ref(false)
const editingAddressId = ref<number | null>(null)
const editAddressText = ref('')
const savingAddress = ref(false)

const callForm = reactive({
  phone: '',
  purpose: '',
  note: ''
})

const followUpForm = reactive({
  type: '',
  title: '',
  content: '',
  nextFollowUp: ''
})

// 编辑跟进记录相关状态
const isEditingFollowUp = ref(false)
const editingFollowUpId = ref('')

const tagForm = reactive({
  name: '',
  type: ''
})

// 表单验证规则
const customerRules = {
  name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

const followUpRules = {
  type: [{ required: true, message: '请选择跟进类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入跟进标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }]
}

// 订单历史
const orderHistory = ref<{
  id: string
  orderNo: string
  products: string
  totalAmount: number
  status: string
  orderDate: string
}[]>([])

// 售后记录
const serviceRecords = ref<{
  id: string
  serviceNo: string
  orderNo: string
  type: string
  reason: string
  amount: number
  status: string
  createTime: string
}[]>([])

// 通话记录
const callRecords = ref<{
  id: string
  callType: string
  phone: string
  duration: string
  status: string
  summary: string
  callTime: string
}[]>([])

// 跟进记录
const followUpRecords = ref<{
  id: string
  type: string
  title: string
  content: string
  createTime: string
  author: string
  canEdit: boolean
}[]>([])

// 客户标签
const customerTags = ref<{
  id: string
  name: string
  type: string
}[]>([])

// 客户日志
const customerLogs = ref<{
  id: string
  logType: string
  content: string
  detail: any
  operatorId: string
  operatorName: string
  createdAt: string
}[]>([])
const loadingLogs = ref(false)
const loadingMoreLogs = ref(false)
const logsOffset = ref(0)
const logsHasMore = ref(false)

// 表单引用
const smsFormRef = ref()

// 计算属性
const canEdit = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) {
    return false
  }

  // 超级管理员可以编辑所有客户
  if (userStore.isSuperAdmin) {
    return true
  }

  // 部门负责人可以编辑本部门的客户
  if (userStore.isDepartmentLeader) {
    // 可以编辑自己创建或负责的客户
    if (customerInfo.value.createdBy === currentUser.id || customerInfo.value.salesPersonId === currentUser.id) {
      return true
    }

    // 可以编辑本部门成员创建的客户
    const customerCreator = userStore.users.find(u => u.id === customerInfo.value.createdBy)
    const customerSalesPerson = userStore.users.find(u => u.id === customerInfo.value.salesPersonId)

    return (customerCreator && customerCreator.departmentId === currentUser.departmentId) ||
           (customerSalesPerson && customerSalesPerson.departmentId === currentUser.departmentId)
  }

  // 普通用户只能编辑自己创建或被分配的客户
  return customerInfo.value.createdBy === currentUser.id || customerInfo.value.salesPersonId === currentUser.id
})

const filteredOrders = computed(() => {
  if (!orderSearch.value) return orderHistory.value
  return orderHistory.value.filter(order =>
    order.orderNo.includes(orderSearch.value) ||
    order.products.includes(orderSearch.value)
  )
})

// 短信相关计算属性
const selectedTemplate = computed(() => {
  return smsTemplates.value.find(template => template.id === smsForm.templateId)
})

const previewContent = computed(() => {
  if (!selectedTemplate.value) return ''
  let content = selectedTemplate.value.content
  if (selectedTemplate.value.variables) {
    selectedTemplate.value.variables.forEach(variable => {
      const value = smsForm.variables[variable.key] || `{${variable.key}}`
      content = content.replace(new RegExp(`\\{${variable.key}\\}`, 'g'), value)
    })
  }
  return content
})

const canSendSMS = computed(() => {
  return userSmsStats.value.todayCount < 1 &&
         userSmsStats.value.monthCount < 5 &&
         smsForm.phone &&
         smsForm.templateId
})

// 方法
const goBack = () => {
  safeNavigator.push('/customer/list')
}

// 处理拨打电话 - 🔥 跳转到通话管理页面
const handleCall = () => {
  const phone = customerInfo.value.phone || (customerInfo.value.otherPhones && customerInfo.value.otherPhones[0]) || ''
  if (!phone) {
    ElMessage.warning('该客户没有电话号码')
    return
  }

  safeNavigator.push({
    path: '/service-management/call',
    query: {
      action: 'outbound',
      customerId: route.params.id as string,
      customerName: customerInfo.value.name,
      customerPhone: phone,
      company: ''
    }
  })
}

// 处理发送短信
const handleSendSMS = async () => {
  // 检查客户是否有手机号
  if (!customerInfo.value.phone && (!customerInfo.value.otherPhones || customerInfo.value.otherPhones.length === 0)) {
    ElMessage.warning('该客户没有手机号码，无法发送短信')
    return
  }

  // 🔥 v1.8.1: 加载 SendSmsDialog 需要的已审核模板列表
  try {
    const { getTemplates } = await import('@/api/sms')
    const res = await getTemplates({ status: 'active' }) as any
    if (res?.data?.templates && res.data.templates.length > 0) {
      approvedSmsTemplates.value = res.data.templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category || 'general',
        content: t.content || '',
        variables: t.variables || [],
        usage: t.usage || 0
      }))
    }
  } catch (err) {
    console.warn('加载短信模板失败:', err)
  }

  // 也加载旧格式模板（兼容）
  loadSMSTemplates()

  showSMSDialog.value = true
}

// 处理申请模板
const handleApplyTemplate = () => {
  showApplyTemplateDialog.value = true
}

// 处理模板申请提交
const handleTemplateApplySubmit = (data: { name: string; content: string; variables: unknown[] }) => {
  console.log('模板申请数据:', data)
  ElMessage.success('模板申请已提交，等待管理员审核')
  showApplyTemplateDialog.value = false

  // 可以在这里刷新模板列表
  loadSMSTemplates()
}

// 模板变化处理
const onTemplateChange = () => {
  // 重置变量
  smsForm.variables = {}
  if (selectedTemplate.value && selectedTemplate.value.variables) {
    // 🔥 使用自动匹配工具自动填充变量
    const customerData = {
      name: customerInfo.value.name,
      phone: customerInfo.value.phone,
      email: customerInfo.value.email,
      gender: customerInfo.value.gender,
      address: customerInfo.value.address,
      customerNo: customerInfo.value.code,
      level: customerInfo.value.level
    }
    const matched = autoMatchSmsVariables(selectedTemplate.value.content, customerData)

    selectedTemplate.value.variables.forEach(variable => {
      // 使用自动匹配的值，没有则用默认值
      smsForm.variables[variable.key] = matched[variable.key] || variable.defaultValue || ''
    })
  }
}

// 发送短信
const sendSMS = async () => {
  try {
    // 表单验证
    await smsFormRef.value.validate()

    // 检查发送限制
    if (!canSendSMS.value) {
      ElMessage.warning('已达到发送限制，无法发送短信')
      return
    }

    sendingSMS.value = true

    // 构建发送数据
    const sendData = {
      customerId: customerInfo.value.id,
      phone: smsForm.phone,
      templateId: smsForm.templateId,
      templateName: selectedTemplate.value?.name || '',
      variables: smsForm.variables,
      content: previewContent.value,
      recipients: [{ name: customerInfo.value.name, phone: smsForm.phone }]
    }

    // 🔥 调用真实发送API
    const { sendSms } = await import('@/api/sms')
    const res = await sendSms({
      templateId: sendData.templateId,
      templateName: sendData.templateName,
      recipients: sendData.recipients,
      content: sendData.content
    }) as any

    if (res?.success || res?.code === 200) {
      ElMessage.success('短信发送成功')
      showSMSDialog.value = false
      // 刷新统计数据
      loadUserSMSStats()
    } else {
      ElMessage.error(res?.message || '短信发送失败')
    }
  } catch (error: any) {
    console.error('发送短信失败:', error)
    if (error?.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('发送短信失败，请重试')
    }
  } finally {
    sendingSMS.value = false
  }
}

// 加载短信模板
const loadSMSTemplates = async () => {
  try {
    const { getAvailableTemplates } = await import('@/api/sms')
    const res = await getAvailableTemplates() as any
    if (res?.data?.templates) {
      smsTemplates.value = res.data.templates.map((t: any) => {
        // 从模板内容中提取变量
        const varMatches = (t.content || '').match(/\{(\w+)\}/g) || []

        // 🔥 使用自动匹配工具生成默认值
        const customerData = {
          name: customerInfo.value.name,
          phone: customerInfo.value.phone,
          email: customerInfo.value.email,
          gender: customerInfo.value.gender,
          address: customerInfo.value.address,
          customerNo: customerInfo.value.code,
          level: customerInfo.value.level
        }
        const matched = autoMatchSmsVariables(t.content || '', customerData)

        const variables = varMatches.map((v: string) => {
          const key = v.replace(/[{}]/g, '')
          return {
            key,
            label: key,
            placeholder: `请输入${key}`,
            defaultValue: matched[key] || (key === 'customerName' ? customerInfo.value.name : undefined)
          }
        })
        return {
          id: String(t.id),
          name: t.name || '',
          content: t.content || '',
          variables,
          status: t.status || 'active'
        }
      })
    }
  } catch (error) {
    console.error('加载短信模板失败:', error)
    // 如果API调用失败，保持空列表而不是显示错误
  }
}

// 加载用户短信统计
const loadUserSMSStats = async () => {
  try {
    // 这里先使用模拟数据
    userSmsStats.value = {
      todayCount: 0,
      monthCount: 2
    }
  } catch (error) {
    console.error('加载短信统计失败:', error)
  }
}

// 处理添加跟进
const handleAddFollowUp = () => {
  showFollowUpDialog.value = true
}

// 处理编辑客户
const handleEdit = () => {
  isEditing.value = true
  const { customFields, ...rest } = customerInfo.value
  Object.assign(editForm, rest)
  editForm.customFields = { ...(customFields || {}) }
  // 确保 checkbox 类型字段初始化为数组
  for (const field of displayCustomFields.value) {
    if (field.fieldType === 'checkbox' && !Array.isArray(editForm.customFields[field.fieldKey])) {
      editForm.customFields[field.fieldKey] = editForm.customFields[field.fieldKey] ? [editForm.customFields[field.fieldKey]] : []
    }
  }
  phoneNumbers.value = customerInfo.value.otherPhones || []
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
  const { customFields, ...rest } = customerInfo.value
  Object.assign(editForm, rest)
  editForm.customFields = { ...(customFields || {}) }
  for (const field of displayCustomFields.value) {
    if (field.fieldType === 'checkbox' && !Array.isArray(editForm.customFields[field.fieldKey])) {
      editForm.customFields[field.fieldKey] = editForm.customFields[field.fieldKey] ? [editForm.customFields[field.fieldKey]] : []
    }
  }
  // 在编辑表单中显示加密的手机号
  editForm.phone = displaySensitiveInfoNew(customerInfo.value.phone, SensitiveInfoType.PHONE)
  phoneNumbers.value = customerInfo.value.otherPhones || []
}

const getLevelClass = (level: string) => {
  const levelMap: Record<string, string> = {
    'VIP客户': 'level-vip',
    'SVIP客户': 'level-svip',
    '普通客户': 'level-normal'
  }
  return levelMap[level] || 'level-normal'
}

const getLevelType = (level: string) => {
  const levelMap: Record<string, string> = {
    'bronze': '',
    'silver': 'info',
    'gold': 'warning',
    'diamond': 'danger',
    // 兼容旧数据
    'normal': '',
    'vip': 'warning',
    'svip': 'danger',
    '普通客户': '',
    'VIP客户': 'warning',
    'SVIP客户': 'danger'
  }
  return levelMap[level] || ''
}

const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'bronze': '铜牌客户',
    'silver': '银牌客户',
    'gold': '金牌客户',
    'diamond': '钻石客户',
    // 兼容旧数据
    'normal': '铜牌客户',
    'vip': '金牌客户',
    'svip': '钻石客户',
    '普通客户': '铜牌客户',
    'VIP客户': '金牌客户',
    'SVIP客户': '钻石客户'
  }
  return levelMap[level] || '铜牌客户'
}

const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    '已完成': 'success',
    '进行中': 'warning',
    '已取消': 'danger',
    '待付款': 'info'
  }
  return statusMap[status] || 'info'
}

const getServiceType = (type: string) => {
  const typeMap: Record<string, string> = {
    '退货': 'warning',
    '退款': 'danger',
    '换货': 'info',
    '维修': 'success'
  }
  return typeMap[type] || 'info'
}

const getServiceStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    '已完成': 'success',
    '处理中': 'warning',
    '待处理': 'info',
    '已拒绝': 'danger'
  }
  return statusMap[status] || 'info'
}

const getCallStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    '已接通': 'success',
    '未接通': 'warning',
    '忙线': 'info',
    '拒接': 'danger'
  }
  return statusMap[status] || 'info'
}

const getFollowUpType = (type: string) => {
  const typeMap: Record<string, string> = {
    '电话跟进': 'primary',
    '微信沟通': 'success',
    '上门拜访': 'warning',
    '邮件联系': 'info',
    '其他': ''
  }
  return typeMap[type] || ''
}

// 新增的辅助方法
const getGenderText = (gender: string) => {
  const genderMap: Record<string, string> = {
    'male': '男',
    'female': '女',
    '男': '男',
    '女': '女'
  }
  return genderMap[gender] || gender
}

const getSourceText = (source: string) => {
  const sourceMap: Record<string, string> = {
    'online': '线上推广',
    'offline': '线下门店',
    'referral': '朋友推荐',
    'social': '社交媒体',
    'search': '搜索引擎',
    'advertisement': '广告投放',
    'other': '其他渠道'
  }
  return sourceMap[source] || source
}

const getTagText = (tag: string) => {
  const tagMap: Record<string, string> = {
    'high_value': '高价值客户',
    'potential': '潜在客户',
    'loyal': '忠实客户',
    'new': '新客户',
    'inactive': '不活跃客户',
    'complaint': '投诉客户',
    'vip': 'VIP客户'
  }
  return tagMap[tag] || tag
}

const getTagType = (tag: string) => {
  const typeMap: Record<string, string> = {
    '优质客户': 'success',
    '重点关注': 'warning',
    '高消费': 'danger',
    '潜在客户': 'info',
    '忠实客户': 'success',
    '新客户': 'primary',
    '不活跃客户': '',
    '投诉客户': 'danger',
    'VIP客户': 'warning'
  }
  return typeMap[tag] || 'info'
}

// 禁用未来日期（进粉时间不能选择未来）
const disableFutureDate = (time: Date) => {
  return time.getTime() > Date.now()
}

const toggleEdit = () => {
  if (isEditing.value) {
    cancelEdit()
  } else {
    isEditing.value = true
    Object.assign(editForm, customerInfo.value)
    // 初始化手机号列表（除了主手机号）
    phoneNumbers.value = customerInfo.value.otherPhones || []
    // 初始化进粉时间和改善问题
    editForm.joinTime = customerInfo.value.joinTime || ''
    editForm.improvementGoals = customerInfo.value.improvementGoals || []
  }
}

const cancelEdit = () => {
  isEditing.value = false
  emailEditing.value = false
  wechatEditing.value = false
  Object.assign(editForm, customerInfo.value)
  phoneNumbers.value = []
  showAddPhone.value = false
  newPhoneNumber.value = ''
}

const saveCustomerInfo = async () => {
  saving.value = true
  try {
    const customerId = route.params.id as string

    // 邮箱格式验证
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      ElMessage.warning('请输入正确的邮箱格式')
      saving.value = false
      return
    }

    // 微信号格式验证：仅允许字母、数字、下划线、横线，6-20位
    if (editForm.wechatId && !/^[a-zA-Z0-9_-]{6,20}$/.test(editForm.wechatId)) {
      ElMessage.warning('微信号格式不正确（仅支持字母、数字、下划线、横线，6-20位）')
      saving.value = false
      return
    }

    // 准备更新数据
    const updateData: Record<string, unknown> = {
      name: editForm.name,
      level: editForm.level,
      gender: editForm.gender,
      age: editForm.age ?? undefined,
      height: editForm.height ?? undefined,
      weight: editForm.weight ?? undefined,
      birthday: editForm.birthday || undefined,
      source: editForm.source,
      salesperson: editForm.salesperson,
      fanAcquisitionTime: editForm.joinTime,
      improvementGoals: editForm.improvementGoals,
      otherPhones: phoneNumbers.value,
      customFields: editForm.customFields,
      email: editForm.email || '',
      wechatId: editForm.wechatId || '',
      wechat: editForm.wechatId || ''
    }

    // 调用后端API更新客户
    const response = await customerApi.update(customerId, updateData as any)

    if (response.success) {
      // 更新本地数据
      Object.assign(customerInfo.value, editForm)
      customerInfo.value.otherPhones = [...phoneNumbers.value]
      customerInfo.value.joinTime = editForm.joinTime
      customerInfo.value.improvementGoals = [...editForm.improvementGoals]
      customerInfo.value.birthday = editForm.birthday
      isEditing.value = false
      emailEditing.value = false
      wechatEditing.value = false
      ElMessage.success('保存成功')

      // 刷新客户数据和日志
      await loadCustomerDetail()
      loadCustomerLogs()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存客户信息失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 手机号管理方法
const addPhone = () => {
  if (!newPhoneNumber.value.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(newPhoneNumber.value)) {
    ElMessage.warning('请输入正确的手机号格式')
    return
  }

  // 检查是否重复
  if (phoneNumbers.value.includes(newPhoneNumber.value) || editForm.phone === newPhoneNumber.value) {
    ElMessage.warning('该手机号已存在')
    return
  }

  phoneNumbers.value.push(newPhoneNumber.value)
  newPhoneNumber.value = ''
  showAddPhone.value = false
  ElMessage.success('添加成功')
}

const removePhone = (index) => {
  phoneNumbers.value.splice(index, 1)
  ElMessage.success('删除成功')
}

const cancelAddPhone = () => {
  newPhoneNumber.value = ''
  showAddPhone.value = false
}

// 疾病史管理方法
const addMedicalRecord = async () => {
  if (!newMedicalRecord.value.trim()) {
    ElMessage.warning('请输入疾病信息')
    return
  }

  addingMedical.value = true
  try {
    const customerId = route.params.id as string
    const result = await customerDetailApi.addMedicalHistory(customerId, {
      content: newMedicalRecord.value.trim()
    })

    // 从API返回获取新记录
    const newRecord = result?.data || result || {
      id: Date.now(),
      content: newMedicalRecord.value.trim(),
      createTime: new Date().toISOString(),
      operator: '当前用户',
      operationType: 'add'
    }

    // 新记录添加到数组开头（最新的在前面）
    medicalHistory.value.unshift({
      id: newRecord.id,
      content: newRecord.content,
      createTime: newRecord.createTime,
      operator: newRecord.operator || '当前用户',
      operationType: newRecord.operationType || 'add'
    })

    newMedicalRecord.value = ''
    showAddMedical.value = false
    ElMessage.success('疾病信息添加成功')

    // 刷新客户日志
    loadCustomerLogs()
  } catch (error) {
    ElMessage.error('添加疾病史失败')
  } finally {
    addingMedical.value = false
  }
}

const cancelAddMedical = () => {
  newMedicalRecord.value = ''
  showAddMedical.value = false
}

// 地址管理方法
const loadCustomerAddresses = async () => {
  try {
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerAddresses(customerId)
    const data = response?.data || response || []
    customerAddresses.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载客户地址失败:', error)
    customerAddresses.value = []
  }
}

// 地址智能校验：必须包含省/市/区/自治区/直辖市等基本信息
const validateAddress = (address: string): boolean => {
  const keywords = ['省', '市', '区', '县', '自治区', '直辖市', '自治州', '盟', '旗', '镇', '街道', '路', '道', '号', '弄', '村', '组']
  const hasKeyword = keywords.some(kw => address.includes(kw))
  if (!hasKeyword) {
    ElMessage.warning('请输入包含省、市、区等基本信息的完整详细地址')
    return false
  }
  if (address.length < 8) {
    ElMessage.warning('地址信息过短，请输入完整的详细地址')
    return false
  }
  return true
}

const addAddress = async () => {
  if (!newAddressText.value.trim()) {
    ElMessage.warning('请输入地址')
    return
  }
  if (!validateAddress(newAddressText.value.trim())) return
  addingAddress.value = true
  try {
    const customerId = route.params.id as string
    await customerDetailApi.addCustomerAddress(customerId, { content: newAddressText.value.trim() })
    newAddressText.value = ''
    showAddAddress.value = false
    ElMessage.success('地址添加成功')
    await loadCustomerAddresses()
    loadCustomerLogs()
  } catch (error) {
    ElMessage.error('添加地址失败')
  } finally {
    addingAddress.value = false
  }
}

const cancelAddAddress = () => {
  newAddressText.value = ''
  showAddAddress.value = false
}

const startEditAddress = (addr: any) => {
  editingAddressId.value = addr.id
  editAddressText.value = addr.content
}

const cancelEditAddress = () => {
  editingAddressId.value = null
  editAddressText.value = ''
}

const saveEditAddress = async () => {
  if (!editAddressText.value.trim()) {
    ElMessage.warning('地址不能为空')
    return
  }
  if (!validateAddress(editAddressText.value.trim())) return
  savingAddress.value = true
  try {
    const customerId = route.params.id as string
    await customerDetailApi.updateCustomerAddress(customerId, editingAddressId.value!, { content: editAddressText.value.trim() })
    editingAddressId.value = null
    editAddressText.value = ''
    ElMessage.success('地址更新成功')
    await loadCustomerAddresses()
    loadCustomerLogs()
  } catch (error) {
    ElMessage.error('更新地址失败')
  } finally {
    savingAddress.value = false
  }
}

const deleteAddress = async (addressId: number) => {
  try {
    await ElMessageBox.confirm('确定删除该地址吗？', '提示', { type: 'warning' })
    const customerId = route.params.id as string
    await customerDetailApi.deleteCustomerAddress(customerId, addressId)
    ElMessage.success('地址已删除')
    await loadCustomerAddresses()
    loadCustomerLogs()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除地址失败')
    }
  }
}

// 客户备注管理方法
const loadCustomerNotes = async () => {
  try {
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerNotes(customerId)
    const data = response?.data || response || []
    customerNotes.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载客户备注失败:', error)
    customerNotes.value = []
  }
}

const addNote = async () => {
  if (!newNoteText.value.trim()) {
    ElMessage.warning('请输入备注内容')
    return
  }
  addingNote.value = true
  try {
    const customerId = route.params.id as string
    await customerDetailApi.addCustomerNote(customerId, { content: newNoteText.value.trim() })
    newNoteText.value = ''
    showAddNote.value = false
    ElMessage.success('备注添加成功')
    await loadCustomerNotes()
    loadCustomerLogs()
  } catch (error) {
    ElMessage.error('添加备注失败')
  } finally {
    addingNote.value = false
  }
}

const cancelAddNote = () => {
  newNoteText.value = ''
  showAddNote.value = false
}

const startEditNote = (note: any) => {
  editingNoteId.value = note.id
  editNoteText.value = note.content
}

const cancelEditNote = () => {
  editingNoteId.value = null
  editNoteText.value = ''
}

const saveEditNote = async () => {
  if (!editNoteText.value.trim()) {
    ElMessage.warning('备注不能为空')
    return
  }
  savingNote.value = true
  try {
    const customerId = route.params.id as string
    await customerDetailApi.updateCustomerNote(customerId, editingNoteId.value!, { content: editNoteText.value.trim() })
    editingNoteId.value = null
    editNoteText.value = ''
    ElMessage.success('备注更新成功')
    await loadCustomerNotes()
    loadCustomerLogs()
  } catch (error) {
    ElMessage.error('更新备注失败')
  } finally {
    savingNote.value = false
  }
}

const deleteNote = async (noteId: number) => {
  try {
    await ElMessageBox.confirm('确定删除该备注吗？', '提示', { type: 'warning' })
    const customerId = route.params.id as string
    await customerDetailApi.deleteCustomerNote(customerId, noteId)
    ElMessage.success('备注已删除')
    await loadCustomerNotes()
    loadCustomerLogs()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除备注失败')
    }
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const editCustomer = () => {
  safeNavigator.push(`/customer/edit/${route.params.id}`)
}

// 复制客户编码
const copyCustomerCode = async () => {
  if (!customerInfo.value.code) {
    ElMessage.warning('客户编码为空')
    return
  }

  try {
    await copyToClipboard(customerInfo.value.code)
    ElMessage.success('客户编码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

const makeCall = () => {
  // 🔥 跳转到通话管理页面
  handleCall()
}

// 点击手机号直接拨打 - 🔥 跳转到通话管理页面
const makePhoneCall = (phoneNumber: string) => {
  if (!phoneNumber) {
    ElMessage.warning('电话号码为空')
    return
  }

  safeNavigator.push({
    path: '/service-management/call',
    query: {
      action: 'outbound',
      customerId: route.params.id as string,
      customerName: customerInfo.value.name,
      customerPhone: phoneNumber,
      company: ''
    }
  })
}

const startCall = async () => {
  // 检查发起通话权限
  const permissionCheck = permissionService.checkCallPermission(
    userStore.userInfo?.id || 'guest',
    CallPermissionType.MAKE_CALL
  )

  if (!permissionCheck.hasAccess) {
    ElMessage.error(permissionCheck.reason || '无权限发起通话')
    return
  }

  calling.value = true
  try {
    // 使用通话管理store发起通话
    const callData = {
      customerId: route.params.id as string,
      customerName: customerInfo.value.name,
      phone: callForm.phone,
      purpose: callForm.purpose,
      notes: callForm.notes,
      type: 'outbound' as const
    }

    await callStore.startCall(callData)
    ElMessage.success('通话已发起')
    showCallDialog.value = false

    // 重新加载通话记录
    await loadCallRecords()
  } catch (error) {
    console.error('外呼失败:', error)
    ElMessage.error('外呼失败')
  } finally {
    calling.value = false
  }
}

const createOrder = () => {
  // 🔥 优先使用客户详情页新增的最新地址，避免传递地址代码
  const latestAddress = customerAddresses.value.length > 0
    ? customerAddresses.value[0].content
    : (customerInfo.value.address || '')
  safeNavigator.push({
    path: '/order/add',
    query: {
      customerId: route.params.id,
      customerName: customerInfo.value.name,
      customerPhone: customerInfo.value.phone,
      customerEmail: customerInfo.value.email,
      customerAddress: latestAddress
    }
  })
}

// 新建售后
const createAfterSales = () => {
  safeNavigator.push({
    path: '/service/add',
    query: {
      customerId: route.params.id,
      customerName: customerInfo.value.name,
      customerPhone: customerInfo.value.phone,
      customerEmail: customerInfo.value.email
    }
  })
}

const addFollowUp = () => {
  // 重置编辑状态
  isEditingFollowUp.value = false
  editingFollowUpId.value = ''

  // 重置表单
  followUpForm.type = ''
  followUpForm.title = ''
  followUpForm.content = ''
  followUpForm.nextFollowUp = ''
  showFollowUpDialog.value = true
}

const saveFollowUp = async () => {
  // 验证表单
  if (!followUpForm.type || !followUpForm.title || !followUpForm.content) {
    ElMessage.warning('请填写完整的跟进信息')
    return
  }

  savingFollowUp.value = true
  try {
    const customerId = route.params.id as string

    if (isEditingFollowUp.value) {
      // 编辑模式：使用API更新记录
      await customerDetailApi.updateFollowUp(customerId, editingFollowUpId.value, {
        type: followUpForm.type,
        title: followUpForm.title,
        content: followUpForm.content
      })

      // 更新本地数据
      const index = followUpRecords.value.findIndex(item => item.id === editingFollowUpId.value)
      if (index > -1) {
        const existingRecord = followUpRecords.value[index]
        followUpRecords.value[index] = {
          ...existingRecord,
          type: followUpForm.type,
          title: followUpForm.title,
          content: followUpForm.content
        }
      }
      ElMessage.success('跟进记录更新成功')
    } else {
      // 新增模式：使用API创建记录
      const newRecord = await customerDetailApi.addFollowUp(customerId, {
        type: followUpForm.type,
        title: followUpForm.title,
        content: followUpForm.content,
        author: userStore.currentUser?.name || '当前用户'
      })

      // 添加到本地数据
      followUpRecords.value.unshift({
        id: newRecord.id,
        type: newRecord.type,
        title: newRecord.title || newRecord.type,
        content: newRecord.content,
        createTime: newRecord.createTime,
        author: newRecord.author || newRecord.createdBy || '未知',
        canEdit: true
      })
      ElMessage.success('跟进记录保存成功')
    }

    showFollowUpDialog.value = false

    // 重置状态和表单
    isEditingFollowUp.value = false
    editingFollowUpId.value = ''
    followUpForm.type = ''
    followUpForm.title = ''
    followUpForm.content = ''
    followUpForm.nextFollowUp = ''

  } catch (error) {
    console.error('保存跟进记录失败:', error)
    ElMessage.error('保存失败')
  } finally {
    savingFollowUp.value = false
  }
}

const addTag = () => {
  tagForm.name = ''
  tagForm.type = ''
  showTagDialog.value = true
}

const saveTag = async () => {
  if (!tagForm.name.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }

  savingTag.value = true
  try {
    // 使用统一的API添加标签
    const customerId = route.params.id as string
    const newTag = await customerDetailApi.addCustomerTag(customerId, {
      name: tagForm.name,
      type: tagForm.type
    })

    customerTags.value.push({
      id: newTag.id,
      name: newTag.name,
      type: newTag.type
    })
    ElMessage.success('标签添加成功')
    showTagDialog.value = false
  } catch (error) {
    console.error('添加标签失败:', error)
    ElMessage.error('添加失败')
  } finally {
    savingTag.value = false
  }
}

const removeTag = async (tagId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个标签吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 使用统一的API删除标签
    const customerId = route.params.id as string
    await customerDetailApi.removeCustomerTag(customerId, tagId.toString())

    customerTags.value = customerTags.value.filter(tag => tag.id !== tagId)
    ElMessage.success('标签删除成功')
  } catch (error: any) {
    // 如果不是用户取消操作,显示错误信息
    if (error !== 'cancel') {
      console.error('删除标签失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleTabClick = (tab: { props: { name: string } }) => {
  const tabName = tab.props.name
  if (tabName === 'orders' && orderHistory.value.length === 0) {
    loadOrderHistory()
  } else if (tabName === 'service' && serviceRecords.value.length === 0) {
    loadServiceRecords()
  } else if (tabName === 'calls' && callRecords.value.length === 0) {
    loadCallRecords()
  } else if (tabName === 'followup' && followUpRecords.value.length === 0) {
    loadFollowUpRecords()
  } else if (tabName === 'logs' && customerLogs.value.length === 0) {
    loadCustomerLogs()
  }
}

const viewOrder = (orderId: string) => {
  safeNavigator.push(`/order/detail/${orderId}`)
}

const editOrder = (orderId: string) => {
  safeNavigator.push(`/order/edit/${orderId}`)
}

const cancelOrder = async (orderId: string) => {
  try {
    await ElMessageBox.confirm('确定要取消这个订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    ElMessage.success('订单已取消')
    loadOrderHistory()
  } catch {
    // 用户取消操作
  }
}

const createService = () => {
  createAfterSales()
}

const viewService = (serviceId: string) => {
  safeNavigator.push(`/service/detail/${serviceId}`)
}

const handleService = (serviceId: string) => {
  safeNavigator.push(`/service/edit/${serviceId}`)
}

const viewCallDetail = async (callId: string) => {
  try {
    await callStore.getCallDetail(callId)
    // 这里可以打开通话详情对话框
    ElMessage.success('查看通话详情')
  } catch (error) {
    console.error('获取通话详情失败:', error)
    ElMessage.error('获取通话详情失败')
  }
}

// 播放录音
const playRecording = async (callId: string) => {
  // 检查播放录音权限
  const permissionCheck = permissionService.checkCallPermission(
    userStore.userInfo?.id || 'guest',
    CallPermissionType.PLAY_RECORDING
  )

  if (!permissionCheck.hasAccess) {
    ElMessage.error(permissionCheck.reason || '无权限播放录音')
    return
  }

  try {
    await callStore.playRecording(callId)
    ElMessage.success('开始播放录音')
  } catch (error) {
    console.error('播放录音失败:', error)
    ElMessage.error('播放录音失败')
  }
}

// 下载录音
const downloadRecording = async (callId: string) => {
  // 检查下载录音权限
  const permissionCheck = permissionService.checkCallPermission(
    userStore.userInfo?.id || 'guest',
    CallPermissionType.DOWNLOAD_RECORDING
  )

  if (!permissionCheck.hasAccess) {
    ElMessage.error(permissionCheck.reason || '无权限下载录音')
    return
  }

  try {
    await callStore.downloadRecording(callId)
    ElMessage.success('录音下载已开始')
  } catch (error) {
    console.error('下载录音失败:', error)
    ElMessage.error('下载录音失败')
  }
}

// 分享通话
const shareCall = (callId: string) => {
  ElMessage.info('分享通话功能开发中')
}

// 回拨 - 🔥 跳转到通话管理页面
const callBack = (phone: string) => {
  if (!phone) {
    ElMessage.warning('电话号码为空')
    return
  }

  safeNavigator.push({
    path: '/service-management/call',
    query: {
      action: 'outbound',
      customerId: route.params.id as string,
      customerName: customerInfo.value.name,
      customerPhone: phone,
      company: ''
    }
  })
}

// 编辑通话记录
const editCallRecord = (callId: string) => {
  // 检查编辑通话记录权限
  const permissionCheck = permissionService.checkCallPermission(
    userStore.userInfo?.id || 'guest',
    CallPermissionType.EDIT_RECORDS
  )

  if (!permissionCheck.hasAccess) {
    ElMessage.error(permissionCheck.reason || '无权限编辑通话记录')
    return
  }

  ElMessage.info('编辑通话记录功能开发中')
}

// 从通话记录添加跟进
const addFollowUpFromCall = (callRecord: unknown) => {
  followUpForm.type = '电话跟进'
  followUpForm.title = `${callRecord.callType}跟进`
  followUpForm.content = `基于${callRecord.callTime}的${callRecord.callType}通话进行跟进`
  followUpForm.nextTime = ''
  followUpForm.priority = 'medium'
  followUpForm.status = 'pending'
  showFollowUpDialog.value = true
}

const canEditFollowUp = (createTime: string) => {
  const createDate = new Date(createTime)
  const now = new Date()
  const diffHours = (now.getTime() - createDate.getTime()) / (1000 * 60 * 60)
  return diffHours <= 24
}

const editFollowUp = (followUpId: string) => {
  const record = followUpRecords.value.find(item => item.id === followUpId)
  if (!record) {
    ElMessage.error('找不到要编辑的跟进记录')
    return
  }

  // 设置编辑模式
  isEditingFollowUp.value = true
  editingFollowUpId.value = followUpId

  // 填充表单数据
  followUpForm.type = record.type
  followUpForm.title = record.title
  followUpForm.content = record.content
  followUpForm.nextFollowUp = ''

  // 显示对话框
  showFollowUpDialog.value = true
}

const deleteFollowUp = async (followUpId: string) => {
  // 权限验证：仅超级管理员可以删除跟进记录
  if (!userStore.isAdmin) {
    ElMessage.error('权限不足，仅超级管理员可以删除跟进记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要删除这条跟进记录吗？删除后无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 使用API删除跟进记录
    const customerId = route.params.id as string
    await customerDetailApi.deleteFollowUp(customerId, followUpId)

    // 从列表中移除记录
    const index = followUpRecords.value.findIndex(item => item.id === followUpId)
    if (index > -1) {
      followUpRecords.value.splice(index, 1)
      ElMessage.success('跟进记录删除成功')
    }
  } catch (error: any) {
    // 如果不是用户取消操作,显示错误信息
    if (error !== 'cancel') {
      console.error('删除跟进记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const cancelFollowUp = () => {
  showFollowUpDialog.value = false
  isEditingFollowUp.value = false
  editingFollowUpId.value = ''

  // 重置表单
  followUpForm.type = ''
  followUpForm.title = ''
  followUpForm.content = ''
  followUpForm.nextFollowUp = ''
}

// 客户日志辅助方法
const getLogTypeText = (logType: string) => {
  const map: Record<string, string> = {
    'create': '创建客户',
    'edit': '编辑客户',
    'edit_info': '修改信息',
    'update': '更新信息',
    'delete': '删除客户',
    'share': '分享客户',
    'add_phone': '添加号码',
    'phone_added': '添加号码',
    'add_order': '新建订单',
    'add_tag': '添加标签',
    'remove_tag': '删除标签',
    'add_followup': '添加跟进',
    'edit_followup': '编辑跟进',
    'delete_followup': '删除跟进',
    'add_medical': '添加疾病史',
    'edit_notes': '编辑备注',
    'add_note': '添加备注',
    'delete_note': '删除备注',
    'view': '查看详情',
    'status_change': '状态变更',
    'level_change': '等级变更',
    'portrait': '客户画像',
    'assign': '分配客户',
    'transfer': '转移客户',
    'import': '导入客户',
    'batch_import': '批量导入',
    'export': '导出客户',
    'archive': '归档客户',
    'recover': '恢复客户',
    'merge': '合并客户',
    'wecom_bindBinding': '企微绑定',
    'wecom_bindunbind': '企微解绑',
    'add_address': '添加地址',
    'edit_address': '编辑地址',
    'delete_address': '删除地址',
    'star_rating': '星级评分',
    'other': '其他操作'
  }
  return map[logType] || logType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/^/, '操作: ')
}

const getLogTagType = (logType: string) => {
  const map: Record<string, string> = {
    'create': 'success',
    'edit': 'warning',
    'edit_info': 'warning',
    'update': 'warning',
    'delete': 'danger',
    'share': 'primary',
    'add_phone': 'info',
    'phone_added': 'info',
    'add_order': 'success',
    'add_tag': 'info',
    'remove_tag': 'danger',
    'add_followup': 'primary',
    'edit_followup': 'warning',
    'delete_followup': 'danger',
    'add_medical': 'info',
    'edit_notes': 'warning',
    'add_note': 'info',
    'delete_note': 'danger',
    'view': 'info',
    'status_change': 'warning',
    'level_change': 'warning',
    'portrait': 'primary',
    'assign': 'primary',
    'transfer': 'primary',
    'import': 'success',
    'batch_import': 'success',
    'archive': 'info',
    'recover': 'success',
    'merge': 'warning',
    'star_rating': 'warning',
    'add_address': 'info',
    'edit_address': 'warning',
    'delete_address': 'danger'
  }
  return map[logType] || 'info'
}

const getLogTimelineType = (logType: string) => {
  const map: Record<string, string> = {
    'create': 'success',
    'edit': 'warning',
    'edit_info': 'warning',
    'delete': 'danger',
    'share': 'primary',
    'add_order': 'success',
    'add_followup': 'primary'
  }
  return map[logType] || 'info'
}

const loadCustomerLogs = async () => {
  loadingLogs.value = true
  try {
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerLogs(customerId, 0, 6)
    const result = response?.data || response || { list: [], hasMore: false }
    const rawList = result.list || []
    // 确保detail字段被解析为对象
    customerLogs.value = rawList.map((item: any) => {
      if (item.detail && typeof item.detail === 'string') {
        try { item.detail = JSON.parse(item.detail) } catch { item.detail = null }
      }
      return item
    })
    logsHasMore.value = result.hasMore || false
    logsOffset.value = customerLogs.value.length
  } catch (error) {
    console.error('加载客户日志失败:', error)
    customerLogs.value = []
  } finally {
    loadingLogs.value = false
  }
}

const loadMoreLogs = async () => {
  loadingMoreLogs.value = true
  try {
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerLogs(customerId, logsOffset.value, 10)
    const result = response?.data || response || { list: [], hasMore: false }
    const newLogs = (result.list || []).map((item: any) => {
      if (item.detail && typeof item.detail === 'string') {
        try { item.detail = JSON.parse(item.detail) } catch { item.detail = null }
      }
      return item
    })
    customerLogs.value.push(...newLogs)
    logsHasMore.value = result.hasMore || false
    logsOffset.value += newLogs.length
  } catch (error) {
    console.error('加载更多日志失败:', error)
  } finally {
    loadingMoreLogs.value = false
  }
}

// 数据加载方法
const loadCustomerDetail = async () => {
  try {
    const customerId = route.params.id
    const customerCode = route.query.code as string

    // 如果有客户编码查询参数，通过编码查找客户
    if (customerCode && !customerId) {
      const customer = customerStore.getCustomerByCode(customerCode)
      if (customer) {
        // 重定向到正确的客户详情页面
        safeNavigator.replace(`/customer/detail/${customer.id}`)
        return
      } else {
        ElMessage.error('未找到对应的客户信息')
        safeNavigator.push('/customer/list')
        return
      }
    }

    if (!customerId) {
      ElMessage.error('客户ID不能为空')
      safeNavigator.push('/customer/list')
      return
    }

    // 始终从后端API获取客户详情（真实数据库数据）
    let customer = null

    console.log('[CustomerDetail] 🌐 从API获取客户详情')
    try {
      const { customerApi } = await import('@/api/customer')
      const response = await customerApi.getDetail(customerId as string)
      if (response.data) {
        customer = response.data
        console.log('[CustomerDetail] ✅ API获取成功:', customer.name)
      }
    } catch (apiError) {
      console.error('[CustomerDetail] ❌ API获取失败，尝试从本地缓存获取:', apiError)
      // 如果API失败，尝试从本地缓存获取（作为备用）
      customer = customerStore.customers.find(c => c.id === customerId)
    }

    if (!customer) {
      ElMessage.error('未找到客户信息')
      safeNavigator.push('/customer/list')
      return
    }

    console.log('找到客户信息:', customer)

    // 获取负责销售人员信息
    // 🔥 优先使用后端返回的名字，如果没有再从userStore查找
    let salespersonName = ''
    if (customer.salesPersonName) {
      salespersonName = customer.salesPersonName
    } else if (customer.salesPersonId) {
      const salesPerson = userStore.users?.find(u => u.id === customer.salesPersonId)
      salespersonName = salesPerson?.realName || salesPerson?.name || ''
    } else if (customer.salesperson) {
      salespersonName = customer.salesperson
    } else if (customer.createdByName) {
      // 如果没有负责销售，使用创建人名字
      salespersonName = customer.createdByName
    } else if (customer.createdBy) {
      // 如果后端没有返回创建人名字，从userStore查找
      const creator = userStore.users?.find(u => u.id === customer.createdBy)
      salespersonName = creator?.realName || creator?.name || ''
    }

    console.log('[客户详情] 负责销售映射:', {
      salesPersonName: customer.salesPersonName,
      salesPersonId: customer.salesPersonId,
      createdByName: customer.createdByName,
      createdBy: customer.createdBy,
      finalSalesperson: salespersonName
    })

    // 调试日志：查看客户数据中的疾病史和备注字段
    console.log('📋 [客户数据] medicalHistory:', customer.medicalHistory)
    console.log('📋 [客户数据] remark:', customer.remark)
    console.log('📋 [客户数据] remarks:', customer.remarks)
    console.log('📋 [客户数据] notes:', customer.notes)

    customerInfo.value = {
      id: customer.id,
      code: customer.code || customer.customerCode || '',
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      level: customer.level || '',
      gender: customer.gender || '',
      birthday: customer.birthday || '',
      age: customer.age || null,
      height: customer.height || null,
      weight: customer.weight || null,
      wechatId: customer.wechatId || '',
      salesPerson: salespersonName,
      salesperson: salespersonName,
      salesPersonId: customer.salesPersonId || '',
      createdBy: customer.createdBy || '',
      createTime: customer.createTime || customer.createdAt || '',
      createdAt: customer.createdAt || customer.createTime || '',
      joinTime: customer.fanAcquisitionTime || customer.joinTime || customer.joinDate || '',
      source: customer.source || '',
      medicalHistory: customer.medicalHistory || '',
      tags: customer.tags || [],
      improvementGoals: customer.improvementGoals || [],
      otherPhones: customer.otherPhones || [],
      notes: customer.notes || customer.remark || customer.remarks || '',
      customFields: customer.customFields || null,
      starRating: customer.starRating || 0,
      finalScore: customer.finalScore || 0,
      wecomExternalUserid: customer.wecomExternalUserid || customer.wecom_external_userid || '',
      wecomAddTime: customer.wecomAddTime || '',
      chatCount: customer.chatCount || 0,
      replyRate: customer.replyRate || '',
      followUpCount: customer.followUpCount || 0,
      afterSalesCount: customer.afterSalesCount || 0,
      afterSalesAmount: customer.afterSalesAmount || 0,
      totalAmount: customer.totalAmount || 0,
      orderCount: customer.orderCount || 0,
      lastOrderTime: customer.lastOrderTime || ''
    }

    // 客户统计数据将通过 calculateCustomerStats() 方法实时计算

    // 加载标签 - 使用统一的API
    try {
      const response = await customerDetailApi.getCustomerTags(customerId)
      // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
      const tags = response?.data || response || []
      customerTags.value = (Array.isArray(tags) ? tags : []).map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        type: tag.type || 'info'
      }))
      console.log('[客户详情] 加载标签成功:', customerTags.value.length, '个')
    } catch (error) {
      console.error('加载客户标签失败:', error)
      customerTags.value = []
    }

    // 加载疾病史数据
    try {
      const response = await customerDetailApi.getCustomerMedicalHistory(customerId as string)
      // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
      const medicalRecords = response?.data || response || []
      console.log('📋 [疾病史API] 返回数据:', medicalRecords)

      if (Array.isArray(medicalRecords) && medicalRecords.length > 0) {
        medicalHistory.value = medicalRecords.map((record: any) => ({
          id: record.id,
          content: record.content || record.description || '',
          createTime: record.createTime || record.createdAt || '',
          operator: record.operator || record.createdByName || '系统',
          operationType: record.operationType || 'add'
        }))
      } else if (customer.medicalHistory) {
        // API返回空数组但客户有medicalHistory字段，使用它
        console.log('📋 [疾病史] 使用客户字段:', customer.medicalHistory)
        medicalHistory.value = [{
          id: 1,
          content: customer.medicalHistory,
          createTime: customer.createTime || '',
          operator: '系统',
          operationType: 'add'
        }]
      } else {
        medicalHistory.value = []
      }
    } catch (error) {
      console.error('加载疾病史失败:', error)
      // 如果客户有medicalHistory字段，使用它
      if (customer.medicalHistory) {
        console.log('📋 [疾病史] API失败，使用客户字段:', customer.medicalHistory)
        medicalHistory.value = [{
          id: 1,
          content: customer.medicalHistory,
          createTime: customer.createTime || '',
          operator: '系统',
          operationType: 'add'
        }]
      } else {
        medicalHistory.value = []
      }
    }

    // 加载客户地址数据
    await loadCustomerAddresses()

    // 加载客户备注数据
    await loadCustomerNotes()

  } catch (error) {
    console.error('加载客户详情失败:', error)
    ElMessage.error('加载客户详情失败')
  }
}

const loadOrderHistory = async () => {
  loadingOrders.value = true
  try {
    const customerId = route.params.id as string

    // 优先从后端API获取订单数据
    let customerOrders: any[] = []
    try {
      const response = await customerDetailApi.getCustomerOrders(customerId)
      // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
      if (response && response.success && Array.isArray(response.data)) {
        customerOrders = response.data
      } else if (Array.isArray(response)) {
        customerOrders = response
      }
      console.log(`[客户详情] 从API获取到 ${customerOrders.length} 条订单记录`)
    } catch (apiError) {
      console.log('API获取订单失败，尝试从本地store获取')
      // 如果API失败，尝试从本地store获取
      customerOrders = orderStore.orders.filter((order: any) => order.customerId === customerId)
    }

    // 转换为页面显示格式
    // 🔥 修复：使用统一的订单状态配置，显示中文状态
    orderHistory.value = customerOrders.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNumber || order.orderNo,
      products: order.products
        ? (Array.isArray(order.products)
            ? order.products.map((p: any) => p.name || p.productName).join(', ')
            : order.productNames || '暂无商品信息')
        : order.productNames || '暂无商品信息',
      totalAmount: Number(order.totalAmount) || Number(order.amount) || 0,
      status: getOrderStatusTextFromConfig(order.status),
      orderDate: order.createTime || order.orderDate
    }))

    console.log(`[客户详情] 加载到 ${orderHistory.value.length} 条订单记录`)
  } catch (error: any) {
    console.error('加载订单历史失败:', error)
    orderHistory.value = []
  } finally {
    loadingOrders.value = false
  }
}

// 订单状态转换函数
const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待确认',
    'confirmed': '已确认',
    'shipped': '已发货',
    'delivered': '已完成',
    'cancelled': '已取消',
    'draft': '草稿'
  }
  return statusMap[status] || status
}

// 售后服务类型转换函数
const getServiceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'return': '退货',
    'exchange': '换货',
    'repair': '维修',
    'refund': '退款'
  }
  return typeMap[type] || type
}

// 售后服务状态转换函数
const getServiceStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'resolved': '已解决',
    'closed': '已关闭'
  }
  return statusMap[status] || status
}

const loadServiceRecords = async () => {
  loadingService.value = true
  try {
    // 使用统一的API获取客户售后记录
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerServices(customerId)

    // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
    const customerServices = response?.data || response || []
    console.log('[客户详情] 售后记录API返回:', customerServices)

    // 转换为页面显示格式
    serviceRecords.value = (Array.isArray(customerServices) ? customerServices : []).map((service: any) => ({
      id: service.id,
      serviceNo: service.serviceNumber || service.serviceNo,
      orderNo: service.orderNumber || service.orderNo,
      type: getServiceTypeText(service.serviceType || service.type),
      reason: service.reason || service.description || '暂无描述',
      amount: service.price || service.amount || 0,
      status: getServiceStatusText(service.status),
      createTime: service.createTime || service.createdAt
    }))
    console.log('[客户详情] 加载售后记录成功:', serviceRecords.value.length, '条')
  } catch (error: any) {
    console.error('加载售后记录失败:', error)
    // 只有在非404错误时才显示错误提示，404表示没有数据是正常的
    if (!error?.message?.includes('404') && !error?.message?.includes('API端点不存在')) {
      ElMessage.error('加载售后记录失败')
    }
    serviceRecords.value = []
  } finally {
    loadingService.value = false
  }
}

const loadCallRecords = async () => {
  loadingCalls.value = true
  try {
    // 使用统一的API获取客户通话记录
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerCalls(customerId)

    // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
    const customerCalls = response?.data || response || []
    console.log('[客户详情] 通话记录API返回:', customerCalls)

    // 转换为页面显示格式
    callRecords.value = (Array.isArray(customerCalls) ? customerCalls : []).map((call: any) => ({
      id: call.id,
      callType: call.callType === 'outbound' || call.direction === 'outbound' || call.type === '呼出' ? '呼出' : '呼入',
      phone: call.customerPhone || call.phone,
      duration: call.duration ? `${Math.floor(call.duration / 60)}分${call.duration % 60}秒` : '-',
      status: call.callStatus === 'connected' || call.status === 'connected' || call.status === '已接通' ? '已接通' :
              call.callStatus === 'busy' || call.status === 'busy' || call.status === '忙线' ? '忙线' :
              call.callStatus === 'missed' || call.status === 'no_answer' || call.status === '未接听' ? '未接听' :
              call.callStatus === 'failed' || call.status === 'failed' || call.status === '失败' ? '失败' : '未知',
      summary: call.notes || call.summary || call.remark || '-',
      callTime: call.startTime || call.callTime || call.createdAt
    }))
    console.log('[客户详情] 加载通话记录成功:', callRecords.value.length, '条')
  } catch (error: any) {
    console.error('加载通话记录失败:', error)
    // 只有在非404错误时才显示错误提示，404表示没有数据是正常的
    if (!error?.message?.includes('404') && !error?.message?.includes('API端点不存在')) {
      ElMessage.error('加载通话记录失败')
    }
    callRecords.value = []
  } finally {
    loadingCalls.value = false
  }
}

const loadFollowUpRecords = async () => {
  try {
    // 使用统一的API获取客户跟进记录
    const customerId = route.params.id as string
    const response = await customerDetailApi.getCustomerFollowUps(customerId)

    // 🔥 修复：正确处理API返回值格式 { success: true, data: [...] }
    let customerFollowUps: any[] = []
    if (response?.success && Array.isArray(response.data)) {
      customerFollowUps = response.data
    } else if (Array.isArray(response?.data)) {
      customerFollowUps = response.data
    } else if (Array.isArray(response)) {
      customerFollowUps = response
    }
    console.log('[客户详情] 跟进记录API返回:', customerFollowUps)

    // 转换为页面显示格式并检查编辑权限
    followUpRecords.value = customerFollowUps.map((followUp: any) => {
      const createTime = new Date(followUp.createTime || followUp.createdAt)
      const now = new Date()
      const hoursDiff = (now.getTime() - createTime.getTime()) / (1000 * 60 * 60)

      return {
        id: followUp.id,
        type: followUp.type,
        title: followUp.title || followUp.type,
        content: followUp.content,
        createTime: followUp.createTime || followUp.createdAt,
        author: followUp.author || followUp.createdByName || followUp.createdBy || '未知',
        canEdit: hoursDiff <= 24 // 24小时内可编辑
      }
    })
    console.log('[客户详情] 加载跟进记录成功:', followUpRecords.value.length, '条')
  } catch (error: any) {
    console.error('加载跟进记录失败:', error)
    // 只有在非404错误时才显示错误提示，404表示没有数据是正常的
    if (!error?.message?.includes('404') && !error?.message?.includes('API端点不存在')) {
      ElMessage.error('加载跟进记录失败')
    }
    followUpRecords.value = []
  }
}

// 监听路由参数变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadCustomerDetail()
  }
})

// 从API加载客户统计数据
const loadCustomerStats = async () => {
  try {
    const customerId = route.params.id as string
    console.log(`[客户详情] 加载客户 ${customerId} 的统计数据`)

    // 优先从API获取统计数据
    const response = await customerDetailApi.getCustomerStats(customerId)
    // 🔥 修复：正确处理API返回值格式 { success: true, data: {...} }
    const stats = response?.data || response
    if (stats && typeof stats === 'object') {
      customerStats.value = {
        totalConsumption: stats.totalConsumption || 0,
        orderCount: stats.orderCount || 0,
        returnCount: stats.returnCount || 0,
        lastOrderDate: stats.lastOrderDate || ''
      }
      console.log(`[客户详情] 从API获取统计数据成功:`, customerStats.value)
      return
    }
  } catch (error) {
    console.log('[客户详情] API获取统计数据失败，使用本地计算:', error)
  }

  // 如果API失败，使用本地计算作为备选
  calculateCustomerStats()
}

// 计算客户统计数据（本地备选方案）
const calculateCustomerStats = () => {
  const customerId = route.params.id as string
  const allOrders = applyDataScopeControl(orderStore.orders)
  const customerOrders = allOrders.filter(order => order.customerId === customerId)
  const customerServices = serviceStore.services.filter(service => service.customerId === customerId)

  // 计算总消费金额（只计算已确认的订单）
  const totalConsumption = customerOrders
    .filter(order => order.auditStatus === 'approved')
    .reduce((sum, order) => sum + order.totalAmount, 0)

  // 计算订单数量
  const orderCount = customerOrders.length

  // 计算退货数量
  const returnCount = customerServices
    .filter(service => service.serviceType === 'return')
    .length

  // 获取最后一次下单时间
  const lastOrderDate = customerOrders.length > 0
    ? customerOrders.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())[0].createTime
    : ''

  // 更新统计数据
  customerStats.value = {
    totalConsumption,
    orderCount,
    returnCount,
    lastOrderDate
  }
}

// 监听订单store的变化，实现实时同步
watch(() => orderStore.orders, () => {
  const customerId = route.params.id as string
  const allOrders = applyDataScopeControl(orderStore.orders)
  const customerOrders = allOrders.filter(order => order.customerId === customerId)

  // 转换为页面显示格式
  const newOrderHistory = customerOrders.map(order => ({
    id: order.id,
    orderNo: order.orderNumber,
    products: order.products.map(p => p.name).join(', '),
    totalAmount: order.totalAmount,
    status: getOrderStatusText(order.status),
    orderDate: order.createTime
  }))

  // 更新订单历史
  orderHistory.value = newOrderHistory

  // 重新加载客户统计数据
  loadCustomerStats()
}, { deep: true })

// 监听售后store的变化，实现实时同步
watch(() => serviceStore.services, () => {
  const customerId = route.params.id as string
  const customerServices = serviceStore.services.filter(service => service.customerId === customerId)

  // 转换为页面显示格式
  const newServiceRecords = customerServices.map(service => ({
    id: service.id,
    serviceNo: service.serviceNumber,
    orderNo: service.orderNumber,
    type: getServiceTypeText(service.serviceType),
    reason: service.reason,
    amount: service.price || 0,
    status: getServiceStatusText(service.status),
    createTime: service.createTime
  }))

  // 更新售后记录
  serviceRecords.value = newServiceRecords

  // 重新加载客户统计数据
  loadCustomerStats()
}, { deep: true })

onMounted(async () => {
  // 🔥 确保用户列表已加载，用于映射负责销售等信息
  if (!userStore.users || userStore.users.length === 0) {
    try {
      await userStore.loadUsers()
      console.log('[客户详情] 用户列表加载完成，共', userStore.users?.length || 0, '个用户')
    } catch (error) {
      console.warn('[客户详情] 加载用户列表失败:', error)
    }
  }

  loadCustomerDetail()
  loadOrderHistory()
  loadServiceRecords()
  loadCallRecords()
  loadFollowUpRecords()

  // 从API加载客户统计数据
  loadCustomerStats()

  // 监听手机号更新事件
  const handlePhoneUpdate = (event: CustomEvent) => {
    const { customerId } = event.detail
    if (customerId === route.params.id) {
      // 重新加载客户详情以获取最新的手机号信息
      loadCustomerDetail()
      ElMessage.success('检测到手机号更新，已刷新客户信息')
    }
  }

  window.addEventListener('customer-phone-updated', handlePhoneUpdate as EventListener)

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener('customer-phone-updated', handlePhoneUpdate as EventListener)
  })
})
</script>

<style scoped>
/* 子组件已各自包含自己的样式，父组件改为 scoped */
.customer-detail {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.customer-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.customer-title h2 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.edit-btn {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.edit-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* 客户等级标签样式 */
.level-normal {
  background: linear-gradient(135deg, #64748b, #475569);
  color: white;
  border: none;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(100, 116, 139, 0.3);
}

.level-vip {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.level-svip {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  border: none;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.first-row,
.second-row {
  margin-bottom: 20px;
}

.customer-info-card,
.stats-card,
.tab-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  transition: all 0.3s ease;
}

.customer-info-card:hover,
.stats-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 18px;
  color: #495057;
}

.card-title .el-icon {
  font-size: 20px;
  color: #667eea;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.info-display {
  padding: 24px;
}

/* 新的行布局样式 */
.info-row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  align-items: center;
  min-height: 40px;
}

.info-row.full-width {
  flex-direction: column;
  align-items: flex-start;
}

.info-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  margin-right: 24px;
  margin-bottom: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.info-item:last-child {
  margin-right: 0;
}

.info-item .label {
  font-weight: 600;
  color: #374151;
  margin-right: 12px;
  min-width: fit-content;
  font-size: 14px;
}

.info-item .value {
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
}

/* 特殊值样式 */
.name-value {
  color: #0f172a;
  font-weight: 600;
  font-size: 16px;
}

.phone-value {
  color: #059669;
  font-weight: 600;
}

.clickable-phone {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(5, 150, 105, 0.1);
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.clickable-phone:hover {
  background: rgba(5, 150, 105, 0.2);
  border-color: rgba(5, 150, 105, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
}

.phone-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.other-phones {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.other-phone {
  font-size: 13px;
  opacity: 0.9;
}

.order-count {
  color: #dc2626;
  font-weight: 600;
}

.medical-history {
  color: #7c3aed;
  font-weight: 500;
}

.level-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 特殊项目样式调整 */
.level-item {
  flex: 0.8 !important;
  min-width: 120px !important;
}

.email-item {
  flex: 1.5 !important;
  min-width: 250px !important;
}

.phone-item {
  flex: 1.3 !important;
  min-width: 220px !important;
}

/* 全宽项目样式 */
.address-item,
.tags-item,
.goals-item,
.medical-item,
.remark-item {
  width: 100%;
  margin-right: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.address-item .label,
.tags-item .label,
.goals-item .label,
.medical-item .label,
.remark-item .label {
  margin-bottom: 8px;
  color: #374151;
  font-size: 15px;
  font-weight: 600;
}

/* 标签容器样式 */
.tags-container,
.goals-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.customer-tag {
  background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
  color: #0277bd;
  border: 1px solid #81d4fa;
  border-radius: 6px;
  font-weight: 500;
}

.goal-tag {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  color: #2e7d32;
  border: 1px solid #a5d6a7;
  border-radius: 6px;
  font-weight: 500;
}

.other-goals {
  color: #059669;
  font-weight: 500;
  font-style: italic;
  margin-left: 8px;
}

/* 客户统计卡片样式 */
.stats-card {
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stats-card :deep(.el-card__header) {
  padding: 10px 16px;
}

.stats-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e8ecf1;
}
.stats-card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
.stats-card :deep(.el-card__body) {
  padding: 16px 12px 12px;
}

.stats-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 14px;
}

.stat-item {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 24px 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 130px;
  cursor: pointer;
}
.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #3b82f6;
  transition: height 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: #e2e8f0;
}
.stat-item:hover::before { height: 4px; }

.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #3b82f6;
  opacity: 0.85;
}

.stat-content {
  text-align: center;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  letter-spacing: -0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* Tab切换区域样式 */
.tab-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
}

.tab-header .el-tabs__nav {
  margin: 0;
}

.tab-header .el-tab-pane {
  padding: 0;
}

.tab-content {
  padding: 24px;
}

/* 时间轴样式 */
.timeline-container {
  max-height: 400px;
  overflow-y: auto;
}

.timeline-card {
  margin-bottom: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.timeline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.timeline-title {
  font-weight: 700;
  color: #495057;
  font-size: 16px;
}

.timeline-content {
  color: #6c757d;
  line-height: 1.6;
  font-size: 14px;
  margin-bottom: 12px;
}

.timeline-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.timeline-author {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.timeline-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 新的客户信息布局样式 */
.customer-info-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 24px;
}

.customer-info-row:last-child {
  margin-bottom: 0;
}

/* 创建时间行特殊样式 - 4个字段均匀分布 */
.create-time-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 32px;
  align-items: center;
}

.create-time-row .info-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.field-label {
  font-weight: 600;
  color: #374151;
  margin-right: 8px;
  font-size: 14px;
  min-width: fit-content;
}

.field-value {
  color: #6b7280;
  font-size: 14px;
  font-weight: 400;
}

/* 客户编码、姓名和电话行样式 */
.code-section {
  flex: 0 0 auto;
  margin-right: 40px;
}

.name-section {
  flex: 0 0 auto;
  margin-right: 40px;
}

/* 客户编码显示样式 */
.customer-code-display {
  display: inline-flex;
  align-items: center;
  color: #374151;
  font-weight: 600;
  font-size: 15px;
  background: #f8fafc;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-left: 8px;
  transition: all 0.2s ease;
  height: 32px;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

.customer-code-display:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.customer-code-display:active {
  transform: translateY(0);
  background: #cbd5e1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* 客户姓名显示样式 */
.customer-name-display {
  display: inline-flex;
  align-items: center;
  color: #374151;
  font-weight: 600;
  font-size: 15px;
  background: #f8fafc;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-left: 8px;
  transition: all 0.2s ease;
  height: 32px;
  box-sizing: border-box;
}


/* 手机号横向显示容器 */
.phone-container-horizontal {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.phone-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 32px;
  box-sizing: border-box;
}

.phone-display:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.phone-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.phone-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.phone-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.phone-number {
  color: #374151;
  font-weight: 500;
}

.call-icon {
  color: #10b981;
  cursor: pointer;
  transition: color 0.2s ease;
}

.call-icon:hover {
  color: #059669;
}

/* 标签行布局样式 - 使用flex均匀分布 */
.tags-row-flex {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.tags-row-flex .flex-item {
  flex: 1;
  min-width: 0;
}

.tags-row-flex .flex-item-wide {
  flex: 1.5;
  min-width: 0;
}

.customer-tags-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.customer-tags-inline .el-tag {
  margin: 0;
}

.tags-row {
  display: flex;
  align-items: center;
}

.tags-section {
  flex: 0 0 40%;
  margin-right: 30px;
}

/* 紧凑版标签区域 */
.tags-section-compact {
  flex: 0 0 25%;
  margin-right: 20px;
}

.info-group-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.info-item.compact {
  min-width: auto;
  white-space: nowrap;
}

.info-item.compact .field-label {
  margin-right: 6px;
  font-size: 13px;
}

.info-item.compact .field-value {
  font-size: 13px;
}

.customer-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.customer-tags .el-tag {
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.medical-history-content {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 12px;
  color: #92400e;
  font-size: 14px;
  line-height: 1.5;
  margin-top: 4px;
}

.address-content {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 12px;
  color: #0c4a6e;
  font-size: 14px;
  line-height: 1.5;
  margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .info-item {
    min-width: 180px;
    margin-right: 16px;
  }

  .customer-info-row {
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .customer-detail {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 20px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .page-title {
    font-size: 24px;
  }

  .stats-row .el-col {
    margin-bottom: 16px;
  }

  .stat-item {
    padding: 20px;
  }

  .stat-value {
    font-size: 24px;
  }

  .info-display {
    padding: 20px;
  }

  .info-row {
    flex-direction: column;
  }

  .info-item {
    width: 100%;
    margin-right: 0;
    margin-bottom: 12px;
  }

  .tab-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}

/* 疾病史相关样式 */
.medical-history-section {
  width: 100%;
}

.latest-medical-info {
  margin-bottom: 12px;
}

.medical-record {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 8px;
}

.medical-record.history-record {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.medical-content {
  flex: 1;
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
}

.medical-date {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}

.medical-operator {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
  margin-left: 8px;
}

.medical-history-toggle {
  margin-bottom: 12px;
}

.toggle-btn {
  padding: 4px 8px !important;
  font-size: 12px !important;
  color: #6366f1 !important;
}

.medical-history-list {
  margin-bottom: 16px;
}

.add-medical-section {
  margin-top: 16px;
}

.add-medical-btn {
  margin-bottom: 12px;
}

.add-medical-form {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.medical-input {
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.no-medical-info {
  padding: 20px;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
}

.empty-text {
  color: #9ca3af;
  font-size: 14px;
}

/* 客户备注相关样式 */
.notes-item {
  width: 100%;
}

.notes-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.notes-text {
  flex: 1;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
  min-height: 20px;
  word-break: break-word;
}

.edit-notes-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  color: #6366f1;
}

.edit-notes-btn:hover {
  background: #f0f0ff;
}

.notes-edit {
  width: 100%;
}

.notes-input {
  margin-bottom: 12px;
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 改善问题字段特殊样式 */
.improvement-goals {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-goals {
  color: #9ca3af;
  font-style: italic;
  margin-left: 8px;
}

/* 客户日志样式 */
.customer-logs-container {
  padding: 16px 0;
}

.log-timestamp {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.log-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
  padding-left: 0;
}

.log-meta-separator {
  color: #c0c4cc;
}

.log-type-tag {
  margin-left: auto;
}

.log-operator-name {
  color: #909399;
  font-weight: 500;
}

.log-time {
  color: #909399;
}

.log-item {
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.log-item:hover {
  background: #f0f2f5;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.log-operator {
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.log-content {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.logs-load-more {
  text-align: center;
  padding: 16px 0;
}

/* 地址管理样式 */
.full-width-row {
  flex-basis: 100% !important;
  width: 100% !important;
}

.full-width-item {
  flex: 1 1 100% !important;
  min-width: 100% !important;
  width: 100% !important;
  max-width: 100% !important;
  margin-right: 0 !important;
  align-items: flex-start !important;
  flex-direction: column !important;
}

.full-width-item .field-label {
  margin-bottom: 8px;
}

.address-management-section,
.notes-management-section,
.medical-history-section {
  flex: 1;
  width: 100%;
}

.address-record {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.address-record.history-record {
  background: #fafafa;
}

.address-text {
  display: inline;
  color: #303133;
  font-size: 14px;
  line-height: 1.5;
}

.address-inline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.note-inline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.record-right-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 12px;
  color: #909399;
}

.record-right-info .delete-btn {
  color: #F56C6C;
}

.address-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.address-date {
  color: #909399;
}

.address-operator {
  color: #409EFF;
  font-weight: 500;
}

.address-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.address-actions .delete-btn {
  color: #F56C6C;
}

.address-edit-inline {
  padding: 8px 0;
  width: 100%;
}

.address-edit-inline .form-actions {
  margin-top: 8px;
  text-align: right;
}

.add-address-form {
  margin-top: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  width: 100%;
}

.address-history-toggle {
  margin: 4px 0;
}

.add-address-section {
  margin-bottom: 8px;
}

.add-address-btn {
  border-radius: 6px;
}

.no-address-info {
  padding: 4px 0;
}

/* 日志详细变更样式 */
.log-changes {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
}

.change-item {
  padding: 2px 0;
  line-height: 1.6;
}

.change-field {
  color: #409EFF;
  font-weight: 500;
}

.change-old {
  color: #F56C6C;
  text-decoration: line-through;
}

.change-arrow {
  color: #909399;
  margin: 0 4px;
}

.change-new {
  color: #67C23A;
  font-weight: 500;
}

.log-source {
  margin-top: 6px;
}

/* 备注管理样式 */
.notes-management-section .add-notes-form {
  margin-top: 8px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.note-record {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.note-record.history-record {
  background: #fafafa;
}

.note-content-text {
  display: inline;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}


.note-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.note-actions {
  display: flex;
  gap: 4px;
}

.note-date {
  color: #909399;
}

.note-actions .delete-btn {
  color: #F56C6C;
}

.note-edit-inline {
  padding: 8px 0;
  width: 100%;
}

.note-edit-inline .form-actions {
  margin-top: 8px;
  text-align: right;
}

.notes-history-toggle {
  margin: 4px 0;
}

.add-notes-section {
  margin-bottom: 8px;
}

.edit-form-hint {
  color: #909399;
  font-size: 13px;
  font-style: italic;
}

.sensitive-edit-field {
  width: 100%;
}
.sensitive-edit-field .el-input {
  width: 100%;
}
</style>

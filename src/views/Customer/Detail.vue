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

          <!-- 第四行：客户标签、客户生日、进粉时间、负责销售 -->
          <div class="customer-info-row tags-row">
            <div class="info-item tags-section-compact">
              <span class="field-label">客户标签</span>
              <div v-if="customerInfo.tags && customerInfo.tags.length > 0" class="customer-tags">
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
            <div class="info-item compact">
              <span class="field-label">客户生日</span>
              <span class="field-value">{{ customerInfo.birthday || '暂无' }}</span>
            </div>
            <div class="info-group-right">
              <div class="info-item compact">
                <span class="field-label">进粉时间</span>
                <span class="field-value">{{ customerInfo.joinTime || '暂无' }}</span>
              </div>
              <div class="info-item compact">
                <span class="field-label">负责销售</span>
                <span class="field-value">{{ customerInfo.salesperson || '暂无' }}</span>
              </div>
              <div class="info-item compact">
                <span class="field-label">改善问题</span>
                <span class="field-value improvement-goals">
                  <span v-if="customerInfo.improvementGoals && customerInfo.improvementGoals.length > 0">
                    {{ customerInfo.improvementGoals.join('、') }}
                  </span>
                  <span v-else class="no-goals">暂无</span>
                </span>
              </div>
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
              <div class="address-content">{{ customerInfo.address || '暂无' }}</div>
            </div>
          </div>

          <!-- 第七行：客户疾病史 -->
          <div class="customer-info-row">
            <div class="info-item medical-item">
              <span class="field-label">疾病史</span>
              <div class="medical-history-section">
                <!-- 最新疾病信息 -->
                <div class="latest-medical-info" v-if="medicalHistory.length > 0">
                  <div class="medical-record">
                    <span class="medical-content">{{ medicalHistory[0].content }}</span>
                    <span class="medical-date">{{ formatDate(medicalHistory[0].createTime) }}</span>
                    <span class="medical-operator">{{ medicalHistory[0].operator }}</span>
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
                      <span class="medical-date">{{ formatDate(record.createTime) }}</span>
                      <span class="medical-operator">{{ record.operator }}</span>
                    </div>
                  </div>
                </el-collapse-transition>

                <!-- 新增疾病信息 -->
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

                <!-- 无疾病史提示 -->
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
                    @click="saveNotes"
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
        <el-row :gutter="24" class="stats-row">
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
              <el-table-column prop="orderNo" label="订单号" width="160" show-overflow-tooltip />
              <el-table-column prop="products" label="商品" min-width="200" show-overflow-tooltip />
              <el-table-column prop="totalAmount" label="订单金额" width="110">
                <template #default="{ row }">
                  <span class="amount">¥{{ row.totalAmount.toLocaleString() }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="订单状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusTagType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="orderDate" label="下单时间" width="160" show-overflow-tooltip />
              <el-table-column label="操作" width="180" fixed="right">
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
              <el-table-column prop="serviceNo" label="售后单号" width="160" show-overflow-tooltip />
              <el-table-column prop="orderNo" label="关联订单" width="160" show-overflow-tooltip />
              <el-table-column prop="type" label="售后类型" width="90">
                <template #default="{ row }">
                  <el-tag :type="getServiceType(row.type)" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="reason" label="售后原因" min-width="180" show-overflow-tooltip />
              <el-table-column prop="amount" label="退款金额" width="100">
                <template #default="{ row }">
                  <span class="amount" v-if="row.amount">¥{{ row.amount.toLocaleString() }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="处理状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="getServiceStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="申请时间" width="160" show-overflow-tooltip />
              <el-table-column label="操作" width="140" fixed="right">
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
              <el-table-column prop="callType" label="通话类型" width="90">
                <template #default="{ row }">
                  <el-tag :type="row.callType === '呼出' ? 'success' : 'info'" size="small">{{ row.callType }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="电话号码" width="130">
                <template #default="{ row }">
                  {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="通话时长" width="100" />
              <el-table-column prop="status" label="通话状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="getCallStatusType(row.status)" size="small">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="summary" label="通话摘要" min-width="180" show-overflow-tooltip />
              <el-table-column prop="callTime" label="通话时间" width="160" show-overflow-tooltip />
              <el-table-column label="操作" width="180" fixed="right">
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
                  :timestamp="item.createTime"
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

    <!-- 短信发送对话框 -->
    <el-dialog v-model="showSMSDialog" title="发送短信" width="600px">
      <el-form :model="smsForm" :rules="smsRules" ref="smsFormRef" label-width="100px">
        <el-form-item label="接收号码" prop="phone">
          <el-select v-model="smsForm.phone" placeholder="请选择客户号码" filterable>
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
        <el-form-item label="短信模板" prop="templateId">
          <div class="template-select-wrapper">
            <el-select
              v-model="smsForm.templateId"
              placeholder="请选择短信模板"
              @change="onTemplateChange"
              style="flex: 1; margin-right: 10px;"
            >
              <el-option
                v-for="template in smsTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              />
            </el-select>
            <el-button
              type="primary"
              :icon="DocumentAdd"
              @click="handleApplyTemplate"
              class="apply-template-btn"
              title="申请新模板"
            >
              申请模板
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="模板预览" v-if="selectedTemplate">
          <div class="template-preview">
            <div class="preview-title">{{ selectedTemplate.name }}</div>
            <div class="preview-content">{{ previewContent }}</div>
            <div class="preview-note">注：实际发送时会替换模板变量</div>
          </div>
        </el-form-item>
        <el-form-item label="模板变量" v-if="selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0">
          <div class="template-variables">
            <div v-for="variable in selectedTemplate.variables" :key="variable.key" class="variable-item">
              <label>{{ variable.label }}：</label>
              <el-input
                v-model="smsForm.variables[variable.key]"
                :placeholder="variable.placeholder || `请输入${variable.label}`"
                size="small"
              />
            </div>
          </div>
        </el-form-item>
        <el-form-item label="发送限制">
          <div class="send-limit-info">
            <el-alert
              :title="`今日已发送：${userSmsStats.todayCount}/1 条，本月已发送：${userSmsStats.monthCount}/5 条`"
              type="info"
              :closable="false"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSMSDialog = false">取消</el-button>
        <el-button @click="sendSMS" type="primary" :loading="sendingSMS" :disabled="!canSendSMS">发送短信</el-button>
      </template>
    </el-dialog>

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
import { User, DataAnalysis, Search, Phone, ChatDotRound, Edit, ShoppingCart, Plus, ArrowLeft, EditPen, ShoppingBag, RefreshLeft, Clock, Money, InfoFilled, ArrowDown, ArrowUp, Message, DocumentAdd, Download, Share } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useCallStore } from '@/stores/call'

import { displaySensitiveInfo } from '@/utils/sensitive'
import { permissionService, CallPermissionType } from '@/services/permission'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { copyToClipboard } from '@/utils/customerCode'
import CreateTemplateDialog from '@/components/CreateTemplateDialog.vue'
import { createSafeNavigator } from '@/utils/navigation'
import { customerDetailApi } from '@/api/customerDetail'
import { customerApi } from '@/api/customer'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
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
  notes: ''
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
  improvementGoals: [] as string[]  // 改善问题
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
const editingNotes = ref(false)
const editNotesText = ref('')
const savingNotes = ref(false)

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
const handleSendSMS = () => {
  // 检查客户是否有手机号
  if (!customerInfo.value.phone && (!customerInfo.value.otherPhones || customerInfo.value.otherPhones.length === 0)) {
    ElMessage.warning('该客户没有手机号码，无法发送短信')
    return
  }

  // 初始化表单
  smsForm.phone = customerInfo.value.phone || (customerInfo.value.otherPhones && customerInfo.value.otherPhones[0]) || ''
  smsForm.templateId = ''
  smsForm.variables = {}

  // 加载短信模板和用户统计
  loadSMSTemplates()
  loadUserSMSStats()

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
    selectedTemplate.value.variables.forEach(variable => {
      smsForm.variables[variable.key] = variable.defaultValue || ''
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
      variables: smsForm.variables,
      content: previewContent.value
    }

    // 调用发送API（这里先模拟）
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('短信发送成功，等待审核')
    showSMSDialog.value = false

    // 刷新统计数据
    loadUserSMSStats()

  } catch (error) {
    console.error('发送短信失败:', error)
    ElMessage.error('发送短信失败，请重试')
  } finally {
    sendingSMS.value = false
  }
}

// 加载短信模板
const loadSMSTemplates = async () => {
  try {
    // 这里先使用模拟数据
    smsTemplates.value = [
      {
        id: '1',
        name: '客户问候模板',
        content: '尊敬的{customerName}，感谢您选择我们的服务！如有任何问题，请随时联系我们。',
        variables: [
          { key: 'customerName', label: '客户姓名', placeholder: '请输入客户姓名', defaultValue: customerInfo.value.name }
        ],
        status: 'approved'
      },
      {
        id: '2',
        name: '预约提醒模板',
        content: '尊敬的{customerName}，您预约的{serviceName}将在{appointmentTime}开始，请准时到达。',
        variables: [
          { key: 'customerName', label: '客户姓名', placeholder: '请输入客户姓名', defaultValue: customerInfo.value.name },
          { key: 'serviceName', label: '服务名称', placeholder: '请输入服务名称' },
          { key: 'appointmentTime', label: '预约时间', placeholder: '请输入预约时间' }
        ],
        status: 'approved'
      },
      {
        id: '3',
        name: '活动通知模板',
        content: '亲爱的{customerName}，我们有新的优惠活动：{activityName}，详情请咨询客服。',
        variables: [
          { key: 'customerName', label: '客户姓名', placeholder: '请输入客户姓名', defaultValue: customerInfo.value.name },
          { key: 'activityName', label: '活动名称', placeholder: '请输入活动名称' }
        ],
        status: 'approved'
      }
    ]
  } catch (error) {
    console.error('加载短信模板失败:', error)
    ElMessage.error('加载短信模板失败')
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
  Object.assign(editForm, customerInfo.value)
  phoneNumbers.value = customerInfo.value.otherPhones || []
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
  Object.assign(editForm, customerInfo.value)
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
  Object.assign(editForm, customerInfo.value)
  phoneNumbers.value = []
  showAddPhone.value = false
  newPhoneNumber.value = ''
}

const saveCustomerInfo = async () => {
  saving.value = true
  try {
    const customerId = route.params.id as string

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
      address: editForm.address,
      salesperson: editForm.salesperson,
      fanAcquisitionTime: editForm.joinTime,
      improvementGoals: editForm.improvementGoals,
      otherPhones: phoneNumbers.value
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
      ElMessage.success('保存成功')

      // 刷新客户数据
      await loadCustomerDetail()
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
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newRecord = {
      id: Date.now(),
      content: newMedicalRecord.value.trim(),
      createTime: new Date().toISOString(),
      operator: '当前用户', // 实际应用中应该是当前登录用户
      operationType: 'add'
    }

    // 新记录添加到数组开头（最新的在前面）
    medicalHistory.value.unshift(newRecord)

    newMedicalRecord.value = ''
    showAddMedical.value = false
    ElMessage.success('疾病信息添加成功')
  } catch (error) {
    ElMessage.error('添加失败，请重试')
  } finally {
    addingMedical.value = false
  }
}

const cancelAddMedical = () => {
  newMedicalRecord.value = ''
  showAddMedical.value = false
}

// 客户备注管理方法
const startEditNotes = () => {
  editNotesText.value = customerInfo.value.notes || ''
  editingNotes.value = true
}

const cancelEditNotes = () => {
  editNotesText.value = ''
  editingNotes.value = false
}

const saveNotes = async () => {
  savingNotes.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 更新客户信息中的备注
    customerInfo.value.notes = editNotesText.value.trim()

    editingNotes.value = false
    editNotesText.value = ''
    ElMessage.success('客户备注保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    savingNotes.value = false
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
  safeNavigator.push({
    path: '/order/add',
    query: {
      customerId: route.params.id,
      customerName: customerInfo.value.name,
      customerPhone: customerInfo.value.phone,
      customerEmail: customerInfo.value.email,
      customerAddress: customerInfo.value.address
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
      notes: customer.notes || customer.remark || customer.remarks || ''
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
  margin-bottom: 24px;
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
  color: #475569;
  margin-right: 12px;
  min-width: 80px;
  font-size: 14px;
  white-space: nowrap;
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

.edit-form {
  margin-top: 10px;
  padding: 24px;
}

.edit-form .el-form-item {
  margin-bottom: 20px;
}

.phone-management {
}

/* 其他手机号表单项样式 - 标签不换行 */
.other-phone-item :deep(.el-form-item__label) {
  white-space: nowrap;
}

.phone-management .phone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.phone-management .phone-tag {
  margin-right: 8px;
}

.phone-management .add-phone {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 添加手机号按钮样式 */
.phone-management .el-button--primary.is-plain {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #6366f1;
  font-weight: 500;
}

.phone-management .el-button--primary.is-plain:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #5855eb;
}

.stats-row {
  padding: 0;
  background: transparent;
  margin-bottom: 32px;
}

.stat-item {
  position: relative;
  padding: 32px 24px;
  background: white;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  text-align: center;
  cursor: pointer;
}

.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--stat-color);
  transition: height 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: #e2e8f0;
}

.stat-item:hover::before {
  height: 6px;
}

.stat-item:nth-child(1) {
  --stat-color: #3b82f6;
}

.stat-item:nth-child(2) {
  --stat-color: #10b981;
}

.stat-item:nth-child(3) {
  --stat-color: #f59e0b;
}

.stat-item:nth-child(4) {
  --stat-color: #8b5cf6;
}

.stat-icon {
  font-size: 40px;
  margin-bottom: 16px;
  display: block;
  color: var(--stat-color);
  opacity: 0.9;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 15px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}



.tab-content {
  padding: 24px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.timeline-container {
  max-height: 600px;
  overflow-y: auto;
}

.timeline-card {
  margin-bottom: 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.timeline-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
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
  font-size: 12px;
  color: #adb5bd;
  font-weight: 500;
}

.timeline-author {
  font-weight: 500;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.tag-item {
  position: relative;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.tag-item:hover {
  transform: scale(1.05);
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
  background: white;
}

:deep(.el-table__header-wrapper) {
  background: #fafbfc;
}

:deep(.el-table th) {
  background: transparent;
  color: #374151;
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e2e8f0;
  padding: 20px 16px;
}

:deep(.el-table tr) {
  transition: all 0.2s ease;
}

:deep(.el-table tr:hover) {
  background: #f8fafc;
  transform: scale(1.001);
}

:deep(.el-table td) {
  border-bottom: 1px solid #f1f5f9;
  padding: 16px;
  font-size: 14px;
  color: #475569;
}

:deep(.el-table .el-button) {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 8px;
  font-weight: 600;
}

/* 按钮样式优化 */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
  box-shadow: none;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-button--primary) {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

:deep(.el-button--primary:hover) {
  background: #5855eb;
  border-color: #5855eb;
}

:deep(.el-button--success) {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

:deep(.el-button--success:hover) {
  background: #059669;
  border-color: #059669;
}

:deep(.el-button--warning) {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

:deep(.el-button--warning:hover) {
  background: #d97706;
  border-color: #d97706;
}

:deep(.el-button--danger) {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

:deep(.el-button--danger:hover) {
  background: #dc2626;
  border-color: #dc2626;
}

/* 标签页样式优化 */
:deep(.el-tabs__header) {
  margin-bottom: 24px;
  border-bottom: none;
}

:deep(.el-tabs__nav-wrap) {
  background: #f8fafc;
  border-radius: 12px;
  padding: 6px;
  box-shadow: none;
  border: none;
  display: flex;
}

:deep(.el-tabs__nav) {
  display: flex;
  width: 100%;
}

:deep(.el-tabs__item) {
  border-radius: 8px;
  font-weight: 500;
  color: #64748b;
  border: none;
  padding: 10px 20px;
  margin: 0 2px;
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
}

:deep(.el-tabs__item:hover) {
  background: transparent;
  color: #475569;
}

:deep(.el-tabs__item.is-active) {
  background: transparent;
  color: #6366f1;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

/* 确保标签页文字完全居中 */
:deep(.el-tabs__item .el-tabs__item-label) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 移除可能的默认边距和填充 */
:deep(.el-tabs__nav-scroll) {
  overflow: visible;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

/* 搜索框样式 */
:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: #cbd5e1;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 卡片样式 */
:deep(.el-card) {
  border-radius: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

:deep(.el-card:hover) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 跟进记录锁定样式 */
.locked-tip {
  color: #f59e0b;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
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

.phone-section {
  flex: 1;
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

/* 标签行布局样式 */
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
}
</style>

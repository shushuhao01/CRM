<template>
  <div class="service-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button
          type="primary"
          :icon="ArrowLeft"
          @click="handleBack"
          class="back-btn"
        >
          返回
        </el-button>
        <div class="title-section">
          <h1 class="page-title">售后详情</h1>
          <div class="service-status">
            <el-tag
              :type="getStatusType(serviceInfo.status)"
              size="large"
              effect="dark"
            >
              {{ getStatusText(serviceInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canEdit"
          type="primary"
          :icon="Edit"
          @click="handleEdit"
        >
          编辑
        </el-button>
        <el-button
          v-if="canProcess"
          type="success"
          @click="handleProcess"
        >
          处理
        </el-button>
        <el-button
          v-if="canClose"
          type="warning"
          @click="handleClose"
        >
          关闭
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧主要信息 -->
      <el-col :span="16">
        <!-- 基本信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>基本信息</h3>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <label>售后单号：</label>
              <span class="value">{{ serviceInfo.serviceNumber }}</span>
            </div>
            <div class="info-item">
              <label>原订单号：</label>
              <el-link
                type="primary"
                @click="handleViewOrder"
                class="value-link"
              >
                {{ serviceInfo.orderNumber }}
              </el-link>
            </div>
            <div class="info-item">
              <label>服务类型：</label>
              <span class="value">{{ getServiceTypeText(serviceInfo.serviceType) }}</span>
            </div>
            <div class="info-item">
              <label>优先级：</label>
              <el-tag :type="getPriorityType(serviceInfo.priority)">
                {{ getPriorityText(serviceInfo.priority) }}
              </el-tag>
            </div>
            <div class="info-item">
              <label>申请时间：</label>
              <span class="value">{{ serviceInfo.createTime }}</span>
            </div>
            <div class="info-item">
              <label>处理人员：</label>
              <span class="value">{{ serviceInfo.assignedTo || '未分配' }}</span>
            </div>
            <div class="info-item">
              <label>创建售后者：</label>
              <span class="value">{{ getCreatorName(serviceInfo.createdBy) }}</span>
            </div>
            <div class="info-item">
              <label>销售人员：</label>
              <span class="value">{{ orderDetail?.createdByName || orderDetail?.salesPerson || getCreatorName(orderDetail?.createdBy) || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>订单状态：</label>
              <el-tag v-if="orderDetail" :type="getOrderStatusType(orderDetail.status)" size="small">
                {{ getOrderStatusText(orderDetail.status) }}
              </el-tag>
              <span v-else class="value">未关联</span>
            </div>
            <div class="info-item">
              <label>签收状态：</label>
              <span class="value">
                <el-tag v-if="orderDetail?.status === 'delivered' || orderDetail?.status === 'completed'" type="success" size="small">已签收</el-tag>
                <el-tag v-else-if="orderDetail?.status === 'rejected'" type="danger" size="small">已拒收</el-tag>
                <el-tag v-else-if="orderDetail?.status === 'shipped'" type="warning" size="small">运输中</el-tag>
                <el-tag v-else type="info" size="small">{{ orderDetail ? '未签收' : '未知' }}</el-tag>
              </span>
            </div>
          </div>
        </el-card>

        <!-- 处理结果（已解决/已关闭时显示） -->
        <el-card v-if="serviceInfo.status === 'resolved' || serviceInfo.status === 'closed'" class="info-card resolution-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>处理结果</h3>
              <el-tag v-if="serviceInfo.resolvedTime" type="success" size="small" effect="dark">
                {{ serviceInfo.resolvedTime }}
              </el-tag>
            </div>
          </template>
          <div class="info-grid">
            <div class="info-item" v-if="serviceInfo.resolutionType">
              <label>解决方案：</label>
              <el-tag type="success" effect="dark" size="small">{{ getResolutionTypeText(serviceInfo.resolutionType) }}</el-tag>
            </div>
            <div class="info-item" v-if="serviceInfo.refundAmount > 0">
              <label>退款金额：</label>
              <span class="value resolution-refund">¥{{ Number(serviceInfo.refundAmount).toFixed(2) }}</span>
              <el-tag v-if="serviceInfo.refundType" size="small" style="margin-left: 8px;">
                {{ serviceInfo.refundType === 'full' ? '全额退款' : '部分退款' }}
              </el-tag>
            </div>
            <div class="info-item" v-if="serviceInfo.resolutionProduct">
              <label>处理商品：</label>
              <span class="value">{{ serviceInfo.resolutionProduct }}</span>
            </div>
            <div class="info-item" v-if="serviceInfo.resolutionRemark">
              <label>处理备注：</label>
              <span class="value">{{ serviceInfo.resolutionRemark }}</span>
            </div>
            <div class="info-item" v-if="serviceInfo.assignedTo">
              <label>处理人员：</label>
              <span class="value">{{ serviceInfo.assignedTo }}</span>
            </div>
          </div>
        </el-card>

        <!-- 客户信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>客户信息</h3>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <label>客户姓名：</label>
              <el-link
                type="primary"
                @click="handleViewCustomer"
                class="value-link"
              >
                {{ serviceInfo.customerName }}
              </el-link>
            </div>
            <div class="info-item">
              <label>联系电话：</label>
              <span class="value">
                <el-link
                  type="primary"
                  :icon="Phone"
                  @click="handleCallCustomer"
                >
                  {{ displaySensitiveInfoNew(serviceInfo.customerPhone, SensitiveInfoType.PHONE) }}
                </el-link>
              </span>
            </div>
            <div class="info-item" style="grid-column: 1 / -1;">
              <label>联系地址：</label>
              <span class="value">
                <span v-if="canViewDetails">{{ serviceInfo.contactAddress || orderDetail?.shippingAddress || orderDetail?.receiverAddress || customerLatestAddress || '暂无' }}</span>
                <span v-else class="restricted-info">地址信息受限</span>
              </span>
            </div>
            <div class="info-item">
              <label>联系人：</label>
              <span class="value">{{ serviceInfo.contactName }}</span>
            </div>
          </div>
        </el-card>

        <!-- 商品信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>商品信息</h3>
            </div>
          </template>

          <div class="product-info">
            <div class="product-item">
              <div v-if="orderProductImage" class="product-image">
                <el-image
                  :src="orderProductImage"
                  fit="cover"
                  style="width: 80px; height: 80px; border-radius: 8px;"
                  :preview-src-list="[orderProductImage]"
                  :preview-teleported="true"
                >
                  <template #error>
                    <div class="image-placeholder">
                      <el-icon :size="24"><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div class="product-details">
                <h4>{{ serviceInfo.productName }}</h4>
                <p class="product-spec">规格：{{ serviceInfo.productSpec || '无' }}</p>
                <div class="product-meta">
                  <span>数量：{{ serviceInfo.quantity }}</span>
                  <span>单价：¥{{ Number(serviceInfo.price || 0).toFixed(2) }}</span>
                </div>
                <div class="product-financial">
                  <span v-if="orderDetail?.deposit != null">定金：<strong style="color: #e6a23c">¥{{ Number(orderDetail.deposit || 0).toFixed(2) }}</strong></span>
                  <span v-if="orderDetail?.codAmount != null || orderDetail?.collectAmount != null">
                    代收：<strong style="color: #f56c6c">¥{{ Number(orderDetail.codAmount || orderDetail.collectAmount || 0).toFixed(2) }}</strong>
                  </span>
                  <span>
                    总价：<strong style="color: #409eff">¥{{ Number(orderDetail?.totalAmount || (serviceInfo.price * serviceInfo.quantity) || 0).toFixed(2) }}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 问题描述 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>问题描述</h3>
            </div>
          </template>

          <div class="description-content">
            <div class="reason-section">
              <div class="section-label">
                <el-icon class="label-icon"><Warning /></el-icon>
                <span class="label-text">问题原因</span>
              </div>
              <div class="section-body reason-body">
                <el-tag type="warning" size="default" effect="dark">{{ getReasonText(serviceInfo.reason) }}</el-tag>
              </div>
            </div>
            <div class="description-section">
              <div class="section-label">
                <el-icon class="label-icon"><Document /></el-icon>
                <span class="label-text">详细描述</span>
              </div>
              <div class="section-body description-body">
                {{ serviceInfo.description }}
              </div>
            </div>
            <div v-if="serviceInfo.remark" class="remark-section">
              <div class="section-label">
                <el-icon class="label-icon"><ChatLineSquare /></el-icon>
                <span class="label-text">备注信息</span>
              </div>
              <div class="section-body remark-body">
                {{ serviceInfo.remark }}
              </div>
            </div>
          </div>
        </el-card>

        <!-- 跟进记录 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>跟进记录</h3>
              <el-button
                type="primary"
                size="small"
                :icon="Plus"
                @click="handleAddFollowUp"
              >
                添加跟进
              </el-button>
            </div>
          </template>

          <div class="follow-up-content">
            <!-- 没有记录时的提示 -->
            <el-empty
              v-if="followUpRecords.length === 0"
              description="暂无跟进记录"
              :image-size="80"
            />

            <!-- 跟进记录列表 -->
            <div v-else class="follow-up-list">
              <!-- 最新一条记录(始终显示) -->
              <div
                v-if="followUpRecords.length > 0"
                class="follow-up-item latest"
              >
                <div class="follow-up-header">
                  <div class="follow-up-time">
                    <el-icon><Clock /></el-icon>
                    {{ followUpRecords[0].followUpTime }}
                  </div>
                  <div class="follow-up-user">
                    {{ getOperatorName(followUpRecords[0].createdBy) }}
                  </div>
                </div>
                <div class="follow-up-body">
                  <p>{{ followUpRecords[0].content }}</p>
                </div>
              </div>

              <!-- 历史记录(折叠显示) -->
              <el-collapse v-if="followUpRecords.length > 1" v-model="followUpCollapseActive">
                <el-collapse-item name="history">
                  <template #title>
                    <span class="history-title">
                      查看历史记录 ({{ followUpRecords.length - 1 }}条)
                    </span>
                  </template>
                  <div
                    v-for="(record, index) in followUpRecords.slice(1)"
                    :key="record.id"
                    class="follow-up-item"
                  >
                    <div class="follow-up-header">
                      <div class="follow-up-time">
                        <el-icon><Clock /></el-icon>
                        {{ record.followUpTime }}
                      </div>
                      <div class="follow-up-user">
                        {{ getOperatorName(record.createdBy) }}
                      </div>
                    </div>
                    <div class="follow-up-body">
                      <p>{{ record.content }}</p>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-card>

        <!-- 附件信息 -->
        <el-card v-if="serviceInfo.attachments && serviceInfo.attachments.length" class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>相关附件</h3>
            </div>
          </template>

          <div class="attachments-grid">
            <div
              v-for="(file, index) in serviceInfo.attachments"
              :key="index"
              class="attachment-item"
            >
              <!-- 图片类型显示缩略图 -->
              <template v-if="isImage(file.name || file.url || file)">
                <el-image
                  :src="getFileUrl(file)"
                  :preview-src-list="imagePreviewList"
                  :initial-index="getImageIndex(file)"
                  fit="cover"
                  class="attachment-thumbnail"
                  :preview-teleported="true"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon size="24"><Picture /></el-icon>
                      <span>加载失败</span>
                    </div>
                  </template>
                </el-image>
                <div class="file-info">
                  <p class="file-name">{{ getFileName(file) }}</p>
                  <p class="file-size">{{ formatFileSize(file.size) }}</p>
                </div>
              </template>
              <!-- 非图片类型显示图标 -->
              <template v-else>
                <div class="file-icon" @click="previewFile(file)">
                  <el-icon size="24"><Document /></el-icon>
                </div>
                <div class="file-info">
                  <p class="file-name">{{ getFileName(file) }}</p>
                  <p class="file-size">{{ formatFileSize(file.size) }}</p>
                </div>
              </template>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧操作区域 -->
      <el-col :span="8">
        <!-- 处理进度 -->
        <el-card class="progress-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>处理进度</h3>
            </div>
          </template>

          <el-timeline>
            <el-timeline-item
              v-for="(step, index) in displayedSteps"
              :key="index"
              :timestamp="step?.time || ''"
              :type="step?.type || 'info'"
              :icon="step?.icon"
            >
              <div class="timeline-content">
                <h4>{{ step?.title || '未知步骤' }}</h4>
                <p>{{ step?.description || '' }}</p>
                <p v-if="step?.operator" class="operator">操作人：{{ getOperatorName(step.operator) }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-if="processSteps.length > 2" class="progress-toggle">
            <el-button
              text
              type="primary"
              size="small"
              @click="progressExpanded = !progressExpanded"
            >
              {{ progressExpanded ? '收起进度' : `展开全部 (${processSteps.length}条)` }}
              <el-icon class="toggle-icon" :class="{ expanded: progressExpanded }">
                <ArrowDown />
              </el-icon>
            </el-button>
          </div>
        </el-card>

        <!-- 快速操作 -->
        <el-card class="action-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>快速操作</h3>
            </div>
          </template>

          <div class="quick-actions">
            <el-button
              v-if="canAssign"
              type="primary"
              :icon="User"
              @click="assignHandler"
              :disabled="serviceInfo.status === 'closed'"
              class="action-btn"
            >
              分配处理人
            </el-button>
            <el-button
              v-if="canProcess"
              type="success"
              :icon="Check"
              @click="updateStatus"
              :disabled="serviceInfo.status === 'closed'"
              class="action-btn"
            >
              更新状态
            </el-button>
            <el-button
              v-if="canEdit"
              type="warning"
              :icon="Edit"
              @click="handleEdit"
              class="action-btn"
            >
              编辑售后
            </el-button>
            <el-button
              v-if="canClose"
              type="danger"
              :icon="Close"
              @click="handleClose"
              class="action-btn"
            >
              关闭售后
            </el-button>
          </div>
        </el-card>

        <!-- 相关信息 -->
        <el-card class="related-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>相关信息</h3>
            </div>
          </template>

          <div class="related-info">
            <div class="related-item">
              <label>创建人：</label>
              <span>{{ getCreatorName(serviceInfo.createdBy) }}</span>
            </div>
            <div class="related-item">
              <label>最后更新：</label>
              <span>{{ serviceInfo.updateTime }}</span>
            </div>
            <div class="related-item">
              <label>预计完成：</label>
              <span>{{ serviceInfo.expectedTime || '未设定' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分配处理人对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配处理人"
      width="500px"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="分配方式">
          <el-radio-group v-model="assignForm.assignType">
            <el-radio label="user">指定用户</el-radio>
            <el-radio label="department">部门随机</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="筛选部门" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.filterDepartmentId"
            placeholder="全部部门"
            clearable
            style="width: 100%"
            @change="handleDepartmentFilterChange"
          >
            <el-option label="全部部门" value="" />
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择用户" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.userId"
            placeholder="请选择处理人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in filteredUserOptions"
              :key="user.id"
              :label="`${user.name} (${user.department || '未分配部门'})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择部门" v-if="assignForm.assignType === 'department'">
          <el-select
            v-model="assignForm.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注(可选)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="assignLoading">
          确定分配
        </el-button>
      </template>
    </el-dialog>

    <!-- 状态更新对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新状态"
      width="560px"
    >
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="新状态">
          <el-select v-model="statusForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>

        <!-- 已解决时显示解决方案选项 -->
        <template v-if="statusForm.status === 'resolved'">
          <el-divider content-position="left">处理结果</el-divider>

          <el-form-item label="解决方案" required>
            <el-select v-model="statusForm.resolutionType" placeholder="请选择解决方案" style="width: 100%">
              <el-option label="退货退款" value="return_refund" />
              <el-option label="退货补货" value="return_replenish" />
              <el-option label="更换产品" value="exchange" />
              <el-option label="维修" value="repair" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>

          <!-- 退货退款：显示退款金额和退款类型 -->
          <template v-if="statusForm.resolutionType === 'return_refund'">
            <el-form-item label="退款类型" required>
              <el-radio-group v-model="statusForm.refundType">
                <el-radio :label="'full'">全额退款</el-radio>
                <el-radio :label="'partial'">部分退款</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="statusForm.refundType === 'partial'" label="退款金额" required>
              <el-input
                v-model="statusForm.refundAmount"
                type="text"
                placeholder="请输入退款金额"
                style="width: 200px;"
                @input="handleRefundAmountInput"
              >
                <template #append>元</template>
              </el-input>
              <div style="color: #909399; font-size: 12px; margin-top: 4px;">订单金额：¥{{ Number(serviceInfo.price || 0).toFixed(2) }}</div>
            </el-form-item>
            <el-form-item v-if="statusForm.refundType === 'full'" label="退款金额">
              <span style="color: #f56c6c; font-weight: 600;">¥{{ Number(serviceInfo.price || 0).toFixed(2) }}（全额）</span>
            </el-form-item>
          </template>

          <!-- 退货补货/更换产品：显示商品选择 -->
          <template v-if="statusForm.resolutionType === 'return_replenish' || statusForm.resolutionType === 'exchange'">
            <el-form-item label="处理商品" required>
              <el-select
                v-model="statusForm.resolutionProduct"
                filterable
                allow-create
                default-first-option
                placeholder="选择在售商品或输入自定义商品名称"
                style="width: 100%"
              >
                <el-option
                  v-for="item in productOptions"
                  :key="item.id"
                  :label="item.name + (item.spec ? ` (${item.spec})` : '')"
                  :value="item.name"
                />
              </el-select>
            </el-form-item>
          </template>

          <!-- 维修：显示维修说明 -->
          <template v-if="statusForm.resolutionType === 'repair'">
            <el-form-item label="维修说明">
              <el-input
                v-model="statusForm.resolutionRemark"
                type="textarea"
                :rows="2"
                placeholder="请输入维修情况说明"
              />
            </el-form-item>
          </template>

          <!-- 其他：显示自定义说明 -->
          <template v-if="statusForm.resolutionType === 'other'">
            <el-form-item label="处理说明">
              <el-input
                v-model="statusForm.resolutionRemark"
                type="textarea"
                :rows="2"
                placeholder="请输入处理结果说明"
              />
            </el-form-item>
          </template>

          <!-- 退货退款和退货补货也显示备注 -->
          <el-form-item v-if="statusForm.resolutionType === 'return_refund' || statusForm.resolutionType === 'return_replenish'" label="处理备注">
            <el-input
              v-model="statusForm.resolutionRemark"
              type="textarea"
              :rows="2"
              placeholder="可选，输入处理备注"
            />
          </el-form-item>
        </template>

        <el-form-item label="处理说明">
          <el-input
            v-model="statusForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 外呼对话框 -->
    <el-dialog v-model="callDialogVisible" title="发起外呼" width="500px">
      <el-form :model="callForm" label-width="80px">
        <el-form-item label="电话号码">
          <el-input :model-value="displaySensitiveInfoNew(callForm.phone, SensitiveInfoType.PHONE)" disabled />
        </el-form-item>
        <el-form-item label="通话目的">
          <el-select v-model="callForm.purpose" placeholder="请选择" style="width: 100%">
            <el-option label="售后跟进" value="service" />
            <el-option label="客户回访" value="callback" />
            <el-option label="问题确认" value="confirm" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="callForm.note" type="textarea" rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="callDialogVisible = false">取消</el-button>
        <el-button @click="startCall" type="primary" :loading="calling">开始通话</el-button>
      </template>
    </el-dialog>

    <!-- 添加跟进记录对话框 -->
    <el-dialog
      v-model="followUpDialogVisible"
      title="添加跟进记录"
      width="600px"
    >
      <el-form :model="followUpForm" label-width="100px">
        <el-form-item label="跟进时间" required>
          <el-date-picker
            v-model="followUpForm.followUpTime"
            type="datetime"
            placeholder="选择跟进时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="跟进内容" required>
          <el-input
            v-model="followUpForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入跟进内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveFollowUp">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Picture,
  Document,
  User,
  Clock,
  Check,
  Close,
  Plus,
  Phone,
  Warning,
  ChatLineSquare,
  ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useServiceStore } from '@/stores/service'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { useDepartmentStore } from '@/stores/department'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { createSafeNavigator } from '@/utils/navigation'
import { serviceApi } from '@/api/service'
import { orderApi } from '@/api/order'
import { customerApi } from '@/api/customer'
import { productApi } from '@/api/product'
import { getOrderStatusText as getUnifiedOrderStatusText, getOrderStatusTagType as getUnifiedOrderStatusType } from '@/utils/orderStatusConfig'

// 路由相关
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const userStore = useUserStore()
const serviceStore = useServiceStore()
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()
const departmentStore = useDepartmentStore()

// 响应式数据
const loading = ref(false)
const assignDialogVisible = ref(false)
const statusDialogVisible = ref(false)
const progressExpanded = ref(false)

// 售后信息(初始化为空,从store或API加载)
const serviceInfo = reactive({
  id: '',
  serviceNumber: '',
  orderId: '',
  orderNumber: '',
  customerId: '',
  serviceType: 'return',
  status: 'pending',
  priority: 'normal',
  customerName: '',
  customerPhone: '',
  contactName: '',
  contactAddress: '',
  productName: '',
  productSpec: '',
  quantity: 0,
  price: 0,
  reason: '',
  description: '',
  remark: '',
  handleResult: '',
  assignedTo: '',
  assignedToId: '',
  createdBy: '',
  createdById: '',
  createTime: '',
  updateTime: '',
  expectedTime: '',
  resolvedTime: '',
  attachments: [] as Array<{ name: string; size: number; url: string } | string>
})

// 关联订单信息（从订单数据加载）
const orderDetail = ref<any>(null)
// 客户最新收货地址（从客户API获取）
const customerLatestAddress = ref('')

// 处理步骤(从售后记录动态生成)
const processSteps = ref<Array<{
  title: string
  description: string
  time: string
  type: string
  icon: unknown
  operator?: string
}>>([])

// 默认显示最新2条进度，展开后显示全部
const displayedSteps = computed(() => {
  // 倒序显示：最新记录在上方
  const reversed = [...processSteps.value].reverse()
  if (progressExpanded.value || reversed.length <= 2) {
    return reversed
  }
  return reversed.slice(0, 2)
})

// 分配表单
const assignForm = reactive({
  assignType: 'user',
  filterDepartmentId: '',
  userId: '',
  departmentId: '',
  assignedTo: '',
  remark: ''
})

// 分配加载状态
const assignLoading = ref(false)

// 状态表单
const statusForm = reactive({
  status: '',
  handleResult: '',  // 处理结果
  remark: '',
  // 处理结果相关字段
  resolutionType: '',     // 解决方案类型
  refundAmount: 0,        // 退款金额
  refundType: '',         // 退款类型 full/partial
  resolutionProduct: '',  // 处理商品
  resolutionRemark: ''    // 处理备注
})

// 退款金额输入处理：仅允许数字和两位小数，超过订单金额自动截断为订单金额
const handleRefundAmountInput = (val: string) => {
  // 只保留数字和小数点，小数最多两位
  let cleaned = val.replace(/[^\d.]/g, '').replace(/^(\d*\.\d{0,2}).*$/, '$1')
  // 多个小数点只保留第一个
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  // 超过订单金额自动更正
  const maxAmount = Number(serviceInfo.price || 0)
  if (maxAmount > 0) {
    const numVal = Number(cleaned)
    if (!isNaN(numVal) && numVal > maxAmount) {
      cleaned = maxAmount.toFixed(2)
    }
  }
  statusForm.refundAmount = cleaned as any
}

// 在售商品列表（用于更换产品/退货补货选择）
const productOptions = ref<Array<{ id: string; name: string; spec?: string; price?: number }>>([])
const loadProductOptions = async () => {
  try {
    const res = await productApi.getActiveList({ pageSize: 200 })
    productOptions.value = (res.list || []).map((p: any) => ({
      id: p.id,
      name: p.name || p.productName || '',
      spec: p.spec || p.productSpec || '',
      price: p.price || 0
    }))
  } catch (e) {
    console.error('加载商品列表失败:', e)
    productOptions.value = []
  }
}

// 跟进记录相关
const followUpRecords = ref<Array<{
  id: string
  followUpTime: string
  content: string
  createdBy: string
  createTime: string
}>>([])

const followUpCollapseActive = ref<string[]>([])
const followUpDialogVisible = ref(false)
const followUpForm = reactive({
  followUpTime: '',
  content: ''
})

// 外呼相关
const callDialogVisible = ref(false)
const calling = ref(false)
const callForm = reactive({
  phone: '',
  purpose: 'service',
  note: ''
})

// 用户选项 - 从userStore获取,修复字段映射
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const userOptions = computed(() => {
  const users = userStore.users || []
  return users
    .filter((user: any) => !user.status || user.status === 'active')
    .map((user: any) => {
      const name = user.name || user.username || user.realName || `用户${user.id}`
      const department = user.departmentName || user.department || user.deptName || '未分配部门'

      return {
        id: user.id,
        name: name,
        department: department
      }
    })
})

// 部门选项 - 从departmentStore获取
const departmentOptions = computed(() => {
  const departments = departmentStore.departments || []
  return departments.map((dept: any) => ({
    id: dept.id,
    name: dept.name
  }))
})

// 根据部门筛选的用户选项
const filteredUserOptions = computed(() => {
  if (!assignForm.filterDepartmentId) {
    return userOptions.value
  }

  const dept = departmentOptions.value.find((d: any) => d.id === assignForm.filterDepartmentId)
  if (!dept) {
    return userOptions.value
  }

  return userOptions.value.filter((u: any) => {
    return u.department === dept.name ||
           u.department === dept.id ||
           (u.department && u.department.includes(dept.name))
  })
})

// 获取当前服务类型的处理结果选项
const currentHandleResults = computed(() => {
  try {
    // 从localStorage获取服务类型配置
    const serviceTypesStr = localStorage.getItem('crm_service_types')
    if (!serviceTypesStr) {
      return []
    }

    const serviceTypes = JSON.parse(serviceTypesStr)
    const currentType = serviceTypes.find((t: any) => t.value === serviceInfo.serviceType)

    if (!currentType || !currentType.handleResults) {
      return []
    }

    // 确保每个处理结果都有完整的字段
    return currentType.handleResults.map((result: any) => ({
      value: result?.value || '',
      label: result?.label || result?.title || '未知',
      title: result?.title || result?.label || '未知'
    }))
  } catch (error) {
    console.error('获取处理结果选项失败:', error)
    return []
  }
})

// 部门筛选变化处理
const handleDepartmentFilterChange = () => {
  assignForm.userId = ''
}

// 权限控制
const canEdit = computed(() => {
  // 超级管理员或有编辑权限的用户，或者是分配给自己的售后单
  return userStore.canEditAfterSales ||
         (serviceInfo.assignedTo === userStore.currentUser?.name && userStore.hasAfterSalesPermission('service:write'))
})

const canProcess = computed(() => {
  // 必须有处理权限，且售后单状态允许处理
  return userStore.canProcessAfterSales &&
         serviceInfo.status !== 'closed' &&
         serviceInfo.status !== 'resolved'
})

const canClose = computed(() => {
  // 必须有关闭权限，且售后单状态为已解决
  return userStore.canCloseAfterSales &&
         serviceInfo.status === 'resolved'
})

// 新增：分配权限检查
const canAssign = computed(() => {
  // 超级管理员或有分配权限的用户
  return userStore.isAdmin || userStore.hasAfterSalesPermission('service:assign')
})

// 新增：查看权限检查（用于控制敏感信息显示）
const canViewDetails = computed(() => {
  // 至少要有读取权限
  return userStore.hasAfterSalesPermission('service:read')
})

// 方法定义
/**
 * 返回上一页
 */
const handleBack = () => {
  router.back()
}

/**
 * 编辑售后
 */
const handleEdit = () => {
  safeNavigator.push(`/service/edit/${serviceInfo.id}`)
}

/**
 * 处理售后
 */
const handleProcess = () => {
  statusDialogVisible.value = true
  statusForm.status = serviceInfo.status
  // 重置处理结果字段
  statusForm.resolutionType = ''
  statusForm.refundAmount = 0
  statusForm.refundType = ''
  statusForm.resolutionProduct = ''
  statusForm.resolutionRemark = ''
  statusForm.remark = ''
  // 加载在售商品列表
  loadProductOptions()
}

/**
 * 关闭售后
 */
const handleClose = () => {
  ElMessageBox.confirm(
    '确定要关闭此售后申请吗？',
    '确认关闭',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 调用API关闭售后（后端会自动发送通知）
      await serviceApi.updateStatus(serviceInfo.id, 'closed', '手动关闭')
      serviceInfo.status = 'closed'

      // 🔥 注意：关闭通知已由后端API自动发送，无需前端重复发送

      ElMessage.success('售后申请已关闭')
    } catch (error) {
      console.error('关闭售后失败:', error)
      ElMessage.error('关闭售后失败')
    }
  })
}

/**
 * 查看客户详情
 */
const handleViewCustomer = () => {
  // 根据客户姓名或ID跳转到客户详情页面
  // 这里需要根据实际的客户ID来跳转
  if (serviceInfo.customerId) {
    safeNavigator.push(`/customer/detail/${serviceInfo.customerId}`)
  } else {
    ElMessage.warning('客户信息不完整,无法跳转')
  }
}

/**
 * 查看订单详情
 */
const handleViewOrder = () => {
  // 根据订单号跳转到订单详情页面
  if (serviceInfo.orderId) {
    safeNavigator.push(`/order/detail/${serviceInfo.orderId}`)
  } else if (serviceInfo.orderNumber) {
    // 如果没有orderId,尝试用orderNumber
    safeNavigator.push(`/order/detail/${serviceInfo.orderNumber}`)
  } else {
    ElMessage.warning('订单信息不完整,无法跳转')
  }
}

/**
 * 拨打电话(弹出外呼对话框)
 */
const handleCallCustomer = () => {
  callForm.phone = serviceInfo.customerPhone
  callForm.purpose = 'service'
  callForm.note = `售后单号: ${serviceInfo.serviceNumber}`
  callDialogVisible.value = true
}

/**
 * 开始通话
 */
const startCall = async () => {
  if (!callForm.phone) {
    ElMessage.warning('请输入电话号码')
    return
  }

  if (!callForm.purpose) {
    ElMessage.warning('请选择通话目的')
    return
  }

  calling.value = true
  try {
    // 这里应该调用外呼API
    // 模拟外呼
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('外呼成功,正在接通...')
    callDialogVisible.value = false

    // 可以记录通话记录
    console.log('外呼记录:', {
      phone: callForm.phone,
      purpose: callForm.purpose,
      note: callForm.note,
      serviceNumber: serviceInfo.serviceNumber,
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('外呼失败:', error)
    ElMessage.error('外呼失败')
  } finally {
    calling.value = false
  }
}

/**
 * 分配处理人
 */
const assignHandler = () => {
  assignDialogVisible.value = true
  assignForm.assignedTo = serviceInfo.assignedTo
}

/**
 * 确认分配
 */
const confirmAssign = async () => {
  let assignedToName = ''

  if (assignForm.assignType === 'user') {
    if (!assignForm.userId) {
      ElMessage.warning('请选择处理人')
      return
    }
    const user = userOptions.value.find((u: any) => u.id === assignForm.userId)
    if (!user) {
      ElMessage.error('找不到选择的用户')
      return
    }
    assignedToName = user.name
  } else {
    if (!assignForm.departmentId) {
      ElMessage.warning('请选择部门')
      return
    }

    const dept = departmentOptions.value.find((d: any) => d.id === assignForm.departmentId)
    if (!dept) {
      ElMessage.error('找不到选择的部门')
      return
    }

    const deptUsers = userOptions.value.filter((u: unknown) => {
      return u.department === dept.name ||
             u.department === dept.id ||
             (u.department && u.department.includes(dept.name))
    })

    if (deptUsers.length === 0) {
      ElMessage.warning(`部门"${dept.name}"下没有可分配的用户`)
      return
    }

    const randomUser = deptUsers[Math.floor(Math.random() * deptUsers.length)]
    assignedToName = randomUser.name
  }

  assignLoading.value = true
  try {
    // 调用API分配处理人（无论指定用户还是部门随机，都传递userId）
    const assignedToId = assignForm.assignType === 'user'
      ? assignForm.userId
      : userOptions.value.find((u: any) => u.name === assignedToName)?.id
    await serviceApi.assign(serviceInfo.id, assignedToName, assignedToId, assignForm.remark)

    serviceInfo.assignedTo = assignedToName

    // 🔥 注意：分配通知已由后端API自动发送，无需前端重复发送

    ElMessage.success('分配成功')
    assignDialogVisible.value = false

    // 添加处理步骤
    processSteps.value.push({
      title: '重新分配处理人',
      description: `已分配给${assignedToName}处理`,
      time: new Date().toLocaleString(),
      type: 'success',
      icon: User,
      operator: userStore.currentUser?.name || '系统'
    })
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

/**
 * 更新状态
 */
const updateStatus = () => {
  statusDialogVisible.value = true
}

/**
 * 确认状态更新
 */
const confirmStatusUpdate = async () => {
  if (!statusForm.status) {
    ElMessage.warning('请选择状态')
    return
  }

  // 已解决时验证解决方案
  if (statusForm.status === 'resolved') {
    if (!statusForm.resolutionType) {
      ElMessage.warning('请选择解决方案')
      return
    }
    if (statusForm.resolutionType === 'return_refund') {
      if (!statusForm.refundType) {
        ElMessage.warning('请选择退款类型')
        return
      }
      if (statusForm.refundType === 'partial') {
        const amt = Number(statusForm.refundAmount)
        if (!amt || isNaN(amt) || amt <= 0) {
          ElMessage.warning('请输入有效的退款金额')
          return
        }
        // 校验最多两位小数
        const strAmt = String(statusForm.refundAmount)
        if (strAmt.includes('.') && strAmt.split('.')[1].length > 2) {
          ElMessage.warning('退款金额最多保留两位小数')
          return
        }
        if (amt > Number(serviceInfo.price || 0)) {
          ElMessage.warning('退款金额不能超过订单金额')
          return
        }
      }
    }
    if ((statusForm.resolutionType === 'return_replenish' || statusForm.resolutionType === 'exchange') && !statusForm.resolutionProduct) {
      ElMessage.warning('请输入处理商品')
      return
    }
  }

  try {
    // 构造处理结果数据
    const resolutionData: any = {}
    if (statusForm.status === 'resolved' && statusForm.resolutionType) {
      resolutionData.resolutionType = statusForm.resolutionType
      if (statusForm.resolutionType === 'return_refund') {
        resolutionData.refundType = statusForm.refundType
        if (statusForm.refundType === 'full') {
          resolutionData.refundAmount = Number(serviceInfo.price) || 0
        } else {
          resolutionData.refundAmount = statusForm.refundAmount
        }
      }
      if (statusForm.resolutionProduct) resolutionData.resolutionProduct = statusForm.resolutionProduct
      if (statusForm.resolutionRemark) resolutionData.resolutionRemark = statusForm.resolutionRemark
    }

    // 调用API更新状态
    await serviceApi.updateStatus(serviceInfo.id, statusForm.status, statusForm.remark, resolutionData)

    serviceInfo.status = statusForm.status
    // 更新本地处理结果数据
    if (statusForm.status === 'resolved') {
      if (resolutionData.resolutionType) serviceInfo.resolutionType = resolutionData.resolutionType
      if (resolutionData.refundAmount !== undefined) serviceInfo.refundAmount = resolutionData.refundAmount
      if (resolutionData.refundType) serviceInfo.refundType = resolutionData.refundType
      if (resolutionData.resolutionProduct) serviceInfo.resolutionProduct = resolutionData.resolutionProduct
      if (resolutionData.resolutionRemark) serviceInfo.resolutionRemark = resolutionData.resolutionRemark
    }
    statusDialogVisible.value = false

    ElMessage.success('状态更新成功')

    // 添加处理步骤
    const resolutionTypeMap: Record<string, string> = {
      return_refund: '退货退款', return_replenish: '退货补货',
      exchange: '更换产品', repair: '维修', other: '其他'
    }
    let resultText = ''
    if (statusForm.resolutionType) {
      resultText = resolutionTypeMap[statusForm.resolutionType] || statusForm.resolutionType
      if (statusForm.resolutionType === 'return_refund' && resolutionData.refundAmount > 0) {
        resultText += ` ¥${Number(resolutionData.refundAmount).toFixed(2)}${statusForm.refundType === 'full' ? '(全额)' : '(部分)'}`
      }
    }

    const description = [
      statusForm.remark,
      resultText ? `处理结果: ${resultText}` : '',
      !statusForm.remark && !resultText ? `状态更新为${getStatusText(statusForm.status)}` : ''
    ].filter(Boolean).join(' - ')

    processSteps.value.push({
      title: '状态更新',
      description: description,
      time: new Date().toLocaleString(),
      type: 'primary',
      icon: Clock,
      operator: userStore.currentUser?.name || '系统'
    })
  } catch (error) {
    console.error('状态更新失败:', error)
    ElMessage.error('状态更新失败')
  }
}

/**
 * 添加备注
 */
const addRemark = () => {
  ElMessageBox.prompt('请输入备注信息', '添加备注', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea'
  }).then(({ value }) => {
    if (value) {
      ElMessage.success('备注添加成功')
      // 添加处理步骤
      processSteps.value.push({
        title: '添加备注',
        description: value,
        time: new Date().toLocaleString(),
        type: 'info',
        icon: Edit,
        operator: userStore.currentUser?.name || '系统'
      })
    }
  })
}

/**
 * 导出报告
 */
const exportReport = () => {
  ElMessage.success('报告导出功能开发中...')
}

/**
 * 预览文件
 */
const previewFile = (file: { name: string; url: string; size: number }) => {
  ElMessage.info(`预览文件：${file.name}`)
}

/**
 * 判断是否为图片
 */
const isImage = (fileOrName: string | { name?: string; url?: string }) => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  let filename = ''

  if (typeof fileOrName === 'string') {
    filename = fileOrName
  } else if (fileOrName?.name) {
    filename = fileOrName.name
  } else if (fileOrName?.url) {
    filename = fileOrName.url
  }

  if (!filename) return false
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExts.includes(ext)
}

/**
 * 格式化文件大小
 */
const formatFileSize = (size: number) => {
  if (!size) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 获取文件URL
 */
const getFileUrl = (file: string | { name?: string; url?: string }) => {
  if (typeof file === 'string') {
    return file
  }
  return file?.url || ''
}

/**
 * 获取文件名
 */
const getFileName = (file: string | { name?: string; url?: string }) => {
  if (typeof file === 'string') {
    // 从URL中提取文件名
    const parts = file.split('/')
    return parts[parts.length - 1] || '未知文件'
  }
  return file?.name || '未知文件'
}

/**
 * 获取所有图片的URL列表（用于预览）
 */
const imagePreviewList = computed(() => {
  if (!serviceInfo.attachments || !serviceInfo.attachments.length) {
    return []
  }
  return serviceInfo.attachments
    .filter((file: any) => isImage(file))
    .map((file: any) => getFileUrl(file))
})

/**
 * 获取图片在预览列表中的索引
 */
const getImageIndex = (file: any) => {
  const url = getFileUrl(file)
  return imagePreviewList.value.indexOf(url)
}

/**
 * 获取状态类型
 */
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statusMap[status] || '未知'
}

// 处理结果类型中文映射
const getResolutionTypeText = (type: string) => {
  const map: Record<string, string> = {
    'return_refund': '退货退款',
    'return_replenish': '退货补货',
    'exchange': '更换产品',
    'repair': '维修',
    'other': '其他'
  }
  return map[type] || type
}

/**
 * 获取服务类型文本
 */
const getServiceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    return: '退货',
    exchange: '换货',
    repair: '维修',
    refund: '退款',
    complaint: '投诉'
  }
  return typeMap[type] || '其他'
}

/**
 * 获取订单状态文本（使用系统订单管理生命周期的统一状态配置）
 */
const getOrderStatusText = (status: string) => {
  return getUnifiedOrderStatusText(status)
}

/**
 * 获取订单状态标签类型
 */
const getOrderStatusType = (status: string) => {
  return getUnifiedOrderStatusType(status)
}

/**
 * 获取申请原因中文文本
 */
const getReasonText = (reason: string) => {
  if (!reason) return '未知原因'
  const map: Record<string, string> = {
    quality: '商品质量问题', quality_issue: '商品质量问题',
    damaged: '商品损坏',
    size: '尺寸不合适', size_issue: '尺寸问题',
    color: '颜色不符', color_issue: '颜色不符',
    malfunction: '功能故障',
    wrong_item: '发错商品',
    unsatisfied: '不满意', not_satisfied: '不满意',
    not_as_described: '描述不符',
    logistics_damage: '物流损坏',
    defective: '商品缺陷',
    expired: '商品过期',
    other: '其他'
  }
  return map[reason] || reason
}

/**
 * 获取优先级类型
 */
const getPriorityType = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return priorityMap[priority] || 'info'
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return priorityMap[priority] || '未知'
}

/**
 * 获取创建人姓名
 * 如果createdBy是手机号或用户ID,则查找对应的用户姓名
 */
const getCreatorName = (createdBy: string) => {
  if (!createdBy) return '未知'

  // 如果是手机号格式(11位数字)
  if (/^\d{11}$/.test(createdBy)) {
    const user = userOptions.value.find((u: any) => u.phone === createdBy || u.id === createdBy)
    return user?.name || createdBy
  }

  // 如果是用户ID
  const user = userOptions.value.find((u: any) => u.id === createdBy)
  if (user) {
    return user.name
  }

  // 否则直接返回(可能已经是姓名)
  return createdBy
}

/**
 * 获取操作人姓名
 * 用于处理进度中的操作人显示
 */
const getOperatorName = (operator: string) => {
  if (!operator) return '系统'

  // 如果是手机号格式(11位数字)
  if (/^\d{11}$/.test(operator)) {
    const user = userOptions.value.find((u: unknown) => u.phone === operator || u.id === operator)
    return user?.name || operator
  }

  // 如果是用户ID
  const user = userOptions.value.find((u: unknown) => u.id === operator)
  if (user) {
    return user.name
  }

  // 否则直接返回(可能已经是姓名)
  return operator
}

/**
 * 加载售后详情
 */
const loadServiceDetail = async () => {
  loading.value = true
  try {
    const serviceId = route.params.id as string

    if (!serviceId) {
      ElMessage.error('售后ID不能为空')
      router.back()
      return
    }

    console.log('[售后详情] 加载售后记录:', serviceId)

    // 始终从API获取数据
    try {
      const data = await serviceApi.getDetail(serviceId)
      Object.assign(serviceInfo, data)
      console.log('[售后详情] API获取成功:', serviceInfo)
    } catch (apiError) {
      console.warn('[售后详情] API获取失败,尝试从store获取:', apiError)
      // API失败时回退到store
      const service = serviceStore.getServiceById(serviceId)
      if (!service) {
        ElMessage.error('售后记录不存在')
        router.back()
        return
      }
      Object.assign(serviceInfo, service)
    }

    // 加载关联订单信息
    await loadOrderDetail()

    // 加载客户最新收货地址
    await loadCustomerAddress()

    // 生成处理步骤
    generateProcessSteps()
  } catch (error) {
    console.error('[售后详情] 加载失败:', error)
    ElMessage.error('加载售后详情失败')
    router.back()
  } finally {
    loading.value = false
  }
}

/**
 * 加载关联订单详情
 */
const loadOrderDetail = async () => {
  try {
    if (!serviceInfo.orderId && !serviceInfo.orderNumber) return

    const orderId = serviceInfo.orderId || serviceInfo.orderNumber

    // 优先调用API获取实时订单数据（确保订单状态为系统生命周期状态）
    try {
      const response = await orderApi.getDetail(orderId)
      if (response.success && response.data) {
        orderDetail.value = response.data
        console.log('[售后详情] API加载关联订单成功:', response.data.orderNumber)
        return
      }
    } catch (apiError) {
      console.warn('[售后详情] API加载订单失败，尝试从本地获取:', apiError)
    }

    // API失败时从 orderStore 查找
    let order = orderStore.orders?.find((o: any) =>
      o.id === orderId || o.orderNumber === serviceInfo.orderNumber
    )

    if (!order) {
      // 尝试从 localStorage 获取
      try {
        const raw = localStorage.getItem('crm_store_order')
        if (raw) {
          const parsed = JSON.parse(raw)
          const orders = parsed?.data?.orders || parsed?.orders || (Array.isArray(parsed) ? parsed : [])
          order = orders.find((o: any) =>
            o.id === orderId || o.orderNumber === serviceInfo.orderNumber
          )
        }
      } catch (e) {
        console.warn('[售后详情] 解析订单缓存失败:', e)
      }
    }

    if (order) {
      orderDetail.value = order
      console.log('[售后详情] 本地关联订单加载成功:', order.orderNumber)
    }
  } catch (error) {
    console.warn('[售后详情] 加载订单详情失败:', error)
  }
}

/**
 * 加载客户最新收货地址
 */
const loadCustomerAddress = async () => {
  customerLatestAddress.value = ''
  if (!serviceInfo.customerId) return
  try {
    const res = await customerApi.getDetail(serviceInfo.customerId)
    const customer = (res as any)?.data || res
    if (customer?.address) {
      customerLatestAddress.value = customer.address
    }
  } catch (e) {
    console.warn('[售后详情] 获取客户最新地址失败:', e)
  }
}

/**
 * 获取订单商品图片
 */
const orderProductImage = computed(() => {
  if (!orderDetail.value) return ''
  const products = orderDetail.value.products || orderDetail.value.items || []
  if (products.length > 0) {
    return products[0].image || products[0].imageUrl || products[0].img || ''
  }
  return ''
})

/**
 * 生成处理步骤 - 完整的四阶段时间轴
 * 创建 → 分配 → 处理中 → 已完成（处理结果）
 */
const generateProcessSteps = async () => {
  const steps: Array<{
    title: string
    description: string
    time: string
    type: string
    icon: unknown
    operator?: string
  }> = []

  // 尝试从API获取操作记录，以获得准确的时间点
  let operationLogs: any[] = []
  try {
    const serviceId = route.params.id as string
    if (serviceId) {
      operationLogs = await serviceApi.getOperationLogs(serviceId)
    }
  } catch (e) {
    console.warn('[售后详情] 获取操作日志失败:', e)
  }

  // 查找特定操作类型的日志
  const findLog = (type: string) => operationLogs.find(
    (l: any) => l.operationType === type || l.operationContent?.includes(type)
  )

  // 1. 创建阶段 - 始终显示
  steps.push({
    title: '售后申请提交',
    description: `客户提交${getServiceTypeText(serviceInfo.serviceType)}申请`,
    time: serviceInfo.createTime,
    type: 'success',
    icon: Check,
    operator: serviceInfo.createdBy
  })

  // 2. 分配阶段
  const assignLog = findLog('assign') || findLog('分配')
  if (serviceInfo.assignedTo) {
    steps.push({
      title: '分配处理人',
      description: `已分配给 ${serviceInfo.assignedTo} 处理`,
      time: assignLog?.createTime || serviceInfo.updateTime || serviceInfo.createTime,
      type: 'success',
      icon: User,
      operator: assignLog?.operatorName || '系统'
    })
  } else if (serviceInfo.status === 'pending') {
    steps.push({
      title: '等待分配',
      description: '等待分配处理人',
      time: '',
      type: 'info',
      icon: User
    })
  }

  // 3. 处理中阶段
  const processLog = findLog('processing') || findLog('处理')
  if (['processing', 'resolved', 'closed'].includes(serviceInfo.status)) {
    steps.push({
      title: '处理中',
      description: `${serviceInfo.assignedTo || '处理人员'}正在处理售后问题`,
      time: processLog?.createTime || serviceInfo.updateTime || serviceInfo.createTime,
      type: serviceInfo.status === 'processing' ? 'primary' : 'success',
      icon: Clock,
      operator: serviceInfo.assignedTo || '系统'
    })
  } else if (serviceInfo.assignedTo && serviceInfo.status !== 'pending') {
    steps.push({
      title: '待处理',
      description: '等待处理人员处理',
      time: '',
      type: 'info',
      icon: Clock
    })
  }

  // 4. 完成阶段
  const resolveLog = findLog('resolved') || findLog('解决') || findLog('completed') || findLog('完成')
  if (serviceInfo.status === 'resolved' || serviceInfo.status === 'closed') {
    const handleResultText = serviceInfo.handleResult ? getHandleResultText(serviceInfo.handleResult) : ''
    steps.push({
      title: serviceInfo.status === 'resolved' ? '已解决' : '已关闭',
      description: [
        serviceInfo.status === 'resolved' ? '售后问题已解决' : '售后申请已关闭',
        handleResultText ? `处理结果：${handleResultText}` : ''
      ].filter(Boolean).join('，'),
      time: serviceInfo.resolvedTime || resolveLog?.createTime || serviceInfo.updateTime || '',
      type: serviceInfo.status === 'resolved' ? 'success' : 'info',
      icon: serviceInfo.status === 'resolved' ? Check : Close,
      operator: resolveLog?.operatorName || serviceInfo.assignedTo || '系统'
    })
  }

  processSteps.value = steps
}

/**
 * 获取处理结果文本
 */
const getHandleResultText = (result: string) => {
  if (!result) return ''
  const map: Record<string, string> = {
    refunded: '已退款', replaced: '已换货', repaired: '已维修',
    rejected: '已拒绝', compensated: '已赔偿', other: '其他'
  }
  return map[result] || result
}

/**
 * 添加跟进记录
 */
const handleAddFollowUp = () => {
  followUpDialogVisible.value = true
  // 默认当前时间
  followUpForm.followUpTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  followUpForm.content = ''
}

/**
 * 保存跟进记录 - 调用API保存到数据库
 */
const handleSaveFollowUp = async () => {
  if (!followUpForm.followUpTime) {
    ElMessage.warning('请选择跟进时间')
    return
  }

  if (!followUpForm.content || followUpForm.content.trim() === '') {
    ElMessage.warning('请输入跟进内容')
    return
  }

  try {
    const serviceId = route.params.id as string
    const savedRecord = await serviceApi.addFollowUp(serviceId, {
      followUpTime: followUpForm.followUpTime,
      content: followUpForm.content.trim()
    })

    // 添加到列表开头(最新的在前面)
    followUpRecords.value.unshift(savedRecord)

    // 关闭对话框
    followUpDialogVisible.value = false

    ElMessage.success('跟进记录已保存')
  } catch (error) {
    console.error('[售后详情] 保存跟进记录失败:', error)
    ElMessage.error('保存跟进记录失败')
  }
}

/**
 * 加载跟进记录 - 从API获取
 */
const loadFollowUpRecords = async () => {
  try {
    const serviceId = route.params.id as string
    if (!serviceId) return

    const records = await serviceApi.getFollowUps(serviceId)
    followUpRecords.value = records || []
    console.log('[售后详情] 跟进记录加载成功:', followUpRecords.value.length, '条')
  } catch (error) {
    console.error('[售后详情] 加载跟进记录失败:', error)
    followUpRecords.value = []
  }
}

// 生命周期
onMounted(async () => {
  // 加载用户和部门数据
  await userStore.loadUsers()
  // 加载售后详情
  await loadServiceDetail()
  // 加载跟进记录(从API获取)
  await loadFollowUpRecords()
})
</script>

<style scoped>
.service-detail {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  margin-right: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.service-status {
  margin-left: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.info-card {
  margin-bottom: 20px;
}

/* 处理结果卡片 */
.resolution-card {
  border: 1px solid #b3e19d;
}
.resolution-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
}
.resolution-refund {
  color: #f56c6c;
  font-weight: 700;
  font-size: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  min-width: 80px;
  color: #606266;
  font-weight: 500;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.product-info {
  padding: 16px 0;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.product-details h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
}

.product-spec {
  margin: 0 0 8px 0;
  color: #606266;
}

.product-image {
  flex-shrink: 0;
  margin-right: 16px;
}

.image-placeholder {
  width: 80px;
  height: 80px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

.product-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #909399;
}

.product-financial {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #606266;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.description-content {
  padding: 4px 0;
}

.reason-section,
.description-section,
.remark-section {
  margin-bottom: 20px;
}

.reason-section:last-child,
.description-section:last-child,
.remark-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-label .label-icon {
  font-size: 16px;
}

.reason-section .label-icon {
  color: #e6a23c;
}

.description-section .label-icon {
  color: #909399;
}

.remark-section .label-icon {
  color: #409eff;
}

.section-label .label-text {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.5px;
}

.section-body {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
}

.reason-body {
  background: #fef0e6;
  border-left: 4px solid #e6a23c;
  color: #b88230;
  font-weight: 500;
}

.description-body {
  background: #f4f4f5;
  border-left: 3px solid #909399;
  color: #303133;
}

.remark-body {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
  color: #303133;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.attachment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.attachment-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.attachment-thumbnail {
  width: 100%;
  height: 80px;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
}

.attachment-thumbnail :deep(.el-image__inner) {
  object-fit: cover;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80px;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.image-error .el-icon {
  margin-bottom: 4px;
}

.file-icon {
  margin-bottom: 8px;
  color: #409EFF;
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
}

.file-info {
  text-align: center;
}

.file-name {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #303133;
  word-break: break-all;
}

.file-size {
  margin: 0;
  font-size: 11px;
  color: #909399;
}

.progress-card,
.action-card,
.related-card {
  margin-bottom: 20px;
}

.timeline-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #303133;
}

.timeline-content p {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #606266;
}

.operator {
  font-size: 12px;
  color: #909399;
}

.progress-toggle {
  text-align: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}

.toggle-icon {
  margin-left: 4px;
  transition: transform 0.3s;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.quick-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.quick-actions .el-button {
  width: auto;
  min-width: auto;
}

.related-info {
  padding: 16px 0;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.related-item:last-child {
  border-bottom: none;
}

.related-item label {
  color: #606266;
  font-size: 14px;
}

.related-item span {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-detail {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .title-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .attachments-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}

/* 受限信息样式 */
.restricted-info {
  color: #909399;
  font-style: italic;
  font-size: 13px;
}

/* 超链接样式 */
.value-link {
  font-size: 14px;
  font-weight: 500;
}

.value-link:hover {
  text-decoration: underline;
}

/* 跟进记录样式 */
.follow-up-content {
  min-height: 200px;
}

.follow-up-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.follow-up-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.3s;
}

.follow-up-item.latest {
  background: #ecf5ff;
  border-left-color: #409eff;
}

.follow-up-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.follow-up-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.follow-up-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 13px;
}

.follow-up-time .el-icon {
  color: #909399;
}

.follow-up-user {
  color: #409eff;
  font-size: 13px;
  font-weight: 500;
}

.follow-up-body {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}

.follow-up-body p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.history-title {
  color: #606266;
  font-size: 14px;
}

.el-collapse {
  border: none;
}

:deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  padding: 8px 0;
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

:deep(.el-collapse-item__content) {
  padding: 0;
}

/* 快捷操作按钮样式 */
.quick-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.action-btn {
  width: auto;
  min-width: auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 14px;
  height: 38px;
  border-radius: 8px;
  transition: all 0.3s;
  padding: 0 16px;
}

.action-btn:hover:not(:disabled) {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 确保按钮内的图标和文字对齐 */
.action-btn :deep(.el-icon) {
  margin-right: 8px;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
}

.action-btn :deep(span) {
  display: inline-flex;
  align-items: center;
}
</style>

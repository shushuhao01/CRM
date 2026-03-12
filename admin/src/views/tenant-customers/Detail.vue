<template>
  <div class="page-container">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">租户客户详情</span>
      </template>
    </el-page-header>

    <!-- 基本信息卡片 -->
    <el-card shadow="never" class="info-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <div class="button-group">
            <el-tooltip :content="detail.status === 'active' ? '点击禁用' : '点击启用'" placement="top">
              <el-switch
                :model-value="detail.status === 'active'"
                @change="handleToggleStatus"
                :loading="statusLoading"
                style="margin-right: 12px;"
              />
            </el-tooltip>
            <el-button type="primary" size="small" @click="handleEdit">编辑</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="客户名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="租户编码">
          <el-tag size="small" type="info">{{ detail.code || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 授权信息卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>授权信息</span>
          <div class="button-group">
            <el-button size="small" @click="handleAdjustUsers">调整用户数</el-button>
            <el-button size="small" @click="handleAdjustStorage">调整存储空间</el-button>
            <el-button size="small" @click="handleAdjustPackage">调整套餐</el-button>
            <el-button size="small" @click="handleRegenerate">重新生成授权码</el-button>
            <el-button size="small" type="warning" @click="handleRenew">续期</el-button>
            <el-button v-if="detail.licenseStatus !== 'suspended'" size="small" type="danger" @click="handleSuspend">暂停授权</el-button>
            <el-button v-else size="small" type="success" @click="handleResume">恢复授权</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="授权码">
          <div class="license-key-cell">
            <code>{{ showFullKey ? detail.licenseKey : maskKey(detail.licenseKey) }}</code>
            <el-tooltip :content="showFullKey ? '隐藏授权码' : '显示授权码'" placement="top">
              <el-icon class="action-icon" @click="showFullKey = !showFullKey">
                <View v-if="!showFullKey" />
                <Hide v-else />
              </el-icon>
            </el-tooltip>
            <el-tooltip content="复制授权码" placement="top">
              <el-icon class="action-icon" @click="copyKey(detail.licenseKey)">
                <CopyDocument />
              </el-icon>
            </el-tooltip>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="授权状态">
          <el-tag :type="getLicenseStatusType(detail.licenseStatus)" size="small">
            {{ getLicenseStatusText(detail.licenseStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="套餐">
          <el-tag :type="getPackageType(detail.packageName)" size="small">{{ detail.packageName || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户数">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span>{{ detail.userCount || 0 }} / {{ detail.maxUsers || 0 }}</span>
            <el-progress
              :percentage="detail.maxUsers ? Math.round((detail.userCount || 0) / detail.maxUsers * 100) : 0"
              :color="getProgressColor((detail.userCount || 0) / (detail.maxUsers || 1))"
              style="flex: 1; max-width: 120px;"
              :show-text="false"
            />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="存储空间">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span>{{ formatStorage(detail.usedStorageMb) }} / {{ detail.maxStorageGb || 0 }}GB</span>
            <el-progress
              :percentage="detail.maxStorageGb ? Math.round((detail.usedStorageMb || 0) / 1024 / detail.maxStorageGb * 100) : 0"
              :color="getProgressColor((detail.usedStorageMb || 0) / 1024 / (detail.maxStorageGb || 1))"
              style="flex: 1; max-width: 120px;"
              :show-text="false"
            />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <span :class="{ 'text-danger': isExpired(detail.expireDate) }">
            {{ formatExpireDate(detail.expireDate) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="账号状态">
          <el-tag :type="getStatusType(detail.status)" size="small">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">
          {{ detail.activatedAt ? formatDateTime(detail.activatedAt) : '未激活' }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updatedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 功能模块授权 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>功能模块授权
            <el-tag size="small" type="info" style="margin-left: 8px;">
              已启用 {{ enabledModulesCount }}/{{ crmModuleOptions.length }}
            </el-tag>
          </span>
          <div class="button-group">
            <template v-if="isEditingModules">
              <el-button size="small" @click="cancelEditModules">取消</el-button>
              <el-button size="small" type="primary" :loading="submitting" @click="saveModules">保存</el-button>
            </template>
            <el-button v-else size="small" type="primary" text @click="startEditModules">
              <el-icon><Edit /></el-icon>配置模块
            </el-button>
          </div>
        </div>
      </template>

      <!-- 查看模式 -->
      <div v-if="!isEditingModules" class="modules-grid">
        <div
          v-for="mod in crmModuleOptions"
          :key="mod.id"
          class="module-card"
          :class="{ enabled: isModuleEnabled(mod.id), disabled: !isModuleEnabled(mod.id) }"
        >
          <div class="module-card-icon" :class="{ enabled: isModuleEnabled(mod.id) }">
            <el-icon :size="22"><component :is="mod.icon" /></el-icon>
          </div>
          <div class="module-card-name">{{ mod.title }}</div>
          <div class="module-card-status">
            <el-icon v-if="isModuleEnabled(mod.id)" class="status-icon on"><CircleCheck /></el-icon>
            <el-icon v-else class="status-icon off"><CircleClose /></el-icon>
          </div>
        </div>
      </div>

      <!-- 编辑模式 -->
      <div v-else class="modules-edit">
        <div class="edit-toolbar">
          <el-button size="small" link type="primary" @click="selectAllModules">全选</el-button>
          <el-button size="small" link @click="deselectAllModules">全不选</el-button>
        </div>
        <el-checkbox-group v-model="editModules">
          <div class="modules-grid edit-mode">
            <label
              v-for="mod in crmModuleOptions"
              :key="mod.id"
              class="module-card-check"
              :class="{ checked: editModules.includes(mod.id), locked: mod.id === 'dashboard' }"
            >
              <el-checkbox :value="mod.id" :disabled="mod.id === 'dashboard'" class="hidden-checkbox" />
              <div class="module-card-icon" :class="{ enabled: editModules.includes(mod.id) }">
                <el-icon :size="22"><component :is="mod.icon" /></el-icon>
              </div>
              <div class="module-card-name">{{ mod.title }}</div>
              <div class="module-card-check-mark">
                <el-icon v-if="editModules.includes(mod.id)" color="#409eff"><CircleCheck /></el-icon>
                <el-icon v-else color="#dcdfe6"><CircleClose /></el-icon>
              </div>
            </label>
          </div>
        </el-checkbox-group>
      </div>
    </el-card>

    <!-- 用户列表卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>用户列表
            <el-tag size="small" style="margin-left: 8px;">共 {{ users.length }} 个用户</el-tag>
            <el-tag size="small" type="info" style="margin-left: 4px;">最大 {{ detail.maxUsers || 0 }} 个</el-tag>
          </span>
        </div>
      </template>
      <el-table :data="users" stripe v-loading="usersLoading" :max-height="400">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="username" label="用户名" min-width="100" show-overflow-tooltip />
        <el-table-column label="姓名" min-width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.realName || row.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="email" label="邮箱" min-width="150" show-overflow-tooltip />
        <el-table-column label="部门" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.departmentName || '-' }}</template>
        </el-table-column>
        <el-table-column label="职位" min-width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.position || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">{{ row.role || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" min-width="160">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="登录次数" width="90" align="center">
          <template #default="{ row }">{{ row.loginCount || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" fixed="right">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!usersLoading && users.length === 0" description="暂无用户数据" />
    </el-card>

    <!-- 操作日志卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>操作日志
            <el-tag size="small" style="margin-left: 8px;">共 {{ logsPagination.total }} 条</el-tag>
          </span>
          <el-button size="small" @click="fetchLogs">刷新</el-button>
        </div>
      </template>
      <el-table :data="logs" stripe v-loading="logsLoading" :max-height="400">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getLogActionType(row.action)" size="small">{{ getLogActionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column label="授权码" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <code v-if="row.licenseKey" style="font-size: 12px;">{{ row.licenseKey }}</code>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">{{ row.operatorName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="logsPagination.total > logsPagination.pageSize">
        <el-pagination
          v-model:current-page="logsPagination.page"
          :page-size="logsPagination.pageSize"
          :total="logsPagination.total"
          layout="total, prev, pager, next"
          small
          @current-change="fetchLogs"
        />
      </div>
      <el-empty v-if="!logsLoading && logs.length === 0" description="暂无操作日志" />
    </el-card>

    <!-- 数据导出卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>数据导出/导入</span>
        </div>
      </template>
      <div class="export-actions">
        <el-button type="primary" @click="handleExportDetail" :loading="exporting">
          <el-icon><Download /></el-icon>导出租户详情
        </el-button>
        <el-button @click="handleExportUsers" :loading="exportingUsers" :disabled="users.length === 0">
          <el-icon><Download /></el-icon>导出用户列表
        </el-button>
        <el-button @click="handleExportLogs" :loading="exportingLogs" :disabled="logs.length === 0">
          <el-icon><Download /></el-icon>导出操作日志
        </el-button>
        <el-upload
          :auto-upload="false"
          accept=".csv,.xlsx,.xls,.json"
          :show-file-list="false"
          @change="handleImportUsers"
          style="display: inline-block; margin-left: 8px;"
        >
          <el-button>
            <el-icon><Upload /></el-icon>导入用户数据
          </el-button>
        </el-upload>
      </div>
    </el-card>

    <!-- 编辑租户信息对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑租户信息" width="600px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="租户编码" prop="code">
          <el-input v-model="editForm.code" disabled placeholder="租户编码不可修改" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="editForm.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 调整用户数对话框 -->
    <el-dialog v-model="showAdjustUsersDialog" title="调整用户数" width="450px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">{{ detail.name }}</el-form-item>
        <el-form-item label="当前用户数">{{ detail.userCount || 0 }} / {{ detail.maxUsers || 0 }}</el-form-item>
        <el-form-item label="新最大用户" required>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
            <el-input-number v-model="newMaxUsers" :min="detail.userCount || 1" :max="9999" />
            <span style="white-space: nowrap; flex-shrink: 0;">个</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustUsersDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjustUsers" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 调整存储空间对话框 -->
    <el-dialog v-model="showAdjustStorageDialog" title="调整存储空间" width="450px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">{{ detail.name }}</el-form-item>
        <el-form-item label="当前存储">{{ formatStorage(detail.usedStorageMb) }} / {{ detail.maxStorageGb || 0 }}GB</el-form-item>
        <el-form-item label="新最大空间" required>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
            <el-input-number v-model="newMaxStorageGb" :min="usedStorageGbCeil" :max="10000" />
            <span style="white-space: nowrap; flex-shrink: 0;">GB</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAdjustStorageDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjustStorage" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 调整套餐对话框 -->
    <el-dialog v-model="showAdjustPackageDialog" title="调整套餐" width="720px">
      <div v-loading="packagesLoading" class="package-picker">
        <div class="pkg-current-info" v-if="detail.packageName">
          <span>当前套餐：</span>
          <el-tag :type="getPackageType(detail.packageName)">{{ detail.packageName }}</el-tag>
        </div>
        <el-tabs v-model="packageTab">
          <el-tab-pane label="SaaS云端版" name="saas" />
          <el-tab-pane label="私有部署版" name="private" />
        </el-tabs>
        <div class="package-picker-grid">
          <div
            v-for="pkg in filteredPackages"
            :key="pkg.id"
            class="package-picker-item"
            :class="{
              selected: newPackageId === pkg.id,
              current: detail.packageId === pkg.id,
              recommended: pkg.is_recommended
            }"
            @click="newPackageId = pkg.id"
          >
            <div class="pkg-badge" v-if="detail.packageId === pkg.id">当前</div>
            <div class="pkg-badge recommend" v-else-if="pkg.is_recommended">推荐</div>
            <div class="pkg-name">{{ pkg.name }}</div>
            <div class="pkg-price">
              <span v-if="pkg.price == 0" class="free">免费</span>
              <template v-else>
                <span class="amount">¥{{ pkg.price }}</span>
                <span class="unit">/{{ getBillingText(pkg.billing_cycle) }}</span>
              </template>
            </div>
            <div class="pkg-specs">
              <span>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }} 用户</span>
              <span>{{ pkg.max_storage_gb }}GB 存储</span>
            </div>
            <div class="pkg-features" v-if="pkg.features?.length">
              <div v-for="f in (pkg.features || []).slice(0, 4)" :key="f" class="pkg-feature">
                <el-icon color="#67c23a" :size="12"><CircleCheck /></el-icon> {{ f }}
              </div>
              <div v-if="pkg.features.length > 4" class="pkg-feature more">
                +{{ pkg.features.length - 4 }} 项更多功能
              </div>
            </div>
            <div class="pkg-select-mark" v-if="newPackageId === pkg.id">
              <el-icon :size="20"><CircleCheck /></el-icon>
            </div>
          </div>
        </div>
        <el-empty v-if="!packagesLoading && filteredPackages.length === 0" description="暂无可用套餐" :image-size="48" />
        <el-checkbox v-model="syncPackageConfig" style="margin-top: 12px">
          同步套餐的配置到租户（用户数上限、存储空间、功能模块）
        </el-checkbox>
      </div>
      <template #footer>
        <el-button @click="showAdjustPackageDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjustPackage" :loading="submitting"
          :disabled="!newPackageId">确认更换</el-button>
      </template>
    </el-dialog>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="租户续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="当前到期">{{ detail.expireDate || '永久' }}</el-form-item>
        <el-form-item label="续期时长" required>
          <el-select v-model="renewMonths" placeholder="请选择续期时长" style="width: 100%">
            <el-option :label="'1个月'" :value="1" />
            <el-option :label="'3个月'" :value="3" />
            <el-option :label="'6个月'" :value="6" />
            <el-option :label="'12个月（1年）'" :value="12" />
            <el-option :label="'24个月（2年）'" :value="24" />
            <el-option :label="'36个月（3年）'" :value="36" />
          </el-select>
        </el-form-item>
        <el-form-item label="新到期时间">
          <span style="color: #409eff; font-weight: 500;">{{ computedExpireDate }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码更新对话框 -->
    <el-dialog v-model="showLicenseDialog" title="授权码已更新" width="500px">
      <el-result icon="success" title="授权码已重新生成">
        <template #sub-title>
          <div class="license-result">
            <p>请将新授权码发送给客户</p>
            <div class="license-key-box">
              <span class="key">{{ newLicenseKey }}</span>
              <el-button type="primary" size="small" @click="copyKey(newLicenseKey)">复制</el-button>
            </div>
            <p class="tip">原授权码已失效</p>
          </div>
        </template>
      </el-result>
      <template #footer>
        <el-button type="primary" @click="showLicenseDialog = false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  View, Hide, CopyDocument, Download, Upload, Edit, CircleCheck, CircleClose,
  Odometer, User, ShoppingCart, Phone, TrendCharts, Van, Headset, Files, Money, Box, Setting
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import type { Package } from '@/api/packages'
import { getPackages as fetchPackageList } from '@/api/packages'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const usersLoading = ref(false)
const submitting = ref(false)
const statusLoading = ref(false)
const showFullKey = ref(false)
const showEditDialog = ref(false)
const showAdjustUsersDialog = ref(false)
const showAdjustStorageDialog = ref(false)
const showAdjustPackageDialog = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const renewMonths = ref<number>(12)
const newLicenseKey = ref('')
const newMaxUsers = ref(10)
const newMaxStorageGb = ref(5)
const newPackageId = ref('')
const editFormRef = ref<FormInstance>()

const detail = ref<any>({})
const users = ref<any[]>([])
const logs = ref<any[]>([])
const packagesList = ref<any[]>([])
const logsLoading = ref(false)
const exporting = ref(false)
const exportingUsers = ref(false)
const exportingLogs = ref(false)
const logsPagination = reactive({ page: 1, pageSize: 10, total: 0 })

// === 模块配置 ===
const isEditingModules = ref(false)
const editModules = ref<string[]>([])

const crmModuleOptions = [
  { id: 'dashboard', title: '数据看板', icon: Odometer },
  { id: 'customer', title: '客户管理', icon: User },
  { id: 'order', title: '订单管理', icon: ShoppingCart },
  { id: 'service-management', title: '服务管理', icon: Phone },
  { id: 'performance', title: '业绩统计', icon: TrendCharts },
  { id: 'logistics', title: '物流管理', icon: Van },
  { id: 'service', title: '售后管理', icon: Headset },
  { id: 'data', title: '资料管理', icon: Files },
  { id: 'finance', title: '财务管理', icon: Money },
  { id: 'product', title: '商品管理', icon: Box },
  { id: 'system', title: '系统管理', icon: Setting }
]

const allModuleIds = crmModuleOptions.map(m => m.id)

const isModuleEnabled = (id: string) => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  return (parsed || []).includes(id)
}

const enabledModulesCount = computed(() => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  return (parsed || []).filter((f: string) => allModuleIds.includes(f)).length
})

const startEditModules = () => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  editModules.value = [...(parsed || [])]
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  isEditingModules.value = true
}
const cancelEditModules = () => { isEditingModules.value = false }
const selectAllModules = () => { editModules.value = [...allModuleIds] }
const deselectAllModules = () => { editModules.value = ['dashboard'] }

const saveModules = async () => {
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, { modules: editModules.value })
    if (res.success) {
      ElMessage.success('模块配置已更新')
      isEditingModules.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

// === 套餐选择（卡片模式）===
const allPackages = ref<Package[]>([])
const packagesLoading = ref(false)
const packageTab = ref('saas')
const syncPackageConfig = ref(true)

const filteredPackages = computed(() => {
  return allPackages.value.filter(p => p.type === packageTab.value && p.status)
})

const getBillingText = (cycle: string) => {
  return ({ monthly: '月', yearly: '年', once: '永久' }[cycle] || cycle)
}
// === 编辑表单 ===

const editForm = reactive({
  name: '', code: '', contact: '', phone: '', email: '', remark: ''
})
const editRules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }]
}

// === 工具方法 ===

const maskKey = (key: string) => {
  if (!key) return ''
  if (key.startsWith('LIC-')) {
    return `${key.substring(0, 8)}****${key.substring(key.length - 4)}`
  }
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 8) + '****'
}

const copyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const formatStorage = (mb: number) => {
  if (!mb || mb === 0) return '0MB'
  if (mb < 1024) return `${mb}MB`
  return `${(mb / 1024).toFixed(1)}GB`
}

const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'
const formatExpireDate = (date: string) => {
  if (!date) return '永久'
  return new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}
const isExpired = (date: string) => date && new Date(date) < new Date()

const getProgressColor = (ratio: number): string => {
  if (ratio >= 0.9) return '#f56c6c'
  if (ratio >= 0.7) return '#e6a23c'
  return '#409eff'
}

const getPackageType = (p: string): string => {
  const map: Record<string, string> = { '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }
  return map[p] || 'info'
}
const getStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', expired: 'info', disabled: 'danger', inactive: 'danger' }
  return map[s] || 'info'
}
const getStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '正常', expired: '已过期', disabled: '已禁用', inactive: '已禁用' }
  return map[s] || s
}
const getLicenseStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}
const getLicenseStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }
  return map[s] || s
}
const getRoleTagType = (role: string): string => {
  const map: Record<string, string> = { admin: 'danger', '超级管理员': 'danger', manager: 'warning', '经理': 'warning', user: '', '员工': '' }
  return map[role] || ''
}

// === 计算属性 ===

const usedStorageGbCeil = computed(() => {
  const mb = detail.value.usedStorageMb || 0
  return Math.max(1, Math.ceil(mb / 1024))
})

const computedExpireDate = computed(() => {
  if (!renewMonths.value) return '-'
  const base = detail.value.expireDate
    ? new Date(detail.value.expireDate)
    : new Date()
  const target = new Date(base)
  target.setMonth(target.getMonth() + renewMonths.value)
  return target.toISOString().split('T')[0]
})

// === 启用/禁用 ===

const handleToggleStatus = async () => {
  const isActive = detail.value.status === 'active'
  const action = isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}该租户吗？${isActive ? '禁用后该租户下所有用户将无法登录。' : ''}`,
      `${action}租户`, { type: 'warning' }
    )
    statusLoading.value = true
    const newStatus = isActive ? 'inactive' : 'active'
    const res = await request.put(`/tenants/${route.params.id}`, { status: newStatus })
    if (res.success) {
      ElMessage.success(`已${action}`)
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    statusLoading.value = false
  }
}

// === 编辑 ===

const handleEdit = () => {
  Object.assign(editForm, {
    name: detail.value.name,
    code: detail.value.code,
    contact: detail.value.contact || '',
    phone: detail.value.phone || '',
    email: detail.value.email || '',
    remark: detail.value.remark || ''
  })
  showEditDialog.value = true
}

const confirmEdit = async () => {
  await editFormRef.value?.validate()
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, {
      name: editForm.name,
      contact: editForm.contact,
      phone: editForm.phone,
      email: editForm.email,
      remark: editForm.remark
    })
    if (res.success) {
      ElMessage.success('更新成功')
      showEditDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

// === 调整用户数 ===

const handleAdjustUsers = () => {
  newMaxUsers.value = detail.value.maxUsers || 10
  showAdjustUsersDialog.value = true
}

const confirmAdjustUsers = async () => {
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, {
      maxUsers: newMaxUsers.value
    })
    if (res.success) {
      ElMessage.success('调整成功')
      showAdjustUsersDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '调整失败')
  } finally {
    submitting.value = false
  }
}

// === 调整存储空间 ===

const handleAdjustStorage = () => {
  newMaxStorageGb.value = detail.value.maxStorageGb || 5
  showAdjustStorageDialog.value = true
}

const confirmAdjustStorage = async () => {
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, {
      maxStorageGb: newMaxStorageGb.value
    })
    if (res.success) {
      ElMessage.success('调整成功')
      showAdjustStorageDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '调整失败')
  } finally {
    submitting.value = false
  }
}

// === 调整套餐 ===

const handleAdjustPackage = async () => {
  newPackageId.value = detail.value.packageId || ''
  syncPackageConfig.value = true
  showAdjustPackageDialog.value = true
  if (allPackages.value.length === 0) {
    packagesLoading.value = true
    try {
      const res = await fetchPackageList()
      allPackages.value = res.data || []
    } catch { ElMessage.error('获取套餐列表失败') }
    finally { packagesLoading.value = false }
  }
}

const confirmAdjustPackage = async () => {
  if (!newPackageId.value) {
    ElMessage.warning('请选择套餐')
    return
  }
  const pkg = allPackages.value.find(p => p.id === Number(newPackageId.value))
  if (!pkg) {
    ElMessage.warning('请选择套餐')
    return
  }
  submitting.value = true
  try {
    const updateData: any = { packageId: pkg.id }
    if (syncPackageConfig.value) {
      updateData.maxUsers = pkg.max_users
      updateData.maxStorageGb = pkg.max_storage_gb
      if (pkg.modules?.length) {
        updateData.modules = pkg.modules
      }
    }
    const res = await request.put(`/tenants/${route.params.id}`, updateData)
    if (res.success) {
      ElMessage.success(`已更换为「${pkg.name}」套餐`)
      showAdjustPackageDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '调整失败')
  } finally {
    submitting.value = false
  }
}

// === 重新生成授权码 ===

const handleRegenerate = async () => {
  try {
    await ElMessageBox.confirm('重新生成授权码后，原授权码将失效。确定继续？', '重新生成授权码', { type: 'warning' })
    const res = await request.post(`/tenants/${route.params.id}/regenerate-license`)
    if (res.success) {
      newLicenseKey.value = res.data.licenseKey
      showLicenseDialog.value = true
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

// === 续期 ===

const handleRenew = () => {
  renewMonths.value = 12
  showRenewDialog.value = true
}

const confirmRenew = async () => {
  if (!renewMonths.value) {
    ElMessage.warning('请选择续期时长')
    return
  }
  submitting.value = true
  try {
    const res = await request.post(`/tenants/${route.params.id}/renew`, {
      expireDate: computedExpireDate.value
    })
    if (res.success) {
      ElMessage.success(`续期${renewMonths.value}个月成功`)
      showRenewDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
  } finally {
    submitting.value = false
  }
}

// === 暂停/恢复授权 ===

const handleSuspend = async () => {
  try {
    await ElMessageBox.confirm('暂停授权后，该客户下所有用户将无法登录。确定继续？', '暂停授权', { type: 'warning' })
    const res = await request.post(`/tenants/${route.params.id}/suspend`)
    if (res.success) {
      ElMessage.success('已暂停授权')
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const handleResume = async () => {
  try {
    const res = await request.post(`/tenants/${route.params.id}/resume`)
    if (res.success) {
      ElMessage.success('已恢复授权')
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

// === 数据获取 ===

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}`)
    if (res.success) {
      const d = res.data
      // 兼容 snake_case 和 camelCase
      detail.value = {
        id: d.id,
        name: d.name,
        code: d.code,
        contact: d.contact,
        phone: d.phone,
        email: d.email,
        licenseKey: d.licenseKey || d.license_key,
        licenseStatus: d.licenseStatus || d.license_status,
        status: d.status,
        packageId: d.packageId || d.package_id,
        packageName: d.packageName || d.package_name,
        userCount: d.userCount ?? d.user_count ?? 0,
        maxUsers: d.maxUsers ?? d.max_users ?? 0,
        maxStorageGb: d.maxStorageGb ?? d.max_storage_gb ?? 0,
        usedStorageMb: d.usedStorageMb ?? d.used_storage_mb ?? 0,
        modules: typeof (d.modules) === 'string' ? JSON.parse(d.modules) : (d.modules || []),
        features: typeof (d.features) === 'string' ? JSON.parse(d.features) : (d.features || []),
        expireDate: d.expireDate || d.expire_date,
        activatedAt: d.activatedAt || d.activated_at,
        createdAt: d.createdAt || d.created_at,
        updatedAt: d.updatedAt || d.updated_at,
        remark: d.remark
      }
    }
  } catch (e) {
    ElMessage.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  usersLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/users`)
    if (res.success) {
      users.value = (res.data.list || res.data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        realName: u.realName || u.real_name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        departmentName: u.departmentName || u.department_name,
        position: u.position,
        lastLoginAt: u.lastLoginAt || u.last_login_at,
        loginCount: u.loginCount ?? u.login_count ?? 0,
        status: u.status
      }))
    }
  } catch {
    // 如果 users 端点不存在，则尝试从详情中获取
    if (detail.value.users) {
      users.value = detail.value.users
    }
  } finally {
    usersLoading.value = false
  }
}

// === 操作日志 ===

const getLogActionType = (action: string): string => {
  const map: Record<string, string> = { generate: 'success', activate: 'primary', renew: 'warning', suspend: 'danger', resume: 'success', revoke: 'danger' }
  return map[action] || 'info'
}
const getLogActionText = (action: string): string => {
  const map: Record<string, string> = { generate: '生成授权码', activate: '激活', renew: '续期', suspend: '暂停', resume: '恢复', revoke: '吊销' }
  return map[action] || action
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/logs`, {
      params: { page: logsPagination.page, pageSize: logsPagination.pageSize }
    })
    if (res.success) {
      logs.value = (res.data.list || res.data || []).map((l: any) => ({
        id: l.id,
        action: l.action,
        result: l.result,
        message: l.message,
        licenseKey: l.licenseKey || l.license_key,
        operatorId: l.operatorId || l.operator_id,
        operatorName: l.operatorName || l.operator_name,
        createdAt: l.createdAt || l.created_at
      }))
      logsPagination.total = res.data.total || 0
    }
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

// === 数据导出/导入 ===

const generateCSV = (headers: { key: string; label: string }[], rows: any[]): string => {
  const BOM = '\uFEFF'
  const headerLine = headers.map(h => `"${h.label}"`).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => {
      let val = row[h.key]
      if (val === null || val === undefined) val = ''
      val = String(val).replace(/"/g, '""')
      return `"${val}"`
    }).join(',')
  )
  return BOM + headerLine + '\n' + dataLines.join('\n')
}

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const handleExportDetail = () => {
  exporting.value = true
  try {
    const d = detail.value
    const csv = generateCSV([
      { key: 'name', label: '客户名称' },
      { key: 'code', label: '租户编码' },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'email', label: '邮箱' },
      { key: 'status', label: '状态' },
      { key: 'licenseKey', label: '授权码' },
      { key: 'licenseStatus', label: '授权状态' },
      { key: 'packageName', label: '套餐' },
      { key: 'maxUsers', label: '最大用户数' },
      { key: 'userCount', label: '当前用户数' },
      { key: 'maxStorageGb', label: '最大存储(GB)' },
      { key: 'expireDate', label: '到期时间' },
      { key: 'activatedAt', label: '激活时间' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'updatedAt', label: '更新时间' }
    ], [{
      ...d,
      status: getStatusText(d.status),
      licenseStatus: getLicenseStatusText(d.licenseStatus),
      activatedAt: d.activatedAt ? formatDateTime(d.activatedAt) : '未激活',
      createdAt: formatDateTime(d.createdAt),
      updatedAt: formatDateTime(d.updatedAt)
    }])
    downloadCSV(csv, `租户详情_${d.name || d.code}_${new Date().toISOString().slice(0, 10)}.csv`)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const handleExportUsers = () => {
  exportingUsers.value = true
  try {
    const csv = generateCSV([
      { key: 'username', label: '用户名' },
      { key: 'realName', label: '姓名' },
      { key: 'phone', label: '手机号' },
      { key: 'email', label: '邮箱' },
      { key: 'departmentName', label: '部门' },
      { key: 'position', label: '职位' },
      { key: 'role', label: '角色' },
      { key: 'lastLoginAt', label: '最后登录' },
      { key: 'loginCount', label: '登录次数' },
      { key: 'status', label: '状态' }
    ], users.value.map(u => ({
      ...u,
      lastLoginAt: u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '-',
      status: u.status === 'active' ? '正常' : '禁用'
    })))
    downloadCSV(csv, `租户用户列表_${detail.value.name || detail.value.code}_${new Date().toISOString().slice(0, 10)}.csv`)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exportingUsers.value = false
  }
}

const handleExportLogs = () => {
  exportingLogs.value = true
  try {
    const csv = generateCSV([
      { key: 'action', label: '操作类型' },
      { key: 'result', label: '结果' },
      { key: 'message', label: '详情' },
      { key: 'licenseKey', label: '授权码' },
      { key: 'operatorName', label: '操作人' },
      { key: 'createdAt', label: '操作时间' }
    ], logs.value.map(l => ({
      ...l,
      action: getLogActionText(l.action),
      result: l.result === 'success' ? '成功' : '失败',
      createdAt: formatDateTime(l.createdAt)
    })))
    downloadCSV(csv, `租户操作日志_${detail.value.name || detail.value.code}_${new Date().toISOString().slice(0, 10)}.csv`)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exportingLogs.value = false
  }
}

const handleImportUsers = (file: any) => {
  const rawFile = file.raw || file
  if (!rawFile) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      ElMessage.info(`文件 "${rawFile.name}" 已读取（${content.length} 字节），导入功能将在后续版本中完善`)
      // TODO: 解析CSV/JSON并调用批量创建用户API
    } catch {
      ElMessage.error('文件读取失败')
    }
  }
  reader.readAsText(rawFile)
}

onMounted(() => {
  fetchDetail()
  fetchUsers()
  fetchLogs()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; }
.info-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.button-group { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.text-danger { color: #f56c6c; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 12px; }
.export-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }

.license-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  code {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 13px;
    background: #f5f7fa;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .action-icon {
    cursor: pointer;
    font-size: 16px;
    color: #409eff;
    transition: all 0.2s;
    flex-shrink: 0;
    &:hover {
      color: #66b1ff;
      transform: scale(1.1);
    }
  }
}

.license-result {
  text-align: center;
  p { margin: 8px 0; color: #606266; }
  .tip { font-size: 12px; color: #909399; }
}
.license-key-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  margin: 16px 0;
  background: #f5f7fa;
  border-radius: 8px;
  .key {
    font-family: monospace;
    font-size: 18px;
    font-weight: bold;
    color: #409eff;
    letter-spacing: 1px;
  }
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .button-group {
    width: 100%;
    .el-button { font-size: 12px; }
  }
  :deep(.el-descriptions) {
    .el-descriptions__label { width: 80px; }
  }
  .modules-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
  .module-card { padding: 12px 6px 8px; }
  .module-card-icon { width: 36px; height: 36px; }
}

/* ====== 功能模块 - 网格卡片 ====== */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 8px 12px; border-radius: 10px; cursor: default;
  position: relative; transition: all 0.25s;

  &.enabled {
    background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    border: 1px solid #d9ecff;
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.disabled {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    .module-card-name { color: #c0c4cc; }
    .module-card-icon { opacity: 0.4; }
  }
}

.module-card-icon {
  width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  transition: all 0.25s;
  &.enabled { background: #409eff; color: #fff; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25); }
  &:not(.enabled) { background: #e8e8e8; color: #999; }
}

.module-card-name { font-size: 13px; text-align: center; line-height: 1.3; }

.module-card-status {
  .status-icon {
    font-size: 14px;
    &.on { color: #67c23a; }
    &.off { color: #dcdfe6; }
  }
}

/* ====== 编辑模式 ====== */
.modules-edit {
  .edit-toolbar { margin-bottom: 12px; display: flex; gap: 12px; }
  .modules-grid.edit-mode { gap: 10px; }
}

.module-card-check {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px 10px; border-radius: 10px; cursor: pointer;
  position: relative; transition: all 0.2s; border: 2px solid #e4e7ed;
  background: #fafafa;

  &:hover { border-color: #c6e2ff; background: #f5f9ff; }
  &.checked {
    border-color: #409eff; background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
    .module-card-name { color: #303133; font-weight: 500; }
  }
  &.locked { cursor: not-allowed; opacity: 0.75; }
  .hidden-checkbox { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
}

.module-card-check-mark {
  position: absolute; top: 4px; right: 4px; font-size: 16px;
}

/* ====== 更换套餐弹窗 ====== */
.package-picker {
  .pkg-current-info {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    font-size: 14px; color: #606266;
  }
}

.package-picker-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(195px, 1fr)); gap: 12px;
  max-height: 420px; overflow-y: auto; padding: 4px 2px;
}

.package-picker-item {
  position: relative; padding: 16px 14px; border: 2px solid #e4e7ed; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; background: #fff;

  &:hover { border-color: #c6e2ff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  &.selected { border-color: #409eff; background: #f0f7ff; box-shadow: 0 2px 12px rgba(64,158,255,0.15); }
  &.current { border-color: #e6a23c; }
  &.recommended { border-color: #67c23a; }

  .pkg-badge {
    position: absolute; top: -1px; right: 10px; font-size: 11px; padding: 1px 8px;
    background: #e6a23c; color: #fff; border-radius: 0 0 6px 6px; font-weight: 500;
    &.recommend { background: #67c23a; }
  }
  .pkg-name { font-size: 15px; font-weight: 600; color: #303133; margin-bottom: 6px; }
  .pkg-price {
    margin-bottom: 8px;
    .free { color: #67c23a; font-weight: 600; font-size: 16px; }
    .amount { color: #e6a23c; font-weight: 700; font-size: 20px; }
    .unit { color: #909399; font-size: 12px; }
  }
  .pkg-specs {
    display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #909399;
  }
  .pkg-features {
    border-top: 1px solid #f0f0f0; padding-top: 8px;
    .pkg-feature { font-size: 12px; color: #606266; line-height: 1.8; display: flex; align-items: center; gap: 4px; }
    .pkg-feature.more { color: #909399; font-style: italic; }
  }
  .pkg-select-mark {
    position: absolute; bottom: 8px; right: 8px; color: #409eff;
  }
}
</style>

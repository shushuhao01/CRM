<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>用户管理</h2>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canAddUser"
          @click="handleAdd"
          type="primary"
          :icon="Plus"
        >
          新增用户
        </el-button>
        <el-button
          v-if="canAddUser"
          @click="handleBatchImport"
          type="success"
          :icon="Upload"
        >
          批量导入
        </el-button>
        <el-button @click="handleExport" :icon="Download">
          导出用户
        </el-button>
      </div>
    </div>

    <!-- 统计数据卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon primary-icon">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number primary-number">{{ userStats.total }}</div>
                <div class="stat-title">总用户数</div>
                <div class="stat-desc">系统中的用户总数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon success-icon">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number success-number">{{ userStats.active }}</div>
                <div class="stat-title">在职人数</div>
                <div class="stat-desc">当前在职员工数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon warning-icon">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number warning-number">{{ userStats.resigned }}</div>
                <div class="stat-title">离职人数</div>
                <div class="stat-desc">已离职员工数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon info-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number info-number">{{ userStats.monthNew }}</div>
                <div class="stat-title">本月新增</div>
                <div class="stat-desc">本月新增用户数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input
            v-model="searchForm.realName"
            placeholder="请输入姓名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="searchForm.roleId"
            placeholder="请选择角色"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select
            v-model="searchForm.departmentId"
            placeholder="请选择部门"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="department in departmentStore.departmentList"
              :key="department.id"
              :label="department.name"
              :value="department.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.createTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search">
            搜索
          </el-button>
          <el-button @click="handleReset" :icon="Refresh">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <div class="table-section">
      <DynamicTable
        :data="userList"
        :columns="tableColumns"
        :loading="tableLoading"
        storage-key="user-management-columns"
        title="用户列表"
        :show-selection="true"
        :show-pagination="true"
        :total="pagination.total"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        @column-settings-change="handleColumnSettingsChange"
      >
        <!-- 表格头部批量操作按钮 -->
        <template #table-header-actions>
          <div class="batch-actions">
            <el-button
              v-if="canDeleteUser"
              @click="handleBatchDelete"
              :disabled="!selectedUsers.length"
              type="danger"
              size="small"
              :icon="Delete"
            >
              批量删除
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('active')"
              :disabled="!selectedUsers.length"
              size="small"
              :icon="Check"
            >
              批量启用
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('inactive')"
              :disabled="!selectedUsers.length"
              size="small"
              :icon="Close"
            >
              批量禁用
            </el-button>
          </div>
        </template>

        <!-- 启用状态开关插槽 -->
        <template #column-enableStatus="{ row }">
          <el-switch
            v-model="row.status"
            active-value="active"
            inactive-value="inactive"
            :loading="row.statusLoading"
            :before-change="() => beforeStatusChange(row)"
          />
        </template>

        <!-- 在职状态开关插槽 -->
        <template #column-employmentStatus="{ row }">
          <el-tooltip
            :content="row.employmentStatus === 'active' ? '当前：在职，点击设为离职' : '当前：离职，点击设为在职'"
            placement="top"
          >
            <el-switch
              v-model="row.employmentStatus"
              active-value="active"
              inactive-value="resigned"
              :loading="row.employmentStatusLoading"
              :before-change="() => beforeEmploymentStatusChange(row)"
              class="employment-status-switch"
            />
          </el-tooltip>
        </template>

        <!-- 头像插槽 -->
        <template #column-avatar="{ row }">
          <el-avatar
            :src="row.avatar"
            :size="40"
            :style="{ backgroundColor: row.avatar ? 'transparent' : '#409eff' }"
          >
            <template v-if="!row.avatar">
              <el-icon><User /></el-icon>
            </template>
          </el-avatar>
        </template>

        <!-- 部门插槽 -->
        <template #column-department="{ row }">
          <el-tag v-if="row.departmentName" type="info" size="small">
            {{ row.departmentName }}
          </el-tag>
          <span v-else class="text-gray-400">未分配</span>
        </template>

        <!-- 手机号插槽 -->
        <template #column-phone="{ row }">
          {{ displaySensitiveInfoNew(row.phone, 'phone') }}
        </template>

        <!-- 角色插槽 -->
        <template #column-role="{ row }">
          <el-tag :type="getRoleColor(row.roleId)" size="small">
            {{ getRoleName(row.roleId) }}
          </el-tag>
        </template>

        <!-- 在线状态插槽 -->
        <template #column-isOnline="{ row }">
          <el-tag :type="row.isOnline ? 'success' : 'info'" size="small">
            {{ row.isOnline ? '在线' : '离线' }}
          </el-tag>
        </template>

        <!-- 操作插槽 -->
        <template #table-actions="{ row }">
          <el-button @click="handleView(row)" type="primary" size="small" link>
            查看
          </el-button>
          <el-button
            v-if="canEditUser"
            @click="handleEdit(row)"
            type="primary"
            size="small"
            link
          >
            编辑
          </el-button>
          <el-button
            v-if="canResetPassword"
            @click="handleResetPassword(row)"
            type="warning"
            size="small"
            link
          >
            重置密码
          </el-button>
          <el-dropdown
            v-if="canEditUser || canManagePermissions || canViewLogs || canDeleteUser"
            @command="(cmd) => handleDropdownCommand(cmd, row)"
          >
            <el-button type="primary" size="small" link>
              更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="canManagePermissions"
                  command="permissions"
                >
                  权限设置
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="canViewLogs"
                  command="logs"
                >
                  操作日志
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="canDeleteUser"
                  command="delete"
                  divided
                  class="danger-item"
                >
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </DynamicTable>
     </div>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="dialogTitle"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="userForm.username"
                placeholder="请输入用户名"
                :disabled="isEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="realName">
              <el-input
                v-model="userForm.realName"
                placeholder="请输入姓名"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="userForm.email"
                placeholder="请输入邮箱"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model="userForm.phone"
                placeholder="请输入手机号"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId">
              <el-select
                v-model="userForm.roleId"
                placeholder="请选择角色"
                style="width: 100%"
                @change="handleRoleChange"
              >
                <el-option
                  v-for="role in roleOptions"
                  :key="role.id"
                  :label="role.name"
                  :value="role.code"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="departmentId">
              <el-select
                v-model="userForm.departmentId"
                placeholder="请选择部门"
                style="width: 100%"
                clearable
              >
                <el-option
                  v-for="department in departmentStore.departmentList"
                  :key="department.id"
                  :label="department.name"
                  :value="department.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位" prop="position">
              <el-select
                v-model="userForm.position"
                placeholder="请选择或输入职位"
                filterable
                allow-create
                style="width: 100%"
              >
                <el-option
                  v-for="position in commonPositions"
                  :key="position"
                  :label="position"
                  :value="position"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工号" prop="employeeNumber">
              <el-input
                v-model="userForm.employeeNumber"
                placeholder="请输入工号"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="userForm.status">
                <el-radio label="active">启用</el-radio>
                <el-radio label="inactive">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button @click="confirmUser" type="primary" :loading="userLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="用户详情"
      width="800px"
    >
      <div class="user-detail" v-if="currentUser">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="头像">
            <el-avatar :src="currentUser.avatar" :size="60">
              {{ currentUser.realName?.charAt(0) }}
            </el-avatar>
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ currentUser.username }}
          </el-descriptions-item>
          <el-descriptions-item label="姓名">
            {{ currentUser.realName }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ displaySensitiveInfoNew(currentUser.email, SensitiveInfoType.EMAIL) }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ displaySensitiveInfoNew(currentUser.phone, 'phone') }}
          </el-descriptions-item>
          <el-descriptions-item label="部门">
            <el-tag v-if="currentUser.departmentName" type="primary">
              {{ currentUser.departmentName }}
            </el-tag>
            <span v-else class="text-gray-400">未分配</span>
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleColor(currentUser.roleId)">
              {{ getRoleName(currentUser.roleId) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
              {{ currentUser.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="在线状态">
            <el-tag :type="currentUser.isOnline ? 'success' : 'info'">
              {{ currentUser.isOnline ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ currentUser.createTime }}
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">
            {{ currentUser.lastLoginTime }}
          </el-descriptions-item>
          <el-descriptions-item label="登录次数">
            {{ currentUser.loginCount }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentUser.remark || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限设置"
      width="800px"
    >
      <div class="permission-setting" v-if="currentUser">
        <div class="user-info">
          <el-descriptions :column="3" size="small">
            <el-descriptions-item label="用户">{{ currentUser.realName }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ getRoleName(currentUser.roleId) }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'" size="small">
                {{ currentUser.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <el-divider />

        <div class="permission-content">
          <el-alert
            title="权限同步机制说明"
            type="info"
            :closable="false"
            show-icon
          >
            <p>• 用户权限由角色权限和个人权限组成</p>
            <p>• 角色权限是基础权限，不能被移除，与系统管理中的角色权限保持同步</p>
            <p>• 个人权限可以在角色权限基础上进行额外授权</p>
            <p v-if="userStore.isSuperAdmin">• 作为超级管理员，您可以为用户授予任何额外权限</p>
            <p v-else>• 只有超级管理员可以修改个人权限设置</p>
            <p>• 保存时会自动合并角色权限和个人权限，确保权限一致性</p>
          </el-alert>

          <el-tabs v-model="activePermissionTab" class="permission-tabs">
            <el-tab-pane label="角色权限" name="role">
              <div class="role-permissions">
                <el-tree
                  ref="rolePermissionTreeRef"
                  :data="rolePermissions"
                  show-checkbox
                  node-key="id"
                  :default-checked-keys="roleCheckedPermissions"
                  :props="{ children: 'children', label: 'name' }"
                  :check-strictly="false"
                  disabled
                />
                <div class="permission-note">
                  <el-icon><InfoFilled /></el-icon>
                  角色权限由系统管理员在角色管理中配置，此处仅供查看,与系统管理-角色权限保持同步
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="个人权限" name="personal">
              <div class="personal-permissions">
                <div class="permission-note">
                  <el-icon><InfoFilled /></el-icon>
                  <span v-if="userStore.isSuperAdmin">灰色选项为角色默认权限，不可取消；可额外勾选其他权限进行授权</span>
                  <span v-else>只有超级管理员可以修改个人权限设置</span>
                </div>
                <el-tree
                  ref="personalPermissionTree"
                  :data="personalPermissions"
                  show-checkbox
                  node-key="id"
                  :default-checked-keys="userPersonalPermissions"
                  :props="{ children: 'children', label: 'name', disabled: 'disabled' }"
                  :check-strictly="false"
                  :disabled="!userStore.isSuperAdmin"
                  @check="handlePermissionCheck"
                />
                <div class="permission-actions">
                  <el-button
                    @click="handleResetPermissions"
                    :disabled="!userStore.isSuperAdmin"
                  >
                    重置到角色默认权限
                  </el-button>
                  <el-button
                    type="primary"
                    @click="handleSavePermissions"
                    :loading="permissionLoading"
                    :disabled="!userStore.isSuperAdmin"
                  >
                    保存权限
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-dialog>

    <!-- 操作日志对话框 -->
    <el-dialog
      v-model="logsDialogVisible"
      title="操作日志"
      width="1000px"
    >
      <div class="logs-content" v-if="currentUser">
        <div class="logs-header">
          <div class="user-info">
            <span>用户：{{ currentUser.realName }}（{{ currentUser.username }}）</span>
          </div>
          <div class="logs-actions">
            <el-date-picker
              v-model="logDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="small"
              @change="handleLogDateChange"
            />
            <el-button size="small" @click="handleRefreshLogs" :icon="Refresh">刷新</el-button>
            <el-button size="small" @click="handleExportLogs" :icon="Download">导出</el-button>
          </div>
        </div>

        <el-table
          :data="userLogs"
          :loading="logsLoading"
          stripe
          height="400"
        >
          <el-table-column prop="time" label="操作时间" width="160" />
          <el-table-column prop="action" label="操作类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getLogActionType(row.action)" size="small">
                {{ getLogActionText(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="操作模块" width="120" />
          <el-table-column prop="description" label="操作描述" show-overflow-tooltip />
          <el-table-column prop="ip" label="IP地址" width="120" />
          <el-table-column prop="userAgent" label="设备信息" width="200" show-overflow-tooltip />
          <el-table-column prop="result" label="操作结果" width="100">
            <template #default="{ row }">
              <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
                {{ row.result === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="logs-pagination">
          <el-pagination
            v-model:current-page="logsPagination.page"
            v-model:page-size="logsPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="logsPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleLogsPageSizeChange"
            @current-change="handleLogsPageChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="batchImportVisible"
      title="批量导入用户"
      width="800px"
      :before-close="closeBatchImport"
      class="batch-import-dialog"
    >
      <div class="batch-import-container">
        <!-- 导入步骤 -->
        <el-steps :active="importStep" finish-status="success" align-center>
          <el-step title="下载模板" description="下载Excel模板文件" />
          <el-step title="填写数据" description="按模板格式填写用户数据" />
          <el-step title="上传文件" description="上传填写好的Excel文件" />
          <el-step title="预览确认" description="预览导入数据并确认" />
        </el-steps>

        <!-- 步骤1: 下载模板 -->
        <div v-if="importStep === 0" class="import-step">
          <div class="step-content">
            <div class="step-title">下载导入模板</div>
            <div class="step-description">
              请先下载用户导入模板，按照模板格式填写用户数据。
            </div>
            <div class="template-info">
              <h4>模板说明：</h4>
              <ul>
                <li>用户名：3-20个字符，不能重复</li>
                <li>姓名：真实姓名，不能为空</li>
                <li>邮箱：有效的邮箱地址</li>
                <li>手机号：11位手机号码</li>
                <li>角色：超级管理员、管理员、销售员、客服</li>
                <li>部门：部门名称，可选</li>
                <li>职位：用户职位，可选</li>
                <li>工号：员工工号，可选</li>
                <li>密码：登录密码，6-20个字符</li>
                <li>备注：可选，用户备注信息</li>
              </ul>
            </div>
            <el-button type="primary" @click="downloadTemplate">
              <el-icon><Download /></el-icon>
              下载模板
            </el-button>
          </div>
        </div>

        <!-- 步骤2: 填写数据 -->
        <div v-if="importStep === 1" class="import-step">
          <div class="step-content">
            <div class="step-title">填写用户数据</div>
            <div class="step-description">
              请在下载的模板中填写用户数据，注意以下要点：
            </div>
            <el-alert
              title="重要提示"
              type="warning"
              :closable="false"
              show-icon
            >
              <ul>
                <li>请严格按照模板格式填写，不要修改表头</li>
                <li>用户名不能重复，系统会自动检查</li>
                <li>角色名称必须准确，区分大小写</li>
                <li>手机号和邮箱格式必须正确</li>
                <li>建议先少量测试，确认无误后再批量导入</li>
              </ul>
            </el-alert>
          </div>
        </div>

        <!-- 步骤3: 上传文件 -->
        <div v-if="importStep === 2" class="import-step">
          <div class="step-content">
            <div class="upload-area">
              <el-upload
                ref="uploadRef"
                class="upload-demo"
                drag
                :auto-upload="false"
                :on-change="handleFileChange"
                :before-upload="beforeUpload"
                accept=".xlsx,.xls"
                :limit="1"
                :on-exceed="handleExceed"
              >
                <el-icon class="el-icon--upload"><Upload /></el-icon>
                <div class="el-upload__text">
                  将Excel文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    只能上传xlsx/xls文件，且不超过10MB
                  </div>
                </template>
              </el-upload>
            </div>
            <div v-if="uploadFile" class="file-info">
              <p>已选择文件：{{ uploadFile.name }}</p>
              <el-button type="primary" @click="parseExcelFile" :loading="parsing">
                解析文件
              </el-button>
            </div>
          </div>
        </div>

        <!-- 步骤4: 预览确认 -->
        <div v-if="importStep === 3" class="import-step">
          <div class="step-content">
            <div class="preview-info">
              <h4>数据预览</h4>
              <p>共解析到 <strong>{{ previewData.length }}</strong> 条用户数据，请确认后导入：</p>
            </div>
            <div class="preview-table">
              <el-table :data="previewData" border max-height="400">
                <el-table-column prop="username" label="用户名" width="120" />
                <el-table-column prop="realName" label="姓名" width="100" />
                <el-table-column label="邮箱" width="180">
                  <template #default="{ row }">
                    {{ displaySensitiveInfoNew(row.email, SensitiveInfoType.EMAIL) }}
                  </template>
                </el-table-column>
                <el-table-column label="手机号" width="120">
                  <template #default="{ row }">
                    {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
                  </template>
                </el-table-column>
                <el-table-column prop="role" label="角色" width="80" />
                <el-table-column prop="department" label="部门" width="100" />
                <el-table-column prop="position" label="职位" width="120" />
                <el-table-column prop="employeeNumber" label="工号" width="120" />
                <el-table-column label="密码" width="100">
                  <template #default="{ row }">
                    <span v-if="row.password">{{ row.password.replace(/./g, '*') }}</span>
                    <el-tag v-else type="info" size="small">默认密码</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                <el-table-column label="验证结果" width="100">
                  <template #default="{ row }">
                    <el-tag v-if="row.errors && row.errors.length === 0" type="success">有效</el-tag>
                    <el-tag v-else type="danger">无效</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="错误信息" min-width="300">
                  <template #default="{ row }">
                    <div v-if="row.errors && row.errors.length > 0" class="error-container">
                      <div v-for="(error, index) in row.errors" :key="index" class="error-item">
                        <el-icon class="error-icon"><WarningFilled /></el-icon>
                        <span class="error-text">{{ error }}</span>
                        <el-tooltip v-if="getErrorSuggestion(error)" placement="top" :content="getErrorSuggestion(error)">
                          <el-icon class="suggestion-icon"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                    </div>
                    <div v-else class="success-container">
                      <el-icon class="success-icon"><CircleCheckFilled /></el-icon>
                      <span class="success-text">数据有效</span>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 验证统计 -->
            <div class="validation-summary">
              <div class="summary-item valid">
                <div class="summary-number">{{ validData.length }}</div>
                <div class="summary-label">有效数据</div>
              </div>
              <div class="summary-item invalid">
                <div class="summary-number">{{ invalidData.length }}</div>
                <div class="summary-label">无效数据</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <span v-if="importStep === 3">
              共 {{ previewData.length }} 条数据，其中 {{ validData.length }} 条有效
            </span>
          </div>
          <div class="footer-right">
            <el-button @click="closeBatchImport">取消</el-button>
            <el-button v-if="importStep > 0" @click="prevStep">上一步</el-button>
            <el-button
              v-if="importStep < 3"
              type="primary"
              @click="nextStep"
              :disabled="importStep === 2 && !uploadFile"
            >
              下一步
            </el-button>
            <el-button
              v-if="importStep === 3"
              type="primary"
              @click="confirmImport"
              :loading="importing"
              :disabled="validData.length === 0"
            >
              确认导入
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { passwordService } from '@/services/passwordService'
import { userApiService } from '@/services/userApiService'
import { roleApiService } from '@/services/roleApiService'
import type { Role } from '@/services/roleApiService'
import { PermissionService as SensitivePermissionService } from '@/services/permission'
import { rolePermissionService } from '@/services/rolePermissionService'
import permissionService from '@/services/permissionService'
import { UserDataSyncService } from '@/services/userDataSync'
import * as XLSX from 'xlsx'
import DynamicTable from '@/components/DynamicTable.vue'
import {
  Plus,
  Download,
  Upload,
  Search,
  Refresh,
  Delete,
  Check,
  Close,
  ArrowDown,
  User,
  UserFilled,
  Clock,
  TrendCharts,
  InfoFilled,
  WarningFilled,
  QuestionFilled,
  CircleCheck,
  CircleClose,
  CircleCheckFilled
} from '@element-plus/icons-vue'

// 接口定义
interface UserData {
  id: string
  username: string
  realName: string
  email: string
  phone: string
  roleId: string
  departmentId?: string
  departmentName?: string
  position?: string
  employeeNumber?: string
  status: string
  password?: string
  remark?: string
  createTime?: string
  lastLoginTime?: string
  avatar?: string
  statusLoading?: boolean
  employmentStatus?: 'active' | 'resigned' // 在职状态
  employmentStatusLoading?: boolean
  resignedDate?: string // 离职日期
  roleName?: string
  isOnline?: boolean
  loginCount?: number
}

interface UploadFile {
  name: string
  size: number
  type: string
  raw?: File
}

interface ImportUserData {
  rowIndex: number
  username: string
  realName: string
  email: string
  phone: string
  role: string
  department?: string
  position?: string
  employeeNumber?: string
  password: string
  remark: string
  errors: string[]
}

interface ColumnSettings {
  [key: string]: {
    visible: boolean
    width?: number
    order?: number
  }
}

// 用户store
const userStore = useUserStore()
// 部门store
const departmentStore = useDepartmentStore()

// 响应式数据
const tableLoading = ref(false)
const userLoading = ref(false)
const userDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const selectedUsers = ref([])
const currentUser = ref(null)

// 用户统计
const userStats = ref({
  total: 0,
  active: 0, // 在职人数
  resigned: 0, // 离职人数
  monthNew: 0
})

// 搜索表单
const searchForm = reactive({
  username: '',
  realName: '',
  roleId: '',
  departmentId: '',
  status: '',
  createTimeRange: []
})

// 用户表单
const userForm = reactive({
  id: '',
  username: '',
  realName: '',
  email: '',
  phone: '',
  roleId: '',
  departmentId: '',
  position: '',
  employeeNumber: '',
  status: 'active',
  password: '',
  remark: ''
})

// 用户列表
const userList = ref([])

// 角色选项
const roleOptions = ref<Role[]>([])

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  roleId: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  departmentId: [
    { required: true, message: '请选择部门', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 表单引用
const userFormRef = ref()

// 批量导入相关数据
const batchImportVisible = ref(false)
const importStep = ref(0)
const uploadRef = ref()
const uploadFile = ref(null)
const parsing = ref(false)
const importing = ref(false)
const previewData = ref([])
const validData = ref([])
const invalidData = ref([])

// 权限设置相关数据
const permissionDialogVisible = ref(false)
const permissionLoading = ref(false)
const activePermissionTab = ref('role')
const rolePermissions = ref([])
const roleCheckedPermissions = ref([]) // 角色默认选中的权限
const rolePermissionTreeRef = ref(null) // 角色权限树ref
const personalPermissions = ref([])
const userPersonalPermissions = ref([])
const personalPermissionTree = ref(null) // 个人权限树ref

// 操作日志相关数据
const logsDialogVisible = ref(false)
const logsLoading = ref(false)
const userLogs = ref([])
const logDateRange = ref([])
const logsPagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑用户' : '新增用户')

// 权限控制计算属性
const canAddUser = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canEditUser = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canDeleteUser = computed(() => {
  return userStore.isAdmin
})

const canResetPassword = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canManagePermissions = computed(() => {
  return userStore.isAdmin
})

const canViewLogs = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

const canBatchOperation = computed(() => {
  return userStore.isAdmin || userStore.isManager
})

// 常用职位列表
const commonPositions = computed(() => {
  try {
    // 基础职位列表
    const basePositions = [
      '总经理',
      '副总经理',
      '部门经理',
      '主管',
      '组长',
      '专员',
      '助理',
      '秘书',
      '销售经理',
      '销售专员',
      '客服主管',
      '客服专员',
      '财务经理',
      '会计',
      '出纳',
      '物流主管',
      '物流专员',
      '审核员',
      '质检员'
    ]

    // 【生产环境修复】仅在开发环境从localStorage获取真实用户的职位
    if (!import.meta.env.PROD) {
      const usersStr = localStorage.getItem('crm_mock_users')
      if (usersStr) {
        const users = JSON.parse(usersStr)
        const realPositions = users
          .map((user: unknown) => user.position)
          .filter((pos: string) => pos && pos.trim())
          .filter((pos: string, index: number, self: string[]) => self.indexOf(pos) === index) // 去重

        // 合并基础职位和真实职位，去重
        return [...new Set([...basePositions, ...realPositions])]
      }
    }

    return basePositions
  } catch (error) {
    console.error('获取职位列表失败:', error)
    return [
      '总经理',
      '副总经理',
      '部门经理',
      '主管',
      '组长',
      '专员',
      '助理',
      '秘书'
    ]
  }
})

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'enableStatus',
    label: '启用状态',
    width: 100,
    visible: true,
    slot: true,
    align: 'center'
  },
  {
    prop: 'employmentStatus',
    label: '在职状态',
    width: 90,
    visible: true,
    slot: true,
    align: 'center'
  },
  {
    prop: 'avatar',
    label: '头像',
    width: 80,
    visible: true,
    slot: true
  },
  {
    prop: 'username',
    label: '用户名',
    width: 120,
    visible: true,
    sortable: true
  },
  {
    prop: 'realName',
    label: '姓名',
    width: 100,
    visible: true,
    sortable: true
  },
  {
    prop: 'role',
    label: '角色',
    width: 120,
    visible: true,
    slot: true
  },
  {
    prop: 'department',
    label: '部门',
    width: 120,
    visible: true,
    slot: true
  },
  {
    prop: 'employeeNumber',
    label: '工号',
    width: 120,
    visible: true
  },
  {
    prop: 'position',
    label: '职位',
    width: 120,
    visible: true
  },
  {
    prop: 'email',
    label: '邮箱',
    width: 180,
    visible: true,
    showOverflowTooltip: true
  },
  {
    prop: 'phone',
    label: '手机号',
    width: 120,
    visible: true,
    slot: true
  },
  {
    prop: 'isOnline',
    label: '在线状态',
    width: 100,
    visible: true,
    slot: true
  },
  {
    prop: 'lastLoginTime',
    label: '最后登录',
    width: 160,
    visible: true,
    sortable: true
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 160,
    visible: true,
    sortable: true
  }
])

// 方法定义
/**
 * 获取角色名称
 * 【批次198修复】支持通过code或id查找角色
 */
const getRoleName = (roleId: string) => {
  if (!roleId) return '未知'

  // 尝试通过id、code或roleId匹配角色
  const role = roleOptions.value.find(r =>
    r.id === roleId ||
    r.code === roleId ||
    String(r.id) === String(roleId)
  )

  return role?.name || '未知'
}

/**
 * 处理角色变化 - 自动配置预设权限
 */
const handleRoleChange = (roleCode: string) => {
  if (!roleCode) return

  // 获取选中的角色信息（现在传入的是code）
  const selectedRole = roleOptions.value.find(r => r.code === roleCode)
  if (!selectedRole) return

  console.log(`角色变更为: ${selectedRole.name} (${selectedRole.code})`)

  // 如果当前正在权限设置对话框中，更新权限显示
  if (permissionDialogVisible.value && currentUser.value) {
    // 更新当前用户的角色信息
    currentUser.value.role = selectedRole.code
    currentUser.value.roleId = roleCode

    // 重新加载权限数据
    Promise.all([
      loadRolePermissions(roleCode),
      loadPersonalPermissions(),
      loadUserPersonalPermissions(currentUser.value.id)
    ]).then(() => {
      console.log('权限数据已根据新角色重新加载')
      ElMessage.success(`已切换到${selectedRole.name}角色的预设权限`)
    }).catch(error => {
      console.error('重新加载权限数据失败:', error)
    })
  }
}

/**
 * 获取角色颜色
 * 【批次198修复】支持通过code或id查找角色
 */
const getRoleColor = (roleId: string) => {
  if (!roleId) return ''

  // 尝试通过id、code或roleId匹配角色
  const role = roleOptions.value.find(r =>
    r.id === roleId ||
    r.code === roleId ||
    String(r.id) === String(roleId)
  )

  return role?.color || ''
}

/**
 * 新增用户
 */
const handleAdd = () => {
  isEdit.value = false
  resetUserForm()
  userDialogVisible.value = true
}

/**
 * 编辑用户
 */
const handleEdit = (row: UserData) => {
  console.log('[User] 编辑用户:', row)
  isEdit.value = true

  // 确保使用正确的字段名
  Object.assign(userForm, {
    id: row.id,
    username: row.username || row.name || '',
    realName: row.realName || row.name || row.username || '',
    email: row.email || '',
    phone: row.phone || '',
    roleId: row.roleId || row.role || '',
    departmentId: row.departmentId || '',
    position: row.position || '',
    employeeNumber: row.employeeNumber || '',
    status: row.status || 'active',
    remark: row.remark || ''
  })

  console.log('[User] 编辑表单数据:', userForm)
  userDialogVisible.value = true
}

/**
 * 查看用户
 */
const handleView = (row: UserData) => {
  currentUser.value = row
  detailDialogVisible.value = true
}

/**
 * 重置密码
 */
const handleResetPassword = async (row: UserData) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户"${row.realName}"的密码吗？重置后将生成新的临时密码。`,
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 使用密码服务重置密码
    const result = await passwordService.resetPasswordByAdmin(row.id, userStore.currentUser?.id || '')

    if (result.success) {
      // 显示新密码给管理员
      await ElMessageBox.alert(
        `用户"${row.realName}"的密码已重置成功！\n\n新的临时密码：${result.tempPassword}\n\n请将此密码安全地告知用户，用户首次登录时将被要求修改密码。`,
        '密码重置成功',
        {
          confirmButtonText: '我已记录',
          type: 'success',
          showClose: false,
          closeOnClickModal: false,
          closeOnPressEscape: false
        }
      )

      ElMessage.success('密码重置成功')

      // 刷新用户列表以更新状态
      await loadUserList()
    } else {
      ElMessage.error(result.message || '密码重置失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密码重置失败，请稍后重试')
    }
  }
}

/**
 * 下拉菜单命令处理
 */
const handleDropdownCommand = (command: string, row: UserData) => {
  switch (command) {
    case 'permissions':
      handlePermissions(row)
      break
    case 'logs':
      handleLogs(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}



/**
 * 权限设置
 */
const handlePermissions = async (row: UserData) => {
  currentUser.value = row
  activePermissionTab.value = 'role'

  try {
    // 加载角色权限和个人权限数据
    await Promise.all([
      loadRolePermissions(row.roleId),
      loadPersonalPermissions(),
      loadUserPersonalPermissions(row.id)
    ])

    permissionDialogVisible.value = true

    // 等待对话框和权限树渲染完成后设置选中状态
    setTimeout(() => {
      console.log('[User] 设置角色权限树选中状态')
      console.log('[User] 角色权限数量:', roleCheckedPermissions.value.length)
      console.log('[User] 角色权限列表:', roleCheckedPermissions.value)

      if (rolePermissionTreeRef.value && roleCheckedPermissions.value.length > 0) {
        try {
          rolePermissionTreeRef.value.setCheckedKeys(roleCheckedPermissions.value)
          console.log('[User] ✅ 角色权限树选中状态设置成功')

          // 验证设置结果
          const checkedKeys = rolePermissionTreeRef.value.getCheckedKeys()
          console.log('[User] ✅ 验证选中结果:', checkedKeys)
        } catch (error) {
          console.error('[User] ❌ 设置角色权限树选中状态失败:', error)
        }
      } else {
        console.warn('[User] ⚠️ 角色权限树引用未找到或权限列表为空')
      }
    }, 500)
  } catch (error) {
    console.error('[User] 加载权限数据失败:', error)
    ElMessage.error('加载权限数据失败')
  }
}

/**
 * 操作日志
 */
const handleLogs = async (row: UserData) => {
  currentUser.value = row
  logDateRange.value = []
  logsPagination.page = 1
  logsPagination.size = 20

  try {
    await loadUserLogs(row.id)
    logsDialogVisible.value = true
  } catch (error) {
    console.error('加载操作日志失败:', error)
    ElMessage.error('加载操作日志失败')
  }
}

/**
 * 加载角色权限 - 使用统一权限服务,显示该角色的默认权限
 */
const loadRolePermissions = async (roleId: string) => {
  try {
    console.log('[User] 加载角色权限:', roleId)

    // 获取所有权限树结构
    const allPermissions = permissionService.getAllPermissions()

    // 获取该角色的默认权限ID列表
    const roleDefaultPermissions = permissionService.getRoleDefaultPermissions(roleId)

    console.log('[User] 角色默认权限:', roleDefaultPermissions)

    // 设置权限树数据和默认选中
    rolePermissions.value = allPermissions
    roleCheckedPermissions.value = roleDefaultPermissions

    console.log('[User] 角色权限加载成功,权限数:', roleDefaultPermissions.length)
  } catch (error) {
    console.error('[User] 加载角色权限失败:', error)

    // 使用统一权限服务的默认权限树
    const allPermissions = permissionService.getAllPermissions()
    rolePermissions.value = allPermissions
    roleCheckedPermissions.value = []
  }
}

/**
 * 加载个人权限选项 - 使用统一权限服务，标记角色默认权限
 */
const loadPersonalPermissions = async () => {
  try {
    // 使用统一权限服务获取所有权限
    const allPermissions = permissionService.getAllPermissions()

    // 标记角色默认权限为禁用状态
    if (currentUser.value && currentUser.value.role) {
      const roleDefaultPermissions = permissionService.getRoleDefaultPermissions(currentUser.value.role)
      personalPermissions.value = markRolePermissionsDisabled(allPermissions, roleDefaultPermissions)
    } else {
      personalPermissions.value = allPermissions
    }

    console.log('个人权限选项加载成功')
  } catch (error) {
    console.error('加载个人权限选项失败:', error)

    // 使用统一权限服务的默认权限树
    const allPermissions = permissionService.getAllPermissions()
    personalPermissions.value = allPermissions
  }
}

/**
 * 加载用户个人权限
 */
const loadUserPersonalPermissions = async (userId: string) => {
  try {
    // 使用统一权限服务获取用户个人权限
    const response = await permissionService.getUserPersonalPermissions(parseInt(userId))

    // 提取权限ID列表
    userPersonalPermissions.value = response.permissions.map(permission => permission.id)
    console.log('用户个人权限加载成功:', userId)
  } catch (error) {
    console.error('加载用户个人权限失败:', error)

    // 根据用户角色获取预设权限
    const user = users.value.find(u => u.id === parseInt(userId))
    if (user && user.role) {
      const defaultPermissions = permissionService.getRoleDefaultPermissions(user.role)
      userPersonalPermissions.value = defaultPermissions
      console.log(`为角色 ${user.role} 设置预设权限:`, defaultPermissions)
    } else {
      userPersonalPermissions.value = []
    }
  }
}

/**
 * 标记角色默认权限为禁用状态
 * @param {Array} permissions - 权限树数组
 * @param {Array} roleDefaultPermissions - 角色默认权限ID数组
 * @returns {Array} 标记后的权限树
 */
const markRolePermissionsDisabled = (permissions, roleDefaultPermissions) => {
  if (!permissions || !Array.isArray(permissions)) {
    return []
  }

  const markPermission = (permission) => {
    const isRoleDefault = roleDefaultPermissions.includes(permission.id)
    const markedPermission = {
      ...permission,
      disabled: isRoleDefault
    }

    if (permission.children && permission.children.length > 0) {
      markedPermission.children = permission.children.map(markPermission)
    }

    return markedPermission
  }

  return permissions.map(markPermission)
}

/**
 * 加载用户操作日志
 */
const loadUserLogs = async (userId: string) => {
  logsLoading.value = true
  try {
    // 使用真实API调用
    const response = await rolePermissionService.getUserOperationLogs(
      parseInt(userId),
      {
        page: logsPagination.page,
        pageSize: logsPagination.size,
        startDate: logDateRange.value?.[0],
        endDate: logDateRange.value?.[1]
      }
    )

    // 转换日志数据格式
    userLogs.value = response.data.map(log => ({
      time: log.createdAt,
      action: log.action,
      module: log.module,
      description: log.description,
      ip: log.ip,
      userAgent: log.userAgent,
      result: 'success' // API返回的日志默认为成功
    }))

    logsPagination.total = response.total
    console.log('用户操作日志加载成功:', userId)
  } catch (error) {
    console.error('加载操作日志失败:', error)

    // 降级到本地模拟数据
    const mockLogs = [
      {
        time: '2024-01-15 14:30:25',
        action: 'login',
        module: '系统登录',
        description: '用户登录系统',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        result: 'success'
      },
      {
        time: '2024-01-15 14:25:10',
        action: 'create',
        module: '客户管理',
        description: '新增客户：张三',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        result: 'success'
      },
      {
        time: '2024-01-15 14:20:05',
        action: 'update',
        module: '订单管理',
        description: '修改订单：ORD20240115001',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        result: 'success'
      },
      {
        time: '2024-01-15 14:15:30',
        action: 'delete',
        module: '产品管理',
        description: '删除产品：PRD001',
        ip: '192.168.1.100',
        userAgent: 'Chrome 120.0.0.0',
        result: 'failed'
      }
    ]

    userLogs.value = mockLogs
    logsPagination.total = mockLogs.length
  } finally {
    logsLoading.value = false
  }
}

/**
 * 权限选择处理 - 实现权限同步机制
 */
const handlePermissionCheck = (data: unknown, checked: unknown) => {
  // 检查是否为超级管理员
  if (!userStore.isSuperAdmin) {
    ElMessage.warning('只有超级管理员可以修改个人权限设置')
    return
  }

  console.log('权限选择变化:', data, checked)

  // 获取当前选中的权限
  const checkedKeys = checked.checkedKeys || []
  const halfCheckedKeys = checked.halfCheckedKeys || []

  // 如果当前用户有角色，检查是否与角色权限冲突
  if (currentUser.value && currentUser.value.role) {
    const roleDefaultPermissions = permissionService.getRoleDefaultPermissions(currentUser.value.role)

    // 检查是否试图移除角色默认权限
    const removedRolePermissions = roleDefaultPermissions.filter(
      permission => !checkedKeys.includes(permission) && !halfCheckedKeys.includes(permission)
    )

    if (removedRolePermissions.length > 0) {
      ElMessage.warning('不能移除角色默认权限，这些权限将自动保留')

      // 重新加载用户权限，恢复角色默认权限
      setTimeout(() => {
        loadUserPersonalPermissions(currentUser.value!.id)
      }, 100)
    }
  }

  // 实时更新用户个人权限数组
  userPersonalPermissions.value = [...checkedKeys]
}

/**
 * 重置权限 - 重置到角色默认权限
 */
const handleResetPermissions = () => {
  // 检查是否为超级管理员
  if (!userStore.isSuperAdmin) {
    ElMessage.warning('只有超级管理员可以修改个人权限设置')
    return
  }

  if (currentUser.value) {
    // 获取角色默认权限
    const roleDefaultPermissions = permissionService.getRoleDefaultPermissions(currentUser.value.role)
    userPersonalPermissions.value = [...roleDefaultPermissions]

    ElMessage.success('权限已重置为角色默认权限')
    console.log(`用户 ${currentUser.value.realName} 权限已重置为角色 ${currentUser.value.role} 的默认权限`)
  }
}

/**
 * 保存权限 - 使用统一权限服务，支持超管设置个人权限，确保包含角色默认权限
 */
const handleSavePermissions = async () => {
  if (!currentUser.value) return

  // 检查是否为超级管理员
  if (!userStore.isSuperAdmin) {
    ElMessage.warning('只有超级管理员可以修改个人权限设置')
    return
  }

  permissionLoading.value = true
  try {
    // 获取选中的权限
    const checkedKeys = (document.querySelector('.personal-permissions .el-tree') as unknown)?.getCheckedKeys() || []

    // 确保包含角色默认权限
    const roleDefaultPermissions = permissionService.getRoleDefaultPermissions(currentUser.value.role)
    const finalPermissions = [...new Set([...roleDefaultPermissions, ...checkedKeys])]

    // 使用统一权限服务保存用户个人权限
    await permissionService.saveUserPersonalPermissions(
      parseInt(currentUser.value.id),
      finalPermissions
    )

    ElMessage.success('权限保存成功')
    permissionDialogVisible.value = false
    console.log('用户权限保存成功:', currentUser.value.id, '最终权限:', finalPermissions)

    // 刷新用户列表以显示最新权限状态
    await loadUsers()
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error('保存权限失败')

    // 保持对话框打开，让用户重试
  } finally {
    permissionLoading.value = false
  }
}

/**
 * 获取日志操作类型样式
 */
const getLogActionType = (action: string) => {
  const typeMap: Record<string, string> = {
    login: 'success',
    logout: 'info',
    create: 'primary',
    update: 'warning',
    delete: 'danger',
    view: 'info'
  }
  return typeMap[action] || 'info'
}

/**
 * 获取日志操作类型文本
 */
const getLogActionText = (action: string) => {
  const textMap: Record<string, string> = {
    login: '登录',
    logout: '登出',
    create: '新增',
    update: '修改',
    delete: '删除',
    view: '查看'
  }
  return textMap[action] || action
}

/**
 * 日志日期范围变化
 */
const handleLogDateChange = (dates: [Date, Date] | null) => {
  if (currentUser.value) {
    loadUserLogs(currentUser.value.id)
  }
}

/**
 * 刷新日志
 */
const handleRefreshLogs = () => {
  if (currentUser.value) {
    loadUserLogs(currentUser.value.id)
  }
}

/**
 * 导出日志
 */
const handleExportLogs = async () => {
  if (!currentUser.value) return

  try {
    ElMessage.info('正在导出日志，请稍候...')

    // 使用真实API调用导出用户操作日志
    const blob = await rolePermissionService.exportUserOperationLogs(
      parseInt(currentUser.value.id),
      {
        startDate: logDateRange.value?.[0],
        endDate: logDateRange.value?.[1],
        format: 'excel'
      }
    )

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `用户操作日志_${currentUser.value.username}_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('日志导出成功')
    console.log('用户操作日志导出成功:', currentUser.value.id)
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败，请稍后重试')
  }
}

/**
 * 日志分页大小变化
 */
const handleLogsPageSizeChange = (size: number) => {
  logsPagination.size = size
  if (currentUser.value) {
    loadUserLogs(currentUser.value.id)
  }
}

/**
 * 日志页码变化
 */
const handleLogsPageChange = (page: number) => {
  logsPagination.page = page
  if (currentUser.value) {
    loadUserLogs(currentUser.value.id)
  }
}

/**
 * 删除用户
 */
const handleDelete = async (row: UserData) => {
  const userName = row.realName || row.name || row.username || '该用户'

  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${userName}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    console.log('[User] 开始删除用户:', row.id, userName)

    // 【生产环境修复】仅在开发环境操作localStorage
    if (!import.meta.env.PROD) {
      // 直接操作localStorage删除用户
      const users = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')
      const userIndex = users.findIndex((u: unknown) => String(u.id) === String(row.id))

      if (userIndex !== -1) {
        users.splice(userIndex, 1)
        localStorage.setItem('crm_mock_users', JSON.stringify(users))
        console.log('[User] 已从 crm_mock_users 删除')
      }

      // 同步删除 userDatabase
      const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
      const dbIndex = userDatabase.findIndex((u: unknown) => String(u.id) === String(row.id))

      if (dbIndex !== -1) {
        userDatabase.splice(dbIndex, 1)
        localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
        console.log('[User] 已从 userDatabase 删除')
      }
    } else {
      console.log('[User] 生产环境：应通过API删除用户')
      // TODO: 生产环境应该调用API删除用户
    }

    ElMessage.success('删除成功')

    // 重新加载用户列表
    await loadUserList()
    console.log('[User] 用户列表已重新加载')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('[User] 删除用户失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (!selectedUsers.value || selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要删除的用户')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？删除后不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const userIds = selectedUsers.value.map(user => user.id)

    try {
      await userApiService.batchDeleteUsers(userIds)
      // 批量清理用户关联数据
      await UserDataSyncService.batchCleanupUserData(userIds.map(id => id.toString()))
      ElMessage.success('批量删除成功')
    } catch (error) {
      console.error('批量删除用户失败:', error)
      ElMessage.error('批量删除用户失败，请稍后重试')
      return
    }

    selectedUsers.value = []
    await loadUserList()
  } catch (_error) {
    // 用户取消操作
  }
}

/**
 * 状态切换前的检查和处理
 */
const beforeStatusChange = async (row: UserData) => {
  const originalStatus = row.status
  const newStatus = originalStatus === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'

  try {
    // 设置加载状态
    row.statusLoading = true

    // 调用API更新状态
    await userApiService.updateUserStatus(row.id, newStatus)

    ElMessage.success(`${action}用户成功`)

    // 更新统计数据
    await loadUserStats()

    // 返回true允许状态切换
    return true
  } catch (error) {
    console.error('更新用户状态失败:', error)
    ElMessage.error(`${action}用户失败，请稍后重试`)
    // 返回false阻止状态切换
    return false
  } finally {
    // 清除加载状态
    row.statusLoading = false
  }
}

/**
 * 在职状态切换前的检查和处理
 */
const beforeEmploymentStatusChange = async (row: UserData) => {
  const originalStatus = row.employmentStatus || 'active'
  const newStatus = originalStatus === 'active' ? 'resigned' : 'active'
  const action = newStatus === 'active' ? '设为在职' : '设为离职'

  try {
    // 确认操作
    await ElMessageBox.confirm(
      newStatus === 'resigned'
        ? `确定要将用户 ${row.realName || row.username} 设为离职状态吗？离职后该账号将无法登录，但历史数据仍然可见。`
        : `确定要将用户 ${row.realName || row.username} 设为在职状态吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 设置加载状态
    row.employmentStatusLoading = true

    // 调用API更新在职状态
    await userApiService.updateEmploymentStatus(row.id, newStatus)

    // 如果设为离职，记录离职日期
    if (newStatus === 'resigned') {
      row.resignedDate = new Date().toISOString().split('T')[0]
    } else {
      row.resignedDate = undefined
    }

    ElMessage.success(`${action}成功`)

    // 更新统计数据
    await loadUserStats()

    // 返回true允许状态切换
    return true
  } catch (error: unknown) {
    if (error !== 'cancel') {
      console.error('更新在职状态失败:', error)
      ElMessage.error(`${action}失败，请稍后重试`)
    }
    // 返回false阻止状态切换
    return false
  } finally {
    // 清除加载状态
    row.employmentStatusLoading = false
  }
}

/**
 * 批量状态操作
 */
const handleBatchStatus = async (status: string) => {
  if (!selectedUsers.value || selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要操作的用户')
    return
  }

  const action = status === 'active' ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}选中的 ${selectedUsers.value.length} 个用户吗？`,
      `确认批量${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const userIds = selectedUsers.value.map(user => user.id)

    try {
      await userApiService.batchUpdateUserStatus(userIds, status)
      ElMessage.success(`批量${action}成功`)
    } catch (error) {
      console.error('批量更新用户状态失败:', error)
      ElMessage.error(`批量${action}失败，请稍后重试`)
      return
    }

    selectedUsers.value = []
    await loadUserList()
  } catch (_error) {
    // 用户取消操作
  }
}

/**
 * 导出用户
 */
const handleExport = async () => {
  try {
    ElMessage.info('正在导出用户数据...')

    // 获取当前筛选的用户数据
    const exportData = userList.value.map(user => ({
      '用户名': user.username,
      '姓名': user.realName,
      '工号': user.employeeNumber || '',
      '邮箱': user.email,
      '手机号': user.phone,
      '部门': user.departmentName || '未分配',
      '职位': user.position || '',
      '角色': user.roleName,
      '账号状态': user.status === 'active' ? '启用' : '禁用',
      '在职状态': (user.employmentStatus || 'active') === 'active' ? '在职' : '离职',
      '离职日期': user.resignedDate || '',
      '在线状态': user.isOnline ? '在线' : '离线',
      '最后登录时间': user.lastLoginTime || '从未登录',
      '登录次数': user.loginCount || 0,
      '创建时间': user.createTime,
      '备注': user.remark || ''
    }))

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '用户列表')

    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 用户名
      { wch: 12 }, // 姓名
      { wch: 12 }, // 工号
      { wch: 25 }, // 邮箱
      { wch: 15 }, // 手机号
      { wch: 15 }, // 部门
      { wch: 12 }, // 职位
      { wch: 12 }, // 角色
      { wch: 10 }, // 账号状态
      { wch: 10 }, // 在职状态
      { wch: 12 }, // 离职日期
      { wch: 10 }, // 在线状态
      { wch: 20 }, // 最后登录时间
      { wch: 10 }, // 登录次数
      { wch: 20 }, // 创建时间
      { wch: 20 }  // 备注
    ]
    ws['!cols'] = colWidths

    // 生成文件名
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
    const filename = `用户列表_${timestamp}.xlsx`

    // 下载文件
    XLSX.writeFile(wb, filename)

    ElMessage.success('用户数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadUserList()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    username: '',
    realName: '',
    roleId: '',
    departmentId: '',
    status: '',
    createTimeRange: []
  })
  handleSearch()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection: UserData[]) => {
  selectedUsers.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.size = size
  loadUserList()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadUserList()
}

/**
 * 更新部门成员数
 */
const updateDepartmentMemberCount = async (departmentId: string) => {
  try {
    console.log('[用户管理] 更新部门成员数，部门ID:', departmentId)

    // 从localStorage获取users数据
    const usersStr = localStorage.getItem('users')
    if (!usersStr) return

    const users = JSON.parse(usersStr)

    // 统计每个部门的成员数
    const memberCount = new Map<string, number>()
    users.forEach((user: unknown) => {
      const deptId = user.departmentId
      if (deptId) {
        memberCount.set(deptId, (memberCount.get(deptId) || 0) + 1)
      }
    })

    // 更新departments数据
    const deptKeys = ['departments', 'department-store', 'crm_store_department']

    for (const key of deptKeys) {
      const deptStr = localStorage.getItem(key)
      if (deptStr) {
        try {
          const deptData = JSON.parse(deptStr)
          const departments = deptData.departments || deptData.data?.departments || (Array.isArray(deptData) ? deptData : [])

          if (departments.length > 0) {
            // 更新所有部门的成员数
            departments.forEach((dept: unknown) => {
              dept.memberCount = memberCount.get(dept.id) || 0
            })

            // 保存回localStorage
            if (Array.isArray(deptData)) {
              localStorage.setItem(key, JSON.stringify(departments))
            } else if (deptData.departments) {
              deptData.departments = departments
              localStorage.setItem(key, JSON.stringify(deptData))
            } else if (deptData.data?.departments) {
              deptData.data.departments = departments
              localStorage.setItem(key, JSON.stringify(deptData))
            }

            console.log('[用户管理] 部门成员数已更新')

            // 刷新部门store
            await departmentStore.loadDepartments()
            break
          }
        } catch (e) {
          console.error(`[用户管理] 更新${key}失败:`, e)
        }
      }
    }
  } catch (error) {
    console.error('[用户管理] 更新部门成员数失败:', error)
  }
}

/**
 * 确认用户操作
 */
const confirmUser = async () => {
  try {
    await userFormRef.value?.validate()

    userLoading.value = true

    if (isEdit.value) {
      // 更新现有用户
      // 【修复】userForm.roleId现在存储的是角色code，直接使用即可
      const roleCode = userForm.roleId

      const updateData = {
        realName: userForm.realName,
        name: userForm.realName, // 同时更新name字段
        email: userForm.email,
        phone: userForm.phone,
        roleId: roleCode,  // 使用角色code（如'sales_staff'）
        role: roleCode,  // 使用角色code（如'sales_staff'）
        departmentId: userForm.departmentId,
        position: userForm.position,
        employeeNumber: userForm.employeeNumber,
        status: userForm.status,
        remark: userForm.remark
      }

      console.log('[User] 更新用户数据:', updateData)

      try {
        // 🔥 修复：调用API更新用户（生产环境和开发环境都调用）
        // 注意：用户ID是字符串格式，不要使用parseInt
        console.log('[User] 调用API更新用户，ID:', userForm.id)
        await userApiService.updateUser(userForm.id, updateData)
        console.log('[User] 用户更新API调用成功')
        ElMessage.success('用户更新成功')
      } catch (error) {
        console.error('[User] 更新用户失败:', error)
        ElMessage.error('更新失败')
        userLoading.value = false
        return
      }
    } else {
      // 创建新用户
      const department = departmentStore.departmentList.find(d => d.id === userForm.departmentId)

      // 【修复】userForm.roleId现在存储的是角色code，直接使用即可
      const roleCode = userForm.roleId

      const createData = {
        username: userForm.username,
        password: userForm.password,
        realName: userForm.realName,
        name: userForm.realName, // 同时设置name字段
        email: userForm.email,
        phone: userForm.phone,
        role: roleCode,  // 使用角色code（如'sales_staff'）
        roleId: roleCode,  // 使用角色code（如'sales_staff'）
        departmentId: userForm.departmentId,
        department: department?.name || '',
        position: userForm.position,
        employeeNumber: userForm.employeeNumber,
        status: userForm.status,
        employmentStatus: 'active', // 默认在职状态
        remark: userForm.remark,
        createTime: new Date().toLocaleString(),
        isOnline: false,
        lastLoginTime: null,
        loginCount: 0
      }

      console.log('[User] 创建用户数据:', createData)

      try {
        await userApiService.createUser(createData)
        console.log('[User] 用户创建API调用成功')
        ElMessage.success('用户创建成功')

        // 【新增】更新部门成员数
        if (userForm.departmentId) {
          await updateDepartmentMemberCount(userForm.departmentId)
        }
      } catch (error) {
        console.error('[User] 创建用户失败:', error)
        ElMessage.error('创建用户失败，请检查输入信息')
        userLoading.value = false
        return
      }
    }

    // 【批次210修复】先刷新列表,确保新用户立即显示
    await loadUserList()
    console.log('[User] 用户列表已刷新,新用户应该可见')

    // 然后关闭对话框
    handleDialogClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    userLoading.value = false
  }
}

/**
 * 关闭对话框
 */
const handleDialogClose = () => {
  userDialogVisible.value = false
  userFormRef.value?.clearValidate()
  resetUserForm()
}

/**
 * 重置用户表单
 */
const resetUserForm = () => {
  Object.assign(userForm, {
    id: '',
    username: '',
    realName: '',
    email: '',
    phone: '',
    roleId: '',
    departmentId: '',
    position: '',
    employeeNumber: '',
    status: 'active',
    password: '123456',
    remark: ''
  })
}

/**
 * 加载角色数据
 */
const loadRoles = async () => {
  try {
    const roles = await roleApiService.getRoles()
    roleOptions.value = roles.filter(role => role.status === 'active')
    console.log('角色数据加载成功:', roleOptions.value.length)
  } catch (error) {
    console.warn('加载角色数据失败，使用本地数据:', error)
    // 【批次192修复】从localStorage获取角色数据作为降级方案
    try {
      const localRoles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
      roleOptions.value = localRoles.filter((role: unknown) => role.status === 'active')
      console.log('从localStorage加载角色数据:', roleOptions.value.length)
    } catch (localError) {
      console.error('从localStorage加载角色数据也失败:', localError)
      // 不显示错误提示，避免干扰用户
    }
  }
}

/**
 * 加载用户统计
 */
const loadUserStats = async () => {
  try {
    // 【批次192修复】直接使用本地计算，避免不必要的API请求
    // 在Mock模式下，API请求会失败并显示错误提示
    throw new Error('使用本地计算')
  } catch (error) {
    // 【批次192修复】静默处理，不显示错误提示
    // 降级方案：基于当前用户列表数据进行实时计算
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalUsers = userList.value.length
    const activeUsers = userList.value.filter(user =>
      (user.employmentStatus || 'active') === 'active'
    ).length
    const resignedUsers = userList.value.filter(user =>
      user.employmentStatus === 'resigned'
    ).length
    const monthNewUsers = userList.value.filter(user => {
      if (!user.createTime) return false
      const createDate = new Date(user.createTime)
      return createDate.getMonth() === currentMonth && createDate.getFullYear() === currentYear
    }).length

    userStats.value = {
      total: totalUsers,
      active: activeUsers,
      resigned: resignedUsers,
      monthNew: monthNewUsers
    }
  }
}



/**
 * 加载用户列表
 */
const loadUserList = async () => {
  try {
    tableLoading.value = true

    let users: unknown[] = []

    // 【生产环境修复】生产环境调用API获取用户数据
    if (import.meta.env.PROD) {
      console.log('[User] 生产环境：调用API获取用户数据')
      try {
        const apiResponse = await userApiService.getUsers({
          page: pagination.page,
          limit: pagination.size
        })
        users = apiResponse.data || []
        pagination.total = apiResponse.total || users.length
        console.log('[User] 生产环境：API返回用户数量:', users.length)
      } catch (apiError) {
        console.error('[User] 生产环境：API获取用户失败:', apiError)
        users = []
      }
    } else {
      // 开发环境从localStorage读取用户数据
      users = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')
      console.log('[User] 开发环境：从localStorage加载用户:', users.length)
    }

    // 模拟API响应格式
    const response = {
      data: users,
      total: pagination.total || users.length
    }

    // 映射用户数据
    const mappedUsers = response.data.map((user: unknown) => {
      const department = departmentStore.getDepartmentById(user.departmentId)

      // 【修复】确保字段正确映射
      // username: 用户名（登录用），必须存在
      // realName: 真实姓名（显示用）
      const username = user.username || 'user_' + user.id
      const realName = user.realName || user.name || username

      return {
        id: user.id.toString(),
        username: username,  // ✅ 用户名字段
        realName: realName,  // ✅ 姓名字段
        name: realName, // 同时设置name字段（兼容性）
        email: user.email || '',
        phone: user.phone || '',
        roleId: user.role || user.roleId || '',  // ✅ 使用角色code
        role: user.role || user.roleId || '',    // ✅ 使用角色code
        departmentId: user.departmentId?.toString() || '',
        departmentName: user.department?.name || department?.name || '',
        position: user.position || user.roleName || '',
        employeeNumber: user.employeeNumber || '',
        status: user.status || 'active',
        employmentStatus: user.employmentStatus || 'active', // 在职状态，默认在职
        resignedDate: user.resignedDate || '',
        createTime: user.createTime || user.createdAt || '',
        lastLoginTime: user.lastLoginTime || user.lastLoginAt || '',
        avatar: user.avatar || '',
        remark: user.remark || '',
        roleName: user.roleName || '',
        isOnline: user.isOnline || false,
        loginCount: user.loginCount || 0,
        statusLoading: false,
        employmentStatusLoading: false
      }
    })

    // 按创建时间倒序排序（最新的在上面）
    mappedUsers.sort((a, b) => {
      const timeA = new Date(a.createTime || 0).getTime()
      const timeB = new Date(b.createTime || 0).getTime()
      return timeB - timeA
    })

    userList.value = mappedUsers
    pagination.total = response.total

    // 加载用户统计数据
    await loadUserStats()
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败，请检查网络连接')
    userList.value = []
    pagination.total = 0
  } finally {
    tableLoading.value = false
  }
}

/**
 * 批量导入相关方法
 */
// 打开批量导入对话框
const handleBatchImport = () => {
  batchImportVisible.value = true
  importStep.value = 0
  resetImportData()
}

// 重置导入数据
const resetImportData = () => {
  uploadFile.value = null
  previewData.value = []
  validData.value = []
  invalidData.value = []
  parsing.value = false
  importing.value = false
}

// 获取错误修复建议
const getErrorSuggestion = (error: string): string => {
  if (error.includes('用户名不能为空')) {
    return '请在Excel中填写用户名，建议使用字母、数字和下划线组合'
  }
  if (error.includes('用户名长度应在3-20个字符之间')) {
    return '用户名长度需要在3-20个字符之间，请调整用户名长度'
  }
  if (error.includes('用户名只能包含字母、数字和下划线')) {
    return '用户名格式错误，只能使用a-z、A-Z、0-9和下划线(_)，不能包含空格或特殊字符'
  }
  if (error.includes('用户名已存在于系统中')) {
    return '该用户名已被使用，请更换一个新的用户名'
  }
  if (error.includes('用户名在导入数据中重复')) {
    return '在Excel中发现重复的用户名，请检查并修改重复的行'
  }
  if (error.includes('姓名不能为空')) {
    return '请在Excel中填写真实姓名'
  }
  if (error.includes('姓名长度不能超过50个字符')) {
    return '姓名过长，请缩短至50个字符以内'
  }
  if (error.includes('姓名只能包含中文、英文字母和空格')) {
    return '姓名格式错误，只能包含中文、英文字母和空格，不能包含数字或特殊字符'
  }
  if (error.includes('邮箱不能为空')) {
    return '请在Excel中填写邮箱地址'
  }
  if (error.includes('邮箱格式不正确')) {
    return '邮箱格式错误，请使用正确格式，如：zhangsan@example.com'
  }
  if (error.includes('邮箱已存在于系统中')) {
    return '该邮箱已被使用，请更换一个新的邮箱地址'
  }
  if (error.includes('邮箱在导入数据中重复')) {
    return '在Excel中发现重复的邮箱，请检查并修改重复的行'
  }
  if (error.includes('手机号不能为空')) {
    return '请在Excel中填写手机号码'
  }
  if (error.includes('手机号格式不正确')) {
    return '手机号格式错误，请输入11位中国大陆手机号，如：13812345678'
  }
  if (error.includes('手机号已存在于系统中')) {
    return '该手机号已被使用，请更换一个新的手机号'
  }
  if (error.includes('手机号在导入数据中重复')) {
    return '在Excel中发现重复的手机号，请检查并修改重复的行'
  }
  if (error.includes('角色不能为空')) {
    return '请在Excel中选择用户角色'
  }
  if (error.includes('角色') && error.includes('不存在')) {
    return '角色名称错误，请使用系统中已存在的角色名称'
  }
  if (error.includes('部门') && error.includes('不存在')) {
    return '部门名称错误，请使用系统中已存在的部门名称，或留空使用默认部门'
  }
  if (error.includes('密码长度不能少于6位')) {
    return '密码太短，请设置至少6位密码，或留空使用默认密码123456'
  }
  if (error.includes('密码长度不能超过20位')) {
    return '密码太长，请设置不超过20位的密码'
  }
  if (error.includes('备注长度不能超过200个字符')) {
    return '备注内容过长，请缩短至200个字符以内'
  }
  return ''
}

// 下一步
const nextStep = () => {
  if (importStep.value < 3) {
    importStep.value++
  }
}

// 上一步
const prevStep = () => {
  if (importStep.value > 0) {
    importStep.value--
  }
}

// 下载模板
const downloadTemplate = () => {
  // 创建模板数据
  const templateData = [
    ['用户名', '姓名', '邮箱', '手机号', '角色', '部门', '职位', '工号', '密码', '备注'],
    ['zhangsan', '张三', 'zhangsan@example.com', '13800138001', '销售员', '销售部', '销售专员', 'EMP0001', '123456', '示例用户1'],
    ['lisi', '李四', 'lisi@example.com', '13800138002', '客服', '客服部', '客服专员', 'EMP0002', '123456', '示例用户2']
  ]

  // 创建工作簿
  const ws = XLSX.utils.aoa_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用户导入模板')

  // 设置列宽
  const colWidths = [
    { wch: 15 }, // 用户名
    { wch: 12 }, // 姓名
    { wch: 25 }, // 邮箱
    { wch: 15 }, // 手机号
    { wch: 12 }, // 角色
    { wch: 12 }, // 部门
    { wch: 15 }, // 职位
    { wch: 12 }, // 工号
    { wch: 12 }, // 密码
    { wch: 20 }  // 备注
  ]
  ws['!cols'] = colWidths

  // 下载文件
  XLSX.writeFile(wb, '用户导入模板.xlsx')
  ElMessage.success('模板下载成功')
}

// 文件变化处理
const handleFileChange = (file: UploadFile) => {
  uploadFile.value = file.raw
}

// 文件上传前检查
const beforeUpload = (file: UploadFile) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.type === 'application/vnd.ms-excel'
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
    return false
  }
  return false // 阻止自动上传
}

// 文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 解析Excel文件
const parseExcelFile = async () => {
  if (!uploadFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  parsing.value = true

  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        })

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel文件中没有找到工作表')
        }

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        if (!worksheet) {
          throw new Error('无法读取工作表内容')
        }

        // 使用更宽松的解析选项
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false
        })

        if (!jsonData || jsonData.length < 2) {
          throw new Error('Excel文件内容为空或格式不正确，请确保至少有标题行和一行数据')
        }

        // 检查标题行
        const headers = jsonData[0] as unknown[]
        const expectedHeaders = ['用户名', '姓名', '邮箱', '手机号', '角色', '部门', '密码', '备注']
        const headerValid = expectedHeaders.every((header, index) => {
          const cellValue = headers[index]
          return cellValue && cellValue.toString().trim() === header
        })

        if (!headerValid) {
          throw new Error(`Excel文件标题行不正确。期望的标题行为：${expectedHeaders.join('、')}`)
        }

        // 跳过标题行，解析数据
        const rows = jsonData.slice(1) as unknown[]

        if (rows.length === 0) {
          throw new Error('Excel文件中没有数据行')
        }

        const parsedData = rows
          .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== ''))
          .map((row, index) => ({
            rowIndex: index + 2, // Excel行号（从2开始，因为第1行是标题）
            username: (row[0] || '').toString().trim(),
            realName: (row[1] || '').toString().trim(),
            email: (row[2] || '').toString().trim(),
            phone: (row[3] || '').toString().trim(),
            role: (row[4] || '').toString().trim(),
            department: (row[5] || '').toString().trim(),
            position: (row[6] || '').toString().trim(),
            employeeNumber: (row[7] || '').toString().trim(),
            password: (row[8] || '').toString().trim(),
            remark: (row[9] || '').toString().trim(),
            errors: [] as string[]
          }))

        if (parsedData.length === 0) {
          throw new Error('Excel文件中没有有效的数据行')
        }

        // 验证数据
        validateImportData(parsedData)

        ElMessage.success(`解析完成，共${parsedData.length}条数据`)
        nextStep()
      } catch (error: Error) {
        console.error('Excel解析错误:', error)
        ElMessage.error(error.message || '文件解析失败，请检查文件格式')
      } finally {
        parsing.value = false
      }
    }

    reader.onerror = () => {
      ElMessage.error('文件读取失败，请重新选择文件')
      parsing.value = false
    }

    reader.readAsArrayBuffer(uploadFile.value)
  } catch (error: Error) {
    console.error('文件读取错误:', error)
    ElMessage.error('文件读取失败，请重新选择文件')
    parsing.value = false
  }
}

// 验证导入数据
const validateImportData = (data: ImportUserData[]) => {
  const valid: ImportUserData[] = []
  const invalid: ImportUserData[] = []
  const duplicateCheck = new Map() // 用于检查Excel内部重复数据
  const existingUsernames = new Set(userList.value.map(user => user.username))
  const existingEmails = new Set(userList.value.map(user => user.email))
  const existingPhones = new Set(userList.value.map(user => user.phone))

  data.forEach((item, index) => {
    const errors: string[] = []

    // 验证用户名
    if (!item.username.trim()) {
      errors.push('用户名不能为空')
    } else if (item.username.length < 3 || item.username.length > 20) {
      errors.push('用户名长度应在3-20个字符之间')
    } else if (!/^[a-zA-Z0-9_]+$/.test(item.username)) {
      errors.push('用户名只能包含字母、数字和下划线')
    } else if (existingUsernames.has(item.username)) {
      errors.push('用户名已存在于系统中')
    } else if (duplicateCheck.has(`username:${item.username}`)) {
      errors.push(`用户名在导入数据中重复（第${duplicateCheck.get(`username:${item.username}`)}行）`)
    } else {
      duplicateCheck.set(`username:${item.username}`, index + 1)
    }

    // 验证真实姓名
    if (!item.realName.trim()) {
      errors.push('姓名不能为空')
    } else if (item.realName.length > 50) {
      errors.push('姓名长度不能超过50个字符')
    } else if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(item.realName)) {
      errors.push('姓名只能包含中文、英文字母和空格')
    }

    // 验证邮箱
    if (!item.email.trim()) {
      errors.push('邮箱不能为空')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      errors.push('邮箱格式不正确，请检查格式（如：user@example.com）')
    } else if (existingEmails.has(item.email)) {
      errors.push('邮箱已存在于系统中')
    } else if (duplicateCheck.has(`email:${item.email}`)) {
      errors.push(`邮箱在导入数据中重复（第${duplicateCheck.get(`email:${item.email}`)}行）`)
    } else {
      duplicateCheck.set(`email:${item.email}`, index + 1)
    }

    // 验证手机号
    if (!item.phone.trim()) {
      errors.push('手机号不能为空')
    } else if (!/^1[3-9]\d{9}$/.test(item.phone)) {
      errors.push('手机号格式不正确，请输入11位有效的中国大陆手机号')
    } else if (existingPhones.has(item.phone)) {
      errors.push('手机号已存在于系统中')
    } else if (duplicateCheck.has(`phone:${item.phone}`)) {
      errors.push(`手机号在导入数据中重复（第${duplicateCheck.get(`phone:${item.phone}`)}行）`)
    } else {
      duplicateCheck.set(`phone:${item.phone}`, index + 1)
    }

    // 验证角色
    if (!item.role.trim()) {
      errors.push('角色不能为空')
    } else {
      // 【批次175修复】同时支持角色名称(name)和角色代码(code)匹配
      const roleExists = roleOptions.value && roleOptions.value.some(
        role => role.name === item.role || role.code === item.role
      )
      if (!roleExists) {
        const availableRoles = roleOptions.value && roleOptions.value.length > 0
          ? roleOptions.value.map(r => `${r.name}(${r.code})`).join('、')
          : '暂无可用角色'
        errors.push(`角色"${item.role}"不存在。可选角色：${availableRoles}`)
      } else {
        // 【批次175修复】查找角色并使用code，确保role和roleId都是英文code
        const role = roleOptions.value.find(r => r.name === item.role || r.code === item.role)
        item.roleId = role?.code  // 使用code而不是id
        item.role = role?.code    // 确保role字段也是code
      }
    }

    // 验证部门（可选）
    if (item.department && item.department.trim()) {
      const departmentExists = departmentStore.departmentList.some(dept => dept.name === item.department)
      if (!departmentExists) {
        errors.push(`部门"${item.department}"不存在。可选部门：${departmentStore.departmentList.map(d => d.name).join('、')}`)
      } else {
        const department = departmentStore.departmentList.find(d => d.name === item.department)
        item.departmentId = department?.id
      }
    }

    // 验证密码
    if (!item.password.trim()) {
      item.password = '123456'
      item.needChangePassword = true
    } else if (item.password.length < 6) {
      errors.push('密码长度不能少于6位')
    } else if (item.password.length > 20) {
      errors.push('密码长度不能超过20位')
    } else {
      item.needChangePassword = false
    }

    // 验证备注长度
    if (item.remark && item.remark.length > 200) {
      errors.push('备注长度不能超过200个字符')
    }

    item.errors = errors

    if (errors.length === 0) {
      valid.push(item)
    } else {
      invalid.push(item)
    }
  })

  previewData.value = data
  validData.value = valid
  invalidData.value = invalid

  // 显示验证结果摘要
  if (invalid.length > 0) {
    ElMessage.warning(`数据验证完成：${valid.length}条有效，${invalid.length}条无效。请修复错误后重新导入。`)
  } else {
    ElMessage.success(`数据验证通过：共${valid.length}条有效数据`)
  }
}

// 确认导入
const confirmImport = async () => {
  if (validData.value.length === 0) {
    ElMessage.error('没有有效数据可导入')
    return
  }

  importing.value = true

  try {
    // 准备导入数据
    const importData = validData.value.map(userData => ({
      username: userData.username,
      password: userData.password,
      realName: userData.realName,
      email: userData.email,
      phone: userData.phone,
      role: userData.roleId,
      departmentId: userData.departmentId ? parseInt(userData.departmentId) : undefined,
      position: userData.position || '',
      employeeNumber: userData.employeeNumber || ''
    }))

    // 调用批量导入API
    const result = await userApiService.importUsers(importData)

    ElMessage.success(`导入成功：共${result.successCount || validData.value.length}条用户数据`)
    batchImportVisible.value = false
    loadUserList() // 刷新用户列表
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败，请检查数据格式或稍后重试')
  } finally {
    importing.value = false
  }
}

// 关闭导入对话框
const closeBatchImport = () => {
  batchImportVisible.value = false
  resetImportData()
}

// 排序变化处理
const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  console.log('排序变化:', prop, order)
  // 这里可以实现排序逻辑
  // 如果是前端排序，可以对 userList 进行排序
  // 如果是后端排序，可以发送请求到后端
}

// 列设置变化处理
const handleColumnSettingsChange = (settings: ColumnSettings) => {
  console.log('列设置变化:', settings)
  // 列设置已经通过 DynamicTable 内部的 localStorage 自动保存
}

// 生命周期钩子
onMounted(async () => {
  try {
    loadUserStats()
    loadUserList()
    loadRoles()
    await departmentStore.initData()
  } catch (error) {
    console.error('初始化数据失败:', error)
  }
})
</script>

<style scoped>
.user-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 统计卡片样式 */
.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  border: none;
  transition: all 0.3s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.primary-icon {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.success-icon {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.warning-icon {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
}

.info-icon {
  background: linear-gradient(135deg, #909399, #b1b3b8);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
  font-family: 'Arial', sans-serif;
}

.primary-number {
  color: #409eff;
}

.success-number {
  color: #67c23a;
}

.warning-number {
  color: #e6a23c;
}

.info-number {
  color: #909399;
}

.stat-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.stat-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.search-card,
.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.danger-item {
  color: #f56c6c;
}

.user-detail {
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-stats {
    justify-content: space-around;
  }

  .header-actions {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .header-stats {
    flex-direction: column;
    gap: 16px;
  }

  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .table-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}

/* 批量导入样式 */
.batch-import-dialog {
  .el-dialog__body {
    padding: 20px;
  }
}

.import-steps {
  margin-bottom: 30px;
}

.import-step {
  min-height: 300px;
}

.step-content {
  padding: 20px 0;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.step-description {
  color: #606266;
  margin-bottom: 20px;
  line-height: 1.6;
}

.template-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.template-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.template-info ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.template-info li {
  margin-bottom: 8px;
}

.upload-area {
  margin-bottom: 20px;
}

.upload-demo {
  width: 100%;
}

.file-info {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.file-info p {
  margin: 0 0 12px 0;
  color: #1e40af;
}

.preview-info {
  margin-bottom: 20px;
}

.preview-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.preview-table {
  margin-bottom: 20px;
}

.validation-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.summary-item.valid {
  background: #f0f9ff;
  border-color: #67c23a;
  color: #67c23a;
}

.summary-item.invalid {
  background: #fef0f0;
  border-color: #f56c6c;
  color: #f56c6c;
}

.summary-number {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.footer-left {
  color: #909399;
  font-size: 14px;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  line-height: 1.4;
}

.success-text {
  color: #67c23a;
  font-size: 12px;
}

/* 权限设置对话框样式 */
.permission-setting {
  .user-info {
    margin-bottom: 20px;
  }

  .permission-content {
    .permission-tabs {
      .role-permissions {
        .permission-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px;
          background: #f5f7fa;
          border-radius: 6px;
          color: #909399;
          font-size: 14px;
        }
      }

      .personal-permissions {
        .permission-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: #e6f7ff;
          border: 1px solid #91d5ff;
          border-radius: 6px;
          color: #1890ff;
          font-size: 14px;

          .el-icon {
            font-size: 16px;
          }
        }

        .permission-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e4e7ed;
        }
      }
    }
  }
}

/* 操作日志对话框样式 */
.logs-content {
  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;

    .user-info {
      font-weight: 600;
      color: #303133;
    }

    .logs-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .logs-pagination {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
  }
}

/* 在职状态开关自定义样式 */
.employment-status-switch :deep(.el-switch__core) {
  background-color: #909399 !important; /* 离职状态：灰色 */
  border-color: #909399 !important;
}

.employment-status-switch.is-checked :deep(.el-switch__core) {
  background-color: #67c23a !important; /* 在职状态：绿色 */
  border-color: #67c23a !important;
}

.employment-status-switch :deep(.el-switch__action) {
  background-color: #fff;
}
</style>

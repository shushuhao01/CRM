<template>
  <div class="role-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>角色权限管理</h2>
        <div class="stats-section">
          <el-card class="stat-card primary" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon primary">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number primary">{{ roleStats.total }}</div>
                <div class="stat-title">角色总数</div>
                <div class="stat-desc">系统中所有角色数量</div>
              </div>
            </div>
          </el-card>

          <el-card class="stat-card success" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon success">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number success">{{ roleStats.active }}</div>
                <div class="stat-title">启用角色</div>
                <div class="stat-desc">当前启用的角色数量</div>
              </div>
            </div>
          </el-card>

          <el-card class="stat-card warning" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon warning">
                <el-icon><Lock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number warning">{{ roleStats.permissions }}</div>
                <div class="stat-title">权限总数</div>
                <div class="stat-desc">系统中所有权限数量</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canAddRole"
          @click="handleAdd"
          type="primary"
          :icon="Plus"
        >
          新增角色
        </el-button>
        <el-button
          v-if="canManagePermissions"
          @click="handlePermissionManage"
          :icon="Setting"
        >
          权限管理
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="角色名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入角色名称"
            clearable
            style="width: 200px"
          />
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
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>角色列表</span>
          <div class="table-actions">
            <el-button
              v-if="canDeleteRole"
              @click="handleBatchDelete"
              :disabled="!selectedRoles.length"
              type="danger"
              size="small"
              :icon="Delete"
            >
              批量删除
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('active')"
              :disabled="!selectedRoles.length"
              size="small"
              :icon="Check"
            >
              批量启用
            </el-button>
            <el-button
              v-if="canBatchOperation"
              @click="handleBatchStatus('inactive')"
              :disabled="!selectedRoles.length"
              size="small"
              :icon="Close"
            >
              批量禁用
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="roleList"
        v-loading="tableLoading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip
              :content="isNonDisableableRole(row) ? '系统预设角色不可禁用' : (row.status === 'active' ? '点击禁用' : '点击启用')"
              placement="top"
            >
              <el-switch
                v-model="row.status"
                active-value="active"
                inactive-value="inactive"
                :disabled="isNonDisableableRole(row)"
                @change="handleRoleStatusChange(row)"
                :loading="row.statusLoading"
              />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="角色类型" width="140">
          <template #default="{ row }">
            <el-select
              v-model="row.roleType"
              size="small"
              @change="handleRoleTypeChange(row)"
              :disabled="!canEditRole || isSystemPresetRole(row)"
            >
              <el-option label="系统角色" value="system" />
              <el-option label="业务角色" value="business" />
              <el-option label="临时角色" value="temporary" />
              <el-option label="自定义角色" value="custom" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="用户数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewUsers(row)" type="primary">
              {{ row.userCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="权限数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewPermissions(row)" type="primary">
              {{ row.permissionCount }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="canEditRole"
              @click="handleEdit(row)"
              type="primary"
              size="small"
              link
            >
              编辑
            </el-button>
            <el-button
              v-if="canAssignPermissions"
              @click="handlePermissions(row)"
              type="primary"
              size="small"
              link
            >
              权限设置
            </el-button>
            <el-dropdown
              v-if="canEditRole || canDeleteRole"
              @command="(cmd) => handleDropdownCommand(cmd, row)"
            >
              <el-button type="primary" size="small" link>
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="canEditRole"
                    command="copy"
                  >
                    复制角色
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="canEditRole"
                    command="toggle"
                  >
                    {{ row.status === 'active' ? '禁用' : '启用' }}
                  </el-dropdown-item>
                  <el-tooltip
                    :content="isSystemPresetRole(row) ? '系统预设角色不可删除' : ''"
                    :disabled="!isSystemPresetRole(row)"
                    placement="left"
                  >
                    <el-dropdown-item
                      v-if="canDeleteRole"
                      command="delete"
                      divided
                      class="danger-item"
                      :disabled="isSystemPresetRole(row)"
                    >
                      删除
                    </el-dropdown-item>
                  </el-tooltip>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="dialogTitle"
      width="600px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleFormRules"
        label-width="100px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input
            v-model="roleForm.name"
            placeholder="请输入角色名称"
          />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="roleForm.code"
            placeholder="请输入角色编码"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="角色类型" prop="roleType">
          <el-select v-model="roleForm.roleType" placeholder="请选择角色类型">
            <el-option label="系统角色" value="system" />
            <el-option label="业务角色" value="business" />
            <el-option label="临时角色" value="temporary" />
            <el-option label="自定义角色" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roleForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button @click="confirmRole" type="primary" :loading="roleLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="权限设置"
      width="800px"
      :before-close="handlePermissionDialogClose"
    >
      <div class="permission-setting">
        <div class="role-info">
          <h4>角色：{{ currentRole?.name }}</h4>
          <p>{{ currentRole?.description }}</p>
        </div>

        <el-divider />

        <el-tabs v-model="permissionActiveTab" type="card">
          <!-- 权限设置标签页 -->
          <el-tab-pane label="权限设置" name="permissions">
            <div class="permission-tree">
              <el-tree
                ref="permissionTreeRef"
                :data="permissionTree"
                :props="treeProps"
                show-checkbox
                node-key="id"
                :default-checked-keys="checkedPermissions"
                :check-strictly="true"
                @check="handlePermissionCheck"
              >
                <template #default="{ node, data }">
                  <span class="tree-node">
                    <el-icon v-if="data.icon" class="node-icon">
                      <component :is="data.icon" />
                    </el-icon>
                    <span>{{ data.name }}</span>
                    <el-tag v-if="data.type" size="small" class="node-tag">
                      {{ data.type }}
                    </el-tag>
                  </span>
                </template>
              </el-tree>
            </div>
          </el-tab-pane>

          <!-- 数据设置标签页 -->
          <el-tab-pane label="数据设置" name="dataScope">
            <div class="data-scope-setting">
              <div class="scope-title">数据范围</div>
              <el-radio-group v-model="currentRoleDataScope" @change="handleDataScopeChange" class="scope-radio-group">
                <div class="scope-item">
                  <el-radio label="all">
                    <span class="scope-label">全部数据</span>
                    <span class="scope-tip">可查看系统中所有数据，适用于管理员角色</span>
                  </el-radio>
                </div>
                <div class="scope-item">
                  <el-radio label="department">
                    <span class="scope-label">部门数据</span>
                    <span class="scope-tip">仅可查看本部门及下属部门的数据，适用于部门经理</span>
                  </el-radio>
                </div>
                <div class="scope-item">
                  <el-radio label="self">
                    <span class="scope-label">个人数据</span>
                    <span class="scope-tip">仅可查看自己创建的数据，适用于普通员工</span>
                  </el-radio>
                </div>
              </el-radio-group>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePermissionDialogClose">取消</el-button>
          <el-button @click="resetToDefaultPermissions" type="warning">
            恢复默认
          </el-button>
          <el-button @click="confirmPermissions" type="primary" :loading="permissionLoading">
            保存权限
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限管理对话框 -->
    <el-dialog
      v-model="permissionManageDialogVisible"
      title="权限管理"
      width="1000px"
    >
      <div class="permission-manage">
        <div class="manage-header">
          <el-button @click="handleAddPermission" type="primary" :icon="Plus">
            新增权限
          </el-button>
          <el-button @click="handleExpandAll" :icon="Expand">
            展开全部
          </el-button>
          <el-button @click="handleCollapseAll" :icon="Fold">
            收起全部
          </el-button>
        </div>

        <el-table
          :data="allPermissions"
          row-key="id"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          style="width: 100%; margin-top: 20px"
        >
          <el-table-column prop="name" label="权限名称" width="200" />
          <el-table-column prop="code" label="权限编码" width="200" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getPermissionTypeColor(row.type)" size="small">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="path" label="路径" show-overflow-tooltip />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                {{ row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button @click="handleEditPermission(row)" type="primary" size="small" link>
                编辑
              </el-button>
              <el-button @click="handleDeletePermission(row)" type="danger" size="small" link>
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 新增/编辑权限对话框 -->
    <el-dialog
      v-model="permissionFormDialogVisible"
      :title="permissionDialogTitle"
      width="500px"
    >
      <el-form
        ref="permissionFormRef"
        :model="permissionForm"
        :rules="permissionFormRules"
        label-width="100px"
      >
        <el-form-item label="上级权限" prop="parentId">
          <el-tree-select
            v-model="permissionForm.parentId"
            :data="permissionTreeSelect"
            :props="{ label: 'name', value: 'id' }"
            placeholder="请选择上级权限"
            clearable
            check-strictly
          />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input
            v-model="permissionForm.name"
            placeholder="请输入权限名称"
          />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input
            v-model="permissionForm.code"
            placeholder="请输入权限编码"
          />
        </el-form-item>
        <el-form-item label="权限类型" prop="type">
          <el-select v-model="permissionForm.type" placeholder="请选择权限类型">
            <el-option label="菜单" value="menu" />
            <el-option label="按钮" value="button" />
            <el-option label="接口" value="api" />
          </el-select>
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <el-input
            v-model="permissionForm.path"
            placeholder="请输入路径"
          />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input
            v-model="permissionForm.icon"
            placeholder="请输入图标名称"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="permissionForm.sort"
            :min="0"
            placeholder="排序"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="permissionForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="permissionFormDialogVisible = false">取消</el-button>
          <el-button @click="confirmPermissionForm" type="primary" :loading="permissionFormLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 用户列表弹窗 -->
    <el-dialog
      v-model="userListDialogVisible"
      :title="`角色「${currentViewRole?.name}」的用户列表`"
      width="1200px"
      @close="handleCloseUserDialog"
    >
      <div class="user-list-content">
        <!-- 用户统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon primary"><UserFilled /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ userStats.total }}</div>
                  <div class="stat-mini-label">总用户数</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon success"><User /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ userStats.active }}</div>
                  <div class="stat-mini-label">在职用户</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon warning"><OfficeBuilding /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ userStats.departments }}</div>
                  <div class="stat-mini-label">涉及部门</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon info"><Clock /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ userStats.lastLogin }}</div>
                  <div class="stat-mini-label">近7天活跃</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 搜索和筛选 -->
        <div class="list-header">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="userSearchKeyword"
                placeholder="搜索用户名、姓名或邮箱"
                clearable
                @input="handleUserSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="userStatusFilter"
                placeholder="状态筛选"
                clearable
                @change="handleUserSearch"
              >
                <el-option label="全部" value="" />
                <el-option label="在职" value="active" />
                <el-option label="离职" value="inactive" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="userDepartmentFilter"
                placeholder="部门筛选"
                clearable
                @change="handleUserSearch"
              >
                <el-option label="全部" value="" />
                <el-option
                  v-for="dept in userDepartmentList"
                  :key="dept"
                  :label="dept"
                  :value="dept"
                />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-button type="primary" @click="handleExportUsers" style="width: 100%">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </el-col>
          </el-row>
        </div>

        <!-- 用户表格 -->
        <el-table
          :data="paginatedRoleUsers"
          style="width: 100%; margin-top: 20px"
          v-loading="userListLoading"
          stripe
        >
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="realName" label="姓名" width="120" />
          <el-table-column prop="email" label="邮箱" width="200" show-overflow-tooltip />
          <el-table-column prop="department" label="部门" width="150" />
          <el-table-column prop="position" label="职位" width="120" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                {{ row.status === 'active' ? '在职' : '离职' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="handleViewUserDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container" v-if="filteredRoleUsers.length > 0">
          <el-pagination
            v-model:current-page="userPagination.page"
            v-model:page-size="userPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredRoleUsers.length"
            layout="total, sizes, prev, pager, next, jumper"
            small
          />
        </div>
      </div>
    </el-dialog>

    <!-- 权限列表弹窗 -->
    <el-dialog
      v-model="permissionListDialogVisible"
      :title="`角色「${currentViewRole?.name}」的权限列表`"
      width="1200px"
      @close="handleClosePermissionDialog"
    >
      <div class="permission-list-content">
        <!-- 权限统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon primary"><Lock /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ permissionStats.total }}</div>
                  <div class="stat-mini-label">总权限数</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon success"><Menu /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ permissionStats.menu }}</div>
                  <div class="stat-mini-label">菜单权限</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon warning"><Operation /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ permissionStats.action }}</div>
                  <div class="stat-mini-label">操作权限</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card-mini">
              <div class="stat-mini-content">
                <el-icon class="stat-mini-icon info"><Grid /></el-icon>
                <div class="stat-mini-info">
                  <div class="stat-mini-value">{{ permissionStats.modules }}</div>
                  <div class="stat-mini-label">功能模块</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 搜索和筛选 -->
        <div class="list-header">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input
                v-model="permissionSearchKeyword"
                placeholder="搜索权限名称、编码或描述"
                clearable
                @input="handlePermissionSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="permissionTypeFilter"
                placeholder="类型筛选"
                clearable
                @change="handlePermissionSearch"
              >
                <el-option label="全部" value="" />
                <el-option label="菜单" value="menu" />
                <el-option label="操作" value="action" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select
                v-model="permissionModuleFilter"
                placeholder="模块筛选"
                clearable
                @change="handlePermissionSearch"
              >
                <el-option label="全部" value="" />
                <el-option
                  v-for="module in permissionModuleList"
                  :key="module"
                  :label="module"
                  :value="module"
                />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-button type="primary" @click="handleExportPermissions" style="width: 100%">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </el-col>
          </el-row>
        </div>

        <!-- 权限表格 -->
        <el-table
          :data="paginatedRolePermissions"
          style="width: 100%; margin-top: 20px"
          v-loading="permissionListLoading"
          stripe
        >
          <el-table-column prop="name" label="权限名称" width="200" />
          <el-table-column prop="code" label="权限编码" width="250" show-overflow-tooltip />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.type === 'menu' ? 'success' : 'warning'"
                size="small"
              >
                {{ row.type === 'menu' ? '菜单' : '操作' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="所属模块" width="150" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="handleViewPermissionDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container" v-if="filteredRolePermissions.length > 0">
          <el-pagination
            v-model:current-page="permissionPagination.page"
            v-model:page-size="permissionPagination.size"
            :page-sizes="[20, 50, 100]"
            :total="filteredRolePermissions.length"
            layout="total, sizes, prev, pager, next, jumper"
            small
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import permissionService from '@/services/permissionService'
import { roleApiService } from '@/services/roleApiService'
import { DEFAULT_ROLE_PERMISSIONS, getDefaultRolePermissions } from '@/config/defaultRolePermissions'
import { userDataService } from '@/services/userDataService'
import {
  Plus,
  Setting,
  Search,
  Refresh,
  Delete,
  Check,
  Close,
  ArrowDown,
  Expand,
  Fold,
  UserFilled,
  User,
  Lock,
  Key,
  Headset,
  OfficeBuilding,
  Clock,
  Download,
  Menu,
  Operation,
  Grid,
  Document
} from '@element-plus/icons-vue'

// 接口定义
interface RoleData {
  id: string
  name: string
  code: string
  status: 'active' | 'inactive'
  roleType?: 'system' | 'business' | 'temporary' | 'custom'
  dataScope?: 'all' | 'department' | 'self'
  description?: string
  createTime?: string
  userCount?: number
  permissionCount?: number
  permissions?: string[]
  isSystem?: boolean
  statusLoading?: boolean
}

interface PermissionData {
  id: string
  parentId: string
  name: string
  code: string
  type: string
  path?: string
  icon?: string
  sort: number
  status: string
  children?: PermissionData[]
}

interface TreeSelectData {
  id: string
  label: string
  children?: TreeSelectData[]
}

// 用户store
const userStore = useUserStore()

// 响应式数据
const tableLoading = ref(false)
const roleLoading = ref(false)
const permissionLoading = ref(false)
const permissionFormLoading = ref(false)
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const permissionManageDialogVisible = ref(false)
const permissionFormDialogVisible = ref(false)
const userListDialogVisible = ref(false)
const permissionListDialogVisible = ref(false)
const isEdit = ref(false)
const isPermissionEdit = ref(false)
const selectedRoles = ref([])
const currentRole = ref(null)
const currentViewRole = ref(null)
const checkedPermissions = ref([])

// 权限设置标签页相关
const permissionActiveTab = ref('permissions')
const currentRoleDataScope = ref<'all' | 'department' | 'self'>('self')

// 用户列表相关
const roleUsers = ref([])
const filteredRoleUsers = ref([])
const userSearchKeyword = ref('')
const userStatusFilter = ref('')
const userDepartmentFilter = ref('')
const userDepartmentList = ref([])
const userListLoading = ref(false)
const userPagination = reactive({
  page: 1,
  size: 10
})

// 权限列表相关
const rolePermissions = ref([])
const filteredRolePermissions = ref([])
const permissionSearchKeyword = ref('')
const permissionTypeFilter = ref('')
const permissionModuleFilter = ref('')
const permissionModuleList = ref([])
const permissionListLoading = ref(false)
const permissionPagination = reactive({
  page: 1,
  size: 20
})

// 角色统计
const roleStats = ref({
  total: 0,
  active: 0,
  permissions: 0
})

// 角色模板列表
const roleTemplates = ref<Array<{id: string, name: string, code: string, description: string, permissions: string[]}>>([])

// 从模板创建相关
const selectedTemplate = ref<{id: string, name: string, code: string, description: string, permissions: string[]} | null>(null)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: '',
  createTimeRange: []
})

// 角色表单
const roleForm = reactive({
  id: '',
  name: '',
  code: '',
  status: 'active',
  roleType: 'custom' as 'system' | 'business' | 'temporary' | 'custom',
  description: ''
})

// 权限表单
const permissionForm = reactive({
  id: '',
  parentId: '',
  name: '',
  code: '',
  type: 'menu',
  path: '',
  icon: '',
  sort: 0,
  status: 'active'
})

// 角色列表
const roleList = ref([])

// 权限树
const permissionTree = ref([])
const allPermissions = ref([])
const permissionTreeSelect = ref([])

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 树形组件属性
const treeProps = {
  children: 'children',
  label: 'name'
}

// 表单验证规则
const roleFormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Z_]+$/, message: '角色编码只能包含大写字母和下划线', trigger: 'blur' }
  ]
}

const permissionFormRules = {
  name: [
    { required: true, message: '请输入权限名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入权限编码', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择权限类型', trigger: 'change' }
  ]
}

// 表单引用
const roleFormRef = ref()
const permissionFormRef = ref()
const permissionTreeRef = ref()

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑角色' : '新增角色')
const permissionDialogTitle = computed(() => isPermissionEdit.value ? '编辑权限' : '新增权限')

// 用户统计
const userStats = computed(() => {
  const users = roleUsers.value
  const active = users.filter(u => u.status === 'active').length
  const departments = new Set(users.map(u => u.department)).size
  const lastLogin = users.filter(u => {
    if (!u.lastLoginTime || u.lastLoginTime === '从未登录') return false
    try {
      const lastLoginDate = new Date(u.lastLoginTime)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return lastLoginDate > sevenDaysAgo
    } catch {
      return false
    }
  }).length

  return {
    total: users.length,
    active,
    departments,
    lastLogin
  }
})

// 权限统计
const permissionStats = computed(() => {
  const permissions = rolePermissions.value
  const menu = permissions.filter(p => p.type === 'menu').length
  const action = permissions.filter(p => p.type === 'action').length
  const modules = new Set(permissions.map(p => p.module)).size

  return {
    total: permissions.length,
    menu,
    action,
    modules
  }
})

// 分页后的用户列表
const paginatedRoleUsers = computed(() => {
  const start = (userPagination.page - 1) * userPagination.size
  const end = start + userPagination.size
  return filteredRoleUsers.value.slice(start, end)
})

// 分页后的权限列表
const paginatedRolePermissions = computed(() => {
  const start = (permissionPagination.page - 1) * permissionPagination.size
  const end = start + permissionPagination.size
  return filteredRolePermissions.value.slice(start, end)
})

// 权限控制计算属性
const canAddRole = computed(() => {
  return userStore.isAdmin
})

const canEditRole = computed(() => {
  return userStore.isAdmin
})

const canDeleteRole = computed(() => {
  return userStore.isAdmin
})

const canManagePermissions = computed(() => {
  return userStore.isAdmin
})

const canAssignPermissions = computed(() => {
  return userStore.isAdmin
})

const canBatchOperation = computed(() => {
  return userStore.isAdmin
})

// 方法定义
/**
 * 获取权限类型颜色
 */
const getPermissionTypeColor = (type: string) => {
  const colors = {
    menu: 'primary',
    button: 'success',
    api: 'warning'
  }
  return colors[type] || ''
}

/**
 * 新增角色
 */
const handleAdd = () => {
  isEdit.value = false
  resetRoleForm()
  roleDialogVisible.value = true
}

/**
 * 编辑角色
 */
const handleEdit = (row: RoleData) => {
  isEdit.value = true
  Object.assign(roleForm, {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    roleType: row.roleType || 'custom',
    description: row.description
  })
  roleDialogVisible.value = true
}

/**
 * 角色类型变更处理
 */
const handleRoleTypeChange = async (row: RoleData) => {
  // 🔥 防止系统预设角色修改类型
  if (isSystemPresetRole(row)) {
    ElMessage.warning('系统预设角色不可修改类型')
    // 恢复原值
    await loadRoleList()
    return
  }

  try {
    // 调用API更新角色类型
    await roleApiService.updateRole({
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      roleType: row.roleType,
      description: row.description
    })

    ElMessage.success('角色类型更新成功')

    // 重新加载角色列表
    await loadRoleList()
  } catch (error) {
    console.error('更新角色类型失败:', error)
    ElMessage.error('更新角色类型失败，请重试')

    // 失败时重新加载列表以恢复原值
    await loadRoleList()
  }
}

/**
 * 权限设置
 */
const handlePermissions = async (row: RoleData) => {
  console.log('[角色权限] 开始配置权限:', row)

  currentRole.value = row

  // 设置数据范围
  currentRoleDataScope.value = row.dataScope || 'self'

  // 重置标签页到权限设置
  permissionActiveTab.value = 'permissions'

  // 🔥 从数据库加载角色权限
  let rolePermissions: string[] = []

  try {
    console.log('[角色权限] 从数据库加载权限...')
    const permissionData = await roleApiService.getRolePermissions(row.id)
    rolePermissions = permissionData.permissions || []
    console.log('[角色权限] 数据库权限加载成功:', rolePermissions.length, rolePermissions)
  } catch (error) {
    console.warn('[角色权限] 数据库权限加载失败，使用默认权限:', error)
    // 如果数据库加载失败，使用默认权限
    rolePermissions = getDefaultPermissionsByRole(row.code || row.name)
  }

  // 如果数据库中没有权限，使用默认权限
  if (rolePermissions.length === 0) {
    console.log('[角色权限] 数据库权限为空，使用默认权限')
    rolePermissions = getDefaultPermissionsByRole(row.code || row.name)
  }

  console.log('[角色权限] 最终权限配置:', {
    roleId: row.id,
    roleName: row.name,
    roleCode: row.code,
    permissionCount: rolePermissions.length,
    permissions: rolePermissions
  })

  // 🔥 先设置选中的权限（在打开对话框之前）
  checkedPermissions.value = rolePermissions

  // 打开对话框
  permissionDialogVisible.value = true

  // 🔥 使用 nextTick 确保对话框和权限树完全渲染
  await nextTick()

  // 🔥 收集所有权限树节点ID（在权限树渲染完成后）
  const allTreeNodeIds = new Set<string>()
  const collectNodeIds = (nodes: any[]) => {
    nodes.forEach(node => {
      allTreeNodeIds.add(node.id)
      if (node.children && node.children.length > 0) {
        collectNodeIds(node.children)
      }
    })
  }
  collectNodeIds(permissionTree.value)
  console.log('[角色权限] 权限树节点总数:', allTreeNodeIds.size)

  // 🔥 过滤出存在于权限树中的权限ID
  const validPermissions = rolePermissions.filter(permId => {
    const exists = allTreeNodeIds.has(permId)
    if (!exists) {
      console.warn(`[角色权限] 权限ID不存在于权限树中: ${permId}`)
    }
    return exists
  })

  console.log('[角色权限] 有效权限数量:', validPermissions.length, '/', rolePermissions.length)
  if (validPermissions.length !== rolePermissions.length) {
    console.warn('[角色权限] 存在无效权限ID:', rolePermissions.filter(id => !allTreeNodeIds.has(id)))
  }

  // 🔥 使用更长的延迟确保 el-tree 组件完全初始化（增加到1000ms）
  setTimeout(() => {
    console.log('[角色权限] 开始设置权限树选中状态')
    console.log('[角色权限] 权限树引用:', !!permissionTreeRef.value)
    console.log('[角色权限] 有效权限数量:', validPermissions.length)
    console.log('[角色权限] 有效权限列表:', validPermissions)

    if (permissionTreeRef.value) {
      if (validPermissions.length > 0) {
        try {
          // 🔥 先清空所有选中状态
          permissionTreeRef.value.setCheckedKeys([])
          console.log('✅ 已清空权限树选中状态')

          // 🔥 直接使用 setCheckedKeys 方法一次性设置所有权限（更快更可靠）
          console.log('[角色权限] 使用 setCheckedKeys 一次性设置所有权限...')
          permissionTreeRef.value.setCheckedKeys(validPermissions, false)
          console.log('✅ 权限已设置')

          // 验证设置结果
          setTimeout(() => {
            const checkedKeys = permissionTreeRef.value.getCheckedKeys()
            const halfCheckedKeys = permissionTreeRef.value.getHalfCheckedKeys()
            console.log('✅ 最终验证结果:')
            console.log('  - 完全选中:', checkedKeys.length, checkedKeys)
            console.log('  - 半选状态:', halfCheckedKeys.length, halfCheckedKeys)
            console.log('  - 总数:', checkedKeys.length + halfCheckedKeys.length)

            if (checkedKeys.length === 0 && halfCheckedKeys.length === 0) {
              console.error('❌ 权限树选中失败！可能的原因:')
              console.error('  1. 权限ID与权限树节点ID不匹配')
              console.error('  2. 权限树组件渲染未完成')
              console.error('  3. check-strictly 属性导致的问题')

              // 🔥 尝试第二次设置（使用逐个设置的方式）
              console.log('[角色权限] 尝试第二次设置（逐个设置）...')
              let successCount = 0
              validPermissions.forEach((permId, index) => {
                try {
                  permissionTreeRef.value.setChecked(permId, true, false)
                  successCount++
                  if (index < 5) {
                    console.log(`  ✅ [${index + 1}/${validPermissions.length}] 设置成功: ${permId}`)
                  }
                } catch (e) {
                  if (index < 5) {
                    console.error(`  ❌ [${index + 1}/${validPermissions.length}] 设置失败: ${permId}`, e)
                  }
                }
              })
              console.log(`[角色权限] 第二次设置完成: 成功 ${successCount}/${validPermissions.length}`)

              // 再次验证
              setTimeout(() => {
                const checkedKeys2 = permissionTreeRef.value.getCheckedKeys()
                const halfCheckedKeys2 = permissionTreeRef.value.getHalfCheckedKeys()
                if (checkedKeys2.length === 0 && halfCheckedKeys2.length === 0) {
                  ElMessage.warning('权限树加载异常，请刷新页面后重试')
                } else {
                  console.log('✅ 第二次设置成功:', checkedKeys2.length + halfCheckedKeys2.length, '个权限')
                }
              }, 300)
            } else if (checkedKeys.length + halfCheckedKeys.length < validPermissions.length) {
              console.warn(`⚠️ 部分权限未能正确设置: ${validPermissions.length - checkedKeys.length - halfCheckedKeys.length} 个`)
            } else {
              console.log('✅ 权限树选中状态设置成功')
            }
          }, 500)
        } catch (error) {
          console.error('❌ 设置权限树选中状态失败:', error)
          ElMessage.error('权限树加载失败，请刷新页面后重试')
        }
      } else {
        console.warn('⚠️ 没有有效权限,权限树保持空白')
      }
    } else {
      console.error('❌ 权限树组件引用未找到')
      ElMessage.error('权限树组件未加载，请刷新页面后重试')
    }
  }, 1000) // 🔥 增加延迟时间到1000ms，确保组件完全渲染
}

/**
 * 根据角色获取默认权限 - 从配置文件读取
 */
const getDefaultPermissionsByRole = (roleCode: string): string[] => {
  console.log('[角色权限] 获取角色默认权限:', roleCode)

  // 使用配置文件中的默认权限
  const permissions = getDefaultRolePermissions(roleCode)

  console.log('[角色权限] 默认权限数量:', permissions.length)
  console.log('[角色权限] 默认权限列表:', permissions)

  return permissions
}

/**
 * 权限管理
 */
const handlePermissionManage = () => {
  loadAllPermissions()
  permissionManageDialogVisible.value = true
}

/**
 * 查看用户
 */
const handleViewUsers = async (row: RoleData) => {
  console.log('[角色权限] 查看角色用户:', row)
  currentViewRole.value = row
  userListLoading.value = true
  userListDialogVisible.value = true

  // 重置筛选条件和分页
  userSearchKeyword.value = ''
  userStatusFilter.value = ''
  userDepartmentFilter.value = ''
  userPagination.page = 1

  try {
    // 从API获取用户数据
    let allUsers: any[] = []
    try {
      const { default: userDataService } = await import('@/services/userDataService')
      allUsers = await userDataService.getUsers()
      console.log('[角色权限] 从API获取用户成功:', allUsers.length)
    } catch (apiError) {
      console.error('[角色权限] API获取用户失败:', apiError)
      allUsers = []
    }
    console.log('[角色权限] 查找角色:', row.code)

    // 创建角色名称到code的映射（支持中文名称匹配）
    const roleNameToCode: Record<string, string> = {
      '超级管理员': 'super_admin',
      '管理员': 'admin',
      '系统管理员': 'admin',
      '部门经理': 'department_manager',
      '经理': 'department_manager',
      '销售员': 'sales_staff',
      '销售': 'sales_staff',
      '客服': 'customer_service',
      '客服人员': 'customer_service'
    }

    // 筛选该角色的用户 - 使用 roleId 字段匹配
    const users = allUsers
      .filter((user: any) => {
        // 支持多种角色字段匹配
        let userRoleCode = user.roleId || user.role_id || user.role || ''
        // 如果是中文名称，转换为code
        if (roleNameToCode[userRoleCode]) {
          userRoleCode = roleNameToCode[userRoleCode]
        }
        const matched = userRoleCode === row.code
        if (matched) {
          console.log(`[角色权限] 用户 ${user.username || user.realName} 匹配角色: ${userRoleCode}`)
        }
        return matched
      })
      .map((user: any) => ({
        id: user.id,
        username: user.username,
        realName: user.realName || user.name || user.username,
        email: user.email || `${user.username}@example.com`,
        department: user.departmentName || user.department || '未分配',
        position: user.position || '员工',
        status: user.status || 'active',
        lastLoginTime: user.lastLoginTime || '从未登录'
      }))

    console.log('[角色权限] 筛选后的用户:', users.length)
    roleUsers.value = users
    filteredRoleUsers.value = users

    // 获取部门列表
    const departments = new Set(users.map(u => u.department))
    userDepartmentList.value = Array.from(departments).filter(d => d !== '未分配')

    if (users.length > 0) {
      ElMessage.success(`成功加载 ${users.length} 个用户`)
    } else {
      ElMessage.info('该角色暂无用户')
    }
  } catch (error) {
    console.error('获取角色用户失败:', error)
    ElMessage.error('获取用户列表失败')
    roleUsers.value = []
    filteredRoleUsers.value = []
  } finally {
    userListLoading.value = false
  }
}

/**
 * 查看权限
 */
const handleViewPermissions = async (row: RoleData) => {
  console.log('[角色权限] 查看角色权限:', row)
  currentViewRole.value = row
  permissionListLoading.value = true
  permissionListDialogVisible.value = true

  // 重置筛选条件和分页
  permissionSearchKeyword.value = ''
  permissionTypeFilter.value = ''
  permissionModuleFilter.value = ''
  permissionPagination.page = 1

  try {
    // 获取该角色的权限列表
    const rolePermIds = row.permissions || []
    console.log('[角色权限] 角色权限ID列表:', rolePermIds.length)

    // 获取完整的权限树数据
    const allPermissions = permissionService.getAllPermissions()
    console.log('[角色权限] 所有权限数据:', allPermissions.length)

    // 将权限ID转换为权限详情
    const permissionDetails = []
    const findPermission = (permissions, targetId, parentModule = '') => {
      for (const perm of permissions) {
        const currentModule = parentModule || perm.name

        if (perm.id === targetId) {
          return {
            ...perm,
            module: currentModule
          }
        }
        if (perm.children && perm.children.length > 0) {
          const found = findPermission(perm.children, targetId, currentModule)
          if (found) return found
        }
      }
      return null
    }

    rolePermIds.forEach(permId => {
      const perm = findPermission(allPermissions, permId)
      if (perm) {
        permissionDetails.push({
          id: perm.id,
          name: perm.name,
          code: perm.code || perm.id,
          type: perm.type || 'menu',
          module: perm.module || '系统',
          description: perm.description || perm.name,
          path: perm.path || ''
        })
      }
    })

    console.log('[角色权限] 权限详情:', permissionDetails.length)
    rolePermissions.value = permissionDetails
    filteredRolePermissions.value = permissionDetails

    // 获取模块列表
    const modules = new Set(permissionDetails.map(p => p.module))
    permissionModuleList.value = Array.from(modules)

    if (permissionDetails.length > 0) {
      ElMessage.success(`成功加载 ${permissionDetails.length} 个权限`)
    } else {
      ElMessage.info('该角色暂无权限')
    }
  } catch (error) {
    console.error('获取角色权限失败:', error)
    ElMessage.error('获取权限列表失败')
    rolePermissions.value = []
    filteredRolePermissions.value = []
  } finally {
    permissionListLoading.value = false
  }
}

/**
 * 下拉菜单命令处理
 */
const handleDropdownCommand = (command: string, row: RoleData) => {
  switch (command) {
    case 'copy':
      handleCopy(row)
      break
    case 'toggle':
      handleToggleStatus(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

/**
 * 复制角色
 */
const handleCopy = (row: RoleData) => {
  isEdit.value = false
  Object.assign(roleForm, {
    id: '',
    name: `${row.name}_副本`,
    code: `${row.code}_COPY`,
    status: row.status,
    roleType: row.roleType || 'custom',
    description: row.description
  })
  roleDialogVisible.value = true
}

/**
 * 切换角色状态
 */
const handleToggleStatus = async (row: RoleData) => {
  // 保存原始状态
  const originalStatus = row.status
  const newStatus = originalStatus === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}角色"${row.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API切换角色状态
    await roleApiService.updateRole({
      id: row.id,
      name: row.name,
      code: row.code,
      status: newStatus,
      roleType: row.roleType,
      description: row.description
    })

    // API调用成功后更新UI状态
    row.status = newStatus
    ElMessage.success(`${action}成功`)

    // 重新加载角色列表和统计数据
    await loadRoleList()
    await loadRoleStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换角色状态失败:', error)
      // 如果API调用失败，恢复原状态
      row.status = originalStatus
      ElMessage.error(`${action}失败，请重试`)
    }
  }
}

// 🔥 系统预设角色列表（不可删除）
const SYSTEM_PRESET_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service']

// 🔥 不可禁用的角色（超级管理员和管理员）
const NON_DISABLEABLE_ROLES = ['super_admin', 'admin']

/**
 * 判断角色是否为系统预设角色（不可删除）
 */
const isSystemPresetRole = (role: RoleData) => {
  return SYSTEM_PRESET_ROLES.includes(role.code) || role.isSystem === true
}

/**
 * 判断角色是否不可禁用（超级管理员和管理员）
 */
const isNonDisableableRole = (role: RoleData) => {
  return NON_DISABLEABLE_ROLES.includes(role.code)
}

/**
 * 处理角色状态变更
 */
const handleRoleStatusChange = async (role: RoleData) => {
  // 防止系统预设角色被禁用
  if (isNonDisableableRole(role)) {
    ElMessage.warning('系统预设角色不可禁用')
    // 恢复原状态
    role.status = 'active'
    return
  }

  try {
    role.statusLoading = true

    // 调用后端API更新角色状态
    await roleApiService.updateRoleStatus(role.id, role.status)

    ElMessage.success(`角色已${role.status === 'active' ? '启用' : '禁用'}`)

    // 重新加载角色统计数据
    loadRoleStats()
  } catch (error) {
    console.error('更新角色状态失败:', error)
    ElMessage.error('状态更新失败')

    // 恢复原状态
    role.status = role.status === 'active' ? 'inactive' : 'active'
  } finally {
    role.statusLoading = false
  }
}

/**
 * 删除角色
 */
const handleDelete = async (row: RoleData) => {
  // 🔥 检查是否为系统预设角色
  if (isSystemPresetRole(row)) {
    ElMessage.warning('系统预设角色不可删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${row.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API删除角色
    await roleApiService.deleteRole(row.id)

    ElMessage.success('删除成功')
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error.message && error.message !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除失败')
    }
    // 用户取消操作时不显示错误
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRoles.value.length} 个角色吗？删除后不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API批量删除角色
    const roleIds = selectedRoles.value.map(role => role.id)
    await roleApiService.batchDeleteRoles(roleIds)

    ElMessage.success('批量删除成功')
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error.message && error.message !== 'cancel') {
      console.error('批量删除角色失败:', error)
      ElMessage.error('批量删除失败')
    }
    // 用户取消操作时不显示错误
  }
}

/**
 * 批量状态操作
 */
const handleBatchStatus = async (status: string) => {
  const action = status === 'active' ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}选中的 ${selectedRoles.value.length} 个角色吗？`,
      `确认批量${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API批量更新角色状态
    const roleIds = selectedRoles.value.map(role => role.id)
    await roleApiService.batchUpdateRoleStatus(roleIds, status)

    ElMessage.success(`批量${action}成功`)
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量更新角色状态失败:', error)
      ElMessage.error(`批量${action}失败，请重试`)
    }
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadRoleList()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    status: '',
    createTimeRange: []
  })
  handleSearch()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection: RoleData[]) => {
  selectedRoles.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.size = size
  loadRoleList()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadRoleList()
}

/**
 * 权限选择变化
 */
const handlePermissionCheck = (data: PermissionData, checked: unknown) => {
  if (!permissionTreeRef.value) return

  // 获取当前选中的节点
  const checkedNodes = checked.checkedNodes || []
  const node = checked.checkedKeys.includes(data.id) ? data : null

  if (node) {
    // 选中节点：递归选中所有子节点
    const selectChildren = (nodeData: PermissionData) => {
      permissionTreeRef.value?.setChecked(nodeData.id, true, false)
      if (nodeData.children && nodeData.children.length > 0) {
        nodeData.children.forEach(child => selectChildren(child))
      }
    }
    selectChildren(data)
  } else {
    // 取消节点：递归取消所有子节点
    const unselectChildren = (nodeData: PermissionData) => {
      permissionTreeRef.value?.setChecked(nodeData.id, false, false)
      if (nodeData.children && nodeData.children.length > 0) {
        nodeData.children.forEach(child => unselectChildren(child))
      }
    }
    unselectChildren(data)
  }

  console.log('权限选择变化:', {
    permission: data.name,
    checked: checked.checkedKeys.includes(data.id),
    totalSelected: checked.checkedKeys.length
  })
}

/**
 * 展开全部
 */
const handleExpandAll = () => {
  if (permissionTreeRef.value) {
    // 获取所有节点的key
    const allKeys: string[] = []
    const collectKeys = (nodes: PermissionData[]) => {
      nodes.forEach(node => {
        allKeys.push(node.id)
        if (node.children) {
          collectKeys(node.children)
        }
      })
    }
    collectKeys(permissionTree.value)

    // 展开所有节点
    permissionTreeRef.value.setExpandedKeys(allKeys)
    ElMessage.success('已展开所有权限节点')
  }
}

/**
 * 收起全部
 */
const handleCollapseAll = () => {
  if (permissionTreeRef.value) {
    // 收起所有节点
    permissionTreeRef.value.setExpandedKeys([])
    ElMessage.success('已收起所有权限节点')
  }
}

/**
 * 新增权限
 */
const handleAddPermission = () => {
  isPermissionEdit.value = false
  resetPermissionForm()
  permissionFormDialogVisible.value = true
}

/**
 * 编辑权限
 */
const handleEditPermission = (row: PermissionData) => {
  isPermissionEdit.value = true
  Object.assign(permissionForm, {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    type: row.type,
    path: row.path,
    icon: row.icon,
    sort: row.sort,
    status: row.status
  })
  permissionFormDialogVisible.value = true
}

/**
 * 删除权限
 */
const handleDeletePermission = async (row: PermissionData) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除权限"${row.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('删除成功')
    loadAllPermissions()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 确认角色操作
 */
const confirmRole = async () => {
  try {
    await roleFormRef.value?.validate()

    roleLoading.value = true

    if (isEdit.value) {
      // 更新角色
      await roleApiService.updateRole({
        id: roleForm.id,
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        status: roleForm.status,
        roleType: roleForm.roleType
      })
      ElMessage.success('角色更新成功')
    } else {
      // 创建角色
      await roleApiService.createRole({
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        status: roleForm.status,
        roleType: roleForm.roleType
      })
      ElMessage.success('角色创建成功')
    }

    handleDialogClose()
    loadRoleList()
    loadRoleStats() // 重新加载统计数据
  } catch (error) {
    console.error('角色操作失败:', error)
    ElMessage.error(isEdit.value ? '角色更新失败' : '角色创建失败')
  } finally {
    roleLoading.value = false
  }
}

/**
 * 一键恢复默认权限
 */
const resetToDefaultPermissions = () => {
  if (!currentRole.value) {
    ElMessage.warning('未选择角色')
    return
  }

  // 🔥 检查是否为系统预设角色
  const isSystemRole = SYSTEM_PRESET_ROLES.includes(currentRole.value.code)

  if (!isSystemRole) {
    ElMessage.warning('只有系统预设角色才能恢复默认权限配置')
    return
  }

  ElMessageBox.confirm(
    `确定要将角色「${currentRole.value.name}」的权限恢复为系统默认配置吗？`,
    '恢复默认权限',
    {
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 获取该角色的默认权限
    const defaultPermissions = getDefaultRolePermissions(currentRole.value!.code)

    if (defaultPermissions.length === 0 || defaultPermissions.includes('*')) {
      ElMessage.info('该角色为管理员角色，拥有所有权限')
      return
    }

    console.log('[角色权限] 恢复默认权限:', {
      roleCode: currentRole.value!.code,
      defaultPermissions: defaultPermissions
    })

    // 设置权限树的选中状态
    if (permissionTreeRef.value) {
      permissionTreeRef.value.setCheckedKeys(defaultPermissions)
      ElMessage.success('已恢复为默认权限配置，请点击"保存权限"按钮保存')
    }
  }).catch(() => {
    // 用户取消
  })
}

/**
 * 确认权限设置
 */
const confirmPermissions = async () => {
  try {
    permissionLoading.value = true

    // 🔥 获取选中的权限（包括半选节点）
    // check-strictly=true 时，父子节点不联动，需要同时获取完全选中和半选节点
    const checkedKeys = permissionTreeRef.value?.getCheckedKeys() as string[]
    const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() as string[]

    // 合并完全选中和半选节点
    const allPermissions = [...(checkedKeys || []), ...(halfCheckedKeys || [])]

    if (!currentRole.value) {
      ElMessage.error('未选择角色')
      return
    }

    console.log('[角色权限] 开始保存权限:', {
      roleId: currentRole.value.id,
      roleName: currentRole.value.name,
      checkedCount: checkedKeys?.length || 0,
      halfCheckedCount: halfCheckedKeys?.length || 0,
      totalCount: allPermissions.length,
      checkedKeys,
      halfCheckedKeys,
      allPermissions,
      dataScope: currentRoleDataScope.value
    })

    // 🔥 调用后端API保存权限和数据范围到数据库
    try {
      // 保存权限（包括完全选中和半选节点）
      await roleApiService.updateRolePermissions(currentRole.value.id, allPermissions)

      // 保存数据范围
      await roleApiService.updateRole({
        id: currentRole.value.id,
        dataScope: currentRoleDataScope.value
      })

      console.log('[角色权限] 权限和数据范围已保存到数据库:', {
        role: currentRole.value.name,
        permissions: allPermissions.length,
        dataScope: currentRoleDataScope.value
      })

      // 同时更新localStorage作为缓存
      try {
        const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
        const roleIndex = roles.findIndex((r: any) => r.id === currentRole.value?.id)
        if (roleIndex !== -1) {
          roles[roleIndex].permissions = allPermissions
          roles[roleIndex].permissionCount = allPermissions.length
          roles[roleIndex].dataScope = currentRoleDataScope.value
          roles[roleIndex].updatedAt = new Date().toISOString()
          localStorage.setItem('crm_roles', JSON.stringify(roles))
        }
      } catch (cacheError) {
        console.warn('[角色权限] 更新本地缓存失败:', cacheError)
      }

      // 同时更新当前用户的权限(如果当前用户是这个角色)
      const currentUser = userStore.user
      if (currentUser && (currentUser.roleId === currentRole.value.code || currentUser.role === currentRole.value.code)) {
        console.log('[角色权限] 当前用户角色匹配,更新用户权限')
        userStore.updatePermissions(allPermissions)
      }

      ElMessage.success('权限设置成功，已保存到数据库')
      handlePermissionDialogClose()
      loadRoleList()
    } catch (saveError: any) {
      console.error('[角色权限] 保存到数据库失败:', saveError)
      throw new Error(saveError.message || '保存权限失败')
    }
  } catch (error: any) {
    console.error('[角色权限] 权限设置失败:', error)
    ElMessage.error(`权限设置失败: ${error.message || '未知错误'}`)
  } finally {
    permissionLoading.value = false
  }
}

/**
 * 确认权限表单
 */
const confirmPermissionForm = async () => {
  try {
    await permissionFormRef.value?.validate()

    permissionFormLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success(isPermissionEdit.value ? '权限更新成功' : '权限创建成功')
    permissionFormDialogVisible.value = false
    resetPermissionForm()
    loadAllPermissions()
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    permissionFormLoading.value = false
  }
}

/**
 * 关闭角色对话框
 */
const handleDialogClose = () => {
  roleDialogVisible.value = false
  roleFormRef.value?.clearValidate()
  resetRoleForm()
}

/**
 * 关闭权限对话框
 */
const handlePermissionDialogClose = () => {
  permissionDialogVisible.value = false
  currentRole.value = null
  checkedPermissions.value = []
}

/**
 * 重置角色表单
 */
const resetRoleForm = () => {
  Object.assign(roleForm, {
    id: '',
    name: '',
    code: '',
    status: 'active',
    roleType: 'custom',
    description: ''
  })
}

/**
 * 重置权限表单
 */
const resetPermissionForm = () => {
  Object.assign(permissionForm, {
    id: '',
    parentId: '',
    name: '',
    code: '',
    type: 'menu',
    path: '',
    icon: '',
    sort: 0,
    status: 'active'
  })
}

/**
 * 加载角色统计 - 基于真实数据统计
 */
const loadRoleStats = async () => {
  try {
    console.log('[角色权限] 开始加载角色统计')

    // 1. 获取角色数据
    const roles = await roleApiService.getRoles()
    const totalRoles = roles.length
    const activeRoles = roles.filter((r: any) => r.status === 'active').length

    console.log('[角色权限] 角色统计:', { total: totalRoles, active: activeRoles })

    // 2. 获取所有权限数量 - 从权限服务获取
    let totalPermissions = 0
    try {
      const allPermissions = permissionService.getAllPermissions()

      // 递归统计所有权限(包括子权限)
      const countPermissions = (permissions: any[]): number => {
        let count = 0
        permissions.forEach(perm => {
          count++ // 计数当前权限
          if (perm.children && perm.children.length > 0) {
            count += countPermissions(perm.children) // 递归计数子权限
          }
        })
        return count
      }

      totalPermissions = countPermissions(allPermissions)
      console.log('[角色权限] 权限统计:', totalPermissions)

    } catch (error) {
      console.error('[角色权限] 获取权限数据失败:', error)
      // 如果获取失败,使用默认值
      totalPermissions = 0
    }

    // 3. 更新统计数据
    roleStats.value = {
      total: totalRoles,
      active: activeRoles,
      permissions: totalPermissions
    }

    console.log('[角色权限] 统计数据更新完成:', roleStats.value)

  } catch (error) {
    console.error('[角色权限] 加载角色统计失败:', error)

    // 降级方案:从localStorage直接读取
    try {
      const savedRoles = localStorage.getItem('crm_roles')
      if (savedRoles) {
        const roles = JSON.parse(savedRoles)
        const totalRoles = roles.length
        const activeRoles = roles.filter((r: any) => r.status === 'active').length

        // 尝试获取权限数量
        let totalPermissions = 0
        try {
          const allPermissions = permissionService.getAllPermissions()
          const countPermissions = (permissions: any[]): number => {
            let count = 0
            permissions.forEach(perm => {
              count++
              if (perm.children && perm.children.length > 0) {
                count += countPermissions(perm.children)
              }
            })
            return count
          }
          totalPermissions = countPermissions(allPermissions)
        } catch (e) {
          console.error('[角色权限] 降级方案获取权限失败:', e)
        }

        roleStats.value = {
          total: totalRoles,
          active: activeRoles,
          permissions: totalPermissions
        }

        console.log('[角色权限] 使用降级方案,统计数据:', roleStats.value)
      } else {
        // 完全降级到默认值
        roleStats.value = {
          total: 0,
          active: 0,
          permissions: 0
        }
      }
    } catch (fallbackError) {
      console.error('[角色权限] 降级方案也失败:', fallbackError)
      roleStats.value = {
        total: 0,
        active: 0,
        permissions: 0
      }
    }
  }
}

/**
 * 加载角色列表 - 从默认配置加载权限并统计用户数量
 * 使用 userDataService 支持环境自动切换(localStorage/API)
 */
const loadRoleList = async () => {
  try {
    tableLoading.value = true
    console.log('[角色权限] 开始加载角色列表')

    // 调用真实API获取角色
    const roles = await roleApiService.getRoles()
    console.log('[角色权限] API返回角色数据:', roles)

    // 从API获取用户数据，用于统计每个角色的用户数量
    let users: any[] = []
    try {
      const { default: userDataService } = await import('@/services/userDataService')
      users = await userDataService.getUsers()
      console.log('[角色权限] 从API获取用户成功:', users.length)
    } catch (apiError) {
      console.error('[角色权限] API获取用户失败:', apiError)
      users = []
    }

    console.log('[角色权限] ========== 开始统计用户数量 ==========')
    console.log('[角色权限] 用户总数:', users.length)

    // 创建角色名称到code的映射（支持中文名称匹配）
    const roleNameToCode: Record<string, string> = {
      '超级管理员': 'super_admin',
      '管理员': 'admin',
      '系统管理员': 'admin',
      '部门经理': 'department_manager',
      '经理': 'department_manager',
      '销售员': 'sales_staff',
      '销售': 'sales_staff',
      '客服': 'customer_service',
      '客服人员': 'customer_service'
    }

    // 显示每个用户的角色信息(用于调试)
    if (users.length > 0) {
      console.log('[角色权限] 用户角色详情:')
      users.slice(0, 5).forEach((user: any, index: number) => {
        console.log(`  ${index + 1}. ${user.realName || user.name || user.username}:`)
        console.log(`     - roleId: "${user.roleId}"`)
        console.log(`     - role: "${user.role}"`)
      })
      if (users.length > 5) {
        console.log(`  ... 还有 ${users.length - 5} 个用户`)
      }
    }

    // 统计每个角色的用户数量
    const roleUserCount: Record<string, number> = {}
    users.forEach((user: any) => {
      // 获取用户的角色标识
      let userRoleCode = user.roleId || user.role_id || user.role || ''

      // 如果是中文名称，转换为code
      if (roleNameToCode[userRoleCode]) {
        userRoleCode = roleNameToCode[userRoleCode]
      }

      if (userRoleCode) {
        roleUserCount[userRoleCode] = (roleUserCount[userRoleCode] || 0) + 1
      }
    })

    console.log('[角色权限] 角色用户统计结果:')
    Object.entries(roleUserCount).forEach(([roleCode, count]) => {
      const matchedRole = roles.find((r: any) => r.code === roleCode)
      console.log(`  - ${roleCode}: ${count}人 ${matchedRole ? `✓ 匹配角色: ${matchedRole.name}` : '✗ 未匹配到角色'}`)
    })
    console.log('[角色权限] ========== 统计完成 ==========')

    // 计算全部权限数量（用于超级管理员等拥有*通配符的角色）
    let totalPermissionCount = 0
    const allPermissionIds: string[] = []
    try {
      const allPerms = permissionService.getAllPermissions()
      const countAllPermissions = (perms: any[]): number => {
        let count = 0
        perms.forEach(p => {
          count++
          allPermissionIds.push(p.id) // 收集所有权限ID
          if (p.children && p.children.length > 0) {
            count += countAllPermissions(p.children)
          }
        })
        return count
      }
      totalPermissionCount = countAllPermissions(allPerms)
      console.log('[角色权限] 系统全部权限数量:', totalPermissionCount)
      console.log('[角色权限] 系统全部权限ID数量:', allPermissionIds.length)
    } catch (e) {
      console.error('[角色权限] 计算全部权限数量失败:', e)
      totalPermissionCount = 100 // 默认值
    }

    // 转换数据格式以适配前端显示,并从默认配置加载权限
    roleList.value = roles.map(role => {
      // 从默认配置获取权限
      const defaultPermissions = getDefaultRolePermissions(role.code)

      // 如果角色已有权限配置,使用已有的;否则使用默认配置
      const permissions = role.permissions && role.permissions.length > 0
        ? role.permissions
        : defaultPermissions

      // 使用 role.code 匹配统计结果，同时也匹配角色名称
      let userCount = roleUserCount[role.code] || 0
      // 如果code没匹配到，尝试用角色名称匹配
      if (userCount === 0 && roleUserCount[role.name]) {
        userCount = roleUserCount[role.name]
      }

      // 计算权限数量：如果包含*通配符，显示全部权限数量；否则只统计权限树中实际存在的权限ID
      let permissionCount = 0
      if (permissions.includes('*')) {
        permissionCount = totalPermissionCount
      } else {
        // 只统计权限树中实际存在的权限ID（过滤掉不存在的ID）
        const validPermissions = permissions.filter((p: string) => allPermissionIds.includes(p))
        permissionCount = validPermissions.length
      }

      console.log(`[角色权限] 处理角色: ${role.name} (code: ${role.code})`)
      console.log(`  - 默认权限: ${defaultPermissions.length}个`)
      console.log(`  - 实际权限: ${permissions.length}个`)
      console.log(`  - 有效权限: ${permissionCount}个 ${permissions.includes('*') ? '(全部权限)' : ''}`)
      console.log(`  - 用户数量: ${userCount}人 ${userCount === 0 ? '⚠️ 无用户' : '✓'}`)

      return {
        id: role.id,
        name: role.name,
        code: role.code,
        status: role.status,
        roleType: role.roleType || 'custom',
        userCount: userCount, // 使用统计的用户数量
        permissionCount: permissionCount, // 使用计算后的权限数量
        description: role.description || '',
        createTime: role.createdAt ? new Date(role.createdAt).toLocaleString() : '',
        permissions: permissions
      }
    })

    pagination.total = roles.length

    // 持久化到 localStorage
    localStorage.setItem('crm_roles', JSON.stringify(roleList.value))
    console.log('[角色权限] 角色列表已保存到 localStorage:', {
      roleCount: roleList.value.length,
      totalUsers: users.length
    })

    // 输出最终结果
    roleList.value.forEach(role => {
      console.log(`[角色权限] 最终角色数据: ${role.name} - 权限:${role.permissionCount}, 用户:${role.userCount}`)
    })
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 加载权限树 - 使用统一权限服务
const loadPermissionTree = async () => {
  try {
    // 使用统一权限服务获取权限树
    const allPermissions = permissionService.getAllPermissions();
    permissionTree.value = allPermissions;
    console.log('权限树加载成功');
  } catch (error) {
    console.error('加载权限树失败:', error);

    // 降级到本地权限树
    permissionTree.value = [
       {
         id: 'dashboard',
         name: '数据看板',
         icon: 'DataBoard',
         type: 'menu',
         children: [
           {
             id: 'dashboard.personal',
             name: '个人看板',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'dashboard.personal.view', name: '查看个人数据', type: 'action' }
             ]
           },
           {
             id: 'dashboard.department',
             name: '部门看板',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'dashboard.department.view', name: '查看部门数据', type: 'action' }
             ]
           },
           {
             id: 'dashboard.company',
             name: '公司看板',
             icon: 'TrendCharts',
             type: 'menu',
             children: [
               { id: 'dashboard.company.view', name: '查看公司数据', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'system',
         name: '系统管理',
         icon: 'Setting',
         type: 'menu',
         children: [
           {
             id: 'system.department',
             name: '部门管理',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'system.department.view', name: '查看部门', type: 'action' },
               { id: 'system.department.create', name: '新增部门', type: 'action' },
               { id: 'system.department.edit', name: '编辑部门', type: 'action' },
               { id: 'system.department.delete', name: '删除部门', type: 'action' },
               { id: 'system.department.manage', name: '管理部门', type: 'action' }
             ]
           },
           {
             id: 'system.user',
             name: '用户管理',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'system.user.view', name: '查看用户', type: 'action' },
               { id: 'system.user.create', name: '新增用户', type: 'action' },
               { id: 'system.user.edit', name: '编辑用户', type: 'action' },
               { id: 'system.user.delete', name: '删除用户', type: 'action' },
               { id: 'system.user.resetPassword', name: '重置密码', type: 'action' },
               { id: 'system.user.setPermissions', name: '权限设置', type: 'action' },
               { id: 'system.user.viewLogs', name: '操作日志', type: 'action' }
             ]
           },
           {
             id: 'system.role',
             name: '角色权限',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'system.role.view', name: '查看角色', type: 'action' },
               { id: 'system.role.create', name: '新增角色', type: 'action' },
               { id: 'system.role.edit', name: '编辑角色', type: 'action' },
               { id: 'system.role.delete', name: '删除角色', type: 'action' },
               { id: 'system.role.setPermissions', name: '设置权限', type: 'action' }
             ]
           },
           {
             id: 'system.permission',
             name: '权限管理',
             icon: 'Lock',
             type: 'menu',
             children: [
               { id: 'system.permission.view', name: '查看权限', type: 'action' },
               { id: 'system.permission.manage', name: '权限管理', type: 'action' },
               { id: 'system.permission.roleManage', name: '角色管理', type: 'action' },
               { id: 'system.permission.sensitivePermission', name: '敏感权限', type: 'action' },
               { id: 'system.permission.customerServiceManage', name: '客服管理', type: 'action' }
             ]
           },
           {
             id: 'system.superAdmin',
             name: '超管面板',
             icon: 'Crown',
             type: 'menu',
             children: [
               { id: 'system.superAdmin.view', name: '查看面板', type: 'action' },
               { id: 'system.superAdmin.editPermissions', name: '编辑权限', type: 'action' },
               { id: 'system.superAdmin.viewDetails', name: '查看详情', type: 'action' },
               { id: 'system.superAdmin.resetPassword', name: '重置密码', type: 'action' },
               { id: 'system.superAdmin.memberManage', name: '成员管理', type: 'action' },
               { id: 'system.superAdmin.permissionDetails', name: '权限详情', type: 'action' }
             ]
           },
           {
             id: 'system.customerService',
             name: '客服管理',
             icon: 'Headset',
             type: 'menu',
             children: [
               { id: 'system.customerService.view', name: '查看客服', type: 'action' },
               { id: 'system.customerService.manage', name: '管理客服', type: 'action' },
               { id: 'system.customerService.setPermissions', name: '设置权限', type: 'action' },
               { id: 'system.customerService.enableAll', name: '全部启用', type: 'action' },
               { id: 'system.customerService.disableAll', name: '全部禁用', type: 'action' }
             ]
           },
           {
             id: 'system.message',
             name: '消息管理',
             icon: 'ChatDotSquare',
             type: 'menu',
             children: [
               { id: 'system.message.view', name: '查看消息', type: 'action' },
               { id: 'system.message.send', name: '发送消息', type: 'action' },
               { id: 'system.message.delete', name: '删除消息', type: 'action' },
               { id: 'system.message.manage', name: '消息管理', type: 'action' }
             ]
           },
           {
             id: 'system.settings',
             name: '系统设置',
             icon: 'Tools',
             type: 'menu',
             children: [
               { id: 'system.settings.view', name: '查看设置', type: 'action' },
               { id: 'system.settings.edit', name: '编辑设置', type: 'action' },
               { id: 'system.settings.backup', name: '数据备份', type: 'action' },
               { id: 'system.settings.restore', name: '数据恢复', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'customer',
         name: '客户管理',
         icon: 'Avatar',
         type: 'menu',
         children: [
           {
             id: 'customer.list',
             name: '客户列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'customer.list.view', name: '查看客户', type: 'action' },
               { id: 'customer.list.export', name: '导出客户', type: 'action' },
               { id: 'customer.list.import', name: '导入客户', type: 'action' },
               { id: 'customer.list.edit', name: '编辑客户', type: 'action' },
               { id: 'customer.list.delete', name: '删除客户', type: 'action' },
               { id: 'customer.list.assign', name: '分配客户', type: 'action' },
               { id: 'customer.list.batchOperation', name: '批量操作', type: 'action' }
             ]
           },
           {
             id: 'customer.add',
             name: '新增客户',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'customer.add.create', name: '创建客户', type: 'action' }
             ]
           },
           {
             id: 'customer.tags',
             name: '客户标签',
             icon: 'PriceTag',
             type: 'menu',
             children: [
               { id: 'customer.tags.view', name: '查看标签', type: 'action' },
               { id: 'customer.tags.create', name: '新增标签', type: 'action' },
               { id: 'customer.tags.edit', name: '编辑标签', type: 'action' },
               { id: 'customer.tags.delete', name: '删除标签', type: 'action' },
               { id: 'customer.tags.assign', name: '分配标签', type: 'action' }
             ]
           },
           {
             id: 'customer.groups',
             name: '客户分组',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'customer.groups.view', name: '查看分组', type: 'action' },
               { id: 'customer.groups.create', name: '新增分组', type: 'action' },
               { id: 'customer.groups.edit', name: '编辑分组', type: 'action' },
               { id: 'customer.groups.delete', name: '删除分组', type: 'action' },
               { id: 'customer.groups.manage', name: '管理分组', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'order',
         name: '订单管理',
         icon: 'Document',
         type: 'menu',
         children: [
           {
             id: 'order.list',
             name: '订单列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'order.list.view', name: '查看订单', type: 'action' },
               { id: 'order.list.export', name: '导出订单', type: 'action' },
               { id: 'order.list.edit', name: '编辑订单', type: 'action' },
               { id: 'order.list.delete', name: '删除订单', type: 'action' },
               { id: 'order.list.cancel', name: '取消订单', type: 'action' },
               { id: 'order.list.batchOperation', name: '批量操作', type: 'action' }
             ]
           },
           {
             id: 'order.add',
             name: '新增订单',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'order.add.create', name: '创建订单', type: 'action' }
             ]
           },
           {
             id: 'order.audit',
             name: '订单审核',
             icon: 'DocumentChecked',
             type: 'menu',
             children: [
               { id: 'order.audit.view', name: '查看审核', type: 'action' },
               { id: 'order.audit.approve', name: '通过审核', type: 'action' },
               { id: 'order.audit.reject', name: '拒绝审核', type: 'action' },
               { id: 'order.audit.revoke', name: '撤销审核', type: 'action' },
               { id: 'order.audit.batchAudit', name: '批量审核', type: 'action' }
             ]
           },
           {
             id: 'order.audit',
             name: '订单审核',
             icon: 'CircleCheck',
             type: 'menu',
             children: [
               { id: 'order.audit.view', name: '查看待审核订单', type: 'action' },
               { id: 'order.audit.approve', name: '审核通过', type: 'action' },
               { id: 'order.audit.reject', name: '审核拒绝', type: 'action' },
               { id: 'order.audit.batch', name: '批量审核', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'service',
         name: '服务管理',
         icon: 'Headset',
         type: 'menu',
         children: [
           {
             id: 'service.ticket',
             name: '工单管理',
             icon: 'Tickets',
             type: 'menu',
             children: [
               { id: 'service.ticket.view', name: '查看工单', type: 'action' },
               { id: 'service.ticket.create', name: '创建工单', type: 'action' },
               { id: 'service.ticket.edit', name: '编辑工单', type: 'action' },
               { id: 'service.ticket.delete', name: '删除工单', type: 'action' },
               { id: 'service.ticket.assign', name: '分配工单', type: 'action' },
               { id: 'service.ticket.close', name: '关闭工单', type: 'action' },
               { id: 'service.ticket.export', name: '导出工单', type: 'action' }
             ]
           },
           {
             id: 'service.chat',
             name: '在线客服',
             icon: 'ChatDotRound',
             type: 'menu',
             children: [
               { id: 'service.chat.view', name: '查看对话', type: 'action' },
               { id: 'service.chat.reply', name: '回复消息', type: 'action' },
               { id: 'service.chat.transfer', name: '转接客服', type: 'action' },
               { id: 'service.chat.history', name: '查看历史', type: 'action' },
               { id: 'service.chat.settings', name: '客服设置', type: 'action' }
             ]
           },
           {
             id: 'service.knowledge',
             name: '知识库',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'service.knowledge.view', name: '查看知识库', type: 'action' },
               { id: 'service.knowledge.create', name: '创建文档', type: 'action' },
               { id: 'service.knowledge.edit', name: '编辑文档', type: 'action' },
               { id: 'service.knowledge.delete', name: '删除文档', type: 'action' },
               { id: 'service.knowledge.category', name: '分类管理', type: 'action' },
               { id: 'service.knowledge.publish', name: '发布文档', type: 'action' }
             ]
           },
           {
             id: 'service.call',
             name: '通话管理',
             icon: 'Phone',
             type: 'menu',
             children: [
               { id: 'service.call.view', name: '查看通话记录', type: 'action' },
               { id: 'service.call.make', name: '发起通话', type: 'action' },
               { id: 'service.call.record', name: '录音管理', type: 'action' },
               { id: 'service.call.statistics', name: '通话统计', type: 'action' }
             ]
           },
           {
             id: 'service.sms',
             name: '短信管理',
             icon: 'Message',
             type: 'menu',
             children: [
               { id: 'service.sms.view', name: '查看短信记录', type: 'action' },
               { id: 'service.sms.send', name: '发送短信', type: 'action' },
               { id: 'service.sms.template', name: '模板管理', type: 'action' },
               { id: 'service.sms.batch', name: '批量发送', type: 'action' },
               { id: 'service.sms.statistics', name: '短信统计', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'performance',
         name: '业绩统计',
         icon: 'TrendCharts',
         type: 'menu',
         children: [
           {
             id: 'performance.personal',
             name: '个人业绩',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'performance.personal.view', name: '查看个人业绩', type: 'action' },
               { id: 'performance.personal.export', name: '导出个人数据', type: 'action' }
             ]
           },
           {
             id: 'performance.team',
             name: '团队业绩',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'performance.team.view', name: '查看团队业绩', type: 'action' },
               { id: 'performance.team.export', name: '导出团队数据', type: 'action' },
               { id: 'performance.team.compare', name: '业绩对比', type: 'action' }
             ]
           },
           {
             id: 'performance.analysis',
             name: '业绩分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'performance.analysis.view', name: '查看分析报告', type: 'action' },
               { id: 'performance.analysis.trend', name: '趋势分析', type: 'action' },
               { id: 'performance.analysis.forecast', name: '业绩预测', type: 'action' }
             ]
           },
           {
             id: 'performance.share',
             name: '业绩分享',
             icon: 'Share',
             type: 'menu',
             children: [
               { id: 'performance.share.view', name: '查看分享', type: 'action' },
               { id: 'performance.share.create', name: '创建分享', type: 'action' },
               { id: 'performance.share.manage', name: '管理分享', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'logistics',
         name: '物流管理',
         icon: 'Van',
         type: 'menu',
         children: [
           {
             id: 'logistics.list',
             name: '物流列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'logistics.list.view', name: '查看物流列表', type: 'action' },
               { id: 'logistics.list.export', name: '导出物流数据', type: 'action' }
             ]
           },
           {
             id: 'logistics.track',
             name: '物流跟踪',
             icon: 'Position',
             type: 'menu',
             children: [
               { id: 'logistics.track.view', name: '查看跟踪信息', type: 'action' },
               { id: 'logistics.track.update', name: '更新跟踪状态', type: 'action' }
             ]
           },
           {
             id: 'logistics.companies',
             name: '物流公司',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'logistics.companies.view', name: '查看物流公司', type: 'action' },
               { id: 'logistics.companies.create', name: '添加物流公司', type: 'action' },
               { id: 'logistics.companies.edit', name: '编辑物流公司', type: 'action' },
               { id: 'logistics.companies.delete', name: '删除物流公司', type: 'action' }
             ]
           },
           {
              id: 'logistics.shipping',
              name: '发货列表',
              icon: 'Box',
              type: 'menu',
              children: [
                { id: 'logistics.shipping.view', name: '查看发货列表', type: 'action' },
                { id: 'logistics.shipping.create', name: '创建发货单', type: 'action' },
                { id: 'logistics.shipping.edit', name: '编辑发货单', type: 'action' },
                { id: 'logistics.shipping.batchExport', name: '批量导出', type: 'action' }
              ]
            },
           {
             id: 'logistics.status',
             name: '状态更新',
             icon: 'Refresh',
             type: 'menu',
             children: [
               { id: 'logistics.status.view', name: '查看状态', type: 'action' },
               { id: 'logistics.status.update', name: '更新状态', type: 'action' },
               { id: 'logistics.status.batch', name: '批量更新', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'afterSales',
         name: '售后管理',
         icon: 'Tools',
         type: 'menu',
         children: [
           {
             id: 'afterSales.list',
             name: '售后订单',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'afterSales.list.view', name: '查看售后订单', type: 'action' },
               { id: 'afterSales.list.export', name: '导出售后数据', type: 'action' }
             ]
           },
           {
             id: 'afterSales.add',
             name: '新建售后',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'afterSales.add.create', name: '创建售后单', type: 'action' },
               { id: 'afterSales.add.batch', name: '批量创建', type: 'action' }
             ]
           },
           {
             id: 'afterSales.detail',
             name: '售后详情',
             icon: 'View',
             type: 'menu',
             children: [
               { id: 'afterSales.detail.view', name: '查看售后详情', type: 'action' },
               { id: 'afterSales.detail.edit', name: '编辑售后单', type: 'action' },
               { id: 'afterSales.detail.process', name: '处理售后', type: 'action' }
             ]
           },
           {
             id: 'afterSales.data',
             name: '售后数据',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'afterSales.data.view', name: '查看售后数据', type: 'action' },
               { id: 'afterSales.data.analysis', name: '售后分析', type: 'action' },
               { id: 'afterSales.data.report', name: '售后报告', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'data',
         name: '资料管理',
         icon: 'FolderOpened',
         type: 'menu',
         children: [
           {
             id: 'data.list',
             name: '资料列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'data.list.view', name: '查看资料列表', type: 'action' },
               { id: 'data.list.export', name: '导出资料', type: 'action' },
               { id: 'data.list.import', name: '导入资料', type: 'action' },
               { id: 'data.list.assign', name: '分配资料', type: 'action' }
             ]
           },
           {
             id: 'data.search',
             name: '客户查询',
             icon: 'Search',
             type: 'menu',
             children: [
               { id: 'data.search.basic', name: '基础查询', type: 'action' },
               { id: 'data.search.advanced', name: '高级查询', type: 'action' },
               { id: 'data.search.export', name: '导出查询结果', type: 'action' }
             ]
           },
           {
             id: 'data.recycle',
             name: '回收站',
             icon: 'Delete',
             type: 'menu',
             children: [
               { id: 'data.recycle.view', name: '查看回收站', type: 'action' },
               { id: 'data.recycle.restore', name: '恢复数据', type: 'action' },
               { id: 'data.recycle.delete', name: '彻底删除', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'product',
         name: '商品管理',
         icon: 'Goods',
         type: 'menu',
         children: [
           {
             id: 'product.list',
             name: '商品列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'product.list.view', name: '查看商品', type: 'action' },
               { id: 'product.list.export', name: '导出商品', type: 'action' },
               { id: 'product.list.edit', name: '编辑商品', type: 'action' },
               { id: 'product.list.delete', name: '删除商品', type: 'action' },
               { id: 'product.list.batchOperation', name: '批量操作', type: 'action' },
               { id: 'product.list.priceAdjust', name: '价格调整', type: 'action' }
             ]
           },
           {
             id: 'product.add',
             name: '新增商品',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'product.add.create', name: '创建商品', type: 'action' },
               { id: 'product.add.batchAdd', name: '批量新增', type: 'action' }
             ]
           },
           {
             id: 'product.category',
             name: '商品分类',
             icon: 'Collection',
             type: 'menu',
             children: [
               { id: 'product.category.view', name: '查看分类', type: 'action' },
               { id: 'product.category.create', name: '新增分类', type: 'action' },
               { id: 'product.category.edit', name: '编辑分类', type: 'action' },
               { id: 'product.category.delete', name: '删除分类', type: 'action' },
               { id: 'product.category.manage', name: '管理分类', type: 'action' }
             ]
           },
           {
             id: 'product.inventory',
             name: '库存管理',
             icon: 'Box',
             type: 'menu',
             children: [
               { id: 'product.inventory.view', name: '查看库存', type: 'action' },
               { id: 'product.inventory.adjust', name: '调整库存', type: 'action' },
               { id: 'product.inventory.inbound', name: '入库操作', type: 'action' },
               { id: 'product.inventory.outbound', name: '出库操作', type: 'action' },
               { id: 'product.inventory.transfer', name: '转移库存', type: 'action' },
               { id: 'product.inventory.alert', name: '预警设置', type: 'action' }
             ]
           },
           {
             id: 'product.analytics',
             name: '商品分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'product.analytics.view', name: '查看分析', type: 'action' },
               { id: 'product.analytics.sales', name: '销售分析', type: 'action' },
               { id: 'product.analytics.profit', name: '利润分析', type: 'action' },
               { id: 'product.analytics.trend', name: '趋势分析', type: 'action' },
               { id: 'product.analytics.exportReport', name: '导出报表', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'data',
         name: '资料管理',
         icon: 'FolderOpened',
         type: 'menu',
         children: [
           {
             id: 'data.list',
             name: '资料列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'data.list.view', name: '查看资料列表', type: 'action' },
               { id: 'data.list.export', name: '导出资料', type: 'action' },
               { id: 'data.list.import', name: '导入资料', type: 'action' },
               { id: 'data.list.assign', name: '分配资料', type: 'action' }
             ]
           },
           {
             id: 'data.search',
             name: '客户查询',
             icon: 'Search',
             type: 'menu',
             children: [
               { id: 'data.search.basic', name: '基础查询', type: 'action' },
               { id: 'data.search.advanced', name: '高级查询', type: 'action' },
               { id: 'data.search.export', name: '导出查询结果', type: 'action' }
             ]
           },
           {
             id: 'data.recycle',
             name: '回收站',
             icon: 'Delete',
             type: 'menu',
             children: [
               { id: 'data.recycle.view', name: '查看回收站', type: 'action' },
               { id: 'data.recycle.restore', name: '恢复数据', type: 'action' },
               { id: 'data.recycle.delete', name: '彻底删除', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'performance',
         name: '业绩统计',
         icon: 'TrendCharts',
         type: 'menu',
         children: [
           {
             id: 'performance.personal',
             name: '个人业绩',
             icon: 'User',
             type: 'menu',
             children: [
               { id: 'performance.personal.view', name: '查看个人业绩', type: 'action' },
               { id: 'performance.personal.export', name: '导出个人数据', type: 'action' }
             ]
           },
           {
             id: 'performance.team',
             name: '团队业绩',
             icon: 'UserFilled',
             type: 'menu',
             children: [
               { id: 'performance.team.view', name: '查看团队业绩', type: 'action' },
               { id: 'performance.team.export', name: '导出团队数据', type: 'action' },
               { id: 'performance.team.compare', name: '业绩对比', type: 'action' }
             ]
           },
           {
             id: 'performance.analysis',
             name: '业绩分析',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'performance.analysis.view', name: '查看分析报告', type: 'action' },
               { id: 'performance.analysis.trend', name: '趋势分析', type: 'action' },
               { id: 'performance.analysis.forecast', name: '业绩预测', type: 'action' }
             ]
           },
           {
             id: 'performance.share',
             name: '业绩分享',
             icon: 'Share',
             type: 'menu',
             children: [
               { id: 'performance.share.view', name: '查看分享', type: 'action' },
               { id: 'performance.share.create', name: '创建分享', type: 'action' },
               { id: 'performance.share.manage', name: '管理分享', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'afterSales',
         name: '售后管理',
         icon: 'Tools',
         type: 'menu',
         children: [
           {
             id: 'afterSales.list',
             name: '售后订单',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'afterSales.list.view', name: '查看售后订单', type: 'action' },
               { id: 'afterSales.list.export', name: '导出售后数据', type: 'action' }
             ]
           },
           {
             id: 'afterSales.add',
             name: '新建售后',
             icon: 'Plus',
             type: 'menu',
             children: [
               { id: 'afterSales.add.create', name: '创建售后单', type: 'action' },
               { id: 'afterSales.add.batch', name: '批量创建', type: 'action' }
             ]
           },
           {
             id: 'afterSales.detail',
             name: '售后详情',
             icon: 'View',
             type: 'menu',
             children: [
               { id: 'afterSales.detail.view', name: '查看售后详情', type: 'action' },
               { id: 'afterSales.detail.edit', name: '编辑售后单', type: 'action' },
               { id: 'afterSales.detail.process', name: '处理售后', type: 'action' }
             ]
           },
           {
             id: 'afterSales.data',
             name: '售后数据',
             icon: 'DataAnalysis',
             type: 'menu',
             children: [
               { id: 'afterSales.data.view', name: '查看售后数据', type: 'action' },
               { id: 'afterSales.data.analysis', name: '售后分析', type: 'action' },
               { id: 'afterSales.data.report', name: '售后报告', type: 'action' }
             ]
           }
         ]
       },
       {
         id: 'logistics',
         name: '物流管理',
         icon: 'Van',
         type: 'menu',
         children: [
           {
             id: 'logistics.list',
             name: '物流列表',
             icon: 'List',
             type: 'menu',
             children: [
               { id: 'logistics.list.view', name: '查看物流列表', type: 'action' },
               { id: 'logistics.list.export', name: '导出物流数据', type: 'action' }
             ]
           },
           {
             id: 'logistics.track',
             name: '物流跟踪',
             icon: 'Position',
             type: 'menu',
             children: [
               { id: 'logistics.track.view', name: '查看跟踪信息', type: 'action' },
               { id: 'logistics.track.update', name: '更新跟踪状态', type: 'action' }
             ]
           },
           {
             id: 'logistics.companies',
             name: '物流公司',
             icon: 'OfficeBuilding',
             type: 'menu',
             children: [
               { id: 'logistics.companies.view', name: '查看物流公司', type: 'action' },
               { id: 'logistics.companies.create', name: '添加物流公司', type: 'action' },
               { id: 'logistics.companies.edit', name: '编辑物流公司', type: 'action' },
               { id: 'logistics.companies.delete', name: '删除物流公司', type: 'action' }
             ]
           },
           {
             id: 'logistics.shipping',
             name: '发货列表',
             icon: 'Box',
             type: 'menu',
             children: [
               { id: 'logistics.shipping.view', name: '查看发货列表', type: 'action' },
               { id: 'logistics.shipping.create', name: '创建发货单', type: 'action' },
               { id: 'logistics.shipping.edit', name: '编辑发货单', type: 'action' },
               { id: 'logistics.shipping.batchExport', name: '批量导出', type: 'action' }
             ]
           },
           {
             id: 'logistics.status',
             name: '状态更新',
             icon: 'Refresh',
             type: 'menu',
             children: [
               { id: 'logistics.status.view', name: '查看状态', type: 'action' },
               { id: 'logistics.status.update', name: '更新状态', type: 'action' },
               { id: 'logistics.status.batch', name: '批量更新', type: 'action' }
             ]
           }
         ]
       }
     ];
  } finally {
    // 构建权限树选择数据
    permissionTreeSelect.value = buildTreeSelect(permissionTree.value);
  }
}
/**
 * 加载所有权限 - 使用统一权限服务
 */
const loadAllPermissions = async () => {
  try {
    // 使用统一权限服务获取所有权限
    const permissions = permissionService.getAllPermissions()
    allPermissions.value = permissions;
    console.log('所有权限加载成功');
  } catch (error) {
    console.error('加载所有权限失败:', error);

    // 降级到本地权限数据
    allPermissions.value = [
      {
        id: 'system',
        name: '系统管理',
        code: 'system',
        type: 'menu',
        path: '/system',
        icon: 'Setting',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'system.user',
            name: '用户管理',
            code: 'system.user',
            type: 'menu',
            path: '/system/user',
            icon: 'User',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'system.user.view',
                name: '查看用户',
                code: 'system.user.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.user.create',
                name: '创建用户',
                code: 'system.user.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'system.user.edit',
                name: '编辑用户',
                code: 'system.user.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'system.user.delete',
                name: '删除用户',
                code: 'system.user.delete',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          },
          {
            id: 'system.role',
            name: '角色管理',
            code: 'system.role',
            type: 'menu',
            path: '/system/role',
            icon: 'UserFilled',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'system.role.view',
                name: '查看角色',
                code: 'system.role.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.role.create',
                name: '创建角色',
                code: 'system.role.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'system.role.edit',
                name: '编辑角色',
                code: 'system.role.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'system.role.delete',
                name: '删除角色',
                code: 'system.role.delete',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          },
          {
            id: 'system.permission',
            name: '权限管理',
            code: 'system.permission',
            type: 'menu',
            path: '/system/permission',
            icon: 'Lock',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'system.permission.view',
                name: '查看权限',
                code: 'system.permission.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'system.permission.assign',
                name: '分配权限',
                code: 'system.permission.assign',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'customer',
        name: '客户管理',
        code: 'customer',
        type: 'menu',
        path: '/customer',
        icon: 'Avatar',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'customer.list',
            name: '客户列表',
            code: 'customer.list',
            type: 'menu',
            path: '/customer/list',
            icon: 'List',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'customer.list.view',
                name: '查看客户列表',
                code: 'customer.list.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.list.export',
                name: '导出客户数据',
                code: 'customer.list.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'customer.detail',
            name: '客户详情',
            code: 'customer.detail',
            type: 'menu',
            path: '/customer/detail',
            icon: 'View',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'customer.detail.view',
                name: '查看客户详情',
                code: 'customer.detail.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.detail.edit',
                name: '编辑客户信息',
                code: 'customer.detail.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'customer.manage',
            name: '客户操作',
            code: 'customer.manage',
            type: 'menu',
            icon: 'Operation',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'customer.manage.create',
                name: '新增客户',
                code: 'customer.manage.create',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'customer.manage.edit',
                name: '编辑客户',
                code: 'customer.manage.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'customer.manage.delete',
                name: '删除客户',
                code: 'customer.manage.delete',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'customer.manage.assign',
                name: '分配客户',
                code: 'customer.manage.assign',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'order',
        name: '订单管理',
        code: 'order',
        type: 'menu',
        path: '/order',
        icon: 'Document',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'order.list',
            name: '订单列表',
            code: 'order.list',
            type: 'menu',
            path: '/order/list',
            icon: 'List',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'order.list.view',
                name: '查看订单列表',
                code: 'order.list.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.list.export',
                name: '导出订单数据',
                code: 'order.list.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'order.detail',
            name: '订单详情',
            code: 'order.detail',
            type: 'menu',
            path: '/order/detail',
            icon: 'View',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'order.detail.view',
                name: '查看订单详情',
                code: 'order.detail.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.detail.edit',
                name: '编辑订单信息',
                code: 'order.detail.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'order.manage',
            name: '订单操作',
            code: 'order.manage',
            type: 'menu',
            icon: 'Operation',
            sort: 3,
            status: 'active',
            children: [
              {
                id: 'order.manage.create',
                name: '新增订单',
                code: 'order.manage.create',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'order.manage.edit',
                name: '编辑订单',
                code: 'order.manage.edit',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'order.manage.delete',
                name: '删除订单',
                code: 'order.manage.delete',
                type: 'action',
                sort: 3,
                status: 'active'
              },
              {
                id: 'order.manage.approve',
                name: '审批订单',
                code: 'order.manage.approve',
                type: 'action',
                sort: 4,
                status: 'active'
              }
            ]
          }
        ]
      },
      {
        id: 'data',
        name: '数据管理',
        code: 'data',
        type: 'menu',
        path: '/data',
        icon: 'DataAnalysis',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'data.analysis',
            name: '数据分析',
            code: 'data.analysis',
            type: 'menu',
            path: '/data/analysis',
            icon: 'TrendCharts',
            sort: 1,
            status: 'active',
            children: [
              {
                id: 'data.analysis.view',
                name: '查看数据分析',
                code: 'data.analysis.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'data.analysis.export',
                name: '导出分析报告',
                code: 'data.analysis.export',
                type: 'action',
                sort: 2,
                status: 'active'
              }
            ]
          },
          {
            id: 'data.report',
            name: '报表管理',
            code: 'data.report',
            type: 'menu',
            path: '/data/report',
            icon: 'Document',
            sort: 2,
            status: 'active',
            children: [
              {
                id: 'data.report.view',
                name: '查看报表',
                code: 'data.report.view',
                type: 'action',
                sort: 1,
                status: 'active'
              },
              {
                id: 'data.report.create',
                name: '创建报表',
                code: 'data.report.create',
                type: 'action',
                sort: 2,
                status: 'active'
              },
              {
                id: 'data.report.edit',
                name: '编辑报表',
                code: 'data.report.edit',
                type: 'action',
                sort: 3,
                status: 'active'
              }
            ]
          }
        ]
      }
    ]

    // 构建权限树选择数据
    permissionTreeSelect.value = buildTreeSelect(allPermissions.value)
  }
}

/**
 * 构建树形选择数据
 */
const buildTreeSelect = (data: PermissionData[]): TreeSelectData[] => {
  return data.map(item => ({
    id: item.id,
    name: item.name,
    children: item.children ? buildTreeSelect(item.children) : undefined
  }))
}

/**
 * 获取权限的所有父级ID
 */
const getParentIds = (permissionId: string, tree: PermissionData[], parentIds: string[] = []): string[] => {
  for (const node of tree) {
    if (node.children) {
      if (node.children.some(child => child.id === permissionId)) {
        parentIds.push(node.id)
        return getParentIds(node.id, tree, parentIds)
      } else {
        const found = getParentIds(permissionId, node.children, parentIds)
        if (found.length > 0) {
          parentIds.push(node.id)
          return parentIds
        }
      }
    }
  }
  return parentIds
}

/**
 * 获取权限的所有子级ID
 */
const getChildIds = (permissionId: string, tree: PermissionData[]): string[] => {
  const childIds: string[] = []

  const findChildren = (nodes: PermissionData[]) => {
    for (const node of nodes) {
      if (node.id === permissionId && node.children) {
        const collectIds = (children: PermissionData[]) => {
          children.forEach(child => {
            childIds.push(child.id)
            if (child.children) {
              collectIds(child.children)
            }
          })
        }
        collectIds(node.children)
        return
      }
      if (node.children) {
        findChildren(node.children)
      }
    }
  }

  findChildren(tree)
  return childIds
}

/**
 * 获取同级权限ID
 */
const getSiblingIds = (parentId: string, tree: PermissionData[]): string[] => {
  const siblingIds: string[] = []

  const findSiblings = (nodes: PermissionData[]) => {
    for (const node of nodes) {
      if (node.id === parentId && node.children) {
        node.children.forEach(child => {
          siblingIds.push(child.id)
        })
        return
      }
      if (node.children) {
        findSiblings(node.children)
      }
    }
  }

  findSiblings(tree)
  return siblingIds
}

/**
 * 用户搜索
 */
const handleUserSearch = () => {
  let filtered = roleUsers.value

  // 关键词搜索
  if (userSearchKeyword.value) {
    const keyword = userSearchKeyword.value.toLowerCase()
    filtered = filtered.filter((user: unknown) =>
      user.username.toLowerCase().includes(keyword) ||
      user.realName.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选
  if (userStatusFilter.value) {
    filtered = filtered.filter((user: unknown) => user.status === userStatusFilter.value)
  }

  // 部门筛选
  if (userDepartmentFilter.value) {
    filtered = filtered.filter((user: unknown) => user.department === userDepartmentFilter.value)
  }

  filteredRoleUsers.value = filtered
  userPagination.page = 1
}

/**
 * 权限搜索
 */
const handlePermissionSearch = () => {
  let filtered = rolePermissions.value

  // 关键词搜索
  if (permissionSearchKeyword.value) {
    const keyword = permissionSearchKeyword.value.toLowerCase()
    filtered = filtered.filter((perm: unknown) =>
      perm.name.toLowerCase().includes(keyword) ||
      perm.code.toLowerCase().includes(keyword) ||
      perm.description.toLowerCase().includes(keyword)
    )
  }

  // 类型筛选
  if (permissionTypeFilter.value) {
    filtered = filtered.filter((perm: unknown) => perm.type === permissionTypeFilter.value)
  }

  // 模块筛选
  if (permissionModuleFilter.value) {
    filtered = filtered.filter((perm: unknown) => perm.module === permissionModuleFilter.value)
  }

  filteredRolePermissions.value = filtered
  permissionPagination.page = 1
}

/**
 * 导出用户列表
 */
const handleExportUsers = () => {
  try {
    if (filteredRoleUsers.value.length === 0) {
      ElMessage.warning('没有可导出的用户数据')
      return
    }

    // 准备导出数据
    const exportData = filteredRoleUsers.value.map(user => ({
      '用户名': user.username,
      '姓名': user.realName,
      '邮箱': user.email,
      '部门': user.department,
      '职位': user.position,
      '状态': user.status === 'active' ? '在职' : '离职',
      '最后登录': user.lastLoginTime
    }))

    // 转换为CSV格式
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentViewRole.value?.name}_用户列表_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('用户列表导出成功')
  } catch (error) {
    console.error('导出用户列表失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 导出权限列表
 */
const handleExportPermissions = () => {
  try {
    if (filteredRolePermissions.value.length === 0) {
      ElMessage.warning('没有可导出的权限数据')
      return
    }

    // 准备导出数据
    const exportData = filteredRolePermissions.value.map(perm => ({
      '权限名称': perm.name,
      '权限编码': perm.code,
      '类型': perm.type === 'menu' ? '菜单' : '操作',
      '所属模块': perm.module,
      '描述': perm.description
    }))

    // 转换为CSV格式
    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentViewRole.value?.name}_权限列表_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('权限列表导出成功')
  } catch (error) {
    console.error('导出权限列表失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 查看用户详情
 */
const handleViewUserDetail = (user: unknown) => {
  ElMessageBox.alert(
    `
      <div style="line-height: 2;">
        <p><strong>用户名：</strong>${user.username}</p>
        <p><strong>姓名：</strong>${user.realName}</p>
        <p><strong>邮箱：</strong>${user.email}</p>
        <p><strong>部门：</strong>${user.department}</p>
        <p><strong>职位：</strong>${user.position}</p>
        <p><strong>状态：</strong>${user.status === 'active' ? '在职' : '离职'}</p>
        <p><strong>最后登录：</strong>${user.lastLoginTime}</p>
      </div>
    `,
    '用户详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

/**
 * 查看权限详情
 */
const handleViewPermissionDetail = (permission: unknown) => {
  ElMessageBox.alert(
    `
      <div style="line-height: 2;">
        <p><strong>权限名称：</strong>${permission.name}</p>
        <p><strong>权限编码：</strong>${permission.code}</p>
        <p><strong>类型：</strong>${permission.type === 'menu' ? '菜单' : '操作'}</p>
        <p><strong>所属模块：</strong>${permission.module}</p>
        <p><strong>描述：</strong>${permission.description}</p>
        ${permission.path ? `<p><strong>路径：</strong>${permission.path}</p>` : ''}
      </div>
    `,
    '权限详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

/**
 * 关闭用户列表弹窗
 */
const handleCloseUserDialog = () => {
  userListDialogVisible.value = false
  userSearchKeyword.value = ''
  userStatusFilter.value = ''
  userDepartmentFilter.value = ''
  roleUsers.value = []
  filteredRoleUsers.value = []
  currentViewRole.value = null
  userPagination.page = 1
}

/**
 * 关闭权限列表弹窗
 */
const handleClosePermissionDialog = () => {
  permissionListDialogVisible.value = false
  permissionSearchKeyword.value = ''
  permissionTypeFilter.value = ''
  permissionModuleFilter.value = ''
  rolePermissions.value = []
  filteredRolePermissions.value = []
  currentViewRole.value = null
  permissionPagination.page = 1
}

// 加载角色模板列表
const loadRoleTemplates = async () => {
  try {
    const templates = await roleApiService.getRoleTemplates()
    roleTemplates.value = templates.map(t => ({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description || '',
      permissions: t.permissions || []
    }))
    console.log('[Role] 加载了', roleTemplates.value.length, '个角色模板')
  } catch (error) {
    console.warn('[Role] 加载角色模板失败:', error)
    roleTemplates.value = []
  }
}

// 从模板创建角色
const handleCreateFromTemplate = async (template: {id: string, name: string, code: string, description: string, permissions: string[]}) => {
  selectedTemplate.value = template

  // 弹出对话框让用户输入新角色的名称和编码
  try {
    const { value } = await ElMessageBox.prompt(
      `基于模板「${template.name}」创建新角色，请输入角色名称：`,
      '从模板创建角色',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入角色名称',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '请输入角色名称'
          }
          return true
        }
      }
    )

    const roleName = value.trim()

    // 第二步：输入角色编码
    const { value: codeValue } = await ElMessageBox.prompt(
      '请输入角色编码（英文小写和下划线）：',
      '从模板创建角色',
      {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：sales_manager',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '请输入角色编码'
          }
          if (!/^[a-z_]+$/.test(value)) {
            return '编码只能包含小写字母和下划线'
          }
          return true
        }
      }
    )

    const roleCode = codeValue.trim()

    // 调用API从模板创建角色
    await roleApiService.createRoleFromTemplate(template.id, {
      name: roleName,
      code: roleCode,
      description: template.description
    })

    ElMessage.success(`角色「${roleName}」创建成功（基于模板：${template.name}）`)

    // 刷新角色列表
    await loadRoleList()

  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('从模板创建角色失败:', error)
      ElMessage.error(error?.message || '创建角色失败')
    }
  }
}

/**
 * 数据范围变更处理
 */
const handleDataScopeChange = (value: 'all' | 'department' | 'self') => {
  console.log('[角色权限] 数据范围变更:', value)
  currentRoleDataScope.value = value
}

/**
 * 获取数据范围提示标题
 */
const getDataScopeAlertTitle = () => {
  switch (currentRoleDataScope.value) {
    case 'all':
      return '该角色可以查看系统中所有用户的数据，适用于管理员角色'
    case 'department':
      return '该角色只能查看本部门及下属部门的数据，适用于部门经理角色'
    case 'self':
      return '该角色只能查看自己创建的数据，适用于普通员工角色'
    default:
      return '请选择数据范围'
  }
}

/**
 * 获取数据范围提示类型
 */
const getDataScopeAlertType = () => {
  switch (currentRoleDataScope.value) {
    case 'all':
      return 'warning'
    case 'department':
      return 'info'
    case 'self':
      return 'success'
    default:
      return 'info'
  }
}

// 生命周期钩子
onMounted(() => {
  loadRoleStats()
  loadRoleList()
  loadPermissionTree()
  loadRoleTemplates()
})
</script>

<style scoped>
.role-management {
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
  margin: 0 0 20px 0;
  color: #303133;
}

.stats-section {
  display: flex;
  gap: 20px;
  flex-wrap: nowrap;
}

.stat-card {
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
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
}

.stat-icon.primary {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.stat-icon.success {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
}

.stat-icon.info {
  background: linear-gradient(135deg, #909399, #b1b3b8);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  font-family: Arial, sans-serif;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-number.primary {
  color: #409eff;
}

.stat-number.success {
  color: #67c23a;
}

.stat-number.warning {
  color: #e6a23c;
}

.stat-number.info {
  color: #909399;
}

.stat-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 2px;
  font-weight: 500;
}

.stat-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
}

.header-actions {
  display: flex;
  gap: 12px;
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

.permission-setting {
  padding: 0;
}

.role-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.role-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.permission-tree {
  max-height: 400px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 16px;
}

.node-tag {
  margin-left: auto;
}

.permission-manage {
  padding: 0;
}

.manage-header {
  display: flex;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .stats-section {
    gap: 16px;
  }

  .stat-card {
    min-width: 160px;
  }

  .header-actions {
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .stats-section {
    gap: 12px;
  }

  .stat-card {
    min-width: 140px;
  }

  .stat-content {
    gap: 12px;
    padding: 6px;
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .stat-number {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .stats-section {
    flex-direction: column;
    gap: 16px;
  }

  .stat-card {
    min-width: auto;
    max-width: none;
  }

  .stat-content {
    gap: 16px;
    padding: 8px;
  }

  .stat-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }

  .stat-number {
    font-size: 28px;
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

  .manage-header {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 用户和权限列表弹窗样式 */
.user-list-content,
.permission-list-content {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card-mini {
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.stat-mini-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
}

.stat-mini-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-mini-icon.primary {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.stat-mini-icon.success {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-mini-icon.warning {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
}

.stat-mini-icon.info {
  background: linear-gradient(135deg, #909399, #b1b3b8);
}

.stat-mini-info {
  flex: 1;
}

.stat-mini-value {
  font-size: 24px;
  font-weight: bold;
  font-family: Arial, sans-serif;
  line-height: 1;
  margin-bottom: 4px;
  color: #303133;
}

.stat-mini-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.list-header {
  margin-bottom: 16px;
}

.list-header .el-row {
  width: 100%;
}

.list-header .el-input,
.list-header .el-select {
  width: 100%;
}

/* 数据设置标签页样式 */
.data-scope-setting {
  padding: 16px 0;
}

.data-scope-setting .scope-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 16px;
}

.data-scope-setting .scope-radio-group {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.data-scope-setting .scope-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.data-scope-setting .scope-item:last-child {
  border-bottom: none;
}

.data-scope-setting .scope-item .el-radio {
  display: flex;
  align-items: flex-start;
  height: auto;
  white-space: normal;
  margin-right: 0;
  width: 100%;
}

.data-scope-setting .scope-item :deep(.el-radio__input) {
  margin-top: 2px;
}

.data-scope-setting .scope-item :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
  flex: 1;
}

.data-scope-setting .scope-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.5;
}

.data-scope-setting .scope-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.data-scope-setting .scope-item:hover {
  background-color: #f5f7fa;
}

.permission-tree {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
}
</style>

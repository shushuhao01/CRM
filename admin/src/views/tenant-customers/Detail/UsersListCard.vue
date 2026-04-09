<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>用户列表
          <el-tag size="small" style="margin-left: 8px;">共 {{ users.length }} 个用户</el-tag>
          <el-tag size="small" type="info" style="margin-left: 4px;">最大 {{ maxUsers || 0 }} 个</el-tag>
        </span>
      </div>
    </template>
    <el-table :data="users" stripe v-loading="loading" :max-height="400">
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
          <el-tag :type="getUserStatusType(row.status)" size="small">
            {{ getUserStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && users.length === 0" description="暂无用户数据" />
  </el-card>
</template>

<script setup lang="ts">
import { formatDateTime, getRoleTagType, getUserStatusType, getUserStatusText } from './helpers'

defineProps<{
  users: any[]
  loading: boolean
  maxUsers: number
}>()
</script>

<style scoped lang="scss">
.info-card {
  border-radius: 8px;
  border: none;
  :deep(.el-card__header) { padding: 12px 20px; }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}
</style>

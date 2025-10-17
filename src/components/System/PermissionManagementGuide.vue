<template>
  <div class="permission-guide">
    <div class="guide-header">
      <h1>权限管理系统使用指南</h1>
      <p>详细了解各个权限管理页面的功能和使用场景</p>
    </div>

    <el-card class="guide-card">
      <template #header>
        <h2>权限管理页面功能对比</h2>
      </template>

      <el-table :data="comparisonData" border style="width: 100%">
        <el-table-column prop="feature" label="功能特性" width="150" />
        <el-table-column prop="rolePermission" label="角色权限页面" width="200" />
        <el-table-column prop="superAdmin" label="超级管理员面板" width="200" />
        <el-table-column prop="customerService" label="客服权限管理" width="200" />
      </el-table>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <el-card class="page-detail-card">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>角色权限页面</span>
            </div>
          </template>
          
          <div class="page-description">
            <h4>主要功能</h4>
            <ul>
              <li>创建和管理系统角色</li>
              <li>为角色分配基础权限</li>
              <li>权限树形结构管理</li>
              <li>角色状态控制</li>
            </ul>

            <h4>适用场景</h4>
            <ul>
              <li>日常角色权限管理</li>
              <li>新角色创建</li>
              <li>基础权限分配</li>
              <li>权限结构维护</li>
            </ul>

            <h4>使用对象</h4>
            <p>系统管理员、IT管理员</p>

            <h4>权限配置方式</h4>
            <p>通过权限树为角色分配菜单、按钮、接口权限</p>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="page-detail-card">
          <template #header>
            <div class="card-header">
              <el-icon><Star /></el-icon>
              <span>超级管理员面板</span>
            </div>
          </template>
          
          <div class="page-description">
            <h4>主要功能</h4>
            <ul>
              <li>批量用户权限管理</li>
              <li>角色权限模板管理</li>
              <li>权限审计日志</li>
              <li>系统级权限配置</li>
              <li>权限配置导入导出</li>
            </ul>

            <h4>适用场景</h4>
            <ul>
              <li>系统初始化配置</li>
              <li>批量用户导入</li>
              <li>权限模板管理</li>
              <li>安全审计监控</li>
              <li>高级权限配置</li>
            </ul>

            <h4>使用对象</h4>
            <p>仅限超级管理员</p>

            <h4>特殊功能</h4>
            <p>提供批量管理、模板配置、审计监控等高级功能</p>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="page-detail-card">
          <template #header>
            <div class="card-header">
              <el-icon><Service /></el-icon>
              <span>客服管理</span>
            </div>
          </template>
          
          <div class="page-description">
            <h4>主要功能</h4>
            <ul>
              <li>客服类型分组管理</li>
              <li>业务权限配置</li>
              <li>数据范围控制</li>
              <li>工作台权限定制</li>
              <li>客服权限批量配置</li>
            </ul>

            <h4>适用场景</h4>
            <ul>
              <li>客服团队权限管理</li>
              <li>业务权限分配</li>
              <li>客服工作台配置</li>
              <li>数据访问控制</li>
            </ul>

            <h4>使用对象</h4>
            <p>客服主管、部门经理、HR</p>

            <h4>业务特色</h4>
            <p>专注客服业务场景，按客服类型进行权限分类管理</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="usage-guide-card" style="margin-top: 20px;">
      <template #header>
        <h3>使用建议</h3>
      </template>

      <el-steps :active="3" finish-status="success">
        <el-step title="基础配置" description="使用角色权限页面创建基础角色和权限结构" />
        <el-step title="高级管理" description="使用超管面板进行批量配置和模板管理" />
        <el-step title="业务配置" description="使用客服管理进行具体业务权限配置" />
        <el-step title="日常维护" description="根据需要在各页面间切换进行权限维护" />
      </el-steps>

      <div class="usage-tips" style="margin-top: 20px;">
        <el-alert
          title="使用提示"
          type="info"
          :closable="false"
        >
          <ul>
            <li>• 新系统部署时，建议先使用<strong>角色权限页面</strong>建立基础权限结构</li>
            <li>• 需要批量操作时，使用<strong>超管面板</strong>提高效率</li>
            <li>• 客服团队权限配置，推荐使用<strong>客服管理</strong>页面</li>
            <li>• 定期查看<strong>权限审计日志</strong>，确保系统安全</li>
          </ul>
        </el-alert>
      </div>
    </el-card>

    <el-card class="quick-access-card" style="margin-top: 20px;">
      <template #header>
        <h3>快速访问</h3>
      </template>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-button 
            @click="navigateToRolePage" 
            type="primary" 
            size="large" 
            style="width: 100%;"
          >
            <el-icon><User /></el-icon>
            角色权限管理
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button 
            @click="navigateToSuperAdmin" 
            type="warning" 
            size="large" 
            style="width: 100%;"
          >
            <el-icon><Star /></el-icon>
            超管面板
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button 
            @click="navigateToCustomerService" 
            type="success" 
            size="large" 
            style="width: 100%;"
          >
            <el-icon><Service /></el-icon>
            客服管理
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Star, Service } from '@element-plus/icons-vue'

const router = useRouter()

// 功能对比数据
const comparisonData = ref([
  {
    feature: '目标用户',
    rolePermission: '系统管理员',
    superAdmin: '超级管理员',
    customerService: '客服主管/部门经理'
  },
  {
    feature: '主要功能',
    rolePermission: '基础角色权限管理',
    superAdmin: '高级权限管理',
    customerService: '客服业务权限管理'
  },
  {
    feature: '配置方式',
    rolePermission: '权限树分配',
    superAdmin: '批量配置+模板',
    customerService: '类型分组+业务配置'
  },
  {
    feature: '数据范围',
    rolePermission: '基础权限控制',
    superAdmin: '全局数据控制',
    customerService: '客服数据范围控制'
  },
  {
    feature: '批量操作',
    rolePermission: '基础批量操作',
    superAdmin: '高级批量管理',
    customerService: '客服批量配置'
  },
  {
    feature: '审计功能',
    rolePermission: '基础日志',
    superAdmin: '完整审计日志',
    customerService: '业务操作日志'
  },
  {
    feature: '模板功能',
    rolePermission: '无',
    superAdmin: '角色权限模板',
    customerService: '客服权限模板'
  },
  {
    feature: '使用场景',
    rolePermission: '日常权限管理',
    superAdmin: '系统级配置',
    customerService: '客服团队管理'
  }
])

// 导航方法
const navigateToRolePage = () => {
  router.push('/system/roles')
}

const navigateToSuperAdmin = () => {
  router.push('/system/super-admin-panel')
}

const navigateToCustomerService = () => {
  router.push('/system/customer-service-permissions')
}
</script>

<style scoped>
.permission-guide {
  padding: 20px;
}

.guide-header {
  text-align: center;
  margin-bottom: 30px;
}

.guide-header h1 {
  color: #303133;
  margin-bottom: 10px;
  font-size: 36px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.guide-card {
  margin-bottom: 20px;
}

.page-detail-card {
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.page-description h4 {
  color: #409eff;
  margin: 15px 0 10px 0;
  font-size: 14px;
}

.page-description ul {
  margin: 0 0 15px 0;
  padding-left: 20px;
}

.page-description li {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.4;
}

.page-description p {
  margin: 0 0 15px 0;
  font-size: 13px;
  color: #666;
}

.usage-guide-card .el-steps {
  margin: 20px 0;
}

.usage-tips ul {
  margin: 0;
  padding-left: 20px;
}

.usage-tips li {
  margin: 8px 0;
  line-height: 1.5;
}

.quick-access-card .el-button {
  height: 60px;
  font-size: 16px;
}

.quick-access-card .el-icon {
  margin-right: 8px;
  font-size: 18px;
}
</style>
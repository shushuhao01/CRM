<template>
  <div class="permission-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-background"></div>
      <div class="header-content">
      <div class="header-icon">
        <el-icon size="32"><Setting /></el-icon>
      </div>
      <div class="header-text">
        <h1 class="page-title">权限管理中心</h1>
        <p class="page-subtitle">统一管理系统权限，确保数据安全与访问控制</p>
      </div>
      <div class="view-toggle">
        <el-button-group>
          <el-button 
            :type="viewMode === 'card' ? 'primary' : 'default'"
            @click="viewMode = 'card'"
            :icon="Grid"
          >
            卡片视图
          </el-button>
          <el-button 
            :type="viewMode === 'list' ? 'primary' : 'default'"
            @click="viewMode = 'list'"
            :icon="List"
          >
            列表视图
          </el-button>
        </el-button-group>
      </div>
    </div>
    </div>

    <!-- 权限模块 - 卡片视图 -->
    <div v-if="viewMode === 'card'" class="permission-grid">
      <!-- 角色权限管理 -->
      <div class="permission-card roles-card" @click="navigateToRoles">
        <div class="card-header">
          <div class="card-icon roles-icon">
            <el-icon size="32"><User /></el-icon>
          </div>
          <div class="card-badge">基础权限</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">角色权限管理</h3>
          <p class="card-description">管理系统角色和基础权限分配</p>
          <div class="feature-tags">
            <span class="feature-tag">角色管理</span>
            <span class="feature-tag">权限分配</span>
            <span class="feature-tag">权限树</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item">
              <el-icon><User /></el-icon>
              角色管理
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- 敏感信息权限管理 -->
      <div class="permission-card sensitive-card" @click="navigateToSensitiveInfo">
        <div class="card-header">
          <div class="card-icon sensitive-icon">
            <el-icon size="32"><Lock /></el-icon>
          </div>
          <div class="card-badge security">安全权限</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">敏感信息权限</h3>
          <p class="card-description">精确控制客户敏感信息的访问权限</p>
          <div class="feature-tags">
            <span class="feature-tag">手机号</span>
            <span class="feature-tag">身份证</span>
            <span class="feature-tag">邮箱</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item">
              <el-icon><Lock /></el-icon>
              隐私保护
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- 超级管理员面板 -->
      <div class="permission-card admin-card" @click="navigateToSuperAdmin">
        <div class="card-header">
          <div class="card-icon admin-icon">
            <el-icon size="32"><Lock /></el-icon>
          </div>
          <div class="card-badge admin">高级权限</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">超管面板</h3>
          <p class="card-description">高级权限管理功能和审计监控</p>
          <div class="feature-tags">
            <span class="feature-tag">批量管理</span>
            <span class="feature-tag">模板配置</span>
            <span class="feature-tag">审计日志</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item">
              <el-icon><Lock /></el-icon>
              超级权限
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- 客服权限管理 -->
      <div class="permission-card service-card" @click="navigateToCustomerService">
        <div class="card-header">
          <div class="card-icon service-icon">
            <el-icon size="32"><Service /></el-icon>
          </div>
          <div class="card-badge service">业务权限</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">客服管理</h3>
          <p class="card-description">专门针对客服业务场景的权限配置</p>
          <div class="feature-tags">
            <span class="feature-tag">客服分组</span>
            <span class="feature-tag">业务权限</span>
            <span class="feature-tag">数据范围</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item">
              <el-icon><Service /></el-icon>
              客服管理
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>

      <!-- 权限管理指南 -->
      <div class="permission-card guide-card" @click="navigateToGuide">
        <div class="card-header">
          <div class="card-icon guide-icon">
            <el-icon size="32"><Document /></el-icon>
          </div>
          <div class="card-badge guide">使用指南</div>
        </div>
        <div class="card-content">
          <h3 class="card-title">权限管理指南</h3>
          <p class="card-description">详细了解各个权限管理页面的功能</p>
          <div class="feature-tags">
            <span class="feature-tag">功能对比</span>
            <span class="feature-tag">使用说明</span>
            <span class="feature-tag">最佳实践</span>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item">
              <el-icon><Document /></el-icon>
              帮助文档
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <!-- 权限模块 - 列表视图 -->
    <div v-else class="permission-list">
      <div class="list-container">
        <div class="list-item" @click="navigateToRoles">
          <div class="list-icon roles-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">角色权限管理</h3>
              <span class="list-badge">基础权限</span>
            </div>
            <p class="list-description">管理系统角色和基础权限分配</p>
            <div class="list-tags">
              <span class="list-tag">角色管理</span>
              <span class="list-tag">权限分配</span>
              <span class="list-tag">权限树</span>
            </div>
          </div>
          <div class="list-action">
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="list-item" @click="navigateToSensitiveInfo">
          <div class="list-icon sensitive-icon">
            <el-icon><Lock /></el-icon>
          </div>
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">敏感信息权限</h3>
              <span class="list-badge security">安全权限</span>
            </div>
            <p class="list-description">精确控制客户敏感信息的访问权限</p>
            <div class="list-tags">
              <span class="list-tag">手机号</span>
              <span class="list-tag">身份证</span>
              <span class="list-tag">邮箱</span>
            </div>
          </div>
          <div class="list-action">
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="list-item" @click="navigateToSuperAdmin">
          <div class="list-icon admin-icon">
            <el-icon><Lock /></el-icon>
          </div>
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">超级管理员面板</h3>
              <span class="list-badge admin">高级权限</span>
            </div>
            <p class="list-description">高级权限管理功能和审计监控</p>
            <div class="list-tags">
              <span class="list-tag">批量管理</span>
              <span class="list-tag">模板配置</span>
              <span class="list-tag">审计日志</span>
            </div>
          </div>
          <div class="list-action">
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="list-item" @click="navigateToCustomerService">
          <div class="list-icon service-icon">
            <el-icon><Service /></el-icon>
          </div>
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">客服权限管理</h3>
              <span class="list-badge service">业务权限</span>
            </div>
            <p class="list-description">专门针对客服业务场景的权限配置</p>
            <div class="list-tags">
              <span class="list-tag">客服分组</span>
              <span class="list-tag">业务权限</span>
              <span class="list-tag">数据范围</span>
            </div>
          </div>
          <div class="list-action">
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="list-item" @click="navigateToGuide">
          <div class="list-icon guide-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="list-content">
            <div class="list-header">
              <h3 class="list-title">权限管理指南</h3>
              <span class="list-badge guide">使用指南</span>
            </div>
            <p class="list-description">详细了解各个权限管理页面的功能</p>
            <div class="list-tags">
              <span class="list-tag">功能对比</span>
              <span class="list-tag">使用说明</span>
              <span class="list-tag">最佳实践</span>
            </div>
          </div>
          <div class="list-action">
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作区域 -->
    <div class="quick-actions">
      <el-card shadow="never">
        <template #header>
          <div class="quick-actions-header">
            <span>快速操作</span>
          </div>
        </template>
        <div class="quick-actions-grid">
          <el-button @click="navigateToRoles" class="quick-action-btn">
            <el-icon><User /></el-icon>
            <span>角色管理</span>
          </el-button>
          <el-button @click="navigateToSensitiveInfo" class="quick-action-btn">
            <el-icon><Lock /></el-icon>
            <span>敏感权限</span>
          </el-button>
          <el-button @click="navigateToSuperAdmin" class="quick-action-btn">
            <el-icon><Star /></el-icon>
            <span>超级面板</span>
          </el-button>
          <el-button @click="navigateToCustomerService" class="quick-action-btn">
            <el-icon><Service /></el-icon>
            <span>客服管理</span>
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  User, 
  Lock, 
  Service, 
  Document, 
  ArrowRight, 
  Setting, 
  Grid, 
  List,
  UserFilled,
  Star,
  Reading
} from '@element-plus/icons-vue'

const router = useRouter()

// 视图模式
const viewMode = ref('card')

// 导航方法
const navigateToRoles = () => {
  router.push('/system/roles')
}

const navigateToSensitiveInfo = () => {
  router.push('/system/sensitive-info-permissions')
}

const navigateToSuperAdmin = () => {
  router.push('/system/super-admin-panel')
}

const navigateToCustomerService = () => {
  router.push('/system/customer-service-permissions')
}

const navigateToGuide = () => {
  router.push('/system/permission-guide')
}
</script>

<style scoped>
.permission-management {
  min-height: 100vh;
  background: #ffffff;
  padding: 0;
}

/* 页面头部样式 */
.page-header {
  padding: 10px 0;
  margin-bottom: 20px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 24px;
}

.header-icon {
  background: #409eff;
  border-radius: 16px;
  padding: 12px;
  color: white;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.header-text {
  flex: 1;
  margin-left: 16px;
}

.view-toggle {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #303133;
}

.page-subtitle {
  font-size: 14px;
  margin: 0;
  color: #606266;
  font-weight: 400;
}

/* 权限网格布局 */
.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

/* 权限卡片样式 */
.permission-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

.permission-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.roles-icon {
  background: #409eff;
}

.sensitive-icon {
  background: #f56c6c;
}

.admin-icon {
  background: #67c23a;
}

.service-icon {
  background: #e6a23c;
}

.guide-icon {
  background: #909399;
}

.card-badge {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-badge.security {
  background: rgba(240, 147, 251, 0.1);
  color: #f093fb;
}

.card-badge.admin {
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
}

.card-badge.service {
  background: rgba(67, 233, 123, 0.1);
  color: #43e97b;
}

.card-badge.guide {
  background: rgba(250, 112, 154, 0.1);
  color: #fa709a;
}

/* 卡片内容 */
.card-content {
  margin-bottom: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px 0;
  line-height: 1.4;
}

.card-description {
  font-size: 14px;
  color: #606266;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-tag {
  background: #f7fafc;
  color: #4a5568;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.arrow-icon {
  color: #cbd5e0;
  transition: all 0.3s ease;
}

.permission-card:hover .arrow-icon {
  color: #667eea;
  transform: translateX(4px);
}

/* 快速操作区域 */
.quick-actions {
  max-width: 1400px;
  margin: 40px auto 0;
  padding: 0 24px;
}

.quick-actions-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  border-radius: 8px;
  transition: all 0.3s ease;
  width: 100%;
  min-height: 48px;
}

.quick-action-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

.quick-action-btn .el-icon {
  font-size: 16px;
}

.quick-action-btn span {
  font-size: 14px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
    padding: 0 16px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .permission-grid {
    grid-template-columns: 1fr;
    padding: 0 16px;
    gap: 16px;
  }
  
  .permission-card {
    padding: 16px;
  }
  
  .quick-actions {
    padding: 0 16px;
  }
  
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .permission-list {
    padding: 0 16px;
  }
  
  .list-item {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .list-icon {
    margin-right: 0;
  }
  
  .list-action {
    align-self: flex-end;
  }
}

/* 列表视图样式 */
.permission-list {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.list-container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.3s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: #f8fafc;
  transform: translateX(8px);
}

.list-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 20px;
  flex-shrink: 0;
}

.list-content {
  flex: 1;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.list-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.list-badge {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-badge.security {
  background: rgba(240, 147, 251, 0.1);
  color: #f093fb;
}

.list-badge.admin {
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
}

.list-badge.service {
  background: rgba(67, 233, 123, 0.1);
  color: #43e97b;
}

.list-badge.guide {
  background: rgba(250, 112, 154, 0.1);
  color: #fa709a;
}

.list-description {
  font-size: 14px;
  color: #718096;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.list-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.list-tag {
  background: #f7fafc;
  color: #4a5568;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

.list-action {
  margin-left: 16px;
}

.list-item .arrow-icon {
  color: #cbd5e0;
  transition: all 0.3s ease;
}

.list-item:hover .arrow-icon {
  color: #667eea;
  transform: translateX(4px);
}

@media (max-width: 480px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .permission-grid {
    grid-template-columns: 1fr;
  }
  
  .permission-list {
    padding: 0 20px;
  }
  
  .list-item {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .list-icon {
    margin-right: 0;
  }
  
  .list-action {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style>
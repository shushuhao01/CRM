<template>
  <div class="help-content-section">
    <h1>客户管理</h1>
    
    <div class="content-block">
      <h2>功能概述</h2>
      <p>客户管理模块是CRM系统的核心功能之一，提供完整的客户信息管理、客户关系维护、客户分析等功能。帮助销售团队更好地了解客户需求，提升客户满意度和转化率。</p>
    </div>

    <div class="content-block">
      <h2>主要功能</h2>
      
      <div class="function-item">
        <h3>📋 客户列表</h3>
        <p><strong>功能描述：</strong>展示所有客户信息，支持多种筛选和排序方式</p>
        <p><strong>使用方法：</strong></p>
        <ul>
          <li>点击左侧菜单"客户管理" → "客户列表"进入</li>
          <li>使用顶部搜索框快速查找客户</li>
          <li>点击筛选按钮设置筛选条件</li>
          <li>点击列标题进行排序</li>
        </ul>
        <p><strong>权限要求：</strong>所有用户均可访问</p>
      </div>

      <div class="function-item">
        <h3>➕ 新增客户</h3>
        <p><strong>功能描述：</strong>添加新的客户信息到系统中</p>
        <p><strong>使用方法：</strong></p>
        <ul>
          <li>在客户列表页面点击"新增客户"按钮</li>
          <li>填写客户基本信息（姓名、电话、邮箱等）</li>
          <li>设置客户标签和分组</li>
          <li>添加备注信息</li>
          <li>点击"保存"完成添加</li>
        </ul>
        <p><strong>权限要求：</strong>销售员及以上权限</p>
      </div>

      <div class="function-item">
        <h3>✏️ 编辑客户</h3>
        <p><strong>功能描述：</strong>修改现有客户的信息</p>
        <p><strong>使用方法：</strong></p>
        <ul>
          <li>在客户列表中点击"编辑"按钮</li>
          <li>修改需要更新的信息</li>
          <li>点击"保存"确认修改</li>
        </ul>
        <p><strong>权限要求：</strong>只能编辑自己负责的客户，管理员可编辑所有客户</p>
      </div>

      <div class="function-item">
        <h3>👁️ 客户详情</h3>
        <p><strong>功能描述：</strong>查看客户的详细信息和历史记录</p>
        <p><strong>包含内容：</strong></p>
        <ul>
          <li>客户基本信息</li>
          <li>联系记录</li>
          <li>订单历史</li>
          <li>售后记录</li>
          <li>跟进记录</li>
        </ul>
      </div>

      <div class="function-item">
        <h3>🏷️ 客户标签</h3>
        <p><strong>功能描述：</strong>为客户添加标签，便于分类管理</p>
        <p><strong>使用方法：</strong></p>
        <ul>
          <li>进入"客户管理" → "客户标签"</li>
          <li>创建新标签或管理现有标签</li>
          <li>在客户信息中添加相应标签</li>
        </ul>
        <p><strong>常用标签：</strong>VIP客户、潜在客户、重点客户、流失客户等</p>
      </div>

      <div class="function-item">
        <h3>👥 客户分组</h3>
        <p><strong>功能描述：</strong>将客户按照不同维度进行分组管理</p>
        <p><strong>分组方式：</strong></p>
        <ul>
          <li>按地区分组</li>
          <li>按行业分组</li>
          <li>按客户价值分组</li>
          <li>按销售阶段分组</li>
        </ul>
      </div>
    </div>

    <div class="content-block">
      <h2>操作技巧</h2>
      <div class="tips-grid">
        <div class="tip-item">
          <h4>💡 快速搜索</h4>
          <p>支持按客户姓名、电话、邮箱、公司名称等多字段搜索</p>
        </div>
        <div class="tip-item">
          <h4>📊 批量操作</h4>
          <p>可以批量导入客户信息，批量添加标签或分组</p>
        </div>
        <div class="tip-item">
          <h4>🔄 数据同步</h4>
          <p>客户信息会自动同步到订单、售后等相关模块</p>
        </div>
        <div class="tip-item">
          <h4>📱 移动访问</h4>
          <p>支持手机端访问，随时查看和更新客户信息</p>
        </div>
      </div>
    </div>

    <div class="content-block">
      <h2>注意事项</h2>
      <div class="warning-box">
        <ul>
          <li>客户电话号码必须唯一，系统会自动检查重复</li>
          <li>删除客户前请确认该客户没有关联的订单或售后记录</li>
          <li>客户信息涉及隐私，请严格按照公司规定使用</li>
          <li>定期备份重要客户数据，避免数据丢失</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 客户管理模块帮助内容
</script>

<style scoped>
.help-content-section {
  line-height: 1.6;
  color: #303133;
}

.help-content-section h1 {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 30px;
  border-bottom: 3px solid #409eff;
  padding-bottom: 10px;
}

.help-content-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 30px 0 15px 0;
}

.help-content-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
  margin: 20px 0 10px 0;
}

.help-content-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 10px 0 5px 0;
}

.help-content-section p {
  font-size: 14px;
  color: #303133;
  margin-bottom: 10px;
}

.content-block {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.function-item {
  background: white;
  padding: 20px;
  margin: 15px 0;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.function-item ul {
  margin: 10px 0;
  padding-left: 20px;
}

.function-item li {
  margin: 5px 0;
  font-size: 14px;
  color: #303133;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.tip-item {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.tip-item h4 {
  color: #409eff;
  margin-bottom: 8px;
  font-size: 14px;
}

.tip-item p {
  margin: 0;
  font-size: 13px;
  color: #303133;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
}

.warning-box ul {
  margin: 0;
  padding-left: 20px;
}

.warning-box li {
  color: #856404;
  font-size: 14px;
  margin: 8px 0;
}
</style>
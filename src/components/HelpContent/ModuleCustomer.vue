<template>
  <div class="help-content">
    <h1>客户管理</h1>

    <section>
      <h2>功能概述</h2>
      <p>
        客户管理模块是CRM系统的核心功能之一，提供完整的客户信息管理、分组标签、跟进记录等功能，帮助销售团队高效管理客户资源。
      </p>
    </section>

    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📋</div>
          <div class="menu-info">
            <h4>客户列表</h4>
            <p>查看和管理所有客户信息，支持搜索、筛选、导出</p>
            <span class="menu-path">路径：客户管理 → 客户列表</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">➕</div>
          <div class="menu-info">
            <h4>新增客户</h4>
            <p>录入新客户信息，包括基本信息、联系方式、地址等</p>
            <span class="menu-path">路径：客户管理 → 新增客户</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📁</div>
          <div class="menu-info">
            <h4>客户分组</h4>
            <p>创建和管理客户分组，便于分类管理</p>
            <span class="menu-path">路径：客户管理 → 客户分组</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">🏷️</div>
          <div class="menu-info">
            <h4>客户标签</h4>
            <p>创建和管理客户标签，用于客户画像</p>
            <span class="menu-path">路径：客户管理 → 客户标签</span>
            <el-tag size="small" type="warning">仅管理员可见</el-tag>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>客户列表</h2>
      <h3>页面功能</h3>
      <div class="feature-list">
        <div class="feature-item">
          <h4>🔍 搜索筛选</h4>
          <ul>
            <li>按客户姓名、手机号、微信号搜索</li>
            <li>按客户分组筛选</li>
            <li>按客户标签筛选</li>
            <li>按创建时间筛选</li>
            <li>按归属销售筛选</li>
          </ul>
        </div>
        <div class="feature-item">
          <h4>📊 列表展示</h4>
          <ul>
            <li>客户基本信息（姓名、电话、微信）</li>
            <li>客户分组和标签</li>
            <li>归属销售员</li>
            <li>最近跟进时间</li>
            <li>订单数量和金额</li>
            <li>创建时间</li>
          </ul>
        </div>
        <div class="feature-item">
          <h4>⚡ 快捷操作</h4>
          <ul>
            <li>查看详情：进入客户详情页</li>
            <li>编辑：修改客户信息</li>
            <li>新建订单：为该客户创建订单</li>
            <li>添加跟进：记录跟进内容</li>
            <li>拨打电话：一键外呼（需配合APP）</li>
          </ul>
        </div>
      </div>

      <h3>数据范围</h3>
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          销售员只能看到自己的客户，部门经理可以看到本部门的客户，管理员可以看到全部客户。
        </template>
      </el-alert>
    </section>

    <section>
      <h2>新增客户</h2>
      <h3>必填信息</h3>
      <ul>
        <li><strong>客户姓名</strong>：客户的真实姓名</li>
        <li><strong>手机号码</strong>：客户的联系电话</li>
      </ul>

      <h3>选填信息</h3>
      <ul>
        <li><strong>微信号</strong>：客户的微信号</li>
        <li><strong>性别</strong>：男/女/未知</li>
        <li><strong>年龄</strong>：客户年龄</li>
        <li><strong>客户分组</strong>：选择所属分组</li>
        <li><strong>客户标签</strong>：选择标签（可多选）</li>
        <li><strong>收货地址</strong>：省市区详细地址</li>
        <li><strong>备注</strong>：其他备注信息</li>
      </ul>

      <h3>操作步骤</h3>
      <ol>
        <li>点击左侧菜单"客户管理" → "新增客户"</li>
        <li>填写客户基本信息（姓名、手机号必填）</li>
        <li>选择客户分组和标签（可选）</li>
        <li>填写收货地址（可选）</li>
        <li>点击"保存"按钮完成创建</li>
      </ol>
    </section>

    <section>
      <h2>客户详情</h2>
      <p>点击客户列表中的"查看"按钮，进入客户详情页面，包含以下信息：</p>

      <h3>基本信息</h3>
      <p>展示客户的所有基本信息，支持编辑修改。</p>

      <h3>跟进记录</h3>
      <p>记录与客户的所有沟通和跟进内容：</p>
      <ul>
        <li>跟进时间</li>
        <li>跟进方式（电话、微信、面访等）</li>
        <li>跟进内容</li>
        <li>下次跟进时间</li>
        <li>跟进人</li>
      </ul>

      <h3>订单记录</h3>
      <p>展示该客户的所有订单，包括订单状态、金额等信息。</p>

      <h3>通话记录</h3>
      <p>展示与该客户的所有通话记录，支持录音回放。</p>

      <h3>售后记录</h3>
      <p>展示该客户的售后工单记录。</p>
    </section>

    <section>
      <h2>客户分组</h2>
      <el-tag type="warning">仅管理员可操作</el-tag>
      <p>客户分组用于对客户进行分类管理，便于筛选和统计。</p>

      <h3>创建分组</h3>
      <ol>
        <li>进入"客户管理" → "客户分组"</li>
        <li>点击"新增分组"按钮</li>
        <li>输入分组名称和描述</li>
        <li>点击"确定"保存</li>
      </ol>

      <h3>分组管理</h3>
      <ul>
        <li>编辑：修改分组名称和描述</li>
        <li>删除：删除分组（分组下有客户时不可删除）</li>
        <li>排序：拖拽调整分组顺序</li>
      </ul>
    </section>

    <section>
      <h2>客户标签</h2>
      <el-tag type="warning">仅管理员可操作</el-tag>
      <p>客户标签用于标记客户特征，构建客户画像。</p>

      <h3>创建标签</h3>
      <ol>
        <li>进入"客户管理" → "客户标签"</li>
        <li>点击"新增标签"按钮</li>
        <li>输入标签名称</li>
        <li>选择标签颜色</li>
        <li>点击"确定"保存</li>
      </ol>

      <h3>标签使用</h3>
      <ul>
        <li>在新增/编辑客户时选择标签</li>
        <li>在客户列表中按标签筛选</li>
        <li>一个客户可以有多个标签</li>
      </ul>
    </section>

    <section>
      <h2>数据导入导出</h2>
      <h3>导入客户</h3>
      <ol>
        <li>点击客户列表页面的"导入"按钮</li>
        <li>下载导入模板</li>
        <li>按模板格式填写客户数据</li>
        <li>上传Excel文件</li>
        <li>确认导入数据</li>
      </ol>

      <h3>导出客户</h3>
      <ol>
        <li>在客户列表中筛选需要导出的客户</li>
        <li>点击"导出"按钮</li>
        <li>选择导出字段</li>
        <li>下载Excel文件</li>
      </ol>
    </section>

    <section>
      <h2>常见问题</h2>
      <el-collapse>
        <el-collapse-item title="Q: 如何批量修改客户的分组？" name="1">
          <p>A: 在客户列表中勾选需要修改的客户，点击"批量操作" → "修改分组"，选择目标分组即可。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 客户可以转移给其他销售员吗？" name="2">
          <p>A: 可以。管理员可以在客户详情页点击"转移客户"，选择目标销售员进行转移。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 删除的客户可以恢复吗？" name="3">
          <p>A: 可以。删除的客户会进入回收站，管理员可以在"资料管理" → "回收站"中恢复。</p>
        </el-collapse-item>
        <el-collapse-item title="Q: 如何查看客户的跟进提醒？" name="4">
          <p>A: 设置了下次跟进时间的客户，到期时会在系统消息中心收到提醒通知。</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.help-content {
  line-height: 1.8;
  color: #333;
}

.help-content h1 {
  font-size: 28px;
  color: #1a1a1a;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid #409eff;
}

.help-content h2 {
  font-size: 20px;
  color: #303133;
  margin: 30px 0 15px;
}

.help-content h3 {
  font-size: 16px;
  color: #409eff;
  margin: 20px 0 10px;
}

.help-content h4 {
  font-size: 15px;
  color: #303133;
  margin: 10px 0;
}

.help-content p {
  margin: 10px 0;
  color: #606266;
}

.help-content ul, .help-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 8px 0;
  color: #606266;
}

section {
  margin-bottom: 40px;
}

.menu-list {
  display: grid;
  gap: 15px;
  margin-top: 15px;
}

.menu-item {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.menu-icon {
  font-size: 32px;
  margin-right: 15px;
}

.menu-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.menu-info p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #909399;
}

.menu-path {
  font-size: 12px;
  color: #c0c4cc;
  display: block;
  margin-bottom: 5px;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 15px;
}

.feature-item {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}

.feature-item h4 {
  margin: 0 0 15px;
  color: #409eff;
}

.feature-item ul {
  margin: 0;
  padding-left: 18px;
}

.feature-item li {
  font-size: 13px;
  margin: 5px 0;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-collapse-item__content) {
  color: #606266;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .feature-list {
    grid-template-columns: 1fr;
  }
}
</style>

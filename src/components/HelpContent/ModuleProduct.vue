<template>
  <div class="help-content">
    <h1>商品管理</h1>
    <section>
      <h2>功能概述</h2>
      <p>商品管理模块提供商品信息管理、库存管理、分类管理等功能，支持商品数据分析。</p>
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>商品管理模块仅管理员可访问</template>
      </el-alert>
    </section>
    <section>
      <h2>二级菜单</h2>
      <div class="menu-list">
        <div class="menu-item">
          <div class="menu-icon">📦</div>
          <div class="menu-info">
            <h4>商品列表</h4>
            <p>查看和管理所有商品信息</p>
            <span class="menu-path">路径：商品管理 → 商品列表</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">➕</div>
          <div class="menu-info">
            <h4>新增商品</h4>
            <p>添加新商品信息</p>
            <span class="menu-path">路径：商品管理 → 新增商品</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📊</div>
          <div class="menu-info">
            <h4>库存管理</h4>
            <p>管理商品库存、库存预警</p>
            <span class="menu-path">路径：商品管理 → 库存管理</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📁</div>
          <div class="menu-info">
            <h4>商品分类</h4>
            <p>管理商品分类</p>
            <span class="menu-path">路径：商品管理 → 商品分类</span>
          </div>
        </div>
        <div class="menu-item">
          <div class="menu-icon">📈</div>
          <div class="menu-info">
            <h4>商品分析</h4>
            <p>商品销售数据分析</p>
            <span class="menu-path">路径：商品管理 → 商品分析</span>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h2>商品列表</h2>
      <h3>商品信息</h3>
      <ul>
        <li>商品名称、编码</li>
        <li>商品分类</li>
        <li>销售价格、成本价</li>
        <li>库存数量</li>
        <li>商品图片</li>
        <li>商品描述</li>
        <li>上架状态</li>
      </ul>
      <h3>操作功能</h3>
      <ul>
        <li>编辑商品信息</li>
        <li>上架/下架商品</li>
        <li>调整库存</li>
        <li>删除商品</li>
      </ul>
    </section>
    <section>
      <h2>新增商品</h2>
      <h3>必填信息</h3>
      <ul>
        <li>商品名称</li>
        <li>商品分类</li>
        <li>销售价格</li>
      </ul>
      <h3>选填信息</h3>
      <ul>
        <li>商品编码（不填则自动生成）</li>
        <li>成本价</li>
        <li>初始库存</li>
        <li>商品图片</li>
        <li>商品描述</li>
        <li>规格参数</li>
      </ul>
    </section>
    <section>
      <h2>库存管理</h2>
      <h3>库存操作</h3>
      <ul>
        <li><strong>入库</strong>：增加库存数量</li>
        <li><strong>出库</strong>：减少库存数量</li>
        <li><strong>盘点</strong>：调整库存数量</li>
      </ul>
      <h3>库存预警</h3>
      <p>可设置库存预警阈值，当库存低于阈值时系统自动提醒。</p>
    </section>
    <section>
      <h2>商品分类</h2>
      <ul>
        <li>创建商品分类</li>
        <li>支持多级分类</li>
        <li>分类排序</li>
        <li>分类启用/禁用</li>
      </ul>
    </section>
    <section>
      <h2>商品分析</h2>
      <h3>分析维度</h3>
      <ul>
        <li>销量排行</li>
        <li>销售额排行</li>
        <li>库存周转率</li>
        <li>商品利润分析</li>
        <li>分类销售占比</li>
      </ul>
    </section>
  </div>
</template>
<style scoped>
.help-content { line-height: 1.8; color: #333; }
.help-content h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #409eff; }
.help-content h2 { font-size: 20px; color: #303133; margin: 30px 0 15px; }
.help-content h3 { font-size: 16px; color: #409eff; margin: 20px 0 10px; }
.help-content p { margin: 10px 0; color: #606266; }
.help-content ul { margin: 10px 0; padding-left: 20px; }
.help-content li { margin: 8px 0; color: #606266; }
section { margin-bottom: 30px; }
.menu-list { display: grid; gap: 15px; margin-top: 15px; }
.menu-item { display: flex; align-items: flex-start; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #ebeef5; }
.menu-icon { font-size: 32px; margin-right: 15px; }
.menu-info h4 { margin: 0 0 8px; font-size: 16px; }
.menu-info p { margin: 0 0 8px; font-size: 14px; color: #909399; }
.menu-path { font-size: 12px; color: #c0c4cc; display: block; margin-bottom: 5px; }
</style>

<template>
  <div class="product-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>商品管理</h2>
      </div>
      <div class="header-actions">
        <el-button @click="handleCategoryManage" :icon="Setting">
          分类管理
        </el-button>
        <el-button @click="handleBatchImport" :icon="Upload">
          批量导入
        </el-button>
        <el-button @click="handleExport" :icon="Download">
          导出数据
        </el-button>
        <el-button @click="handleAdd" type="primary" :icon="Plus">
          添加商品
        </el-button>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="stat-card primary-stat" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon primary-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number primary-number">{{ totalProducts }}</div>
                <div class="stat-title">总商品数</div>
                <div class="stat-desc">当前系统中的商品总数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card warning-stat" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon warning-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number warning-number">{{ lowStockCount }}</div>
                <div class="stat-title">库存预警</div>
                <div class="stat-desc">库存低于预警线的商品</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card danger-stat" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon danger-icon">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number danger-number">{{ outOfStockCount }}</div>
                <div class="stat-title">缺货商品</div>
                <div class="stat-desc">当前库存为零的商品</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索筛选区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="商品名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入商品名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="商品编码">
          <el-input
            v-model="searchForm.code"
            placeholder="请输入商品编码"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="商品分类">
          <el-select
            v-model="searchForm.categoryId"
            placeholder="请选择分类"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="category in categoryOptions"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="上架" value="active" />
            <el-option label="下架" value="inactive" />
            <el-option label="缺货" value="out_of_stock" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select
            v-model="searchForm.stockStatus"
            placeholder="请选择库存状态"
            clearable
            style="width: 150px"
          >
            <el-option label="正常" value="normal" />
            <el-option label="预警" value="warning" />
            <el-option label="缺货" value="out_of_stock" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格范围" class="price-range-item">
          <div class="price-range-wrapper">
            <el-input-number
              v-model="searchForm.minPrice"
              placeholder="最低价"
              :min="0"
              :precision="2"
              style="width: 160px"
              controls-position="right"
            />
            <span class="price-separator">至</span>
            <el-input-number
              v-model="searchForm.maxPrice"
              placeholder="最高价"
              :min="0"
              :precision="2"
              style="width: 160px"
              controls-position="right"
            />
          </div>
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
    <DynamicTable
        :data="tableData"
        :columns="tableColumns"
        storage-key="product-list-columns"
        :loading="tableLoading"
        :show-selection="true"
        :show-header="true"
        :show-column-settings="true"
        :show-actions="true"
        :row-class-name="getRowClassName"
        :pagination="{
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          total: pagination.total,
          pageSizes: [10, 20, 50, 100]
        }"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        @column-settings-change="handleColumnSettingsChange"
        ref="dynamicTableRef"
      >
        <!-- 自定义表头 -->
        <template #header-actions>
          <div class="table-header">
            <div class="header-left">
              <div class="status-tabs">
                <el-button-group size="small">
                  <el-button
                    @click="handleQuickFilter('all')"
                    :type="quickFilter === 'all' ? 'primary' : ''"
                  >
                    全部
                  </el-button>
                  <el-button
                    @click="handleQuickFilter('active')"
                    :type="quickFilter === 'active' ? 'primary' : ''"
                  >
                    在售
                  </el-button>
                  <el-button
                    @click="handleQuickFilter('inactive')"
                    :type="quickFilter === 'inactive' ? 'primary' : ''"
                  >
                    下架
                  </el-button>
                  <el-button
                    @click="handleQuickFilter('out_of_stock')"
                    :type="quickFilter === 'out_of_stock' ? 'primary' : ''"
                  >
                    缺货
                  </el-button>
                  <el-button
                    @click="handleQuickFilter('deleted')"
                    :type="quickFilter === 'deleted' ? 'primary' : ''"
                  >
                    删除
                  </el-button>
                </el-button-group>
              </div>
            </div>
            <div class="header-right">
              <el-button
                @click="handleBatchRecommend"
                :disabled="!selectedRows || !selectedRows.length"
                type="success"
                size="small"
              >
                批量推荐
              </el-button>
              <el-button
                @click="handleBatchDelete"
                type="danger"
                :disabled="!selectedRows || !selectedRows.length"
                size="small"
              >
                批量删除
              </el-button>
              <el-button
                @click="handleBatchUpdateStatus"
                :disabled="!selectedRows || !selectedRows.length"
                size="small"
              >
                批量上下架
              </el-button>
              <el-button
                @click="handleBatchUpdateStock"
                :disabled="!selectedRows || !selectedRows.length"
                size="small"
              >
                批量调库存
              </el-button>
              <el-divider direction="vertical" />
              <el-button
                @click="handleRefresh"
                :icon="Refresh"
                size="small"
                title="刷新数据"
              >
              </el-button>
            </div>
          </div>
        </template>
        <!-- 商品图片列 -->
        <template #column-image="{ row }">
          <el-image
            :src="row.image"
            style="width: 60px; height: 60px; border-radius: 4px; cursor: pointer"
            fit="cover"
            @click="showImagePreview(row.image)"
          />
        </template>

        <!-- 商品编码列 -->
        <template #column-code="{ row }">
          <el-link
            @click="handleView(row)"
            type="primary"
            :underline="false"
            class="product-code-link"
          >
            {{ row.code }}
          </el-link>
        </template>

        <!-- 价格列 -->
        <template #column-price="{ row }">
          <span class="price">¥{{ row.price }}</span>
        </template>

        <!-- 库存列 -->
        <template #column-stock="{ row }">
          <span :class="getStockClass(row.stock, row.minStock)">
            {{ row.stock }}
          </span>
        </template>

        <!-- 状态列 -->
        <template #column-status="{ row }">
          <el-tag :type="getStatusColor(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>

        <!-- 操作列 -->
        <template #table-actions="{ row }">
          <div class="action-buttons">
            <el-button @click="handleView(row)" type="primary" link size="small">
              查看
            </el-button>
            <template v-if="!row.deleted">
              <el-button @click="handleEdit(row)" type="primary" link size="small">
                编辑
              </el-button>
              <el-button @click="handlePriceAdjust(row)" type="success" link size="small">
                改价
              </el-button>
              <el-button @click="handleStockAdjust(row)" type="warning" link size="small">
                调库存
              </el-button>
              <el-button
                @click="handleToggleStatus(row)"
                :type="row.status === 'active' ? 'info' : 'success'"
                link
                size="small"
              >
                {{ row.status === 'active' ? '下架' : '上架' }}
              </el-button>
              <el-dropdown @command="(command) => handleDropdownCommand(command, row)" trigger="click">
                <el-button type="primary" link size="small">
                  更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copy">复制商品</el-dropdown-item>
                    <el-dropdown-item command="delete" class="danger-item" :divided="true">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <div class="deleted-actions">
                <el-tag type="danger" size="small">已删除</el-tag>
                <el-button
                  @click="handleRestore(row)"
                  type="success"
                  link
                  size="small"
                  style="margin-left: 8px;"
                >
                  恢复
                </el-button>
                <el-button
                  @click="handlePermanentDelete(row)"
                  type="danger"
                  link
                  size="small"
                >
                  彻底删除
                </el-button>
              </div>
            </template>
          </div>
        </template>

        <!-- 自定义分页布局 -->
        <template #pagination>
          <div class="pagination-container">
            <span class="table-count">共 {{ pagination.total }} 条记录</span>
            <el-pagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </template>
      </DynamicTable>

    <!-- 库存调整对话框 -->
    <el-dialog
      v-model="stockDialogVisible"
      title="库存调整"
      width="500px"
      :before-close="handleStockDialogClose"
    >
      <el-form
        ref="stockFormRef"
        :model="stockForm"
        :rules="stockFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称">
          <span>{{ currentProduct?.name }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ currentProduct?.stock }}</span>
        </el-form-item>
        <el-form-item label="调整类型" prop="type">
          <el-radio-group v-model="stockForm.type">
            <el-radio label="increase">增加</el-radio>
            <el-radio label="decrease">减少</el-radio>
            <el-radio label="set">设置</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整数量" prop="quantity">
          <el-input-number
            v-model="stockForm.quantity"
            :min="stockForm.type === 'decrease' ? 1 : 0"
            :max="stockForm.type === 'decrease' ? currentProduct?.stock : 99999"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="调整原因" prop="reason">
          <el-select
            v-model="stockForm.reason"
            placeholder="请选择调整原因"
            style="width: 100%"
          >
            <el-option label="采购入库" value="purchase" />
            <el-option label="销售出库" value="sale" />
            <el-option label="盘点调整" value="inventory" />
            <el-option label="损耗报废" value="loss" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="stockForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleStockDialogClose">取消</el-button>
          <el-button @click="confirmStockAdjust" type="primary" :loading="stockLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 改价对话框 -->
    <el-dialog
      v-model="priceDialogVisible"
      title="商品改价"
      width="500px"
      :before-close="handlePriceDialogClose"
    >
      <el-form
        ref="priceFormRef"
        :model="priceForm"
        :rules="priceFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称">
          <span>{{ currentProduct?.name }}</span>
        </el-form-item>
        <el-form-item label="商品编码">
          <span>{{ currentProduct?.code }}</span>
        </el-form-item>
        <el-form-item label="当前价格">
          <span>¥{{ currentProduct?.price?.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="新价格" prop="newPrice">
          <el-input-number
            v-model="priceForm.newPrice"
            :min="0.01"
            :precision="2"
            style="width: 100%"
            placeholder="请输入新价格"
          />
        </el-form-item>
        <el-form-item label="价格变化">
          <span v-if="priceForm.newPrice && priceForm.originalPrice">
            <el-tag
              :type="priceForm.newPrice > priceForm.originalPrice ? 'success' : 'danger'"
              size="small"
            >
              {{ priceForm.newPrice > priceForm.originalPrice ? '+' : '' }}
              ¥{{ (priceForm.newPrice - priceForm.originalPrice).toFixed(2) }}
              ({{ ((priceForm.newPrice - priceForm.originalPrice) / priceForm.originalPrice * 100).toFixed(1) }}%)
            </el-tag>
          </span>
        </el-form-item>
        <el-form-item label="改价原因" prop="reason">
          <el-select
            v-model="priceForm.reason"
            placeholder="请选择改价原因"
            style="width: 100%"
          >
            <el-option label="成本变化" value="cost_change" />
            <el-option label="市场调价" value="market_adjust" />
            <el-option label="促销活动" value="promotion" />
            <el-option label="竞争调价" value="competition" />
            <el-option label="季节调整" value="seasonal" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="priceForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePriceDialogClose">取消</el-button>
          <el-button @click="confirmPriceAdjust" type="primary" :loading="stockLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分类管理对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      title="分类管理"
      width="800px"
      :before-close="handleCategoryDialogClose"
    >
      <div class="category-management">
        <div class="category-actions">
          <el-button @click="handleAddCategory" type="primary" :icon="Plus">
            添加分类
          </el-button>
        </div>

        <el-table :data="categoryList" style="width: 100%">
          <el-table-column prop="name" label="分类名称" />
          <el-table-column prop="code" label="分类编码" />
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column prop="productCount" label="商品数量" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button @click="handleEditCategory(row)" type="primary" link size="small">
                编辑
              </el-button>
              <el-button @click="handleDeleteCategory(row)" type="danger" link size="small">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 分类编辑对话框 -->
    <el-dialog
      v-model="categoryFormDialogVisible"
      :title="categoryFormMode === 'add' ? '添加分类' : '编辑分类'"
      width="500px"
      :before-close="handleCategoryFormDialogClose"
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryForm"
        :rules="categoryFormRules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="categoryForm.name"
            placeholder="请输入分类名称"
          />
        </el-form-item>
        <el-form-item label="分类编码" prop="code">
          <el-input
            v-model="categoryForm.code"
            placeholder="请输入分类编码"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="categoryForm.sort"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="categoryForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCategoryFormDialogClose">取消</el-button>
          <el-button @click="confirmCategoryForm" type="primary" :loading="categoryFormLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 图片查看器 -->
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="currentImageList"
      :initial-index="currentImageIndex"
      @close="closeImageViewer"
    />

    <!-- 批量导入对话框 - 复用库存管理的功能 -->
    <el-dialog
      v-model="batchImportDialogVisible"
      title="批量导入商品"
      width="80%"
      top="5vh"
      :before-close="handleBatchImportDialogClose"
    >
      <el-tabs v-model="importActiveTab">
        <el-tab-pane label="在线快速添加" name="quick">
          <div class="quick-add-section">
            <el-button type="primary" @click="addQuickProduct" :icon="Plus" size="small" style="margin-bottom: 16px">
              新增一行
            </el-button>

            <el-table :data="quickAddProducts" border style="width: 100%">
              <el-table-column type="index" label="序号" width="60" />
              <el-table-column label="商品图片" width="100">
                <template #default="{ row, $index }">
                  <el-upload
                    class="avatar-uploader"
                    :show-file-list="false"
                    :before-upload="(file) => handleImageUpload(file, $index)"
                    accept="image/*"
                  >
                    <img v-if="row.image" :src="row.image" class="avatar" />
                    <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </template>
              </el-table-column>
              <el-table-column label="商品名称" min-width="180">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="请输入" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="商品编码" min-width="140">
                <template #default="{ row }">
                  <el-input v-model="row.code" placeholder="自动生成" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="分类" min-width="140">
                <template #default="{ row }">
                  <el-select v-model="row.categoryId" placeholder="请选择" size="small" style="width: 100%">
                    <el-option
                      v-for="cat in categoryOptions"
                      :key="cat.id"
                      :label="cat.name"
                      :value="cat.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="单位" min-width="120">
                <template #default="{ row }">
                  <el-select v-model="row.unit" placeholder="请选择" size="small" allow-create filterable style="width: 100%">
                    <el-option label="件" value="件" />
                    <el-option label="盒" value="盒" />
                    <el-option label="瓶" value="瓶" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="销售价" min-width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="成本价" min-width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.costPrice" :min="0" :precision="2" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="库存" min-width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.stock" :min="0" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="状态" min-width="110">
                <template #default="{ row }">
                  <el-select v-model="row.status" size="small" style="width: 100%">
                    <el-option label="上架" value="active" />
                    <el-option label="下架" value="inactive" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button type="danger" link size="small" @click="removeQuickProduct($index)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="表格导入" name="excel">
          <div class="excel-import-section">
            <el-alert title="导入说明" type="info" :closable="false" style="margin-bottom: 16px">
              <p>1. 请先下载模板文件，按照模板格式填写商品信息</p>
              <p>2. 支持.xlsx格式的Excel文件</p>
              <p>3. 必填字段：商品名称、销售价、库存</p>
            </el-alert>

            <div class="import-actions">
              <el-button type="success" @click="downloadTemplate" :icon="Download">下载模板</el-button>
              <el-upload :auto-upload="false" :on-change="handleFileChange" :show-file-list="false" accept=".xlsx">
                <el-button type="primary" :icon="Upload">选择文件</el-button>
              </el-upload>
            </div>

            <div v-if="excelFileName" class="file-info">
              <el-tag type="success">{{ excelFileName }}</el-tag>
              <el-button type="text" @click="clearExcelFile">清除</el-button>
            </div>

            <div v-if="excelPreviewData.length > 0" class="preview-section">
              <h4>数据预览（前10条）</h4>
              <el-table :data="excelPreviewData.slice(0, 10)" border style="width: 100%">
                <el-table-column prop="name" label="商品名称" />
                <el-table-column prop="code" label="商品编码" />
                <el-table-column prop="unit" label="单位" />
                <el-table-column prop="price" label="销售价" />
                <el-table-column prop="stock" label="库存" />
              </el-table>
              <p style="margin-top: 8px; color: #909399;">共 {{ excelPreviewData.length }} 条数据</p>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleBatchImportDialogClose">取消</el-button>
          <el-button type="primary" @click="handleBatchImportSubmit" :loading="batchImportLoading">确定导入</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Setting,
  Upload,
  Download,
  ArrowDown,
  Box,
  Warning,
  CircleClose
} from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { useNotificationStore } from '@/stores/notification'
import { useProductStore } from '@/stores/product'
import DynamicTable from '@/components/DynamicTable.vue'
import { createSafeNavigator } from '@/utils/navigation'

// 接口定义
interface Product {
  id: number
  name: string
  code: string
  categoryId: number
  categoryName: string
  price: number
  costPrice: number
  stock: number
  minStock: number
  status: number
  image: string
  description: string
  createTime: string
  updateTime: string
}

interface SortChangeParams {
  column: { property: string; label: string; [key: string]: unknown }
  prop: string
  order: string | null
}

interface CategoryForm {
  id: number | null
  name: string
  parentId: number
  sort: number
  status: number
}

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// 配置store
const configStore = useConfigStore()

// 消息提醒store
const notificationStore = useNotificationStore()

// 商品store
const productStore = useProductStore()

// 响应式数据
const tableLoading = ref(false)
const stockLoading = ref(false)
const categoryFormLoading = ref(false)

// 批量导入相关
const batchImportDialogVisible = ref(false)
const batchImportLoading = ref(false)
const importActiveTab = ref('quick')
const quickAddProducts = ref<any[]>([])
const excelFileName = ref('')
const excelPreviewData = ref<any[]>([])

// 组件引用
const dynamicTableRef = ref()

// 对话框可见性
const stockDialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const priceDialogVisible = ref(false)
const categoryFormDialogVisible = ref(false)
const categoryFormMode = ref('add')

// 搜索表单
const searchForm = reactive({
  name: '',
  code: '',
  categoryId: '',
  status: '',
  stockStatus: '',
  minPrice: null,
  maxPrice: null
})

// 快速筛选
const quickFilter = ref('all')

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])

// 当前商品
const currentProduct = ref(null)

// 图片预览
const showImageViewer = ref(false)
const currentImageList = ref([])
const currentImageIndex = ref(0)

// 库存调整表单
const stockForm = reactive({
  type: 'increase',
  quantity: 0,
  reason: '',
  remark: ''
})

// 改价表单
const priceForm = reactive({
  originalPrice: 0,
  newPrice: 0,
  reason: '',
  remark: ''
})

// 分类数据 - 从 productStore 获取统一数据
const categoryOptions = computed(() => {
  return (productStore.categories || []).map(cat => ({
    id: cat.id,
    name: cat.name
  }))
})
const categoryList = ref([])

// 分类表单
const categoryForm = reactive({
  name: '',
  code: '',
  sort: 0,
  status: 'active',
  description: ''
})

// 表单验证规则
const stockFormRules = {
  type: [
    { required: true, message: '请选择调整类型', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入调整数量', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择调整原因', trigger: 'change' }
  ]
}

const priceFormRules = {
  newPrice: [
    { required: true, message: '请输入新价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择改价原因', trigger: 'change' }
  ]
}

const categoryFormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入分类编码', trigger: 'blur' }
  ],
  sort: [
    { required: true, message: '请输入排序', trigger: 'blur' }
  ]
}

// 表单引用
const stockFormRef = ref()
const priceFormRef = ref()
const categoryFormRef = ref()

// 计算属性
/**
 * 总商品数
 */
const totalProducts = computed(() => {
  return productStore.stats.totalProducts
})

/**
 * 库存预警数量
 */
const lowStockCount = computed(() => {
  return productStore.stats.lowStockCount
})

/**
 * 缺货商品数量
 */
const outOfStockCount = computed(() => {
  return productStore.stats.outOfStockCount
})

/**
 * 表格列配置
 */
const tableColumns = computed(() => [
  {
    prop: 'image',
    label: '商品图片',
    width: 100,
    visible: true,
    sortable: false,
    showOverflowTooltip: false
  },
  {
    prop: 'code',
    label: '商品编码',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'name',
    label: '商品名称',
    minWidth: 200,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'categoryName',
    label: '分类',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'specification',
    label: '规格',
    width: 120,
    visible: true,
    sortable: false,
    showOverflowTooltip: true
  },
  {
    prop: 'price',
    label: '价格',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: false
  },
  {
    prop: 'stock',
    label: '库存',
    width: 100,
    visible: true,
    sortable: true,
    showOverflowTooltip: false
  },
  {
    prop: 'salesCount',
    label: '销量',
    width: 100,
    visible: true,
    sortable: true,
    showOverflowTooltip: false
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    visible: true,
    sortable: false,
    showOverflowTooltip: false
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 180,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'updateTime',
    label: '更新时间',
    width: 180,
    visible: false, // 默认隐藏，用户可通过列设置显示
    sortable: true,
    showOverflowTooltip: true
  }
])

// 方法定义
/**
 * 获取库存样式类
 */
const getStockClass = (stock: number, minStock: number) => {
  const threshold = configStore.productConfig.lowStockThreshold
  if (stock === 0) return 'stock-out'
  if (stock <= threshold) return 'stock-warning'
  return 'stock-normal'
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    active: 'success',
    inactive: 'info',
    out_of_stock: 'danger'
  }
  return colorMap[status] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    active: '上架',
    inactive: '下架',
    out_of_stock: '缺货'
  }
  return textMap[status] || status
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    name: '',
    code: '',
    categoryId: '',
    status: '',
    stockStatus: '',
    minPrice: null,
    maxPrice: null
  })
  handleSearch()
}

/**
 * 选择变化
 */
const handleSelectionChange = (selection: Product[]) => {
  selectedRows.value = selection
}

/**
 * 排序变化
 */
const handleSortChange = ({ column, prop, order }: SortChangeParams) => {
  console.log('排序变化:', { column, prop, order })
  // 处理排序逻辑
  if (order) {
    searchParams.sortField = prop
    searchParams.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  } else {
    searchParams.sortField = ''
    searchParams.sortOrder = ''
  }
  loadData()
}

/**
 * 页面大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadData()
}

/**
 * 显示图片预览
 */
const showImagePreview = (imageUrl: string) => {
  currentImageList.value = [imageUrl]
  currentImageIndex.value = 0
  showImageViewer.value = true
}

/**
 * 关闭图片预览
 */
const closeImageViewer = () => {
  showImageViewer.value = false
  currentImageList.value = []
  currentImageIndex.value = 0
}

/**
 * 获取行样式类名
 */
const getRowClassName = ({ row }: { row: Product }) => {
  return row.deleted ? 'deleted-row' : ''
}

/**
 * 添加商品
 */
const handleAdd = () => {
  safeNavigator.push('/product/add')
}

/**
 * 查看商品
 */
const handleView = (row: Product) => {
  safeNavigator.push(`/product/detail/${row.id}`)
}

/**
 * 编辑商品
 */
const handleEdit = (row: Product) => {
  safeNavigator.push(`/product/edit/${row.id}`)
}

/**
 * 库存调整
 */
const handleStockAdjust = (row: Product) => {
  currentProduct.value = row

  // 重置表单
  Object.assign(stockForm, {
    type: 'increase',
    quantity: 0,
    reason: '',
    remark: ''
  })

  stockDialogVisible.value = true
}

/**
 * 改价
 */
const handlePriceAdjust = (row: Product) => {
  currentProduct.value = row

  // 重置表单
  Object.assign(priceForm, {
    originalPrice: row.price,
    newPrice: row.price,
    reason: '',
    remark: ''
  })

  priceDialogVisible.value = true
}

/**
 * 下拉菜单命令处理
 */
const handleDropdownCommand = (command: string, row: Product) => {
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
 * 复制商品
 */
const handleCopy = (row: Product) => {
  safeNavigator.push(`/product/add?copy=${row.id}`)
}

/**
 * 列设置
 */
const handleColumnSettings = () => {
  // 这里可以打开列设置对话框或者触发DynamicTable的列设置功能
  // 由于我们已经禁用了DynamicTable的内置列设置，这里可以实现自定义的列设置逻辑
  ElMessage.info('列设置功能开发中...')
}

/**
 * 切换状态
 */
const handleToggleStatus = async (row: Product) => {
  const action = row.status === 'active' ? '下架' : '上架'

  try {
    await ElMessageBox.confirm(
      `确定要${action}商品"${row.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    row.status = row.status === 'active' ? 'inactive' : 'active'
    ElMessage.success(`${action}成功`)

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_STATUS_CHANGED',
      title: `商品${action}`,
      content: `商品"${row.name}"已${action}`,
      data: {
        productId: row.id,
        productName: row.name,
        productCode: row.code,
        status: row.status,
        action: action,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${row.id}`
    })
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 删除商品
 */
const handleDelete = async (row: Product) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品"${row.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用store删除商品
    const success = productStore.deleteProduct(row.id)

    if (success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
      return
    }

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_DELETED',
      title: '商品删除',
      content: `商品"${row.name}"已删除`,
      data: {
        productId: row.id,
        productName: row.name,
        productCode: row.code,
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (!selectedRows.value || selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要删除的商品')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 个商品吗？删除后不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 批量删除商品
    selectedRows.value.forEach(product => {
      productStore.deleteProduct(product.id)
    })

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('批量删除成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_BATCH_DELETED',
      title: '批量删除商品',
      content: `已批量删除 ${selectedRows.value.length} 个商品`,
      data: {
        count: selectedRows.value.length,
        productNames: selectedRows.value.map(item => item.name),
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 恢复商品
 */
const handleRestore = async (row: Product) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复商品"${row.name}"吗？`,
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 调用store恢复商品
    const success = productStore.restoreProduct(row.id)

    if (success) {
      ElMessage.success('恢复成功')
    } else {
      ElMessage.error('恢复失败')
      return
    }

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_RESTORED',
      title: '商品恢复',
      content: `商品"${row.name}"已恢复`,
      data: {
        productId: row.id,
        productName: row.name,
        productCode: row.code,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${row.id}`
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 彻底删除商品
 */
const handlePermanentDelete = async (row: Product) => {
  try {
    await ElMessageBox.confirm(
      `确定要彻底删除商品"${row.name}"吗？彻底删除后将无法恢复，且不会在任何列表中显示！`,
      '确认彻底删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: true,
        message: `<div style="color: #f56c6c; font-weight: bold;">⚠️ 警告：此操作不可逆！</div><br/>确定要彻底删除商品"${row.name}"吗？<br/><br/>彻底删除后：<br/>• 商品将从所有列表中移除<br/>• 无法通过任何方式恢复<br/>• 相关数据将被永久清除`
      }
    )

    // 调用store彻底删除商品
    const success = productStore.permanentDeleteProduct(row.id)

    if (success) {
      ElMessage.success('彻底删除成功')
    } else {
      ElMessage.error('彻底删除失败')
      return
    }

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_PERMANENT_DELETED',
      title: '商品彻底删除',
      content: `商品"${row.name}"已彻底删除`,
      data: {
        productId: row.id,
        productName: row.name,
        productCode: row.code,
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 批量更新状态
 */
const handleBatchUpdateStatus = async () => {
  if (!selectedRows.value || selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要更新状态的商品')
    return
  }

  try {
    const { value: status } = await ElMessageBox({
      title: '批量状态更新',
      message: h('div', [
        h('p', { style: 'margin-bottom: 10px;' }, `确定要批量更新选中的 ${selectedRows.value.length} 个商品的状态吗？`),
        h('div', { style: 'margin-bottom: 10px;' }, [
          h('label', { style: 'display: block; margin-bottom: 5px;' }, '请选择状态：'),
          h('select', {
            id: 'status-select',
            style: 'width: 100%; padding: 8px; border: 1px solid #dcdfe6; border-radius: 4px;',
            onChange: (e: Event) => {
              const target = e.target as HTMLSelectElement
              ;(ElMessageBox as unknown).inputValue = target.value
            }
          }, [
            h('option', { value: 'active' }, '上架'),
            h('option', { value: 'inactive' }, '下架')
          ])
        ])
      ]),
      showInput: true,
      inputValue: 'active',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      beforeClose: (action: string, instance: unknown, done: Function) => {
        if (action === 'confirm') {
          const selectElement = document.getElementById('status-select') as HTMLSelectElement
          if (selectElement) {
            instance.inputValue = selectElement.value
          }
        }
        done()
      }
    })

    // 批量更新商品状态
    selectedRows.value.forEach(product => {
      productStore.updateProduct(product.id, { status: status as 'active' | 'inactive' })
    })

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('批量状态更新成功')

    // 发送消息提醒
    const statusText = status === 'active' ? '上架' : '下架'
    notificationStore.addNotification({
      type: 'PRODUCT_BATCH_STATUS_CHANGED',
      title: '批量状态更新',
      content: `已批量${statusText} ${selectedRows.value.length} 个商品`,
      data: {
        count: selectedRows.value.length,
        status: status,
        statusText: statusText,
        productNames: selectedRows.value.map(item => item.name),
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 批量调库存
 */
const handleBatchUpdateStock = () => {
  ElMessage.info('批量库存调整功能开发中...')
}

/**
 * 分类管理
 */
const handleCategoryManage = () => {
  loadCategoryList()
  categoryDialogVisible.value = true
}

/**
 * 批量导入 - 打开批量导入对话框
 */
const handleBatchImport = () => {
  batchImportDialogVisible.value = true
  importActiveTab.value = 'quick'

  // 初始化一行数据
  if (quickAddProducts.value.length === 0) {
    addQuickProduct()
  }
}

// 添加快速添加商品行
const addQuickProduct = () => {
  quickAddProducts.value.push({
    name: '',
    code: `P${Date.now()}`,
    categoryId: '',
    image: '',
    unit: '件',
    price: 0,
    costPrice: 0,
    stock: 0,
    status: 'active'
  })
}

// 处理图片上传 - 上传到服务器
const handleImageUpload = async (file: File, index: number) => {
  try {
    const { uploadImage } = await import('@/services/uploadService')
    const result = await uploadImage(file, 'product')

    if (result.success && result.url) {
      quickAddProducts.value[index].image = result.url
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(result.message || '图片上传失败')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败，请重试')
  }
  return false // 阻止自动上传
}

// 删除快速添加商品行
const removeQuickProduct = (index: number) => {
  quickAddProducts.value.splice(index, 1)
}

// 下载模板
const downloadTemplate = () => {
  const headers = ['商品名称*', '商品编码', '分类', '单位', '销售价*', '成本价', '库存*', '状态']
  const sampleData = [
    ['示例商品1', 'P001', '体重管理', '件', '100', '70', '50', '上架'],
    ['示例商品2', 'P002', '体重管理', '盒', '200', '140', '30', '上架']
  ]

  // 使用xlsx库创建真正的Excel文件
  import('xlsx').then(XLSX => {
    const wb = XLSX.utils.book_new()
    const wsData = [headers, ...sampleData]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 商品名称
      { wch: 15 }, // 商品编码
      { wch: 15 }, // 分类
      { wch: 10 }, // 单位
      { wch: 12 }, // 销售价
      { wch: 12 }, // 成本价
      { wch: 10 }, // 库存
      { wch: 10 }  // 状态
    ]

    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板')
    XLSX.writeFile(wb, '商品导入模板.xlsx')

    ElMessage.success('模板下载成功')
  }).catch(() => {
    ElMessage.error('下载失败，请重试')
  })
}

// 处理文件选择
const handleFileChange = (file: any) => {
  excelFileName.value = file.name

  // 使用xlsx库读取Excel文件
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      import('xlsx').then(XLSX => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]

        const parsedData = []
        // 跳过表头，从第二行开始
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          parsedData.push({
            name: String(row[0] || '').trim(),
            code: String(row[1] || '').trim() || `P${Date.now() + i}`,
            categoryName: String(row[2] || '').trim(),
            unit: String(row[3] || '').trim() || '件',
            price: parseFloat(row[4]) || 0,
            costPrice: parseFloat(row[5]) || 0,
            stock: parseInt(row[6]) || 0,
            status: String(row[7] || '').trim() === '上架' ? '上架' : '下架'
          })
        }

        excelPreviewData.value = parsedData
        ElMessage.success(`文件解析成功，共${parsedData.length}条数据`)
      }).catch(error => {
        console.error('文件解析失败:', error)
        ElMessage.error('文件格式错误，请使用xlsx格式')
      })
    } catch (error) {
      console.error('文件读取失败:', error)
      ElMessage.error('文件读取失败')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

// 清除Excel文件
const clearExcelFile = () => {
  excelFileName.value = ''
  excelPreviewData.value = []
}

// 关闭批量导入对话框
const handleBatchImportDialogClose = () => {
  batchImportDialogVisible.value = false
  quickAddProducts.value = []
  excelFileName.value = ''
  excelPreviewData.value = []
}

// 提交批量导入
const handleBatchImportSubmit = async () => {
  try {
    batchImportLoading.value = true

    let productsToAdd: unknown[] = []

    if (importActiveTab.value === 'quick') {
      productsToAdd = quickAddProducts.value.filter(p => p.name && p.price > 0)

      if (productsToAdd.length === 0) {
        ElMessage.warning('请至少填写一个商品的名称和价格')
        batchImportLoading.value = false
        return
      }
    } else {
      if (excelPreviewData.value.length === 0) {
        ElMessage.warning('请先选择并解析Excel文件')
        batchImportLoading.value = false
        return
      }
      productsToAdd = excelPreviewData.value
    }

    // 添加到productStore
    for (const product of productsToAdd) {
      const categoryId = product.categoryId || categoryOptions.value[0]?.id || '1'
      const newProduct = {
        code: product.code || `P${Date.now()}`,
        name: product.name,
        categoryId: categoryId,
        categoryName: categoryOptions.value.find((c: unknown) => c.id === categoryId)?.name || '未分类',
        brand: '',
        specification: '',
        image: 'https://via.placeholder.com/100',
        price: product.price,
        costPrice: product.costPrice || product.price * 0.7,
        stock: product.stock || 0,
        minStock: 10,
        maxStock: 9999,
        unit: product.unit || '件',
        weight: 0,
        dimensions: '',
        description: '',
        status: product.status === 'active' || product.status === '上架' ? 'active' : 'inactive',
        salesCount: 0,
        updateTime: new Date().toISOString()
      }

      await productStore.addProduct(newProduct)
    }

    ElMessage.success(`成功导入${productsToAdd}个商品`)

    handleBatchImportDialogClose()
    loadData()
  } catch (error) {
    ElMessage.error('批量导入失败')
  } finally {
    batchImportLoading.value = false
  }
}

/**
 * 导出数据
 */
const handleExport = async () => {
  try {
    // 获取当前显示的商品数据
    const exportData = tableData.value

    if (exportData.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    // 构建CSV数据
    const headers = ['商品编码', '商品名称', '分类', '规格', '单位', '销售价', '成本价', '库存', '销量', '状态', '创建时间']
    const data = exportData.map((item: unknown) => [
      item.code,
      item.name,
      item.categoryName,
      item.specification || '',
      item.unit || '件',
      item.price.toFixed(2),
      (item.costPrice || item.price * 0.7).toFixed(2),
      item.stock,
      item.salesCount || 0,
      item.status === 'active' ? '上架' : '下架',
      item.createTime
    ])

    // 创建CSV内容
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n')

    // 添加BOM以支持中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `商品数据_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success(`导出成功，共导出${exportData.length}条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 快速筛选
 */
const handleQuickFilter = (filter: string) => {
  quickFilter.value = filter

  // 重置搜索表单的状态和库存状态
  searchForm.status = ''
  searchForm.stockStatus = ''

  // 重置删除状态筛选
  searchForm.showDeleted = false
  searchForm.onlyDeleted = false

  switch (filter) {
    case 'all':
      // 显示所有商品（包括已删除的）
      searchForm.showDeleted = true
      break
    case 'active':
      searchForm.status = 'active'
      break
    case 'inactive':
      searchForm.status = 'inactive'
      break
    case 'deleted':
      // 只显示已删除的商品
      searchForm.onlyDeleted = true
      break
    case 'low_stock':
      searchForm.stockStatus = 'warning'
      break
    case 'out_of_stock':
      searchForm.stockStatus = 'out_of_stock'
      break
  }

  // 重置到第一页并搜索
  pagination.currentPage = 1
  loadData()
}

/**
 * 刷新数据
 */
const handleRefresh = () => {
  loadData()
  ElMessage.success('数据已刷新')
}

/**
 * 批量推荐
 */
const handleBatchRecommend = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${selectedRows.value.length} 个商品设为推荐商品吗？`,
      '确认批量推荐',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('批量推荐设置成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_BATCH_RECOMMENDED',
      title: '批量推荐设置',
      content: `已将 ${selectedRows.value.length} 个商品设为推荐商品`,
      data: {
        count: selectedRows.value.length,
        productNames: selectedRows.value.map(item => item.name),
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    loadData()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 确认库存调整
 */
const confirmStockAdjust = async () => {
  try {
    await stockFormRef.value?.validate()

    stockLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新商品库存
    const product = currentProduct.value
    const currentStock = product.stock
    const adjustQuantity = stockForm.quantity
    let newStock = currentStock

    if (stockForm.type === 'increase') {
      newStock = currentStock + adjustQuantity
    } else if (stockForm.type === 'decrease') {
      newStock = currentStock - adjustQuantity
    } else if (stockForm.type === 'set') {
      newStock = adjustQuantity
    }

    // 确保库存不为负数
    const finalStock = Math.max(0, newStock)

    // 更新store中的商品库存
    productStore.updateProduct(product.id, { stock: finalStock })

    ElMessage.success('库存调整成功')

    // 发送消息提醒
    const adjustType = stockForm.type === 'increase' ? '增加' : stockForm.type === 'decrease' ? '减少' : '设置'
    notificationStore.addNotification({
      type: 'PRODUCT_STOCK_ADJUSTED',
      title: '库存调整',
      content: `商品"${currentProduct.value.name}"库存已${adjustType} ${stockForm.quantity} 件`,
      data: {
        productId: currentProduct.value.id,
        productName: currentProduct.value.name,
        productCode: currentProduct.value.code,
        adjustType: adjustType,
        quantity: stockForm.quantity,
        reason: stockForm.reason,
        remark: stockForm.remark,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${currentProduct.value.id}`
    })

    // 1秒后自动关闭对话框并刷新数据
    setTimeout(() => {
      stockLoading.value = false
      handleStockDialogClose()
      loadData()
    }, 1000)
  } catch (error) {
    console.error('表单验证失败:', error)
    stockLoading.value = false
  }
}

/**
 * 关闭库存调整对话框
 */
const handleStockDialogClose = () => {
  stockDialogVisible.value = false
  stockFormRef.value?.clearValidate()
  currentProduct.value = null
}

/**
 * 确认改价
 */
const confirmPriceAdjust = async () => {
  try {
    await priceFormRef.value?.validate()

    stockLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新商品价格
    const product = currentProduct.value
    const oldPrice = product.price
    const newPrice = priceForm.newPrice

    // 更新store中的商品价格
    productStore.updateProduct(product.id, { price: newPrice })

    ElMessage.success('改价成功')

    // 发送消息提醒
    const priceChange = newPrice - oldPrice
    const changeType = priceChange > 0 ? '上调' : '下调'
    notificationStore.addNotification({
      type: 'PRODUCT_PRICE_CHANGED',
      title: '商品改价',
      content: `商品"${product.name}"价格已${changeType}，从¥${oldPrice.toFixed(2)}调整为¥${newPrice.toFixed(2)}`,
      data: {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        oldPrice: oldPrice,
        newPrice: newPrice,
        priceChange: priceChange,
        changeType: changeType,
        reason: priceForm.reason,
        remark: priceForm.remark,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${product.id}`
    })

    // 1秒后自动关闭对话框并刷新数据
    setTimeout(() => {
      stockLoading.value = false
      handlePriceDialogClose()
      loadData()
    }, 1000)
  } catch (error) {
    console.error('表单验证失败:', error)
    stockLoading.value = false
  }
}

/**
 * 关闭改价对话框
 */
const handlePriceDialogClose = () => {
  priceDialogVisible.value = false
  priceFormRef.value?.clearValidate()
  currentProduct.value = null
}

/**
 * 添加分类
 */
const handleAddCategory = () => {
  categoryFormMode.value = 'add'

  // 重置表单
  Object.assign(categoryForm, {
    name: '',
    code: '',
    sort: 0,
    status: 'active',
    description: ''
  })

  categoryFormDialogVisible.value = true
}

/**
 * 编辑分类
 */
const handleEditCategory = (row: CategoryForm) => {
  categoryFormMode.value = 'edit'

  // 填充表单
  Object.assign(categoryForm, {
    id: row.id,
    name: row.name,
    code: row.code,
    sort: row.sort,
    status: row.status,
    description: row.description
  })

  categoryFormDialogVisible.value = true
}

/**
 * 删除分类
 */
const handleDeleteCategory = async (row: CategoryForm) => {
  if (row.productCount > 0) {
    ElMessage.warning('该分类下还有商品，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${row.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API删除分类
    await productStore.deleteCategory(row.id)

    ElMessage.success('删除成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_CATEGORY_DELETED',
      title: '分类删除',
      content: `商品分类"${row.name}"已删除`,
      data: {
        categoryId: row.id,
        categoryName: row.name,
        categoryCode: row.code,
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    await loadCategoryList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

/**
 * 确认分类表单
 */
const confirmCategoryForm = async () => {
  try {
    await categoryFormRef.value?.validate()

    categoryFormLoading.value = true

    const isAdd = categoryFormMode.value === 'add'

    if (isAdd) {
      // 添加分类
      await productStore.addCategory({
        name: categoryForm.name,
        code: categoryForm.code,
        level: 1,
        parentId: '0',
        sort: categoryForm.sort,
        status: categoryForm.status === 'active' ? 1 : 0,
        description: categoryForm.description,
        productCount: 0
      })
    } else {
      // 更新分类
      await productStore.updateCategory(categoryForm.id, {
        name: categoryForm.name,
        code: categoryForm.code,
        sort: categoryForm.sort,
        status: categoryForm.status === 'active' ? 1 : 0,
        description: categoryForm.description
      })
    }

    ElMessage.success(isAdd ? '添加成功' : '更新成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: isAdd ? 'PRODUCT_CATEGORY_CREATED' : 'PRODUCT_CATEGORY_UPDATED',
      title: isAdd ? '分类添加' : '分类更新',
      content: `商品分类"${categoryForm.name}"已${isAdd ? '添加' : '更新'}`,
      data: {
        categoryId: categoryForm.id,
        categoryName: categoryForm.name,
        categoryCode: categoryForm.code,
        action: isAdd ? '添加' : '更新',
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    handleCategoryFormDialogClose()
    await loadCategoryList()
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    categoryFormLoading.value = false
  }
}

/**
 * 关闭分类对话框
 */
const handleCategoryDialogClose = () => {
  categoryDialogVisible.value = false
}

/**
 * 关闭分类表单对话框
 */
const handleCategoryFormDialogClose = () => {
  categoryFormDialogVisible.value = false
  categoryFormRef.value?.clearValidate()
}

/**
 * 加载数据
 */
const loadData = async () => {
  tableLoading.value = true

  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 设置store的搜索条件
    productStore.setSearchForm(searchForm)

    // 从store获取过滤后的商品数据
    const filteredProducts = productStore.getFilteredProducts || []

    // 计算分页
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    const paginatedData = filteredProducts.slice(startIndex, endIndex)

    tableData.value = paginatedData
    pagination.total = filteredProducts.length
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}



/**
 * 加载分类列表
 */
const loadCategoryList = async () => {
  try {
    // 确保分类数据已加载
    await productStore.loadCategories()

    // 从store获取分类数据并计算商品数量
    categoryList.value = (productStore.categories || []).map(cat => {
      const productCount = (productStore.products || []).filter(p => p.categoryId === cat.id).length
      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        sort: cat.sort || 1,
        productCount,
        status: cat.status === 1 ? 'active' : 'inactive',
        description: cat.description || cat.name
      }
    })
  } catch (error) {
    console.error('加载分类列表失败:', error)
    ElMessage.error('加载分类列表失败')
  }
}



/**
 * 处理列设置变化
 */
const handleColumnSettingsChange = (columns) => {
  console.log('列设置变化:', columns)
  // 列设置变化会自动保存到localStorage，这里可以添加额外的处理逻辑
}

// 监听路由变化，当返回到商品列表页面时刷新数据
watch(() => route.path, (newPath, oldPath) => {
  if (newPath === '/product/list' && oldPath && oldPath !== '/product/list') {
    // 从其他页面返回到商品列表页面时刷新数据
    console.log('路由变化，刷新商品列表数据', { newPath, oldPath })
    loadData()
  }
}, { immediate: false })

// 监听路由查询参数变化，用于处理新建商品后的刷新
watch(() => route.query, (newQuery, oldQuery) => {
  if (route.path === '/product/list' && newQuery.refresh === 'true') {
    console.log('检测到刷新参数，重新加载数据')
    loadData()
    // 清除刷新参数
    safeNavigator.replace({ path: '/product/list' })
  }
}, { immediate: false })

// 生命周期钩子
onMounted(async () => {
  // 【修复】始终从API获取最新商品数据，确保数据一致性
  try {
    await productStore.loadProducts()
    await productStore.loadCategories()
  } catch (error) {
    console.error('从API加载商品数据失败:', error)
    // 如果API失败，回退到本地数据
    if (!productStore.products || productStore.products.length === 0) {
      productStore.initData()
    }
  }
  loadData()
})
</script>

<style scoped>
.product-list {
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

.warning-icon {
  background: linear-gradient(135deg, #e6a23c, #f0c78a);
}

.danger-icon {
  background: linear-gradient(135deg, #f56c6c, #f89898);
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

.warning-number {
  color: #e6a23c;
}

.danger-number {
  color: #f56c6c;
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

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 20px;
}

.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.quick-filters {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-tabs {
  display: flex;
  align-items: center;
}

.status-tabs .el-button-group {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-tabs .el-button {
  border: none;
  background: #f5f7fa;
  color: #606266;
  font-weight: 500;
  padding: 14px 18px;
  transition: all 0.3s ease;
  position: relative;
}

.status-tabs .el-button:hover {
  background: #ecf5ff;
  color: #409eff;
  transform: translateY(-1px);
}

.status-tabs .el-button.el-button--primary {
  background: #409eff;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.status-tabs .el-button.el-button--primary:hover {
  background: #66b1ff;
  transform: translateY(-1px);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.header-right .el-button {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.header-right .el-button:hover {
  transform: translateY(-1px);
}

.header-right .el-divider {
  margin: 0 8px;
  height: 20px;
}

.deleted-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.deleted-actions .el-button {
  font-size: 12px;
  padding: 2px 6px;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-count {
  color: #909399;
  font-size: 14px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.price {
  color: #f56c6c;
  font-weight: 500;
}

.stock-normal {
  color: #67c23a;
}

.stock-warning {
  color: #e6a23c;
}

.stock-out {
  color: #f56c6c;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 0 20px;
  gap: 20px;
}

.table-count {
  color: #606266;
  font-size: 14px;
  flex-shrink: 0;
}

.category-management {
  padding: 0;
}

.category-actions {
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.danger-item {
  color: #f56c6c;
}

.product-code-link {
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.product-code-link:hover {
  color: #409eff;
  text-decoration: underline;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
  font-size: 12px;
}

/* 商品编码链接样式 */
.product-code-link {
  font-weight: 500;
  color: #409eff;
  cursor: pointer;
}

.product-code-link:hover {
  color: #66b1ff;
}

.price-range-item {
  margin-right: 16px;
}

.price-range-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-separator {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .header-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    width: 120px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
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

/* 表格头部样式 - 调整间距保持一致 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px; /* 恢复正常的左右padding */
  margin: 0 !important;
}

.header-left {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 0;
  width: auto;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px; /* 统一所有按钮间距为8px */
  margin-left: auto;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.status-tabs {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 0;
  margin-left: 0;
}

/* 恢复批量操作按钮的完整边框样式 */
.header-right .el-button {
  /* 移除所有边框限制，恢复默认样式 */
}

/* 表格底部样式 */
.table-footer {
  padding: 12px 20px;
  border-top: none;
  background-color: #fafafa;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* 覆盖DynamicTable的分页样式，移除上边框 */
.table-pagination {
  border-top: none !important;
}

/* 强制移除所有可能的底部边框 */
:deep(.dynamic-table .table-header) {
  border-bottom: none !important;
}

:deep(.table-header) {
  border-bottom: none !important;
}

.status-tabs .el-button-group {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: none;
  margin: 0;
  padding: 0;
}

.status-tabs .el-button {
  border-radius: 0;
  border-right: 1px solid #dcdfe6;
  font-size: 13px;
  padding: 6px 16px;
  transition: all 0.2s ease;
  border-bottom: none !important;
  box-shadow: none !important;
  text-decoration: none !important;
}

.status-tabs .el-button:last-child {
  border-right: none;
}

.status-tabs .el-button:hover {
  background-color: #ecf5ff;
  color: #409eff;
  border-bottom: none !important;
  text-decoration: none !important;
}

.status-tabs .el-button--primary {
  background-color: #409eff;
  border-color: #409eff;
  color: #fff;
  border-bottom: none !important;
  text-decoration: none !important;
}

.status-tabs .el-button--primary:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
  border-bottom: none !important;
  text-decoration: none !important;
}

/* 已删除商品样式 */
:deep(.deleted-row) {
  background-color: #f5f5f5 !important;
  opacity: 0.6;

  td {
    color: #999 !important;
  }
}

:deep(.deleted-row:hover) {
  background-color: #f0f0f0 !important;
}

/* 批量导入对话框样式 */
.quick-add-section {
  max-height: 500px;
  overflow-y: auto;
}

.avatar-uploader {
  width: 60px;
  height: 60px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.avatar {
  width: 60px;
  height: 60px;
  display: block;
  object-fit: cover;
}

.excel-import-section {
  padding: 20px 0;
}

.import-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.preview-section {
  margin-top: 20px;
}

.preview-section h4 {
  margin-bottom: 12px;
  color: #303133;
}
</style>

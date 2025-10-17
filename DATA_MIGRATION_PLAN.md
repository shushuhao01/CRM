# CRM系统数据迁移实施方案

## 迁移概述

### 目标
将现有localStorage中的数据迁移到MySQL数据库，实现真正的数据持久化和多设备同步。

### 迁移范围
- 客户信息 (customers)
- 订单数据 (orders)
- 产品信息 (products)
- 部门数据 (departments)
- 用户数据 (users)
- 系统配置 (configs)

## 迁移步骤

### 第一阶段：数据导出和清洗

#### 1. 创建数据导出工具

```typescript
// src/utils/dataExport.ts
interface LocalStorageData {
  customers: any[];
  orders: any[];
  products: any[];
  departments: any[];
  users: any[];
  configs: any;
}

export class DataExportTool {
  /**
   * 从localStorage导出所有数据
   */
  static exportAllData(): LocalStorageData {
    const data: LocalStorageData = {
      customers: [],
      orders: [],
      products: [],
      departments: [],
      users: [],
      configs: {}
    };

    try {
      // 导出客户数据
      const customersData = localStorage.getItem('crm_store_customers');
      if (customersData) {
        data.customers = JSON.parse(customersData);
      }

      // 导出订单数据
      const ordersData = localStorage.getItem('crm_store_order');
      if (ordersData) {
        data.orders = JSON.parse(ordersData);
      }

      // 导出产品数据
      const productsData = localStorage.getItem('crm_store_product');
      if (productsData) {
        data.products = JSON.parse(productsData);
      }

      // 导出部门数据
      const departmentsData = localStorage.getItem('crm_store_departments');
      if (departmentsData) {
        data.departments = JSON.parse(departmentsData);
      }

      // 导出用户数据
      const usersData = localStorage.getItem('crm_store_users');
      if (usersData) {
        data.users = JSON.parse(usersData);
      }

      // 导出系统配置
      const configsData = localStorage.getItem('crm_store_configs');
      if (configsData) {
        data.configs = JSON.parse(configsData);
      }

      console.log('数据导出完成:', data);
      return data;
    } catch (error) {
      console.error('数据导出失败:', error);
      throw error;
    }
  }

  /**
   * 将数据保存为JSON文件
   */
  static downloadAsJson(data: LocalStorageData, filename: string = 'crm_data_export.json') {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
  }

  /**
   * 数据清洗和格式化
   */
  static cleanAndFormatData(rawData: LocalStorageData): any {
    const cleanedData = {
      customers: this.cleanCustomers(rawData.customers),
      orders: this.cleanOrders(rawData.orders),
      products: this.cleanProducts(rawData.products),
      departments: this.cleanDepartments(rawData.departments),
      users: this.cleanUsers(rawData.users),
      configs: this.cleanConfigs(rawData.configs)
    };

    return cleanedData;
  }

  private static cleanCustomers(customers: any[]): any[] {
    return customers.map(customer => ({
      id: customer.id,
      customer_code: customer.customerCode || `CUST${customer.id}`,
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      company: customer.company || '',
      industry: customer.industry || '',
      source: customer.source || 'unknown',
      level: customer.level || 'normal',
      status: customer.status || 'active',
      tags: JSON.stringify(customer.tags || []),
      remark: customer.remark || '',
      order_count: customer.orderCount || 0,
      total_amount: customer.totalAmount || 0,
      last_order_time: customer.lastOrderTime ? new Date(customer.lastOrderTime) : null,
      assigned_to: customer.assignedTo || 1,
      created_by: customer.createdBy || 1,
      created_at: customer.createdAt ? new Date(customer.createdAt) : new Date(),
      updated_at: customer.updatedAt ? new Date(customer.updatedAt) : new Date()
    }));
  }

  private static cleanOrders(orders: any[]): any[] {
    return orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      customer_id: order.customerId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      subtotal: order.subtotal || 0,
      discount: order.discount || 0,
      total_amount: order.totalAmount || 0,
      collect_amount: order.collectAmount || 0,
      deposit_amount: order.depositAmount || 0,
      deposit_screenshots: JSON.stringify(order.depositScreenshots || []),
      receiver_name: order.receiverName,
      receiver_phone: order.receiverPhone,
      receiver_address: order.receiverAddress,
      remark: order.remark || '',
      status: order.status || 'pending_transfer',
      audit_status: order.auditStatus || 'pending',
      mark_type: order.markType || 'normal',
      sales_person_id: order.salesPersonId || 1,
      auditor_id: order.auditorId || null,
      audit_time: order.auditTime ? new Date(order.auditTime) : null,
      audit_remark: order.auditRemark || '',
      express_company: order.expressCompany || '',
      tracking_number: order.trackingNumber || '',
      logistics_status: order.logisticsStatus || 'pending',
      shipping_time: order.shippingTime ? new Date(order.shippingTime) : null,
      delivery_time: order.deliveryTime ? new Date(order.deliveryTime) : null,
      cancel_reason: order.cancelReason || '',
      cancel_time: order.cancelTime ? new Date(order.cancelTime) : null,
      created_by: order.createdBy || 1,
      created_at: order.createdAt ? new Date(order.createdAt) : new Date(),
      updated_at: order.updatedAt ? new Date(order.updatedAt) : new Date(),
      // 订单商品
      items: order.products?.map((product: any) => ({
        product_id: product.id,
        product_name: product.name,
        product_code: product.code || '',
        price: product.price,
        quantity: product.quantity,
        total: product.price * product.quantity
      })) || [],
      // 状态历史
      status_history: order.statusHistory?.map((history: any) => ({
        status: history.status,
        operator_id: history.operatorId || 1,
        operator_name: history.operatorName || '系统',
        description: history.description || '',
        remark: history.remark || '',
        created_at: history.createdAt ? new Date(history.createdAt) : new Date()
      })) || []
    }));
  }

  private static cleanProducts(products: any[]): any[] {
    return products.map(product => ({
      id: product.id,
      product_code: product.code || `PROD${product.id}`,
      name: product.name,
      category_id: product.categoryId || 1,
      description: product.description || '',
      price: product.price,
      cost_price: product.costPrice || 0,
      stock_quantity: product.stock || 0,
      min_stock: product.minStock || 0,
      unit: product.unit || '件',
      specifications: JSON.stringify(product.specifications || {}),
      images: JSON.stringify(product.images || []),
      status: product.status || 'active',
      created_by: product.createdBy || 1,
      created_at: product.createdAt ? new Date(product.createdAt) : new Date(),
      updated_at: product.updatedAt ? new Date(product.updatedAt) : new Date()
    }));
  }

  private static cleanDepartments(departments: any[]): any[] {
    return departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description || '',
      parent_id: dept.parentId || null,
      manager_id: dept.managerId || null,
      status: dept.status || 'active',
      created_at: dept.createdAt ? new Date(dept.createdAt) : new Date(),
      updated_at: dept.updatedAt ? new Date(dept.updatedAt) : new Date()
    }));
  }

  private static cleanUsers(users: any[]): any[] {
    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email || '',
      password_hash: user.passwordHash || '$2b$10$defaulthash', // 需要重新设置密码
      real_name: user.realName || user.name || '',
      phone: user.phone || '',
      role: user.role || 'sales',
      department_id: user.departmentId || 1,
      status: user.status || 'active',
      last_login_at: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      created_at: user.createdAt ? new Date(user.createdAt) : new Date(),
      updated_at: user.updatedAt ? new Date(user.updatedAt) : new Date()
    }));
  }

  private static cleanConfigs(configs: any): any[] {
    const configArray = [];
    for (const [key, value] of Object.entries(configs || {})) {
      configArray.push({
        config_key: key,
        config_value: JSON.stringify(value),
        description: `从localStorage迁移的配置: ${key}`,
        is_public: false,
        updated_by: 1,
        updated_at: new Date()
      });
    }
    return configArray;
  }
}
```

#### 2. 在前端添加数据导出功能

```vue
<!-- 在Settings.vue中添加数据导出按钮 -->
<template>
  <div class="data-migration-section">
    <h3>数据迁移工具</h3>
    <el-card>
      <el-space>
        <el-button 
          type="primary" 
          @click="exportData"
          :loading="exportLoading"
        >
          导出现有数据
        </el-button>
        <el-button 
          type="success" 
          @click="validateData"
          :loading="validateLoading"
        >
          验证数据完整性
        </el-button>
      </el-space>
      
      <div v-if="exportResult" class="export-result">
        <h4>导出结果:</h4>
        <ul>
          <li>客户数据: {{ exportResult.customers.length }} 条</li>
          <li>订单数据: {{ exportResult.orders.length }} 条</li>
          <li>产品数据: {{ exportResult.products.length }} 条</li>
          <li>部门数据: {{ exportResult.departments.length }} 条</li>
          <li>用户数据: {{ exportResult.users.length }} 条</li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DataExportTool } from '@/utils/dataExport';
import { ElMessage } from 'element-plus';

const exportLoading = ref(false);
const validateLoading = ref(false);
const exportResult = ref<any>(null);

const exportData = async () => {
  exportLoading.value = true;
  try {
    const rawData = DataExportTool.exportAllData();
    const cleanedData = DataExportTool.cleanAndFormatData(rawData);
    
    // 下载JSON文件
    DataExportTool.downloadAsJson(cleanedData, `crm_data_export_${new Date().toISOString().split('T')[0]}.json`);
    
    exportResult.value = {
      customers: cleanedData.customers,
      orders: cleanedData.orders,
      products: cleanedData.products,
      departments: cleanedData.departments,
      users: cleanedData.users
    };
    
    ElMessage.success('数据导出成功！');
  } catch (error) {
    console.error('数据导出失败:', error);
    ElMessage.error('数据导出失败，请检查控制台错误信息');
  } finally {
    exportLoading.value = false;
  }
};

const validateData = async () => {
  validateLoading.value = true;
  try {
    const rawData = DataExportTool.exportAllData();
    
    // 数据完整性检查
    const issues = [];
    
    // 检查客户数据
    rawData.customers.forEach((customer, index) => {
      if (!customer.name) issues.push(`客户 ${index + 1}: 缺少姓名`);
      if (!customer.phone && !customer.email) issues.push(`客户 ${index + 1}: 缺少联系方式`);
    });
    
    // 检查订单数据
    rawData.orders.forEach((order, index) => {
      if (!order.orderNumber) issues.push(`订单 ${index + 1}: 缺少订单号`);
      if (!order.customerId) issues.push(`订单 ${index + 1}: 缺少客户ID`);
      if (!order.products || order.products.length === 0) issues.push(`订单 ${index + 1}: 缺少商品信息`);
    });
    
    // 检查产品数据
    rawData.products.forEach((product, index) => {
      if (!product.name) issues.push(`产品 ${index + 1}: 缺少产品名称`);
      if (!product.price || product.price <= 0) issues.push(`产品 ${index + 1}: 价格无效`);
    });
    
    if (issues.length === 0) {
      ElMessage.success('数据验证通过，可以安全迁移！');
    } else {
      ElMessage.warning(`发现 ${issues.length} 个数据问题，建议修复后再迁移`);
      console.warn('数据问题列表:', issues);
    }
  } catch (error) {
    console.error('数据验证失败:', error);
    ElMessage.error('数据验证失败');
  } finally {
    validateLoading.value = false;
  }
};
</script>
```

### 第二阶段：数据库准备

#### 1. 创建数据库和表结构

```sql
-- 创建数据库
CREATE DATABASE crm_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE crm_system;

-- 执行DATABASE_ARCHITECTURE.md中的所有表创建语句
-- ...

-- 创建默认数据
INSERT INTO departments (id, name, description) VALUES 
(1, '销售部', '负责产品销售和客户维护'),
(2, '客服部', '负责客户服务和售后支持'),
(3, '管理部', '负责系统管理和运营');

INSERT INTO users (id, username, password_hash, real_name, role, department_id) VALUES 
(1, 'admin', '$2b$10$defaulthash', '系统管理员', 'admin', 3);

INSERT INTO product_categories (id, name, description) VALUES 
(1, '默认分类', '系统默认产品分类');
```

#### 2. 创建数据导入脚本

```typescript
// scripts/importData.ts
import { AppDataSource } from '../src/config/database.config';
import * as fs from 'fs';
import * as path from 'path';

interface ImportData {
  customers: any[];
  orders: any[];
  products: any[];
  departments: any[];
  users: any[];
  configs: any[];
}

class DataImporter {
  private dataSource = AppDataSource;

  async importFromJson(filePath: string) {
    try {
      // 初始化数据库连接
      await this.dataSource.initialize();
      
      // 读取JSON文件
      const jsonData = fs.readFileSync(filePath, 'utf8');
      const data: ImportData = JSON.parse(jsonData);
      
      console.log('开始导入数据...');
      
      // 按顺序导入数据（考虑外键依赖）
      await this.importDepartments(data.departments);
      await this.importUsers(data.users);
      await this.importProductCategories();
      await this.importProducts(data.products);
      await this.importCustomers(data.customers);
      await this.importOrders(data.orders);
      await this.importConfigs(data.configs);
      
      console.log('数据导入完成！');
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    } finally {
      await this.dataSource.destroy();
    }
  }

  private async importDepartments(departments: any[]) {
    if (!departments || departments.length === 0) return;
    
    console.log(`导入 ${departments.length} 个部门...`);
    
    for (const dept of departments) {
      await this.dataSource.query(`
        INSERT INTO departments (id, name, description, parent_id, manager_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        updated_at = VALUES(updated_at)
      `, [
        dept.id,
        dept.name,
        dept.description,
        dept.parent_id,
        dept.manager_id,
        dept.status,
        dept.created_at,
        dept.updated_at
      ]);
    }
  }

  private async importUsers(users: any[]) {
    if (!users || users.length === 0) return;
    
    console.log(`导入 ${users.length} 个用户...`);
    
    for (const user of users) {
      await this.dataSource.query(`
        INSERT INTO users (id, username, email, password_hash, real_name, phone, role, department_id, status, last_login_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        real_name = VALUES(real_name),
        phone = VALUES(phone),
        role = VALUES(role),
        department_id = VALUES(department_id),
        status = VALUES(status),
        updated_at = VALUES(updated_at)
      `, [
        user.id,
        user.username,
        user.email,
        user.password_hash,
        user.real_name,
        user.phone,
        user.role,
        user.department_id,
        user.status,
        user.last_login_at,
        user.created_at,
        user.updated_at
      ]);
    }
  }

  private async importProductCategories() {
    // 确保有默认分类
    await this.dataSource.query(`
      INSERT IGNORE INTO product_categories (id, name, description, status)
      VALUES (1, '默认分类', '系统默认产品分类', 'active')
    `);
  }

  private async importProducts(products: any[]) {
    if (!products || products.length === 0) return;
    
    console.log(`导入 ${products.length} 个产品...`);
    
    for (const product of products) {
      await this.dataSource.query(`
        INSERT INTO products (id, product_code, name, category_id, description, price, cost_price, stock_quantity, min_stock, unit, specifications, images, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        price = VALUES(price),
        cost_price = VALUES(cost_price),
        stock_quantity = VALUES(stock_quantity),
        min_stock = VALUES(min_stock),
        unit = VALUES(unit),
        specifications = VALUES(specifications),
        images = VALUES(images),
        status = VALUES(status),
        updated_at = VALUES(updated_at)
      `, [
        product.id,
        product.product_code,
        product.name,
        product.category_id || 1,
        product.description,
        product.price,
        product.cost_price,
        product.stock_quantity,
        product.min_stock,
        product.unit,
        product.specifications,
        product.images,
        product.status,
        product.created_by,
        product.created_at,
        product.updated_at
      ]);
    }
  }

  private async importCustomers(customers: any[]) {
    if (!customers || customers.length === 0) return;
    
    console.log(`导入 ${customers.length} 个客户...`);
    
    for (const customer of customers) {
      await this.dataSource.query(`
        INSERT INTO customers (id, customer_code, name, phone, email, address, company, industry, source, level, status, tags, remark, order_count, total_amount, last_order_time, assigned_to, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        email = VALUES(email),
        address = VALUES(address),
        company = VALUES(company),
        industry = VALUES(industry),
        source = VALUES(source),
        level = VALUES(level),
        status = VALUES(status),
        tags = VALUES(tags),
        remark = VALUES(remark),
        order_count = VALUES(order_count),
        total_amount = VALUES(total_amount),
        last_order_time = VALUES(last_order_time),
        assigned_to = VALUES(assigned_to),
        updated_at = VALUES(updated_at)
      `, [
        customer.id,
        customer.customer_code,
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.company,
        customer.industry,
        customer.source,
        customer.level,
        customer.status,
        customer.tags,
        customer.remark,
        customer.order_count,
        customer.total_amount,
        customer.last_order_time,
        customer.assigned_to,
        customer.created_by,
        customer.created_at,
        customer.updated_at
      ]);
    }
  }

  private async importOrders(orders: any[]) {
    if (!orders || orders.length === 0) return;
    
    console.log(`导入 ${orders.length} 个订单...`);
    
    for (const order of orders) {
      // 导入订单主表
      await this.dataSource.query(`
        INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, subtotal, discount, total_amount, collect_amount, deposit_amount, deposit_screenshots, receiver_name, receiver_phone, receiver_address, remark, status, audit_status, mark_type, sales_person_id, auditor_id, audit_time, audit_remark, express_company, tracking_number, logistics_status, shipping_time, delivery_time, cancel_reason, cancel_time, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        customer_phone = VALUES(customer_phone),
        subtotal = VALUES(subtotal),
        discount = VALUES(discount),
        total_amount = VALUES(total_amount),
        collect_amount = VALUES(collect_amount),
        deposit_amount = VALUES(deposit_amount),
        receiver_name = VALUES(receiver_name),
        receiver_phone = VALUES(receiver_phone),
        receiver_address = VALUES(receiver_address),
        remark = VALUES(remark),
        status = VALUES(status),
        audit_status = VALUES(audit_status),
        updated_at = VALUES(updated_at)
      `, [
        order.id,
        order.order_number,
        order.customer_id,
        order.customer_name,
        order.customer_phone,
        order.subtotal,
        order.discount,
        order.total_amount,
        order.collect_amount,
        order.deposit_amount,
        order.deposit_screenshots,
        order.receiver_name,
        order.receiver_phone,
        order.receiver_address,
        order.remark,
        order.status,
        order.audit_status,
        order.mark_type,
        order.sales_person_id,
        order.auditor_id,
        order.audit_time,
        order.audit_remark,
        order.express_company,
        order.tracking_number,
        order.logistics_status,
        order.shipping_time,
        order.delivery_time,
        order.cancel_reason,
        order.cancel_time,
        order.created_by,
        order.created_at,
        order.updated_at
      ]);

      // 导入订单商品
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          await this.dataSource.query(`
            INSERT INTO order_items (order_id, product_id, product_name, product_code, price, quantity, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            product_name = VALUES(product_name),
            price = VALUES(price),
            quantity = VALUES(quantity),
            total = VALUES(total)
          `, [
            order.id,
            item.product_id,
            item.product_name,
            item.product_code,
            item.price,
            item.quantity,
            item.total
          ]);
        }
      }

      // 导入状态历史
      if (order.status_history && order.status_history.length > 0) {
        for (const history of order.status_history) {
          await this.dataSource.query(`
            INSERT INTO order_status_history (order_id, status, operator_id, operator_name, description, remark, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            order.id,
            history.status,
            history.operator_id,
            history.operator_name,
            history.description,
            history.remark,
            history.created_at
          ]);
        }
      }
    }
  }

  private async importConfigs(configs: any[]) {
    if (!configs || configs.length === 0) return;
    
    console.log(`导入 ${configs.length} 个配置...`);
    
    for (const config of configs) {
      await this.dataSource.query(`
        INSERT INTO system_configs (config_key, config_value, description, is_public, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        config_value = VALUES(config_value),
        description = VALUES(description),
        updated_at = VALUES(updated_at)
      `, [
        config.config_key,
        config.config_value,
        config.description,
        config.is_public,
        config.updated_by,
        config.updated_at
      ]);
    }
  }
}

// 使用示例
const importer = new DataImporter();
const dataFilePath = process.argv[2] || './crm_data_export.json';

importer.importFromJson(dataFilePath)
  .then(() => {
    console.log('数据导入成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据导入失败:', error);
    process.exit(1);
  });
```

### 第三阶段：前端改造

#### 1. 创建API服务层

```typescript
// src/services/apiService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，跳转到登录页
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 2. 改造数据存储服务

```typescript
// src/services/hybridStorage.ts
import apiClient from './apiService';

/**
 * 混合存储服务 - 支持本地存储和远程API
 */
export class HybridStorageService {
  private useRemoteAPI: boolean;
  private localStorageKey: string;

  constructor(storageKey: string, useRemoteAPI: boolean = false) {
    this.localStorageKey = storageKey;
    this.useRemoteAPI = useRemoteAPI;
  }

  /**
   * 获取数据
   */
  async getData<T>(endpoint?: string): Promise<T[]> {
    if (this.useRemoteAPI && endpoint) {
      try {
        const response = await apiClient.get(endpoint);
        return response.data || [];
      } catch (error) {
        console.warn('远程API获取数据失败，使用本地存储:', error);
        return this.getLocalData<T>();
      }
    } else {
      return this.getLocalData<T>();
    }
  }

  /**
   * 保存数据
   */
  async saveData<T>(data: T[], endpoint?: string): Promise<void> {
    // 先保存到本地存储
    this.saveLocalData(data);

    // 如果启用远程API，同步到服务器
    if (this.useRemoteAPI && endpoint) {
      try {
        await apiClient.post(`${endpoint}/sync`, { data });
      } catch (error) {
        console.warn('远程API同步失败:', error);
      }
    }
  }

  /**
   * 创建单条记录
   */
  async createItem<T>(item: T, endpoint?: string): Promise<T> {
    if (this.useRemoteAPI && endpoint) {
      try {
        const response = await apiClient.post(endpoint, item);
        // 同步更新本地存储
        const localData = this.getLocalData<T>();
        localData.push(response.data);
        this.saveLocalData(localData);
        return response.data;
      } catch (error) {
        console.warn('远程API创建失败，使用本地存储:', error);
        return this.createLocalItem(item);
      }
    } else {
      return this.createLocalItem(item);
    }
  }

  /**
   * 更新单条记录
   */
  async updateItem<T extends { id: any }>(item: T, endpoint?: string): Promise<T> {
    if (this.useRemoteAPI && endpoint) {
      try {
        const response = await apiClient.put(`${endpoint}/${item.id}`, item);
        // 同步更新本地存储
        const localData = this.getLocalData<T>();
        const index = localData.findIndex((i: any) => i.id === item.id);
        if (index !== -1) {
          localData[index] = response.data;
          this.saveLocalData(localData);
        }
        return response.data;
      } catch (error) {
        console.warn('远程API更新失败，使用本地存储:', error);
        return this.updateLocalItem(item);
      }
    } else {
      return this.updateLocalItem(item);
    }
  }

  /**
   * 删除单条记录
   */
  async deleteItem<T extends { id: any }>(id: any, endpoint?: string): Promise<void> {
    if (this.useRemoteAPI && endpoint) {
      try {
        await apiClient.delete(`${endpoint}/${id}`);
        // 同步更新本地存储
        const localData = this.getLocalData<T>();
        const filteredData = localData.filter((i: any) => i.id !== id);
        this.saveLocalData(filteredData);
      } catch (error) {
        console.warn('远程API删除失败，使用本地存储:', error);
        this.deleteLocalItem<T>(id);
      }
    } else {
      this.deleteLocalItem<T>(id);
    }
  }

  // 本地存储方法
  private getLocalData<T>(): T[] {
    try {
      const data = localStorage.getItem(this.localStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('本地存储读取失败:', error);
      return [];
    }
  }

  private saveLocalData<T>(data: T[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('本地存储保存失败:', error);
    }
  }

  private createLocalItem<T>(item: T): T {
    const data = this.getLocalData<T>();
    const newItem = { ...item, id: Date.now() } as T;
    data.push(newItem);
    this.saveLocalData(data);
    return newItem;
  }

  private updateLocalItem<T extends { id: any }>(item: T): T {
    const data = this.getLocalData<T>();
    const index = data.findIndex((i: any) => i.id === item.id);
    if (index !== -1) {
      data[index] = item;
      this.saveLocalData(data);
    }
    return item;
  }

  private deleteLocalItem<T extends { id: any }>(id: any): void {
    const data = this.getLocalData<T>();
    const filteredData = data.filter((i: any) => i.id !== id);
    this.saveLocalData(filteredData);
  }

  /**
   * 切换到远程API模式
   */
  enableRemoteAPI(): void {
    this.useRemoteAPI = true;
  }

  /**
   * 切换到本地存储模式
   */
  disableRemoteAPI(): void {
    this.useRemoteAPI = false;
  }
}
```

## 迁移执行计划

### 时间安排
1. **第1周**: 数据导出和清洗
2. **第2周**: 后端API开发
3. **第3周**: 数据库部署和数据导入
4. **第4周**: 前端改造和测试
5. **第5周**: 上线和监控

### 风险控制
1. **数据备份**: 迁移前完整备份现有数据
2. **灰度发布**: 先在测试环境验证
3. **回滚方案**: 保留本地存储作为备用
4. **监控告警**: 实时监控API性能和错误率

### 验收标准
1. 所有现有数据成功迁移到数据库
2. 用户可以正常登录和使用所有功能
3. 数据在不同设备间正确同步
4. 系统性能满足要求
5. 数据安全和权限控制正常

这个迁移方案确保了数据的安全性和系统的稳定性，同时提供了渐进式的迁移路径。
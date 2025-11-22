// 🔥 批次268修复：数据迁移功能使用真实数据，支持自动无缝切换
interface LocalStorageData {
  customers: any[];
  orders: any[];
  products: any[];
  departments: any[];
  users: any[];
  configs: any;
  metadata?: {
    exportTime: string;
    version: string;
    totalSize: number;
    itemCount: number;
  };
}

export interface ExportResult {
  success: boolean;
  data?: LocalStorageData;
  statistics?: any;
  error?: string;
}

export interface ValidationResult {
  issues: string[];
  warnings: string[];
  summary: {
    totalIssues: number;
    totalWarnings: number;
    isValid: boolean;
  };
}

export class DataExportTool {
  /**
   * 从localStorage导出所有数据
   * 🔥 批次268修复：改为实例方法，使用正确的localStorage键名，支持自动无缝切换
   */
  async exportAllData(): Promise<ExportResult> {
    try {
      const data: LocalStorageData = {
        customers: [],
        orders: [],
        products: [],
        departments: [],
        users: [],
        configs: {}
      };

      // 🔥 批次268修复：使用正确的localStorage键名
      // 导出客户数据
      const customersData = localStorage.getItem('customers');
      if (customersData) {
        data.customers = JSON.parse(customersData);
      }

      // 导出订单数据
      const ordersData = localStorage.getItem('orders');
      if (ordersData) {
        data.orders = JSON.parse(ordersData);
      }

      // 导出产品数据
      const productsData = localStorage.getItem('products');
      if (productsData) {
        data.products = JSON.parse(productsData);
      }

      // 导出部门数据
      const departmentsData = localStorage.getItem('departments');
      if (departmentsData) {
        data.departments = JSON.parse(departmentsData);
      }

      // 导出用户数据
      const usersData = localStorage.getItem('userDatabase');
      if (usersData) {
        data.users = JSON.parse(usersData);
      }

      // 导出系统配置（收集所有crm_config_*键）
      const configs: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('crm_config_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              configs[key] = JSON.parse(value);
            }
          } catch (error) {
            console.warn(`解析配置失败: ${key}`, error);
          }
        }
      }
      data.configs = configs;

      // 添加元数据
      const totalSize = JSON.stringify(data).length;
      data.metadata = {
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        totalSize,
        itemCount: data.customers.length + data.orders.length + data.products.length + data.departments.length + data.users.length
      };

      console.log('[数据导出] 导出完成:', {
        customers: data.customers.length,
        orders: data.orders.length,
        products: data.products.length,
        departments: data.departments.length,
        users: data.users.length,
        configs: Object.keys(data.configs).length,
        totalSize: this.formatBytes(totalSize)
      });

      // 生成统计信息
      const statistics = this.getDataStatistics(data);

      // 自动下载JSON文件
      this.downloadAsJson(data);

      return {
        success: true,
        data,
        statistics
      };
    } catch (error) {
      console.error('[数据导出] 导出失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证数据完整性
   * 🔥 批次268修复：实现验证方法
   */
  async validateData(): Promise<ValidationResult> {
    try {
      const exportResult = await this.exportAllData();
      if (!exportResult.success || !exportResult.data) {
        return {
          issues: ['无法读取数据'],
          warnings: [],
          summary: {
            totalIssues: 1,
            totalWarnings: 0,
            isValid: false
          }
        };
      }

      const data = exportResult.data;
      const issues: string[] = [];
      const warnings: string[] = [];

      // 检查客户数据
      data.customers.forEach((customer, index) => {
        if (!customer.name) issues.push(`客户 ${index + 1}: 缺少姓名`);
        if (!customer.phone && !customer.email) {
          warnings.push(`客户 ${index + 1}: 缺少联系方式`);
        }
        if (!customer.id) issues.push(`客户 ${index + 1}: 缺少ID`);
      });

      // 检查订单数据
      data.orders.forEach((order, index) => {
        if (!order.orderNumber) issues.push(`订单 ${index + 1}: 缺少订单号`);
        if (!order.customerId) issues.push(`订单 ${index + 1}: 缺少客户ID`);
        if (!order.products || order.products.length === 0) {
          issues.push(`订单 ${index + 1}: 缺少商品信息`);
        }
        if (!order.totalAmount || order.totalAmount <= 0) {
          warnings.push(`订单 ${index + 1}: 订单金额异常`);
        }
      });

      // 检查产品数据
      data.products.forEach((product, index) => {
        if (!product.name) issues.push(`产品 ${index + 1}: 缺少产品名称`);
        if (!product.price || product.price <= 0) {
          issues.push(`产品 ${index + 1}: 价格无效`);
        }
        if (!product.id) issues.push(`产品 ${index + 1}: 缺少ID`);
      });

      // 检查部门数据
      data.departments.forEach((dept, index) => {
        if (!dept.name) issues.push(`部门 ${index + 1}: 缺少部门名称`);
        if (!dept.id) issues.push(`部门 ${index + 1}: 缺少ID`);
      });

      // 检查用户数据
      data.users.forEach((user, index) => {
        if (!user.username) issues.push(`用户 ${index + 1}: 缺少用户名`);
        if (!user.name) warnings.push(`用户 ${index + 1}: 缺少姓名`);
        if (!user.role) warnings.push(`用户 ${index + 1}: 缺少角色`);
      });

      console.log('[数据验证] 验证完成:', {
        totalIssues: issues.length,
        totalWarnings: warnings.length,
        isValid: issues.length === 0
      });

      return {
        issues,
        warnings,
        summary: {
          totalIssues: issues.length,
          totalWarnings: warnings.length,
          isValid: issues.length === 0
        }
      };
    } catch (error) {
      console.error('[数据验证] 验证失败:', error);
      return {
        issues: ['数据验证失败: ' + (error instanceof Error ? error.message : '未知错误')],
        warnings: [],
        summary: {
          totalIssues: 1,
          totalWarnings: 0,
          isValid: false
        }
      };
    }
  }

  /**
   * 获取数据统计信息
   * 🔥 批次268修复：实现统计方法
   */
  getDataStatistics(data?: LocalStorageData) {
    if (!data) {
      // 如果没有提供数据，从localStorage读取
      data = {
        customers: JSON.parse(localStorage.getItem('customers') || '[]'),
        orders: JSON.parse(localStorage.getItem('orders') || '[]'),
        products: JSON.parse(localStorage.getItem('products') || '[]'),
        departments: JSON.parse(localStorage.getItem('departments') || '[]'),
        users: JSON.parse(localStorage.getItem('userDatabase') || '[]'),
        configs: {}
      };

      // 收集配置
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('crm_config_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              data.configs[key] = JSON.parse(value);
            }
          } catch (error) {
            console.warn(`解析配置失败: ${key}`, error);
          }
        }
      }
    }

    const totalSize = JSON.stringify(data).length;

    return {
      customers: data.customers.length,
      orders: data.orders.length,
      products: data.products.length,
      departments: data.departments.length,
      users: data.users.length,
      configs: Object.keys(data.configs).length,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      exportTime: new Date().toLocaleString()
    };
  }

  /**
   * 将数据保存为JSON文件
   * 🔥 批次268修复：改为实例方法，支持自动无缝切换
   */
  downloadAsJson(data: LocalStorageData, filename: string = `crm_data_export_${Date.now()}.json`) {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放URL对象
      setTimeout(() => URL.revokeObjectURL(link.href), 100);

      console.log('[数据导出] 文件下载成功:', filename);
    } catch (error) {
      console.error('[数据导出] 文件下载失败:', error);
      throw error;
    }
  }

  /**
   * 格式化字节大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

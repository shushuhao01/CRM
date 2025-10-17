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

  /**
   * 验证数据完整性
   */
  static validateData(data: LocalStorageData): string[] {
    const issues: string[] = [];

    // 检查客户数据
    data.customers.forEach((customer, index) => {
      if (!customer.name) issues.push(`客户 ${index + 1}: 缺少姓名`);
      if (!customer.phone && !customer.email) issues.push(`客户 ${index + 1}: 缺少联系方式`);
    });

    // 检查订单数据
    data.orders.forEach((order, index) => {
      if (!order.orderNumber) issues.push(`订单 ${index + 1}: 缺少订单号`);
      if (!order.customerId) issues.push(`订单 ${index + 1}: 缺少客户ID`);
      if (!order.products || order.products.length === 0) issues.push(`订单 ${index + 1}: 缺少商品信息`);
    });

    // 检查产品数据
    data.products.forEach((product, index) => {
      if (!product.name) issues.push(`产品 ${index + 1}: 缺少产品名称`);
      if (!product.price || product.price <= 0) issues.push(`产品 ${index + 1}: 价格无效`);
    });

    return issues;
  }

  /**
   * 获取数据统计信息
   */
  static getDataStatistics(data: LocalStorageData) {
    return {
      customers: data.customers.length,
      orders: data.orders.length,
      products: data.products.length,
      departments: data.departments.length,
      users: data.users.length,
      configs: Object.keys(data.configs).length,
      totalSize: JSON.stringify(data).length
    };
  }
}
/**
 * 数据范围控制测试脚本
 * 用于验证不同角色用户的数据访问权限
 */

// 测试数据范围控制功能
function testDataScopeControl() {
  console.log('=== 开始测试数据范围控制功能 ===');
  
  // 测试超级管理员数据范围
  testSuperAdminDataScope();
  
  // 测试部门负责人数据范围
  testDepartmentManagerDataScope();
  
  // 测试销售员数据范围
  testSalesStaffDataScope();
  
  // 测试客服数据范围
  testCustomerServiceDataScope();
  
  console.log('=== 数据范围控制测试完成 ===');
}

// 测试超级管理员数据范围控制
function testSuperAdminDataScope() {
  console.log('\n--- 测试超级管理员数据范围控制 ---');
  
  // 模拟超级管理员用户
  const adminUser = {
    id: 'admin_001',
    name: '超级管理员',
    roleId: 'admin',
    dataScope: 'all'
  };
  
  // 测试数据访问权限
  const testCases = [
    { dataOwnerId: 'user_001', dataDepartmentId: 'dept_001', expected: true },
    { dataOwnerId: 'user_002', dataDepartmentId: 'dept_002', expected: true },
    { dataOwnerId: null, dataDepartmentId: 'dept_003', expected: true },
    { dataOwnerId: 'user_003', dataDepartmentId: null, expected: true }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = checkDataAccess(adminUser.id, testCase.dataOwnerId, testCase.dataDepartmentId);
    console.log(`测试用例 ${index + 1}: ${result === testCase.expected ? '✓ 通过' : '✗ 失败'}`);
    console.log(`  数据所有者: ${testCase.dataOwnerId || 'null'}`);
    console.log(`  数据部门: ${testCase.dataDepartmentId || 'null'}`);
    console.log(`  期望结果: ${testCase.expected}, 实际结果: ${result}`);
  });
}

// 测试部门负责人数据范围控制
function testDepartmentManagerDataScope() {
  console.log('\n--- 测试部门负责人数据范围控制 ---');
  
  // 模拟部门负责人用户
  const managerUser = {
    id: 'manager_001',
    name: '部门负责人',
    roleId: 'department_manager',
    departmentId: 'dept_001',
    dataScope: 'department'
  };
  
  // 测试数据访问权限
  const testCases = [
    { dataOwnerId: 'manager_001', dataDepartmentId: 'dept_001', expected: true, desc: '访问自己创建的数据' },
    { dataOwnerId: 'user_001', dataDepartmentId: 'dept_001', expected: true, desc: '访问本部门数据' },
    { dataOwnerId: 'user_002', dataDepartmentId: 'dept_002', expected: false, desc: '访问其他部门数据' },
    { dataOwnerId: 'user_003', dataDepartmentId: null, expected: false, desc: '访问无部门归属的数据' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = checkDataAccess(managerUser.id, testCase.dataOwnerId, testCase.dataDepartmentId);
    console.log(`测试用例 ${index + 1}: ${result === testCase.expected ? '✓ 通过' : '✗ 失败'} - ${testCase.desc}`);
    console.log(`  数据所有者: ${testCase.dataOwnerId || 'null'}`);
    console.log(`  数据部门: ${testCase.dataDepartmentId || 'null'}`);
    console.log(`  期望结果: ${testCase.expected}, 实际结果: ${result}`);
  });
}

// 测试销售员数据范围控制
function testSalesStaffDataScope() {
  console.log('\n--- 测试销售员数据范围控制 ---');
  
  // 模拟销售员用户
  const salesUser = {
    id: 'sales_001',
    name: '销售员',
    roleId: 'sales_staff',
    departmentId: 'dept_001',
    dataScope: 'self'
  };
  
  // 测试数据访问权限
  const testCases = [
    { dataOwnerId: 'sales_001', dataDepartmentId: 'dept_001', expected: true, desc: '访问自己创建的数据' },
    { dataOwnerId: 'sales_002', dataDepartmentId: 'dept_001', expected: false, desc: '访问同部门其他人的数据' },
    { dataOwnerId: 'sales_003', dataDepartmentId: 'dept_002', expected: false, desc: '访问其他部门的数据' },
    { dataOwnerId: null, dataDepartmentId: 'dept_001', expected: false, desc: '访问无创建者的数据' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = checkDataAccess(salesUser.id, testCase.dataOwnerId, testCase.dataDepartmentId);
    console.log(`测试用例 ${index + 1}: ${result === testCase.expected ? '✓ 通过' : '✗ 失败'} - ${testCase.desc}`);
    console.log(`  数据所有者: ${testCase.dataOwnerId || 'null'}`);
    console.log(`  数据部门: ${testCase.dataDepartmentId || 'null'}`);
    console.log(`  期望结果: ${testCase.expected}, 实际结果: ${result}`);
  });
}

// 测试客服数据范围控制
function testCustomerServiceDataScope() {
  console.log('\n--- 测试客服数据范围控制 ---');
  
  // 模拟客服用户
  const customerServiceUser = {
    id: 'cs_001',
    name: '客服',
    roleId: 'customer_service',
    dataScope: 'custom',
    customerServiceType: 'after_sales',
    customPermissions: ['order:list:view', 'customer:list:view']
  };
  
  // 测试数据访问权限
  const testCases = [
    { dataOwnerId: 'cs_001', dataDepartmentId: 'dept_cs', expected: true, desc: '访问自己创建的数据' },
    { dataOwnerId: 'sales_001', dataDepartmentId: 'dept_001', expected: true, desc: '访问售后相关数据' },
    { dataOwnerId: 'user_002', dataDepartmentId: 'dept_002', expected: true, desc: '访问其他部门数据（售后权限）' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = checkCustomerServiceDataAccess(customerServiceUser, testCase.dataOwnerId, testCase.dataDepartmentId);
    console.log(`测试用例 ${index + 1}: ${result === testCase.expected ? '✓ 通过' : '✗ 失败'} - ${testCase.desc}`);
    console.log(`  数据所有者: ${testCase.dataOwnerId || 'null'}`);
    console.log(`  数据部门: ${testCase.dataDepartmentId || 'null'}`);
    console.log(`  期望结果: ${testCase.expected}, 实际结果: ${result}`);
  });
}

// 模拟数据访问权限检查函数
function checkDataAccess(userId, dataOwnerId, dataDepartmentId) {
  // 获取用户权限信息
  const userPermission = getUserPermission(userId);
  
  if (!userPermission) {
    return false;
  }
  
  // 超级管理员可以访问所有数据
  if (userPermission.dataScope === 'all') {
    return true;
  }
  
  // 用户可以访问自己创建的数据
  if (dataOwnerId === userId) {
    return true;
  }
  
  // 部门负责人只能访问所属部门的数据
  if (userPermission.dataScope === 'department') {
    if (!dataDepartmentId) {
      return false;
    }
    return userPermission.departmentId === dataDepartmentId;
  }
  
  // 销售员只能访问自己创建的数据
  if (userPermission.dataScope === 'self') {
    if (!dataOwnerId) {
      return false;
    }
    return userId === dataOwnerId;
  }
  
  return false;
}

// 模拟客服数据访问权限检查函数
function checkCustomerServiceDataAccess(user, dataOwnerId, dataDepartmentId) {
  // 客服可以访问自己创建的数据
  if (dataOwnerId === user.id) {
    return true;
  }
  
  // 根据客服类型判断权限
  if (user.customerServiceType === 'after_sales') {
    // 售后客服可以查看所有售后相关数据
    return true;
  }
  
  return false;
}

// 模拟获取用户权限信息
function getUserPermission(userId) {
  const mockPermissions = {
    'admin_001': {
      userId: 'admin_001',
      role: 'admin',
      dataScope: 'all',
      departmentId: null
    },
    'manager_001': {
      userId: 'manager_001',
      role: 'department_manager',
      dataScope: 'department',
      departmentId: 'dept_001'
    },
    'sales_001': {
      userId: 'sales_001',
      role: 'sales_staff',
      dataScope: 'self',
      departmentId: 'dept_001'
    },
    'cs_001': {
      userId: 'cs_001',
      role: 'customer_service',
      dataScope: 'custom',
      departmentId: 'dept_cs'
    }
  };
  
  return mockPermissions[userId];
}

// 运行测试
testDataScopeControl();
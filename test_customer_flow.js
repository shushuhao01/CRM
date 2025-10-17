// 测试客户数据存储和获取流程
// 在浏览器控制台中运行此脚本

console.log('=== 客户数据流程测试开始 ===');

// 1. 检查localStorage中的客户数据
const storageKey = 'crm_customers_unified';
const storedData = localStorage.getItem(storageKey);

console.log('1. 检查localStorage中的客户数据:');
console.log('存储键:', storageKey);
console.log('原始数据:', storedData);

if (storedData) {
  try {
    const parsedData = JSON.parse(storedData);
    console.log('解析后的数据:', parsedData);
    console.log('客户数量:', parsedData.customers ? parsedData.customers.length : 0);
    
    if (parsedData.customers && parsedData.customers.length > 0) {
      console.log('最新的5个客户:');
      parsedData.customers.slice(0, 5).forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} (${customer.phone}) - 创建时间: ${customer.createTime}`);
      });
    }
  } catch (error) {
    console.error('解析localStorage数据失败:', error);
  }
} else {
  console.log('localStorage中没有找到客户数据');
}

// 2. 检查Vue store中的客户数据
console.log('\n2. 检查Vue store中的客户数据:');
if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps) {
  const app = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps[0];
  if (app && app.config && app.config.globalProperties) {
    const pinia = app.config.globalProperties.$pinia;
    if (pinia && pinia._s) {
      const customerStore = pinia._s.get('customer');
      if (customerStore) {
        console.log('Store中的客户数量:', customerStore.customers.length);
        console.log('Store中的filteredCustomers数量:', customerStore.filteredCustomers.length);
        
        if (customerStore.customers.length > 0) {
          console.log('Store中最新的5个客户:');
          customerStore.customers.slice(0, 5).forEach((customer, index) => {
            console.log(`${index + 1}. ${customer.name} (${customer.phone}) - 创建时间: ${customer.createTime}`);
          });
        }
      } else {
        console.log('未找到customer store');
      }
    } else {
      console.log('未找到pinia实例');
    }
  } else {
    console.log('未找到Vue应用实例');
  }
} else {
  console.log('Vue DevTools不可用，无法检查store');
}

// 3. 模拟添加一个测试客户
console.log('\n3. 模拟添加测试客户:');
const testCustomer = {
  id: `test_customer_${Date.now()}`,
  code: `TEST${Date.now()}`,
  name: '测试客户' + Date.now(),
  phone: '1380013' + String(Date.now()).slice(-4),
  age: 25,
  address: '测试地址',
  level: 'normal',
  status: 'active',
  salesPersonId: 'admin',
  createdBy: 'admin',
  createTime: new Date().toISOString(),
  orderCount: 0
};

// 获取现有数据
let existingData = { customers: [], lastUpdated: Date.now(), version: '1.0.0' };
if (storedData) {
  try {
    existingData = JSON.parse(storedData);
  } catch (error) {
    console.error('解析现有数据失败:', error);
  }
}

// 添加测试客户
existingData.customers.unshift(testCustomer);
existingData.lastUpdated = Date.now();

// 保存到localStorage
try {
  localStorage.setItem(storageKey, JSON.stringify(existingData));
  console.log('测试客户添加成功:', testCustomer.name, testCustomer.phone);
  console.log('当前客户总数:', existingData.customers.length);
} catch (error) {
  console.error('保存测试客户失败:', error);
}

console.log('=== 客户数据流程测试完成 ===');
console.log('请刷新页面查看客户列表是否显示新添加的测试客户');
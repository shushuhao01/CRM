// 调试localStorage中的客户数据
console.log('=== localStorage 中的客户数据检查 ===');

// 检查客户数据
const customerData = localStorage.getItem('crm_customers_unified');
if (customerData) {
  try {
    const customers = JSON.parse(customerData);
    console.log('✅ 客户总数:', customers.length);
    
    if (customers.length > 0) {
      console.log('📋 最新的3个客户:');
      customers.slice(-3).forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} (${customer.phone}) - 创建时间: ${customer.createTime}`);
      });
      
      console.log('📊 所有客户数据:', customers);
    } else {
      console.log('⚠️ 客户数组为空');
    }
  } catch (error) {
    console.error('❌ 解析客户数据失败:', error);
    console.log('原始数据:', customerData);
  }
} else {
  console.log('❌ localStorage中没有找到客户数据 (key: crm_customers_unified)');
}

// 检查其他可能的存储键
console.log('\n=== 检查其他可能的存储键 ===');
const allKeys = Object.keys(localStorage);
const crmKeys = allKeys.filter(key => key.includes('crm') || key.includes('customer'));
console.log('CRM相关的localStorage键:', crmKeys);

crmKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`${key}:`, value ? value.substring(0, 100) + '...' : 'null');
});
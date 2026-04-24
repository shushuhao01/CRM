const fs = require('fs');
const filePath = 'backend/src/routes/orders/orderCrud.ts';
let c = fs.readFileSync(filePath, 'utf-8');

// Fix merged lines: comment followed by code on same line
// Pattern: "// some comment    code"  ->  "// some comment\n    code"
const merges = [
  ['关键词      startDate,', '关键词\n      startDate,'],
  ['权限过滤    // 优先使用', '权限过滤\n    // 优先使用'],
  ['payload）    const jwtUser', 'payload）\n    const jwtUser'],
  ['复杂的条件    const queryBuilder', '复杂的条件\n    const queryBuilder'],
  ['所有订单    const allowAllRoles', '所有订单\n    const allowAllRoles'],
  ['自己的订单        if (userDepartmentId)', '自己的订单\n        if (userDepartmentId)'],
  ['自己的订单          queryBuilder.andWhere', '自己的订单\n          queryBuilder.andWhere'],
  ['自己的订单        queryBuilder.andWhere', '自己的订单\n        queryBuilder.andWhere'],
  ['状态筛选    if (status)', '状态筛选\n    if (status)'],
  ['订单号筛选    if (orderNumber)', '订单号筛选\n    if (orderNumber)'],
  ['客户名称筛选    if (customerName)', '客户名称筛选\n    if (customerName)'],
  ['时间查询    if (startDate', '时间查询\n    if (startDate'],
  ['标记类型筛选    if (markType)', '标记类型筛选\n    if (markType)'],
  ['部门筛选    if (departmentId)', '部门筛选\n    if (departmentId)'],
  ['销售人员筛选    if (salesPersonId)', '销售人员筛选\n    if (salesPersonId)'],
  ['逗号分隔）    if (statusList)', '逗号分隔）\n    if (statusList)'],
  ['商品名称）    if (productName)', '商品名称）\n    if (productName)'],
  ['手机号）    if (customerPhone)', '手机号）\n    if (customerPhone)'],
  ['场景使用）    if (customerId)', '场景使用）\n    if (customerId)'],
  ['排序和分页    queryBuilder', '排序和分页\n    queryBuilder'],
  ['前端期望    const list', '前端期望\n    const list'],
  ['计算总数量      const totalQuantity', '计算总数量\n      const totalQuantity'],
  ['表获取）        customerGender', '表获取）\n        customerGender'],
  ['权限判断        operatorId', '权限判断\n        operatorId'],
  ['避免报错    try', '避免报错\n    try'],
  ['物流相关字段      shippedAt', '物流相关字段\n      shippedAt'],
  ['新版自定义字段      // 🔥', '新版自定义字段\n      // 🔥'],
  ['部门信息    const createdByDepartment', '部门信息\n    const createdByDepartment'],
  ['进行验证）    if (markType', '进行验证）\n    if (markType'],
  ['字段初始化      codAmount', '字段初始化\n      codAmount'],
  ['待处理      // 🔥', '待处理\n      // 🔥'],
  ['独立字段      customField1', '独立字段\n      customField1'],
  ['订单数据    const responseData', '订单数据\n    const responseData'],
  ['历史记录    const creatorDept', '历史记录\n    const creatorDept'],
  ['时才同步    // 如果', '时才同步\n    // 如果'],
  ['到数组）      if (!updateData', '到数组）\n      if (!updateData'],
  ['物流状态    if (updateData.logisticsStatus', '物流状态\n    if (updateData.logisticsStatus'],
  ['独立字段      if (updateData.customFields', '独立字段\n      if (updateData.customFields'],
  ['状态历史    if (updateData.status', '状态历史\n    if (updateData.status'],
  ['操作人信息      const opInfo', '操作人信息\n      const opInfo'],
  ['历史记录      await saveStatusHistory', '历史记录\n      await saveStatusHistory'],
  ['发送短信          try', '发送短信\n          try'],
  ['签收）          try', '签收）\n          try'],
  ['记录历史      const editFields', '记录历史\n      const editFields'],
  ['正常发货单    const previousMarkType', '正常发货单\n    const previousMarkType'],
  ['历史记录    const opInfoSubmit', '历史记录\n    const opInfoSubmit'],
  ['审核员信息    const currentUser', '审核员信息\n    const currentUser'],
  ['旧数据）  }', '旧数据）\n  }'],
  ['生成订单号    const generatedOrderNumber', '生成订单号\n    const generatedOrderNumber'],
  // Also fix lines where `log.info/error` calls got merged
  ['已创建\'', '已创建\','],
];

let count = 0;
for (const [from, to] of merges) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
  }
}

// Check remaining long lines (>200 chars) that might be merged
const lines = c.split('\n');
let issues = 0;
lines.forEach((l, i) => {
  if (l.length > 200 && l.includes('//')) {
    issues++;
    if (issues <= 30) {
      console.log(`Long L${i+1} (${l.length}): ${l.substring(0, 150)}...`);
    }
  }
});
console.log(`Fixed ${count} merged lines. Remaining long comment lines: ${issues}`);

// Also check for any remaining FFFD
let fffd = 0;
lines.forEach((l, i) => {
  if (l.includes('\uFFFD')) {
    fffd++;
    console.log(`FFFD L${i+1}: ${l.trim().substring(0, 120)}`);
  }
});
console.log(`Remaining FFFD: ${fffd}`);

fs.writeFileSync(filePath, c, 'utf-8');
console.log('File saved.');


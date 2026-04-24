// Comprehensive fix for corrupted Chinese characters in orderCrud.ts
const fs = require('fs');
const filePath = 'backend/src/routes/orders/orderCrud.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Each replacement: [corrupted pattern, correct text]
// The pattern \uFFFD? represents a lost Chinese character
const replacements = [
  // Line 2: 路由, 审核
  ['相关路\uFFFD? * 包含', '相关路由\n * 包含'],
  ['取消审\uFFFD? */', '取消审核\n */'],
  // Line 25: 部门）
  ['姓名+部门\uFFFD?*/', '姓名+部门）*/'],
  // Line 31: 部门
  ['"某部\uFFFD?某人"', '"某部门-某人"'],
  // Line 47: 关键词
  ['搜索关键\uFFFD?', '搜索关键词'],
  // Line 64: 过滤, 使用, payload）
  ['权限过\uFFFD?', '权限过滤'],
  ['其次使\uFFFD?req.user', '其次使用 req.user'],
  ['payload\uFFFD?', 'payload）'],
  // Line 73: 条件
  ['复杂的条\uFFFD?', '复杂的条件'],
  // Line 76: 订单
  ['所有订\uFFFD?', '所有订单'],
  // Line 84: 订单
  ['自己的订\uFFFD?', '自己的订单'],
  // Line 90: 或
  ['userDepartmentId} \uFFFD?创建人ID', 'userDepartmentId} 或 创建人ID'],
  // Line 98, 101: 单
  ['自己的订\uFFFD? userId', '自己的订单, userId'],
  // Line 113: 索
  ['关键词搜\uFFFD? "', '关键词搜索: "'],
  // Line 116-141: 筛选
  ['状态筛\uFFFD?', '状态筛选'],
  ['订单号筛\uFFFD?', '订单号筛选'],
  ['客户名称筛\uFFFD?', '客户名称筛选'],
  ['日期范围筛\uFFFD?', '日期范围筛选'],
  ['时间查\uFFFD?', '时间查询'],
  ['标记类型筛\uFFFD?', '标记类型筛选'],
  ['部门筛\uFFFD?', '部门筛选'],
  ['销售人员筛\uFFFD?', '销售人员筛选'],
  ['逗号分隔\uFFFD?', '逗号分隔）'],
  // Line 160: 称）
  ['商品名称\uFFFD?', '商品名称）'],
  // Line 164: 号）
  ['手机号\uFFFD?', '手机号）'],
  // Line 173: 用）
  ['场景使用\uFFFD?', '场景使用）'],
  // Line 175: 选
  ['客户ID筛\uFFFD? ', '客户ID筛选: '],
  // Line 178: 页
  ['排序和分\uFFFD?', '排序和分页'],
  // Line 184: 到, 单, (note: two replacements on same line)
  ['查询\uFFFD?${orders.length} 条订\uFFFD? 总数', '查询到 ${orders.length} 条订单, 总数'],
  // Line 194: 望
  ['前端期\uFFFD?', '前端期望'],
  // Line 208: 量）
  ['计算总数\uFFFD?', '计算总数量'],
  // Line 227: ）
  ['表获取\uFFFD?', '表获取）'],
  // Line 233: 量
  ['新增：总数\uFFFD?', '新增：总数量'],
  // Line 276: 断
  ['权限判\uFFFD?', '权限判断'],
  // Line 293: ❌
  ["log.error('\uFFFD?[订单列表] 获取失败", "log.error('❌ [订单列表] 获取失败"],
  // Line 304: 在, 被
  ['路由必须\uFFFD?/:id 之前定义，否则会\uFFFD?/:id 拦截', '路由必须在 /:id 之前定义，否则会被 /:id 拦截'],
  // Line 309: 史
  ['状态历\uFFFD? * @access', '状态历史\n * @access'],
  // Line 315: 错
  ['避免报\uFFFD?', '避免报错'],
  // Line 329: 「
  ['变更为\uFFFD?{getStatusTitle', '变更为「${getStatusTitle'],
  // Line 338: 有
  ['${orderId} \uFFFD?${list.length} 条状态记录', '${orderId} 有 ${list.length} 条状态记录'],
  // Line 346-347: 败
  ['历史失\uFFFD?\'', '历史失败\''],
  ['历史失\uFFFD? }', '历史失败\' }'],
  // Line 376: 有
  ['${orderId} \uFFFD?${list.length} 条操作记录', '${orderId} 有 ${list.length} 条操作记录'],
  // Line 412: 有
  ['${orderId} \uFFFD?${list.length} 条售后记录', '${orderId} 有 ${list.length} 条售后记录'],
  // Line 431: 为
  ['标记类型\uFFFD?${markType}', '标记类型为 ${markType}'],
  // Line 439, 485, etc: 在
  ["'订单不存\uFFFD?", "'订单不存在'"],
  // Line 446: ✅
  ["log.info(`\uFFFD?[订单标记]", "log.info(`✅ [订单标记]"],
  // Line 459: ❌
  ["log.error('\uFFFD?[订单标记] 更新失败", "log.error('❌ [订单标记] 更新失败"],
  // Line 510: 间, 数）
  ['创建时\uFFFD?+ 配置的延迟分钟数\uFFFD?', '创建时间 + 配置的延迟分钟数）'],
  // Line 559: 段
  ['物流相关字\uFFFD?', '物流相关字段'],
  // Line 571: 段
  ['新版自定义字\uFFFD?', '新版自定义字段'],
  // Line 657: ❌
  ["log.error('\uFFFD?[订单创建] 缺少客户ID", "log.error('❌ [订单创建] 缺少客户ID"],
  // Line 666: ❌, 息
  ["log.error('\uFFFD?[订单创建] 缺少商品", "log.error('❌ [订单创建] 缺少商品信息"],
  // Line 674: 号
  ['生成订单\uFFFD?', '生成订单号'],
  // Line 694: 息
  ['部门信\uFFFD?', '部门信息'],
  // Line 697: ）
  ['进行验证\uFFFD?', '进行验证）'],
  // Line 746: 化
  ['字段初始\uFFFD?', '字段初始化'],
  // Line 747: 理）, 段
  ['待处\uFFFD?', '待处理'],
  ['独立字\uFFFD?', '独立字段'],
  // Line 763: ✅
  ["log.info('\uFFFD?[订单创建] 订单保存", "log.info('✅ [订单创建] 订单保存"],
  // Line 777: 余
  ['剩\uFFFD?${product.stock}', '剩余 ${product.stock}'],
  // Line 779: 前, 要
  ['当\uFFFD?${product.stock}，需\uFFFD?${quantity}', '当前 ${product.stock}，需要 ${quantity}'],
  // Line 784: 建
  ['已创\uFFFD?\'', '已创建\''],
  // Line 787: 据
  ['订单数\uFFFD?', '订单数据'],
  // Line 812: ✅
  ["log.info('\uFFFD?[订单创建] 返回数据", "log.info('✅ [订单创建] 返回数据"],
  // Line 814: 录
  ['历史记\uFFFD?', '历史记录'],
  // Line 816: ）, ）
  ['快捷下单\uFFFD? : \'（CRM系统下单\uFFFD?;', '快捷下单）\' : \'（CRM系统下单）\';'],
  // Line 822: 为
  ['订单号\uFFFD?{savedOrder', '订单号为 ${savedOrder'],
  // Line 844: ❌
  ["log.error('\uFFFD?[订单创建] 失败", "log.error('❌ [订单创建] 失败"],
  // Line 860: 径
  ['变更路\uFFFD?const', '变更路径\nconst'],
  // Line 861: 转 → 审核
  ["待流\uFFFD?\uFFFD?待审\uFFFD?", "待流转 → 待审核"],
  // Line 862: →
  ["审核拒绝 \uFFFD?重新提审", "审核拒绝 → 重新提审"],
  // Line 863: 货 → 货/退回/取消
  ["待发\uFFFD?\uFFFD?已发\uFFFD?退\uFFFD?取消", "待发货 → 已发货/退回/取消"],
  // Line 864: 货 → 收/异常/退回
  ["已发\uFFFD?\uFFFD?已签\uFFFD?拒收/异常/退\uFFFD?", "已发货 → 已签收/拒收/异常/退回"],
  // Line 865: →, 回
  ["拒收 \uFFFD?拒收已退\uFFFD?", "拒收 → 拒收已退回"],
  // Line 866: 回 →
  ["物流退\uFFFD?\uFFFD?重新发货", "物流退回 → 重新发货"],
  // Line 867: →, 消
  ["物流取消 \uFFFD?已取\uFFFD?", "物流取消 → 已取消"],
  // Line 872: 法
  ['是否合\uFFFD?const isValidStatusTransition', '是否合法\nconst isValidStatusTransition'],
  // Line 878: 态
  ['当前状\uFFFD? ${currentStatus}', '当前状态: ${currentStatus}'],
  // Line 879: ）
  ['旧数据\uFFFD?', '旧数据）'],
  // Line 884: 称
  ['中文名\uFFFD?const getStatusName', '中文名称\nconst getStatusName'],
  // Line 886-898: status names with missing last char
  ["'待流\uFFFD?,", "'待流转',"],
  ["'待审\uFFFD?,", "'待审核',"],
  ["'待发\uFFFD?,", "'待发货',"],
  ["'已发\uFFFD?,", "'已发货',"],
  ["'已签\uFFFD?,", "'已签收',"],
  ["'物流部退\uFFFD?,", "'物流部退回',"],
  ["'物流部取\uFFFD?,", "'物流部取消',"],
  ["'拒收已退\uFFFD?,", "'拒收已退回',"],
  ["'已取\uFFFD?", "'已取消'"],
  // Line 919: 在
  // already handled by '订单不存在'
  // Line 926: 法
  ['是否合\uFFFD?    if', '是否合法\n    if'],
  // Line 931: ❌, 更, →
  ["[状态校验] \uFFFD?非法状态变\uFFFD? ${currentStatus} \uFFFD?${targetStatus}", "[状态校验] ❌ 非法状态变更: ${currentStatus} → ${targetStatus}"],
  // Line 935: 为
  ['变更\uFFFD?${getStatusName(targetStatus)', '变更为"${getStatusName(targetStatus)'],
  // Line 941: ✅, 更, →
  ["[状态校验] \uFFFD?合法状态变\uFFFD? ${currentStatus} \uFFFD?${targetStatus}", "[状态校验] ✅ 合法状态变更: ${currentStatus} → ${targetStatus}"],
  // Line 967: 步
  ['时才同\uFFFD?', '时才同步'],
  // Line 974: →
  ['${oldCodAmount} \uFFFD?${order.codAmount}', '${oldCodAmount} → ${order.codAmount}'],
  // Line 976: 过（, →
  ['修改\uFFFD?${oldCodAmount} \uFFFD?${oldCollectAmount}', '修改过（${oldCodAmount} → ${oldCollectAmount}'],
  // Line 985: 段）
  ['到数组\uFFFD?', '到数组）'],
  // Line 1000: 态
  ['物流状\uFFFD?', '物流状态'],
  // Line 1004: 段
  ['独立字\uFFFD?', '独立字段'],
  // Line 1015: 史
  // already handled by 历史记录
  // Line 1016: 息
  ['操作人信\uFFFD?', '操作人信息'],
  // Line 1019: 录
  // already handled
  // Line 1024: 为
  // already handled by 变更为
  // Line 1044: 信
  ['发送短\uFFFD?', '发送短信'],
  // Line 1060: ）
  ['签收\uFFFD?', '签收）'],
  // Line 1074: 信
  ['发送短\uFFFD?', '发送短信'],
  // Line 1088: 信
  // already handled
  // Line 1123: 史
  ['记录历\uFFFD?', '记录历史'],
  // Line 1124: 人
  ["editFields.push('收件\uFFFD?);", "editFields.push('收件人');"],
  // Line 1129: 司
  ["editFields.push('快递公\uFFFD?);", "editFields.push('快递公司');"],
  // Line 1130: 号
  ["editFields.push('快递单\uFFFD?);", "editFields.push('快递单号');"],
  // Line 1143: 了「, 、
  ['修改了\uFFFD?{editFields.join(\'', '修改了「${editFields.join(\''],
  ['join(\'\uFFFD?)}', 'join(\'、\')}'],
  // Line 1236: 单
  ['正常发货\uFFFD?', '正常发货单'],
  // Line 1239: 从
  ['标记\uFFFD?${previousMarkType}', '标记从 ${previousMarkType}'],
  // Line 1249: 录
  // already handled
  // Line 1255: 核
  ['提交审\uFFFD?{remark', '提交审核，${remark'],
  // Line 1259: ✅
  ["log.info(`\uFFFD?[订单提审]", "log.info(`✅ [订单提审]"],
  // Line 1274: 核
  ["'订单已提交审\uFFFD?,", "'订单已提交审核',"],
  // Line 1305: 息
  ['审核员信\uFFFD?', '审核员信息'],
  // Line 1306: 员
  ["'审核\uFFFD?;", "'审核员';"],
  // Line 1308: 或
  ["/'reject' \uFFFD?auditStatus", "/'reject' 或 auditStatus"],
  // Line 1341: ✅
  ["log.info(`\uFFFD?[订单审核] 订单 ${order", "log.info(`✅ [订单审核] 订单 ${order"],
  // Line 1342: ，
  ['发送通知\uFFFD?createdBy', '发送通知: createdBy'],
  // Line 1354: ❌
  // The ✅ pattern already handled line 1341, need to handle 1354 differently
  // Line 1363: 录 (already handled)
  // Line 1407: 息 (already handled)
  // Line 1408: 员 (already handled)
  // Line 1441: 为, 是
  ['设置\uFFFD?cancel_failed，而不\uFFFD?confirmed', '设置为 cancel_failed，而不是 confirmed'],
  // Line 1452: 录 (already handled)
  // Line 1458: 绝
  ['取消申请已拒\uFFFD?{remark', '取消申请已拒绝，${remark'],
  // Line 1465: 绝
  ["'取消申请已拒\uFFFD?", "'取消申请已拒绝'"],
  // Line 865 additional: 包裹异常 →
  ['包裹异常 \uFFFD?重新发货/拒收/取消', '包裹异常 → 重新发货/拒收/取消'],
  // Line 864: 已签收 → 已建售后
  ["已签\uFFFD?\uFFFD?已建售后（终态", "已签收 → 已建售后（终态"],
];

let count = 0;
for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    count++;
  }
}

// Handle remaining \uFFFD? patterns that might have been missed
// Do a second pass for any remaining
const remaining = [];
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('\uFFFD')) {
    remaining.push(`Line ${i+1}: ${line.trim().substring(0, 120)}`);
  }
});

console.log(`Applied ${count} replacement patterns`);
console.log(`Remaining corrupted lines: ${remaining.length}`);
remaining.forEach(r => console.log(r));

// Write the fixed file
fs.writeFileSync(filePath, content, 'utf-8');
console.log('File saved.');


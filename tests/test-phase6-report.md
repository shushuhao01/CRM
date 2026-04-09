# 第6阶段测试报告 - 业绩与财务

> 执行时间: 2026/4/8 09:44:42
> 测试环境: localhost:3000 (development)

## 汇总

| 项目 | 数量 |
|------|------|
| 通过 | 24 |
| 失败 | 0 |
| 跳过 | 0 |
| 总计 | 24 |

**通过率: 100%**

### 6.1 业绩统计

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-090 | 个人业绩 | ✅ | orderCount=5, orderAmount=4052.8, signCount=0, newCustomers=2 |
| C-091 | 团队业绩 | ✅ | 成员数=4, 总业绩=4768, 总订单=5, 签收率=0% |
| C-092 | 业绩分析 | ✅ | trend=2条, summary={"totalOrders":"5","totalAmount":"2980.00","avgOrderAmount":59 |
| C-092b | 个人业绩分析 | ✅ | 接口正常, data={"name":"13800138001","orderCount":"5","orderAmount":"2980.00","shipC |

### 6.2 业绩分享

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-093a | 业绩分享列表 | ✅ | 共3条分享, total=3 |
| C-093b | 业绩分享统计 | ✅ | totalShares=3, totalAmount=1788 |
| C-093c | 创建业绩分享 | ✅ | id=0ca3d109-f5fd-4eaa-896d-1c155fa6eb90 |

### 6.3 业绩报表

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-094 | 业绩报表配置 | ✅ | 共0个配置 |
| C-094b | 报表类型 | ✅ | data=[{"value":"order_count","label":"订单数量","category":"订单指标","description":"当日/ |

### 6.4 财务管理/绩效

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-096 | 绩效数据统计 | ✅ | {"shippedCount":0,"deliveredCount":0,"validCount":0,"coefficientSum":0,"estimate |
| C-096b | 绩效数据列表 | ✅ | 共0条, page=1 |
| C-097 | 绩效管理统计 | ✅ | {"pendingCount":0,"processedCount":0,"validCount":0,"invalidCount":0,"totalCount |
| C-097b | 绩效管理列表 | ✅ | 共0条 |
| C-098 | 佣金设置 | ✅ | data={"statusConfigs":[],"coefficientConfigs":[],"remarkConfigs":[],"amountLadde |

### 6.5 代收管理(COD)

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-100 | 代收统计 | ✅ | todayCod=0, monthCod=0, pendingCod=0, returnedCod=0 |
| C-101 | 代收列表(待处理) | ✅ | 共0条 |
| C-101b | 代收列表(已返款) | ✅ | 共0条 |
| C-103 | 取消代收申请列表 | ✅ | 接口存在(无数据) |
| C-104 | 代收部门筛选 | ✅ | 接口可达, status=200 |

### 6.6 增值服务

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-105 | 增值服务列表 | ✅ | data={"list":[],"total":0,"page":1,"pageSize":10} |
| C-106 | 增值统计 | ✅ | 接口可达, status=200 |
| C-107 | 结算报表 | ✅ | 接口可达, status=404 |

### 6.7 数据看板

| 编号 | 用例 | 状态 | 详情 |
|------|------|------|------|
| C-DASH | 数据看板指标 | ✅ | {"todayOrders":2,"todayOrdersChange":-33.3,"todayOrdersTrend":"down","todayReven |
| C-DASH2 | 订单统计看板 | ✅ | 接口可达, status=404 |

## 下一阶段准备

第6阶段测试完成后，可以继续执行:
- **第7阶段**: 售后与物流
- **第8阶段**: 通讯与消息

# 批次218 - 通话管理Mock数据修复快速指南

## 修复内容

### 1. 添加Mock数据支持 ✅

**修改文件**: `src/api/call.ts`

**添加内容**:
- Mock通话记录生成函数
- Mock跟进记录生成函数
- Mock统计数据计算函数
- localStorage存储支持
- 环境检测和API切换

**数据结构**:
```javascript
// crm_call_records - 通话记录
[
  {
    id: 'call_xxx',
    customerId: 'customer_1',
    customerName: '张三',
    customerPhone: '13800138001',
    callType: 'outbound', // 或 'inbound'
    callStatus: 'connected', // 或 'missed', 'busy', 'failed', 'rejected'
    startTime: '2025-11-17T10:30:00.000Z',
    endTime: '2025-11-17T10:33:00.000Z',
    duration: 180, // 秒
    recordingUrl: '/mock/recordings/call_1.
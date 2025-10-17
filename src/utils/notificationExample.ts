// 通知功能使用示例
import { triggerOrderNotification, triggerDataChangeNotification } from '@/services/notificationService'

// 示例：在订单创建时触发通知
export const handleOrderCreated = async (orderData: any, currentUser: any) => {
  try {
    // 触发订单创建通知
    await triggerOrderNotification(
      currentUser.id,
      currentUser.departmentId,
      {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        amount: orderData.amount,
        createTime: new Date().toISOString()
      }
    )
    
    console.log('订单创建通知已发送')
  } catch (error) {
    console.error('发送订单创建通知失败:', error)
  }
}

// 示例：在数据更新时触发通知
export const handleDataChanged = async (changeType: string, changeData: any, currentUser: any) => {
  try {
    // 触发数据变更通知
    await triggerDataChangeNotification(
      currentUser.id,
      currentUser.departmentId,
      {
        type: changeType,
        description: `${changeType}数据已更新`,
        data: changeData,
        updateTime: new Date().toISOString()
      }
    )
    
    console.log('数据变更通知已发送')
  } catch (error) {
    console.error('发送数据变更通知失败:', error)
  }
}

// 示例：在客户信息更新时触发通知
export const handleCustomerUpdated = async (customerData: any, currentUser: any) => {
  await handleDataChanged('客户信息', {
    customerId: customerData.id,
    customerName: customerData.name,
    changes: customerData.changes
  }, currentUser)
}

// 示例：在合同签署时触发通知
export const handleContractSigned = async (contractData: any, currentUser: any) => {
  await handleDataChanged('合同签署', {
    contractId: contractData.id,
    contractNumber: contractData.number,
    customerName: contractData.customerName,
    amount: contractData.amount
  }, currentUser)
}

// 示例：在任务完成时触发通知
export const handleTaskCompleted = async (taskData: any, currentUser: any) => {
  await handleDataChanged('任务完成', {
    taskId: taskData.id,
    taskName: taskData.name,
    completedAt: new Date().toISOString()
  }, currentUser)
}

// 使用示例说明：
/*
在你的业务组件中，可以这样使用：

import { handleOrderCreated, handleCustomerUpdated } from '@/utils/notificationExample'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 创建订单后
const createOrder = async (orderData) => {
  try {
    // 保存订单到数据库
    const savedOrder = await api.createOrder(orderData)
    
    // 触发通知（只有当前用户自己创建的订单才会收到通知）
    await handleOrderCreated(savedOrder, userStore.currentUser)
    
    ElMessage.success('订单创建成功')
  } catch (error) {
    ElMessage.error('订单创建失败')
  }
}

// 更新客户信息后
const updateCustomer = async (customerId, updateData) => {
  try {
    // 更新客户信息
    const updatedCustomer = await api.updateCustomer(customerId, updateData)
    
    // 触发通知（只有当前用户自己更新的数据才会收到通知）
    await handleCustomerUpdated(updatedCustomer, userStore.currentUser)
    
    ElMessage.success('客户信息更新成功')
  } catch (error) {
    ElMessage.error('客户信息更新失败')
  }
}
*/
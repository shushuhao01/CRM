import { ElMessage } from 'element-plus'

// 通知配置接口
export interface NotificationConfig {
  id: string
  name: string
  notificationMethod: 'dingtalk' | 'wechat_work' | 'email' | 'sms' | 'system_message'
  messageType: string
  departmentIds: string[]
  memberIds: string[]
  enabled: boolean
  params?: any
}

// 通知事件接口
export interface NotificationEvent {
  type: 'order_created' | 'order_updated' | 'data_changed' | 'custom'
  userId: string
  userDepartmentId: string
  data: any
  message: string
  title?: string
}

class NotificationService {
  private configs: NotificationConfig[] = []

  // 初始化通知配置
  async loadConfigurations(): Promise<NotificationConfig[]> {
    try {
      // 这里应该从后端API获取配置
      // const response = await api.get('/notification/configs')
      // this.configs = response.data
      
      // 模拟数据
      this.configs = JSON.parse(localStorage.getItem('notification_configs') || '[]')
      return this.configs
    } catch (error) {
      console.error('加载通知配置失败:', error)
      return []
    }
  }

  // 保存通知配置
  async saveConfiguration(config: NotificationConfig): Promise<void> {
    try {
      // 这里应该调用后端API保存配置
      // await api.post('/notification/configs', config)
      
      // 模拟保存到本地存储
      const existingIndex = this.configs.findIndex(c => c.id === config.id)
      if (existingIndex >= 0) {
        this.configs[existingIndex] = config
      } else {
        this.configs.push(config)
      }
      localStorage.setItem('notification_configs', JSON.stringify(this.configs))
    } catch (error) {
      console.error('保存通知配置失败:', error)
      throw error
    }
  }

  // 触发通知事件
  async triggerNotification(event: NotificationEvent): Promise<void> {
    try {
      // 获取匹配的通知配置
      const matchingConfigs = this.getMatchingConfigs(event)
      
      // 为每个匹配的配置发送通知
      for (const config of matchingConfigs) {
        await this.sendNotification(config, event)
      }
    } catch (error) {
      console.error('触发通知失败:', error)
    }
  }

  // 获取匹配的通知配置
  private getMatchingConfigs(event: NotificationEvent): NotificationConfig[] {
    return this.configs.filter(config => {
      // 检查配置是否启用
      if (!config.enabled) return false
      
      // 检查用户是否在配置的部门中
      if (!config.departmentIds.includes(event.userDepartmentId)) return false
      
      // 检查用户是否在配置的成员中（如果指定了成员）
      if (config.memberIds.length > 0 && !config.memberIds.includes(event.userId)) return false
      
      // 检查消息类型是否匹配
      if (config.messageType && config.messageType !== event.type) return false
      
      return true
    })
  }

  // 发送通知
  private async sendNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    try {
      switch (config.notificationMethod) {
        case 'dingtalk':
          await this.sendDingTalkNotification(config, event)
          break
        case 'wechat_work':
          await this.sendWeChatWorkNotification(config, event)
          break
        case 'email':
          await this.sendEmailNotification(config, event)
          break
        case 'sms':
          await this.sendSmsNotification(config, event)
          break
        case 'system_message':
          await this.sendSystemNotification(config, event)
          break
        default:
          console.warn('未知的通知方式:', config.notificationMethod)
      }
    } catch (error) {
      console.error(`发送${config.notificationMethod}通知失败:`, error)
    }
  }

  // 发送钉钉通知
  private async sendDingTalkNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    // 这里应该调用钉钉API
    console.log('发送钉钉通知:', {
      config: config.name,
      message: event.message,
      webhook: config.params?.webhook
    })
    
    // 模拟发送成功
    ElMessage.success(`钉钉通知已发送: ${event.message}`)
  }

  // 发送企业微信通知
  private async sendWeChatWorkNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    // 构建企业微信群机器人消息
    const message = {
      msgtype: 'text',
      text: {
        content: event.message,
        mentioned_mobile_list: config.params?.mentionAll ? ['@all'] : 
          (config.params?.mentionedList ? config.params.mentionedList.split(',').map(phone => phone.trim()) : [])
      }
    }
    
    console.log('发送企业微信群机器人通知:', {
      config: config.name,
      groupName: config.params?.groupName || '未命名群',
      webhook: config.params?.webhook,
      message: message,
      mentionAll: config.params?.mentionAll,
      mentionedList: config.params?.mentionedList
    })
    
    // 这里应该调用企业微信群机器人API
    // const response = await fetch(config.params?.webhook, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(message)
    // })
    
    // 模拟发送成功
    const groupInfo = config.params?.groupName ? ` (${config.params.groupName})` : ''
    ElMessage.success(`企业微信群机器人通知已发送${groupInfo}: ${event.message}`)
  }

  // 发送邮件通知
  private async sendEmailNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    // 这里应该调用邮件发送API
    console.log('发送邮件通知:', {
      config: config.name,
      message: event.message,
      smtp: config.params?.smtpServer
    })
    
    // 模拟发送成功
    ElMessage.success(`邮件通知已发送: ${event.message}`)
  }

  // 发送短信通知
  private async sendSmsNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    // 这里应该调用短信发送API
    console.log('发送短信通知:', {
      config: config.name,
      message: event.message,
      provider: config.params?.smsProvider
    })
    
    // 模拟发送成功
    ElMessage.success(`短信通知已发送: ${event.message}`)
  }

  // 发送系统内通知
  private async sendSystemNotification(config: NotificationConfig, event: NotificationEvent): Promise<void> {
    // 这里应该保存到系统消息表
    console.log('发送系统通知:', {
      config: config.name,
      message: event.message,
      userId: event.userId
    })
    
    // 模拟发送成功
    ElMessage.info(`系统通知已发送: ${event.message}`)
  }

  // 测试通知配置
  async testConfiguration(config: NotificationConfig): Promise<boolean> {
    try {
      const testEvent: NotificationEvent = {
        type: 'custom',
        userId: 'test-user',
        userDepartmentId: config.departmentIds[0] || 'test-dept',
        data: {},
        message: '这是一条测试通知消息',
        title: '测试通知'
      }
      
      await this.sendNotification(config, testEvent)
      return true
    } catch (error) {
      console.error('测试通知配置失败:', error)
      return false
    }
  }
}

// 创建单例实例
export const notificationService = new NotificationService()

// 导出便捷方法
export const triggerOrderNotification = (userId: string, userDepartmentId: string, orderData: any) => {
  return notificationService.triggerNotification({
    type: 'order_created',
    userId,
    userDepartmentId,
    data: orderData,
    message: `您有新的订单: ${orderData.orderNumber}`,
    title: '新订单通知'
  })
}

export const triggerDataChangeNotification = (userId: string, userDepartmentId: string, changeData: any) => {
  return notificationService.triggerNotification({
    type: 'data_changed',
    userId,
    userDepartmentId,
    data: changeData,
    message: `您的数据已更新: ${changeData.description}`,
    title: '数据变更通知'
  })
}
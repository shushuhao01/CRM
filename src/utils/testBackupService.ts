/**
 * 数据备份服务测试工具
 * 用于测试备份和恢复功能
 */

import { dataBackupService } from '@/services/dataBackupService'
import { ElMessage } from 'element-plus'

/**
 * 创建测试数据
 */
export function createTestData(): void {
  const testData = {
    'test_customer_data': JSON.stringify([
      { id: 1, name: '测试客户1', phone: '13800138001' },
      { id: 2, name: '测试客户2', phone: '13800138002' }
    ]),
    'test_order_data': JSON.stringify([
      { id: 1, customerId: 1, amount: 1000, status: '已完成' },
      { id: 2, customerId: 2, amount: 2000, status: '进行中' }
    ]),
    'test_config': JSON.stringify({
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true
    }),
    'test_user_preferences': JSON.stringify({
      sidebarCollapsed: false,
      tablePageSize: 20,
      notifications: true
    })
  }

  // 保存测试数据到localStorage
  Object.entries(testData).forEach(([key, value]) => {
    localStorage.setItem(key, value)
  })

  console.log('测试数据已创建:', testData)
  ElMessage.success('测试数据创建成功')
}

/**
 * 清理测试数据
 */
export function cleanupTestData(): void {
  const testKeys = [
    'test_customer_data',
    'test_order_data', 
    'test_config',
    'test_user_preferences'
  ]

  testKeys.forEach(key => {
    localStorage.removeItem(key)
  })

  console.log('测试数据已清理')
  ElMessage.success('测试数据清理完成')
}

/**
 * 验证测试数据
 */
export function verifyTestData(): boolean {
  const testKeys = [
    'test_customer_data',
    'test_order_data',
    'test_config', 
    'test_user_preferences'
  ]

  const missingKeys = testKeys.filter(key => !localStorage.getItem(key))
  
  if (missingKeys.length > 0) {
    console.warn('缺少测试数据:', missingKeys)
    ElMessage.warning(`缺少测试数据: ${missingKeys.join(', ')}`)
    return false
  }

  console.log('测试数据验证通过')
  ElMessage.success('测试数据验证通过')
  return true
}

/**
 * 测试手动备份功能
 */
export async function testManualBackup(): Promise<boolean> {
  try {
    console.log('开始测试手动备份功能...')
    
    // 创建测试数据
    createTestData()
    
    // 执行手动备份
    const result = await dataBackupService.performManualBackup()
    
    if (result) {
      console.log('手动备份测试成功')
      ElMessage.success('手动备份测试成功')
      return true
    } else {
      console.error('手动备份测试失败')
      ElMessage.error('手动备份测试失败')
      return false
    }
  } catch (error) {
    console.error('手动备份测试异常:', error)
    ElMessage.error(`手动备份测试异常: ${error}`)
    return false
  }
}

/**
 * 测试备份列表功能
 */
export async function testBackupList(): Promise<boolean> {
  try {
    console.log('开始测试备份列表功能...')
    
    const backupList = await dataBackupService.getBackupList()
    
    console.log('备份列表:', backupList)
    ElMessage.success(`获取到 ${backupList.length} 个备份文件`)
    
    return true
  } catch (error) {
    console.error('备份列表测试失败:', error)
    ElMessage.error(`备份列表测试失败: ${error}`)
    return false
  }
}

/**
 * 测试备份配置功能
 */
export async function testBackupConfig(): Promise<boolean> {
  try {
    console.log('开始测试备份配置功能...')
    
    // 获取默认配置
    const defaultConfig = dataBackupService.getDefaultBackupConfig()
    console.log('默认配置:', defaultConfig)
    
    // 保存配置
    const testConfig = {
      ...defaultConfig,
      enabled: true,
      autoBackupInterval: 2, // 2小时
      maxBackupCount: 5
    }
    
    await dataBackupService.setBackupConfig(testConfig)
    
    // 验证配置是否保存成功
    const savedConfig = dataBackupService.getBackupConfig()
    console.log('保存的配置:', savedConfig)
    
    if (savedConfig.enabled === testConfig.enabled && 
        savedConfig.autoBackupInterval === testConfig.autoBackupInterval) {
      console.log('备份配置测试成功')
      ElMessage.success('备份配置测试成功')
      return true
    } else {
      console.error('备份配置测试失败: 配置不匹配')
      ElMessage.error('备份配置测试失败: 配置不匹配')
      return false
    }
  } catch (error) {
    console.error('备份配置测试异常:', error)
    ElMessage.error(`备份配置测试异常: ${error}`)
    return false
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<void> {
  console.log('开始运行备份服务测试套件...')
  
  const tests = [
    { name: '备份配置测试', fn: testBackupConfig },
    { name: '手动备份测试', fn: testManualBackup },
    { name: '备份列表测试', fn: testBackupList }
  ]
  
  const results: { name: string; success: boolean }[] = []
  
  for (const test of tests) {
    try {
      console.log(`\n=== ${test.name} ===`)
      const success = await test.fn()
      results.push({ name: test.name, success })
      
      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`${test.name} 执行异常:`, error)
      results.push({ name: test.name, success: false })
    }
  }
  
  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===')
  results.forEach(result => {
    console.log(`${result.name}: ${result.success ? '✅ 通过' : '❌ 失败'}`)
  })
  
  const passedCount = results.filter(r => r.success).length
  const totalCount = results.length
  
  if (passedCount === totalCount) {
    ElMessage.success(`所有测试通过 (${passedCount}/${totalCount})`)
  } else {
    ElMessage.warning(`部分测试失败 (${passedCount}/${totalCount})`)
  }
  
  console.log(`测试完成: ${passedCount}/${totalCount} 通过`)
}

// 导出测试函数供控制台使用
if (typeof window !== 'undefined') {
  (window as any).backupTests = {
    createTestData,
    cleanupTestData,
    verifyTestData,
    testManualBackup,
    testBackupList,
    testBackupConfig,
    runAllTests
  }
  
  console.log('备份测试工具已加载，可在控制台使用 window.backupTests')
}
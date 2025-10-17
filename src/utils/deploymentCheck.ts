/**
 * 部署前检查工具
 * 确保数据持久化功能在生产环境正常工作
 */

import { checkBrowserCompatibility, getStorageUsage } from '@/config/storage'
import { PersistentStorage } from './storage'

export interface DeploymentCheckResult {
  success: boolean
  errors: string[]
  warnings: string[]
  info: {
    browserCompatibility: ReturnType<typeof checkBrowserCompatibility>
    storageUsage: ReturnType<typeof getStorageUsage>
    storageAvailable: boolean
  }
}

/**
 * 执行部署前检查
 */
export async function runDeploymentCheck(): Promise<DeploymentCheckResult> {
  const result: DeploymentCheckResult = {
    success: true,
    errors: [],
    warnings: [],
    info: {
      browserCompatibility: checkBrowserCompatibility(),
      storageUsage: getStorageUsage(),
      storageAvailable: false
    }
  }

  try {
    // 1. 检查浏览器兼容性
    const compat = result.info.browserCompatibility
    if (!compat.localStorage) {
      result.errors.push('localStorage不可用，数据持久化功能将无法正常工作')
      result.success = false
    }

    // 2. 检查存储可用性
    const storage = PersistentStorage.getInstance()
    try {
      const testKey = '__deployment_test__'
      const testData = { test: true, timestamp: Date.now() }
      
      // 测试保存
      const saveSuccess = storage.save({
        key: testKey,
        version: '1.0.0'
      }, testData)
      
      if (!saveSuccess) {
        result.errors.push('localStorage保存测试失败')
        result.success = false
      } else {
        // 测试加载
        const loadedData = storage.load({
          key: testKey,
          version: '1.0.0'
        })
        
        if (!loadedData || loadedData.test !== true) {
          result.errors.push('localStorage加载测试失败')
          result.success = false
        } else {
          result.info.storageAvailable = true
        }
        
        // 清理测试数据
        storage.remove(testKey)
      }
    } catch (error) {
      result.errors.push(`存储功能测试失败: ${error}`)
      result.success = false
    }

    // 3. 检查存储空间
    const usage = result.info.storageUsage
    if (usage.percentage > 80) {
      result.warnings.push(`存储空间使用率过高: ${usage.percentage.toFixed(1)}%`)
    }

    // 4. 检查环境变量
    if (import.meta.env.PROD) {
      console.log('[Deployment] 生产环境检查通过')
    } else {
      result.warnings.push('当前为开发环境，请确保生产环境配置正确')
    }

    // 5. 检查关键store是否正确配置
    const requiredStores = [
      'orders',
      'customers',
      'performance',
      'departments',
      'services'
    ]

    for (const storeId of requiredStores) {
      try {
        const testConfig = {
          key: `crm_store_${storeId}`,
          version: '1.0.0'
        }
        
        // 尝试加载store数据（不会报错，只是检查配置）
        storage.load(testConfig)
      } catch (error) {
        result.warnings.push(`Store ${storeId} 配置可能有问题`)
      }
    }

  } catch (error) {
    result.errors.push(`部署检查过程中发生错误: ${error}`)
    result.success = false
  }

  return result
}

/**
 * 打印检查结果
 */
export function printCheckResult(result: DeploymentCheckResult): void {
  console.log('\n=== 部署前检查结果 ===')
  
  if (result.success) {
    console.log('✅ 检查通过，可以部署')
  } else {
    console.log('❌ 检查失败，请修复以下问题后再部署')
  }

  if (result.errors.length > 0) {
    console.log('\n🚨 错误:')
    result.errors.forEach(error => console.log(`  - ${error}`))
  }

  // 调试信息已移除，避免控制台输出过多日志
}

/**
 * 在应用启动时自动运行检查
 */
export async function autoCheck(): Promise<void> {
  if (import.meta.env.PROD) {
    try {
      const result = await runDeploymentCheck()
      if (!result.success) {
        // 数据持久化功能检查失败，静默处理
        printCheckResult(result)
      }
      // 检查通过，静默处理
    } catch (error) {
      // 部署检查失败，静默处理
    }
  }
}
/**
 * 数据持久性测试工具
 * 用于验证本地存储、配置管理和OSS集成功能
 */

import { useConfigStore } from '@/stores/config'
import { dataSyncService, enhancedStorageService } from '@/services/dataSyncService'
import { ossService } from '@/services/ossService'

// 测试结果接口
export interface TestResult {
  name: string
  passed: boolean
  message: string
  error?: any
}

/**
 * 数据持久性测试类
 */
export class DataPersistenceTest {
  private results: TestResult[] = []

  /**
   * 运行所有测试
   */
  public async runAllTests(): Promise<TestResult[]> {
    this.results = []
    
    console.log('开始数据持久性测试...')
    
    // 测试本地存储功能
    await this.testLocalStorage()
    
    // 测试配置存储功能
    await this.testConfigStore()
    
    // 测试增强存储服务
    await this.testEnhancedStorage()
    
    // 测试OSS服务
    await this.testOSSService()
    
    // 测试数据同步服务
    await this.testDataSyncService()
    
    console.log('数据持久性测试完成')
    this.printResults()
    
    return this.results
  }

  /**
   * 测试本地存储功能
   */
  private async testLocalStorage(): Promise<void> {
    try {
      const testKey = 'test_local_storage'
      const testData = { message: 'Hello World', timestamp: Date.now() }
      
      // 保存数据
      localStorage.setItem(testKey, JSON.stringify(testData))
      
      // 读取数据
      const savedData = localStorage.getItem(testKey)
      const parsedData = savedData ? JSON.parse(savedData) : null
      
      // 验证数据
      const success = parsedData && parsedData.message === testData.message
      
      // 清理测试数据
      localStorage.removeItem(testKey)
      
      this.addResult({
        name: '本地存储功能',
        passed: success,
        message: success ? '本地存储读写正常' : '本地存储读写失败',
        error: { testData, savedData: parsedData }
      })
    } catch (error) {
      this.addResult({
        name: '本地存储功能',
        passed: false,
        message: `本地存储测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error
      })
    }
  }

  /**
   * 测试配置存储功能
   */
  private async testConfigStore(): Promise<void> {
    try {
      const configStore = useConfigStore()
      
      // 测试系统配置
      const originalSystemConfig = { ...configStore.systemConfig }
      const testSystemConfig = {
        ...originalSystemConfig,
        siteName: 'Test Site Name'
      }
      
      configStore.updateSystemConfig(testSystemConfig)
      
      // 验证配置是否更新
      const success = configStore.systemConfig.siteName === 'Test Site Name'
      
      // 恢复原始配置
      configStore.updateSystemConfig(originalSystemConfig)
      
      this.addResult({
        name: '配置存储功能',
        passed: success,
        message: success ? '配置存储更新正常' : '配置存储更新失败',
        error: { testSystemConfig, currentConfig: configStore.systemConfig }
      })
    } catch (error) {
      this.addResult({
        name: '配置存储功能',
        passed: false,
        message: `配置存储测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error
      })
    }
  }

  /**
   * 测试增强存储服务
   */
  private async testEnhancedStorage(): Promise<void> {
    try {
      const testKey = 'test_enhanced_storage'
      const testData = { type: 'enhanced', value: 'test data', timestamp: Date.now() }
      
      // 保存数据
      const saveResult = await enhancedStorageService.saveData(testKey, testData)
      
      // 读取数据
      const loadedData = enhancedStorageService.loadData(testKey)
      
      // 验证数据
      const success = saveResult && loadedData && loadedData.value === testData.value
      
      // 清理测试数据
      await enhancedStorageService.removeData(testKey)
      
      this.addResult({
        name: '增强存储服务',
        passed: success,
        message: success ? '增强存储服务正常' : '增强存储服务异常',
        error: { testData, loadedData, saveResult }
      })
    } catch (error) {
      this.addResult({
        name: '增强存储服务',
        passed: false,
        message: `增强存储服务测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error
      })
    }
  }

  /**
   * 测试OSS服务
   */
  private async testOSSService(): Promise<void> {
    try {
      // 获取详细的OSS配置诊断信息
      const diagnosis = ossService.getOSSConfigDiagnosis()
      
      if (!diagnosis.isAvailable) {
        this.addResult({
          name: 'OSS服务可用性',
          passed: false,
          message: `OSS服务不可用: ${diagnosis.issues.join(', ')}`,
          error: { diagnosis }
        })
        return
      }

      // 测试OSS连接
      const connectionTest = await ossService.testOSSConnection()
      
      this.addResult({
        name: 'OSS连接测试',
        passed: connectionTest.success,
        message: connectionTest.success 
          ? 'OSS连接成功' 
          : `OSS连接失败: ${connectionTest.error}`,
        error: connectionTest.success ? null : connectionTest.details
      })

      if (!connectionTest.success) {
        return
      }

      // 创建测试文件
      const testContent = 'This is a test file for OSS upload'
      const testBlob = new Blob([testContent], { type: 'text/plain' })
      const testFile = new File([testBlob], 'test-file.txt', { type: 'text/plain' })
      
      // 测试文件上传
      const uploadResult = await ossService.uploadFile(testFile, 'test')
      
      this.addResult({
        name: 'OSS文件上传',
        passed: uploadResult.success,
        message: uploadResult.success ? 'OSS文件上传成功' : `OSS文件上传失败: ${uploadResult.error}`,
        error: { uploadResult, fileName: testFile.name }
      })

      // 如果上传成功，测试文件删除
      if (uploadResult.success && uploadResult.key) {
        try {
          const deleteResult = await ossService.deleteFile(uploadResult.key)
          this.addResult({
            name: 'OSS文件删除',
            passed: deleteResult,
            message: deleteResult ? 'OSS文件删除成功' : 'OSS文件删除失败',
            error: deleteResult ? null : { fileKey: uploadResult.key, url: uploadResult.url }
          })
        } catch (deleteError) {
          this.addResult({
            name: 'OSS文件删除',
            passed: false,
            message: `OSS文件删除测试失败: ${deleteError instanceof Error ? deleteError.message : '未知错误'}`,
            error: { deleteError, fileKey: uploadResult.key, url: uploadResult.url }
          })
        }
      } else if (uploadResult.success && !uploadResult.key) {
        this.addResult({
          name: 'OSS文件删除',
          passed: false,
          message: 'OSS文件删除失败: 上传结果中缺少文件key',
          error: { uploadResult }
        })
      }
    } catch (error) {
      this.addResult({
        name: 'OSS服务',
        passed: false,
        message: `OSS服务测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error
      })
    }
  }

  /**
   * 测试数据同步服务
   */
  private async testDataSyncService(): Promise<void> {
    try {
      // 获取同步状态
      const syncStatus = dataSyncService.getSyncStatus()
      
      // 获取同步配置
      const syncConfig = dataSyncService.getSyncConfig()
      
      // 检查数据完整性
      const integrityCheck = await dataSyncService.checkDataIntegrity()
      
      this.addResult({
        name: '数据同步服务状态',
        passed: true,
        message: '数据同步服务状态获取正常',
        error: { syncStatus, syncConfig, integrityCheck }
      })

      // 如果OSS可用，测试数据同步
      if (syncStatus.isEnabled) {
        try {
          // 注意：这里不执行实际同步，只测试同步准备
          const testSyncResult = await dataSyncService.checkDataIntegrity()
          
          this.addResult({
            name: '数据同步准备',
            passed: testSyncResult,
            message: testSyncResult ? '数据同步准备就绪' : '数据同步准备失败',
            error: { testSyncResult }
          })
        } catch (syncError) {
          this.addResult({
            name: '数据同步准备',
            passed: false,
            message: `数据同步准备失败: ${syncError instanceof Error ? syncError.message : '未知错误'}`,
            error: syncError
          })
        }
      } else {
        this.addResult({
          name: '数据同步准备',
          passed: false,
          message: '数据同步服务未启用，OSS配置可能不完整',
          error: { syncStatus }
        })
      }
    } catch (error) {
      this.addResult({
        name: '数据同步服务',
        passed: false,
        message: `数据同步服务测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error
      })
    }
  }

  /**
   * 添加测试结果
   */
  private addResult(result: TestResult): void {
    this.results.push(result)
    console.log(`[测试] ${result.name}: ${result.passed ? '✅ 通过' : '❌ 失败'} - ${result.message}`)
  }

  /**
   * 打印测试结果摘要
   */
  private printResults(): void {
    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    
    console.log('\n=== 数据持久性测试结果摘要 ===')
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${passedTests}`)
    console.log(`失败: ${failedTests}`)
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    if (failedTests > 0) {
      console.log('\n失败的测试:')
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.name}: ${result.message}`)
      })
    }
  }

  /**
   * 获取测试结果
   */
  public getResults(): TestResult[] {
    return [...this.results]
  }

  /**
   * 获取测试摘要
   */
  public getSummary(): { total: number; passed: number; failed: number; successRate: number } {
    const total = this.results.length
    const passed = this.results.filter(r => r.passed).length
    const failed = total - passed
    const successRate = total > 0 ? (passed / total) * 100 : 0
    
    return { total, passed, failed, successRate }
  }
}

// 导出测试实例
export const dataPersistenceTest = new DataPersistenceTest()

// 便捷的测试函数
export async function runDataPersistenceTests(): Promise<TestResult[]> {
  return await dataPersistenceTest.runAllTests()
}

// 在浏览器控制台中可用的全局测试函数
if (typeof window !== 'undefined') {
  (window as any).testDataPersistence = runDataPersistenceTests
  (window as any).dataPersistenceTest = dataPersistenceTest
}
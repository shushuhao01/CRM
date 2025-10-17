/**
 * 数据迁移工具
 * 用于将本地存储的数据迁移到服务器数据库
 */

import { productApi } from '@/api/product'
import { PersistentStorage } from './storage'
import type { Product } from '@/types/product'

interface MigrationResult {
  success: boolean
  total: number
  migrated: number
  failed: number
  errors: Array<{ item: any; error: string }>
}

interface MigrationOptions {
  batchSize?: number
  skipExisting?: boolean
  validateData?: boolean
  onProgress?: (progress: { current: number; total: number; item: any }) => void
}

export class DataMigration {
  private storage = new PersistentStorage()

  /**
   * 迁移商品数据到服务器
   */
  async migrateProducts(options: MigrationOptions = {}): Promise<MigrationResult> {
    const {
      batchSize = 10,
      skipExisting = true,
      validateData = true,
      onProgress
    } = options

    const result: MigrationResult = {
      success: false,
      total: 0,
      migrated: 0,
      failed: 0,
      errors: []
    }

    try {
      // 从本地存储获取商品数据
      const localData = this.storage.load('crm_store_product')
      if (!localData || !localData.products) {
        console.log('[DataMigration] 没有找到本地商品数据')
        result.success = true
        return result
      }

      const products: Product[] = localData.products
      result.total = products.length

      console.log(`[DataMigration] 开始迁移 ${products.length} 个商品到服务器`)

      // 分批处理
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize)
        
        for (const product of batch) {
          try {
            // 数据验证
            if (validateData && !this.validateProduct(product)) {
              result.errors.push({
                item: product,
                error: '数据验证失败'
              })
              result.failed++
              continue
            }

            // 检查是否跳过已存在的数据
            if (skipExisting) {
              try {
                const existing = await productApi.getDetail(String(product.id))
                if (existing) {
                  console.log(`[DataMigration] 跳过已存在的商品: ${product.name}`)
                  continue
                }
              } catch (error) {
                // 商品不存在，继续创建
              }
            }

            // 创建商品
            await productApi.create(product)
            result.migrated++
            
            console.log(`[DataMigration] 成功迁移商品: ${product.name}`)

            // 进度回调
            if (onProgress) {
              onProgress({
                current: result.migrated + result.failed,
                total: result.total,
                item: product
              })
            }

          } catch (error) {
            console.error(`[DataMigration] 迁移商品失败: ${product.name}`, error)
            result.errors.push({
              item: product,
              error: error instanceof Error ? error.message : '未知错误'
            })
            result.failed++
          }
        }

        // 批次间延迟，避免服务器压力过大
        if (i + batchSize < products.length) {
          await this.delay(100)
        }
      }

      result.success = result.failed === 0
      console.log(`[DataMigration] 迁移完成: 成功 ${result.migrated}, 失败 ${result.failed}`)

    } catch (error) {
      console.error('[DataMigration] 迁移过程发生错误:', error)
      result.errors.push({
        item: null,
        error: error instanceof Error ? error.message : '迁移过程发生未知错误'
      })
    }

    return result
  }

  /**
   * 导出本地数据
   */
  exportLocalData(): { products: Product[] } | null {
    try {
      const localData = this.storage.load('crm_store_product')
      if (!localData || !localData.products) {
        return null
      }

      return {
        products: localData.products.filter((p: Product) => !p.deleted)
      }
    } catch (error) {
      console.error('[DataMigration] 导出本地数据失败:', error)
      return null
    }
  }

  /**
   * 导入数据到本地存储
   */
  importToLocal(data: { products: Product[] }): boolean {
    try {
      const currentData = this.storage.load('crm_store_product') || {}
      const updatedData = {
        ...currentData,
        products: data.products,
        updateTime: new Date().toISOString()
      }

      this.storage.save('crm_store_product', updatedData)
      console.log(`[DataMigration] 成功导入 ${data.products.length} 个商品到本地存储`)
      return true
    } catch (error) {
      console.error('[DataMigration] 导入数据到本地存储失败:', error)
      return false
    }
  }

  /**
   * 清除本地数据
   */
  clearLocalData(): boolean {
    try {
      this.storage.remove('crm_store_product')
      console.log('[DataMigration] 已清除本地商品数据')
      return true
    } catch (error) {
      console.error('[DataMigration] 清除本地数据失败:', error)
      return false
    }
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus(): Promise<{
    hasLocalData: boolean
    localCount: number
    serverCount: number
    needsMigration: boolean
  }> {
    const localData = this.storage.load('crm_store_product')
    const localCount = localData?.products?.length || 0
    
    let serverCount = 0
    try {
      const serverData = await productApi.getList({ page: 1, pageSize: 1 })
      serverCount = serverData.total || 0
    } catch (error) {
      console.warn('[DataMigration] 无法获取服务器数据统计:', error)
    }

    return {
      hasLocalData: localCount > 0,
      localCount,
      serverCount,
      needsMigration: localCount > 0 && serverCount === 0
    }
  }

  /**
   * 验证商品数据
   */
  private validateProduct(product: Product): boolean {
    return !!(
      product.id &&
      product.name &&
      product.code &&
      typeof product.price === 'number' &&
      product.price >= 0
    )
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建单例实例
export const dataMigration = new DataMigration()

// 导出便捷方法
export const migrateProductsToServer = (options?: MigrationOptions) => 
  dataMigration.migrateProducts(options)

export const exportLocalProducts = () => 
  dataMigration.exportLocalData()

export const importProductsToLocal = (data: { products: Product[] }) => 
  dataMigration.importToLocal(data)

export const clearLocalProducts = () => 
  dataMigration.clearLocalData()

export const getMigrationStatus = () => 
  dataMigration.getMigrationStatus()
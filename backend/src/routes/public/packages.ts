import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

import { log } from '../../config/logger';
const router = Router()

// 确保私有套餐有年度授权价（首次请求时检查）
let privateAnnualPriceChecked = false
async function ensurePrivateAnnualPrice(): Promise<void> {
  if (privateAnnualPriceChecked) return
  try {
    // 检查 yearly_price 字段是否存在
    const cols = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages'
       AND COLUMN_NAME = 'yearly_price'`
    )
    if (cols.length === 0) {
      privateAnnualPriceChecked = true
      return
    }
    // 为缺少年度价格的私有套餐初始化（约永久价的38%，约3年回本）
    const result = await AppDataSource.query(
      `UPDATE tenant_packages SET yearly_price = ROUND(price * 0.38, -2)
       WHERE type = 'private' AND price > 0
       AND (yearly_price IS NULL OR yearly_price = 0)`
    )
    if (result.affectedRows > 0) {
      log.info(`[public/packages] ✅ 已为 ${result.affectedRows} 个私有套餐初始化年度授权价`)
    }
    privateAnnualPriceChecked = true
  } catch (_e) {
    privateAnnualPriceChecked = true // 避免重复报错
  }
}

// 获取官网展示的套餐列表（公开接口）
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensurePrivateAnnualPrice()

    const { type } = req.query

    let sql = `
      SELECT *
      FROM tenant_packages
      WHERE status = 1 AND is_visible = 1
    `

    const params: any[] = []

    if (type && (type === 'saas' || type === 'private')) {
      sql += ' AND type = ?'
      params.push(type)
    }

    sql += ' ORDER BY sort_order ASC, id ASC'

    const packages = await AppDataSource.query(sql, params)

    const result = packages.map((pkg: any) => {
      const mapped: any = {
        ...pkg,
        features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []),
        is_trial: Boolean(pkg.is_trial),
        is_recommended: Boolean(pkg.is_recommended),
        yearly_discount_rate: Number(pkg.yearly_discount_rate) || 0,
        yearly_bonus_months: Number(pkg.yearly_bonus_months) || 0,
        yearly_price: pkg.yearly_price ? Number(pkg.yearly_price) : null,
        subscription_enabled: Boolean(pkg.subscription_enabled),
        subscription_channels: pkg.subscription_channels || 'all',
        subscription_billing_cycle: pkg.subscription_billing_cycle || 'monthly',
        subscription_discount_rate: Number(pkg.subscription_discount_rate) || 0
      }
      // 计算订阅价格（仅当启用订阅时）
      if (mapped.subscription_enabled && mapped.subscription_discount_rate > 0) {
        mapped.subscription_price = Number((mapped.price * (1 - mapped.subscription_discount_rate / 100)).toFixed(2))
      } else if (mapped.subscription_enabled) {
        mapped.subscription_price = Number(mapped.price)
      }
      return mapped
    })

    res.json({
      code: 0,
      data: result,
      message: 'success'
    })
  } catch (error) {
    log.error('获取套餐列表失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取套餐列表失败'
    })
  }
})


// 获取单个套餐详情（公开接口）
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params

    const packages = await AppDataSource.query(
      `SELECT * FROM tenant_packages WHERE code = ? AND status = 1 LIMIT 1`,
      [code]
    )

    if (packages.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '套餐不存在'
      })
    }

    const pkg = packages[0]
    res.json({
      code: 0,
      data: {
        ...pkg,
        features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features,
        is_trial: Boolean(pkg.is_trial),
        is_recommended: Boolean(pkg.is_recommended)
      },
      message: 'success'
    })
  } catch (error) {
    log.error('获取套餐详情失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取套餐详情失败'
    })
  }
})

export default router

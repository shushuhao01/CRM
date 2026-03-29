import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

const router = Router()

// 标记年付字段是否存在
let yearlyColumnsExist: boolean | null = null
let privateAnnualPriceInitialized = false

// 初始化私有部署套餐的年度授权价（约永久价的38%，约3年回本）
async function initPrivateAnnualPrice(): Promise<void> {
  if (privateAnnualPriceInitialized) return
  try {
    const result = await AppDataSource.query(
      `UPDATE tenant_packages SET yearly_price = ROUND(price * 0.38, -2)
       WHERE type = 'private' AND price > 0
       AND (yearly_price IS NULL OR yearly_price = 0)`
    )
    if (result.affectedRows > 0) {
      console.log(`[packages] ✅ 已为 ${result.affectedRows} 个私有套餐初始化年度授权价（约3.8折）`)
    }
    privateAnnualPriceInitialized = true
  } catch (e) {
    console.error('[packages] 初始化私有套餐年度价格失败:', e)
  }
}

// 检查并自动添加年付优惠字段到 tenant_packages 表
async function ensureYearlyColumns(): Promise<boolean> {
  if (yearlyColumnsExist !== null) {
    // 字段已确认存在，但还没初始化私有套餐年度价格
    if (!privateAnnualPriceInitialized) {
      await initPrivateAnnualPrice()
    }
    return yearlyColumnsExist
  }
  try {
    const columns = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages'
       AND COLUMN_NAME IN ('yearly_discount_rate', 'yearly_bonus_months', 'yearly_price')`
    )
    if (columns.length >= 3) {
      yearlyColumnsExist = true
      await initPrivateAnnualPrice()
      return true
    }
    // 字段不存在，自动添加
    console.log('[packages] 检测到 tenant_packages 缺少年付字段，正在自动添加...')
    const existingCols = columns.map((c: any) => c.COLUMN_NAME)
    if (!existingCols.includes('yearly_discount_rate')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN yearly_discount_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '年付折扣率' AFTER billing_cycle`
      )
    }
    if (!existingCols.includes('yearly_bonus_months')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN yearly_bonus_months INT DEFAULT 0 COMMENT '年付赠送月数' AFTER yearly_discount_rate`
      )
    }
    if (!existingCols.includes('yearly_price')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN yearly_price DECIMAL(10,2) DEFAULT NULL COMMENT '年付价格' AFTER yearly_bonus_months`
      )
    }
    // 初始化SaaS套餐的年付配置（送2个月）
    await AppDataSource.query(
      `UPDATE tenant_packages SET yearly_bonus_months = 2, yearly_price = price * 10
       WHERE type = 'saas' AND billing_cycle = 'monthly' AND price > 0
       AND yearly_bonus_months = 0 AND (yearly_price IS NULL OR yearly_price = 0)`
    )
    // 初始化私有套餐年度价格
    await initPrivateAnnualPrice()
    console.log('[packages] ✅ 年付字段添加成功，SaaS套餐已初始化年付配置（送2个月），私有套餐已初始化年度授权价')
    yearlyColumnsExist = true
    return true
  } catch (error) {
    console.error('[packages] 添加年付字段失败:', error)
    yearlyColumnsExist = false
    return false
  }
}

// 获取所有套餐列表（管理后台）
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureYearlyColumns()
    const { type, status } = req.query

    let sql = 'SELECT * FROM tenant_packages WHERE 1=1'
    const params: any[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }

    if (status !== undefined) {
      sql += ' AND status = ?'
      params.push(status)
    }

    sql += ' ORDER BY sort_order ASC, id ASC'

    const packages = await AppDataSource.query(sql, params)

    const result = packages.map((pkg: any) => ({
      ...pkg,
      features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []),
      modules: typeof pkg.modules === 'string' ? JSON.parse(pkg.modules) : (pkg.modules || []),
      is_trial: Boolean(pkg.is_trial),
      is_recommended: Boolean(pkg.is_recommended),
      is_visible: Boolean(pkg.is_visible),
      status: Boolean(pkg.status),
      yearly_discount_rate: Number(pkg.yearly_discount_rate) || 0,
      yearly_bonus_months: Number(pkg.yearly_bonus_months) || 0,
      yearly_price: pkg.yearly_price ? Number(pkg.yearly_price) : null
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('获取套餐列表失败:', error)
    res.status(500).json({ success: false, message: '获取套餐列表失败' })
  }
})

// 创建套餐
router.post('/', async (req: Request, res: Response) => {
  try {
    const hasYearly = await ensureYearlyColumns()
    const {
      name, code, type, description, price, original_price,
      billing_cycle, yearly_discount_rate, yearly_bonus_months, yearly_price,
      duration_days, max_users, max_storage_gb,
      features, modules, is_trial, is_recommended, is_visible, sort_order
    } = req.body

    if (!name || !code || !type) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    const existing = await AppDataSource.query(
      'SELECT id FROM tenant_packages WHERE code = ?', [code]
    )
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '套餐代码已存在' })
    }

    let insertSql: string
    let insertParams: any[]

    if (hasYearly) {
      insertSql = `INSERT INTO tenant_packages
       (name, code, type, description, price, original_price, billing_cycle,
        yearly_discount_rate, yearly_bonus_months, yearly_price,
        duration_days, max_users, max_storage_gb, features, modules, is_trial,
        is_recommended, is_visible, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      insertParams = [
        name, code, type, description || '', price || 0, original_price || price || 0,
        billing_cycle || 'monthly',
        yearly_discount_rate || 0, yearly_bonus_months || 0, yearly_price || null,
        duration_days || 30, max_users || 10,
        max_storage_gb || 5, JSON.stringify(features || []), JSON.stringify(modules || []),
        is_trial ? 1 : 0, is_recommended ? 1 : 0, is_visible !== false ? 1 : 0,
        sort_order || 0
      ]
    } else {
      insertSql = `INSERT INTO tenant_packages
       (name, code, type, description, price, original_price, billing_cycle,
        duration_days, max_users, max_storage_gb, features, modules, is_trial,
        is_recommended, is_visible, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      insertParams = [
        name, code, type, description || '', price || 0, original_price || price || 0,
        billing_cycle || 'monthly', duration_days || 30, max_users || 10,
        max_storage_gb || 5, JSON.stringify(features || []), JSON.stringify(modules || []),
        is_trial ? 1 : 0, is_recommended ? 1 : 0, is_visible !== false ? 1 : 0,
        sort_order || 0
      ]
    }

    const result = await AppDataSource.query(insertSql, insertParams)
    res.json({ success: true, data: { id: result.insertId }, message: '创建成功' })
  } catch (error) {
    console.error('创建套餐失败:', error)
    res.status(500).json({ success: false, message: '创建套餐失败' })
  }
})

// 更新套餐
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const hasYearly = await ensureYearlyColumns()
    const { id } = req.params
    const {
      name, description, price, original_price, billing_cycle,
      yearly_discount_rate, yearly_bonus_months, yearly_price,
      duration_days, max_users, max_storage_gb, features, modules,
      is_trial, is_recommended, is_visible, sort_order, status
    } = req.body

    let updateSql: string
    let updateParams: any[]

    if (hasYearly) {
      updateSql = `UPDATE tenant_packages SET
       name = ?, description = ?, price = ?, original_price = ?,
       billing_cycle = ?, yearly_discount_rate = ?, yearly_bonus_months = ?, yearly_price = ?,
       duration_days = ?, max_users = ?,
       max_storage_gb = ?, features = ?, modules = ?, is_trial = ?,
       is_recommended = ?, is_visible = ?, sort_order = ?, status = ?
       WHERE id = ?`
      updateParams = [
        name, description, price, original_price, billing_cycle,
        yearly_discount_rate || 0, yearly_bonus_months || 0, yearly_price || null,
        duration_days, max_users, max_storage_gb,
        JSON.stringify(features || []), JSON.stringify(modules || []), is_trial ? 1 : 0,
        is_recommended ? 1 : 0, is_visible ? 1 : 0, sort_order || 0,
        status ? 1 : 0, id
      ]
    } else {
      updateSql = `UPDATE tenant_packages SET
       name = ?, description = ?, price = ?, original_price = ?,
       billing_cycle = ?, duration_days = ?, max_users = ?,
       max_storage_gb = ?, features = ?, modules = ?, is_trial = ?,
       is_recommended = ?, is_visible = ?, sort_order = ?, status = ?
       WHERE id = ?`
      updateParams = [
        name, description, price, original_price, billing_cycle,
        duration_days, max_users, max_storage_gb,
        JSON.stringify(features || []), JSON.stringify(modules || []), is_trial ? 1 : 0,
        is_recommended ? 1 : 0, is_visible ? 1 : 0, sort_order || 0,
        status ? 1 : 0, id
      ]
    }

    await AppDataSource.query(updateSql, updateParams)
    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新套餐失败:', error)
    res.status(500).json({ success: false, message: '更新套餐失败' })
  }
})

// 删除套餐
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await AppDataSource.query('DELETE FROM tenant_packages WHERE id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除套餐失败:', error)
    res.status(500).json({ success: false, message: '删除套餐失败' })
  }
})

export default router

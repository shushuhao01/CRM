import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

const router = Router()

// 获取所有套餐列表（管理后台）
router.get('/', async (req: Request, res: Response) => {
  try {
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
      features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features,
      is_trial: Boolean(pkg.is_trial),
      is_recommended: Boolean(pkg.is_recommended),
      is_visible: Boolean(pkg.is_visible),
      status: Boolean(pkg.status)
    }))

    res.json({ code: 0, data: result })
  } catch (error) {
    console.error('获取套餐列表失败:', error)
    res.status(500).json({ code: 500, message: '获取套餐列表失败' })
  }
})

// 创建套餐
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, code, type, description, price, original_price,
      billing_cycle, duration_days, max_users, max_storage_gb,
      features, is_trial, is_recommended, is_visible, sort_order
    } = req.body

    if (!name || !code || !type) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' })
    }

    // 检查 code 是否已存在
    const existing = await AppDataSource.query(
      'SELECT id FROM tenant_packages WHERE code = ?',
      [code]
    )
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '套餐代码已存在' })
    }

    const result = await AppDataSource.query(
      `INSERT INTO tenant_packages
       (name, code, type, description, price, original_price, billing_cycle,
        duration_days, max_users, max_storage_gb, features, is_trial,
        is_recommended, is_visible, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name, code, type, description || '', price || 0, original_price || price || 0,
        billing_cycle || 'monthly', duration_days || 30, max_users || 10,
        max_storage_gb || 5, JSON.stringify(features || []),
        is_trial ? 1 : 0, is_recommended ? 1 : 0, is_visible !== false ? 1 : 0,
        sort_order || 0
      ]
    )

    res.json({ code: 0, data: { id: result.insertId }, message: '创建成功' })
  } catch (error) {
    console.error('创建套餐失败:', error)
    res.status(500).json({ code: 500, message: '创建套餐失败' })
  }
})


// 更新套餐
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      name, description, price, original_price, billing_cycle,
      duration_days, max_users, max_storage_gb, features,
      is_trial, is_recommended, is_visible, sort_order, status
    } = req.body

    await AppDataSource.query(
      `UPDATE tenant_packages SET
       name = ?, description = ?, price = ?, original_price = ?,
       billing_cycle = ?, duration_days = ?, max_users = ?,
       max_storage_gb = ?, features = ?, is_trial = ?,
       is_recommended = ?, is_visible = ?, sort_order = ?, status = ?
       WHERE id = ?`,
      [
        name, description, price, original_price, billing_cycle,
        duration_days, max_users, max_storage_gb,
        JSON.stringify(features || []), is_trial ? 1 : 0,
        is_recommended ? 1 : 0, is_visible ? 1 : 0, sort_order || 0,
        status ? 1 : 0, id
      ]
    )

    res.json({ code: 0, message: '更新成功' })
  } catch (error) {
    console.error('更新套餐失败:', error)
    res.status(500).json({ code: 500, message: '更新套餐失败' })
  }
})

// 删除套餐
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await AppDataSource.query('DELETE FROM tenant_packages WHERE id = ?', [id])
    res.json({ code: 0, message: '删除成功' })
  } catch (error) {
    console.error('删除套餐失败:', error)
    res.status(500).json({ code: 500, message: '删除套餐失败' })
  }
})

export default router

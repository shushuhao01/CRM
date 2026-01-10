import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

const router = Router()

// 获取官网展示的套餐列表（公开接口）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query

    let sql = `
      SELECT
        id, name, code, type, description,
        price, original_price, billing_cycle, duration_days,
        max_users, max_storage_gb, features,
        is_trial, is_recommended, sort_order
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

    // 解析 features JSON
    const result = packages.map((pkg: any) => ({
      ...pkg,
      features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features,
      is_trial: Boolean(pkg.is_trial),
      is_recommended: Boolean(pkg.is_recommended)
    }))

    res.json({
      code: 0,
      data: result,
      message: 'success'
    })
  } catch (error) {
    console.error('获取套餐列表失败:', error)
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
    console.error('获取套餐详情失败:', error)
    res.status(500).json({
      code: 500,
      message: '获取套餐详情失败'
    })
  }
})

export default router

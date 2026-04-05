import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

import { log } from '../../config/logger';
const router = Router()

// 标记年付字段是否存在
let yearlyColumnsExist: boolean | null = null
let privateAnnualPriceInitialized = false
// 标记订阅字段是否存在
let subscriptionColumnsExist: boolean | null = null

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
      log.info(`[packages] ✅ 已为 ${result.affectedRows} 个私有套餐初始化年度授权价（约3.8折）`)
    }
    privateAnnualPriceInitialized = true
  } catch (e) {
    log.error('[packages] 初始化私有套餐年度价格失败:', e)
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
    log.info('[packages] 检测到 tenant_packages 缺少年付字段，正在自动添加...')
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
    log.info('[packages] ✅ 年付字段添加成功，SaaS套餐已初始化年付配置（送2个月），私有套餐已初始化年度授权价')
    yearlyColumnsExist = true
    return true
  } catch (error) {
    log.error('[packages] 添加年付字段失败:', error)
    yearlyColumnsExist = false
    return false
  }
}

// 检查并自动添加订阅相关字段到 tenant_packages 表
async function ensureSubscriptionColumns(): Promise<boolean> {
  if (subscriptionColumnsExist !== null) return subscriptionColumnsExist
  try {
    const columns = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages'
       AND COLUMN_NAME IN ('subscription_enabled', 'subscription_channels', 'subscription_discount_rate', 'subscription_billing_cycle')`
    )
    if (columns.length >= 4) {
      subscriptionColumnsExist = true
      await ensureSubscriptionTables()
      return true
    }
    log.info('[packages] 检测到 tenant_packages 缺少订阅字段，正在自动添加...')
    const existingCols = columns.map((c: any) => c.COLUMN_NAME)
    if (!existingCols.includes('subscription_enabled')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN subscription_enabled TINYINT(1) DEFAULT 0 COMMENT '是否支持订阅模式：0-不支持 1-支持'`
      )
    }
    if (!existingCols.includes('subscription_channels')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN subscription_channels VARCHAR(50) DEFAULT 'all' COMMENT '订阅渠道：wechat/alipay/all'`
      )
    }
    if (!existingCols.includes('subscription_billing_cycle')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN subscription_billing_cycle VARCHAR(20) DEFAULT 'monthly' COMMENT '订阅计费周期：monthly/yearly/both'`
      )
    }
    if (!existingCols.includes('subscription_discount_rate')) {
      await AppDataSource.query(
        `ALTER TABLE tenant_packages ADD COLUMN subscription_discount_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '订阅优惠折扣率（百分比）'`
      )
    }
    log.info('[packages] ✅ 订阅字段添加成功（含subscription_billing_cycle）')
    subscriptionColumnsExist = true
    await ensureSubscriptionTables()
    return true
  } catch (error) {
    log.error('[packages] 添加订阅字段失败:', error)
    subscriptionColumnsExist = false
    return false
  }
}

// 确保订阅相关表存在
async function ensureSubscriptionTables(): Promise<void> {
  try {
    // 检查 subscriptions 表
    const subTable = await AppDataSource.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'`
    )
    if (subTable.length === 0) {
      await AppDataSource.query(`
        CREATE TABLE subscriptions (
          id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '订阅ID',
          tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
          package_id INT NOT NULL COMMENT '套餐ID',
          status ENUM('signing','active','paused','cancelled','expired') DEFAULT 'signing' COMMENT '订阅状态',
          channel ENUM('wechat','alipay') NOT NULL COMMENT '订阅渠道',
          wechat_contract_id VARCHAR(100) DEFAULT NULL COMMENT '微信签约协议号',
          wechat_plan_id VARCHAR(100) DEFAULT NULL COMMENT '微信代扣计划编号',
          alipay_agreement_no VARCHAR(100) DEFAULT NULL COMMENT '支付宝协议号',
          amount DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '每期扣款金额',
          billing_cycle ENUM('monthly','yearly') DEFAULT 'monthly' COMMENT '扣款周期',
          next_deduct_date DATE DEFAULT NULL COMMENT '下次扣款日期',
          last_deduct_date DATE DEFAULT NULL COMMENT '最近扣款日期',
          sign_date DATETIME DEFAULT NULL COMMENT '签约时间',
          cancel_date DATETIME DEFAULT NULL COMMENT '取消时间',
          total_deducted DECIMAL(10,2) DEFAULT 0 COMMENT '累计扣款金额',
          deduct_count INT DEFAULT 0 COMMENT '已扣款次数',
          fail_count INT DEFAULT 0 COMMENT '连续失败次数',
          source ENUM('register','renew','upgrade') DEFAULT 'register' COMMENT '订阅来源',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_sub_tenant (tenant_id),
          INDEX idx_sub_status (status),
          INDEX idx_sub_next_deduct (next_deduct_date),
          INDEX idx_sub_channel (channel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅记录表'
      `)
      log.info('[packages] ✅ subscriptions 表创建成功')
    }

    // 检查 subscription_deduct_logs 表
    const deductTable = await AppDataSource.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_deduct_logs'`
    )
    if (deductTable.length === 0) {
      await AppDataSource.query(`
        CREATE TABLE subscription_deduct_logs (
          id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '扣款记录ID',
          subscription_id VARCHAR(36) NOT NULL COMMENT '订阅ID',
          tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
          amount DECIMAL(10,2) NOT NULL COMMENT '扣款金额',
          channel ENUM('wechat','alipay') NOT NULL COMMENT '扣款渠道',
          status ENUM('pending','success','failed') DEFAULT 'pending' COMMENT '扣款状态',
          trade_no VARCHAR(100) DEFAULT NULL COMMENT '第三方交易号',
          payment_order_id VARCHAR(36) DEFAULT NULL COMMENT '关联payment_orders',
          deduct_date DATE NOT NULL COMMENT '扣款日期',
          executed_at DATETIME DEFAULT NULL COMMENT '执行时间',
          retry_count INT DEFAULT 0 COMMENT '重试次数',
          max_retry INT DEFAULT 3 COMMENT '最大重试次数',
          next_retry_at DATETIME DEFAULT NULL COMMENT '下次重试时间',
          error_code VARCHAR(50) DEFAULT NULL COMMENT '错误代码',
          error_msg TEXT DEFAULT NULL COMMENT '错误信息',
          period_number INT DEFAULT 1 COMMENT '第几期',
          billing_start DATE DEFAULT NULL COMMENT '本期开始日',
          billing_end DATE DEFAULT NULL COMMENT '本期结束日',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_deduct_sub (subscription_id),
          INDEX idx_deduct_tenant (tenant_id),
          INDEX idx_deduct_status (status),
          INDEX idx_deduct_date (deduct_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅扣款明细表'
      `)
      log.info('[packages] ✅ subscription_deduct_logs 表创建成功')
    }

    // 检查 member_login_logs 表
    const memberTable = await AppDataSource.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_login_logs'`
    )
    if (memberTable.length === 0) {
      await AppDataSource.query(`
        CREATE TABLE member_login_logs (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
          ip VARCHAR(45) DEFAULT NULL COMMENT '登录IP',
          user_agent VARCHAR(500) DEFAULT NULL COMMENT '浏览器UA',
          login_type ENUM('password','sms_code') DEFAULT 'password' COMMENT '登录方式',
          login_result ENUM('success','failed') DEFAULT 'success' COMMENT '登录结果',
          fail_reason VARCHAR(200) DEFAULT NULL COMMENT '失败原因',
          login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_member_tenant (tenant_id),
          INDEX idx_member_login_at (login_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员登录日志表'
      `)
      log.info('[packages] ✅ member_login_logs 表创建成功')
    }

    // 确保 tenants 表有 password_hash 和 last_login_at 字段
    const tenantCols = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants'
       AND COLUMN_NAME IN ('password_hash', 'last_login_at')`
    )
    const tenantExistingCols = tenantCols.map((c: any) => c.COLUMN_NAME)
    if (!tenantExistingCols.includes('password_hash')) {
      await AppDataSource.query(
        `ALTER TABLE tenants ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL COMMENT '会员中心登录密码（bcrypt哈希）'`
      )
      log.info('[packages] ✅ tenants.password_hash 字段添加成功')
    }
    if (!tenantExistingCols.includes('last_login_at')) {
      await AppDataSource.query(
        `ALTER TABLE tenants ADD COLUMN last_login_at DATETIME DEFAULT NULL COMMENT '最近会员中心登录时间'`
      )
      log.info('[packages] ✅ tenants.last_login_at 字段添加成功')
    }
  } catch (error) {
    log.error('[packages] 创建订阅相关表/字段失败:', error)
  }
}

// 获取所有套餐列表（管理后台）
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureYearlyColumns()
    await ensureSubscriptionColumns()
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
      yearly_price: pkg.yearly_price ? Number(pkg.yearly_price) : null,
      subscription_enabled: Boolean(pkg.subscription_enabled),
      subscription_channels: pkg.subscription_channels || 'all',
      subscription_billing_cycle: pkg.subscription_billing_cycle || 'monthly',
      subscription_discount_rate: Number(pkg.subscription_discount_rate) || 0
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    log.error('获取套餐列表失败:', error)
    res.status(500).json({ success: false, message: '获取套餐列表失败' })
  }
})

// 创建套餐
router.post('/', async (req: Request, res: Response) => {
  try {
    const hasYearly = await ensureYearlyColumns()
    const hasSub = await ensureSubscriptionColumns()
    const {
      name, code, type, description, price, original_price,
      billing_cycle, yearly_discount_rate, yearly_bonus_months, yearly_price,
      subscription_enabled, subscription_channels, subscription_billing_cycle, subscription_discount_rate,
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
        ${hasSub ? 'subscription_enabled, subscription_channels, subscription_billing_cycle, subscription_discount_rate,' : ''}
        duration_days, max_users, max_storage_gb, features, modules, is_trial,
        is_recommended, is_visible, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${hasSub ? '?, ?, ?, ?,' : ''} ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      insertParams = [
        name, code, type, description || '', price || 0, original_price || price || 0,
        billing_cycle || 'monthly',
        yearly_discount_rate || 0, yearly_bonus_months || 0, yearly_price || null,
        ...(hasSub ? [subscription_enabled ? 1 : 0, subscription_channels || 'all', subscription_billing_cycle || 'monthly', subscription_discount_rate || 0] : []),
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
    log.error('创建套餐失败:', error)
    res.status(500).json({ success: false, message: '创建套餐失败' })
  }
})

// 更新套餐
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const hasYearly = await ensureYearlyColumns()
    const hasSub = await ensureSubscriptionColumns()
    const { id } = req.params
    const {
      name, description, price, original_price, billing_cycle,
      yearly_discount_rate, yearly_bonus_months, yearly_price,
      subscription_enabled, subscription_channels, subscription_billing_cycle, subscription_discount_rate,
      duration_days, max_users, max_storage_gb, features, modules,
      is_trial, is_recommended, is_visible, sort_order, status
    } = req.body

    let updateSql: string
    let updateParams: any[]

    if (hasYearly) {
      updateSql = `UPDATE tenant_packages SET
       name = ?, description = ?, price = ?, original_price = ?,
       billing_cycle = ?, yearly_discount_rate = ?, yearly_bonus_months = ?, yearly_price = ?,
       ${hasSub ? 'subscription_enabled = ?, subscription_channels = ?, subscription_billing_cycle = ?, subscription_discount_rate = ?,' : ''}
       duration_days = ?, max_users = ?,
       max_storage_gb = ?, features = ?, modules = ?, is_trial = ?,
       is_recommended = ?, is_visible = ?, sort_order = ?, status = ?
       WHERE id = ?`
      updateParams = [
        name, description, price, original_price, billing_cycle,
        yearly_discount_rate || 0, yearly_bonus_months || 0, yearly_price || null,
        ...(hasSub ? [subscription_enabled ? 1 : 0, subscription_channels || 'all', subscription_billing_cycle || 'monthly', subscription_discount_rate || 0] : []),
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
    log.error('更新套餐失败:', error)
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
    log.error('删除套餐失败:', error)
    res.status(500).json({ success: false, message: '删除套餐失败' })
  }
})

export default router

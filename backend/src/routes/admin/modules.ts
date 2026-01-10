/**
 * Admin Modules Routes - 模块服务管理
 * 用于全局控制 CRM 系统各模块的启用/停用状态
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';

const router = Router();

// 默认模块列表
const DEFAULT_MODULES = [
  { key: 'dashboard', name: '数据看板', description: '系统首页数据统计面板', icon: 'Odometer', sort: 1 },
  { key: 'customer', name: '客户管理', description: '客户信息管理、标签、分组', icon: 'User', sort: 2 },
  { key: 'order', name: '订单管理', description: '订单创建、审核、管理', icon: 'ShoppingCart', sort: 3 },
  { key: 'product', name: '商品管理', description: '商品信息、分类、库存管理', icon: 'Box', sort: 4 },
  { key: 'logistics', name: '物流管理', description: '发货、物流跟踪、状态更新', icon: 'Van', sort: 5 },
  { key: 'performance', name: '业绩管理', description: '个人/团队业绩统计分析', icon: 'TrendCharts', sort: 6 },
  { key: 'service', name: '售后管理', description: '售后订单处理、数据分析', icon: 'Service', sort: 7 },
  { key: 'finance', name: '财务管理', description: '绩效数据、提成管理', icon: 'Money', sort: 8 },
  { key: 'data', name: '资料管理', description: '资料列表、客户查询、回收站', icon: 'Files', sort: 9 },
  { key: 'serviceManagement', name: '服务管理', description: '通话管理、短信管理', icon: 'Phone', sort: 10 },
  { key: 'system', name: '系统管理', description: '用户、角色、部门、系统设置', icon: 'Setting', sort: 11 }
];

/**
 * 初始化模块状态表数据
 */
const initModuleStatus = async () => {
  try {
    // 创建表（如果不存在）
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS module_status (
        id INT PRIMARY KEY AUTO_INCREMENT,
        module_key VARCHAR(50) NOT NULL UNIQUE COMMENT '模块标识',
        module_name VARCHAR(100) NOT NULL COMMENT '模块名称',
        description VARCHAR(500) COMMENT '模块描述',
        icon VARCHAR(50) COMMENT '图标名称',
        is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        disabled_reason VARCHAR(500) COMMENT '停用原因',
        disabled_at DATETIME COMMENT '停用时间',
        disabled_by VARCHAR(100) COMMENT '停用操作人',
        sort_order INT DEFAULT 0 COMMENT '排序',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_module_key (module_key),
        INDEX idx_is_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块状态表'
    `);

    // 检查现有数据数量
    const countResult = await AppDataSource.query(`SELECT COUNT(*) as count FROM module_status`);
    const existingCount = countResult[0]?.count || 0;

    // 如果数据不完整，补充缺失的模块
    if (existingCount < DEFAULT_MODULES.length) {
      console.log(`[Admin Modules] 现有模块数: ${existingCount}, 需要: ${DEFAULT_MODULES.length}, 开始补充...`);

      for (const mod of DEFAULT_MODULES) {
        await AppDataSource.query(
          `INSERT IGNORE INTO module_status (module_key, module_name, description, icon, is_enabled, sort_order) VALUES (?, ?, ?, ?, TRUE, ?)`,
          [mod.key, mod.name, mod.description, mod.icon, mod.sort]
        );
      }
      console.log('[Admin Modules] 模块状态表数据补充完成');
    }
  } catch (error) {
    console.error('[Admin Modules] 初始化模块状态表失败:', error);
  }
};

// 启动时初始化
initModuleStatus();

/**
 * @route GET /api/v1/admin/modules
 * @desc 获取所有模块状态列表
 * @access Private (Admin)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    await initModuleStatus(); // 确保表存在

    const result = await AppDataSource.query(
      `SELECT * FROM module_status ORDER BY sort_order ASC`
    );

    // MySQL query 返回的直接是数组
    const modules = Array.isArray(result) ? result : [];

    console.log('[Admin Modules] 查询到模块数量:', modules.length);

    // 如果数据库中模块数量不足，返回默认模块列表
    if (modules.length < DEFAULT_MODULES.length) {
      console.log('[Admin Modules] 数据库模块不完整，使用默认列表');
      const defaultData = DEFAULT_MODULES.map(mod => ({
        id: 0,
        module_key: mod.key,
        module_name: mod.name,
        description: mod.description,
        icon: mod.icon,
        is_enabled: true,
        disabled_reason: null,
        disabled_at: null,
        disabled_by: null,
        sort_order: mod.sort
      }));
      return res.json({
        success: true,
        data: defaultData
      });
    }

    res.json({
      success: true,
      data: modules
    });
  } catch (error: any) {
    console.error('[Admin Modules] Get list failed:', error);
    // 出错时返回默认模块列表
    const defaultData = DEFAULT_MODULES.map(mod => ({
      id: 0,
      module_key: mod.key,
      module_name: mod.name,
      description: mod.description,
      icon: mod.icon,
      is_enabled: true,
      disabled_reason: null,
      disabled_at: null,
      disabled_by: null,
      sort_order: mod.sort
    }));
    res.json({
      success: true,
      data: defaultData
    });
  }
});

/**
 * @route PUT /api/v1/admin/modules/:key/toggle
 * @desc 切换模块启用/停用状态
 * @access Private (Admin)
 */
router.put('/:key/toggle', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled, reason } = req.body;
    const adminUser = (req as any).adminUser;

    console.log(`[Admin Modules] Toggle request: key=${key}, enabled=${enabled}`);

    // 系统管理模块不能停用
    if (key === 'system' && enabled === false) {
      return res.status(400).json({ success: false, message: '系统管理模块不能停用' });
    }

    // 数据看板模块不能停用
    if (key === 'dashboard' && enabled === false) {
      return res.status(400).json({ success: false, message: '数据看板模块不能停用' });
    }

    // 确保表和数据存在
    await initModuleStatus();

    // 检查模块是否存在
    const existingModule = await AppDataSource.query(
      `SELECT * FROM module_status WHERE module_key = ?`,
      [key]
    );

    if (!existingModule || existingModule.length === 0) {
      // 模块不存在，先插入
      const modInfo = DEFAULT_MODULES.find(m => m.key === key);
      if (modInfo) {
        await AppDataSource.query(
          `INSERT INTO module_status (module_key, module_name, description, icon, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [modInfo.key, modInfo.name, modInfo.description, modInfo.icon, enabled, modInfo.sort]
        );
      }
    }

    const updateData: any = {
      is_enabled: enabled,
      updated_at: new Date()
    };

    if (enabled === false) {
      updateData.disabled_reason = reason || '管理员手动停用';
      updateData.disabled_at = new Date();
      updateData.disabled_by = adminUser?.username || 'admin';
    } else {
      updateData.disabled_reason = null;
      updateData.disabled_at = null;
      updateData.disabled_by = null;
    }

    await AppDataSource.query(
      `UPDATE module_status SET is_enabled = ?, disabled_reason = ?, disabled_at = ?, disabled_by = ? WHERE module_key = ?`,
      [updateData.is_enabled, updateData.disabled_reason, updateData.disabled_at, updateData.disabled_by, key]
    );

    const action = enabled ? '启用' : '停用';
    console.log(`[Admin Modules] 模块 ${key} 已${action}，操作人: ${adminUser?.username}`);

    res.json({
      success: true,
      message: `模块已${action}`
    });
  } catch (error: any) {
    console.error('[Admin Modules] Toggle failed:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

/**
 * @route PUT /api/v1/admin/modules/:key
 * @desc 更新模块信息（名称、描述等）
 * @access Private (Admin)
 */
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { name, description, sortOrder } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('module_name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的内容' });
    }

    params.push(key);
    await AppDataSource.query(
      `UPDATE module_status SET ${updates.join(', ')} WHERE module_key = ?`,
      params
    );

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[Admin Modules] Update failed:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

export default router;

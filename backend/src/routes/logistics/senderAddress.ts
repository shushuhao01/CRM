/**
 * 寄件人/退货地址管理路由
 * 支持多寄件人、多退货地址，支持设为默认/取消默认
 * 数据按租户隔离（使用 getTenantRepo 自动注入租户条件）
 */
import { Router, Request, Response } from 'express';
import { SenderAddress } from '../../entities/SenderAddress';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../../config/logger';
import { getTenantRepo } from '../../utils/tenantRepo';

export function registerSenderAddressRoutes(router: Router) {
  /**
   * 获取寄件人/退货地址列表
   * GET /sender-addresses?type=sender|return
   */
  router.get('/sender-addresses', async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const repo = getTenantRepo(SenderAddress);

      const where: any = {};
      if (type && (type === 'sender' || type === 'return')) {
        where.type = type;
      }

      const list = await repo.find({
        where,
        order: { isDefault: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' }
      });

      return res.json({ success: true, data: list });
    } catch (error) {
      log.error('[寄件人地址] 获取列表失败:', error);
      return res.status(500).json({ success: false, message: '获取列表失败' });
    }
  });

  /**
   * 获取默认寄件人/退货地址
   * GET /sender-addresses/default?type=sender|return
   */
  router.get('/sender-addresses/default', async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const repo = getTenantRepo(SenderAddress);

      const where: any = { isDefault: 1 };
      if (type && (type === 'sender' || type === 'return')) {
        where.type = type;
      }

      const defaultAddr = await repo.findOne({ where });

      return res.json({ success: true, data: defaultAddr || null });
    } catch (error) {
      log.error('[寄件人地址] 获取默认地址失败:', error);
      return res.status(500).json({ success: false, message: '获取默认地址失败' });
    }
  });

  /**
   * 创建寄件人/退货地址
   * POST /sender-addresses
   */
  router.post('/sender-addresses', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const { type, name, phone, province, city, district, address, remark, linkedServiceTypes, isDefault } = req.body;

      if (!name || !phone || !address) {
        return res.status(400).json({ success: false, message: '姓名、电话、地址不能为空' });
      }

      const repo = getTenantRepo(SenderAddress);

      // 拼接完整地址
      const fullAddress = [province, city, district, address].filter(Boolean).join('');

      const entity = repo.create({
        id: uuidv4(),
        type: type || 'sender',
        name,
        phone,
        province: province || null,
        city: city || null,
        district: district || null,
        address,
        fullAddress,
        isDefault: 0,
        sortOrder: 0,
        remark: remark || null,
        linkedServiceTypes: linkedServiceTypes || null,
        createdBy: userId
      });

      // 如果要设为默认，先取消同类型其他默认
      if (isDefault) {
        await repo.update(
          { type: type || 'sender' } as any,
          { isDefault: 0 }
        );
        entity.isDefault = 1;
      }

      const saved = await repo.save(entity);
      return res.json({ success: true, data: saved, message: '创建成功' });
    } catch (error) {
      log.error('[寄件人地址] 创建失败:', error);
      return res.status(500).json({ success: false, message: '创建失败' });
    }
  });

  /**
   * 更新寄件人/退货地址
   * PUT /sender-addresses/:id
   */
  router.put('/sender-addresses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const repo = getTenantRepo(SenderAddress);

      const existing = await repo.findOne({ where: { id } as any });
      if (!existing) {
        return res.status(404).json({ success: false, message: '地址不存在' });
      }

      const { name, phone, province, city, district, address, remark, linkedServiceTypes } = req.body;
      if (name) existing.name = name;
      if (phone) existing.phone = phone;
      if (province !== undefined) existing.province = province;
      if (city !== undefined) existing.city = city;
      if (district !== undefined) existing.district = district;
      if (address) existing.address = address;
      if (remark !== undefined) existing.remark = remark;
      if (linkedServiceTypes !== undefined) existing.linkedServiceTypes = linkedServiceTypes;

      // 重新拼接完整地址
      existing.fullAddress = [existing.province, existing.city, existing.district, existing.address].filter(Boolean).join('');

      const saved = await repo.save(existing);
      return res.json({ success: true, data: saved, message: '更新成功' });
    } catch (error) {
      log.error('[寄件人地址] 更新失败:', error);
      return res.status(500).json({ success: false, message: '更新失败' });
    }
  });

  /**
   * 删除寄件人/退货地址
   * DELETE /sender-addresses/:id
   */
  router.delete('/sender-addresses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const repo = getTenantRepo(SenderAddress);

      const existing = await repo.findOne({ where: { id } as any });
      if (!existing) {
        return res.status(404).json({ success: false, message: '地址不存在' });
      }

      await repo.remove(existing);
      return res.json({ success: true, message: '删除成功' });
    } catch (error) {
      log.error('[寄件人地址] 删除失败:', error);
      return res.status(500).json({ success: false, message: '删除失败' });
    }
  });

  /**
   * 设为默认
   * PUT /sender-addresses/:id/set-default
   */
  router.put('/sender-addresses/:id/set-default', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const repo = getTenantRepo(SenderAddress);

      const existing = await repo.findOne({ where: { id } as any });
      if (!existing) {
        return res.status(404).json({ success: false, message: '地址不存在' });
      }

      // 取消同类型下其他默认（getTenantRepo 自动添加租户条件）
      await repo.update(
        { type: existing.type } as any,
        { isDefault: 0 }
      );

      // 设为默认
      existing.isDefault = 1;
      await repo.save(existing);

      return res.json({ success: true, data: existing, message: '设置默认成功' });
    } catch (error) {
      log.error('[寄件人地址] 设置默认失败:', error);
      return res.status(500).json({ success: false, message: '设置默认失败' });
    }
  });

  /**
   * 取消默认
   * PUT /sender-addresses/:id/cancel-default
   */
  router.put('/sender-addresses/:id/cancel-default', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const repo = getTenantRepo(SenderAddress);

      const existing = await repo.findOne({ where: { id } as any });
      if (!existing) {
        return res.status(404).json({ success: false, message: '地址不存在' });
      }

      existing.isDefault = 0;
      await repo.save(existing);

      return res.json({ success: true, data: existing, message: '已取消默认' });
    } catch (error) {
      log.error('[寄件人地址] 取消默认失败:', error);
      return res.status(500).json({ success: false, message: '取消默认失败' });
    }
  });
}

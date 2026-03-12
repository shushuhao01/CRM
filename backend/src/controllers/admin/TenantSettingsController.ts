/**
 * 租户配置管理控制器
 *
 * 功能：
 * 1. 获取租户配置
 * 2. 更新租户配置
 * 3. 重置租户配置
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant';
import { TenantSettings } from '../../entities/TenantSettings';
import { v4 as uuidv4 } from 'uuid';

/**
 * 获取租户配置
 */
export const getTenantSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 验证租户是否存在
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 查询租户配置
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const settings = await settingsRepo.find({
      where: { tenantId: id }
    });

    // 转换为键值对格式
    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      settingsMap[setting.settingKey] = {
        value: setting.getValue(),
        description: setting.description
      };
    });

    res.json({
      success: true,
      data: {
        tenantId: id,
        tenantName: tenant.name,
        settings: settingsMap
      }
    });
  } catch (error) {
    console.error('获取租户配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取租户配置失败'
    });
  }
};

/**
 * 更新租户配置
 */
export const updateTenantSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({
        success: false,
        message: '配置数据格式错误'
      });
      return;
    }

    // 验证租户是否存在
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);

    // 更新或创建配置项
    const updatedSettings: TenantSettings[] = [];

    for (const [key, value] of Object.entries(settings)) {
      // 查找现有配置
      let setting = await settingsRepo.findOne({
        where: {
          tenantId: id,
          settingKey: key
        }
      });

      if (setting) {
        // 更新现有配置
        if (typeof value === 'object' && (value as any).description) {
          setting.description = (value as any).description;
          setting.setValue((value as any).value);
        } else {
          setting.setValue(value);
        }
        // 自动检测类型
        if (typeof value === 'object') {
          setting.settingType = 'json';
        }
      } else {
        // 创建新配置
        const settingValue = typeof value === 'object' && (value as any).value !== undefined ? (value as any).value : value;
        const settingType = typeof settingValue === 'object' ? 'json' : 'string';

        setting = settingsRepo.create({
          id: uuidv4(),
          tenantId: id,
          settingKey: key,
          settingValue: null,
          settingType,
          description: typeof value === 'object' && (value as any).description ? (value as any).description : null
        });
        setting.setValue(settingValue);
      }

      await settingsRepo.save(setting);
      updatedSettings.push(setting);
    }

    res.json({
      success: true,
      message: '租户配置更新成功',
      data: {
        tenantId: id,
        updatedCount: updatedSettings.length
      }
    });
  } catch (error) {
    console.error('更新租户配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新租户配置失败'
    });
  }
};

/**
 * 重置租户配置为默认值
 */
export const resetTenantSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 验证租户是否存在
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);

    // 删除所有现有配置
    await settingsRepo.delete({ tenantId: id });

    // 创建默认配置
    const defaultSettings = [
      {
        settingKey: 'theme',
        settingValue: { primaryColor: '#1890ff', mode: 'light' },
        settingType: 'json',
        description: '主题配置'
      },
      {
        settingKey: 'features',
        settingValue: {
          enableCustomerManagement: true,
          enableOrderManagement: true,
          enableProductManagement: true,
          enableFinanceManagement: true
        },
        settingType: 'json',
        description: '功能开关'
      },
      {
        settingKey: 'notifications',
        settingValue: {
          enableEmail: true,
          enableSms: false,
          enableWebhook: false
        },
        settingType: 'json',
        description: '通知配置'
      }
    ];

    for (const config of defaultSettings) {
      const setting = settingsRepo.create({
        id: uuidv4(),
        tenantId: id,
        settingKey: config.settingKey,
        settingValue: null,
        settingType: config.settingType,
        description: config.description
      });
      setting.setValue(config.settingValue);
      await settingsRepo.save(setting);
    }

    res.json({
      success: true,
      message: '租户配置已重置为默认值',
      data: {
        tenantId: id,
        settingsCount: defaultSettings.length
      }
    });
  } catch (error) {
    console.error('重置租户配置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置租户配置失败'
    });
  }
};

/**
 * 获取单个配置项
 */
export const getTenantSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, key } = req.params;

    // 验证租户是否存在
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 查询配置项
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({
      where: {
        tenantId: id,
        settingKey: key
      }
    });

    if (!setting) {
      res.status(404).json({
        success: false,
        message: '配置项不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        key: setting.settingKey,
        value: setting.getValue(),
        description: setting.description
      }
    });
  } catch (error) {
    console.error('获取配置项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置项失败'
    });
  }
};

/**
 * 删除配置项
 */
export const deleteTenantSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, key } = req.params;

    // 验证租户是否存在
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 删除配置项
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const result = await settingsRepo.delete({
      tenantId: id,
      settingKey: key
    });

    if (result.affected === 0) {
      res.status(404).json({
        success: false,
        message: '配置项不存在'
      });
      return;
    }

    res.json({
      success: true,
      message: '配置项删除成功'
    });
  } catch (error) {
    console.error('删除配置项失败:', error);
    res.status(500).json({
      success: false,
      message: '删除配置项失败'
    });
  }
};

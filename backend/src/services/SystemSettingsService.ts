import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { getTenantRepo } from '../utils/tenantRepo';

export class SystemSettingsService {
  private get configRepository() {
    return getTenantRepo(SystemConfig);
  }

  /**
   * 获取系统设置
   */
  async getSettings(category?: string) {
    const queryBuilder = this.configRepository.createQueryBuilder('config');

    if (category) {
      queryBuilder.where('config.configGroup = :category', { category });
    }

    const configs = await queryBuilder.getMany();

    // 转换为键值对格式
    const settings: Record<string, any> = {};
    configs.forEach(config => {
      try {
        settings[config.configKey] = JSON.parse(config.configValue || '{}');
      } catch {
        settings[config.configKey] = config.configValue;
      }
    });

    return settings;
  }

  /**
   * 更新系统设置
   */
  async updateSettings(category: string, settings: Record<string, any>) {
    for (const [key, value] of Object.entries(settings)) {
      const configKey = key;
      const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // 查找现有配置
      const existing = await this.configRepository.findOne({
        where: { configKey }
      });

      if (existing) {
        // 更新现有配置
        existing.configValue = configValue;
        existing.updatedAt = new Date();
        await this.configRepository.save(existing);
      } else {
        // 创建新配置
        const newConfig = this.configRepository.create({
          configKey,
          configValue,
          configGroup: category,
          description: `${category}配置`
        });
        await this.configRepository.save(newConfig);
      }
    }

    return { success: true, message: '设置更新成功' };
  }

  /**
   * 获取单个配置项
   */
  async getSetting(key: string) {
    const config = await this.configRepository.findOne({
      where: { configKey: key }
    });

    if (!config) {
      return null;
    }

    try {
      return JSON.parse(config.configValue || '{}');
    } catch {
      return config.configValue;
    }
  }

  /**
   * 设置单个配置项
   */
  async setSetting(key: string, value: any, category: string = 'system') {
    const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const existing = await this.configRepository.findOne({
      where: { configKey: key }
    });

    if (existing) {
      existing.configValue = configValue;
      existing.updatedAt = new Date();
      await this.configRepository.save(existing);
    } else {
      const newConfig = this.configRepository.create({
        configKey: key,
        configValue,
        configGroup: category
      });
      await this.configRepository.save(newConfig);
    }

    return { success: true, message: '配置更新成功' };
  }

  /**
   * 删除配置项
   */
  async deleteSetting(key: string) {
    const config = await this.configRepository.findOne({
      where: { configKey: key }
    });

    if (config) {
      await this.configRepository.remove(config);
    }

    return { success: true, message: '配置删除成功' };
  }
}

export const systemSettingsService = new SystemSettingsService();

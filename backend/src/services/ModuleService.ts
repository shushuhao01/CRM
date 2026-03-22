import { AppDataSource } from '../config/database';
import { Module } from '../entities/Module';
import { ModuleConfig } from '../entities/ModuleConfig';
import { v4 as uuidv4 } from 'uuid';
import { getTenantRepo } from '../utils/tenantRepo';

export class ModuleService {
  private get moduleRepository() {
    return getTenantRepo(Module);
  }
  private get configRepository() {
    return getTenantRepo(ModuleConfig);
  }

  /**
   * 获取模块列表
   */
  async getModules(query: any) {
    const { page = 1, pageSize = 20, status, keyword } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.moduleRepository.createQueryBuilder('module');

    if (status) {
      queryBuilder.andWhere('module.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(module.name LIKE :keyword OR module.code LIKE :keyword OR module.description LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy('module.sortOrder', 'ASC')
      .addOrderBy('module.createdAt', 'DESC');

    const [list, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }

  /**
   * 获取模块详情
   */
  async getModuleById(id: string) {
    const module = await this.moduleRepository.findOne({
      where: { id },
      relations: ['configs']
    });

    if (!module) {
      throw new Error('模块不存在');
    }

    return module;
  }

  /**
   * 创建模块
   */
  async createModule(data: any) {
    // 检查代码是否已存在
    const existing = await this.moduleRepository.findOne({
      where: { code: data.code }
    });

    if (existing) {
      throw new Error('模块代码已存在');
    }

    const module = this.moduleRepository.create({
      id: uuidv4(),
      ...data
    });

    return await this.moduleRepository.save(module);
  }

  /**
   * 更新模块
   */
  async updateModule(id: string, data: any) {
    const module = await this.getModuleById(id);

    // 系统模块不允许修改某些字段
    if (module.isSystem) {
      delete data.code;
      delete data.isSystem;
    }

    // 如果修改了代码，检查是否重复
    if (data.code && data.code !== module.code) {
      const existing = await this.moduleRepository.findOne({
        where: { code: data.code }
      });
      if (existing) {
        throw new Error('模块代码已存在');
      }
    }

    Object.assign(module, data);
    return await this.moduleRepository.save(module);
  }

  /**
   * 删除模块
   */
  async deleteModule(id: string) {
    const module = await this.getModuleById(id);

    if (module.isSystem) {
      throw new Error('系统模块不允许删除');
    }

    await this.moduleRepository.remove(module);
    return { success: true, message: '删除成功' };
  }

  /**
   * 启用模块
   */
  async enableModule(id: string) {
    const module = await this.getModuleById(id);
    module.status = 'enabled';
    await this.moduleRepository.save(module);
    return { success: true, message: '启用成功' };
  }

  /**
   * 禁用模块
   */
  async disableModule(id: string) {
    const module = await this.getModuleById(id);

    if (module.isSystem) {
      throw new Error('系统模块不允许禁用');
    }

    module.status = 'disabled';
    await this.moduleRepository.save(module);
    return { success: true, message: '禁用成功' };
  }

  /**
   * 获取模块配置
   */
  async getModuleConfig(moduleId: string) {
    await this.getModuleById(moduleId); // 验证模块存在

    const configs = await this.configRepository.find({
      where: { moduleId }
    });

    // 转换为键值对格式
    const configMap: Record<string, any> = {};
    configs.forEach(config => {
      configMap[config.configKey] = config.getValue();
    });

    return configMap;
  }

  /**
   * 更新模块配置
   */
  async updateModuleConfig(moduleId: string, configs: Record<string, any>) {
    await this.getModuleById(moduleId); // 验证模块存在

    // 获取现有配置
    const existingConfigs = await this.configRepository.find({
      where: { moduleId }
    });

    const existingMap = new Map(
      existingConfigs.map(c => [c.configKey, c])
    );

    // 更新或创建配置
    for (const [key, value] of Object.entries(configs)) {
      const existing = existingMap.get(key);

      if (existing) {
        // 更新现有配置
        existing.setValue(value);
        await this.configRepository.save(existing);
      } else {
        // 创建新配置
        const newConfig = this.configRepository.create({
          id: uuidv4(),
          moduleId,
          configKey: key,
          configType: this.detectConfigType(value)
        });
        newConfig.setValue(value);
        await this.configRepository.save(newConfig);
      }
    }

    return { success: true, message: '配置更新成功' };
  }

  /**
   * 检测配置值类型
   */
  private detectConfigType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }
}

export const moduleService = new ModuleService();

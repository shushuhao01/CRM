import { AppDataSource } from '../config/database';
import { Package } from '../entities/Package';
import { Repository } from 'typeorm';

export class PackageService {
  private packageRepository: Repository<Package>;

  constructor() {
    this.packageRepository = AppDataSource.getRepository(Package);
  }

  /**
   * 获取套餐列表
   */
  async getPackages(params: {
    type?: 'saas' | 'private';
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { type, status, page = 1, pageSize = 100 } = params;

    const queryBuilder = this.packageRepository.createQueryBuilder('package');

    // 筛选条件
    if (type) {
      queryBuilder.andWhere('package.type = :type', { type });
    }
    if (status !== undefined) {
      queryBuilder.andWhere('package.status = :status', { status });
    }

    // 排序
    queryBuilder.orderBy('package.sort_order', 'ASC');
    queryBuilder.addOrderBy('package.id', 'ASC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取套餐详情
   */
  async getPackageById(id: number) {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new Error('套餐不存在');
    }
    return pkg;
  }

  /**
   * 根据代码获取套餐
   */
  async getPackageByCode(code: string) {
    const pkg = await this.packageRepository.findOne({ where: { code } });
    if (!pkg) {
      throw new Error('套餐不存在');
    }
    return pkg;
  }

  /**
   * 创建套餐
   */
  async createPackage(data: {
    name: string;
    code: string;
    type: 'saas' | 'private';
    description?: string;
    price: number;
    original_price?: number;
    billing_cycle: 'monthly' | 'yearly' | 'once';
    duration_days: number;
    max_users: number;
    max_storage_gb: number;
    features?: string[];
    is_trial?: boolean;
    is_recommended?: boolean;
    is_visible?: boolean;
    sort_order?: number;
    status?: boolean;
  }) {
    // 检查代码是否已存在
    const existing = await this.packageRepository.findOne({ where: { code: data.code } });
    if (existing) {
      throw new Error('套餐代码已存在');
    }

    const pkg = this.packageRepository.create({
      ...data,
      is_trial: data.is_trial ?? false,
      is_recommended: data.is_recommended ?? false,
      is_visible: data.is_visible ?? true,
      sort_order: data.sort_order ?? 0,
      status: data.status ?? true
    });

    return await this.packageRepository.save(pkg);
  }

  /**
   * 更新套餐
   */
  async updatePackage(id: number, data: Partial<Package>) {
    const pkg = await this.getPackageById(id);

    // 如果更新代码，检查是否与其他套餐冲突
    if (data.code && data.code !== pkg.code) {
      const existing = await this.packageRepository.findOne({ where: { code: data.code } });
      if (existing) {
        throw new Error('套餐代码已存在');
      }
    }

    Object.assign(pkg, data);
    return await this.packageRepository.save(pkg);
  }

  /**
   * 删除套餐
   */
  async deletePackage(id: number) {
    const pkg = await this.getPackageById(id);

    // TODO: 检查是否有租户正在使用此套餐
    // 如果有，应该禁止删除或提示用户

    await this.packageRepository.remove(pkg);
    return { success: true, message: '删除成功' };
  }

  /**
   * 切换套餐状态
   */
  async togglePackageStatus(id: number) {
    const pkg = await this.getPackageById(id);
    pkg.status = !pkg.status;
    return await this.packageRepository.save(pkg);
  }

  /**
   * 获取推荐套餐
   */
  async getRecommendedPackages(type?: 'saas' | 'private') {
    const queryBuilder = this.packageRepository.createQueryBuilder('package');

    queryBuilder.where('package.is_recommended = :recommended', { recommended: true });
    queryBuilder.andWhere('package.status = :status', { status: true });

    if (type) {
      queryBuilder.andWhere('package.type = :type', { type });
    }

    queryBuilder.orderBy('package.sort_order', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * 获取可见套餐（用于官网展示）
   */
  async getVisiblePackages(type?: 'saas' | 'private') {
    const queryBuilder = this.packageRepository.createQueryBuilder('package');

    queryBuilder.where('package.is_visible = :visible', { visible: true });
    queryBuilder.andWhere('package.status = :status', { status: true });

    if (type) {
      queryBuilder.andWhere('package.type = :type', { type });
    }

    queryBuilder.orderBy('package.sort_order', 'ASC');

    return await queryBuilder.getMany();
  }
}

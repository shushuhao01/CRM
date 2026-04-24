import { AppDataSource } from '../config/database';
import { PrivateCustomer } from '../entities/PrivateCustomer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getTenantRepo } from '../utils/tenantRepo';
import { formatDateTime } from '../utils/dateFormat';
import { log } from '../config/logger';

export class PrivateCustomerService {
  private get customerRepository() {
    return getTenantRepo(PrivateCustomer);
  }

  /**
   * 获取私有客户列表
   */
  async getList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    industry?: string;
    status?: string;
    licenseStatus?: string;
  }) {
    const { page = 1, pageSize = 10, keyword, industry, status, licenseStatus } = params;

    const queryBuilder = this.customerRepository.createQueryBuilder('pc');

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(pc.customer_name LIKE :keyword OR pc.contact_person LIKE :keyword OR pc.contact_phone LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 行业筛选
    if (industry) {
      queryBuilder.andWhere('pc.industry = :industry', { industry });
    }

    // 客户状态筛选
    if (status) {
      queryBuilder.andWhere('pc.status = :status', { status });
    }

    // 授权状态筛选（需要子查询）
    if (licenseStatus) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM licenses l
          WHERE l.private_customer_id = pc.id
          AND l.customer_type = 'private'
          AND l.status = :licenseStatus
        )`,
        { licenseStatus }
      );
    }

    // 排序
    queryBuilder.orderBy('pc.created_at', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    // 获取每个客户的当前授权信息
    const listWithLicense = await Promise.all(
      list.map(async (customer) => {
        const currentLicense = await this.getCurrentLicense(customer.id);
        return {
          ...customer,
          currentLicense,
        };
      })
    );

    return {
      list: listWithLicense,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取客户的当前有效授权
   */
  async getCurrentLicense(customerId: string) {
    const license = await AppDataSource.query(
      `SELECT * FROM licenses
       WHERE private_customer_id = ?
       AND customer_type = 'private'
       AND status IN ('active', 'pending')
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId]
    );
    return license[0] || null;
  }

  /**
   * 获取私有客户详情
   */
  async getDetail(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new Error('客户不存在');
    }

    // 获取当前授权
    const currentLicense = await this.getCurrentLicense(id);

    // 获取授权历史（最近10条）
    const licenseHistory = await AppDataSource.query(
      `SELECT * FROM licenses
       WHERE private_customer_id = ?
       AND customer_type = 'private'
       ORDER BY created_at DESC
       LIMIT 10`,
      [id]
    );

    // 获取操作日志（最近20条）
    const logs = await AppDataSource.query(
      `SELECT * FROM license_logs
       WHERE license_id IN (
         SELECT id FROM licenses
         WHERE private_customer_id = ?
         AND customer_type = 'private'
       )
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    );

    return {
      customer,
      currentLicense,
      licenseHistory,
      logs,
    };
  }

  /**
   * 创建私有客户（同时生成授权）
   */
  async create(data: {
    // 客户信息
    customerName: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    companyAddress?: string;
    industry?: string;
    companySize?: string;
    deploymentType?: string;
    notes?: string;
    // 授权配置
    licenseType: string;
    maxUsers: number;
    maxStorageGb: number;
    features: string[];
    expiresAt?: string;
  }) {
    // 手机号必填验证
    if (!data.contactPhone || !data.contactPhone.trim()) {
      throw new Error('联系电话不能为空');
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(data.contactPhone)) {
      throw new Error('请输入正确的手机号格式');
    }

    const customerId = uuidv4();

    // 创建客户记录
    const customer = this.customerRepository.create({
      id: customerId,
      customerName: data.customerName,
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      companyAddress: data.companyAddress,
      industry: data.industry,
      companySize: data.companySize,
      deploymentType: data.deploymentType || 'on-premise',
      status: 'active',
      notes: data.notes,
    });

    await this.customerRepository.save(customer);

    // 生成授权码
    const licenseKey = this.generateLicenseKey();
    const licenseId = uuidv4();

    // 转换日期格式为 MySQL 格式
    let expiresAtFormatted = null;
    if (data.expiresAt) {
      const date = new Date(data.expiresAt);
      expiresAtFormatted = formatDateTime(date);
    }

    // 创建授权记录
    await AppDataSource.query(
      `INSERT INTO licenses (
        id, license_key, customer_name, customer_contact, customer_phone, customer_email,
        customer_type, private_customer_id, license_type, max_users, max_storage_gb,
        features, expires_at, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        licenseId,
        licenseKey,
        data.customerName,
        data.contactPerson,
        data.contactPhone,
        data.contactEmail,
        'private',
        customerId,
        data.licenseType,
        data.maxUsers,
        data.maxStorageGb,
        JSON.stringify(data.features),
        expiresAtFormatted,
        'pending',
        data.notes,
      ]
    );

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO license_logs (id, license_id, license_key, action, message, ip_address, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), licenseId, licenseKey, 'activate', '创建授权', '127.0.0.1', 'success']
    );

    // 创建默认管理员账号（使用手机号作为用户名）
    const { createDefaultAdmin } = await import('../utils/adminAccountHelper');
    const adminAccount = await createDefaultAdmin({
      tenantId: null, // 私有部署不需要租户ID
      phone: data.contactPhone,
      realName: data.contactPerson || data.customerName,
      email: data.contactEmail || undefined
    });

    const license = await AppDataSource.query('SELECT * FROM licenses WHERE id = ?', [licenseId]);

    // 🔥 同步在 tenants 表创建记录，确保私有客户也能登录会员中心
    let tenantId: string | null = null;
    let tenantCode: string | null = null;
    if (data.contactPhone) {
      try {
        const existingTenants = await AppDataSource.query(
          'SELECT id, code FROM tenants WHERE phone = ?', [data.contactPhone]
        );
        if (existingTenants.length > 0) {
          tenantId = existingTenants[0].id;
          tenantCode = existingTenants[0].code;
          // 确保 password_hash 已设置
          const pwdCheck = await AppDataSource.query('SELECT password_hash FROM tenants WHERE id = ?', [tenantId]);
          if (!pwdCheck[0]?.password_hash) {
            const memberPwdHash = await bcrypt.hash('Aa123456', 10);
            await AppDataSource.query('UPDATE tenants SET password_hash = ? WHERE id = ?', [memberPwdHash, tenantId]);
          }
        } else {
          tenantId = uuidv4();
          const d = new Date();
          tenantCode = `P${d.getFullYear().toString().slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          const memberPwdHash = await bcrypt.hash('Aa123456', 10);
          await AppDataSource.query(
            `INSERT INTO tenants (id, name, code, license_key, license_status, contact, phone, email,
             max_users, max_storage_gb, expire_date, features, status, password_hash, remark, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())`,
            [
              tenantId, data.customerName, tenantCode, licenseKey,
              data.contactPerson || null, data.contactPhone, data.contactEmail || null,
              data.maxUsers || 10, data.maxStorageGb || 5,
              data.expiresAt ? new Date(data.expiresAt).toISOString().split('T')[0] : null,
              JSON.stringify(data.features || []),
              memberPwdHash,
              '私有部署客户（管理后台创建）'
            ]
          );
          // 关联 license 的 tenant_id
          try {
            await AppDataSource.query('UPDATE licenses SET tenant_id = ? WHERE id = ?', [tenantId, licenseId]);
          } catch { /* tenant_id 列可能不存在 */ }
          log.info(`[PrivateCustomerService] ✅ 已在 tenants 表创建私有客户记录: ${data.customerName} (${tenantCode}), 会员中心密码 Aa123456`);
        }
      } catch (tenantErr: any) {
        log.warn('[PrivateCustomerService] 创建 tenants 记录失败（不影响授权创建）:', tenantErr.message?.substring(0, 100));
      }
    }

    return {
      customer,
      license: license[0],
      tenantId,
      tenantCode,
      adminAccount: {
        username: adminAccount.username,
        password: adminAccount.password
      }
    };
  }

  /**
   * 更新私有客户信息
   */
  async update(id: string, data: Partial<PrivateCustomer>) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new Error('客户不存在');
    }

    Object.assign(customer, data);
    await this.customerRepository.save(customer);

    return customer;
  }

  /**
   * 删除私有客户
   */
  async delete(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new Error('客户不存在');
    }

    // 检查是否有有效授权
    const activeLicenses = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM licenses
       WHERE private_customer_id = ?
       AND customer_type = 'private'
       AND status IN ('active', 'pending')`,
      [id]
    );

    if (activeLicenses[0].count > 0) {
      throw new Error('该客户还有有效授权，无法删除');
    }

    await this.customerRepository.remove(customer);
    return { success: true };
  }

  /**
   * 获取客户的所有授权
   */
  async getLicenses(customerId: string, params: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
      AppDataSource.query(
        `SELECT * FROM licenses
         WHERE private_customer_id = ?
         AND customer_type = 'private'
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [customerId, pageSize, skip]
      ),
      AppDataSource.query(
        `SELECT COUNT(*) as count FROM licenses
         WHERE private_customer_id = ?
         AND customer_type = 'private'`,
        [customerId]
      ),
    ]);

    return {
      list,
      total: total[0].count,
      page,
      pageSize,
    };
  }

  /**
   * 为客户生成新授权
   */
  async generateLicense(customerId: string, data: {
    licenseType: string;
    maxUsers: number;
    maxStorageGb: number;
    features: string[];
    expiresAt?: string;
    notes?: string;
  }) {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error('客户不存在');
    }

    const licenseKey = this.generateLicenseKey();
    const licenseId = uuidv4();

    // 转换日期格式为 MySQL 格式
    let expiresAtFormatted = null;
    if (data.expiresAt) {
      const date = new Date(data.expiresAt);
      expiresAtFormatted = formatDateTime(date);
    }

    await AppDataSource.query(
      `INSERT INTO licenses (
        id, license_key, customer_name, customer_contact, customer_phone, customer_email,
        customer_type, private_customer_id, license_type, max_users, max_storage_gb,
        features, expires_at, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        licenseId,
        licenseKey,
        customer.customerName,
        customer.contactPerson,
        customer.contactPhone,
        customer.contactEmail,
        'private',
        customerId,
        data.licenseType,
        data.maxUsers,
        data.maxStorageGb,
        JSON.stringify(data.features),
        expiresAtFormatted,
        'pending',
        data.notes,
      ]
    );

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO license_logs (id, license_id, license_key, action, message, ip_address, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), licenseId, licenseKey, 'activate', '生成新授权', '127.0.0.1', 'success']
    );

    const license = await AppDataSource.query('SELECT * FROM licenses WHERE id = ?', [licenseId]);
    return license[0];
  }

  /**
   * 生成私有部署授权码
   * 格式: PRIVATE-XXXX-XXXX-XXXX-XXXX（可与SaaS租户授权码区分）
   */
  private generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return `PRIVATE-${segments.join('-')}`;
  }
}

export const privateCustomerService = new PrivateCustomerService();

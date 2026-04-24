/**
 * 通讯录服务 - V4.0新增
 */
import { AppDataSource } from '../config/database';
import { WecomDepartmentMapping } from '../entities/WecomDepartmentMapping';

export class WecomAddressBookService {

  /**
   * 构建部门树
   */
  async getDepartmentTree(tenantId: string, configId: number) {
    const mappings = await AppDataSource.getRepository(WecomDepartmentMapping).find({
      where: { tenantId, wecomConfigId: configId },
      order: { wecomDeptId: 'ASC' }
    });

    // 构建树结构
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const m of mappings) {
      const node = { ...m, children: [] };
      map.set(m.wecomDeptId, node);
    }

    for (const m of mappings) {
      const node = map.get(m.wecomDeptId);
      if (m.wecomParentId && map.has(m.wecomParentId)) {
        map.get(m.wecomParentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * 同步企微部门到本地映射表
   */
  async syncDepartments(tenantId: string, configId: number, departments: any[]) {
    const repo = AppDataSource.getRepository(WecomDepartmentMapping);

    for (const dept of departments) {
      let mapping = await repo.findOne({
        where: { tenantId, wecomConfigId: configId, wecomDeptId: dept.id }
      });

      if (mapping) {
        mapping.wecomDeptName = dept.name;
        mapping.wecomParentId = dept.parentid;
      } else {
        mapping = repo.create({
          tenantId, wecomConfigId: configId,
          wecomDeptId: dept.id, wecomDeptName: dept.name, wecomParentId: dept.parentid
        });
      }

      mapping.lastSyncTime = new Date();
      await repo.save(mapping);
    }
  }
}

export const wecomAddressBookService = new WecomAddressBookService();

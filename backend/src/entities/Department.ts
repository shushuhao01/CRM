import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '部门名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '部门描述' })
  description?: string;

  @Column({ name: 'parent_id', length: 50, nullable: true, comment: '上级部门ID' })
  parentId?: string;

  @Column({ name: 'manager_id', length: 50, nullable: true, comment: '部门经理ID' })
  managerId?: string;

  @Column({ type: 'int', default: 1, comment: '部门层级' })
  level: number;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ name: 'member_count', type: 'int', default: 0, comment: '成员数量' })
  memberCount: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: '状态：active-活跃，inactive-非活跃'
  })
  status: 'active' | 'inactive';

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => User, user => user.department)
  users: User[];
}

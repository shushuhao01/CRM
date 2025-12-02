import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('varchar', { length: 50, nullable: true })
  code: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('varchar', { name: 'parent_id', length: 50, nullable: true })
  parentId: string | null;

  @Column('varchar', { name: 'manager_id', length: 50, nullable: true })
  managerId: string | null;

  @Column('int', { default: 1 })
  level: number;

  @Column('int', { name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column('varchar', { length: 20, default: 'active' })
  status: string;

  @Column('int', { name: 'member_count', default: 0 })
  memberCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联关系（可选）
  users?: any[];
}

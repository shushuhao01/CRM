import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true, comment: '部门名称' })
  name: string;

  @Column({ length: 20, unique: true, comment: '部门代码' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: '部门描述' })
  description?: string;

  @Column({ type: 'int', nullable: true, comment: '上级部门ID' })
  parentId?: number;

  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sortOrder: number;

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: 'active',
    comment: '状态：active-活跃，inactive-非活跃'
  })
  status: 'active' | 'inactive';

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => User, user => user.department)
  users: User[];
}
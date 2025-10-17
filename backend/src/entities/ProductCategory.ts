import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Product } from './Product';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '分类名称' })
  name: string;

  @Column({ length: 20, unique: true, comment: '分类代码' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: '分类描述' })
  description?: string;

  @Column({ type: 'int', nullable: true, comment: '上级分类ID' })
  parentId?: number;

  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sortOrder: number;

  @Column({ length: 200, nullable: true, comment: '分类图标URL' })
  icon?: string;

  @Column({ 
    type: 'varchar',
    length: 50, 
    default: 'active',
    comment: '状态：active-活跃，inactive-非活跃'
  })
  status: 'active' | 'inactive';

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Product, product => product.category)
  products: Product[];
}
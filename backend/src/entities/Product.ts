import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProductCategory } from './ProductCategory';
import { OrderItem } from './OrderItem';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, comment: '产品名称' })
  name: string;

  @Column({ length: 50, unique: true, comment: '产品编号/SKU' })
  sku: string;

  @Column({ type: 'text', nullable: true, comment: '产品描述' })
  description?: string;

  @Column({ type: 'int', comment: '产品分类ID' })
  categoryId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '销售价格' })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '成本价格' })
  costPrice?: number;

  @Column({ type: 'int', default: 0, comment: '库存数量' })
  stock: number;

  @Column({ type: 'int', nullable: true, comment: '库存预警阈值' })
  stockAlert?: number;

  @Column({ length: 20, nullable: true, comment: '计量单位' })
  unit?: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, comment: '重量(kg)' })
  weight?: number;

  @Column({ length: 100, nullable: true, comment: '规格尺寸' })
  dimensions?: string;

  @Column({ type: 'json', nullable: true, comment: '产品图片URLs（JSON数组）' })
  images?: string[];

  @Column({ 
    type: 'varchar',
    length: 50, 
    default: 'active',
    comment: '状态：active-在售，inactive-下架，discontinued-停产'
  })
  status: 'active' | 'inactive' | 'discontinued';

  @Column({ type: 'int', default: 0, comment: '排序权重' })
  sortOrder: number;

  @Column({ type: 'json', nullable: true, comment: '产品属性（JSON对象）' })
  attributes?: Record<string, any>;

  @Column({ type: 'json', nullable: true, comment: '标签（JSON数组）' })
  tags?: string[];

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => ProductCategory, category => category.products)
  @JoinColumn({ name: 'categoryId' })
  category: ProductCategory;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];
}
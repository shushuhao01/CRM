import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Column({ unique: true, length: 100 })
  code: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ length: 50, default: 'system' })
  module: string

  @Column({ length: 20, default: 'menu' })
  type: string

  @Column({ nullable: true, length: 200 })
  path: string

  @Column({ nullable: true, length: 50 })
  icon: string

  @Column({ default: 0 })
  sort: number

  @Column({ length: 20, default: 'active' })
  status: string

  @Column({ nullable: true })
  parentId: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

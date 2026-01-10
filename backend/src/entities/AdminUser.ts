import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('admin_users')
export class AdminUser {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'enum', enum: ['super_admin', 'admin', 'operator'], default: 'operator' })
  role!: string;

  @Column({ type: 'enum', enum: ['active', 'disabled'], default: 'active' })
  status!: string;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', type: 'varchar', length: 50, nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

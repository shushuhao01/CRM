import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  meta: string;

  @Column({ length: 100, nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
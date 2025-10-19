import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('improvement_goals')
export class ImprovementGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  userId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  targetDate: Date;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
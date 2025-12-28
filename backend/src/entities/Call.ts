import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('call_records')
export class Call {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ name: 'customer_id', length: 100, nullable: true })
  customerId: string;

  @Column({ name: 'customer_name', length: 100, nullable: true })
  customerName: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone: string;

  @Column({
    name: 'call_type',
    type: 'enum',
    enum: ['outbound', 'inbound'],
    default: 'outbound'
  })
  callType: 'outbound' | 'inbound';

  @Column({
    name: 'call_status',
    type: 'enum',
    enum: ['connected', 'missed', 'busy', 'failed', 'rejected'],
    default: 'connected'
  })
  callStatus: 'connected' | 'missed' | 'busy' | 'failed' | 'rejected';

  @Column({ name: 'start_time', type: 'datetime', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ name: 'recording_url', length: 500, nullable: true })
  recordingUrl: string;

  @Column({ name: 'has_recording', type: 'tinyint', default: 0 })
  hasRecording: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'follow_up_required', type: 'tinyint', default: 0 })
  followUpRequired: boolean;

  @Column({ name: 'call_tags', type: 'json', nullable: true })
  callTags: string[];

  @Column({ name: 'user_id', length: 100 })
  userId: string;

  @Column({ name: 'user_name', length: 100, nullable: true })
  userName: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 生成ID
  static generateId(): string {
    return `call_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }
}

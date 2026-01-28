import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => Session, (session) => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column({ type: 'varchar' }) // SQLite 不支持 enum
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}

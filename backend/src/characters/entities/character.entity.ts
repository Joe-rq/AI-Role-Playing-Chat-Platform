import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'text', nullable: true })
  greeting: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', nullable: true, default: 'gpt-4o-mini' })
  preferredModel?: string; // 首选模型

  @Column({ type: 'float', nullable: true, default: 0.7 })
  temperature?: number; // 温度参数（0-1，控制创造性）

  @Column({ type: 'int', nullable: true, default: 2000 })
  maxTokens?: number; // 最大生成长度

  @Column({ type: 'text', nullable: true })
  exampleDialogues?: string; // Few-shot示例对话（JSON格式）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

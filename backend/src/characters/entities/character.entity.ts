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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

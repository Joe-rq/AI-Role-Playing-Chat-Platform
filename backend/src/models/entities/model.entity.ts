import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('models')
export class Model {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string; // 显示名称，如"GPT-4o Mini - 高性价比"

  @Column({ length: 100 })
  modelId: string; // 实际模型ID，如"gpt-4o-mini"

  @Column({ length: 50 })
  provider: string; // 厂商：openai, anthropic, google, alibaba, deepseek, zhipu

  @Column({ type: 'text' })
  apiKey: string; // 加密存储的API Key

  @Column({ type: 'text' })
  baseURL: string; // API Base URL

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean; // 是否启用

  @Column({ type: 'float', nullable: true, default: 0.7 })
  defaultTemperature?: number; // 默认温度参数

  @Column({ type: 'int', nullable: true, default: 2000 })
  defaultMaxTokens?: number; // 默认最大Token数

  @Column({ type: 'text', nullable: true })
  description?: string; // 描述信息

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // 排序顺序

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

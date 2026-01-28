import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CharactersModule } from './characters/characters.module';
import { Character } from './characters/entities/character.entity';
import { Session } from './chat/entities/session.entity';
import { Message } from './chat/entities/message.entity';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { ModelsModule } from './models/models.module';
import { Model } from './models/entities/model.entity';
import { MemuModule } from './memu/memu.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // 加密密钥（必填）- 用于加密API Key
        ENCRYPTION_KEY: Joi.string().length(64).required(),

        // OpenAI 配置（可选，作为fallback）
        OPENAI_API_KEY: Joi.string().optional(),
        OPENAI_BASE_URL: Joi.string().uri().optional(),
        OPENAI_MODEL: Joi.string().optional(),

        // 数据库配置
        DATABASE_PATH: Joi.string().default('database.sqlite'),

        // 服务配置
        PORT: Joi.number().default(3000),

        // 上下文窗口配置
        MAX_HISTORY_TURNS: Joi.number().default(20),

        // memU 记忆服务配置
        MEMU_API_KEY: Joi.string().optional(),
        MEMU_BASE_URL: Joi.string().uri().default('https://api.memu.so'),
        MEMU_ENABLED: Joi.string().valid('true', 'false').default('false'),

        // CORS 配置（可选）
        CORS_ORIGINS: Joi.string().optional(),
      }),
      validationOptions: {
        allowUnknown: true, // 允许其他未定义的环境变量
        abortEarly: false, // 显示所有验证错误，而不是遇到第一个就停止
      },
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'database.sqlite',
      entities: [Character, Session, Message, Model],
      synchronize: true, // 开发阶段自动同步
    }),
    CharactersModule,
    ChatModule,
    UploadModule,
    ModelsModule,
    MemuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

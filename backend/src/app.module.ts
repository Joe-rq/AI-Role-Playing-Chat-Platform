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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        // OpenAI 配置（必填）
        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_BASE_URL: Joi.string().uri().required(),
        OPENAI_MODEL: Joi.string().required(),

        // 数据库配置
        DATABASE_PATH: Joi.string().default('database.sqlite'),

        // 服务配置
        PORT: Joi.number().default(3000),

        // 上下文窗口配置
        MAX_HISTORY_TURNS: Joi.number().default(20),

        // CORS 配置（可选）
        CORS_ORIGINS: Joi.string().optional(),
      }),
      validationOptions: {
        allowUnknown: true, // 允许其他未定义的环境变量
        abortEarly: false,  // 显示所有验证错误，而不是遇到第一个就停止
      },
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || 'database.sqlite',
      entities: [Character, Session, Message],
      synchronize: true, // 开发阶段自动同步
    }),
    CharactersModule,
    ChatModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


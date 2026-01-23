import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用 CORS - 动态配置
  app.enableCors({
    origin: (origin, callback) => {
      // 开发环境：允许所有 localhost 端口
      if (process.env.NODE_ENV !== 'production') {
        if (!origin || origin.match(/^http:\/\/localhost:\d+$/)) {
          callback(null, true);
          return;
        }
      }

      // 生产环境：从环境变量读取允许的域名（用逗号分隔）
      const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 静态文件服务 (上传的图片)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running at http://localhost:${port}`);
}
bootstrap();

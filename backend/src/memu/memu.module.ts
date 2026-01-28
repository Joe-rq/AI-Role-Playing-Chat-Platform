import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemuService } from './memu.service';
import { MemuController } from './memu.controller';
import { Model } from '../models/entities/model.entity';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Model]),
    ModelsModule,
  ],
  controllers: [MemuController],
  providers: [MemuService],
  exports: [MemuService],
})
export class MemuModule { }

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemuService } from './memu.service';
import { MemuController } from './memu.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MemuController],
  providers: [MemuService],
  exports: [MemuService],
})
export class MemuModule {}

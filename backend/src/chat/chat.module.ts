import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CharactersModule } from '../characters/characters.module';
import { ModelsModule } from '../models/models.module';
import { MemuModule } from '../memu/memu.module';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    CharactersModule,
    ModelsModule,
    MemuModule,
    TypeOrmModule.forFeature([Session, Message]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}

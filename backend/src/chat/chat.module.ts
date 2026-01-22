import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CharactersModule } from '../characters/characters.module';

@Module({
  imports: [CharactersModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule { }

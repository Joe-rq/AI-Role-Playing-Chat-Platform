import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { Character } from './entities/character.entity';
import { Session } from '../chat/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Character, Session])],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { Character } from './entities/character.entity';
import { Session } from '../chat/entities/session.entity';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-code';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(createCharacterDto: CreateCharacterDto): Promise<Character> {
    const character = this.characterRepository.create(createCharacterDto);
    return this.characterRepository.save(character);
  }

  async findAll(): Promise<Character[]> {
    return this.characterRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Character> {
    const character = await this.characterRepository.findOne({ where: { id } });
    if (!character) {
      throw new BusinessException(
        ErrorCode.CHARACTER_NOT_FOUND,
        `角色 ID ${id} 不存在`,
      );
    }
    return character;
  }

  async update(
    id: number,
    updateCharacterDto: UpdateCharacterDto,
  ): Promise<Character> {
    const character = await this.findOne(id);
    Object.assign(character, updateCharacterDto);
    return this.characterRepository.save(character);
  }

  async remove(id: number): Promise<{ success: boolean; message?: string }> {
    const character = await this.findOne(id);

    // 检查是否有对话记录
    const sessionCount = await this.sessionRepository.count({
      where: { characterId: id },
    });

    if (sessionCount > 0) {
      throw new BusinessException(
        ErrorCode.CHARACTER_HAS_SESSIONS,
        `无法删除角色"${character.name}"，该角色已有 ${sessionCount} 条对话记录。建议编辑而非删除。`,
      );
    }

    await this.characterRepository.remove(character);
    return {
      success: true,
      message: `角色"${character.name}"已成功删除`,
    };
  }
}

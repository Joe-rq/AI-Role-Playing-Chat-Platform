import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { Character } from './entities/character.entity';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private readonly characterRepository: Repository<Character>,
  ) { }

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
      throw new NotFoundException(`Character with ID ${id} not found`);
    }
    return character;
  }

  async update(id: number, updateCharacterDto: UpdateCharacterDto): Promise<Character> {
    const character = await this.findOne(id);
    Object.assign(character, updateCharacterDto);
    return this.characterRepository.save(character);
  }

  async remove(id: number): Promise<void> {
    const character = await this.findOne(id);
    await this.characterRepository.remove(character);
  }
}

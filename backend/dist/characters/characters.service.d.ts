import { Repository } from 'typeorm';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { Character } from './entities/character.entity';
export declare class CharactersService {
    private readonly characterRepository;
    constructor(characterRepository: Repository<Character>);
    create(createCharacterDto: CreateCharacterDto): Promise<Character>;
    findAll(): Promise<Character[]>;
    findOne(id: number): Promise<Character>;
    update(id: number, updateCharacterDto: UpdateCharacterDto): Promise<Character>;
    remove(id: number): Promise<void>;
}

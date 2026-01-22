import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
export declare class CharactersController {
    private readonly charactersService;
    constructor(charactersService: CharactersService);
    create(createCharacterDto: CreateCharacterDto): Promise<import("./entities/character.entity").Character>;
    findAll(): Promise<import("./entities/character.entity").Character[]>;
    findOne(id: string): Promise<import("./entities/character.entity").Character>;
    update(id: string, updateCharacterDto: UpdateCharacterDto): Promise<import("./entities/character.entity").Character>;
    remove(id: string): Promise<void>;
}

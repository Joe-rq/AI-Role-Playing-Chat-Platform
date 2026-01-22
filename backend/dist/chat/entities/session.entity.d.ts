import { Character } from '../../characters/entities/character.entity';
import { Message } from './message.entity';
export declare class Session {
    id: number;
    sessionKey: string;
    characterId: number;
    character: Character;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

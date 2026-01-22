import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SaveMessageDto } from './dto/save-message.dto';
import { CharactersService } from '../characters/characters.service';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';
export declare class ChatService {
    private readonly configService;
    private readonly charactersService;
    private readonly sessionRepository;
    private readonly messageRepository;
    private openai;
    constructor(configService: ConfigService, charactersService: CharactersService, sessionRepository: Repository<Session>, messageRepository: Repository<Message>);
    streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string>;
    saveMessage(dto: SaveMessageDto): Promise<{
        messageId: number;
        sessionId: number;
    }>;
    getHistory(sessionKey: string): Promise<{
        sessionId: null;
        characterId: null;
        messages: never[];
    } | {
        sessionId: number;
        characterId: number;
        messages: {
            id: number;
            role: "user" | "assistant";
            content: string;
            imageUrl: string;
            createdAt: string;
        }[];
    }>;
}

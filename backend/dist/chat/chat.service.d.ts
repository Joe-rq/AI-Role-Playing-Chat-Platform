import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CharactersService } from '../characters/characters.service';
export declare class ChatService {
    private readonly configService;
    private readonly charactersService;
    private openai;
    constructor(configService: ConfigService, charactersService: CharactersService);
    streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string>;
}

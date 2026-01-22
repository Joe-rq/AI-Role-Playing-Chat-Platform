import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    streamChat(chatRequest: ChatRequestDto, res: Response): Promise<void>;
}

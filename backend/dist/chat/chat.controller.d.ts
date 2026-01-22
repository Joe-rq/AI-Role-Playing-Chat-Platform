import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SaveMessageDto } from './dto/save-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    streamChat(chatRequest: ChatRequestDto, res: Response): Promise<void>;
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

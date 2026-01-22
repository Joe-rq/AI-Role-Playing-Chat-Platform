export declare class ChatMessageDto {
    role: 'user' | 'assistant';
    content: string;
    imageUrl?: string;
}
export declare class ChatRequestDto {
    characterId: number;
    message: string;
    imageUrl?: string;
    history?: ChatMessageDto[];
}

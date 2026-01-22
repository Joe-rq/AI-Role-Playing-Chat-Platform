export declare class SaveMessageDto {
    sessionKey: string;
    characterId: number;
    role: 'user' | 'assistant';
    content: string;
    imageUrl?: string;
}

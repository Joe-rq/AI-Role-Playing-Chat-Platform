import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class SaveMessageDto {
    @IsString()
    sessionKey: string;

    @IsNumber()
    characterId: number;

    @IsEnum(['user', 'assistant'])
    role: 'user' | 'assistant';

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}

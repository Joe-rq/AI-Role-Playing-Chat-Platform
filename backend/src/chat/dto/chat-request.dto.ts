import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
    @IsString()
    role: 'user' | 'assistant';

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}

export class ChatRequestDto {
    @IsNumber()
    characterId: number;

    @IsString()
    message: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    history?: ChatMessageDto[];
}

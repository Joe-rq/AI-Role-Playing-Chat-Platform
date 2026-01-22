import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateCharacterDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsString()
    systemPrompt: string;

    @IsOptional()
    @IsString()
    greeting?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}

import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  preferredModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  exampleDialogues?: string;
}

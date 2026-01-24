import { IsString, IsBoolean, IsNumber, IsOptional, IsIn, MinLength, Min, Max } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  modelId: string;

  @IsString()
  @IsIn(['openai', 'anthropic', 'google', 'alibaba', 'deepseek', 'zhipu'])
  provider: string;

  @IsString()
  @MinLength(10)
  apiKey: string;

  @IsString()
  @MinLength(1)
  baseURL: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  defaultTemperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  defaultMaxTokens?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  modelId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['openai', 'anthropic', 'google', 'alibaba', 'deepseek', 'zhipu'])
  provider?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  baseURL?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  defaultTemperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(32000)
  defaultMaxTokens?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class ModelDto {
  id: number;
  name: string;
  modelId: string;
  provider: string;
  apiKeyMasked: string; // 脱敏后的API Key
  baseURL: string;
  isEnabled: boolean;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  description?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

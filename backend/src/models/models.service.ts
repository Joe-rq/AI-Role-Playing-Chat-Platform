import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from './entities/model.entity';
import { CreateModelDto, UpdateModelDto, ModelDto } from './dto/model.dto';
import { encrypt, decrypt, maskApiKey } from './encryption.util';

@Injectable()
export class ModelsService {
  // 简单的内存缓存，避免每次都查数据库
  private modelCache: Map<string, { model: Model; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    @InjectRepository(Model)
    private modelsRepository: Repository<Model>,
  ) {}

  /**
   * 获取所有模型配置（API Key脱敏）
   */
  async findAll(): Promise<ModelDto[]> {
    const models = await this.modelsRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return models.map((model) => this.toDto(model));
  }

  /**
   * 获取已启用的模型（用于角色选择）
   */
  async findEnabled(): Promise<ModelDto[]> {
    const models = await this.modelsRepository.find({
      where: { isEnabled: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
    return models.map((model) => this.toDto(model));
  }

  /**
   * 根据ID获取模型配置
   */
  async findOne(id: number): Promise<ModelDto> {
    const model = await this.modelsRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }
    return this.toDto(model);
  }

  /**
   * 根据modelId获取模型配置（用于chat service，包含解密的API Key）
   * 带缓存机制
   */
  async findByModelId(modelId: string): Promise<Model | null> {
    // 检查缓存
    const cached = this.modelCache.get(modelId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.model;
    }

    // 从数据库查询
    const model = await this.modelsRepository.findOne({
      where: { modelId, isEnabled: true },
    });

    if (model) {
      // 更新缓存
      this.modelCache.set(modelId, { model, timestamp: Date.now() });
    }

    return model;
  }

  /**
   * 创建新模型配置
   */
  async create(createModelDto: CreateModelDto): Promise<Model> {
    // 检查modelId是否已存在
    const existing = await this.modelsRepository.findOne({
      where: { modelId: createModelDto.modelId },
    });
    if (existing) {
      throw new BadRequestException(
        `Model with modelId "${createModelDto.modelId}" already exists`,
      );
    }

    // 加密API Key
    const encryptedApiKey = encrypt(createModelDto.apiKey);

    const model = this.modelsRepository.create({
      ...createModelDto,
      apiKey: encryptedApiKey,
    });

    const saved = await this.modelsRepository.save(model);

    // 清除缓存
    this.clearCache();

    return saved;
  }

  /**
   * 更新模型配置
   */
  async update(id: number, updateModelDto: UpdateModelDto): Promise<Model> {
    const model = await this.modelsRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    // 如果提供了新的API Key，则加密
    if (updateModelDto.apiKey) {
      updateModelDto.apiKey = encrypt(updateModelDto.apiKey);
    }

    // 如果修改了modelId，检查是否与其他模型冲突
    if (updateModelDto.modelId && updateModelDto.modelId !== model.modelId) {
      const existing = await this.modelsRepository.findOne({
        where: { modelId: updateModelDto.modelId },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Model with modelId "${updateModelDto.modelId}" already exists`,
        );
      }
    }

    Object.assign(model, updateModelDto);
    const saved = await this.modelsRepository.save(model);

    // 清除缓存
    this.clearCache();

    return saved;
  }

  /**
   * 删除模型配置
   */
  async remove(id: number): Promise<void> {
    const model = await this.modelsRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    await this.modelsRepository.remove(model);

    // 清除缓存
    this.clearCache();
  }

  /**
   * 测试模型连接
   */
  async testConnection(
    id: number,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const model = await this.modelsRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    try {
      const decryptedApiKey = decrypt(model.apiKey);

      // 动态导入OpenAI SDK
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: decryptedApiKey,
        baseURL: model.baseURL,
      });

      // 发送简单的测试请求
      const response = await openai.chat.completions.create({
        model: model.modelId,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });

      return {
        success: true,
        message: '连接成功！模型响应正常。',
        details: {
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败：${error.message}`,
        details: {
          error: error.message,
          code: error.code,
        },
      };
    }
  }

  /**
   * 获取解密后的API Key（仅供内部使用）
   */
  getDecryptedApiKey(model: Model): string {
    return decrypt(model.apiKey);
  }

  /**
   * 转换为DTO（脱敏API Key）
   */
  private toDto(model: Model): ModelDto {
    // 解密后再脱敏显示
    let maskedKey: string;
    try {
      const decryptedKey = decrypt(model.apiKey);
      maskedKey = maskApiKey(decryptedKey);
    } catch (error) {
      maskedKey = '****';
    }

    return {
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      provider: model.provider,
      apiKeyMasked: maskedKey,
      baseURL: model.baseURL,
      isEnabled: model.isEnabled,
      defaultTemperature: model.defaultTemperature,
      defaultMaxTokens: model.defaultMaxTokens,
      description: model.description,
      sortOrder: model.sortOrder,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.modelCache.clear();
  }
}

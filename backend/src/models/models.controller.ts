import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ModelsService } from './models.service';
import { CreateModelDto, UpdateModelDto, ModelDto } from './dto/model.dto';
import { Model } from './entities/model.entity';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  /**
   * GET /models - 获取所有模型配置（API Key脱敏）
   */
  @Get()
  async findAll(): Promise<ModelDto[]> {
    return this.modelsService.findAll();
  }

  /**
   * GET /models/enabled - 获取已启用的模型（用于角色选择）
   */
  @Get('enabled')
  async findEnabled(): Promise<ModelDto[]> {
    return this.modelsService.findEnabled();
  }

  /**
   * GET /models/:id - 获取单个模型配置
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ModelDto> {
    return this.modelsService.findOne(id);
  }

  /**
   * POST /models - 创建新模型配置
   */
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() createModelDto: CreateModelDto): Promise<Model> {
    return this.modelsService.create(createModelDto);
  }

  /**
   * PUT /models/:id - 更新模型配置
   */
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModelDto: UpdateModelDto,
  ): Promise<Model> {
    return this.modelsService.update(id, updateModelDto);
  }

  /**
   * DELETE /models/:id - 删除模型配置
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.modelsService.remove(id);
    return { message: 'Model deleted successfully' };
  }

  /**
   * POST /models/:id/test - 测试模型连接
   */
  @Post(':id/test')
  async testConnection(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean; message: string; details?: any }> {
    return this.modelsService.testConnection(id);
  }
}

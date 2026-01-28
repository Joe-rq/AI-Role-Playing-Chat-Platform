import { Controller, Get, Post, Param, Query, Logger } from '@nestjs/common';
import { MemuService, MemoryCategory, MemoryItem } from './memu.service';

@Controller('memory')
export class MemuController {
  private readonly logger = new Logger(MemuController.name);

  constructor(private readonly memuService: MemuService) {}

  /**
   * 获取 memU 服务状态
   */
  @Get('status')
  getStatus() {
    return {
      enabled: this.memuService.isEnabled(),
      message: this.memuService.isEnabled()
        ? 'memU 记忆服务已启用'
        : 'memU 记忆服务未启用（请配置 MEMU_API_KEY 和 MEMU_ENABLED=true）',
    };
  }

  /**
   * 获取指定角色对应的记忆分类
   * GET /memory/categories?sessionKey=xxx&characterId=1
   */
  @Get('categories')
  async getCategories(
    @Query('sessionKey') sessionKey: string,
    @Query('characterId') characterId: string,
  ): Promise<{ categories: MemoryCategory[] }> {
    if (!sessionKey || !characterId) {
      return { categories: [] };
    }

    const categories = await this.memuService.getCategories(
      sessionKey,
      parseInt(characterId),
    );

    return { categories };
  }

  /**
   * 检索相关记忆
   * GET /memory/retrieve?sessionKey=xxx&characterId=1&query=xxx
   */
  @Get('retrieve')
  async retrieveMemories(
    @Query('sessionKey') sessionKey: string,
    @Query('characterId') characterId: string,
    @Query('query') query: string,
    @Query('method') method: 'rag' | 'llm' = 'rag',
  ): Promise<{ items: MemoryItem[]; categories: MemoryCategory[] }> {
    if (!sessionKey || !characterId || !query) {
      return { items: [], categories: [] };
    }

    const result = await this.memuService.retrieve(
      sessionKey,
      parseInt(characterId),
      query,
      method,
    );

    return {
      items: result?.items || [],
      categories: result?.categories || [],
    };
  }

  /**
   * 查询记忆存储任务状态
   * GET /memory/memorize/status/:taskId
   */
  @Get('memorize/status/:taskId')
  async getMemorizeStatus(@Param('taskId') taskId: string) {
    const result = await this.memuService.getMemorizeStatus(taskId);
    return result || { taskId, status: 'unknown' };
  }
}

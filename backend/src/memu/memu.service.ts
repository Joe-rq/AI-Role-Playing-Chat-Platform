import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * memU 记忆项
 */
export interface MemoryItem {
  id?: string;
  content: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * memU 记忆分类
 */
export interface MemoryCategory {
  name: string;
  description?: string;
  itemCount: number;
}

/**
 * 检索结果
 */
export interface RetrieveResult {
  items: MemoryItem[];
  categories: MemoryCategory[];
  resources?: unknown[];
}

/**
 * 存储结果
 */
export interface MemorizeResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  items?: MemoryItem[];
}

@Injectable()
export class MemuService {
  private readonly logger = new Logger(MemuService.name);
  private readonly client: AxiosInstance;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MEMU_API_KEY');
    const baseURL =
      this.configService.get<string>('MEMU_BASE_URL') || 'https://api.memu.so';
    this.enabled = this.configService.get<string>('MEMU_ENABLED') === 'true';

    if (!apiKey && this.enabled) {
      this.logger.warn('memU API Key 未配置，记忆功能将被禁用');
      this.enabled = false;
    }

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30秒超时
    });

    if (this.enabled) {
      this.logger.log('memU 记忆服务已启用');
    }
  }

  /**
   * 检查 memU 服务是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 生成 memU 用户标识
   * 使用 sessionKey + characterId 组合，确保每个用户与每个角色的记忆隔离
   */
  private generateUserId(sessionKey: string, characterId: number): string {
    // 从 sessionKey 中提取用户标识部分（格式: user_{timestamp}_{random}_char_{id}）
    const userPart = sessionKey.split('_char_')[0] || sessionKey;
    return `${userPart}_char_${characterId}`;
  }

  /**
   * 存储对话记忆
   * 将对话内容发送到 memU 进行处理和存储
   *
   * @param sessionKey 会话标识
   * @param characterId 角色ID
   * @param messages 对话消息数组
   * @returns 存储任务结果
   */
  async memorize(
    sessionKey: string,
    characterId: number,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<MemorizeResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const userId = this.generateUserId(sessionKey, characterId);

      // 将消息格式化为 memU 期望的格式
      const content = messages.map((msg) => ({
        role: msg.role,
        content: { text: msg.content },
      }));

      this.logger.log(
        `开始存储记忆 - userId: ${userId}, messages: ${messages.length}`,
      );

      const response = await this.client.post('/api/v3/memory/memorize', {
        content,
        metadata: {
          user_id: userId,
          agent_id: `character_${characterId}`,
          session_key: sessionKey,
          type: 'conversation',
        },
      });

      const result: MemorizeResult = {
        taskId: response.data.task_id || response.data.id,
        status: response.data.status || 'pending',
        items: response.data.items,
      };

      this.logger.log(
        `记忆存储成功 - taskId: ${result.taskId}, status: ${result.status}`,
      );
      return result;
    } catch (error) {
      this.logger.error('记忆存储失败', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      // 不抛出错误，让对话继续
      return null;
    }
  }

  /**
   * 检索相关记忆
   * 根据当前对话上下文检索相关的历史记忆
   *
   * @param sessionKey 会话标识
   * @param characterId 角色ID
   * @param query 查询内容（当前用户消息）
   * @param method 检索方法：'rag' 快速检索，'llm' 深度推理
   * @returns 相关记忆列表
   */
  async retrieve(
    sessionKey: string,
    characterId: number,
    query: string,
    method: 'rag' | 'llm' = 'rag',
  ): Promise<RetrieveResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const userId = this.generateUserId(sessionKey, characterId);

      this.logger.log(`开始检索记忆 - userId: ${userId}, method: ${method}`);

      const response = await this.client.post('/api/v3/memory/retrieve', {
        queries: [{ role: 'user', content: { text: query } }],
        where: {
          user_id: userId,
          agent_id: `character_${characterId}`,
        },
        method,
        limit: 10, // 最多返回10条记忆
      });

      const result: RetrieveResult = {
        items: response.data.items || [],
        categories: response.data.categories || [],
        resources: response.data.resources || [],
      };

      this.logger.log(`记忆检索完成 - 找到 ${result.items.length} 条记忆`);
      return result;
    } catch (error) {
      this.logger.error('记忆检索失败', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      // 不抛出错误，让对话继续（无记忆）
      return null;
    }
  }

  /**
   * 获取记忆分类
   * 查看用户与特定角色的所有记忆分类
   *
   * @param sessionKey 会话标识
   * @param characterId 角色ID
   * @returns 记忆分类列表
   */
  async getCategories(
    sessionKey: string,
    characterId: number,
  ): Promise<MemoryCategory[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const userId = this.generateUserId(sessionKey, characterId);

      const response = await this.client.post('/api/v3/memory/categories', {
        where: {
          user_id: userId,
          agent_id: `character_${characterId}`,
        },
      });

      return response.data.categories || [];
    } catch (error) {
      this.logger.error('获取记忆分类失败', error.message);
      return [];
    }
  }

  /**
   * 检查记忆存储任务状态
   *
   * @param taskId 任务ID
   * @returns 任务状态
   */
  async getMemorizeStatus(taskId: string): Promise<MemorizeResult | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.client.get(
        `/api/v3/memory/memorize/status/${taskId}`,
      );

      return {
        taskId,
        status: response.data.status,
        items: response.data.items,
      };
    } catch (error) {
      this.logger.error('获取记忆存储状态失败', error.message);
      return null;
    }
  }

  /**
   * 将记忆格式化为可注入 System Prompt 的文本
   *
   * @param memories 记忆项列表
   * @returns 格式化的记忆文本
   */
  formatMemoriesForPrompt(memories: MemoryItem[]): string {
    if (!memories || memories.length === 0) {
      return '';
    }

    const memoryLines = memories
      .slice(0, 10) // 最多使用10条记忆
      .map((m) => `- ${m.content}`)
      .join('\n');

    return `
## 关于这位用户的记忆
以下是你在之前的对话中记住的关于这位用户的信息：
${memoryLines}

请在回复时自然地结合这些记忆，让对话更加连贯和个性化。不需要刻意提及"我记得"。
`;
  }
}

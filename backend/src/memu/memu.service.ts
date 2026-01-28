import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Mem0.ai 记忆项
 */
export interface MemoryItem {
    id?: string;
    memory: string; // Mem0 使用 memory 字段
    content?: string; // 兼容旧代码
    category?: string;
    categories?: string[];
    metadata?: Record<string, unknown>;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * 记忆分类
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
    private enabled: boolean;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('MEMU_API_KEY');
        // Mem0.ai 默认 API 地址
        const baseURL =
            this.configService.get<string>('MEMU_BASE_URL') ||
            'https://api.mem0.ai';
        this.enabled = this.configService.get<string>('MEMU_ENABLED') === 'true';

        if (!apiKey && this.enabled) {
            this.logger.warn('Mem0 API Key 未配置，记忆功能将被禁用');
            this.enabled = false;
        }

        // Mem0.ai 使用 Token 认证格式
        this.client = axios.create({
            baseURL,
            headers: {
                Authorization: `Token ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30000, // 30秒超时
        });

        if (this.enabled) {
            this.logger.log(`Mem0 记忆服务已启用 (${baseURL})`);
        }
    }

    /**
     * 检查记忆服务是否启用
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 生成用户标识
     * 使用持久化用户ID + characterId 组合，确保：
     * - 同一用户与同一角色 → 跨会话共享记忆
     * - 同一用户与不同角色 → 记忆隔离
     */
    private generateUserId(persistentUserId: string, characterId: number): string {
        // persistentUserId 由前端 localStorage 提供，跨会话固定
        return `${persistentUserId}_char_${characterId}`;
    }


    /**
     * 存储对话记忆
     * 将对话内容发送到 Mem0.ai 进行处理和存储
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

            // Mem0.ai 期望的消息格式
            const formattedMessages = messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            this.logger.log(
                `开始存储记忆 - userId: ${userId}, messages: ${messages.length}`,
            );

            // Mem0.ai API: POST /v1/memories/
            const response = await this.client.post('/v1/memories/', {
                user_id: userId,
                agent_id: `character_${characterId}`,
                messages: formattedMessages,
                metadata: {
                    session_key: sessionKey,
                    character_id: characterId,
                    type: 'conversation',
                },
            });

            // Mem0 返回数组格式
            const items = Array.isArray(response.data) ? response.data : [];

            const result: MemorizeResult = {
                taskId: items[0]?.id || 'completed',
                status: 'completed',
                items: items.map((item: any) => ({
                    id: item.id,
                    memory: item.data?.memory || item.memory,
                    content: item.data?.memory || item.memory,
                })),
            };

            this.logger.log(
                `记忆存储成功 - 已创建 ${result.items?.length || 0} 条记忆`,
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
     * @param method 检索方法（Mem0 不区分，保留接口兼容）
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

            this.logger.log(`开始检索记忆 - userId: ${userId}`);

            // Mem0.ai API V2: POST /v2/memories/search/
            // V2 API 必须提供 filters，其他参数可选
            const response = await this.client.post('/v2/memories/search/', {
                query,
                version: 'v2',
                filters: {
                    user_id: userId, // V2 API 需要通过 filters 过滤
                },
            });


            // Mem0 V2 返回 { results: [...] } 或直接数组
            const memories = response.data?.results || response.data || [];

            // 调试日志：输出完整响应
            if (memories.length === 0) {
                this.logger.warn(`Mem0 检索结果为空 - 响应: ${JSON.stringify(response.data).slice(0, 500)}`);
            }


            const result: RetrieveResult = {
                items: memories.map((m: any) => ({
                    id: m.id,
                    memory: m.memory,
                    content: m.memory, // 兼容旧代码
                    categories: m.categories || [],
                    metadata: m.metadata,
                    user_id: m.user_id,
                    created_at: m.created_at,
                })),
                categories: [], // Mem0 在 search 结果中不单独返回分类
                resources: [],
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
     * 获取记忆分类（Mem0 通过 GET memories 实现）
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

            // Mem0.ai API: GET /v1/memories/?user_id=xxx
            const response = await this.client.get('/v1/memories/', {
                params: {
                    user_id: userId,
                    agent_id: `character_${characterId}`,
                },
            });

            const memories = response.data?.results || response.data || [];

            // 从记忆中提取分类统计
            const categoryMap = new Map<string, number>();
            memories.forEach((m: any) => {
                const cats = m.categories || [];
                cats.forEach((cat: string) => {
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
                });
            });

            return Array.from(categoryMap.entries()).map(([name, count]) => ({
                name,
                itemCount: count,
            }));
        } catch (error) {
            this.logger.error('获取记忆分类失败', error.message);
            return [];
        }
    }

    /**
     * 检查记忆存储任务状态（Mem0 同步存储，此方法保留接口兼容）
     *
     * @param taskId 任务ID（Mem0 中为 memory ID）
     * @returns 任务状态
     */
    async getMemorizeStatus(taskId: string): Promise<MemorizeResult | null> {
        if (!this.enabled) {
            return null;
        }

        try {
            // Mem0.ai 是同步存储，直接获取记忆详情
            const response = await this.client.get(`/v1/memories/${taskId}/`);

            return {
                taskId,
                status: 'completed',
                items: [
                    {
                        id: response.data.id,
                        memory: response.data.memory,
                        content: response.data.memory,
                    },
                ],
            };
        } catch (error) {
            this.logger.error('获取记忆状态失败', error.message);
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
            .map((m) => `- ${m.memory || m.content}`)
            .join('\n');

        return `
## 关于这位用户的记忆
以下是你在之前的对话中记住的关于这位用户的信息：
${memoryLines}

请在回复时自然地结合这些记忆，让对话更加连贯和个性化。不需要刻意提及"我记得"。
`;
    }
}

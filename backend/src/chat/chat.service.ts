import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SaveMessageDto } from './dto/save-message.dto';
import { CharactersService } from '../characters/characters.service';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';
import { ModelsService } from '../models/models.service';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService,
        private readonly charactersService: CharactersService,
        private readonly modelsService: ModelsService,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) {
        // 移除固定的OpenAI实例，改为每次请求时动态创建
    }

    async *streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string> {
        const character = await this.charactersService.findOne(chatRequest.characterId);

        // ✅ 替换systemPrompt中的变量占位符
        const systemPrompt = this.replaceVariables(character.systemPrompt, chatRequest);

        // 构建消息数组
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt,
            },
        ];

        // 添加历史记录（滑动窗口截断）
        if (chatRequest.history && chatRequest.history.length > 0) {
            const maxTurns = parseInt(this.configService.get<string>('MAX_HISTORY_TURNS') || '20');
            const originalLength = chatRequest.history.length;

            // 只保留最近 N 轮对话（每轮包含用户消息和AI回复，算作2条消息）
            const maxMessages = maxTurns * 2;
            const truncatedHistory = chatRequest.history.slice(-maxMessages);

            // 日志记录截断情况
            if (originalLength > maxMessages) {
                this.logger.log(`上下文窗口截断: ${originalLength} -> ${truncatedHistory.length} (保留最近${maxTurns}轮)`);
            }

            // ✅ 注入 Few-shot 示例对话（在历史消息之前）
            if (character.exampleDialogues) {
                try {
                    const examples = JSON.parse(character.exampleDialogues);
                    if (Array.isArray(examples) && examples.length > 0) {
                        this.logger.log(`注入 ${examples.length} 个Few-shot示例`);
                        for (const example of examples) {
                            if (example.user && example.assistant) {
                                messages.push({ role: 'user', content: example.user });
                                messages.push({ role: 'assistant', content: example.assistant });
                            }
                        }
                    }
                } catch (e) {
                    this.logger.warn('Few-shot示例解析失败', e);
                }
            }

            for (const msg of truncatedHistory) {
                messages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }

        // 添加当前用户消息
        if (chatRequest.imageUrl) {
            // 多模态消息（带图片）
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: chatRequest.message },
                    { type: 'image_url', image_url: { url: chatRequest.imageUrl } },
                ],
            });
        } else {
            messages.push({
                role: 'user',
                content: chatRequest.message,
            });
        }

        // 日志：记录最终发送的消息数量
        this.logger.log(`LLM请求 - 总消息数: ${messages.length} (system: 1, history: ${messages.length - 2}, current: 1)`);

        // ✅ 从数据库获取模型配置
        const modelId = character.preferredModel || this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
        const modelConfig = await this.modelsService.findByModelId(modelId);

        if (!modelConfig) {
            // Fallback: 使用环境变量配置
            this.logger.warn(`模型配置不存在: ${modelId}，使用环境变量fallback`);
            const fallbackApiKey = this.configService.get<string>('OPENAI_API_KEY');
            const fallbackBaseURL = this.configService.get<string>('OPENAI_BASE_URL');

            if (!fallbackApiKey || !fallbackBaseURL) {
                throw new BadRequestException(`模型 "${modelId}" 未配置，且环境变量fallback不可用`);
            }

            this.openai = new OpenAI({
                apiKey: fallbackApiKey,
                baseURL: fallbackBaseURL,
            });
        } else if (!modelConfig.isEnabled) {
            throw new BadRequestException(`模型 "${modelId}" 已被禁用`);
        } else {
            // 使用数据库配置创建OpenAI实例
            const decryptedApiKey = this.modelsService.getDecryptedApiKey(modelConfig);
            this.openai = new OpenAI({
                apiKey: decryptedApiKey,
                baseURL: modelConfig.baseURL,
            });
        }

        // ✅ 使用角色配置的模型和参数
        const temperature = character.temperature ?? modelConfig?.defaultTemperature ?? 0.7;
        const maxTokens = character.maxTokens ?? modelConfig?.defaultMaxTokens ?? 2000;

        this.logger.log(`模型配置 - model: ${modelId}, temperature: ${temperature}, maxTokens: ${maxTokens}`);

        // 调用 LLM API (流式) - 启用 Token 统计
        const stream = await this.openai.chat.completions.create({
            model: modelId,
            messages,
            stream: true,
            temperature: temperature,
            max_tokens: maxTokens,
            stream_options: { include_usage: true }, // 启用 Token 统计
        });

        let totalTokens = 0;
        let promptTokens = 0;
        let completionTokens = 0;
        let responseText = ''; // 用于回退估算

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                responseText += content;
                yield content;
            }

            // 收集 Token 统计信息（通常在最后一个 chunk）
            if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens || 0;
                completionTokens = chunk.usage.completion_tokens || 0;
                totalTokens = chunk.usage.total_tokens || 0;
            }
        }

        // 记录 Token 消耗
        if (totalTokens > 0) {
            this.logger.log(`Token统计 - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}`);
        } else {
            // 回退：使用简单估算（粗略：1 token ≈ 4 字符）
            const estimatedPromptTokens = Math.ceil(JSON.stringify(messages).length / 4);
            const estimatedCompletionTokens = Math.ceil(responseText.length / 4);
            const estimatedTotal = estimatedPromptTokens + estimatedCompletionTokens;
            this.logger.warn(
                `Token统计不可用，使用估算 - Prompt: ~${estimatedPromptTokens}, Completion: ~${estimatedCompletionTokens}, Total: ~${estimatedTotal}`
            );
        }
    }

    /**
     * 保存消息到数据库（自动创建或复用会话）
     */
    async saveMessage(dto: SaveMessageDto) {
        // 查找或创建会话
        let session = await this.sessionRepository.findOne({
            where: { sessionKey: dto.sessionKey }
        });

        if (!session) {
            session = this.sessionRepository.create({
                sessionKey: dto.sessionKey,
                characterId: dto.characterId,
            });
            await this.sessionRepository.save(session);
        }

        // 保存消息
        const message = this.messageRepository.create({
            sessionId: session.id,
            role: dto.role,
            content: dto.content,
            imageUrl: dto.imageUrl,
        });

        const savedMessage = await this.messageRepository.save(message);

        // ✅ 更新session的updatedAt时间戳，确保会话列表排序正确
        session.updatedAt = new Date();
        await this.sessionRepository.save(session);

        return {
            messageId: savedMessage.id,
            sessionId: session.id,
        };
    }

    /**
     * 获取会话历史消息
     */
    async getHistory(sessionKey: string) {
        const session = await this.sessionRepository.findOne({
            where: { sessionKey },
            relations: ['messages'],
        });

        if (!session) {
            return {
                sessionId: null,
                characterId: null,
                messages: [],
            };
        }

        // 按创建时间排序
        const messages = session.messages
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                imageUrl: msg.imageUrl,
                createdAt: msg.createdAt.toISOString(),
            }));

        return {
            sessionId: session.id,
            characterId: session.characterId,
            messages,
        };
    }

    /**
     * 删除指定角色的所有会话与消息
     */
    async clearCharacterHistory(characterId: number) {
        const sessions = await this.sessionRepository.find({
            where: { characterId },
        });

        if (sessions.length === 0) {
            return { deletedSessions: 0, deletedMessages: 0 };
        }

        const sessionIds = sessions.map(session => session.id);

        const deleteMessagesResult = await this.messageRepository.delete({
            sessionId: In(sessionIds),
        });

        const deleteSessionsResult = await this.sessionRepository.delete({
            id: In(sessionIds),
        });

        return {
            deletedSessions: deleteSessionsResult.affected || 0,
            deletedMessages: deleteMessagesResult.affected || 0,
        };
    }

    /**
     * 获取会话列表（支持分页）
     */
    async getSessions(characterId?: number, page = 1, limit = 20) {
        // ✅ 修复1：分离查询，避免 leftJoin 造成的分页失真
        // 先查询符合条件的 sessions（不加载 messages）
        const queryBuilder = this.sessionRepository
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.character', 'character')
            .orderBy('session.updatedAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (characterId) {
            queryBuilder.where('session.characterId = :characterId', { characterId });
        }

        const [sessions, total] = await queryBuilder.getManyAndCount();

        // ✅ 修复2：单独查询每个 session 的最后一条消息
        const sessionsWithDetails = await Promise.all(
            sessions.map(async (session) => {
                // 查询该会话的消息数量
                const messageCount = await this.messageRepository.count({
                    where: { sessionId: session.id }
                });

                // ✅ 修复3：查询最后一条消息（按创建时间倒序取第一条）
                const lastMessage = await this.messageRepository.findOne({
                    where: { sessionId: session.id },
                    order: { createdAt: 'DESC' }
                });

                return {
                    sessionKey: session.sessionKey,
                    characterId: session.characterId,
                    characterName: session.character?.name || 'Unknown',
                    characterAvatar: session.character?.avatar || '',
                    messageCount: messageCount,
                    lastMessage: lastMessage?.content?.slice(0, 50) || '',
                    updatedAt: session.updatedAt,
                };
            })
        );

        return {
            sessions: sessionsWithDetails,
            total,
            page,
            limit,
        };
    }

    /**
     * 删除单个会话及其所有消息
     */
    async deleteSession(sessionKey: string) {
        const session = await this.sessionRepository.findOne({ where: { sessionKey } });

        if (!session) {
            this.logger.warn(`会话不存在: ${sessionKey}`);
            return { success: false, message: '会话不存在' };
        }

        // 删除关联消息
        await this.messageRepository.delete({ sessionId: session.id });

        // 删除会话
        await this.sessionRepository.delete({ id: session.id });

        this.logger.log(`已删除会话: ${sessionKey}`);
        return { success: true };
    }

    /**
     * 导出会话数据
     */
    async exportSession(sessionKey: string) {
        return await this.getHistory(sessionKey);
    }

    /**
     * 获取可用的AI模型列表（2026年最新）
     */
    async getAvailableModels() {
        return {
            models: [
                // === OpenAI ===
                {
                    id: 'gpt-5.2-chat',
                    name: 'GPT-5.2 Chat',
                    provider: 'OpenAI',
                    description: '最新GPT-5系列，极强推理和创造力'
                },
                {
                    id: 'gpt-5.1',
                    name: 'GPT-5.1',
                    provider: 'OpenAI',
                    description: 'GPT-5标准版，全面升级'
                },
                {
                    id: 'gpt-4o',
                    name: 'GPT-4o',
                    provider: 'OpenAI',
                    description: '多模态旗舰模型，支持文本、图像、音频'
                },
                {
                    id: 'gpt-4o-mini',
                    name: 'GPT-4o Mini',
                    provider: 'OpenAI',
                    description: '高性价比，日常对话推荐'
                },

                // === Anthropic Claude ===
                {
                    id: 'claude-opus-4.5',
                    name: 'Claude Opus 4.5',
                    provider: 'Anthropic',
                    description: '最强推理能力，适合复杂任务'
                },
                {
                    id: 'claude-sonnet-4.5',
                    name: 'Claude Sonnet 4.5',
                    provider: 'Anthropic',
                    description: '平衡性能与成本，推荐'
                },

                // === Google Gemini ===
                {
                    id: 'gemini-3-pro',
                    name: 'Gemini 3 Pro',
                    provider: 'Google',
                    description: '最新Gemini模型，强大多模态能力'
                },
                {
                    id: 'gemini-3-flash',
                    name: 'Gemini 3 Flash',
                    provider: 'Google',
                    description: '高性能低成本，快速响应'
                },

                // === 阿里 Qwen ===
                {
                    id: 'qwen-max',
                    name: 'Qwen Max',
                    provider: 'Alibaba',
                    description: '通义千问最强模型'
                },
                {
                    id: 'qwen-plus',
                    name: 'Qwen Plus',
                    provider: 'Alibaba',
                    description: '通义千问平衡版'
                },

                // === DeepSeek ===
                {
                    id: 'deepseek-chat',
                    name: 'DeepSeek Chat (V3.2)',
                    provider: 'DeepSeek',
                    description: '高性价比，671B参数MoE模型'
                },

                // === 智谱 GLM ===
                {
                    id: 'glm-4.7',
                    name: 'GLM-4.7',
                    provider: 'Zhipu AI',
                    description: '最新旗舰模型，强大编码能力'
                },
                {
                    id: 'glm-4.7-flash',
                    name: 'GLM-4.7 Flash',
                    provider: 'Zhipu AI',
                    description: '轻量高效，适合本地部署'
                },
            ],
            defaultModel: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini'
        };
    }

    /**
     * 替换prompt中的变量占位符
     * @param prompt 原始prompt
     * @param chatRequest 请求信息
     * @returns 替换后的prompt
     */
    private replaceVariables(prompt: string, chatRequest: ChatRequestDto): string {
        if (!prompt) return prompt;

        const now = new Date();

        // 定义可用变量
        const variables = {
            '{{user_name}}': '用户',  // 默认称呼
            '{{current_time}}': now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            '{{current_date}}': now.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            }),
            '{{current_datetime}}': now.toLocaleString('zh-CN'),
            '{{current_year}}': now.getFullYear().toString(),
            '{{current_month}}': (now.getMonth() + 1).toString(),
            '{{current_day}}': now.getDate().toString(),
            '{{weekday}}': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()],
        };

        // 替换所有占位符
        let result = prompt;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        }

        return result;
    }
}

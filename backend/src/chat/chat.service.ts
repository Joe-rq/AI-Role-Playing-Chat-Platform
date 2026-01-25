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

        // ✅ 方案C：混合处理 - 如果有图片，先用GLM识别，再传给角色模型
        let userMessage = chatRequest.message;
        if (chatRequest.imageUrl) {
            this.logger.log('检测到图片，使用GLM模型进行图片识别...');
            try {
                const imageDescription = await this.getImageDescription(chatRequest.imageUrl);
                // 将图片描述添加到用户消息前面
                userMessage = `[图片内容: ${imageDescription}]\n\n${chatRequest.message}`;
                this.logger.log(`图片识别完成: ${imageDescription.slice(0, 100)}...`);
            } catch (error) {
                this.logger.error('图片识别失败', error);
                throw new BadRequestException(
                    `图片识别失败：${error.message}。请确保已在模型管理中配置 GLM-4.6V-Flash 模型。`
                );
            }
        }

        // 添加当前用户消息（纯文本，包含图片描述）
        messages.push({
            role: 'user',
            content: userMessage,
        });

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
     * 使用GLM模型识别图片内容
     * @param imageUrl 图片URL
     * @returns 图片描述文本
     */
    private async getImageDescription(imageUrl: string): Promise<string> {
        // 查找GLM模型配置
        const glmModelId = 'glm-4.6v-flash';
        const glmConfig = await this.modelsService.findByModelId(glmModelId);

        if (!glmConfig) {
            throw new BadRequestException(
                `未找到 GLM-4.6V-Flash 模型配置。请在模型管理页面添加该模型，用于图片识别功能。`
            );
        }

        if (!glmConfig.isEnabled) {
            throw new BadRequestException(
                `GLM-4.6V-Flash 模型已被禁用。请在模型管理页面启用该模型以使用图片识别功能。`
            );
        }

        // 将图片转换为 base64（如果是本地路径）
        let imageData = imageUrl;
        if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('http://127.0.0.1')) {
            try {
                // 从本地文件系统读取图片
                const fs = await import('fs');
                const path = await import('path');

                // 提取文件路径
                const urlObj = new URL(imageUrl);
                const filepath = path.join(process.cwd(), urlObj.pathname);

                // 读取文件并转换为 base64
                const imageBuffer = fs.readFileSync(filepath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = this.getMimeType(filepath);
                imageData = `data:${mimeType};base64,${base64Image}`;

                this.logger.log(`图片已转换为 base64 格式 (${(base64Image.length / 1024).toFixed(2)}KB)`);
            } catch (error) {
                this.logger.error('读取本地图片失败:', error);
                throw new BadRequestException(`无法读取图片文件：${error.message}`);
            }
        }

        // 创建GLM专用的OpenAI实例
        const decryptedApiKey = this.modelsService.getDecryptedApiKey(glmConfig);
        const glmClient = new OpenAI({
            apiKey: decryptedApiKey,
            baseURL: glmConfig.baseURL,
        });

        // 调用GLM进行图片识别
        try {
            this.logger.log(`调用 GLM API - modelId: ${glmModelId}, imageData length: ${imageData.length}`);
            this.logger.log(`imageData 前100个字符: ${imageData.substring(0, 100)}`);

            const response = await glmClient.chat.completions.create({
                model: glmModelId,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: imageData } },
                            { type: 'text', text: '请详细描述这张图片的内容，包括主要物体、场景、颜色、氛围等细节。' },
                        ],
                    },
                ],
                max_tokens: 500,
            });

            this.logger.log(`GLM 响应: ${JSON.stringify(response.choices[0])}`);

            // GLM-4.6V-Flash 可能使用 reasoning_content 字段返回内容
            const message = response.choices[0]?.message as any;
            const description = message?.reasoning_content || message?.content || '无法识别图片内容';

            return description;
        } catch (error) {
            this.logger.error('GLM API 调用失败:', {
                modelId: glmModelId,
                error: error.message,
                status: error.status,
                response: error.response?.data || error.response,
            });
            throw new BadRequestException(`图片识别失败：${error.status || ''} ${error.message}`);
        }
    }

    /**
     * 根据文件路径获取 MIME 类型
     */
    private getMimeType(filepath: string): string {
        const ext = filepath.toLowerCase().split('.').pop();
        if (!ext) return 'image/jpeg';

        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
        };
        return mimeTypes[ext] || 'image/jpeg';
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

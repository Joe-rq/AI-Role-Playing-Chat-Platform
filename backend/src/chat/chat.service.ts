import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SaveMessageDto } from './dto/save-message.dto';
import { CharactersService } from '../characters/characters.service';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService,
        private readonly charactersService: CharactersService,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY') || 'your-api-key',
            baseURL: this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
        });
    }

    async *streamChat(chatRequest: ChatRequestDto): AsyncGenerator<string> {
        const character = await this.charactersService.findOne(chatRequest.characterId);

        // 构建消息数组
        const messages: OpenAI.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: character.systemPrompt,
            },
        ];

        // 添加历史记录
        if (chatRequest.history && chatRequest.history.length > 0) {
            for (const msg of chatRequest.history) {
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

        // 调用 LLM API (流式)
        const stream = await this.openai.chat.completions.create({
            model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
            messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
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
}

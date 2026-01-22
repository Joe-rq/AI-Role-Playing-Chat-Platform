import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CharactersService } from '../characters/characters.service';

@Injectable()
export class ChatService {
    private openai: OpenAI;

    constructor(
        private readonly configService: ConfigService,
        private readonly charactersService: CharactersService,
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
}

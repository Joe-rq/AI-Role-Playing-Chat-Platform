import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    /**
     * SSE 流式对话接口
     * POST /chat/stream
     */
    @Post('stream')
    async streamChat(
        @Body() chatRequest: ChatRequestDto,
        @Res() res: Response,
    ): Promise<void> {
        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        try {
            for await (const chunk of this.chatService.streamChat(chatRequest)) {
                // SSE 格式: data: <content>\n\n
                res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
            // 发送结束信号
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (error) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        }
    }
}

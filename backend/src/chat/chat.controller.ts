import { Controller, Post, Get, Body, Res, Param, HttpStatus, Delete, Query, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SaveMessageDto } from './dto/save-message.dto';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

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

        // ✅ 监听客户端中断连接
        res.on('close', () => {
            this.logger.warn('客户端中断SSE连接（用户点击停止或关闭页面）');
            // OpenAI SDK 的流式请求会自动清理资源
        });

        try {
            for await (const chunk of this.chatService.streamChat(chatRequest)) {
                // SSE 格式: data: <content>\n\n
                res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
            // 发送结束信号
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (error) {
            this.logger.error('流式对话错误:', error);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        }
    }

    /**
     * 保存消息
     * POST /chat/messages
     */
    @Post('messages')
    async saveMessage(@Body() dto: SaveMessageDto) {
        return this.chatService.saveMessage(dto);
    }

    /**
     * 获取会话历史
     * GET /chat/sessions/:sessionKey/messages
     */
    @Get('sessions/:sessionKey/messages')
    async getHistory(@Param('sessionKey') sessionKey: string) {
        return this.chatService.getHistory(sessionKey);
    }

    /**
     * 删除指定角色的所有会话与消息
     * DELETE /chat/sessions/character/:characterId
     */
    @Delete('sessions/character/:characterId')
    async clearCharacterHistory(@Param('characterId') characterId: string) {
        return this.chatService.clearCharacterHistory(+characterId);
    }

    /**
     * 获取会话列表（支持分页和角色筛选）
     * GET /chat/sessions?characterId=1&page=1&limit=20
     */
    @Get('sessions')
    async getSessions(
        @Query('characterId') characterId?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.chatService.getSessions(
            characterId ? +characterId : undefined,
            +page,
            +limit
        );
    }

    /**
     * 删除单个会话及其所有消息
     * DELETE /chat/sessions/:sessionKey
     */
    @Delete('sessions/:sessionKey')
    async deleteSession(@Param('sessionKey') sessionKey: string) {
        return this.chatService.deleteSession(sessionKey);
    }

    /**
     * 导出会话数据（JSON格式）
     * GET /chat/sessions/:sessionKey/export
     */
    @Get('sessions/:sessionKey/export')
    async exportSession(@Param('sessionKey') sessionKey: string) {
        return this.chatService.exportSession(sessionKey);
    }
}

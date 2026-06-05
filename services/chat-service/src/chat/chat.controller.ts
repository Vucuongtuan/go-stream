import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SendMessageDto, ChatMessage } from './chat.types';

@Controller('api/rooms/:roomId/chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * SSE endpoint — client subscribes to receive real-time chat messages
   * GET /api/rooms/:roomId/chat/stream
   */
  @Get('stream')
  stream(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Res() res: FastifyReply,
  ): void {
    // SSE headers for Fastify
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    // Send chat history immediately
    const history = this.chatService.getHistory(roomId);
    for (const msg of history) {
      res.raw.write(`data: ${JSON.stringify(msg)}\n\n`);
    }

    // Subscribe to new messages
    const subject = this.chatService.getRoomSubject(roomId);
    const subscription = subject.subscribe({
      next: (msg) => {
        res.raw.write(`data: ${JSON.stringify(msg)}\n\n`);
      },
      complete: () => {
        res.raw.end();
      },
    });

    // Cleanup on client disconnect
    res.raw.on('close', () => {
      subscription.unsubscribe();
    });
  }

  /**
   * Send a chat message
   * POST /api/rooms/:roomId/chat
   */
  @Post()
  async sendMessage(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: SendMessageDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!dto.content) {
      res.status(HttpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: 400,
        message: 'Content is required',
      });
      return;
    }

    const message: ChatMessage = {
      id: uuidv4(),
      room_id: roomId,
      user_id: dto.user_id,
      user_name: dto.user_name,
      avatar: dto.avatar,
      content: dto.content,
      type: dto.type || 'text',
      created_at: new Date().toISOString(),
    };

    // Broadcast via SSE
    this.chatService.publish(roomId, message);

    // Publish to Kafka for Notification Service
    await this.kafkaProducer.publish('chat-events', String(roomId), {
      event_type: 'chat.message',
      timestamp: new Date().toISOString(),
      payload: message,
    });

    res.status(HttpStatus.CREATED).send({
      status: true,
      statusCode: 201,
      data: message,
    });
  }
}

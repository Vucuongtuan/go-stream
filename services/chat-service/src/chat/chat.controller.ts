import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpStatus,
  Inject,
  OnModuleInit,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Observable, lastValueFrom } from 'rxjs';
import { ChatService } from './chat.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SendMessageDto, ChatMessage } from './chat.types';
import { authenticatedUserID } from './auth';

const CHAT_HEARTBEAT_MS = 25_000;
const MAX_CHAT_MESSAGE_LENGTH = 500;
const CHAT_INSTANCE_ID = process.env.CHAT_INSTANCE_ID || process.env.HOSTNAME || 'chat-service';

interface ModerationGrpcService {
  isUserMuted(data: { roomId: number; userId: number }): Observable<{ isMuted: boolean; reason: string }>;
}

@Controller('api/rooms/:roomId/chat')
export class ChatController implements OnModuleInit {
  private moderationService: ModerationGrpcService;

  constructor(
    private readonly chatService: ChatService,
    private readonly kafkaProducer: KafkaProducerService,
    @Inject('MODERATION_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.moderationService = this.client.getService<ModerationGrpcService>('ModerationService');
  }

  /**
   * SSE endpoint — client subscribes to receive real-time chat messages
   * GET /api/rooms/:roomId/chat/stream
   */
  @Get('stream')
  stream(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Res() res: FastifyReply,
  ): void {
    res.hijack();
    // SSE headers for Fastify
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    // Keep intermediary proxies and mobile connections alive even when chat is idle.
    const heartbeat = setInterval(() => {
      if (!res.raw.destroyed && res.raw.writable) res.raw.write(': keepalive\n\n');
    }, CHAT_HEARTBEAT_MS);

    // Subscribe to new messages
    const subject = this.chatService.getRoomSubject(roomId);
    const subscription = subject.subscribe({
      next: (msg) => {
        res.raw.write(`data: ${JSON.stringify(msg)}\n\n`);
      },
      complete: () => {
        clearInterval(heartbeat);
        res.raw.end();
      },
    });

    // Cleanup on client disconnect
    res.raw.on('close', () => {
      clearInterval(heartbeat);
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
    @Req() request: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const userID = authenticatedUserID(request);
    if (!userID) {
      res.status(HttpStatus.UNAUTHORIZED).send({
        status: false,
        statusCode: 401,
        message: 'Invalid or expired authorization token',
      });
      return;
    }

    const content = typeof dto.content === 'string' ? dto.content.trim() : '';
    if (!content) {
      res.status(HttpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: 400,
        message: 'Content is required',
      });
      return;
    }
    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      res.status(HttpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: 400,
        message: `Content must not exceed ${MAX_CHAT_MESSAGE_LENGTH} characters`,
      });
      return;
    }
    // Gift and system messages are generated only by trusted server-side flows.
    if (dto.type && dto.type !== 'text') {
      res.status(HttpStatus.BAD_REQUEST).send({
        status: false,
        statusCode: 400,
        message: 'Only text chat messages can be sent through this endpoint',
      });
      return;
    }

    // Check if user is banned or timed out in main-api via gRPC
    try {
      const response = await lastValueFrom(
        this.moderationService.isUserMuted({ roomId, userId: userID })
      );
      if (response && response.isMuted) {
        res.status(HttpStatus.FORBIDDEN).send({
          status: false,
          statusCode: 403,
          message: response.reason || 'You are muted or banned from this chat room',
        });
        return;
      }
    } catch (e) {
      console.error('Failed to check mute status via gRPC:', e);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        status: false,
        statusCode: 503,
        message: 'Chat moderation is temporarily unavailable',
      });
      return;
    }

    const message: ChatMessage = {
      id: uuidv4(),
      room_id: roomId,
      user_id: userID,
      user_name: dto.user_name,
      avatar: dto.avatar,
      content,
      type: 'text',
      created_at: new Date().toISOString(),
    };

    // Broadcast via SSE
    this.chatService.publish(roomId, message);

    // Publish to Kafka for Notification Service
    await this.kafkaProducer.publish('chat-events', String(roomId), {
      event_type: 'chat.message',
      timestamp: new Date().toISOString(),
      payload: message,
      source: CHAT_INSTANCE_ID,
    });

    res.status(HttpStatus.CREATED).send({
      status: true,
      statusCode: 201,
      data: message,
    });
  }
}

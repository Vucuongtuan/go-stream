import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private consumer: Consumer;
  private readonly instanceID = process.env.CHAT_INSTANCE_ID || process.env.HOSTNAME || 'chat-service';

  constructor(private readonly chatService: ChatService) {
    const kafka = new Kafka({
      clientId: 'chat-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    // Every chat instance needs every event so it can notify the SSE clients
    // connected to that instance. A shared consumer group would deliver an
    // event to only one replica.
    this.consumer = kafka.consumer({ groupId: `chat-service-${this.instanceID}` });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    // Subscribe to multiple topics
    await this.consumer.subscribe({ topic: 'stream-events', fromBeginning: false });
    await this.consumer.subscribe({ topic: 'chat-events', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          console.log(`📨 Received event: ${event.event_type} on topic: ${topic}`);

          if (topic === 'stream-events') {
            switch (event.event_type) {
              case 'stream.ended':
                this.chatService.cleanupRoom(event.payload?.room_id);
                break;
              case 'stream.started':
                console.log(`🎬 Stream started for room ${event.payload?.room_id}`);
                break;
            }
          } else if (topic === 'chat-events') {
            switch (event.event_type) {
              case 'chat.message':
                // Local HTTP messages are already sent to connected SSE clients.
                // Consuming and republishing them would duplicate every message.
                if (event.source === this.instanceID) break;
                // Check if it is a donation/gift type or standard chat
                if (event.payload) {
                  this.chatService.publish(event.payload.room_id, {
                    id: event.payload.id,
                    room_id: event.payload.room_id,
                    user_id: event.payload.user_id,
                    user_name: event.payload.user_name,
                    avatar: event.payload.avatar,
                    content: event.payload.content,
                    type: event.payload.type,
                    created_at: event.payload.created_at,
                    gift_type: event.payload.gift_type,
                    coin: event.payload.coin,
                  });
                  console.log(`🎁 Gift/Chat broadcasted to room ${event.payload.room_id} from user ${event.payload.user_name}`);
                }
                break;
            }
          }
        } catch (error) {
          console.error('❌ Error processing Kafka message:', error);
        }
      },
    });

    console.log('📥 Kafka consumer subscribed to stream-events and chat-events');
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private consumer: Consumer;

  constructor(private readonly chatService: ChatService) {
    const kafka = new Kafka({
      clientId: 'chat-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = kafka.consumer({ groupId: 'chat-service-group' });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'stream-events', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          console.log(`📨 Received event: ${event.event_type}`);

          switch (event.event_type) {
            case 'stream.ended':
              this.chatService.cleanupRoom(event.payload?.room_id);
              break;
            case 'stream.started':
              console.log(`🎬 Stream started for room ${event.payload?.room_id}`);
              break;
          }
        } catch (error) {
          console.error('❌ Error processing Kafka message:', error);
        }
      },
    });

    console.log('📥 Kafka consumer subscribed to stream-events');
  }
}

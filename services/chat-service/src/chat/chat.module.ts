import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { KafkaModule } from '../kafka/kafka.module';
import { KafkaConsumerService } from '../kafka/kafka-consumer.service';

@Module({
  imports: [KafkaModule],
  controllers: [ChatController],
  providers: [ChatService, KafkaConsumerService],
  exports: [ChatService],
})
export class ChatModule {}

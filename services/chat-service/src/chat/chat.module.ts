import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { KafkaModule } from '../kafka/kafka.module';
import { KafkaConsumerService } from '../kafka/kafka-consumer.service';

@Module({
  imports: [
    KafkaModule,
    ClientsModule.register([
      {
        name: 'MODERATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'moderation',
          protoPath: join(__dirname, '../proto/moderation.proto'),
          url: process.env.MAIN_API_GRPC_URL || 'main-api:50051',
        },
      },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, KafkaConsumerService],
  exports: [ChatService],
})
export class ChatModule {}

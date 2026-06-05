import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [ChatModule, KafkaModule],
})
export class AppModule {}

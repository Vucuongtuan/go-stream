import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { KafkaModule } from './kafka/kafka.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ChatModule, KafkaModule],
  controllers: [HealthController],
})
export class AppModule {}

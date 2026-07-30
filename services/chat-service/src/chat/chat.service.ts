import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ChatMessage } from './chat.types';

@Injectable()
export class ChatService {
  // Room ID -> SSE subject for broadcasting
  private roomSubjects = new Map<number, Subject<ChatMessage>>();

  /**
   * Get or create a Subject for a room (used for SSE broadcasting)
   */
  getRoomSubject(roomId: number): Subject<ChatMessage> {
    if (!this.roomSubjects.has(roomId)) {
      this.roomSubjects.set(roomId, new Subject<ChatMessage>());
    }
    return this.roomSubjects.get(roomId)!;
  }

  /** Publish a message to currently connected SSE clients only. */
  publish(roomId: number, message: ChatMessage): void {
    const subject = this.getRoomSubject(roomId);
    subject.next(message);
  }

  /**
   * Cleanup room state when stream ends
   */
  cleanupRoom(roomId: number): void {
    const subject = this.roomSubjects.get(roomId);
    if (subject) {
      subject.complete();
      this.roomSubjects.delete(roomId);
    }
    console.log(`🧹 Cleaned up chat for room ${roomId}`);
  }
}

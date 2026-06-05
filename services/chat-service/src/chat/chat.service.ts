import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ChatMessage } from './chat.types';

const MAX_MESSAGES_PER_ROOM = 300;

@Injectable()
export class ChatService {
  // Room ID -> circular buffer of messages
  private roomMessages = new Map<number, ChatMessage[]>();
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

  /**
   * Get chat history for a room
   */
  getHistory(roomId: number): ChatMessage[] {
    return this.roomMessages.get(roomId) || [];
  }

  /**
   * Publish a message to a room: store in buffer + broadcast via Subject
   */
  publish(roomId: number, message: ChatMessage): void {
    // Store in circular buffer
    if (!this.roomMessages.has(roomId)) {
      this.roomMessages.set(roomId, []);
    }
    const messages = this.roomMessages.get(roomId)!;
    messages.push(message);
    if (messages.length > MAX_MESSAGES_PER_ROOM) {
      messages.shift();
    }

    // Broadcast to SSE subscribers
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
    this.roomMessages.delete(roomId);
    console.log(`🧹 Cleaned up chat for room ${roomId}`);
  }
}

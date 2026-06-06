export interface ChatMessage {
  id: string;
  room_id: number;
  user_id: number;
  user_name: string;
  avatar?: string;
  content: string;
  type: 'text' | 'gift' | 'system';
  created_at: string;
  gift_type?: number;
  coin?: number;
}

export interface SendMessageDto {
  content: string;
  type?: 'text' | 'gift' | 'system';
  user_id: number;
  user_name: string;
  avatar?: string;
}

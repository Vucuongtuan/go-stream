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
  // Display details are not authorization data; identity always comes from JWT.
  user_name: string;
  avatar?: string;
}

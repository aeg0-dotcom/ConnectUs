export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
  IMAGE = 'IMAGE',
  GIF = 'GIF'
}

export interface User {
  peerId: string;
  name: string;
  color: string;
  isHost: boolean;
}

export interface Channel {
  id: string;
  name: string;
  isLocked: boolean;
  password?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  roomId: string;
  channelId: string; // New field for channel support
  senderId: string;
  senderName: string;
  senderColor: string;
  content: string; // Text content or Blob URL
  fileName?: string; // For files
  fileType?: string; // MIME type
  type: MessageType;
  timestamp: number;
}

export interface NetworkPacket {
  type: 'MESSAGE' | 'USER_LIST' | 'USER_JOINED' | 'USER_LEFT' | 'SYNC_HISTORY' | 'CHANNEL_LIST' | 'CHANNEL_CREATE' | 'KICK_USER';
  payload: any;
}

export interface RoomSettings {
  id: string;
  name: string;
  createdAt: number;
}